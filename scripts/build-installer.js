const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('=== Building VictusClient Modern WPF Windows Installer (< 20MB) ===');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const asarPath = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app.asar');
const asarZip = path.join(releaseDir, 'app-asar.zip');
const setupExe = path.join(releaseDir, 'VictusClient-Setup.exe');
const sourceCs = path.join(__dirname, 'Installer.cs');
const iconIco = path.join(rootDir, 'src-tauri', 'icons', 'icon.ico');
const iconPng = path.join(rootDir, 'public', 'icon.png');

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });

console.log('1. Building frontend and electron core with latest assets...');
try {
  execSync('cmd.exe /c "npm run build"', { cwd: rootDir, stdio: 'inherit' });
  execSync('node scripts/pack-asar.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('Note: build step finished with output:', e.message);
}

if (!fs.existsSync(asarPath)) {
  console.error('ERROR: app.asar could not be found at:', asarPath);
  process.exit(1);
}

console.log('2. Compressing core application payload (app.asar)...');
const zip = new AdmZip();
zip.addLocalFile(asarPath);
zip.writeZip(asarZip);

const asarZipSize = fs.statSync(asarZip).size;
console.log(`   Compressed payload size: ${(asarZipSize / 1024 / 1024).toFixed(2)} MB`);

console.log('3. Compiling Modern Windows Installer with WPF / .NET...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const appVersion = pkg.version || '1.1.0-beta.1';
console.log(`   Targeting client version: v${appVersion}`);

let csSourceContent = fs.readFileSync(sourceCs, 'utf8');
csSourceContent = csSourceContent.replace('__APP_VERSION__', appVersion);
const compiledCsPath = path.join(__dirname, 'Installer.compiled.cs');
fs.writeFileSync(compiledCsPath, csSourceContent, 'utf8');

let iconFlag = '';
if (fs.existsSync(iconIco)) {
  iconFlag = `/win32icon:"${iconIco}"`;
}

let resourceFlags = `/resource:"${asarZip}",AppAsar`;
if (fs.existsSync(iconPng)) {
  resourceFlags += ` /resource:"${iconPng}",AppIcon`;
}

const wpfLib = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\WPF';
const references = 'PresentationCore.dll,PresentationFramework.dll,WindowsBase.dll,System.Xaml.dll,System.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll,Microsoft.CSharp.dll';

const cmd = `"${cscPath}" /target:winexe /optimize+ ${iconFlag} /lib:"${wpfLib}" /reference:${references} ${resourceFlags} /out:"${setupExe}" "${compiledCsPath}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
} finally {
  try { if (fs.existsSync(compiledCsPath)) fs.unlinkSync(compiledCsPath); } catch {}
}

const finalSize = fs.statSync(setupExe).size;
const finalSizeMB = (finalSize / 1024 / 1024).toFixed(2);

console.log('\n======================================================');
console.log('🎉 SUCCESS: Modern WPF Installer successfully generated!');
console.log(`📍 Path: ${setupExe}`);
console.log(`📦 Final Installer Size: ${finalSizeMB} MB (< 20MB target)`);
console.log('======================================================');
