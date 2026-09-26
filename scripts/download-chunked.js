const fs = require('fs');
const https = require('https');
const path = require('path');
const AdmZip = require('adm-zip');

const targetZip = path.join(__dirname, '..', 'electron.zip');
const destDir = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');

function getFinalUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getFinalUrl(res.headers.location));
      }
      if (res.statusCode === 200 || res.statusCode === 206) {
        const length = parseInt(res.headers['content-length'] || '0', 10);
        res.destroy();
        resolve({ url, length });
      } else {
        reject(new Error(`Status ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

function fetchRangeBuffer(url, start, end) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Range: `bytes=${start}-${end}`,
      },
    };
    https.get(url, opts, (res) => {
      if (res.statusCode !== 206 && res.statusCode !== 200) {
        return reject(new Error(`Range request status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const expected = end - start + 1;
        if (buf.length !== expected) {
          return reject(new Error(`Incomplete buffer: got ${buf.length}, expected ${expected}`));
        }
        resolve(buf);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const initialUrl = 'https://github.com/electron/electron/releases/download/v33.2.0/electron-v33.2.0-win32-x64.zip';
  console.log('Resolving URL...');
  const { url, length } = await getFinalUrl(initialUrl);
  console.log(`Resolved: total size is ${Math.round(length / 1024 / 1024)}MB (${length} bytes)`);

  const chunkSize = 8 * 1024 * 1024; // 8 MB chunks for ultimate TLS stability
  const totalParts = Math.ceil(length / chunkSize);
  const fd = fs.openSync(targetZip, 'w');

  let current = 0;
  let part = 1;

  while (current < length) {
    const end = Math.min(current + chunkSize - 1, length - 1);
    let attempts = 0;
    let success = false;
    let buf = null;

    while (attempts < 5 && !success) {
      try {
        console.log(`[${part}/${totalParts}] Fetching bytes ${current}-${end} (attempt ${attempts + 1})...`);
        buf = await fetchRangeBuffer(url, current, end);
        success = true;
      } catch (err) {
        attempts++;
        console.warn(`Part ${part} attempt ${attempts} error: ${err.message}. Retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!success || !buf) {
      fs.closeSync(fd);
      throw new Error(`Failed to download part ${part} after 5 attempts.`);
    }

    fs.writeSync(fd, buf, 0, buf.length, current);
    current = end + 1;
    part++;
  }

  fs.closeSync(fd);
  console.log('Download complete. Extracting electron binary...');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const zip = new AdmZip(targetZip);
  zip.extractAllTo(destDir, true);
  fs.writeFileSync(path.join(__dirname, '..', 'node_modules', 'electron', 'path.txt'), 'electron.exe');
  fs.unlinkSync(targetZip);
  console.log('SUCCESS! Electron successfully installed to:', destDir);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
