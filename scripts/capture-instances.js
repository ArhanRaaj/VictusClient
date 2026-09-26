const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotPath = path.join(__dirname, 'instances-screenshot-symbols.png');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
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
        const instBtn = btns.find(b => b.title === 'Instances' || (b.getAttribute('aria-label') === 'Instances'));
        if (instBtn) instBtn.click();
      `);

      setTimeout(async () => {
        const image = await win.capturePage();
        fs.writeFileSync(screenshotPath, image.toPNG());
        console.log('Instances screenshot saved!');
        app.quit();
      }, 1000);
    } catch (err) {
      console.error(err);
      app.quit();
    }
  }, 3800);
});
