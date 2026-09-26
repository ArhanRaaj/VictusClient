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
      // 1. Navigate to Servers tab (sidebar button with Server icon)
      await win.webContents.executeJavaScript(`
        const btns = Array.from(document.querySelectorAll('aside button, aside div[class*="group"]'));
        // Find button 3 (Servers)
        const serverBtn = btns.find(b => b.textContent && b.textContent.includes('Free Servers') || b.querySelector('svg'));
        const allBtns = Array.from(document.querySelectorAll('aside div.relative.group'));
        if (allBtns[2]) {
          const btn = allBtns[2].querySelector('button') || allBtns[2];
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      `);
      await new Promise(r => setTimeout(r, 1500));

      const imgServers = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-servers-page-redesign.png'), imgServers.toPNG());
      console.log('SUCCESS: Captured servers page redesign');

      // 2. Open Create Server Modal
      await win.webContents.executeJavaScript(`
        const deployBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Deploy Server'));
        if (deployBtn) {
          deployBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      `);
      await new Promise(r => setTimeout(r, 1200));

      const imgModal = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-create-server-modal-redesign.png'), imgModal.toPNG());
      console.log('SUCCESS: Captured create server modal redesign');

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 5000);
});
