const fs = require('fs');
const https = require('https');
const path = require('path');
const AdmZip = require('adm-zip');

const targetZip = path.join(__dirname, '..', 'electron.zip');
const destDir = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');

function download(url) {
  console.log('Downloading from:', url);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      return download(res.headers.location);
    }
    if (res.statusCode !== 200) {
      console.error('Download failed with status:', res.statusCode);
      process.exit(1);
    }

    const file = fs.createWriteStream(targetZip);
    const total = parseInt(res.headers['content-length'] || '0', 10);
    let downloaded = 0;
    let lastLog = 0;

    res.on('data', (chunk) => {
      downloaded += chunk.length;
      if (Date.now() - lastLog > 1000) {
        lastLog = Date.now();
        const pct = total ? Math.round((downloaded / total) * 100) : 0;
        console.log(`Downloaded ${Math.round(downloaded / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB (${pct}%)`);
      }
    });

    res.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log('Download complete. Extracting...');
        try {
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const zip = new AdmZip(targetZip);
          zip.extractAllTo(destDir, true);
          fs.writeFileSync(path.join(__dirname, '..', 'node_modules', 'electron', 'path.txt'), 'electron.exe');
          fs.unlinkSync(targetZip);
          console.log('Electron successfully installed to:', destDir);
        } catch (e) {
          console.error('Extract error:', e);
        }
      });
    });
  }).on('error', (err) => {
    console.error('Network error:', err);
    process.exit(1);
  });
}

download('https://github.com/electron/electron/releases/download/v33.2.0/electron-v33.2.0-win32-x64.zip');
