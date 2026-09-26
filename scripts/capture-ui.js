const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotPath = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe/ui-preview-solid.png';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0e15',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = path.join(__dirname, '..', 'dist-renderer', 'index.html');
  await win.loadFile(htmlPath);

  // Wait 3.8s for splash screen to finish
  setTimeout(async () => {
    try {
      const image = await win.capturePage();
      fs.writeFileSync(screenshotPath, image.toPNG());
      console.log('UI screenshot with symbols saved to:', screenshotPath);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      app.quit();
    }
  }, 3800);
});
