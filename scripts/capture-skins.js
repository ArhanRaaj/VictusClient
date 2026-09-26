const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotPath = path.join(__dirname, 'skins-screenshot.png');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    frame: false,
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
      await win.webContents.executeJavaScript(`
        const btns = Array.from(document.querySelectorAll('button'));
        const skinBtn = btns.find(b => b.textContent && b.textContent.includes('Skin & Cape'));
        if (skinBtn) skinBtn.click();
      `);

      setTimeout(async () => {
        const image = await win.capturePage();
        fs.writeFileSync(screenshotPath, image.toPNG());
        console.log('Skins screenshot saved!');
        app.quit();
      }, 1000);
    } catch (err) {
      console.error(err);
      app.quit();
    }
  }, 2500);
});
