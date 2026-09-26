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

  // Wait 5.5s for splash screen
  setTimeout(async () => {
    try {
      await new Promise(r => setTimeout(r, 1200));

      // Open Create Instance Wizard by clicking Add Profile card
      await win.webContents.executeJavaScript(`
        const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent && (e.textContent.trim() === 'Add Profile' || e.textContent.trim() === 'Create Profile'));
        if (el) {
          const target = el.closest('div[class*="cursor-pointer"]') || el;
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      `);
      await new Promise(r => setTimeout(r, 1200));

      const imgWizard = await win.capturePage();
      const wizardFile = path.join(artifactGlobalDir, 'preview-version-picker.png');
      fs.writeFileSync(wizardFile, imgWizard.toPNG());
      console.log('SUCCESS: Captured version picker wizard at:', wizardFile);

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 5500);
});
