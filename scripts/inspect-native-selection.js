/**
 * Diagnoses native (LWJGL / SDL / OpenAL) library selection for a Minecraft version.
 *
 * Minecraft metadata encodes the native target architecture in the maven classifier
 * (`natives-windows`, `natives-windows-x86`, `natives-windows-arm64`) instead of using
 * `os.arch` rules, and every variant ships the *same* file names. Selecting more than one
 * per library therefore makes the last-extracted architecture overwrite the correct one —
 * which produces hard native crashes (Windows exit code 3221225477 / 0xC0000005).
 *
 * Usage:
 *   node scripts/inspect-native-selection.js [versionId] [dataDir] [jvmArch]
 *
 * Defaults: version 26.3, the standard VictusClient data dir, jvmArch x64.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const { MinecraftLauncher } = require('../dist-electron/core/MinecraftLauncher.js');
const { VersionManager } = require('../dist-electron/core/VersionManager.js');
const { JavaManager } = require('../dist-electron/core/JavaManager.js');

const PE_MACHINE = { 0x014c: 'i386', 0x8664: 'x86_64', 0xaa64: 'arm64', 0x01c4: 'arm' };

function peArch(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const dos = Buffer.alloc(64);
    fs.readSync(fd, dos, 0, 64, 0);
    const peOffset = dos.readUInt32LE(0x3c);
    const head = Buffer.alloc(6);
    fs.readSync(fd, head, 0, 6, peOffset);
    fs.closeSync(fd);
    if (head.toString('ascii', 0, 4) !== 'PE\0\0') return 'not-pe';
    return PE_MACHINE[head.readUInt16LE(4)] || `0x${head.readUInt16LE(4).toString(16)}`;
  } catch {
    return 'unreadable';
  }
}

function defaultDataDir() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'victusclient', 'VictusClient');
}

function main() {
  const version = process.argv[2] || '26.3';
  const dataDir = process.argv[3] || defaultDataDir();
  const jvmArch = process.argv[4] || 'x64';

  const versionJsonPath = path.join(dataDir, 'versions', version, `${version}.json`);
  if (!fs.existsSync(versionJsonPath)) {
    console.error(`Version metadata not found: ${versionJsonPath}`);
    process.exit(1);
  }

  const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
  const launcher = new MinecraftLauncher(dataDir, new VersionManager(dataDir), new JavaManager(dataDir));
  launcher.jvmArch = jvmArch;

  console.log(`Version ${version} — declared javaVersion: Java ${versionJson.javaVersion?.majorVersion ?? 'n/a'}`);
  console.log(`Data dir: ${dataDir}`);
  console.log(`JVM architecture: ${jvmArch}\n`);

  let selected = 0;
  let skipped = 0;
  const selectedNames = [];

  for (const lib of versionJson.libraries || []) {
    if (lib.rules && lib.rules.length > 0 && !launcher.checkRules(lib.rules)) continue;
    const classifier = launcher.nativeClassifierName(lib);
    if (!classifier) continue;

    const target = launcher.selectNativeArtifact(lib);
    if (target) {
      selected++;
      selectedNames.push(classifier);
      console.log(`  SELECT  ${String(classifier).padEnd(28)} ${lib.name}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nSelected ${selected} native archive(s) for ${jvmArch}; skipped ${skipped} for other OS/arches.`);

  // Every library must contribute at most one archive per file name.
  const duplicates = selectedNames.filter((n, i) => selectedNames.indexOf(n) !== i);
  if (duplicates.length > 0) {
    console.log(`  (classifiers used more than once: ${[...new Set(duplicates)].join(', ')})`);
  }

  // Inspect what actually landed on disk for a previously launched instance.
  const instancesDir = path.join(dataDir, 'instances');
  if (!fs.existsSync(instancesDir)) return;

  for (const id of fs.readdirSync(instancesDir)) {
    const nativesDir = path.join(instancesDir, id, 'natives');
    if (!fs.existsSync(nativesDir)) continue;

    const expectedArch = jvmArch === 'x86' ? 'i386' : 'x86_64';
    const wrong = [];
    const seen = [];

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(dll|so|dylib)$/i.test(entry.name)) continue;
        const arch = entry.name.toLowerCase().endsWith('.dll') ? peArch(full) : 'n/a';
        seen.push({ name: path.relative(nativesDir, full), arch });
        if (arch !== 'n/a' && arch !== expectedArch && arch !== 'not-pe') {
          wrong.push(`${path.relative(nativesDir, full)} (${arch})`);
        }
      }
    };

    try {
      walk(nativesDir);
    } catch {
      continue;
    }
    if (seen.length === 0) continue;

    console.log(`\nInstance ${id}: ${seen.length} native file(s) in natives/`);
    for (const f of seen) console.log(`   ${f.arch.padEnd(9)} ${f.name}`);
    if (wrong.length > 0) {
      console.log(`\n  ❌ WRONG ARCHITECTURE for a ${expectedArch} JVM — this causes native crashes:`);
      for (const w of wrong) console.log(`     - ${w}`);
    } else {
      console.log(`\n  ✅ all natives match the ${expectedArch} JVM`);
    }
  }
}

main();
