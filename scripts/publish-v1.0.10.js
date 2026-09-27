const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/:([^@]+)@/);
    if (match) return match[1];
  } catch {}
  return '';
}

const TOKEN = getGitHubToken();
const OWNER = 'ArhanRaaj';
const REPO = 'VictusClient';
const TAG = 'v1.0.10';
const TITLE = 'VictusClient v1.0.10 - Native Victus Cloud Web & OAuth Auth Flow';
const BODY = `## What's Changed in VictusClient v1.0.10 🚀

### 🌐 Native In-App Victus Cloud Web & OAuth Auth Flow
- **Fixed External Browser Stalling**: Solved the issue where external browsers with existing web sessions got routed to homepage without prompting or returning to Victus Client.
- **In-App Modal Window**: "Login with Victus Cloud" now opens a native, focused sign-in window inside Victus Client.
- **Google & Discord OAuth Ready**: Configured custom desktop Chrome user-agent preventing 403 \`disallowed_useragent\` blocks.
- **Auto Handshake & Token Detection**: Automatically extracts the Supabase session, syncs user profile & coins, closes the window, and reveals user servers instantly.
- **Direct Sign-Up Bridge**: Seamlessly routes new users to account creation and immediately links their new profile.
- **Session Purge on Unlink**: Cleanly purges stored session tokens when logging out to allow switching accounts.

### 🎮 Free Minecraft Server Hosting Integration
- Real-time player count, server address copying, Start and Stop controls.
- Single-click SSO access to the full Victus Panel (file manager, terminal, backups).
- Live coin counter badge in TitleBar and Servers view.
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
