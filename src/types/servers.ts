export type ServerSoftware = 'paper' | 'purpur' | 'fabric' | 'forge' | 'vanilla' | 'bungeecord';

export type CloudServerStatus = 'offline' | 'starting' | 'online' | 'stopping' | 'restarting';

export interface CloudServer {
  id: string;
  name: string;
  subdomain: string;
  port: number;
  version: string;
  software: ServerSoftware;
  status: CloudServerStatus;
  playersOnline: number;
  maxPlayers: number;
  ramMb: number;
  cpuCores: number;
  diskGb: number;
  motd: string;
  region: string;
  createdAt: string;
  uptimeMinutes: number;
  cpuPercent: number;
  ramUsedMb: number;
  autoSleep: boolean;
}

export interface CloudWallet {
  coins: number;
  lastClaimDate?: string;
  claimedToday: boolean;
  tier: 'Free Tier' | 'Pro Booster';
  maxServers: number;
  totalRamLimitMb: number;
}
