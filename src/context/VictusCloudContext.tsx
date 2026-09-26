import React, { createContext, useContext, useState, useEffect } from 'react';
import { VictusCloudUser, CloudSyncState } from '../types/cloud';
import { useLauncher } from './LauncherContext';

interface VictusCloudContextType {
  cloudUser: VictusCloudUser | null;
  isLoggedIn: boolean;
  syncState: CloudSyncState;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authPromptMessage: string;
  isWebPanelModalOpen: boolean;
  setIsWebPanelModalOpen: (open: boolean) => void;
  activeWebPanelServerId: string | null;
  setActiveWebPanelServerId: (id: string | null) => void;
  login: (usernameOrEmail: string, password?: string) => Promise<boolean>;
  quickConnect: (username?: string) => Promise<boolean>;
  logout: () => void;
  requireCloudAuth: (message?: string, callback?: () => void) => boolean;
  openWebPanel: (serverId?: string) => void;
  syncCloudData: () => Promise<void>;
  updateCoins: (newCoins: number) => void;
}

const VictusCloudContext = createContext<VictusCloudContextType | undefined>(undefined);

export const VictusCloudProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification, activeAccount } = useLauncher();

  const [cloudUser, setCloudUser] = useState<VictusCloudUser | null>(() => {
    try {
      const saved = localStorage.getItem('victus_cloud_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [syncState, setSyncState] = useState<CloudSyncState>({
    lastSynced: 'Just now',
    isSyncing: false,
    status: 'online',
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('Connect your Victus Cloud account to access this feature.');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const [isWebPanelModalOpen, setIsWebPanelModalOpen] = useState(false);
  const [activeWebPanelServerId, setActiveWebPanelServerId] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      if (cloudUser) {
        localStorage.setItem('victus_cloud_account', JSON.stringify(cloudUser));
      } else {
        localStorage.removeItem('victus_cloud_account');
      }
    } catch {}
  }, [cloudUser]);

  // Login implementation
  const login = async (usernameOrEmail: string, password?: string): Promise<boolean> => {
    setSyncState((prev) => ({ ...prev, isSyncing: true }));

    await new Promise((r) => setTimeout(r, 800));

    const cleanName = usernameOrEmail.includes('@')
      ? usernameOrEmail.split('@')[0]
      : usernameOrEmail.trim() || 'VictusUser';

    const newUser: VictusCloudUser = {
      id: `vcloud-${Date.now()}`,
      username: cleanName,
      email: usernameOrEmail.includes('@') ? usernameOrEmail.trim() : `${cleanName.toLowerCase()}@victusclient.net`,
      avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/128`,
      tier: 'Free Tier',
      coins: 450,
      maxServers: 3,
      totalRamMb: 8192,
      authToken: `vt_${Math.random().toString(36).substring(2)}${Date.now()}`,
      ssoToken: `sso_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      connectedSince: 'Today',
      cloudSyncEnabled: true,
      activeNodesCount: 2,
      webPanelUrl: 'https://panel.victusclient.net',
    };

    setCloudUser(newUser);
    setSyncState({
      lastSynced: 'Just now',
      isSyncing: false,
      status: 'online',
    });
    setIsAuthModalOpen(false);

    addNotification({
      type: 'success',
      title: 'Victus Cloud Bridge Connected',
      message: `Signed in as @${newUser.username}. Cloud nodes & Web Control Panel synchronized!`,
    });

    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }

    return true;
  };

  // Quick connect using current launcher player username
  const quickConnect = async (username?: string): Promise<boolean> => {
    const targetName = username || activeAccount?.username || 'VictusHero';
    return login(targetName);
  };

  // Logout
  const logout = () => {
    setCloudUser(null);
    localStorage.removeItem('victus_cloud_account');
    addNotification({
      type: 'info',
      title: 'Disconnected from Victus Cloud',
      message: 'Cloud sync suspended. Sign in anytime to reconnect your nodes.',
    });
  };

  // Guard action with cloud auth requirement
  const requireCloudAuth = (message?: string, callback?: () => void): boolean => {
    if (cloudUser) {
      if (callback) callback();
      return true;
    }

    setAuthPromptMessage(message || 'Sign in with your Victus Cloud account to proceed.');
    if (callback) {
      setPendingCallback(() => callback);
    }
    setIsAuthModalOpen(true);
    return false;
  };

  // Open Web Control Panel (both external and in-app bridge)
  const openWebPanel = (serverId?: string) => {
    if (!cloudUser) {
      requireCloudAuth('Sign in with Victus Cloud to access the Web Control Panel.', () => {
        openWebPanel(serverId);
      });
      return;
    }

    setActiveWebPanelServerId(serverId || null);
    setIsWebPanelModalOpen(true);

    const ssoUrl = `https://panel.victusclient.net/${serverId ? `server/${serverId}` : 'dashboard'}?sso=${cloudUser.ssoToken}&user=${encodeURIComponent(cloudUser.username)}`;

    if (window.electronAPI && window.electronAPI.openExternal) {
      // Allow user to also open in full external browser
    }
  };

  // Sync cloud telemetry
  const syncCloudData = async () => {
    if (!cloudUser) return;
    setSyncState((prev) => ({ ...prev, isSyncing: true }));
    await new Promise((r) => setTimeout(r, 900));
    setSyncState({
      lastSynced: 'Just now',
      isSyncing: false,
      status: 'online',
    });
    addNotification({
      type: 'success',
      title: 'Cloud Cluster Synced',
      message: 'All servers, player quotas, and coin balance synced with panel.victusclient.net',
    });
  };

  const updateCoins = (newCoins: number) => {
    setCloudUser((prev) => (prev ? { ...prev, coins: newCoins } : null));
  };

  return (
    <VictusCloudContext.Provider
      value={{
        cloudUser,
        isLoggedIn: !!cloudUser,
        syncState,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authPromptMessage,
        isWebPanelModalOpen,
        setIsWebPanelModalOpen,
        activeWebPanelServerId,
        setActiveWebPanelServerId,
        login,
        quickConnect,
        logout,
        requireCloudAuth,
        openWebPanel,
        syncCloudData,
        updateCoins,
      }}
    >
      {children}
    </VictusCloudContext.Provider>
  );
};

export const useVictusCloud = (): VictusCloudContextType => {
  const context = useContext(VictusCloudContext);
  if (!context) {
    throw new Error('useVictusCloud must be used within a VictusCloudProvider');
  }
  return context;
};
