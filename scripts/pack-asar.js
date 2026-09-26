const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Packing app.asar ---');

const rootDir = path.join(__dirname, '..');
const stagingDir = path.join(rootDir, 'build-staging');
const asarTarget = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app.asar');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy package.json
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stagingDir, 'package.json'));

// Copy dist-renderer
copyRecursive(path.join(rootDir, 'dist-renderer'), path.join(stagingDir, 'dist-renderer'));

// Copy dist-electron
copyRecursive(path.join(rootDir, 'dist-electron'), path.join(stagingDir, 'dist-electron'));

// Copy only adm-zip to node_modules
const stagingModules = path.join(stagingDir, 'node_modules');
fs.mkdirSync(stagingModules, { recursive: true });
copyRecursive(path.join(rootDir, 'node_modules', 'adm-zip'), path.join(stagingModules, 'adm-zip'));

console.log('Packing with asar...');
execSync(`npx.cmd asar pack "${stagingDir}" "${asarTarget}"`, { stdio: 'inherit' });

console.log('Cleaning staging...');
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log('SUCCESS: app.asar updated at', asarTarget);

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
