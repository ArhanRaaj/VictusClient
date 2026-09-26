const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';

ipcMain.handle('window-is-maximized', () => false);
// Return null / [] so LauncherContext initializes with INITIAL_INSTANCES that have the new Minecraft wallpapers
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

  // Wait 5.5s for splash screen to complete and home screen to mount
  setTimeout(async () => {
    try {
      await new Promise(r => setTimeout(r, 1200));
      // 1. Capture Home view with the new default Minecraft wallpaper and glass player card
      const imgHome = await win.capturePage();
      const homeFile = path.join(artifactGlobalDir, 'preview-home-mc-wallpapers.png');
      fs.writeFileSync(homeFile, imgHome.toPNG());
      console.log('SUCCESS: Captured home preview at:', homeFile);

      // 2. Click "Change Background" button to open wallpaper picker
      await win.webContents.executeJavaScript(`
        const changeBgBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Change Background'));
        if (changeBgBtn) changeBgBtn.click();
      `);
      await new Promise(r => setTimeout(r, 1000));

      const imgPicker = await win.capturePage();
      const pickerFile = path.join(artifactGlobalDir, 'preview-wallpaper-picker-mc.png');
      fs.writeFileSync(pickerFile, imgPicker.toPNG());
      console.log('SUCCESS: Captured picker preview at:', pickerFile);

    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 5500);
});
