export interface VictusCloudUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  tier: 'Free Tier' | 'Pro Booster' | 'Enterprise';
  coins: number;
  maxServers: number;
  totalRamMb: number;
  authToken: string;
  ssoToken: string;
  connectedSince: string;
  cloudSyncEnabled: boolean;
  activeNodesCount: number;
  webPanelUrl: string;
}

export interface CloudSyncState {
  lastSynced: string;
  isSyncing: boolean;
  status: 'online' | 'syncing' | 'offline' | 'error';
}
