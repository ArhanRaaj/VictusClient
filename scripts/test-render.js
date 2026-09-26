const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'render.log');
fs.writeFileSync(logFile, 'Start\n');

function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

app.whenReady().then(() => {
  log('App ready');
  const win = new BrowserWindow({
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'preload.js'),
      contextIsolation: true,
    }
  });

  win.webContents.on('console-message', (e, level, msg, line, src) => {
    log(`[RENDERER CONSOLE] (${level}) ${msg} at ${src}:${line}`);
  });

  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    log(`[FAIL LOAD] ${code}: ${desc} for ${url}`);
  });

  win.webContents.on('did-finish-load', () => {
    log('Finished load');
  });

  const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
  log('Loading: ' + htmlPath);
  win.loadFile(htmlPath);

  setTimeout(() => {
    log('Done, exiting');
    app.quit();
  }, 4000);
});
