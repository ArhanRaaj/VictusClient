const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';

// Dummy IPC handlers so renderer doesn't error out
ipcMain.handle('window-is-maximized', () => false);
ipcMain.handle('instances-get-all', () => [
  {
    id: 'inst-victus-121',
    name: 'Victus Modded 1.21.4',
    version: '1.21.4',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    ramMin: 2048,
    ramMax: 6144,
    status: 'idle',
    lastPlayed: 'Today',
    playTimeMinutes: 480,
    isFavorite: true,
    background: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    icon: '⚡',
  },
  {
    id: 'inst-vanilla-121',
    name: 'Vanilla 1.21.4 Pure',
    version: '1.21.4',
    loader: 'vanilla',
    ramMin: 1024,
    ramMax: 4096,
    status: 'idle',
    lastPlayed: 'Yesterday',
    playTimeMinutes: 120,
    isFavorite: true,
    background: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    icon: '💎',
  },
]);
ipcMain.handle('accounts-get-all', () => []);
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

  // Wait 3.5s for splash screen
  setTimeout(async () => {
    try {
      // 1. Move cursor to center of screen to attract particles
      await win.webContents.executeJavaScript(`
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 620, clientY: 400 }));
      `);
      await new Promise(r => setTimeout(r, 600));

      // Capture Home view with attracted particles
      const imgHome = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-particles-matte.png'), imgHome.toPNG());

      // 2. Open Settings Tab (Pinned gear at bottom of sidebar)
      await win.webContents.executeJavaScript(`
        const settingBtn = document.querySelector('aside button[title="Settings"]');
        if (settingBtn) settingBtn.click();
      `);
      await new Promise(r => setTimeout(r, 600));

      // Capture Settings appearance view showing Navbar color controls and Particle switch
      const imgSettings = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-settings-appearance.png'), imgSettings.toPNG());

      // 3. Click Neon Cyan navbar swatch
      await win.webContents.executeJavaScript(`
        const cyanBtn = document.querySelector('button[title="Neon Cyan"]');
        if (cyanBtn) cyanBtn.click();
      `);
      await new Promise(r => setTimeout(r, 500));

      // Switch back to Home view to see the changed Cyan Navbar + Cyan Particles
      await win.webContents.executeJavaScript(`
        const homeBtn = document.querySelector('aside button[title="Home"]');
        if (homeBtn) homeBtn.click();
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 550, clientY: 380 }));
      `);
      await new Promise(r => setTimeout(r, 600));

      const imgCyanNav = await win.capturePage();
      fs.writeFileSync(path.join(artifactGlobalDir, 'preview-cyan-navbar.png'), imgCyanNav.toPNG());

      console.log('Successfully captured particles, settings, and custom navbar views!');
    } catch (err) {
      console.error('Error during capture:', err);
    } finally {
      app.quit();
    }
  }, 3500);
});
