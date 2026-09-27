export interface VictusCloudUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  tier: string;
  coins: number;
  total_cp?: number;
  maxServers: number;
  totalRamMb: number;
  authToken?: string;
  accessToken?: string;
  ssoToken?: string;
  connectedSince: string;
  cloudSyncEnabled: boolean;
  activeNodesCount: number;
  webPanelUrl: string;
  referralCode?: string;
}

export interface CloudSyncState {
  lastSynced: string;
  isSyncing: boolean;
  status: 'online' | 'syncing' | 'offline' | 'error';
}
