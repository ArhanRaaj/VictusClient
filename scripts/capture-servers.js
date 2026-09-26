const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';

ipcMain.handle('window-is-maximized', () => false);
ipcMain.handle('instances-get-all', () => []);
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

  // Wait 5.5s for splash screen to complete
  setTimeout(async () => {
    try {
      await new Promise(r => setTimeout(r, 1200));

      // 1. Click "Free Servers" button in sidebar
      await win.webContents.executeJavaScript(`
        const serverBtn = Array.from(document.querySelectorAll('aside button')).find(b => b.getAttribute('aria-label') === 'Free Servers' || (b.title && b.title.includes('Server')));
        if (serverBtn) serverBtn.click();
      `);
      await new Promise(r => setTimeout(r, 800));

      // Capture Servers Page
      const imgServers = await win.capturePage();
      const serversFile = path.join(artifactGlobalDir, 'preview-servers-page.png');
      fs.writeFileSync(serversFile, imgServers.toPNG());
      console.log('SUCCESS: Captured servers page preview at:', serversFile);

      // 2. Open Create Server Modal
      await win.webContents.executeJavaScript(`
        const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Create Server'));
        if (createBtn) createBtn.click();
      `);
      await new Promise(r => setTimeout(r, 800));

      // Capture Create Server Modal
      const imgCreateModal = await win.capturePage();
      const modalFile = path.join(artifactGlobalDir, 'preview-create-server-modal.png');
      fs.writeFileSync(modalFile, imgCreateModal.toPNG());
      console.log('SUCCESS: Captured create server modal preview at:', modalFile);

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 5500);
});
