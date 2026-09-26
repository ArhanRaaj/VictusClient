const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotPath = path.join(__dirname, 'create-modal-preview.png');

app.whenReady().then(async () => {
  ipcMain.handle('window-is-maximized', () => false);
  ipcMain.handle('instances-get-all', () => [
    {
      id: 'inst-1',
      name: 'Victus Modded 1.21.4',
      version: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.9',
      ramMin: 2048,
      ramMax: 6144,
      icon: '⚡',
      background: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      lastPlayed: '2 hours ago',
      status: 'idle',
      playTime: 120,
    }
  ]);
  ipcMain.handle('accounts-get-all', () => [
    {
      id: 'acc-1',
      username: 'VictusHero',
      uuid: 'demo-uuid',
      type: 'offline',
      skinUrl: '',
      avatarUrl: '',
      lastUsed: 'Just now',
      isActive: true,
      status: 'active',
    }
  ]);
  ipcMain.handle('settings-get', () => null);
  ipcMain.handle('mojang-get-versions', () => []);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '..', 'dist-renderer', 'index.html');
  await win.loadFile(htmlPath);

  // Wait 4.8s for splash screen to fully finish, then trigger Create Instance modal
  setTimeout(async () => {
    try {
      await win.webContents.executeJavaScript(`
        const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.trim() === 'Create Profile');
        if (el) {
          const target = el.closest('div[class*="cursor-pointer"]') || el;
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      `);

      setTimeout(async () => {
        const image = await win.capturePage();
        fs.writeFileSync(screenshotPath, image.toPNG());
        console.log('Create modal screenshot saved to:', screenshotPath);
        app.quit();
      }, 1000);
    } catch (err) {
      console.error('Error:', err);
      app.quit();
    }
  }, 4800);
});
