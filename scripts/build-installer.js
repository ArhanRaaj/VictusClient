const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('=== Building VictusClient Modern Lightweight Windows Installer (< 20MB) ===');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const asarPath = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app.asar');
const asarZip = path.join(releaseDir, 'app-asar.zip');
const setupExe = path.join(releaseDir, 'VictusClient-Setup.exe');
const sourceCs = path.join(__dirname, 'Installer.cs');
const iconIco = path.join(rootDir, 'src-tauri', 'icons', 'icon.ico');

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });

if (!fs.existsSync(asarPath)) {
  console.log('Building renderer & electron core first...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  execSync('node scripts/pack-asar.js', { cwd: rootDir, stdio: 'inherit' });
}

console.log('1. Compressing core application payload (app.asar)...');
const zip = new AdmZip();
zip.addLocalFile(asarPath);
zip.writeZip(asarZip);

const asarZipSize = fs.statSync(asarZip).size;
console.log(`   Compressed payload size: ${(asarZipSize / 1024 / 1024).toFixed(2)} MB`);

console.log('2. Compiling Modern Windows Installer with C# / .NET...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

let iconFlag = '';
if (fs.existsSync(iconIco)) {
  iconFlag = `/win32icon:"${iconIco}"`;
}

const cmd = `"${cscPath}" /target:winexe /optimize+ ${iconFlag} /reference:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll,Microsoft.CSharp.dll /resource:"${asarZip}",AppAsar /out:"${setupExe}" "${sourceCs}"`;

execSync(cmd, { stdio: 'inherit' });

const finalSize = fs.statSync(setupExe).size;
const finalSizeMB = (finalSize / 1024 / 1024).toFixed(2);

console.log('\n======================================================');
console.log('🎉 SUCCESS: Modern Installer successfully generated!');
console.log(`📍 Path: ${setupExe}`);
console.log(`📦 Final Installer Size: ${finalSizeMB} MB (< 20MB target)`);
console.log('======================================================');
