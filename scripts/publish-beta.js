const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const u = new URL(remoteUrl);
    if (u.password) return u.password;
  } catch {}
  return '';
}

const TOKEN = getGitHubToken();
const OWNER = 'ArhanRaaj';
const REPO = 'VictusClient';
const TAG = 'v1.1.0-beta.1';
const TITLE = 'VictusClient v1.1.0-beta.1 (Core Beta Release)';
const BODY = `## What's Changed in VictusClient v1.1.0-beta.1 (Beta Release) 🚀

### 🛠️ Critical Fix: Minecraft Launch Freeze
- **Fixed the regression that froze the launcher on "Launch Minecraft"**: downloads no longer run through a blocking \`execSync\` curl accelerator on the Electron main thread. Every file is fetched with the async streaming downloader, so the window stays responsive and Minecraft actually starts.
- **Cancellable preparation**: launch preparation now reports progress continuously and aborts immediately when you cancel, instead of hanging indefinitely.
- **Correct process handling**: spawn failures now reset the launcher to a usable state, Windows builds tear down the whole Java process tree on stop, and the same instance can no longer be launched twice.
- **Cross-platform launch correctness**: platform-aware rule evaluation, native library selection and classpath separators (Windows / macOS / Linux), version-appropriate JVM flags, and Java detection that never blocks the UI.

### 🎮 Independent Game Execution & Tray Integration
- **Game Never Closes with Launcher**: Minecraft processes now run detached in their own process group with native \`javaw.exe\` preference. Closing the launcher window never terminates your running Minecraft instances.
- **Background System Tray**: Added system tray management with active game indicators, double-click window restore, and automatic re-focusing when games exit.

### 💎 Next-Gen Glassmorphic Installer
- **Completely Redesigned UI**: Built with deep obsidian acrylic glass, vibrant ambient purple/cyan radial glow, and modern pill styling.
- **Dynamic Versioning**: Displays dynamic version badges (\`v1.1.0-beta.1 • NEXT-GEN\`) matching package manifests.

### 🧩 Strict Mod & Content Manager Version Locking
- **Zero-Mismatch Mod Downloads**: Content downloads strictly match and lock to the active instance's exact Minecraft version and loader. Incompatible jar downloads are prevented with clear error feedback.
- **Snapshot & Variant Resolution**: Automatically evaluates snapshot candidates (e.g. 26.4-snapshot-1, 26.3, 26.2, 1.21.4) across Modrinth search and version APIs.
- **Sodium & Iris Coexistence**: Addressed version conflicts between Iris shaders and standalone Sodium binaries.

### 🔄 Dynamic Auto-Updater & Full-Screen Update Center
- **Dynamic Release Notes**: Replaced previous static text with dynamic changelog parsing so every release displays its true additions and fixes.
- **Full SemVer Prerelease Support**: Seamless auto-updating between beta and stable releases.

### 🔑 External Browser Login & Passkey Authentication
- **Native Passkey & Google SSO**: Opens your real default browser with full Windows Hello, biometrics, and active Google sessions.
- **Instant Desktop Linking**: Automatically links in under 1.5 seconds via \`/mc-link\`.

### ⚡ Victus Cloud Free Server Hosting
- Real-time player counts, direct IP copying, Start & Stop controls, and one-click SSO into Victus Panel.
`;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) {
        req.write(data);
      } else if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

function uploadAsset(uploadUrlTemplate, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const uploadUrl = uploadUrlTemplate.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`);
    const parsed = new URL(uploadUrl);

    console.log(`Uploading ${fileName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const req = https.request(
      parsed,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${TOKEN}`,
          'User-Agent': 'VictusClient-Publisher',
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileStats.size,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          console.log(`Uploaded ${fileName}: status ${res.statusCode}`);
          resolve({ status: res.statusCode });
        });
      }
    );

    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.pipe(req);
  });
}

async function main() {
  if (!TOKEN) {
    console.error('ERROR: Could not find GitHub token from git remote or GITHUB_TOKEN environment variable.');
    process.exit(1);
  }

  console.log(`=== Publishing ${TAG} to GitHub Releases ===`);

  console.log('1. Checking for existing release...');
  const existing = await request({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
    method: 'GET',
    headers: {
      Authorization: `token ${TOKEN}`,
      'User-Agent': 'VictusClient-Publisher',
    },
  });

  if (existing.status === 200 && existing.data?.id) {
    console.log(`Release ${TAG} already exists (ID: ${existing.data.id}). Deleting to recreate...`);
    await request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/${existing.data.id}`,
      method: 'DELETE',
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'VictusClient-Publisher',
      },
    });
  }

  console.log('2. Creating GitHub Release for ' + TAG + '...');
  const createRes = await request(
    {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/releases`,
      method: 'POST',
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'VictusClient-Publisher',
        'Content-Type': 'application/json',
      },
    },
    {
      tag_name: TAG,
      target_commitish: 'main',
      name: TITLE,
      body: BODY,
      draft: false,
      prerelease: true,
    }
  );

  if (createRes.status !== 201) {
    console.error('Failed to create release:', createRes.data);
    process.exit(1);
  }

  const releaseId = createRes.data.id;
  const uploadUrl = createRes.data.upload_url;
  console.log(`Created Release ${TAG} (ID: ${releaseId})`);

  console.log('3. Uploading Cross-Platform Release Assets...');
  const releaseDir = path.join(__dirname, '..', 'release');

  // `VictusClient-Setup.exe` stays the lightweight asar-patching installer that the
  // in-app auto-updater downloads. The *-Windows-* entries are the genuine 64-bit and
  // 32-bit full installers (verified with `npm run verify:release`).
  const assetsToUpload = [
    'VictusClient-Setup-Windows-x64.exe',
    'VictusClient-Setup-Windows-x86.exe',
    'VictusClient-Setup-x64.exe',
    'VictusClient-Setup-ia32.exe',
    'VictusClient-Setup.exe',
    'VictusClient-Setup-x86.exe',
    'VictusClient-macOS-arm64.zip',
    'VictusClient-macOS-x64.zip',
    'VictusClient-Linux-x64.zip',
    'latest.yml',
    'app-asar.zip',
  ];

  for (const assetName of assetsToUpload) {
    const assetPath = path.join(releaseDir, assetName);
    if (fs.existsSync(assetPath)) {
      await uploadAsset(uploadUrl, assetPath, assetName);
    } else {
      console.warn(`Asset ${assetName} not found at:`, assetPath);
    }
  }

  console.log('\n🎉 Successfully published release ' + TAG + ' with all cross-platform setup files!');
  console.log(`Release URL: https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
}

main().catch(console.error);
