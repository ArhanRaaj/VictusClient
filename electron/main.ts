import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { ConfigManager } from './core/ConfigManager';
import { JavaManager } from './core/JavaManager';
import { VersionManager } from './core/VersionManager';
import { MinecraftLauncher } from './core/MinecraftLauncher';
import { ModrinthManager } from './core/ModrinthManager';
import { AutoUpdaterManager } from './core/AutoUpdaterManager';
import { MicrosoftAuthManager } from './core/MicrosoftAuth';

function getOfflinePlayerUuid(username: string): string {
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

let mainWindow: BrowserWindow | null = null;

const configManager = new ConfigManager();
const javaManager = new JavaManager(configManager.getDataDir());
const versionManager = new VersionManager(configManager.getDataDir());
const launcher = new MinecraftLauncher(configManager.getDataDir(), versionManager, javaManager);
const modrinth = new ModrinthManager();
const autoUpdater = new AutoUpdaterManager();
const msAuth = new MicrosoftAuthManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#0a0a0c',
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Check for updates shortly after launch
  setTimeout(async () => {
    try {
      const update = await autoUpdater.checkForUpdates();
      if (update.updateAvailable && mainWindow) {
        mainWindow.webContents.send('updater-available', update);
      }
    } catch (e) {
      console.warn('[AutoUpdater] Initial check error:', e);
    }
  }, 4500);

  // Background periodic update check every 25 minutes
  setInterval(async () => {
    try {
      const update = await autoUpdater.checkForUpdates();
      if (update.updateAvailable && mainWindow) {
        mainWindow.webContents.send('updater-available', update);
      }
    } catch {}
  }, 25 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false);

// Instance IPC
ipcMain.handle('instances-get-all', async () => {
  return configManager.loadInstances();
});

ipcMain.handle('instances-save', async (_, instance) => {
  return configManager.saveInstance(instance);
});

ipcMain.handle('instances-delete', async (_, id) => {
  launcher.kill(id);
  return configManager.deleteInstance(id);
});

ipcMain.handle('instances-duplicate', async (_, id) => {
  const instances = configManager.loadInstances();
  const target = instances.find((i) => i.id === id);
  if (!target) return null;

  const copy = {
    ...target,
    id: `inst-${Date.now()}`,
    name: `${target.name} (Copy)`,
    lastPlayed: 'Never',
    status: 'idle',
  };
  return configManager.saveInstance(copy);
});

ipcMain.handle('open-folder', async (_, pathOrId, subfolder) => {
  let targetPath = pathOrId;
  if (!path.isAbsolute(pathOrId)) {
    const dir = configManager.getInstanceDir(pathOrId);
    targetPath = subfolder ? path.join(dir, subfolder) : dir;
  }
  shell.openPath(targetPath);
});

// Minecraft Launch IPC
ipcMain.handle('minecraft-launch', async (_, instanceId) => {
  const instances = configManager.loadInstances();
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) return { success: false, error: 'Instance not found' };

  const accounts = configManager.loadAccounts();
  let activeAccount = accounts.find((a) => a.isActive) || accounts[0];

  if (activeAccount && activeAccount.type === 'microsoft') {
    try {
      activeAccount = (await msAuth.validateOrRefreshToken(activeAccount as any)) as any;
      const existingIdx = accounts.findIndex((a) => a.id === activeAccount.id);
      if (existingIdx >= 0) accounts[existingIdx] = activeAccount;
      configManager.saveAccounts(accounts);
    } catch (e) {
      console.warn('[MinecraftLaunch] Token refresh warning:', e);
    }
  }

  return launcher.launch(instance, activeAccount, {
    onProgress: (p) => mainWindow?.webContents.send('minecraft-progress', p),
    onLog: (l) => mainWindow?.webContents.send('minecraft-log', l),
    onExit: (e) => mainWindow?.webContents.send('minecraft-exit', e),
  });
});

ipcMain.handle('minecraft-kill', async (_, instanceId) => {
  return launcher.kill(instanceId);
});

// Versions IPC
ipcMain.handle('mojang-get-versions', async () => {
  const manifest = await versionManager.getManifest();
  return manifest.versions;
});

ipcMain.handle('loader-get-versions', async (_, loader, gameVersion) => {
  return versionManager.getLoaderVersions(loader, gameVersion);
});

// Modrinth Content IPC
ipcMain.handle('modrinth-search', async (_, options) => {
  return modrinth.search(options);
});

ipcMain.handle('modrinth-get-versions', async (_, idOrSlug, loaders, gameVersions) => {
  return modrinth.getVersions(idOrSlug, loaders, gameVersions);
});

ipcMain.handle('content-install-file', async (_, options) => {
  const instanceDir = configManager.getInstanceDir(options.instanceId);
  return modrinth.installFile({
    instanceDir,
    category: options.category,
    fileUrl: options.fileUrl,
    fileName: options.fileName,
  });
});

ipcMain.handle('content-get-installed', async (_, instanceId, category) => {
  const instanceDir = configManager.getInstanceDir(instanceId);
  return modrinth.getInstalledFiles(instanceDir, category);
});

ipcMain.handle('content-toggle-mod', async (_, instanceId, fileName, enable) => {
  const instanceDir = configManager.getInstanceDir(instanceId);
  return modrinth.toggleMod(instanceDir, fileName, enable);
});

ipcMain.handle('content-delete-file', async (_, instanceId, category, fileName) => {
  const instanceDir = configManager.getInstanceDir(instanceId);
  return modrinth.deleteFile(instanceDir, category, fileName);
});

// Java IPC
ipcMain.handle('java-detect', async () => {
  return javaManager.detectInstallations();
});

ipcMain.handle('java-download-adoptium', async (_, majorVersion) => {
  return javaManager.downloadAdoptiumJava(majorVersion || 21);
});

// Accounts IPC
ipcMain.handle('accounts-get-all', async () => {
  return configManager.loadAccounts();
});

ipcMain.handle('accounts-save', async (_, account) => {
  const accounts = configManager.loadAccounts();
  const existingIndex = accounts.findIndex((a) => a.id === account.id);
  if (existingIndex >= 0) accounts[existingIndex] = account;
  else accounts.push(account);
  configManager.saveAccounts(accounts);
  return account;
});

ipcMain.handle('accounts-delete', async (_, id) => {
  let accounts = configManager.loadAccounts();
  accounts = accounts.filter((a) => a.id !== id);
  configManager.saveAccounts(accounts);
  return true;
});

ipcMain.handle('accounts-set-active', async (_, id) => {
  const accounts = configManager.loadAccounts().map((a) => ({
    ...a,
    isActive: a.id === id,
    lastUsed: a.id === id ? 'Just now' : a.lastUsed,
  }));
  configManager.saveAccounts(accounts);
  return true;
});

ipcMain.handle('auth-create-offline', async (_, username) => {
  const accounts = configManager.loadAccounts().map((a) => ({ ...a, isActive: false }));
  const newAccount = {
    id: `acc-${Date.now()}`,
    username: username.trim(),
    uuid: getOfflinePlayerUuid(username.trim()),
    type: 'offline',
    skinUrl: 'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697',
    avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(username.trim())}/128`,
    lastUsed: 'Just now',
    isActive: true,
    status: 'active',
  };
  accounts.push(newAccount);
  configManager.saveAccounts(accounts);
  return newAccount;
});

ipcMain.handle('auth-microsoft-login', async () => {
  const result = await msAuth.loginInteractive(mainWindow);
  if (result.success && result.account) {
    const accounts = configManager.loadAccounts().map((a) => ({ ...a, isActive: false }));
    const existingIndex = accounts.findIndex(
      (a) => a.id === result.account!.id || a.uuid === result.account!.uuid
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = result.account;
    } else {
      accounts.push(result.account);
    }
    configManager.saveAccounts(accounts);
    return { success: true, account: result.account };
  }
  return { success: false, error: result.error || 'Authentication cancelled or failed.' };
});

// Settings & System IPC
ipcMain.handle('settings-get', async () => configManager.loadSettings());
ipcMain.handle('settings-save', async (_, s) => {
  configManager.saveSettings(s);
  return true;
});

ipcMain.handle('system-info', async () => {
  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    totalMem: Math.round(os.totalmem() / 1024 / 1024),
    freeMem: Math.round(os.freemem() / 1024 / 1024),
    cpus: os.cpus().length,
  };
});

ipcMain.handle('dialog-select-folder', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return res.filePaths[0] || null;
});

ipcMain.handle('dialog-select-file', async (_, filters) => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return res.filePaths[0] || null;
});

// Auto-Updater IPC Handlers
ipcMain.handle('updater-check', async () => {
  return autoUpdater.checkForUpdates();
});

ipcMain.handle('updater-download', async (_, downloadUrl) => {
  return autoUpdater.downloadUpdate(downloadUrl, (p) => {
    mainWindow?.webContents.send('updater-progress', p);
  });
});

ipcMain.handle('updater-install', async () => {
  return autoUpdater.restartAndInstall();
});

ipcMain.handle('updater-get-version', async () => {
  return autoUpdater.getCurrentVersion();
});
