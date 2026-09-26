import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Instance,
  Account,
  LaunchProgress,
  LogEntry,
  LauncherSettings,
} from '../types/launcher';
import { WALLPAPER_PRESETS, DEFAULT_WALLPAPER } from '../constants/wallpapers';
import { MINECRAFT_VERSIONS, DEFAULT_VERSION } from '../constants/versions';

export interface LauncherNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

interface LauncherContextType {
  instances: Instance[];
  activeInstance: Instance | null;
  accounts: Account[];
  activeAccount: Account | null;
  settings: LauncherSettings | null;
  logs: LogEntry[];
  launchProgress: Record<string, LaunchProgress>;
  notifications: LauncherNotification[];
  isElectron: boolean;
  systemInfo: { os: string; totalMem: number; freeMem: number; cpus: number } | null;

  // Actions
  setActiveInstance: (instance: Instance | null) => void;
  createInstance: (data: Partial<Instance>) => Promise<Instance>;
  updateInstance: (instance: Instance) => Promise<void>;
  deleteInstance: (id: string) => Promise<boolean>;
  duplicateInstance: (id: string) => Promise<Instance | null>;
  openFolder: (pathOrId: string, subfolder?: string) => Promise<void>;
  launchInstance: (id: string) => Promise<{ success: boolean; error?: string }>;
  killInstance: (id: string) => Promise<boolean>;
  
  // Accounts
  createOfflineAccount: (username: string, skinType?: 'classic' | 'slim') => Promise<Account>;
  startMicrosoftLogin: () => Promise<{ success: boolean; account?: Account; error?: string; userCode?: string; verificationUri?: string }>;
  switchAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Logs & Notifications
  addLog: (level: LogEntry['level'], message: string, source?: string) => void;
  clearLogs: () => void;
  addNotification: (type: LauncherNotification['type'], title: string, message: string) => void;
  removeNotification: (id: string) => void;

  // Settings
  updateSettings: (newSettings: LauncherSettings) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

declare global {
  interface Window {
    electronAPI?: import('../../electron/preload').IElectronAPI;
  }
}

// Sample default instances to ensure immediate glorious UI rendering
const INITIAL_INSTANCES: Instance[] = [
  {
    id: 'inst-victus-121',
    name: 'Victus Modded 1.21.4',
    version: '1.21.4',
    loader: 'fabric',
    loaderVersion: '0.19.5',
    ramMin: 2048,
    ramMax: 6144,
    status: 'idle',
    lastPlayed: 'Today at 6:45 PM',
    playTimeMinutes: 480,
    isFavorite: true,
    background: WALLPAPER_PRESETS[0].url,
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
    background: WALLPAPER_PRESETS[1].url,
    icon: '💎',
  },
  {
    id: 'inst-forge-120',
    name: 'Create & Magic 1.20.4',
    version: '1.20.4',
    loader: 'forge',
    loaderVersion: '47.3.0',
    ramMin: 4096,
    ramMax: 8192,
    status: 'idle',
    lastPlayed: '3 days ago',
    playTimeMinutes: 940,
    isFavorite: false,
    background: WALLPAPER_PRESETS[2].url,
    icon: '⚙️',
  },
  {
    id: 'inst-pvp-189',
    name: 'Hypixel PvP 1.8',
    version: '1.8',
    loader: 'fabric',
    ramMin: 1024,
    ramMax: 3072,
    status: 'idle',
    lastPlayed: '1 week ago',
    playTimeMinutes: 3400,
    isFavorite: false,
    background: WALLPAPER_PRESETS[3].url,
    icon: '⚔️',
  },
];

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-victus-demo',
    username: 'VictusHero',
    uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
    type: 'offline',
    skinUrl: 'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697',
    avatarUrl: 'https://mc-heads.net/avatar/VictusHero/128',
    lastUsed: 'Just now',
    isActive: true,
    status: 'active',
  },
];

export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const [instances, setInstances] = useState<Instance[]>(() => {
    try {
      const saved = localStorage.getItem('victus_instances');
      if (saved) {
        const parsed: Instance[] = JSON.parse(saved);
        return parsed.map((inst, idx) => {
          let updated = { ...inst };
          if (!updated.background || updated.background.includes('unsplash.com')) {
            updated.background = WALLPAPER_PRESETS[idx % WALLPAPER_PRESETS.length].url;
          }
          if (updated.version === '1.20.1') updated.version = '1.20.4';
          if (updated.version === '1.8.9') updated.version = '1.8';
          if (!MINECRAFT_VERSIONS.includes(updated.version as any)) {
            updated.version = DEFAULT_VERSION;
          }
          return updated;
        });
      }
      return INITIAL_INSTANCES;
    } catch {
      return INITIAL_INSTANCES;
    }
  });

  const [activeInstance, setActiveInstance] = useState<Instance | null>(() => instances[0] || null);

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem('victus_accounts');
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  const activeAccount = accounts.find((a) => a.isActive) || accounts[0] || null;

  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'launcher',
      message: 'VictusClient Core v1.0.0 initialized successfully.',
    },
    {
      id: 'log-init-2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Hardware acceleration enabled. Glassmorphism compositor ready.',
    },
  ]);

  const [launchProgress, setLaunchProgress] = useState<Record<string, LaunchProgress>>({});
  const [notifications, setNotifications] = useState<LauncherNotification[]>([]);
  const [systemInfo, setSystemInfo] = useState<{ os: string; totalMem: number; freeMem: number; cpus: number } | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('victus_instances', JSON.stringify(instances));
    } catch {}
  }, [instances]);

  useEffect(() => {
    try {
      localStorage.setItem('victus_accounts', JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  const addNotification = useCallback((type: LauncherNotification['type'], title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setNotifications((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string, source = 'Launcher') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source,
    };
    setLogs((prev) => [...prev.slice(-999), newEntry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Initialize with Electron IPC if available
  const refreshAll = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const electronInstances = await window.electronAPI.getInstances();
      if (electronInstances && electronInstances.length > 0) {
        setInstances(electronInstances);
        setActiveInstance((prev) => {
          if (!prev) return electronInstances[0];
          return electronInstances.find((i: Instance) => i.id === prev.id) || electronInstances[0];
        });
      }

      const electronAccounts = await window.electronAPI.getAccounts();
      if (electronAccounts && electronAccounts.length > 0) {
        setAccounts(electronAccounts);
      }

      const electronSettings = await window.electronAPI.getSettings();
      if (electronSettings) {
        setSettings(electronSettings);
      }

      const sys = await window.electronAPI.getSystemInfo();
      if (sys) setSystemInfo(sys);
    } catch (err) {
      console.error('Error syncing with Electron:', err);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      refreshAll();

      const unsubProgress = window.electronAPI.onLaunchProgress((data: LaunchProgress) => {
        setLaunchProgress((prev) => ({ ...prev, [data.instanceId]: data }));
        setInstances((prev) =>
          prev.map((i) => (i.id === data.instanceId ? { ...i, status: data.status } : i))
        );
      });

      const unsubLog = window.electronAPI.onLogMessage((log: LogEntry) => {
        setLogs((prev) => [...prev.slice(-999), log]);
      });

      const unsubExit = window.electronAPI.onMinecraftExit(({ instanceId, code }) => {
        setInstances((prev) =>
          prev.map((i) => (i.id === instanceId ? { ...i, status: 'stopped' } : i))
        );
        addNotification(
          code === 0 ? 'info' : 'warning',
          'Minecraft Closed',
          `Game process exited with code ${code}`
        );
      });

      return () => {
        unsubProgress();
        unsubLog();
        unsubExit();
      };
    }
  }, [refreshAll, addNotification]);

  // Instance Actions
  const createInstance = async (data: Partial<Instance>): Promise<Instance> => {
    const newInst: Instance = {
      id: `inst-${Date.now()}`,
      name: data.name || 'New Instance',
      version: data.version || DEFAULT_VERSION,
      loader: data.loader || 'vanilla',
      loaderVersion: data.loaderVersion,
      ramMin: data.ramMin || 2048,
      ramMax: data.ramMax || 4096,
      icon: data.icon || '🚀',
      background: data.background || DEFAULT_WALLPAPER,
      status: 'idle',
      lastPlayed: 'Never',
      playTimeMinutes: 0,
      isFavorite: false,
      jvmArgs: data.jvmArgs,
      resolution: data.resolution || { width: 854, height: 480 },
    };

    if (window.electronAPI) {
      const saved = await window.electronAPI.saveInstance(newInst);
      if (saved) {
        setInstances((prev) => [saved, ...prev]);
        setActiveInstance(saved);
        addNotification('success', 'Instance Created', `"${saved.name}" has been created.`);
        return saved;
      }
    }

    setInstances((prev) => [newInst, ...prev]);
    setActiveInstance(newInst);
    addNotification('success', 'Instance Created', `"${newInst.name}" has been created.`);
    return newInst;
  };

  const updateInstance = async (instance: Instance) => {
    if (window.electronAPI) {
      await window.electronAPI.saveInstance(instance);
    }
    setInstances((prev) => prev.map((i) => (i.id === instance.id ? instance : i)));
    if (activeInstance?.id === instance.id) {
      setActiveInstance(instance);
    }
    addNotification('success', 'Instance Updated', `Changes to "${instance.name}" saved.`);
  };

  const deleteInstance = async (id: string): Promise<boolean> => {
    const target = instances.find((i) => i.id === id);
    if (window.electronAPI) {
      await window.electronAPI.deleteInstance(id);
    }
    setInstances((prev) => prev.filter((i) => i.id !== id));
    if (activeInstance?.id === id) {
      const remaining = instances.filter((i) => i.id !== id);
      setActiveInstance(remaining[0] || null);
    }
    addNotification('info', 'Instance Deleted', `"${target?.name || 'Instance'}" has been deleted.`);
    return true;
  };

  const duplicateInstance = async (id: string): Promise<Instance | null> => {
    const target = instances.find((i) => i.id === id);
    if (!target) return null;

    if (window.electronAPI) {
      const dup = await window.electronAPI.duplicateInstance(id);
      if (dup) {
        setInstances((prev) => [dup, ...prev]);
        addNotification('success', 'Instance Duplicated', `Created "${dup.name}"`);
        return dup;
      }
    }

    const dup: Instance = {
      ...target,
      id: `inst-${Date.now()}`,
      name: `${target.name} (Copy)`,
      lastPlayed: 'Never',
      playTimeMinutes: 0,
      status: 'idle',
    };
    setInstances((prev) => [dup, ...prev]);
    addNotification('success', 'Instance Duplicated', `Created "${dup.name}"`);
    return dup;
  };

  const openFolder = async (pathOrId: string, subfolder?: string) => {
    if (window.electronAPI) {
      await window.electronAPI.openFolder(pathOrId, subfolder);
    } else {
      addNotification('info', 'Open Folder', `Opening folder for instance ${pathOrId} (${subfolder || 'root'})`);
    }
  };

  const launchInstance = async (id: string) => {
    const target = instances.find((i) => i.id === id);
    if (!target) return { success: false, error: 'Instance not found' };

    addLog('launcher', `Starting launch sequence for "${target.name}" (${target.version} - ${target.loader})...`);
    addNotification('info', 'Launching Minecraft', `Preparing "${target.name}"...`);

    if (window.electronAPI) {
      return await window.electronAPI.launchMinecraft(id);
    }

    // Realistic Web/Dev Simulation
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'preparing' } : i))
    );

    const steps: { status: Instance['status']; percent: number; msg: string }[] = [
      { status: 'preparing', percent: 15, msg: 'Resolving version metadata...' },
      { status: 'downloading', percent: 35, msg: 'Verifying game libraries & assets...' },
      { status: 'downloading', percent: 70, msg: 'Downloading assets (98/104 MB)...' },
      { status: 'installing', percent: 90, msg: 'Extracting natives & configuring JVM...' },
      { status: 'launching', percent: 98, msg: 'Starting Java Virtual Machine...' },
      { status: 'running', percent: 100, msg: 'Minecraft is running.' },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        const step = steps[current];
        setLaunchProgress((prev) => ({
          ...prev,
          [id]: {
            instanceId: id,
            status: step.status as any,
            percent: step.percent,
            message: step.msg,
          },
        }));
        setInstances((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: step.status } : i))
        );
        addLog('launcher', `[Launch] ${step.msg}`);
        current++;
      } else {
        clearInterval(interval);
        addLog('info', '[Render thread/INFO]: Setting user: ' + (activeAccount?.username || 'VictusHero'));
        addLog('info', '[Render thread/INFO]: Loaded 7 glsl shader programs');
        addLog('info', '[Render thread/INFO]: Backend library: LWJGL version 3.3.3-snapshot');
        addNotification('success', 'Minecraft Running', `${target.name} launched successfully!`);
      }
    }, 700);

    return { success: true };
  };

  const killInstance = async (id: string): Promise<boolean> => {
    if (window.electronAPI) {
      return await window.electronAPI.killMinecraft(id);
    }
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'stopped' } : i))
    );
    addLog('warn', `Terminated instance process: ${id}`);
    addNotification('warning', 'Process Terminated', 'Minecraft process stopped.');
    return true;
  };

  // Accounts
  const createOfflineAccount = async (username: string, _skinType: 'classic' | 'slim' = 'classic'): Promise<Account> => {
    if (window.electronAPI) {
      const acc = await window.electronAPI.createOfflineAccount(username, _skinType);
      if (acc) {
        setAccounts((prev) => [...prev.map((a) => ({ ...a, isActive: false })), acc]);
        addNotification('success', 'Account Added', `Welcome, ${username}!`);
        return acc;
      }
    }

    const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const validUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      username: username.trim(),
      uuid: validUuid,
      type: 'offline',
      skinUrl: 'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697',
      avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(username.trim())}/128`,
      lastUsed: 'Just now',
      isActive: true,
      status: 'active',
    };

    setAccounts((prev) => [...prev.map((a) => ({ ...a, isActive: false })), newAcc]);
    addNotification('success', 'Account Created', `Created offline account "${username}"`);
    return newAcc;
  };

  const startMicrosoftLogin = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.startMicrosoftLogin();
      if (res.success && res.account) {
        setAccounts((prev) => [...prev.map((a) => ({ ...a, isActive: false })), res.account]);
        addNotification('success', 'Microsoft Login', `Signed in as ${res.account.username}`);
      }
      return res;
    }
    addNotification('info', 'Microsoft Login', 'Simulating Microsoft OAuth device login flow...');
    return {
      success: true,
      userCode: 'VICT-US99',
      verificationUri: 'https://microsoft.com/link',
    };
  };

  const switchAccount = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.setActiveAccount(id);
    }
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isActive: a.id === id,
        lastUsed: a.id === id ? 'Just now' : a.lastUsed,
      }))
    );
    const target = accounts.find((a) => a.id === id);
    addNotification('info', 'Active Account Switched', `Now playing as ${target?.username}`);
  };

  const deleteAccount = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteAccount(id);
    }
    const remaining = accounts.filter((a) => a.id !== id);
    if (remaining.length > 0 && !remaining.some((a) => a.isActive)) {
      remaining[0].isActive = true;
    }
    setAccounts(remaining);
    addNotification('info', 'Account Removed', 'Account was successfully removed.');
  };

  const updateSettings = async (newSettings: LauncherSettings) => {
    setSettings(newSettings);
    if (window.electronAPI) {
      await window.electronAPI.saveSettings(newSettings);
    }
    addNotification('success', 'Settings Saved', 'Launcher settings updated.');
  };

  return (
    <LauncherContext.Provider
      value={{
        instances,
        activeInstance,
        accounts,
        activeAccount,
        settings,
        logs,
        launchProgress,
        notifications,
        isElectron,
        systemInfo,
        setActiveInstance,
        createInstance,
        updateInstance,
        deleteInstance,
        duplicateInstance,
        openFolder,
        launchInstance,
        killInstance,
        createOfflineAccount,
        startMicrosoftLogin,
        switchAccount,
        deleteAccount,
        addLog,
        clearLogs,
        addNotification,
        removeNotification,
        updateSettings,
        refreshAll,
      }}
    >
      {children}
    </LauncherContext.Provider>
  );
};

export const useLauncher = () => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncher must be used within a LauncherProvider');
  }
  return context;
};
