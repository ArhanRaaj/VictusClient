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
  },
  {
    id: 'inst-2',
    name: 'Vanilla 1.20.4',
    version: '1.20.4',
    loader: 'vanilla',
    ramMin: 2048,
    ramMax: 4096,
    icon: '🎮',
    background: 'aurora-mountains',
    lastPlayed: 'Yesterday',
    status: 'idle',
    playTime: 60,
  }
]);
ipcMain.handle('accounts-get-all', () => [
  {
    id: 'acc-1',
    username: 'Parasjainop_',
    type: 'offline',
    uuid: '12345678-1234-1234-1234-123456789abc',
    isActive: true,
  }
]);
ipcMain.handle('settings-get', () => null);
ipcMain.handle('system-info', () => ({ os: 'Windows 11', totalMem: 16384, freeMem: 8192, cpus: 12 }));

// Mock modrinth search that matches our electron logic
const { ModrinthManager } = require('../dist-electron/core/ModrinthManager');
const modrinth = new ModrinthManager();

ipcMain.handle('modrinth-search', async (_, options) => {
  return modrinth.search(options);
});

ipcMain.handle('content-get-installed', async () => [
  { fileName: 'sodium-fabric-0.6.5+mc1.21.4.jar', name: 'Sodium', version: '0.6.5', enabled: true, size: 1450000 },
  { fileName: 'iris-fabric-1.8.2+mc1.21.4.jar', name: 'Iris Shaders', version: '1.8.2', enabled: true, size: 2800000 },
  { fileName: 'fabric-api-0.110.1+1.21.4.jar', name: 'Fabric API', version: '0.110.1', enabled: true, size: 2100000 },
]);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0c',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '..', 'dist-renderer', 'index.html');
  await win.loadFile(htmlPath);

  setTimeout(async () => {
    try {
      // 1. Navigate to Content tab by clicking Mods & Content in Sidebar
      await win.webContents.executeJavaScript(`
        const btn = document.querySelector('button[aria-label="Mods & Content"]');
        if (btn) btn.click();
      `);
      await new Promise(r => setTimeout(r, 1600));

      // Capture Mods tab (default)
      const imgMods = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-mods.png'), imgMods.toPNG());
      console.log('SUCCESS: Captured Mods tab with 26.4 Target Instance');

      // 2. Click SHADERS tab
      await win.webContents.executeJavaScript(`
        const shaderBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toLowerCase().includes('shaders'));
        if (shaderBtn) shaderBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      `);
      await new Promise(r => setTimeout(r, 1800));

      const imgShaders = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-shaders.png'), imgShaders.toPNG());
      console.log('SUCCESS: Captured Shaders tab');

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 4000);
});
