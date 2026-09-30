const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const cacheDir = path.join(rootDir, '.cache', 'electron-linux');
const asarCandidates = [
  path.join(releaseDir, 'win-unpacked', 'resources', 'app.asar'),
  path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app.asar')
];
const asarPath = asarCandidates.find(p => fs.existsSync(p));

const ELECTRON_VERSION = 'v33.4.11';
const APP_VERSION = '1.1.0-beta.1';
const APP_NAME = 'VictusClient';

// 0x81ED0000. Plain multiplication (never `|` / `<<`) because JS bitwise operators return a
// *signed* 32-bit int and AdmZip writes a negative external-attribute value as 0.
const EXECUTABLE_MODE = 0o100755 * 65536;
const EXECUTABLE_ENTRY_PATTERN = /(^|\/)victusclient$|(^|\/)electron$|chrome_crashpad_handler$|chrome-sandbox$|\.so$|\.so\.\d+$/;

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function isValidZip(filePath) {
  try {
    const st = fs.statSync(filePath);
    if (st.size < 1024) return false;
    const len = Math.min(64 * 1024, st.size);
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, len, st.size - len);
    fs.closeSync(fd);
    return buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  } catch {
    return false;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (isValidZip(dest)) {
      console.log(`Using cached download: ${path.basename(dest)}`);
      return resolve(dest);
    }

    console.log(`Downloading ${url}...`);
    const tmpDest = `${dest}.download`;
    const file = fs.createWriteStream(tmpDest);
    let expected = 0;
    let downloaded = 0;
    let lastLoggedPct = 0;

    const finish = () => {
      // Wait for the write stream to actually flush before validating/renaming,
      // otherwise a truncated archive can be produced.
      file.end(() => {
        if (expected > 0 && downloaded !== expected) {
          try { fs.unlinkSync(tmpDest); } catch {}
          return reject(new Error(`Incomplete download: ${downloaded} of ${expected} bytes`));
        }
        if (!isValidZip(tmpDest)) {
          try { fs.unlinkSync(tmpDest); } catch {}
          return reject(new Error('Downloaded archive is not a valid zip'));
        }
        fs.renameSync(tmpDest, dest);
        console.log(`✓ Downloaded ${path.basename(dest)} successfully (${(downloaded / 1024 / 1024).toFixed(1)} MB).`);
        resolve(dest);
      });
    };

    const get = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        expected = total;

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0) {
            const pct = Math.floor((downloaded / total) * 100);
            if (pct >= lastLoggedPct + 20) {
              console.log(`   ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB)`);
              lastLoggedPct = pct;
            }
          }
        });

        res.on('end', finish);

        res.on('error', reject);
      }).on('error', reject);
    };

    get(url);
  });
}

async function packageLinuxArch(arch = 'x64') {
  console.log(`\n======================================================`);
  console.log(`📦 Packaging Linux (${arch}) for VictusClient v${APP_VERSION}...`);
  console.log(`======================================================`);

  const zipName = `electron-${ELECTRON_VERSION}-linux-${arch}.zip`;
  const zipPath = path.join(cacheDir, zipName);
  const downloadUrl = `https://github.com/electron/electron/releases/download/${ELECTRON_VERSION}/${zipName}`;

  await downloadFile(downloadUrl, zipPath);

  const stagingDir = path.join(cacheDir, `staging-${arch}`);
  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  // Extracted with AdmZip instead of shelling out to `tar`: GNU tar resolves a
  // Windows path like `C:\...` as a remote host and fails under Git Bash.
  console.log('1. Extracting base Linux bundle...');
  new AdmZip(zipPath).extractAllTo(stagingDir, true);

  console.log('2. Injecting VictusClient app.asar & resources...');
  const resourcesDir = path.join(stagingDir, 'resources');
  if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

  fs.copyFileSync(asarPath, path.join(resourcesDir, 'app.asar'));

  const iconPng = path.join(rootDir, 'public', 'icon.png');
  if (fs.existsSync(iconPng)) {
    fs.copyFileSync(iconPng, path.join(stagingDir, 'victusclient.png'));
  }

  console.log('3. Renaming executable and setting permissions...');
  const oldExec = path.join(stagingDir, 'electron');
  const newExec = path.join(stagingDir, 'victusclient');
  if (fs.existsSync(oldExec)) {
    fs.renameSync(oldExec, newExec);
  }

  // Create desktop entry file
  const desktopEntry = `[Desktop Entry]
Name=VictusClient
Exec=victusclient %U
Terminal=false
Type=Application
Icon=victusclient
StartupWMClass=VictusClient
Comment=Premium Modern Minecraft Launcher & Client
Categories=Game;
`;
  fs.writeFileSync(path.join(stagingDir, 'victusclient.desktop'), desktopEntry, 'utf8');

  console.log('4. Generating distributable Linux zip archive...');
  const outZipPath = path.join(releaseDir, `VictusClient-Linux-${arch}.zip`);
  if (fs.existsSync(outZipPath)) fs.unlinkSync(outZipPath);

  const distZip = new AdmZip();
  distZip.addLocalFolder(stagingDir, 'VictusClient');

  // Windows stat() cannot express the Unix executable bit, so the extracted binaries
  // would not be runnable on Linux without a manual chmod. Force the bits explicitly.
  let markedExecutable = 0;
  for (const entry of distZip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (EXECUTABLE_ENTRY_PATTERN.test(name)) {
      entry.attr = EXECUTABLE_MODE;
      markedExecutable++;
    }
  }
  console.log(`   Marked ${markedExecutable} bundled binaries executable.`);

  distZip.writeZip(outZipPath);

  const finalMb = (fs.statSync(outZipPath).size / 1024 / 1024).toFixed(2);
  console.log(`🎉 SUCCESS: Created Linux (${arch}) distributable!`);
  console.log(`📍 Path: ${outZipPath}`);
  console.log(`📦 Size: ${finalMb} MB`);

  fs.rmSync(stagingDir, { recursive: true, force: true });
}

async function main() {
  if (!asarPath || !fs.existsSync(asarPath)) {
    console.error('ERROR: app.asar not found.');
    process.exit(1);
  }
  await packageLinuxArch('x64');
  console.log('\n======================================================');
  console.log('🚀 Linux packaging complete!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Failed packaging Linux:', err);
  process.exit(1);
});
