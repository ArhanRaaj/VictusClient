const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const cacheDir = path.join(rootDir, '.cache', 'electron-mac');
const asarCandidates = [
  path.join(releaseDir, 'win-unpacked', 'resources', 'app.asar'),
  path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app.asar')
];
const asarPath = asarCandidates.find(p => fs.existsSync(p)) || asarCandidates[0];

const ELECTRON_VERSION = 'v33.4.11';
const APP_VERSION = '1.1.0-beta.1';
const APP_NAME = 'VictusClient';
const BUNDLE_ID = 'net.victusclient.launcher';

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000000) {
      console.log(`Using cached download: ${path.basename(dest)}`);
      return resolve(dest);
    }

    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);

    const get = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        let lastLoggedPct = 0;

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

        res.on('end', () => {
          file.end();
          console.log(`✓ Downloaded ${path.basename(dest)} successfully.`);
          resolve(dest);
        });

        res.on('error', reject);
      }).on('error', reject);
    };

    get(url);
  });
}

function updatePlist(plistContent, appName, bundleId, version) {
  let content = plistContent;
  content = content.replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleName</key>\n\t<string>${appName}</string>`);
  content = content.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleDisplayName</key>\n\t<string>${appName}</string>`);
  content = content.replace(/<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleExecutable</key>\n\t<string>${appName}</string>`);
  content = content.replace(/<key>CFBundleIdentifier<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleIdentifier</key>\n\t<string>${bundleId}</string>`);
  content = content.replace(/<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleVersion</key>\n\t<string>${version}</string>`);
  content = content.replace(/<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>`);
  return content;
}

async function packageMacArch(arch) {
  console.log(`\n======================================================`);
  console.log(`📦 Packaging macOS (${arch}) for VictusClient v${APP_VERSION}...`);
  console.log(`======================================================`);

  const zipUrl = `https://github.com/electron/electron/releases/download/${ELECTRON_VERSION}/electron-${ELECTRON_VERSION}-darwin-${arch}.zip`;
  const cachedZip = path.join(cacheDir, `electron-${ELECTRON_VERSION}-darwin-${arch}.zip`);

  await downloadFile(zipUrl, cachedZip);

  const stagingDir = path.join(rootDir, 'build-mac-staging', arch);
  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  console.log(`1. Extracting base macOS bundle...`);
  const baseZip = new AdmZip(cachedZip);
  baseZip.extractAllTo(stagingDir, true);

  const appOld = path.join(stagingDir, 'Electron.app');
  const appNew = path.join(stagingDir, `${APP_NAME}.app`);

  if (!fs.existsSync(appOld)) {
    throw new Error(`Electron.app not found in extracted archive`);
  }
  fs.renameSync(appOld, appNew);

  console.log(`2. Injecting VictusClient app.asar & resources...`);
  const resourcesDir = path.join(appNew, 'Contents', 'Resources');
  const defaultAsar = path.join(resourcesDir, 'default_app.asar');
  if (fs.existsSync(defaultAsar)) fs.unlinkSync(defaultAsar);

  // Copy app.asar
  fs.copyFileSync(asarPath, path.join(resourcesDir, 'app.asar'));

  // Copy icon if available
  const iconPng = path.join(rootDir, 'public', 'icon.png');
  if (fs.existsSync(iconPng)) {
    fs.copyFileSync(iconPng, path.join(resourcesDir, 'icon.png'));
  }

  console.log(`3. Renaming executable and updating Info.plist...`);
  const macOsDir = path.join(appNew, 'Contents', 'MacOS');
  const oldExec = path.join(macOsDir, 'Electron');
  const newExec = path.join(macOsDir, APP_NAME);
  if (fs.existsSync(oldExec)) {
    fs.renameSync(oldExec, newExec);
  }

  const plistPath = path.join(appNew, 'Contents', 'Info.plist');
  if (fs.existsSync(plistPath)) {
    let plist = fs.readFileSync(plistPath, 'utf8');
    plist = updatePlist(plist, APP_NAME, BUNDLE_ID, APP_VERSION);
    fs.writeFileSync(plistPath, plist, 'utf8');
  }

  console.log(`4. Generating distributable macOS zip archive...`);
  const outZipPath = path.join(releaseDir, `VictusClient-macOS-${arch}.zip`);
  if (fs.existsSync(outZipPath)) fs.unlinkSync(outZipPath);

  const distZip = new AdmZip();
  distZip.addLocalFolder(appNew, `${APP_NAME}.app`);
  distZip.writeZip(outZipPath);

  const finalMb = (fs.statSync(outZipPath).size / 1024 / 1024).toFixed(2);
  console.log(`🎉 SUCCESS: Created macOS (${arch}) distributable!`);
  console.log(`📍 Path: ${outZipPath}`);
  console.log(`📦 Size: ${finalMb} MB`);

  // Clean staging
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

async function main() {
  if (!fs.existsSync(asarPath)) {
    console.error('ERROR: app.asar not found. Please build frontend/asar first.');
    process.exit(1);
  }

  // Build both Intel (x64) and Apple Silicon (arm64)
  await packageMacArch('x64');
  await packageMacArch('arm64');

  console.log('\n======================================================');
  console.log('🚀 macOS cross-platform packaging complete for both x64 and arm64!');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('Failed packaging macOS:', err);
  process.exit(1);
});
