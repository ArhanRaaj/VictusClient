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
const TAG = 'v1.0.11';
const TITLE = 'VictusClient v1.0.11 - External Browser Login with Native Passkeys & WebAuthn';
const BODY = `## What's Changed in VictusClient v1.0.11 🚀

### 🔑 External Browser Login with Native Passkeys & Google SSO
- **Default Browser Authentication**: "Login with Victus Cloud" now directly opens your default external browser (Chrome, Edge, etc.) so Windows Hello passkeys, biometrics, hardware keys, and active Google account sessions work without re-entering passwords.
- **Instant Desktop Linking via \`/mc-link\`**: User confirms account linking with a single click in their browser; Victus Client detects confirmation in under 1.5 seconds and synchronizes your profile and coins immediately.
- **Interactive Waiting Screen**: Added an in-app waiting card displaying the active verification code, one-click code copy, real-time polling state, and a "Reopen Browser Tab" option.
- **Zero Friction Free Server Creation**: Clicking "Create Free Server" seamlessly routes to Victus Cloud's free server deployment page and updates your client automatically.

### 🎮 Free Minecraft Server Hosting
- Real-time player count, direct IP copying, and instant Start & Stop buttons.
- One-click Single Sign-On (SSO) into Victus Panel for console, file management, and backups.
- Live Victus Cloud Coins Vault display.
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

  let releaseId;
  let uploadUrl;

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
      prerelease: false,
    }
  );

  if (createRes.status !== 201) {
    console.error('Failed to create release:', createRes.data);
    process.exit(1);
  }

  releaseId = createRes.data.id;
  uploadUrl = createRes.data.upload_url;
  console.log(`Created Release ${TAG} (ID: ${releaseId})`);

  console.log('3. Uploading Release Assets...');
  const releaseDir = path.join(__dirname, '..', 'release');
  const exePath = path.join(releaseDir, 'VictusClient-Setup.exe');
  const zipPath = path.join(releaseDir, 'app-asar.zip');

  if (fs.existsSync(exePath)) {
    await uploadAsset(uploadUrl, exePath, 'VictusClient-Setup.exe');
  } else {
    console.warn('VictusClient-Setup.exe not found at:', exePath);
  }

  if (fs.existsSync(zipPath)) {
    await uploadAsset(uploadUrl, zipPath, 'app-asar.zip');
  } else {
    console.warn('app-asar.zip not found at:', zipPath);
  }

  console.log('\n🎉 Successfully published release ' + TAG + '!');
  console.log(`Release URL: https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
}

main().catch(console.error);
