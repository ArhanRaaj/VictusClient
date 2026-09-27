import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VictusCloudUser, CloudSyncState } from '../types/cloud';
import { CloudServer } from '../types/servers';
import { useLauncher } from './LauncherContext';

interface VictusCloudContextType {
  cloudUser: VictusCloudUser | null;
  isLoggedIn: boolean;
  syncState: CloudSyncState;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authPromptMessage: string;
  freeServers: CloudServer[];
  isServersLoading: boolean;
  activeLinkCode: string | null;
  activeLinkUrl: string | null;
  cancelBrowserAuth: () => void;
  loginWithBrowser: () => Promise<boolean>;
  loginWithCredentials: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  requireCloudAuth: (message?: string, callback?: () => void) => boolean;
  openPanelSSO: (serverIdentifier?: string) => Promise<void>;
  openCreateFreeServer: () => void;
  refreshUserData: () => Promise<void>;
  refreshServers: () => Promise<void>;
  powerServer: (serverUuid: string, nodeId: number, action: 'start' | 'stop' | 'restart') => Promise<boolean>;
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

  const [freeServers, setFreeServers] = useState<CloudServer[]>([]);
  const [isServersLoading, setIsServersLoading] = useState(false);

  const [syncState, setSyncState] = useState<CloudSyncState>({
    lastSynced: 'Just now',
    isSyncing: false,
    status: 'online',
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('Connect your Victus Cloud account to access this feature.');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [activeLinkCode, setActiveLinkCode] = useState<string | null>(null);
  const [activeLinkUrl, setActiveLinkUrl] = useState<string | null>(null);

  // Listen for link codes from desktop core
  useEffect(() => {
    if (window.electronAPI?.onVictusCloudLinkCode) {
      const unsub = window.electronAPI.onVictusCloudLinkCode((info) => {
        setActiveLinkCode(info.code);
        setActiveLinkUrl(info.url);
      });
      return unsub;
    }
  }, []);

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

  // Refresh user coins and profile from Supabase
  const refreshUserData = useCallback(async () => {
    if (!cloudUser?.email && !cloudUser?.id) return;
    try {
      setSyncState((prev) => ({ ...prev, isSyncing: true }));
      let profile: any = null;

      if (window.electronAPI?.victusCloudGetProfile) {
        profile = await window.electronAPI.victusCloudGetProfile(cloudUser.email || cloudUser.id);
      }

      if (profile) {
        setCloudUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            username: profile.username || prev.username,
            avatarUrl: profile.avatar_url || prev.avatarUrl,
            coins: typeof profile.total_cp === 'number' ? profile.total_cp : prev.coins,
            total_cp: typeof profile.total_cp === 'number' ? profile.total_cp : prev.total_cp,
            tier: profile.cp_tier || prev.tier,
            referralCode: profile.referral_code || prev.referralCode,
          };
        });
      }

      setSyncState({
        lastSynced: 'Just now',
        isSyncing: false,
        status: 'online',
      });
    } catch (e) {
      console.warn('[VictusCloud] Failed to refresh profile:', e);
      setSyncState((prev) => ({ ...prev, isSyncing: false, status: 'error' }));
    }
  }, [cloudUser?.email, cloudUser?.id]);

  // Refresh Free Servers from Pterodactyl Panel
  const refreshServers = useCallback(async () => {
    if (!cloudUser?.email) {
      setFreeServers([]);
      return;
    }

    try {
      setIsServersLoading(true);
      if (window.electronAPI?.victusCloudGetServers) {
        const rawServers = await window.electronAPI.victusCloudGetServers(cloudUser.email);
        const mapped: CloudServer[] = rawServers.map((s: any) => ({
          id: `srv-${s.identifier || s.id}`,
          name: s.name,
          subdomain: s.ip,
          port: s.port,
          version: '1.21.4',
          software: 'paper',
          status: s.status,
          playersOnline: s.playersOnline || 0,
          maxPlayers: s.maxPlayers || 20,
          ramMb: s.ramMb || 2048,
          cpuCores: 2,
          diskGb: 10,
          motd: `§b§l${s.name} §7• §a24/7 Free Victus Cloud`,
          region: s.nodeId === 4 ? 'Singapore (SG-1)' : 'Germany (Frankfurt DE-1)',
          createdAt: 'Active',
          uptimeMinutes: 120,
          cpuPercent: s.cpuPercent || 0,
          ramUsedMb: Math.round((s.ramMb || 2048) * 0.4),
          autoSleep: true,
          identifier: s.identifier,
          uuid: s.uuid,
          nodeId: s.nodeId,
          panelUrl: s.panelUrl,
          fullAddress: s.fullAddress,
        }));
        setFreeServers(mapped);
      }
    } catch (e) {
      console.warn('[VictusCloud] Failed to fetch servers:', e);
    } finally {
      setIsServersLoading(false);
    }
  }, [cloudUser?.email]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (cloudUser) {
      refreshUserData();
      refreshServers();
    }
  }, [cloudUser?.email]);

  // Periodic poll for coins and servers every 30s
  useEffect(() => {
    if (!cloudUser) return;
    const interval = setInterval(() => {
      refreshUserData();
      refreshServers();
    }, 30000);
    return () => clearInterval(interval);
  }, [cloudUser, refreshUserData, refreshServers]);

  // Cancel ongoing browser link session
  const cancelBrowserAuth = useCallback(() => {
    if (window.electronAPI?.victusCloudCancelWebAuth) {
      window.electronAPI.victusCloudCancelWebAuth();
    }
    setActiveLinkCode(null);
    setActiveLinkUrl(null);
    setSyncState((prev) => ({ ...prev, isSyncing: false }));
  }, []);

  // Login with Browser (External browser with Passkey & Google SSO support via /mc-link)
  const loginWithBrowser = async (): Promise<boolean> => {
    try {
      setSyncState((prev) => ({ ...prev, isSyncing: true }));
      if (!window.electronAPI?.victusCloudStartWebAuth) {
        throw new Error('Desktop bridge unavailable');
      }

      const res = await window.electronAPI.victusCloudStartWebAuth(activeAccount?.username || 'VictusClient');
      setActiveLinkCode(null);
      setActiveLinkUrl(null);

      if (!res.success || !res.profile) {
        if (res.error && !res.error.toLowerCase().includes('cancel') && !res.error.toLowerCase().includes('closed')) {
          addNotification({
            type: 'error',
            title: 'Victus Cloud Login',
            message: res.error,
          });
        }
        setSyncState((prev) => ({ ...prev, isSyncing: false }));
        return false;
      }

      const p = res.profile;
      const newUser: VictusCloudUser = {
        id: p.id,
        username: p.username,
        email: p.email || '',
        avatarUrl: p.avatar_url || `https://mc-heads.net/avatar/${encodeURIComponent(p.username)}/128`,
        tier: p.cp_tier || 'Starter',
        coins: typeof p.total_cp === 'number' ? p.total_cp : 0,
        total_cp: p.total_cp,
        maxServers: 3,
        totalRamMb: 8192,
        accessToken: res.accessToken,
        connectedSince: 'Today',
        cloudSyncEnabled: true,
        activeNodesCount: 2,
        webPanelUrl: 'https://control.victuscloud.com',
        referralCode: p.referral_code,
      };

      setCloudUser(newUser);
      setIsAuthModalOpen(false);
      setSyncState({
        lastSynced: 'Just now',
        isSyncing: false,
        status: 'online',
      });

      addNotification({
        type: 'success',
        title: 'Victus Cloud Linked',
        message: `Welcome, @${newUser.username}! Connected with ${newUser.coins.toLocaleString()} Coins.`,
      });

      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }

      return true;
    } catch (e: any) {
      console.warn('[VictusCloud] Browser auth error:', e);
      setActiveLinkCode(null);
      setActiveLinkUrl(null);
      setSyncState((prev) => ({ ...prev, isSyncing: false }));
      addNotification({
        type: 'error',
        title: 'Authentication Error',
        message: e.message || 'Failed to authenticate with Victus Cloud.',
      });
      return false;
    }
  };

  // Login with Credentials
  const loginWithCredentials = async (email: string, pass: string): Promise<boolean> => {
    try {
      setSyncState((prev) => ({ ...prev, isSyncing: true }));
      if (!window.electronAPI?.victusCloudLoginCredentials) {
        throw new Error('Desktop bridge unavailable');
      }

      const res = await window.electronAPI.victusCloudLoginCredentials(email, pass);
      if (!res.success || !res.profile) {
        addNotification({
          type: 'error',
          title: 'Sign In Failed',
          message: res.error || 'Invalid email or password.',
        });
        setSyncState((prev) => ({ ...prev, isSyncing: false }));
        return false;
      }

      const p = res.profile;
      const newUser: VictusCloudUser = {
        id: p.id,
        username: p.username,
        email: p.email,
        avatarUrl: p.avatar_url || `https://mc-heads.net/avatar/${encodeURIComponent(p.username)}/128`,
        tier: p.cp_tier || 'Starter',
        coins: typeof p.total_cp === 'number' ? p.total_cp : 0,
        total_cp: p.total_cp,
        maxServers: 3,
        totalRamMb: 8192,
        accessToken: res.accessToken,
        connectedSince: 'Today',
        cloudSyncEnabled: true,
        activeNodesCount: 2,
        webPanelUrl: 'https://control.victuscloud.com',
        referralCode: p.referral_code,
      };

      setCloudUser(newUser);
      setIsAuthModalOpen(false);
      setSyncState({
        lastSynced: 'Just now',
        isSyncing: false,
        status: 'online',
      });

      addNotification({
        type: 'success',
        title: 'Victus Cloud Connected',
        message: `Signed in as @${newUser.username}. ${newUser.coins.toLocaleString()} Coins synchronized.`,
      });

      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }

      return true;
    } catch (e: any) {
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: e.message || 'Unable to connect to Victus Cloud.',
      });
      setSyncState((prev) => ({ ...prev, isSyncing: false }));
      return false;
    }
  };

  // Logout
  const logout = () => {
    if (window.electronAPI?.victusCloudCancelWebAuth) {
      window.electronAPI.victusCloudCancelWebAuth();
    }
    if (window.electronAPI?.victusCloudLogout) {
      window.electronAPI.victusCloudLogout().catch(() => {});
    }
    setCloudUser(null);
    setFreeServers([]);
    localStorage.removeItem('victus_cloud_account');
    addNotification({
      type: 'info',
      title: 'Victus Cloud Disconnected',
      message: 'Your account has been unlinked from Victus Client.',
    });
  };

  // Require Auth Guard
  const requireCloudAuth = (message?: string, callback?: () => void): boolean => {
    if (cloudUser) {
      if (callback) callback();
      return true;
    }
    setAuthPromptMessage(message || 'Connect your Victus Cloud account to manage free servers.');
    if (callback) {
      setPendingCallback(() => callback);
    }
    setIsAuthModalOpen(true);
    return false;
  };

  // Open SSO into Victus Panel
  const openPanelSSO = async (serverIdentifier?: string) => {
    if (!cloudUser) {
      requireCloudAuth('Sign in with Victus Cloud to access your servers in Victus Panel.');
      return;
    }

    try {
      if (window.electronAPI?.victusCloudGetSSOUrl) {
        const id = serverIdentifier || '';
        const res = await window.electronAPI.victusCloudGetSSOUrl(id, cloudUser.accessToken);
        const urlToOpen = res.url || `https://control.victuscloud.com/server/${id}`;
        if (window.electronAPI?.openExternal) {
          await window.electronAPI.openExternal(urlToOpen);
        } else {
          window.open(urlToOpen, '_blank');
        }
      } else {
        const fallback = serverIdentifier
          ? `https://control.victuscloud.com/server/${serverIdentifier}`
          : 'https://control.victuscloud.com';
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(fallback);
        } else {
          window.open(fallback, '_blank');
        }
      }
    } catch (e) {
      console.warn('[VictusCloud] SSO open failed:', e);
    }
  };

  // Open Free Server Creation Page
  const openCreateFreeServer = () => {
    if (!cloudUser) {
      requireCloudAuth('Create an account or sign in with Victus Cloud to deploy your free server.', () => {
        openCreateFreeServer();
      });
      return;
    }

    if (window.electronAPI?.victusCloudOpenCreatePage) {
      window.electronAPI.victusCloudOpenCreatePage();
    } else if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal('https://victuscloud.com/free?createServer=1');
    } else {
      window.open('https://victuscloud.com/free?createServer=1', '_blank');
    }
  };

  // Wings Node Power Action (Start / Stop / Restart)
  const powerServer = async (
    serverUuid: string,
    nodeId: number,
    action: 'start' | 'stop' | 'restart'
  ): Promise<boolean> => {
    if (!window.electronAPI?.victusCloudPowerAction) return false;

    // Optimistic UI state
    setFreeServers((prev) =>
      prev.map((s) => {
        if (s.uuid === serverUuid) {
          return {
            ...s,
            status: action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'restarting',
          };
        }
        return s;
      })
    );

    const res = await window.electronAPI.victusCloudPowerAction(serverUuid, nodeId, action);
    if (!res.success) {
      addNotification({
        type: 'error',
        title: `Server ${action.toUpperCase()} Failed`,
        message: res.error || `Could not execute ${action} on node.`,
      });
      refreshServers();
      return false;
    }

    addNotification({
      type: 'success',
      title: `Server ${action === 'start' ? 'Starting' : action === 'stop' ? 'Stopping' : 'Restarting'}`,
      message: `Power signal "${action}" successfully dispatched.`,
    });

    // Check status after 3s and 8s
    setTimeout(refreshServers, 3000);
    setTimeout(refreshServers, 8000);
    return true;
  };

  const updateCoins = (newCoins: number) => {
    setCloudUser((prev) => (prev ? { ...prev, coins: newCoins, total_cp: newCoins } : null));
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
        freeServers,
        isServersLoading,
        activeLinkCode,
        activeLinkUrl,
        cancelBrowserAuth,
        loginWithBrowser,
        loginWithCredentials,
        logout,
        requireCloudAuth,
        openPanelSSO,
        openCreateFreeServer,
        refreshUserData,
        refreshServers,
        powerServer,
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
