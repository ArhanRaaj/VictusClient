/**
 * VictusClient launch pipeline verification harness.
 *
 * Verifies the regression fix for the "launcher freezes on Launch Minecraft" bug:
 *   1. Downloads never block the Node/Electron main thread (event-loop lag stays low).
 *   2. Downloads resume/verify byte counts and leave no `.part` files behind.
 *   3. Launch preparation can be cancelled mid-download.
 *   4. A failed `launch()` returns quickly with a useful error instead of hanging.
 *
 * Run with: node scripts/verify-launch-pipeline.js
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { MinecraftLauncher } = require('../dist-electron/core/MinecraftLauncher.js');
const { VersionManager } = require('../dist-electron/core/VersionManager.js');
const { JavaManager } = require('../dist-electron/core/JavaManager.js');

const MB = 1024 * 1024;
const PAYLOAD_SIZE = 8 * MB;

function eventLoopLagMonitor() {
  let last = Date.now();
  let maxLag = 0;
  const timer = setInterval(() => {
    const now = Date.now();
    maxLag = Math.max(maxLag, now - last - 10);
    last = now;
  }, 10);
  timer.unref();
  return {
    get maxLag() {
      return maxLag;
    },
    stop() {
      clearInterval(timer);
      return maxLag;
    },
  };
}

function startPayloadServer({ chunkDelayMs = 0, chunkSize = 64 * 1024, chunksPerResponse = Infinity } = {}) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200);
        return res.end('ok');
      }
      const chunk = Buffer.alloc(chunkSize, 0x41);
      let sent = 0;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(PAYLOAD_SIZE) });

      let cancelled = false;
      req.on('close', () => {
        cancelled = true;
      });

      const pump = () => {
        if (cancelled) return;
        if (sent >= PAYLOAD_SIZE || sent >= chunkSize * chunksPerResponse) return res.end();
        const size = Math.min(chunkSize, PAYLOAD_SIZE - sent);
        sent += size;
        res.write(chunk.subarray(0, size));
        if (chunkDelayMs > 0) setTimeout(pump, chunkDelayMs);
        else setImmediate(pump);
      };
      pump();
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'victus-verify-'));
  const dataDir = path.join(tmpRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const versionManager = new VersionManager(dataDir);
  const javaManager = new JavaManager(dataDir);
  const launcher = new MinecraftLauncher(dataDir, versionManager, javaManager);

  // ---------------------------------------------------------------- 1. lag test
  const server = await startPayloadServer({ chunkSize: 256 * 1024 });
  const port = server.address().port;
  const bigDest = path.join(tmpRoot, 'downloads', 'big-payload.bin');

  const monitor = eventLoopLagMonitor();
  await launcher.downloadFile(`http://127.0.0.1:${port}/payload`, bigDest);
  const maxLag = monitor.stop();

  const downloadedSize = fs.existsSync(bigDest) ? fs.statSync(bigDest).size : -1;
  check('download completes with the exact expected byte count', downloadedSize === PAYLOAD_SIZE, `${downloadedSize} / ${PAYLOAD_SIZE} bytes`);
  check('main thread stays responsive during download (lag < 250ms)', maxLag < 250, `max event-loop lag ${maxLag}ms`);
  check('no leftover .part file after a successful download', !fs.existsSync(`${bigDest}.part`));

  // ---------------------------------------------------------- 2. cancellation
  const slowServer = await startPayloadServer({ chunkSize: 8 * 1024, chunkDelayMs: 12 });
  const slowPort = slowServer.address().port;
  const slowDest = path.join(tmpRoot, 'downloads', 'slow-payload.bin');

  let abort = false;
  const slowDownload = launcher
    .downloadFile(`http://127.0.0.1:${slowPort}/payload`, slowDest, 5, () => abort)
    .then(() => 'resolved')
    .catch((err) => err.name || 'rejected');

  await new Promise((r) => setTimeout(r, 150));
  abort = true;
  const cancelOutcome = await slowDownload;
  check('in-flight download aborts when cancellation is requested', cancelOutcome === 'LaunchCancelledError', `outcome: ${cancelOutcome}`);

  // ------------------------------------------------- 3. preparation cancel/error
  const callbacks = () => {
    const progress = [];
    const logs = [];
    const exits = [];
    return {
      progress,
      logs,
      exits,
      onProgress: (p) => progress.push(p),
      onLog: (l) => logs.push(l),
      onExit: (e) => exits.push(e),
    };
  };

  const cancelCbs = callbacks();
  const cancelInstance = { id: 'inst-cancel', name: 'Cancel Test', version: '1.21.4', loader: 'vanilla', gameDir: path.join(tmpRoot, 'game-cancel') };
  // Kill before preparation can finish: must not hang and must report a cancelled launch.
  const killedImmediately = launcher.launch(cancelInstance, { username: 'Tester' }, cancelCbs);
  launcher.kill('inst-cancel');
  const cancelResult = await Promise.race([
    killedImmediately,
    new Promise((r) => setTimeout(() => r({ success: 'TIMEOUT' }), 20000)),
  ]);
  check('cancelled preparation returns promptly instead of hanging', cancelResult.success === false, `result: ${JSON.stringify(cancelResult)}`);

  // ------------------------------------------------------- 4. fast failure path
  const failCbs = callbacks();
  const failInstance = { id: 'inst-bogus', name: 'Bogus', version: 'definitely-not-a-real-version', loader: 'vanilla', gameDir: path.join(tmpRoot, 'game-bogus') };
  const started = Date.now();
  const failResult = await Promise.race([
    launcher.launch(failInstance, { username: 'Tester' }, failCbs),
    new Promise((r) => setTimeout(() => r({ success: 'TIMEOUT' }), 30000)),
  ]);
  const elapsed = Date.now() - started;
  check('unknown version fails fast with an error message', failResult.success === false && !!failResult.error, `${elapsed}ms — ${failResult.error}`);
  check('failure is reported to the UI as an error status', failCbs.progress.some((p) => p.status === 'error'));

  // ------------------------------------------- 5. native architecture selection
  // Minecraft encodes the native target arch in the classifier name, not in rules, so the
  // launcher must pick exactly one archive per library. Including several makes every arch
  // overwrite the same .dll/.so in the shared natives directory.
  const nativeLib = (name) => ({
    name,
    rules: [{ action: 'allow', os: { name: 'windows' } }],
    downloads: { artifact: { url: `https://example.invalid/${name}.jar`, path: `${name.replace(/:/g, '/')}.jar` } },
  });

  if (process.platform === 'win32') {
    const selected = (name, jvmArch) => {
      launcher.jvmArch = jvmArch;
      return launcher.selectNativeArtifact(nativeLib(name));
    };

    const archVariants = {
      x64: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows', 'x64'),
      x64Arm: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows-arm64', 'x64'),
      x64X86: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows-x86', 'x64'),
      x86: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows-x86', 'x86'),
      x86X64: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows', 'x86'),
      arm64: selected('org.lwjgl:lwjgl-freetype:3.4.3:natives-windows-arm64', 'arm64'),
      linuxOnWin: selected('org.lwjgl:lwjgl:3.4.3:natives-linux', 'x64'),
    };

    check('x64 JVM selects the plain `natives-windows` archive', !!archVariants.x64);
    check('x64 JVM rejects the arm64 native archive', archVariants.x64Arm === null, `got ${JSON.stringify(archVariants.x64Arm)}`);
    check('x64 JVM rejects the 32-bit x86 native archive', archVariants.x64X86 === null, `got ${JSON.stringify(archVariants.x64X86)}`);
    check('32-bit JVM selects `natives-windows-x86`', !!archVariants.x86);
    check('32-bit JVM rejects the 64-bit native archive', archVariants.x86X64 === null, `got ${JSON.stringify(archVariants.x86X64)}`);
    check('arm64 JVM selects `natives-windows-arm64`', !!archVariants.arm64);
    check('non-Windows natives are rejected on Windows', archVariants.linuxOnWin === null, `got ${JSON.stringify(archVariants.linuxOnWin)}`);

    launcher.jvmArch = 'x64';
    const legacy = {
      name: 'org.lwjgl.lwjgl:lwjgl-platform:2.9.4',
      natives: { windows: 'natives-windows-${arch}', linux: 'natives-linux', osx: 'natives-osx' },
      downloads: {
        artifact: { url: 'https://example.invalid/lwjgl-platform-2.9.4.jar', path: 'org/lwjgl/lwjgl-platform/2.9.4/lwjgl-platform-2.9.4.jar' },
        classifiers: { 'natives-windows-64': { url: 'https://example.invalid/natives-windows-64.jar', path: 'org/lwjgl/lwjgl-platform/2.9.4/lwjgl-platform-2.9.4-natives-windows-64.jar' } },
      },
    };
    const legacyClassifier = launcher.nativeClassifierName(legacy);
    const legacyNative = launcher.selectNativeArtifact(legacy);
    check('legacy `${arch}` natives map resolves to the 64-bit classifier', legacyClassifier === 'natives-windows-64', `got ${legacyClassifier}`);
    check('legacy native resolves to the classifier archive', !!legacyNative && legacyNative.url.includes('natives-windows-64'), JSON.stringify(legacyNative));
    check('legacy library still keeps its plain java jar on the classpath', legacyNative !== null && launcher.isNativeOnlyEntry(legacy) === false);
  } else {
    check('native architecture checks skipped on non-Windows host', true, `host is ${process.platform}`);
  }

  // ------------------------------------------------------------- 6. Java probing
  const probeStart = Date.now();
  const detected = await javaManager.detectInstallations();
  const probeElapsed = Date.now() - probeStart;
  check('Java detection completes and never blocks indefinitely', probeElapsed < 60000, `${Array.isArray(detected) ? detected.length : 'n/a'} install(s) in ${probeElapsed}ms`);

  server.close();
  slowServer.close();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Harness crashed:', err);
  process.exitCode = 1;
});
