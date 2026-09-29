const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const artifactGlobalDir = 'C:/Users/arhan/.gemini/antigravity/brain/fcb11e34-475b-496e-8d6a-f754fd59bdbe';
const localShowcaseDir = path.join(__dirname, '..', 'docs', 'showcase');

// Ensure output directories exist
if (!fs.existsSync(localShowcaseDir)) {
  fs.mkdirSync(localShowcaseDir, { recursive: true });
}

// Mock instances data with rich backgrounds and details
const mockInstances = [
  {
    id: 'inst-victus-264',
    name: 'Fabric 26.4 Snapshot',
    version: '26.4',
    loader: 'fabric',
    loaderVersion: '0.19.5',
    ramMin: 2048,
    ramMax: 6144,
    status: 'idle',
    lastPlayed: 'Today at 7:15 PM',
    playTimeMinutes: 520,
    isFavorite: true,
    background: 'ender-singularity',
    icon: '⚡',
  },
  {
    id: 'inst-iris-121',
    name: 'Iris + Sodium Shaderpack',
    version: '1.21.4',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    ramMin: 2048,
    ramMax: 8192,
    status: 'idle',
    lastPlayed: 'Yesterday',
    playTimeMinutes: 340,
    isFavorite: true,
    background: 'aurora-mountains',
    icon: '✨',
  },
  {
    id: 'inst-create-120',
    name: 'Create & Engineering',
    version: '1.20.4',
    loader: 'forge',
    loaderVersion: '47.3.0',
    ramMin: 4096,
    ramMax: 8192,
    status: 'idle',
    lastPlayed: '3 days ago',
    playTimeMinutes: 1240,
    isFavorite: false,
    background: 'crimson-nether',
    icon: '⚙️',
  },
  {
    id: 'inst-pvp-18',
    name: 'Hypixel Ranked PvP',
    version: '1.8',
    loader: 'fabric',
    ramMin: 1024,
    ramMax: 3072,
    status: 'idle',
    lastPlayed: '1 week ago',
    playTimeMinutes: 2850,
    isFavorite: false,
    background: 'cherry-sunset',
    icon: '⚔️',
  },
];

const mockAccounts = [
  {
    id: 'acc-victus-hero',
    username: 'VictusHero',
    uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
    type: 'offline',
    skinUrl: 'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697',
    avatarUrl: 'https://mc-heads.net/avatar/VictusHero/128',
    lastUsed: 'Just now',
    isActive: true,
    status: 'active',
  },
  {
    id: 'acc-arhan-ms',
    username: 'ArhanDev',
    uuid: '98765432-abcd-ef01-2345-6789abcdef01',
    type: 'microsoft',
    skinUrl: 'https://textures.minecraft.net/texture/71a629c54e85dc6280fb5d7990117079cc621e25e1a141b7119f9f5fa4537166',
    avatarUrl: 'https://mc-heads.net/avatar/ArhanDev/128',
    lastUsed: 'Yesterday',
    isActive: false,
    status: 'active',
  },
];

const mockServers = [
  {
    id: 'srv-vc-smp-01',
    name: 'Victus SMP Season 3',
    subdomain: 'play.victuscloud.com',
    port: 25565,
    version: '1.21.4',
    software: 'paper',
    status: 'online',
    playersOnline: 14,
    maxPlayers: 20,
    ramMb: 2048,
    cpuCores: 2,
    diskGb: 10,
    motd: '§b§lVictus SMP Season 3 §7• §a24/7 Free Victus Cloud',
    region: 'Singapore (SG-1)',
    createdAt: 'Active',
    uptimeMinutes: 240,
    cpuPercent: 18,
    ramUsedMb: 940,
    autoSleep: false,
    identifier: 'vc-smp-01',
    uuid: 'a82b4c10-89ab-412e-b610-victuscloud1',
    nodeId: 4,
    panelUrl: 'https://panel.victuscloud.com/server/vc-smp-01',
    fullAddress: 'play.victuscloud.com:25565',
    ping: 28,
  },
];

// Mock IPC handlers
ipcMain.handle('window-is-maximized', () => false);
ipcMain.handle('instances-get-all', () => mockInstances);
ipcMain.handle('accounts-get-all', () => mockAccounts);
ipcMain.handle('settings-get', () => null);
ipcMain.handle('system-info', () => ({
  os: 'Windows 11 Pro 64-bit',
  totalMem: 32768,
  freeMem: 18432,
  cpus: 16,
}));
ipcMain.handle('updater-get-version', () => '1.1.0-beta.1');
ipcMain.handle('mojang-get-versions', () => [
  { id: '26.4', type: 'snapshot', releaseTime: '2026-09-24T00:00:00Z' },
  { id: '1.21.4', type: 'release', releaseTime: '2024-12-03T00:00:00Z' },
  { id: '1.20.4', type: 'release', releaseTime: '2023-12-07T00:00:00Z' },
  { id: '1.8.9', type: 'release', releaseTime: '2015-12-09T00:00:00Z' },
]);

ipcMain.handle('victus-cloud-get-servers', () => [
  {
    identifier: 'vc-smp-01',
    name: 'Victus SMP Season 3',
    ip: 'play.victuscloud.com',
    port: 25565,
    status: 'online',
    playersOnline: 14,
    maxPlayers: 20,
    ramMb: 2048,
    cpuPercent: 18,
    nodeId: 4,
    uuid: 'a82b4c10-89ab-412e-b610-victuscloud1',
    panelUrl: 'https://panel.victuscloud.com/server/vc-smp-01',
    fullAddress: 'play.victuscloud.com:25565',
  }
]);

ipcMain.handle('loader-get-versions', () => [
  { version: '0.16.9', stable: true },
  { version: '0.16.8', stable: true },
  { version: '0.16.5', stable: true },
]);

let modrinth;
try {
  const { ModrinthManager } = require('../dist-electron/core/ModrinthManager');
  modrinth = new ModrinthManager();
} catch {}

ipcMain.handle('modrinth-search', async (_, options) => {
  if (modrinth) {
    try {
      const res = await modrinth.search(options);
      if (res && res.hits && res.hits.length > 0) return res;
    } catch {}
  }
  return {
    hits: [
      {
        id: 'sodium',
        slug: 'sodium',
        title: 'Sodium',
        description: 'Modern rendering engine and performance optimization mod for Minecraft.',
        author: 'jellysquid3',
        icon_url: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
        categories: ['optimization'],
        downloads: 32000000,
        follows: 185000,
        loaders: ['fabric', 'neoforge'],
        game_versions: ['1.21.4', '1.20.4'],
        project_type: 'mod',
      },
      {
        id: 'iris',
        slug: 'iris',
        title: 'Iris Shaders',
        description: 'A modern shaders mod for Minecraft compatible with existing OptiFine shader packs.',
        author: 'coderbot',
        icon_url: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
        categories: ['shaders', 'optimization'],
        downloads: 24000000,
        follows: 142000,
        loaders: ['fabric', 'neoforge'],
        game_versions: ['1.21.4', '1.20.4'],
        project_type: 'mod',
      },
      {
        id: 'fabric-api',
        slug: 'fabric-api',
        title: 'Fabric API',
        description: 'Essential core library for Fabric modding ecosystem with broad compatibility.',
        author: 'modmuss50',
        icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
        categories: ['library'],
        downloads: 48000000,
        follows: 210000,
        loaders: ['fabric'],
        game_versions: ['1.21.4', '1.20.4'],
        project_type: 'mod',
      },
      {
        id: 'lithium',
        slug: 'lithium',
        title: 'Lithium',
        description: 'Optimization mod for physics, mob AI, and general game chunk ticking.',
        author: 'jellysquid3',
        icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png',
        categories: ['optimization'],
        downloads: 19000000,
        follows: 95000,
        loaders: ['fabric', 'neoforge'],
        game_versions: ['1.21.4', '1.20.4'],
        project_type: 'mod',
      },
    ],
    total_hits: 4,
  };
});

ipcMain.handle('content-get-installed', () => [
  { fileName: 'sodium-fabric-0.6.5+mc1.21.4.jar', name: 'Sodium', version: '0.6.5', enabled: true, size: 1450000 },
  { fileName: 'iris-fabric-1.8.2+mc1.21.4.jar', name: 'Iris Shaders', version: '1.8.2', enabled: true, size: 2800000 },
  { fileName: 'fabric-api-0.110.1+1.21.4.jar', name: 'Fabric API', version: '0.110.1', enabled: true, size: 2100000 },
]);

ipcMain.handle('java-detect', () => [
  { version: 'Java 21 (Temurin OpenJDK)', path: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\java.exe', major: 21 },
  { version: 'Java 17 (Microsoft Build)', path: 'C:\\Program Files\\Microsoft\\jdk-17\\bin\\java.exe', major: 17 },
]);

ipcMain.handle('victus-cloud-get-profile', () => ({
  username: 'VictusHero',
  total_cp: 1250,
  cp_tier: 'Diamond VIP',
  avatar_url: 'https://mc-heads.net/avatar/VictusHero/128',
}));

ipcMain.handle('victus-cloud-get-link-info', () => ({
  code: 'VC-8942',
  url: 'https://victuscloud.com/auth/link?code=VC-8942',
}));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
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

  // Helper to save screenshots to both output locations
  const saveShot = async (filename, logName) => {
    const img = await win.capturePage();
    const pngBuffer = img.toPNG();
    fs.writeFileSync(path.join(localShowcaseDir, filename), pngBuffer);
    if (fs.existsSync(artifactGlobalDir)) {
      fs.writeFileSync(path.join(artifactGlobalDir, filename), pngBuffer);
    }
    console.log(`[Captured] ${logName} -> ${filename} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
  };

  // Wait 1.5s for initial load then seed localStorage and bypass splash
  await new Promise((r) => setTimeout(r, 1500));

  await win.webContents.executeJavaScript(`
    // 1. Seed Victus Cloud Account & Purple Theme
    localStorage.setItem('victus_cloud_account', JSON.stringify({
      id: 'usr-victus-01',
      username: 'VictusHero',
      email: 'hero@victuscloud.com',
      coins: 1250,
      total_cp: 1250,
      tier: 'Diamond VIP',
      avatarUrl: 'https://mc-heads.net/avatar/VictusHero/128'
    }));

    localStorage.setItem('victus_theme', JSON.stringify({
      preset: 'Victus Purple',
      primaryAccent: '#9333ea',
      primaryHover: '#a855f7',
      primaryLight: '#c084fc',
      secondaryAccent: '#3b82f6',
      sidebarColor: '#7c3aed',
      backgroundColor: '#0a0a0c',
      surfaceColor: '#111116',
      cardTransparency: 1.0,
      windowTransparency: 1.0,
      borderColor: 'rgba(147, 51, 234, 0.28)',
      borderOpacity: 0.28,
      textColor: '#f3f4f6',
      textMutedColor: '#9ca3af',
      glowIntensity: 0.45,
      blurIntensity: 0,
      glassmorphismEnabled: false,
      reducedMotion: false,
      particlesEnabled: true
    }));

    // Trigger cursor move to attract particles to top center
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800, clientY: 450 }));
  `);

  const pages = [
    { id: 'home', name: '01-dashboard-home.png', title: 'Home Dashboard' },
    { id: 'instances', name: '02-instances-grid.png', title: 'Instances Management' },
    { modal: 'create', name: '03-create-instance-wizard.png', title: 'Instance Creation Wizard' },
    { id: 'servers', name: '04-victus-cloud-servers.png', title: 'Free Victus Cloud Servers' },
    { id: 'contents', name: '05-mods-content-manager.png', title: 'Mods & Shaders Browser' },
    { id: 'skins', name: '06-skin-cape-customizer.png', title: '3D Skin & Cape Customizer' },
    { id: 'settings', name: '07-settings-appearance.png', title: 'Preferences & Appearance' },
    { id: 'accounts', name: '08-accounts-manager.png', title: 'Account Profiles' },
    { id: 'console', name: '09-diagnostics-console.png', title: 'Game Diagnostics & Console' },
  ];

  for (const page of pages) {
    if (page.modal === 'create') {
      // Open Create Modal
      await win.webContents.executeJavaScript(`
        if (typeof window.__openCreateModal === 'function') {
          window.__openCreateModal();
        }
      `);
      await new Promise((r) => setTimeout(r, 1200));
      await saveShot(page.name, page.title);
      // Close modal
      await win.webContents.executeJavaScript(`
        if (typeof window.__setVictusTab === 'function') {
          window.__setVictusTab('instances');
        }
      `);
      await new Promise((r) => setTimeout(r, 600));
    } else {
      await win.webContents.executeJavaScript(`
        if (typeof window.__setVictusTab === 'function') {
          window.__setVictusTab('${page.id}');
        }
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800, clientY: 500 }));
      `);
      // Wait for React re-render, data fetch, and canvas initialization
      await new Promise((r) => setTimeout(r, 1800));
      await saveShot(page.name, page.title);
    }
  }

  console.log('SHOWCASE CAPTURE COMPLETE! All 9 high-res images rendered in Victus Purple.');
  app.quit();
});
