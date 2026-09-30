/**
 * VictusClient release artifact verification.
 *
 * Confirms, for every artifact in `release/`:
 *   - the artifact was actually produced,
 *   - the real application binary architecture (PE / ELF / Mach-O), not just the
 *     NSIS stub architecture (NSIS installers are always i386),
 *   - the packaged app payload contains the fixed launch pipeline and no longer
 *     contains the blocking curl accelerator that froze the launcher.
 *
 * Usage: node scripts/verify-release-artifacts.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');

const FIX_MARKER = 'never blocks the Electron main thread';
const REGRESSION_MARKER = 'System32\\curl.exe';

// --------------------------------------------------------------------- arch
const PE_MACHINE = {
  0x014c: 'i386',
  0x8664: 'x86_64',
  0xaa64: 'arm64',
  0x01c4: 'arm',
};

function peArch(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const dos = Buffer.alloc(64);
    fs.readSync(fd, dos, 0, 64, 0);
    if (dos.toString('ascii', 0, 2) !== 'MZ') return 'not-pe';
    const peOffset = dos.readUInt32LE(0x3c);
    const head = Buffer.alloc(6);
    fs.readSync(fd, head, 0, 6, peOffset);
    if (head.toString('ascii', 0, 4) !== 'PE\0\0') return 'not-pe';
    const machine = head.readUInt16LE(4);
    return PE_MACHINE[machine] || `0x${machine.toString(16)}`;
  } finally {
    fs.closeSync(fd);
  }
}

function elfArch(buf) {
  if (buf.length < 20 || buf[0] !== 0x7f || buf.toString('ascii', 1, 4) !== 'ELF') return 'not-elf';
  const machine = buf.readUInt16LE(18);
  return { 0x3e: 'x86_64', 0x03: 'i386', 0xb7: 'arm64', 0x28: 'arm' }[machine] || `0x${machine.toString(16)}`;
}

function cpuName(cputype) {
  const t = cputype >>> 0;
  return (
    { 0x01000007: 'x86_64', 0x0100000c: 'arm64', 0x00000007: 'i386', 0x0000000c: 'arm' }[t] ||
    `0x${t.toString(16)}`
  );
}

function machOArch(buf) {
  if (buf.length < 8) return 'too-small';
  const magicBE = buf.readUInt32BE(0);
  if (magicBE === 0xcafebabe || magicBE === 0xcafebabf) {
    const count = buf.readUInt32BE(4);
    const arches = [];
    for (let i = 0; i < Math.min(count, 4); i++) arches.push(cpuName(buf.readUInt32BE(8 + i * 20)));
    return arches.join('+');
  }
  if (magicBE === 0xfeedface || magicBE === 0xfeedfacf) return cpuName(buf.readUInt32BE(4));
  const magicLE = buf.readUInt32LE(0);
  if (magicLE === 0xfeedface || magicLE === 0xfeedfacf) return cpuName(buf.readUInt32LE(4));
  return 'not-macho';
}

// ---------------------------------------------------------------------- zip
function findZipEntry(zipPath, entryName) {
  const fd = fs.openSync(zipPath, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const tailLen = Math.min(66 * 1024, size);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, size - tailLen);
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error(`no ZIP end-of-central-directory record (archive is truncated)`);

    const entryCount = tail.readUInt16LE(eocd + 10);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOffset);

    let p = 0;
    for (let i = 0; i < entryCount; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) break;
      const method = cd.readUInt16LE(p + 10);
      const compSize = cd.readUInt32LE(p + 20);
      const uncompSize = cd.readUInt32LE(p + 24);
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      const externalAttr = cd.readUInt32LE(p + 38);
      const localOffset = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
      if (name === entryName) {
        const local = Buffer.alloc(30);
        fs.readSync(fd, local, 0, 30, localOffset);
        return {
          dataOffset: localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28),
          compSize,
          uncompSize,
          method,
          unixMode: (externalAttr >>> 16) & 0xfff,
        };
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error(`entry "${entryName}" not found`);
  } finally {
    fs.closeSync(fd);
  }
}

/** Reads (up to maxBytes of) a single zip entry without decompressing the whole archive. */
function readZipEntry(zipPath, entryName, maxBytes = 64) {
  const info = findZipEntry(zipPath, entryName);
  return new Promise((resolve, reject) => {
    const src = fs.createReadStream(zipPath, {
      start: info.dataOffset,
      end: info.dataOffset + info.compSize - 1,
    });
    const chunks = [];
    let received = 0;

    const done = () => resolve(Buffer.concat(chunks, Math.min(received, maxBytes)));

    if (info.method === 0) {
      src.on('data', (c) => {
        chunks.push(c);
        received += c.length;
        if (received >= maxBytes) src.destroy();
      });
      src.on('close', done);
      src.on('error', reject);
      return;
    }

    const inflate = zlib.createInflateRaw();
    inflate.on('data', (c) => {
      chunks.push(c);
      received += c.length;
      if (received >= maxBytes) {
        inflate.destroy();
        src.destroy();
        done();
      }
    });
    inflate.on('end', done);
    inflate.on('error', (err) => (received > 0 ? done() : reject(err)));
    src.on('error', (err) => (received > 0 ? done() : reject(err)));
    src.pipe(inflate);
  });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function containsMarker(filePath, marker, windowSize = 8 * 1024 * 1024) {
  const needle = Buffer.from(marker);
  const fd = fs.openSync(filePath, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const buf = Buffer.alloc(windowSize);
    let offset = 0;
    let carry = Buffer.alloc(0);
    while (offset < size) {
      const read = fs.readSync(fd, buf, 0, Math.min(windowSize, size - offset), offset);
      if (read <= 0) break;
      const window = Buffer.concat([carry, buf.subarray(0, read)]);
      if (window.includes(needle)) return true;
      carry = window.subarray(Math.max(0, window.length - needle.length));
      offset += read;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function zipEntryUnixMode(zipPath, entryName) {
  try {
    return findZipEntry(zipPath, entryName).unixMode;
  } catch {
    return null;
  }
}

async function entryHasMarker(zipPath, entryName, marker) {
  const info = findZipEntry(zipPath, entryName);
  const buf = await readZipEntry(zipPath, entryName, info.uncompSize);
  return buf.includes(Buffer.from(marker));
}

// ------------------------------------------------------------------ checks
const results = [];
function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fileInfo(name) {
  const p = path.join(releaseDir, name);
  if (!fs.existsSync(p)) return null;
  const st = fs.statSync(p);
  return { path: p, size: st.size, mb: (st.size / 1024 / 1024).toFixed(1) };
}

async function main() {
  console.log('=== VictusClient v1.1.0-beta.1 release artifact verification ===\n');

  const x64App = fileInfo('win-unpacked/VictusClient.exe');
  const ia32App = fileInfo('win-ia32-unpacked/VictusClient.exe');
  const x64Asar = fileInfo('win-unpacked/resources/app.asar');
  const ia32Asar = fileInfo('win-ia32-unpacked/resources/app.asar');

  check('Windows x64 application package present', !!x64App);
  check('Windows 32-bit application package present', !!ia32App);

  const x64Arch = x64App ? peArch(x64App.path) : 'missing';
  const ia32Arch = ia32App ? peArch(ia32App.path) : 'missing';
  check('Windows x64 app binary is a real 64-bit PE (x86_64)', x64Arch === 'x86_64', `detected ${x64Arch}`);
  check('Windows 32-bit app binary is a real 32-bit PE (i386)', ia32Arch === 'i386', `detected ${ia32Arch}`);

  if (ia32App) {
    const dllRel = 'win-ia32-unpacked/ffmpeg.dll';
    const dll = fileInfo(dllRel);
    const dllArch = dll ? peArch(dll.path) : 'missing';
    check('Bundled 32-bit Electron runtime DLLs are i386', dllArch === 'i386', `ffmpeg.dll detected ${dllArch}`);
  }

  // Installers
  const installerNames = [
    'VictusClient-Setup-x64.exe',
    'VictusClient-Setup-ia32.exe',
    'VictusClient-Setup.exe',
    'VictusClient-Setup-x86.exe',
    'VictusClient-Setup-Windows-x64.exe',
    'VictusClient-Setup-Windows-x86.exe',
  ];
  for (const name of installerNames) {
    const info = fileInfo(name);
    check(`Installer generated: ${name}`, !!info, info ? `${info.mb} MB, PE ${peArch(info.path)}` : 'missing');
  }

  const x64Installer = fileInfo('VictusClient-Setup-Windows-x64.exe');
  const ia32Installer = fileInfo('VictusClient-Setup-Windows-x86.exe');
  check(
    '32-bit installer is a genuinely different (32-bit payload) binary, not a renamed x64 build',
    !!x64Installer && !!ia32Installer && x64Installer.size !== ia32Installer.size,
    x64Installer && ia32Installer ? `${x64Installer.mb} MB vs ${ia32Installer.mb} MB` : 'missing'
  );

  // macOS
  for (const [arch, expected] of [['x64', 'x86_64'], ['arm64', 'arm64']]) {
    const zipName = `VictusClient-macOS-${arch}.zip`;
    const info = fileInfo(zipName);
    check(`macOS ${arch} distributable generated`, !!info, info ? `${info.mb} MB` : 'missing');
    if (!info) continue;
    const launcherEntry = 'VictusClient.app/Contents/MacOS/VictusClient';
    try {
      const stub = await readZipEntry(info.path, launcherEntry, 4096);
      const detected = machOArch(stub);
      check(`macOS ${arch} launcher binary architecture is ${expected}`, detected === expected, `detected ${detected}`);
    } catch (err) {
      check(`macOS ${arch} launcher binary architecture is ${expected}`, false, err.message);
    }
    const mode = zipEntryUnixMode(info.path, launcherEntry);
    check(
      `macOS ${arch} launcher binary is marked executable in the archive`,
      mode !== null && (mode & 0o111) !== 0,
      mode === null ? 'entry missing' : `mode ${mode.toString(8)}`
    );
  }

  // Linux
  const linux = fileInfo('VictusClient-Linux-x64.zip');
  check('Linux x64 distributable generated', !!linux, linux ? `${linux.mb} MB` : 'missing');
  if (linux) {
    const launcherEntry = 'VictusClient/victusclient';
    try {
      const head = await readZipEntry(linux.path, launcherEntry, 64);
      const detected = elfArch(head);
      check('Linux launcher binary architecture is x86_64', detected === 'x86_64', `detected ${detected}`);
    } catch (err) {
      check('Linux launcher binary architecture is x86_64', false, err.message);
    }
    const mode = zipEntryUnixMode(linux.path, launcherEntry);
    check(
      'Linux launcher binary is marked executable in the archive',
      mode !== null && (mode & 0o111) !== 0,
      mode === null ? 'entry missing' : `mode ${mode.toString(8)}`
    );
  }

  // Shipped payload contains the fix
  const payloads = [
    ['win-unpacked app.asar', x64Asar],
    ['win-ia32-unpacked app.asar', ia32Asar],
  ];
  for (const [label, info] of payloads) {
    if (!info) {
      check(`${label} payload present`, false, 'missing');
      continue;
    }
    check(`${label} contains the fixed (non-blocking) launch pipeline`, containsMarker(info.path, FIX_MARKER));
    check(`${label} no longer contains the blocking curl accelerator`, !containsMarker(info.path, REGRESSION_MARKER));
  }

  const zippedPayloads = [
    ['macOS x64', 'VictusClient-macOS-x64.zip', 'VictusClient.app/Contents/Resources/app.asar'],
    ['macOS arm64', 'VictusClient-macOS-arm64.zip', 'VictusClient.app/Contents/Resources/app.asar'],
    ['Linux x64', 'VictusClient-Linux-x64.zip', 'VictusClient/resources/app.asar'],
  ];
  for (const [label, zipName, entry] of zippedPayloads) {
    if (!fileInfo(zipName)) continue;
    try {
      const hasFix = await entryHasMarker(path.join(releaseDir, zipName), entry, FIX_MARKER);
      check(`${label} payload contains the fixed launch pipeline`, hasFix);
    } catch (err) {
      check(`${label} payload contains the fixed launch pipeline`, false, err.message);
    }
  }

  console.log('\n=== Artifact manifest ===');
  for (const name of fs.readdirSync(releaseDir)) {
    const p = path.join(releaseDir, name);
    if (!fs.statSync(p).isFile()) continue;
    if (name.endsWith('.blockmap') || name === 'latest.yml' || name === 'builder-debug.yml' || name === 'app-package.zip') continue;
    const size = (fs.statSync(p).size / 1024 / 1024).toFixed(2);
    console.log(`  ${name.padEnd(38)} ${size.padStart(8)} MB  sha256:${sha256(p)}`);
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log('Failed checks:');
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Verification crashed:', err);
  process.exitCode = 1;
});
