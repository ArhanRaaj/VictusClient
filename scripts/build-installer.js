const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Building VictusClient Windows Installer ---');

const releaseDir = path.join(__dirname, '..', 'release');
const zipFile = path.join(releaseDir, 'app-package.zip');
const setupExe = path.join(releaseDir, 'VictusClient-Setup.exe');
const sourceCs = path.join(__dirname, 'Installer.cs');

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });

console.log('1. Compiling Windows Installer executable...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

const cmd = `"${cscPath}" /target:winexe /optimize+ /reference:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll,Microsoft.CSharp.dll /resource:"${zipFile}",AppPackage /out:"${setupExe}" "${sourceCs}"`;

execSync(cmd, { stdio: 'inherit' });

console.log('SUCCESS: Installer created at:', setupExe);
