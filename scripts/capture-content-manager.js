const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';

ipcMain.handle('window-is-maximized', () => false);
ipcMain.handle('instances-get-all', () => [
  {
    id: 'inst-1',
    name: 'Fabric 26.3',
    version: '26.3',
    loader: 'fabric',
    loaderVersion: '0.16.9',
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

ipcMain.handle('content-get-installed', async () => []);

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
      // 1. Navigate to Content tab by clicking Explore Modpacks card on Home
      await win.webContents.executeJavaScript(`
        const card = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.trim() === 'Explore Modpacks')?.closest('div[class*="cursor-pointer"]');
        if (card) {
          card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      `);
      await new Promise(r => setTimeout(r, 1500));

      // 2. Click SHADERS tab
      await win.webContents.executeJavaScript(`
        const shaderBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toLowerCase().includes('shaders'));
        if (shaderBtn) shaderBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      `);
      await new Promise(r => setTimeout(r, 1800));

      const imgShaders = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-shaders.png'), imgShaders.toPNG());
      console.log('SUCCESS: Captured Shaders tab');

      // 3. Click RESOURCE PACKS tab
      await win.webContents.executeJavaScript(`
        const rpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toLowerCase().includes('resource packs'));
        if (rpBtn) rpBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      `);
      await new Promise(r => setTimeout(r, 1800));

      const imgRP = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-resourcepacks.png'), imgRP.toPNG());
      console.log('SUCCESS: Captured Resource Packs tab');

      // 4. Click DATAPACKS tab
      await win.webContents.executeJavaScript(`
        const dpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toLowerCase().includes('datapacks'));
        if (dpBtn) dpBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      `);
      await new Promise(r => setTimeout(r, 1800));

      const imgDP = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-content-datapacks.png'), imgDP.toPNG());
      console.log('SUCCESS: Captured Datapacks tab');

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 5000);
});
