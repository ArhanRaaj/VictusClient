#!/usr/bin/env node
/**
 * Sync the contents of `release/` into an EXISTING GitHub release.
 *
 * Unlike scripts/publish-beta.js (which deletes and recreates the whole release,
 * losing the release id, notes edits and any hand-uploaded assets), this script
 * updates assets in place:
 *
 *   - uploads every local asset that is missing on the release
 *   - replaces assets whose local SHA-256 no longer matches the remote digest
 *   - leaves everything else untouched (and skips the upload, saving bandwidth)
 *
 * Usage:
 *   node scripts/sync-release-assets.js                      # dry run (default)
 *   node scripts/sync-release-assets.js --apply              # do it
 *   node scripts/sync-release-assets.js --apply --prune      # also delete stray assets
 *   node scripts/sync-release-assets.js --apply --groups=windows
 *
 * Auth: GITHUB_TOKEN / GH_TOKEN env var, or a token embedded in the git remote URL.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const OWNER = 'ArhanRaaj';
const REPO = 'VictusClient';

// ---------------------------------------------------------------------------
// What a complete release looks like. `group` lets you sync one platform at a time.
// ---------------------------------------------------------------------------
const ASSET_MANIFEST = [
  { file: 'VictusClient-Setup-Windows-x64.exe', group: 'windows' },
  { file: 'VictusClient-Setup-Windows-x86.exe', group: 'windows' },
  { file: 'VictusClient-Setup-x64.exe', group: 'windows', blockmap: true },
  { file: 'VictusClient-Setup-ia32.exe', group: 'windows', blockmap: true },
  { file: 'VictusClient-Setup.exe', group: 'windows', blockmap: true },
  { file: 'VictusClient-Setup-x86.exe', group: 'windows' },
  { file: 'latest.yml', group: 'windows' },
  { file: 'app-asar.zip', group: 'windows' },
  { file: 'VictusClient-macOS-arm64.zip', group: 'macos' },
  { file: 'VictusClient-macOS-x64.zip', group: 'macos' },
  { file: 'VictusClient-Linux-x64.zip', group: 'linux' },
];

// Known leftovers from previous publishes that should not sit on the release.
const STRAY_ASSET_NAMES = ['builder-debug.yml', 'app-package.zip'];

const releaseDir = path.join(__dirname, '..', 'release');

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const PRUNE = args.includes('--prune');
const FIX_LATEST_YML = args.includes('--fix-latest-yml');
const TAG = (args.find((a) => a.startsWith('--tag=')) || '--tag=v1.1.0-beta.1').split('=')[1];
const GROUPS = (args.find((a) => a.startsWith('--groups=')) || '')
  .split('=')[1]
  ?.split(',')
  .map((g) => g.trim())
  .filter(Boolean);

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const parsed = new URL(remoteUrl);
    if (parsed.password) return parsed.password;
  } catch {}
  return '';
}

const TOKEN = getToken();
const USER_AGENT = 'VictusClient-ReleaseSync';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function apiRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function authHeaders(extra = {}) {
  return {
    Authorization: `token ${TOKEN}`,
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
    ...extra,
  };
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (c) => hash.update(c));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function sha512Base64(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (c) => hash.update(c));
    stream.on('end', () => resolve(hash.digest('base64')));
    stream.on('error', reject);
  });
}

function human(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

async function fetchRelease() {
  const res = await apiRequest({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
    method: 'GET',
    headers: authHeaders(),
  });
  if (res.status !== 200) {
    throw new Error(
      `Could not read release ${TAG} (HTTP ${res.status}). ` +
        `Check the tag exists and the token has repo scope. ${res.raw.slice(0, 200)}`
    );
  }
  return res.data;
}

async function deleteAsset(asset) {
  const res = await apiRequest({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases/assets/${asset.id}`,
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (res.status !== 204) {
    throw new Error(`Delete of ${asset.name} failed (HTTP ${res.status}): ${res.raw.slice(0, 200)}`);
  }
}

async function uploadAsset(uploadUrlTemplate, filePath, fileName) {
  const stat = fs.statSync(filePath);
  const uploadUrl = new URL(
    uploadUrlTemplate.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`)
  );
  process.stdout.write(`    uploading ${human(stat.size)} ... `);

  await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: uploadUrl.hostname,
        path: uploadUrl.pathname + uploadUrl.search,
        method: 'POST',
        headers: authHeaders({
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size,
        }),
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode === 201) return resolve();
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        });
      }
    );
    req.on('error', reject);
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.pipe(req);
  });

  console.log('ok');
}

/**
 * latest.yml is consumed by electron-builder's updater. Our in-app updater resolves the
 * asset by name straight off the release (AutoUpdaterManager), so this file is advisory
 * here -- but one that disagrees with the uploaded binaries is still misleading and
 * breaks any tooling that trusts it. Verify every entry against the real file, and with
 * --fix-latest-yml rewrite the mismatched entries in place.
 */
async function checkLatestYml() {
  const ymlPath = path.join(releaseDir, 'latest.yml');
  if (!fs.existsSync(ymlPath)) return { problems: [], repaired: false, text: null };

  let text = fs.readFileSync(ymlPath, 'utf8');
  const problems = [];

  // Each file entry: `- url: X` / `sha512: Y` / `size: Z`.
  const entryRe =
    /^([ \t]*)- url:[ \t]*(\S+)\r?\n[ \t]*sha512:[ \t]*(\S+)\r?\n[ \t]*size:[ \t]*(\d+)/gm;
  const corrected = new Map();
  const edits = [];

  for (const match of text.matchAll(entryRe)) {
    const [whole, indent, name, sha512, size] = match;
    const localPath = path.join(releaseDir, name);
    if (!fs.existsSync(localPath)) {
      problems.push(`latest.yml lists ${name}, which is not in release/`);
      continue;
    }
    const actualSize = fs.statSync(localPath).size;
    const actualSha = await sha512Base64(localPath);
    if (actualSize === Number(size) && actualSha === sha512) continue;

    problems.push(
      `latest.yml declares ${name} as ${size} bytes / ${sha512.slice(0, 10)}... ` +
        `but the local file is ${actualSize} bytes / ${actualSha.slice(0, 10)}...`
    );
    corrected.set(name, { sha512: actualSha, size: actualSize });
    edits.push({
      start: match.index,
      end: match.index + whole.length,
      replacement:
        `${indent}- url: ${name}\n` +
        `${indent}  sha512: ${actualSha}\n` +
        `${indent}  size: ${actualSize}`,
    });
  }

  if (edits.length > 0) {
    // Apply back-to-front so earlier offsets stay valid.
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
    }
  }

  // The top-level `path` / `sha512` mirror the entry electron-builder would serve.
  // Done last so the byte offsets above stay valid.
  const pathMatch = text.match(/^path:[ \t]*(\S+)[ \t]*$/m);
  if (pathMatch && corrected.has(pathMatch[1])) {
    const fixed = corrected.get(pathMatch[1]);
    const shaRe = /^sha512:[ \t]*(\S+)[ \t]*$/m;
    if (shaRe.test(text)) text = text.replace(shaRe, `sha512: ${fixed.sha512}`);
  }

  if (edits.length > 0) {
    if (FIX_LATEST_YML) {
      fs.writeFileSync(ymlPath, text, 'utf8');
      return { problems, repaired: true, text };
    }
  }

  return { problems, repaired: false, text: null };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const desired = ASSET_MANIFEST.filter((a) => !GROUPS || GROUPS.includes(a.group));

  // Expand blockmaps for assets that ship one.
  const wanted = [];
  for (const entry of desired) {
    wanted.push(entry.file);
    if (entry.blockmap) wanted.push(`${entry.file}.blockmap`);
  }

  console.log(`=== Release asset sync: ${OWNER}/${REPO}@${TAG} ===`);
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${PRUNE ? ' (+prune)' : ''}`);
  console.log(`groups: ${GROUPS ? GROUPS.join(', ') : 'all'}\n`);

  console.log('Local assets:');
  const local = [];
  for (const name of wanted) {
    const filePath = path.join(releaseDir, name);
    if (!fs.existsSync(filePath)) {
      console.log(`  MISSING  ${name}`);
      continue;
    }
    const size = fs.statSync(filePath).size;
    const digest = await sha256File(filePath);
    local.push({ name, filePath, size, digest });
    console.log(`  ${digest.slice(0, 12)}  ${human(size).padStart(10)}  ${name}`);
  }

  console.log('\nConsistency checks:');
  const yml = await checkLatestYml();
  if (yml.problems.length === 0) {
    console.log('  latest.yml matches the local artifacts');
  } else if (yml.repaired) {
    for (const p of yml.problems) console.log(`  REPAIRED: ${p}`);
    console.log('  latest.yml rewritten from the real files on disk');
  } else {
    for (const p of yml.problems) console.log(`  WARNING: ${p}`);
    console.log('  Re-run with --fix-latest-yml to rewrite these entries from the real files');
  }

  if (!TOKEN) {
    console.log(
      '\nNo GitHub token found. Set GITHUB_TOKEN (or GH_TOKEN) and re-run:\n' +
        '  GITHUB_TOKEN=ghp_xxx node scripts/sync-release-assets.js --apply'
    );
    process.exitCode = 1;
    return;
  }

  const release = await fetchRelease();
  const remote = new Map(release.assets.map((a) => [a.name, a]));
  console.log(`\nRemote assets on ${TAG} (release id ${release.id}): ${release.assets.length}`);

  const toUpload = [];
  for (const item of local) {
    const existing = remote.get(item.name);
    if (!existing) {
      console.log(`  ADD      ${item.name}`);
      toUpload.push({ ...item, existing: null });
      continue;
    }
    const remoteDigest = (existing.digest || '').replace(/^sha256:/, '');
    if (remoteDigest && remoteDigest === item.digest) {
      console.log(`  SAME     ${item.name}`);
      continue;
    }
    if (!remoteDigest) {
      console.log(`  ???      ${item.name} (no remote digest; will re-upload to be safe)`);
    } else {
      console.log(`  REPLACE  ${item.name} (remote ${remoteDigest.slice(0, 12)} -> ${item.digest.slice(0, 12)})`);
    }
    toUpload.push({ ...item, existing });
  }

  const strays = release.assets.filter(
    (a) => !wanted.includes(a.name) && (PRUNE || STRAY_ASSET_NAMES.includes(a.name))
  );
  for (const a of strays) {
    console.log(`  ${PRUNE ? 'DELETE' : 'STRAY'}   ${a.name}` + (PRUNE ? '' : ' (use --prune to remove)'));
  }

  const bytes = toUpload.reduce((sum, i) => sum + i.size, 0);
  console.log(`\n${toUpload.length} asset(s) to upload, ${human(bytes)} total.`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to perform the sync.');
    return;
  }

  const uploadUrlTemplate = release.upload_url;
  let failed = 0;
  for (const item of toUpload) {
    console.log(`\n  ${item.name}`);
    try {
      if (item.existing) {
        process.stdout.write('    replacing existing asset ... ');
        await deleteAsset(item.existing);
        console.log('removed');
      }
      await uploadAsset(uploadUrlTemplate, item.filePath, item.name);
    } catch (err) {
      failed++;
      console.log(`    FAILED: ${err.message}`);
    }
  }

  if (PRUNE) {
    for (const a of strays) {
      process.stdout.write(`  pruning ${a.name} ... `);
      try {
        await deleteAsset(a);
        console.log('removed');
      } catch (err) {
        failed++;
        console.log(`FAILED: ${err.message}`);
      }
    }
  }

  console.log(
    `\n${toUpload.length - failed}/${toUpload.length} uploads succeeded.` +
      (failed ? ` ${failed} failed.` : '')
  );
  console.log(`Release: https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\nSync failed:', err.message);
  process.exitCode = 1;
});
