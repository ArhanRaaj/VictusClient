const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  console.log('Testing backgroundMaterial support on Windows 11...');
  try {
    const win1 = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      backgroundColor: '#00000000',
      backgroundMaterial: 'acrylic',
      show: false,
    });
    console.log('win1 (transparent: default/false, backgroundMaterial: acrylic) created successfully');
    console.log('win1 getBackgroundMaterial:', win1.getBackgroundMaterial ? win1.getBackgroundMaterial() : 'N/A');
    win1.destroy();
  } catch (e) {
    console.error('win1 error:', e);
  }

  try {
    const win2 = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      show: false,
    });
    console.log('win2 (transparent: true, backgroundColor: #00000000) created successfully');
    win2.destroy();
  } catch (e) {
    console.error('win2 error:', e);
  }

  app.quit();
});
