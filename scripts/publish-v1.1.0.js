const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const creds = execSync('powershell.exe -NoProfile -Command "@(\'protocol=https\', \'host=github.com\') | git credential fill"', { encoding: 'utf8' });
    const match = creds.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return '';
}

const TOKEN = getGitHubToken();
const OWNER = 'ArhanRaaj';
const REPO = 'VictusClient';
const TAG = 'v1.1.0';
const TITLE = 'VictusClient v1.1.0 - Premium Matte Edition & Unified Dashboard';
const BODY = `## What's New in VictusClient v1.1.0 🚀

VictusClient v1.1.0 introduces a complete visual overhaul featuring a refined, architectural matte design system, tactile high-contrast controls, and a redesigned command dashboard.

### 🎨 Premium Matte Redesign (Zero Glossy Gradients)
- **Architectural Matte Sidebar**: Replaced the previous purple gradient wash and radial top-glow with a sleek obsidian floating pillar (\`#0b0c12\`) featuring crisp micro-borders (\`border-white/[0.08]\`), solid active indicators, and refined tooltips.
- **Hero Launch Station**: Replaced oversaturated glassmorphism and glossy buttons with a cinematic matte command station. Instance artwork is smoothly vignetted for maximum text legibility.
- **Tactile Launch Controller**: Replaced the glowing plastic button with a bold, high-contrast, physical button with active press states, seamless state handling (Idle, Initializing, Running), and an integrated progress meter.
- **Modular Hardware & Specs Dashboard**: Clean architectural spec blocks displaying Minecraft Version, Modloader/Engine, allocated RAM with gauge, and active profile status.
- **Unified Home Dashboard**: Streamlined dashboard organizing your Primary Instance, Profile Roster, 6-tool Ecosystem Bar (New Profile, Import Pack, Mods & Shaders, Free Cloud Servers, Wardrobe, Live Console), and Release Highlights.
- **Modernized Window Controls**: Refined macOS-style traffic light buttons to flat, elegant circles, eliminating glossy 3D marble distortion.

### 📦 Cross-Platform Native Installers
- **Windows 11, 10, and 7 (64-bit)**: \`VictusClient-Setup-Windows-x64.exe\` & \`VictusClient-Setup-x64.exe\` (NSIS 64-bit native payload)
- **Windows 11, 10, and 7 (32-bit)**: \`VictusClient-Setup-Windows-x86.exe\` & \`VictusClient-Setup-ia32.exe\` (NSIS 32-bit genuine i386 payload)
- **Lightweight Fast Installers**: \`VictusClient-Setup.exe\` (64-bit) & \`VictusClient-Setup-x86.exe\` (32-bit) with embedded C# / .NET installer
- **macOS (Apple Silicon M1/M2/M3/M4)**: \`VictusClient-macOS-arm64.zip\` (arm64 native binary with mode 755 permissions)
- **macOS (Intel)**: \`VictusClient-macOS-x64.zip\` (x86_64 native binary with mode 755 permissions)
- **Linux (64-bit)**: \`VictusClient-Linux-x64.zip\` (x86_64 portable bundle)

### 🔄 Seamless In-App Auto-Update
- Includes \`latest.yml\` and \`app-asar.zip\` update manifests to immediately trigger in-app updates across existing client installations.
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
    console.error('ERROR: Could not resolve GitHub token.');
    process.exit(1);
  }

  console.log(`=== Publishing ${TAG} to GitHub Releases ===`);

  console.log('1. Checking for existing release ' + TAG + '...');
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
    console.log(`Release ${TAG} already exists (ID: ${existing.data.id}).`);
    releaseId = existing.data.id;
    uploadUrl = existing.data.upload_url;
  } else {
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
  }

  // Get existing assets on the release
  console.log('3. Inspecting existing assets...');
  const assetsRes = await request({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets`,
    method: 'GET',
    headers: {
      Authorization: `token ${TOKEN}`,
      'User-Agent': 'VictusClient-Publisher',
    },
  });

  const existingAssets = Array.isArray(assetsRes.data) ? assetsRes.data : [];
  console.log(`Found ${existingAssets.length} existing assets on release.`);

  const releaseDir = path.join(__dirname, '..', 'release');
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
    if (!fs.existsSync(assetPath)) {
      console.warn(`Asset ${assetName} not found at:`, assetPath);
      continue;
    }

    // Check if asset already exists on release
    const matched = existingAssets.find((a) => a.name === assetName);
    if (matched) {
      const localSize = fs.statSync(assetPath).size;
      if (matched.size === localSize) {
        console.log(`✓ ${assetName} already uploaded with matching size (${(localSize / 1024 / 1024).toFixed(2)} MB), skipping.`);
        continue;
      } else {
        console.log(`Replacing ${assetName} (remote: ${matched.size} bytes, local: ${localSize} bytes)...`);
        await request({
          hostname: 'api.github.com',
          path: `/repos/${OWNER}/${REPO}/releases/assets/${matched.id}`,
          method: 'DELETE',
          headers: {
            Authorization: `token ${TOKEN}`,
            'User-Agent': 'VictusClient-Publisher',
          },
        });
      }
    }

    await uploadAsset(uploadUrl, assetPath, assetName);
  }

  console.log('\n======================================================');
  console.log('🎉 Successfully published release ' + TAG + ' with all cross-platform setup files!');
  console.log(`📍 Release URL: https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
  console.log('======================================================');
}

main().catch(console.error);
