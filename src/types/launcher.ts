export type ModLoader = 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';

export interface Instance {
  id: string;
  name: string;
  version: string;
  loader: ModLoader;
  loaderVersion?: string;
  ramMin: number; // in MB
  ramMax: number; // in MB
  javaPath?: string;
  jvmArgs?: string;
  /** Opt-in: lower the game's graphics settings at launch for more frames per second. */
  performancePreset?: boolean;
  resolution?: { width: number; height: number };
  icon?: string;
  background?: string;
  lastPlayed?: string;
  playTimeMinutes?: number;
  isFavorite?: boolean;
  status?: InstanceStatus;
  gameDir?: string;
}

export type InstanceStatus =
  | 'idle'
  | 'preparing'
  | 'downloading'
  | 'installing'
  | 'launching'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface LaunchProgress {
  instanceId: string;
  status: InstanceStatus;
  percent: number;
  message: string;
  details?: string;
}

export interface Account {
  id: string;
  username: string;
  uuid: string;
  type: 'microsoft' | 'offline';
  skinUrl?: string;
  avatarUrl?: string;
  lastUsed?: string;
  isActive?: boolean;
  status?: 'active' | 'expired' | 'offline';
}

export interface JavaInstallation {
  path: string;
  version: string;
  majorVersion: number;
  arch: string;
  vendor?: string;
  isDefault?: boolean;
}

export type ContentCategory =
  | 'mods'
  | 'shaders'
  | 'resourcepacks'
  | 'modpacks'
  | 'datapacks';

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  iconUrl?: string;
  categories: string[];
  downloads: number;
  follows: number;
  dateModified?: string;
  latestVersion?: string;
  loaders: string[];
  gameVersions: string[];
  projectType: ContentCategory;
  isInstalled?: boolean;
  installedFile?: string;
}

export interface InstalledModFile {
  fileName: string;
  name: string;
  version?: string;
  enabled: boolean;
  size: number;
  modId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'launcher';
  message: string;
  source?: string;
}

export interface ThemeConfig {
  preset: string;
  primaryAccent: string;
  primaryHover: string;
  primaryLight: string;
  secondaryAccent: string;
  backgroundColor: string;
  surfaceColor: string;
  cardTransparency: number; // 0.1 to 1.0 (card glass opacity)
  windowTransparency?: number; // 0.1 to 1.0 (main window smoked glass opacity)
  borderColor: string;
  borderOpacity: number; // 0.05 to 0.5
  textColor: string;
  textMutedColor: string;
  glowIntensity: number; // 0.0 to 1.0
  blurIntensity: number; // 0px to 32px
  glassmorphismEnabled: boolean;
  reducedMotion: boolean;
  customBackgroundUrl?: string;
  customBackgroundOpacity: number;
  sidebarColor?: string;
  particlesEnabled?: boolean;
}

export interface LauncherSettings {
  general: {
    startMinimized: boolean;
    startWithWindows: boolean;
    checkUpdates: boolean;
    confirmDelete: boolean;
    notifications: boolean;
    sidebarCollapsed: boolean;
  };
  appearance: ThemeConfig;
  minecraft: {
    defaultRamMin: number;
    defaultRamMax: number;
    defaultLoader: ModLoader;
    defaultResolution: { width: number; height: number };
    fullscreen: boolean;
    defaultJvmArgs: string;
    gameDirectory: string;
  };
  java: {
    autoDetect: boolean;
    selectedJavaPath: string;
    javaInstallations: JavaInstallation[];
  };
  downloads: {
    downloadDirectory: string;
    concurrentDownloads: number;
    downloadMirror: 'mojang' | 'bmclapi' | 'official';
    bandwidthLimit: number; // 0 for unlimited
  };
  launcher: {
    version: string;
    autoUpdate: boolean;
  };
}

export interface MinecraftVersionMeta {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  time: string;
  releaseTime: string;
}

export interface LoaderVersionMeta {
  version: string;
  stable: boolean;
}
