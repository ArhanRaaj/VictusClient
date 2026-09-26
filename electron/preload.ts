import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isWindowMaximized: () => Promise<boolean>;

  // Instance APIs
  getInstances: () => Promise<any[]>;
  saveInstance: (instance: any) => Promise<any>;
  deleteInstance: (id: string) => Promise<boolean>;
  duplicateInstance: (id: string) => Promise<any>;
  openFolder: (pathOrInstanceId: string, subfolder?: string) => Promise<void>;
  exportInstance: (id: string) => Promise<string | null>;
  importInstanceZip: (filePath?: string) => Promise<any>;

  // Minecraft Launching
  launchMinecraft: (instanceId: string) => Promise<{ success: boolean; error?: string }>;
  killMinecraft: (instanceId: string) => Promise<boolean>;
  onLaunchProgress: (callback: (progress: any) => void) => () => void;
  onLogMessage: (callback: (log: any) => void) => () => void;
  onMinecraftExit: (callback: (data: { instanceId: string; code: number }) => void) => () => void;

  // Versions & Loaders
  getMinecraftVersions: () => Promise<any[]>;
  getLoaderVersions: (loader: string, gameVersion: string) => Promise<any[]>;

  // Modrinth Content
  searchModrinth: (options: {
    query?: string;
    category?: string;
    loader?: string;
    gameVersion?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }) => Promise<{ hits: any[]; total_hits: number }>;
  getModrinthProject: (idOrSlug: string) => Promise<any>;
  getModrinthVersions: (idOrSlug: string, loaders?: string[], gameVersions?: string[]) => Promise<any[]>;
  installContentFile: (options: {
    instanceId: string;
    category: string;
    fileUrl: string;
    fileName: string;
    projectId?: string;
    versionId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  getInstalledContent: (instanceId: string, category: string) => Promise<any[]>;
  toggleModFile: (instanceId: string, fileName: string, enable: boolean) => Promise<boolean>;
  deleteContentFile: (instanceId: string, category: string, fileName: string) => Promise<boolean>;

  // Java
  detectJavaInstallations: () => Promise<any[]>;
  downloadAdoptiumJava: (majorVersion: number) => Promise<{ success: boolean; path?: string; error?: string }>;

  // Accounts
  getAccounts: () => Promise<any[]>;
  saveAccount: (account: any) => Promise<any>;
  deleteAccount: (id: string) => Promise<boolean>;
  setActiveAccount: (id: string) => Promise<boolean>;
  startMicrosoftLogin: () => Promise<{ success: boolean; account?: any; error?: string; userCode?: string; verificationUri?: string }>;
  createOfflineAccount: (username: string, skinType?: 'classic' | 'slim') => Promise<any>;

  // Settings & System
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  selectFolderDialog: () => Promise<string | null>;
  selectFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
  getSystemInfo: () => Promise<{ os: string; totalMem: number; freeMem: number; cpus: number }>;

  // Auto-Updater
  checkForUpdates: () => Promise<any>;
  downloadUpdate: (downloadUrl: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  installUpdate: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateProgress: (callback: (progress: any) => void) => () => void;
}

const api: IElectronAPI = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  getInstances: () => ipcRenderer.invoke('instances-get-all'),
  saveInstance: (instance) => ipcRenderer.invoke('instances-save', instance),
  deleteInstance: (id) => ipcRenderer.invoke('instances-delete', id),
  duplicateInstance: (id) => ipcRenderer.invoke('instances-duplicate', id),
  openFolder: (pathOrId, subfolder) => ipcRenderer.invoke('open-folder', pathOrId, subfolder),
  exportInstance: (id) => ipcRenderer.invoke('instances-export', id),
  importInstanceZip: (filePath) => ipcRenderer.invoke('instances-import-zip', filePath),

  launchMinecraft: (instanceId) => ipcRenderer.invoke('minecraft-launch', instanceId),
  killMinecraft: (instanceId) => ipcRenderer.invoke('minecraft-kill', instanceId),
  onLaunchProgress: (callback) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('minecraft-progress', sub);
    return () => ipcRenderer.removeListener('minecraft-progress', sub);
  },
  onLogMessage: (callback) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('minecraft-log', sub);
    return () => ipcRenderer.removeListener('minecraft-log', sub);
  },
  onMinecraftExit: (callback) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('minecraft-exit', sub);
    return () => ipcRenderer.removeListener('minecraft-exit', sub);
  },

  getMinecraftVersions: () => ipcRenderer.invoke('mojang-get-versions'),
  getLoaderVersions: (loader, gameVersion) => ipcRenderer.invoke('loader-get-versions', loader, gameVersion),

  searchModrinth: (options) => ipcRenderer.invoke('modrinth-search', options),
  getModrinthProject: (idOrSlug) => ipcRenderer.invoke('modrinth-get-project', idOrSlug),
  getModrinthVersions: (idOrSlug, loaders, gameVersions) =>
    ipcRenderer.invoke('modrinth-get-versions', idOrSlug, loaders, gameVersions),
  installContentFile: (options) => ipcRenderer.invoke('content-install-file', options),
  getInstalledContent: (instanceId, category) => ipcRenderer.invoke('content-get-installed', instanceId, category),
  toggleModFile: (instanceId, fileName, enable) => ipcRenderer.invoke('content-toggle-mod', instanceId, fileName, enable),
  deleteContentFile: (instanceId, category, fileName) =>
    ipcRenderer.invoke('content-delete-file', instanceId, category, fileName),

  detectJavaInstallations: () => ipcRenderer.invoke('java-detect'),
  downloadAdoptiumJava: (majorVersion) => ipcRenderer.invoke('java-download-adoptium', majorVersion),

  getAccounts: () => ipcRenderer.invoke('accounts-get-all'),
  saveAccount: (account) => ipcRenderer.invoke('accounts-save', account),
  deleteAccount: (id) => ipcRenderer.invoke('accounts-delete', id),
  setActiveAccount: (id) => ipcRenderer.invoke('accounts-set-active', id),
  startMicrosoftLogin: () => ipcRenderer.invoke('auth-microsoft-login'),
  createOfflineAccount: (username, skinType) => ipcRenderer.invoke('auth-create-offline', username, skinType),

  getSettings: () => ipcRenderer.invoke('settings-get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings-save', settings),
  selectFolderDialog: () => ipcRenderer.invoke('dialog-select-folder'),
  selectFileDialog: (filters) => ipcRenderer.invoke('dialog-select-file', filters),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getSystemInfo: () => ipcRenderer.invoke('system-info'),

  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: (downloadUrl: string) => ipcRenderer.invoke('updater-download', downloadUrl),
  installUpdate: () => ipcRenderer.invoke('updater-install'),
  getAppVersion: () => ipcRenderer.invoke('updater-get-version'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater-available', sub);
    return () => ipcRenderer.removeListener('updater-available', sub);
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater-progress', sub);
    return () => ipcRenderer.removeListener('updater-progress', sub);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
