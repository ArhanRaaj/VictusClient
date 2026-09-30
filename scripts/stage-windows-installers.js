/**
 * Stages the release-facing Windows installer names from the real per-architecture
 * electron-builder output.
 *
 *   VictusClient-Setup-Windows-x64.exe  <- VictusClient-Setup-x64.exe   (64-bit app)
 *   VictusClient-Setup-Windows-x86.exe  <- VictusClient-Setup-ia32.exe  (32-bit app)
 *
 * electron-builder has no `${arch}` alias for "x86", so the mapping is explicit here.
 * The 32-bit file is copied from the genuinely 32-bit build, never renamed from x64;
 * `npm run verify:release` asserts both the source app binaries and the sizes.
 *
 * Run after `npm run dist`: node scripts/stage-windows-installers.js
 */
const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

const MAPPINGS = [
  { source: 'VictusClient-Setup-x64.exe', alias: 'VictusClient-Setup-Windows-x64.exe', expect: 'x86_64' },
  { source: 'VictusClient-Setup-ia32.exe', alias: 'VictusClient-Setup-Windows-x86.exe', expect: 'i386' },
];

const PE_MACHINE = { 0x014c: 'i386', 0x8664: 'x86_64', 0xaa64: 'arm64' };

function peArch(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const dos = Buffer.alloc(64);
    fs.readSync(fd, dos, 0, 64, 0);
    if (dos.toString('ascii', 0, 2) !== 'MZ') return 'not-pe';
    const peOffset = dos.readUInt32LE(0x3c);
    const head = Buffer.alloc(6);
    fs.readSync(fd, head, 0, 6, peOffset);
    return head.toString('ascii', 0, 4) === 'PE\0\0' ? PE_MACHINE[head.readUInt16LE(4)] || 'unknown' : 'not-pe';
  } finally {
    fs.closeSync(fd);
  }
}

function appArchOf(unpackedDir) {
  const exe = path.join(releaseDir, unpackedDir, 'VictusClient.exe');
  return fs.existsSync(exe) ? peArch(exe) : 'missing';
}

let ok = true;

for (const { source, alias, expect } of MAPPINGS) {
  const src = path.join(releaseDir, source);
  const dest = path.join(releaseDir, alias);

  if (!fs.existsSync(src)) {
    console.error(`❌ ${source} is missing — run "npm run dist" first.`);
    ok = false;
    continue;
  }

  const unpackedDir = source.includes('ia32') ? 'win-ia32-unpacked' : 'win-unpacked';
  const actual = appArchOf(unpackedDir);
  if (actual !== expect) {
    console.error(`❌ ${unpackedDir} contains a ${actual} application but ${alias} must ship a ${expect} one.`);
    ok = false;
    continue;
  }

  fs.copyFileSync(src, dest);
  console.log(`✅ ${alias.padEnd(36)} <- ${source} (${actual} app payload)`);
}

if (!ok) process.exitCode = 1;
