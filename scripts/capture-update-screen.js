const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';

ipcMain.handle('window-is-maximized', () => false);
ipcMain.handle('instances-get-all', () => [
  {
    id: 'inst-1',
    name: 'Fabric 26.4',
    version: '26.4',
    loader: 'fabric',
    loaderVersion: '0.19.5',
    ramMin: 2048,
    ramMax: 6144,
    icon: '⚡',
    background: 'ender-singularity',
    lastPlayed: 'Just now',
    status: 'idle',
    playTime: 120,
  }
]);
ipcMain.handle('accounts-get-all', () => [
  {
    id: 'acc-1',
    username: 'VictusHero',
    type: 'offline',
    uuid: '12345678-1234-1234-1234-123456789abc',
    isActive: true,
  }
]);
ipcMain.handle('settings-get', () => null);
ipcMain.handle('system-info', () => ({ os: 'Windows 11', totalMem: 16384, freeMem: 8192, cpus: 12 }));

// Mock updater-check to return update ready with changelog
ipcMain.handle('updater-check', () => ({
  updateAvailable: true,
  currentVersion: '1.0.5',
  latestVersion: '1.0.6',
  releaseName: 'VictusClient v1.0.6',
  releaseNotes: `### ✨ What's New in VictusClient v1.0.6
- **Minecraft 26.4 Support**: Full native support for Minecraft 26.4 mapped to high-performance Mojang 1.21.4 engine.
- **Mods & Content Manager**: Browse, filter, and install Fabric/Forge mods, shaders, and resource packs directly inside the launcher.
- **Strict Instance Version Lock**: Content downloads automatically match and lock to the active instance Minecraft version & loader.
- **Instant Directory Access**: 1-click button to open instance mods/shaders folder in Windows Explorer.

### 🛠️ Fixes & Improvements
- **Launch Stability Patch**: Fixed process termination issues during initial Minecraft startup.
- **Auto-Updater Overhaul**: Added full-screen update dashboard with patch breakdown and instant in-place restart.
- **Restart & Apply Fixed**: Resolved update installer launch failure on Windows.
- **Refined Obsidian Theme**: Removed harsh color gradients across the UI in favor of a sleek, dark matte aesthetic.
- **Compact Installer**: Under 10MB standalone Windows installer footprint.`,
  publishedAt: new Date().toISOString(),
  downloadUrl: 'https://github.com/ArhanRaaj/VictusClient/releases/download/v1.0.6/VictusClient-Setup.exe',
  assetSize: 10240000,
}));

ipcMain.handle('updater-download', async () => ({ success: true }));
ipcMain.handle('updater-install', async () => ({ success: true }));
ipcMain.handle('content-get-installed', async () => []);
ipcMain.handle('modrinth-search', async () => ({ hits: [], total_hits: 0 }));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distIndex = path.join(__dirname, '../dist-renderer/index.html');
  await win.loadFile(distIndex);
  win.show();

  await new Promise((r) => setTimeout(r, 3200));

  // Capture Fullscreen Update: Highlights view
  const imgHighlights = await win.capturePage();
  fs.writeFileSync(path.join(artifactGlobalDir, 'preview-update-fullscreen-highlights.png'), imgHighlights.toPNG());
  console.log('Saved preview-update-fullscreen-highlights.png');

  // Click on "What's Added & Patched" tab
  await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const changelogBtn = buttons.find(b => b.textContent && b.textContent.includes("What's Added & Patched"));
      if (changelogBtn) changelogBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  // Capture Fullscreen Update: Changelog view
  const imgChangelog = await win.capturePage();
  fs.writeFileSync(path.join(artifactGlobalDir, 'preview-update-fullscreen-changelog.png'), imgChangelog.toPNG());
  console.log('Saved preview-update-fullscreen-changelog.png');

  // Click "Remind Me Later" to see the subtle minimized pill & navigate to Mods & Content
  await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const laterBtn = buttons.find(b => b.textContent && b.textContent.includes("Remind Me Later"));
      if (laterBtn) laterBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  // Navigate to contents page
  await win.webContents.executeJavaScript(`
    (() => {
      const navButtons = Array.from(document.querySelectorAll('aside button'));
      if (navButtons[2]) navButtons[2].click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  // Capture Content Manager with zero gradients
  const imgContent = await win.capturePage();
  fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-manager-matte.png'), imgContent.toPNG());
  console.log('Saved preview-content-manager-matte.png');

  app.quit();
});
