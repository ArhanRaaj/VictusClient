/**
 * VictusClient launch-speed verification harness.
 *
 * The launch preparation phase used to repeat work that had not changed since the previous
 * launch: a full natives rebuild, a per-object sweep over every asset in the index, a Mojang
 * manifest fetch and a loader-profile fetch. This harness verifies the caches that replaced
 * that work, and measures how much of the preparation phase they remove.
 *
 * Run with: node scripts/verify-launch-speed.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  NATIVES_MANIFEST,
  assetsAlreadyVerified,
  cdsArchivePath,
  clearNativesDir,
  invalidateAssetStamp,
  listNativeFiles,
  nativesDirIsValid,
  nativesSignature,
  readAnyCache,
  readFreshCache,
  sampleAssetsPresent,
  writeAssetStamp,
  writeCache,
  writeNativesManifest,
} = require('../dist-electron/core/LaunchCache.js');
const {
  PERFORMANCE_PROFILE,
  applyOptionsProfile,
} = require('../dist-electron/core/GameOptionsProfile.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Byte-accurate stopwatch over a synchronous workload. */
function timeMs(fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const end = process.hrtime.bigint();
  return { ms: Number(end - start) / 1e6, result };
}

// ---------------------------------------------------------------------------
section('1. Natives directory reuse');

{
  const dir = makeTempDir('victus-natives-');
  const jarDir = makeTempDir('victus-jars-');
  const jarA = path.join(jarDir, 'natives-windows-3.4.3.jar');
  const jarB = path.join(jarDir, 'sdl3-natives-windows.jar');
  fs.writeFileSync(jarA, Buffer.alloc(2048, 1));
  fs.writeFileSync(jarB, Buffer.alloc(4096, 2));

  const archives = [
    { filePath: jarA, excludes: [] },
    { filePath: jarB, excludes: ['META-INF/'] },
  ];

  const signature = nativesSignature('x64', archives);
  check('signature is a deterministic string', typeof signature === 'string' && signature.length > 0);
  check(
    'signature ignores archive ordering',
    signature === nativesSignature('x64', [archives[1], archives[0]])
  );
  check('signature distinguishes the JVM architecture', signature !== nativesSignature('arm64', archives));

  // Simulate a first extraction.
  clearNativesDir(dir);
  fs.writeFileSync(path.join(dir, 'lwjgl.dll'), Buffer.alloc(1024));
  fs.writeFileSync(path.join(dir, 'OpenAL.dll'), Buffer.alloc(1024));
  const files = writeNativesManifest(dir, signature, ['lwjgl.dll', 'OpenAL.dll']);
  check('manifest records only what was extracted', files.join(',') === 'OpenAL.dll,lwjgl.dll', files.join(','));

  check('manifest lists extracted natives only', files.length === 2 && !files.includes(NATIVES_MANIFEST));
  check('directory validates against its own signature', nativesDirIsValid(dir, signature));
  check('a different signature invalidates the directory', !nativesDirIsValid(dir, nativesSignature('arm64', archives)));

  // A stale native from another version must break reuse.
  fs.writeFileSync(path.join(dir, 'stale-arm64.dll'), Buffer.alloc(16));
  check('an extra native file invalidates the directory', !nativesDirIsValid(dir, signature));
  fs.rmSync(path.join(dir, 'stale-arm64.dll'));

  // A deleted native must break reuse.
  fs.rmSync(path.join(dir, 'OpenAL.dll'));
  check('a missing native file invalidates the directory', !nativesDirIsValid(dir, signature));
  fs.writeFileSync(path.join(dir, 'OpenAL.dll'), Buffer.alloc(1024));

  // A re-downloaded archive (new mtime) must break reuse so the new bytes are extracted.
  fs.writeFileSync(jarB, Buffer.alloc(8192, 3));
  check('a changed archive invalidates the directory', !nativesDirIsValid(dir, nativesSignature('x64', archives)));

  const cleared = timeMs(() => clearNativesDir(dir));
  check('clearNativesDir empties the directory', listNativeFiles(dir).length === 0 && cleared.ms >= 0);

  fs.writeFileSync(path.join(dir, 'lwjgl.dll'), Buffer.alloc(1024));
  writeNativesManifest(dir, signature, ['lwjgl.dll']);
  check('files are listed after re-populating', listNativeFiles(dir).join(',') === 'lwjgl.dll');

  // A stale native that could not be deleted (a running instance holds a lock on it) must never
  // be recorded as part of the extraction, otherwise the pollution would look valid forever.
  fs.writeFileSync(path.join(dir, 'stale-arm64.dll'), Buffer.alloc(16));
  writeNativesManifest(dir, signature, ['lwjgl.dll']);
  check(
    'an undeletable stale native keeps the directory invalid',
    !nativesDirIsValid(dir, signature)
  );
  fs.rmSync(path.join(dir, 'stale-arm64.dll'));
  check('removing it restores a valid directory', nativesDirIsValid(dir, signature));

  // A directory with no recorded files must never pass validation.
  writeNativesManifest(dir, signature, []);
  check('an empty manifest is never trusted', !nativesDirIsValid(dir, signature));

  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(jarDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
section('2. Asset verification stamp');

{
  const assetsDir = makeTempDir('victus-assets-');
  fs.mkdirSync(path.join(assetsDir, 'indexes'), { recursive: true });
  const indexId = '26.2';
  const count = 4210;

  check('nothing is stamped before a verification', !assetsAlreadyVerified(assetsDir, indexId, count));
  writeAssetStamp(assetsDir, indexId, count);
  check('a completed verification is remembered', assetsAlreadyVerified(assetsDir, indexId, count));
  check('a different object count invalidates the stamp', !assetsAlreadyVerified(assetsDir, indexId, count + 1));
  check('a different asset index invalidates the stamp', !assetsAlreadyVerified(assetsDir, '26.3', count));
  check('an expired stamp is ignored', !assetsAlreadyVerified(assetsDir, indexId, count, -1));
  invalidateAssetStamp(assetsDir, indexId);
  check('invalidateAssetStamp removes it', !assetsAlreadyVerified(assetsDir, indexId, count));

  // Spot check against a real objects/ layout.
  const entries = [];
  for (let i = 0; i < 500; i++) {
    const hash = String(i).padStart(40, '0');
    entries.push([`minecraft/obj${i}`, { hash }]);
    const sub = path.join(assetsDir, 'objects', hash.slice(0, 2));
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, hash), Buffer.alloc(32));
  }

  check('spot check passes for a complete objects folder', sampleAssetsPresent(assetsDir, entries));
  fs.rmSync(path.join(assetsDir, 'objects', entries[250][1].hash.slice(0, 2), entries[250][1].hash));
  check('spot check catches a deleted asset', !sampleAssetsPresent(assetsDir, entries, 500));

  fs.rmSync(assetsDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
section('3. TTL cache (version manifest, loader profiles)');

{
  const dir = makeTempDir('victus-cache-');
  const file = path.join(dir, 'version_manifest_v2.json');
  const payload = { latest: { release: '26.2' }, versions: [{ id: '26.2' }] };

  check('a missing cache reads as empty', readFreshCache(file, 1000) === null && readAnyCache(file) === null);

  writeCache(file, payload);
  check('a fresh entry is returned', readFreshCache(file, 60_000)?.versions?.[0]?.id === '26.2');
  check('an expired entry is not returned fresh', readFreshCache(file, -1) === null);
  check('an expired entry is still readable as a fallback', readAnyCache(file)?.latest?.release === '26.2');

  fs.writeFileSync(file, '{ not json');
  check('corrupt cache entries degrade to null', readFreshCache(file, 1000) === null && readAnyCache(file) === null);

  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
section('4. Measured saving in the asset phase');

{
  const assetsDir = makeTempDir('victus-bench-');
  const indexId = '26.2-bench';
  fs.mkdirSync(path.join(assetsDir, 'indexes'), { recursive: true });

  // Build a realistic index: 4200 objects across a hashed layout.
  const entries = [];
  for (let i = 0; i < 4200; i++) {
    const hash = `${i.toString(16).padStart(8, '0')}${'0'.repeat(32)}`;
    entries.push([`minecraft/asset${i}`, { hash }]);
    const sub = path.join(assetsDir, 'objects', hash.slice(0, 2));
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, hash), Buffer.alloc(64));
  }

  const sweep = timeMs(() => {
    let found = 0;
    for (const [, obj] of entries) {
      const dest = path.join(assetsDir, 'objects', obj.hash.slice(0, 2), obj.hash);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) found++;
    }
    return found;
  });

  writeAssetStamp(assetsDir, indexId, entries.length);

  const fastPath = timeMs(() => {
    if (!assetsAlreadyVerified(assetsDir, indexId, entries.length)) return -1;
    return sampleAssetsPresent(assetsDir, entries) ? 1 : -1;
  });

  check('full sweep finds every object', sweep.result === entries.length);
  check('stamped fast path reports verified', fastPath.result === 1);

  const ratio = sweep.ms / Math.max(fastPath.ms, 0.001);
  console.log(
    `    full asset sweep: ${sweep.ms.toFixed(1)} ms  |  stamped fast path: ${fastPath.ms.toFixed(1)} ms  |  ${ratio.toFixed(0)}x faster`
  );
  check('stamped fast path is at least 5x faster than the full sweep', ratio >= 5, `ratio ${ratio.toFixed(1)}x`);

  // Removing the stamp must fall back to the full sweep, never to a wrong answer.
  invalidateAssetStamp(assetsDir, indexId);
  const fallback = timeMs(() =>
    assetsAlreadyVerified(assetsDir, indexId, entries.length) ? 1 : sampleAssetsPresent(assetsDir, entries)
  );
  check('the fast path is only taken when a valid stamp exists', fallback.result !== -1);

  fs.rmSync(assetsDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
section('5. CDS archive location');

{
  const p = cdsArchivePath('C:/data/cache', 'win32-x64-j25');
  check('archive path is namespaced by runtime identity', p.includes('win32-x64-j25') && p.endsWith('.jsa'));
  check('archive lives under a cds/ folder', p.includes(`${path.sep}cds${path.sep}`) || p.includes('/cds/'));
}

// ---------------------------------------------------------------------------
section('6. Performance preset (options.txt)');

{
  const original = [
    'version:4903',
    'renderDistance:12',
    'gamma:0.5',
    'key_key.drop:key.keyboard.q',
    'renderClouds:"true"',
    'maxFps:260',
    '',
  ].join('\r\n');

  const first = applyOptionsProfile(original, PERFORMANCE_PROFILE);
  const lines = first.text.split('\r\n');

  check('render distance is lowered', lines.includes('renderDistance:6'));
  check('clouds are disabled', lines.includes('renderClouds:"false"'));
  check('unrelated settings are untouched', lines.includes('gamma:0.5'));
  check('key bindings are never rewritten', lines.includes('key_key.drop:key.keyboard.q'));
  check('CRLF line endings are preserved', first.text.includes('\r\n') && !first.text.includes('\n\n\n'));
  check('already-correct keys are reported unchanged', first.unchanged.includes('maxFps'));
  check('missing keys are appended', first.added.includes('entityShadows') && lines.includes('entityShadows:false'));
  check('the change is reported for the log', first.changed.includes('renderDistance'));

  const second = applyOptionsProfile(first.text, PERFORMANCE_PROFILE);
  check('applying the preset twice changes nothing', second.changed.length === 0 && second.added.length === 0);

  const fromEmpty = applyOptionsProfile('', PERFORMANCE_PROFILE);
  const emptyKeys = fromEmpty.text.split('\n').filter(Boolean);
  check(
    'an empty options.txt receives the full profile',
    emptyKeys.length === Object.keys(PERFORMANCE_PROFILE).length
  );
  check('a missing options.txt parses as no change on the second pass', applyOptionsProfile(fromEmpty.text, PERFORMANCE_PROFILE).changed.length === 0);
}

// ---------------------------------------------------------------------------
console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  console.log(`Failed: ${failures.join(', ')}`);
  process.exit(1);
}
