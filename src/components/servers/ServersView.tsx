import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Play,
  Square,
  RotateCw,
  Copy,
  Check,
  Coins,
  Shield,
  Zap,
  Users,
  Cpu,
  Terminal,
  Trash2,
  Sparkles,
  Globe,
  X,
  Gift,
  Activity,
  Flame,
  Compass,
  Sliders,
  Radio,
  ExternalLink,
  ChevronRight,
  HardDrive,
} from 'lucide-react';
import { CloudServer, CloudWallet, ServerSoftware } from '../../types/servers';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme } from '../../context/ThemeContext';
import { MINECRAFT_VERSIONS, DEFAULT_VERSION } from '../../constants/versions';
import { useVictusCloud } from '../../context/VictusCloudContext';

interface ServersViewProps {
  setActiveTab?: (tab: string) => void;
}

const DEFAULT_SERVERS: CloudServer[] = [
  {
    id: 'srv-victus-smp',
    name: 'Victus Friends SMP',
    subdomain: 'smp-victus.victuscloud.net',
    port: 25565,
    version: '1.21.4',
    software: 'paper',
    status: 'online',
    playersOnline: 4,
    maxPlayers: 20,
    ramMb: 3072,
    cpuCores: 2,
    diskGb: 15,
    motd: '§d§lVICTUS §fSurvival Community §7• §a24/7 Online',
    region: 'US East (Virginia)',
    createdAt: '2 days ago',
    uptimeMinutes: 480,
    cpuPercent: 18,
    ramUsedMb: 1740,
    autoSleep: true,
  },
  {
    id: 'srv-hardcore-void',
    name: 'Hardcore Void World',
    subdomain: 'hardcore-void.victuscloud.net',
    port: 25566,
    version: '1.20.4',
    software: 'fabric',
    status: 'offline',
    playersOnline: 0,
    maxPlayers: 10,
    ramMb: 2048,
    cpuCores: 2,
    diskGb: 10,
    motd: '§c§lHARDCORE §8One life only! §7• §cStandby',
    region: 'EU Central (Frankfurt)',
    createdAt: '5 days ago',
    uptimeMinutes: 0,
    cpuPercent: 0,
    ramUsedMb: 0,
    autoSleep: true,
  },
];

const DEFAULT_WALLET: CloudWallet = {
  coins: 450,
  claimedToday: false,
  tier: 'Free Tier',
  maxServers: 3,
  totalRamLimitMb: 8192,
};

// Minecraft color codes mapping
const MC_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  'a': '#55ff55',
  'b': '#55ffff',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
};

const renderMinecraftMotd = (motd: string) => {
  const parts = motd.split(/(§[0-9a-fk-or])/gi);
  let currentColor = '#ffffff';
  let isBold = false;

  return (
    <span className="font-mono tracking-wide leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('§')) {
          const code = part.charAt(1).toLowerCase();
          if (MC_COLORS[code]) {
            currentColor = MC_COLORS[code];
            isBold = false;
          } else if (code === 'l') {
            isBold = true;
          } else if (code === 'r') {
            currentColor = '#ffffff';
            isBold = false;
          }
          return null;
        }
        return (
          <span key={idx} style={{ color: currentColor, fontWeight: isBold ? 700 : 400 }}>
            {part}
          </span>
        );
      })}
    </span>
  );
};

// Ping Signal Bars (authentic Minecraft style)
const PingBars: React.FC<{ pingMs: number }> = ({ pingMs }) => {
  const bars = [1, 2, 3, 4, 5];
  const activeCount = pingMs < 50 ? 5 : pingMs < 100 ? 4 : pingMs < 180 ? 3 : 2;
  const barColor = pingMs < 80 ? 'bg-emerald-400' : pingMs < 150 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="flex items-end space-x-0.5 h-3 select-none" title={`Ping: ${pingMs}ms`}>
      {bars.map((bar, i) => (
        <span
          key={bar}
          className={`w-0.5 rounded-sm transition-all ${
            i < activeCount ? barColor : 'bg-white/15'
          }`}
          style={{ height: `${(bar / 5) * 100}%` }}
        />
      ))}
      <span className="ml-1 text-[10px] font-mono text-white/50">{pingMs}ms</span>
    </div>
  );
};

export const ServersView: React.FC<ServersViewProps> = ({ setActiveTab }) => {
  const { addNotification, activeInstance, launchInstance } = useLauncher();
  const { theme } = useTheme();
  const accentColor = theme.sidebarColor || theme.primaryAccent || '#7c3aed';

  const {
    cloudUser,
    isLoggedIn,
    requireCloudAuth,
    openWebPanel,
    setIsAuthModalOpen,
    syncCloudData,
    syncState,
    updateCoins,
  } = useVictusCloud();

  const [servers, setServers] = useState<CloudServer[]>(() => {
    try {
      const saved = localStorage.getItem('victus_cloud_servers');
      return saved ? JSON.parse(saved) : DEFAULT_SERVERS;
    } catch {
      return DEFAULT_SERVERS;
    }
  });

  const [wallet, setWallet] = useState<CloudWallet>(() => {
    try {
      const saved = localStorage.getItem('victus_cloud_wallet');
      return saved ? JSON.parse(saved) : DEFAULT_WALLET;
    } catch {
      return DEFAULT_WALLET;
    }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeConsoleServer, setActiveConsoleServer] = useState<CloudServer | null>(null);
  const [serverConsoleLogs, setServerConsoleLogs] = useState<string[]>([]);
  const [claimingCoins, setClaimingCoins] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync with cloudUser if logged in
  useEffect(() => {
    if (cloudUser) {
      setWallet((prev) => ({
        ...prev,
        coins: cloudUser.coins,
        tier: cloudUser.tier,
        maxServers: cloudUser.maxServers,
        totalRamLimitMb: cloudUser.totalRamMb,
      }));
    }
  }, [cloudUser]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('victus_cloud_servers', JSON.stringify(servers));
    } catch {}
  }, [servers]);

  useEffect(() => {
    try {
      localStorage.setItem('victus_cloud_wallet', JSON.stringify(wallet));
    } catch {}
  }, [wallet]);

  // Copy IP handler
  const handleCopyIp = (server: CloudServer) => {
    const address = `${server.subdomain}:${server.port}`;
    navigator.clipboard.writeText(address);
    setCopiedId(server.id);
    addNotification({
      type: 'success',
      title: 'Server Address Copied',
      message: `${address} copied to clipboard! Paste in Minecraft multiplayer.`,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Launch Minecraft & Join Server
  const handleDirectConnect = (server: CloudServer) => {
    const address = `${server.subdomain}:${server.port}`;
    navigator.clipboard.writeText(address);

    if (activeInstance) {
      launchInstance(activeInstance.id);
      addNotification({
        type: 'success',
        title: 'Launching & Connecting',
        message: `Launching "${activeInstance.name}"... Server address ${address} is copied to your clipboard!`,
      });
    } else {
      addNotification({
        type: 'info',
        title: 'Server IP Copied',
        message: `${address} copied! Launch your favorite instance and join directly.`,
      });
    }
  };

  // Start Server
  const handleStartServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'starting' as const } : s))
    );
    addNotification({
      type: 'info',
      title: 'Booting Cloud Node',
      message: 'Spinning up container, allocating RAM, and preparing world chunks...',
    });

    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'online' as const,
                uptimeMinutes: 1,
                cpuPercent: 14,
                ramUsedMb: Math.round(s.ramMb * 0.45),
              }
            : s
        )
      );
      addNotification({
        type: 'success',
        title: 'Server Online',
        message: 'Your Minecraft server is now live and accepting player connections!',
      });
    }, 2800);
  };

  // Stop Server
  const handleStopServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'stopping' as const } : s))
    );

    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'offline' as const,
                playersOnline: 0,
                cpuPercent: 0,
                ramUsedMb: 0,
                uptimeMinutes: 0,
              }
            : s
        )
      );
      addNotification({
        type: 'warning',
        title: 'Server Stopped',
        message: 'World saved and container put in standby mode.',
      });
    }, 1800);
  };

  // Restart Server
  const handleRestartServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'restarting' as const } : s))
    );

    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'online' as const,
                uptimeMinutes: 1,
                cpuPercent: 12,
                ramUsedMb: Math.round(s.ramMb * 0.4),
              }
            : s
        )
      );
      addNotification({
        type: 'success',
        title: 'Server Restarted',
        message: 'Server reboot completed cleanly in 2.2s.',
      });
    }, 2200);
  };

  // Delete Server
  const handleDeleteServer = (id: string, name: string) => {
    setDeletingId(id);
  };

  const confirmDeleteServer = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
    addNotification({
      type: 'info',
      title: 'Server Deleted',
      message: `Node removed and free RAM quota reclaimed.`,
    });
  };

  // Claim Daily Coins
  const handleClaimCoins = () => {
    if (wallet.claimedToday) return;
    setClaimingCoins(true);
    setTimeout(() => {
      setWallet((prev) => ({
        ...prev,
        coins: prev.coins + 50,
        claimedToday: true,
      }));
      setClaimingCoins(false);
      addNotification({
        type: 'success',
        title: 'Daily Bonus Claimed! +50 Coins',
        message: 'Coins added to your Victus Cloud Vault for RAM & slot boosts!',
      });
    }, 600);
  };

  // Open Console
  const handleOpenConsole = (server: CloudServer) => {
    setActiveConsoleServer(server);
    setServerConsoleLogs([
      `[${new Date().toLocaleTimeString()}] [VictusCloud] Initializing ${server.software.toUpperCase()} ${server.version} container...`,
      `[${new Date().toLocaleTimeString()}] [VictusCloud] Dedicated node ${server.region} • ${server.ramMb} MB RAM allocated.`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Loading server properties & world chunks`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Default game type: SURVIVAL`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Generating encryption keypair`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Starting Minecraft listener on 0.0.0.0:${server.port}`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Preparing level "world"`,
      `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Done (1.42s)! Server live at ${server.subdomain}:${server.port}`,
    ]);
  };

  const totalAllocatedRamMb = servers.reduce((acc, s) => acc + s.ramMb, 0);
  const totalAllocatedRamGb = (totalAllocatedRamMb / 1024).toFixed(1);
  const maxRamGb = (wallet.totalRamLimitMb / 1024).toFixed(1);
  const ramUsagePercent = Math.min(100, Math.round((totalAllocatedRamMb / wallet.totalRamLimitMb) * 100));
  const onlineCount = servers.filter((s) => s.status === 'online').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-7 py-6 select-none custom-scrollbar">
      {/* 1. Header Command Deck */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 20%, #0e1017)`,
                borderColor: `color-mix(in srgb, ${accentColor} 40%, rgba(255,255,255,0.15))`,
                boxShadow: `0 0 20px color-mix(in srgb, ${accentColor} 25%, transparent)`,
              }}
            >
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
                  Cloud Servers
                </h1>
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>FREE TIER</span>
                </span>
              </div>
              <p className="text-xs text-white/50">
                High-performance 24/7 Minecraft instances with instant wake-on-join.
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls: Vault & Deploy */}
        <div className="flex items-center space-x-3">
          {/* Cloud Coins Vault */}
          <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl bg-[#0f1118] border border-amber-400/25 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-mono font-black text-sm text-amber-300 tracking-tight">
                  {wallet.coins}
                </span>
                <span className="text-[10px] font-bold text-amber-400/70 uppercase">Coins</span>
              </div>
              <span className="text-[9px] text-white/40 block leading-none">Cloud Vault</span>
            </div>

            {/* Daily Claim Reward Button */}
            <button
              onClick={handleClaimCoins}
              disabled={wallet.claimedToday || claimingCoins}
              className={`ml-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                wallet.claimedToday
                  ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95'
              }`}
            >
              <Gift className="w-3 h-3" />
              <span>{wallet.claimedToday ? 'Claimed' : '+50 Daily'}</span>
            </button>
          </div>

          {/* Create Server Action */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deploy Server</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek Cluster Status Strip (No generic SaaS boxes) */}
      <div className="my-4 px-4 py-3 rounded-2xl bg-[#0d0e15]/70 border border-white/[0.08] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Memory Usage Gauge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-white/70 font-mono text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Cluster RAM:</span>
            <span className="font-bold text-white">
              {totalAllocatedRamGb} / {maxRamGb} GB
            </span>
          </div>

          <div className="w-32 bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400"
              style={{ width: `${ramUsagePercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40">{ramUsagePercent}%</span>
        </div>

        {/* Right: Quick Operational Badges */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/60">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
              }`}
            />
            <span className="text-white/80">
              {onlineCount} Online • {servers.length - onlineCount} Standby
            </span>
          </div>

          <span className="text-white/20">•</span>

          <div className="flex items-center space-x-1 text-cyan-300">
            <Zap className="w-3 h-3" />
            <span>Smart Wake-on-Join</span>
          </div>

          <span className="text-white/20">•</span>

          <div className="flex items-center space-x-1 text-emerald-300">
            <Shield className="w-3 h-3" />
            <span>DDoS Guarded</span>
          </div>
        </div>
      </div>

      {/* 3. Server Cards Grid */}
      <div className="flex items-center justify-between mb-3 mt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center space-x-2">
          <span>Your Deployed Servers</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80">
            {servers.length} / {wallet.maxServers} Active
          </span>
        </h2>
      </div>

      {servers.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-white/10 p-12 text-center flex flex-col items-center justify-center my-6 glass-panel">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/40">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white mb-1">No Minecraft Servers Running</h3>
          <p className="text-xs text-white/50 max-w-sm mb-5 leading-relaxed">
            Deploy your first free 24/7 Minecraft server in under 30 seconds. Choose Paper for plugins, Fabric for mods, or Vanilla.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Your Free Server</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          {servers.map((server) => {
            const isOnline = server.status === 'online';
            const isStarting = server.status === 'starting';
            const isStopping = server.status === 'stopping';
            const isRestarting = server.status === 'restarting';
            const isBusy = isStarting || isStopping || isRestarting;

            // Archetype Icon
            const ServerIcon =
              server.software === 'fabric'
                ? Zap
                : server.name.toLowerCase().includes('hardcore')
                ? Flame
                : server.name.toLowerCase().includes('smp')
                ? Compass
                : Server;

            return (
              <div
                key={server.id}
                className="rounded-[26px] bg-[#0c0d15]/85 border border-white/[0.12] p-5 flex flex-col justify-between shadow-2xl hover:border-white/25 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Top Subtle Ambient Status Glow */}
                <div
                  className={`absolute top-0 inset-x-0 h-1 transition-all ${
                    isOnline
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_12px_#34d399]'
                      : isStarting || isRestarting
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 animate-pulse shadow-[0_0_12px_#f59e0b]'
                      : 'bg-white/10'
                  }`}
                />

                <div>
                  {/* Top Header: Emblem + Name + Status & Ping */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${
                          isOnline
                            ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}
                      >
                        <ServerIcon className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-display font-black text-lg text-white tracking-tight">
                            {server.name}
                          </h3>

                          {/* Software Badge */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 uppercase">
                            {server.software} • {server.version}
                          </span>
                        </div>

                        {/* Region & Latency */}
                        <div className="flex items-center space-x-3 mt-0.5 text-[11px] text-white/50 font-mono">
                          <span className="flex items-center space-x-1">
                            <Globe className="w-3 h-3 text-cyan-400" />
                            <span>{server.region.split(' ')[0]}</span>
                          </span>
                          <span>•</span>
                          <PingBars pingMs={server.region.includes('US') ? 24 : 38} />
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                          : isStarting || isRestarting
                          ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-white/5 text-white/50 border-white/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline
                            ? 'bg-emerald-400 animate-pulse'
                            : isStarting || isRestarting
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-white/30'
                        }`}
                      />
                      <span>
                        {isStarting
                          ? 'BOOTING...'
                          : isStopping
                          ? 'STOPPING...'
                          : isRestarting
                          ? 'RESTARTING...'
                          : isOnline
                          ? 'ONLINE'
                          : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  {/* Minecraft Styled MOTD Banner */}
                  <div className="my-2.5 p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-xs">
                    {renderMinecraftMotd(server.motd)}
                  </div>

                  {/* Interactive Server Address Bar */}
                  <div
                    onClick={() => handleCopyIp(server)}
                    className="group/ip my-2.5 p-2.5 rounded-xl bg-black/40 hover:bg-black/70 border border-white/10 hover:border-cyan-400/40 flex items-center justify-between cursor-pointer transition-all shadow-inner"
                    title="Click to copy server IP address"
                  >
                    <div className="flex items-center space-x-2 font-mono text-xs text-white truncate mr-2">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-bold text-white select-all truncate">
                        {server.subdomain}
                      </span>
                      <span className="text-white/40">:{server.port}</span>
                    </div>

                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                        copiedId === server.id
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/10 text-white/70 group-hover/ip:bg-white group-hover/ip:text-black'
                      }`}
                    >
                      {copiedId === server.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy IP</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Grid: Players, Memory, CPU */}
                  <div className="grid grid-cols-3 gap-2.5 py-2.5 border-y border-white/[0.07] my-3">
                    {/* Players */}
                    <div>
                      <div className="flex items-center space-x-1 text-[10px] text-white/50 uppercase font-mono mb-0.5">
                        <Users className="w-3 h-3 text-purple-400" />
                        <span>Players</span>
                      </div>
                      <div className="font-mono text-sm font-black text-white">
                        {server.playersOnline} <span className="text-xs text-white/40 font-normal">/ {server.maxPlayers}</span>
                      </div>
                    </div>

                    {/* RAM */}
                    <div>
                      <div className="flex items-center space-x-1 text-[10px] text-white/50 uppercase font-mono mb-0.5">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span>Memory</span>
                      </div>
                      <div className="font-mono text-sm font-black text-white">
                        {isOnline ? `${(server.ramUsedMb / 1024).toFixed(1)}G` : '0G'}
                        <span className="text-xs text-white/40 font-normal"> / {(server.ramMb / 1024).toFixed(0)}G</span>
                      </div>
                    </div>

                    {/* CPU */}
                    <div>
                      <div className="flex items-center space-x-1 text-[10px] text-white/50 uppercase font-mono mb-0.5">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span>Load</span>
                      </div>
                      <div className="font-mono text-sm font-black text-white">
                        {isOnline ? `${server.cpuPercent}%` : '0%'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    {/* Start / Stop Toggle */}
                    {isOnline ? (
                      <button
                        onClick={() => handleStopServer(server.id)}
                        disabled={isBusy}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                        title="Stop Server"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartServer(server.id)}
                        disabled={isBusy}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95 hover:scale-105"
                        title="Start Server"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </button>
                    )}

                    {/* Restart Button */}
                    <button
                      onClick={() => handleRestartServer(server.id)}
                      disabled={!isOnline || isBusy}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Restart Server"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Console Button */}
                    <button
                      onClick={() => handleOpenConsole(server)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-all cursor-pointer"
                      title="Open Terminal Console"
                    >
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Console</span>
                    </button>
                  </div>

                  {/* Right Actions: Direct Launch & Delete */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDirectConnect(server)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs transition-all cursor-pointer shadow-sm"
                      title="Launch Minecraft and copy server address"
                    >
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span>Join Game</span>
                    </button>

                    <button
                      onClick={() => handleDeleteServer(server.id, server.name)}
                      className="p-2 rounded-xl hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Delete Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-view-fade-in">
          <div className="w-full max-w-sm bg-[#0e0f17] border border-white/15 rounded-[26px] p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Delete Cloud Server?</h3>
              <p className="text-xs text-white/50 mt-1">
                This will delete the server instance and release all allocated RAM quota.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteServer(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Create Server Modal */}
      {isCreateModalOpen && (
        <CreateServerModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={(newServer) => {
            setServers((prev) => [newServer, ...prev]);
            setIsCreateModalOpen(false);
            addNotification({
              type: 'success',
              title: 'Server Provisioned!',
              message: `Your cloud server "${newServer.name}" is now ready at ${newServer.subdomain}`,
            });
          }}
          currentCount={servers.length}
          maxCount={wallet.maxServers}
        />
      )}

      {/* 5. Live Console Modal */}
      {activeConsoleServer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-view-fade-in">
          <div className="w-full max-w-2xl bg-[#0c0d14] border border-white/15 rounded-[26px] p-6 shadow-2xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white font-mono">
                  Console • {activeConsoleServer.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  LIVE
                </span>
              </div>
              <button
                onClick={() => setActiveConsoleServer(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 my-3 bg-black/90 rounded-2xl p-4 font-mono text-xs text-white/80 overflow-y-auto space-y-1.5 border border-white/5 custom-scrollbar">
              {serverConsoleLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log.includes('INFO') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.includes('Done') ? (
                    <span className="text-cyan-300 font-bold">{log}</span>
                  ) : log.startsWith('>') ? (
                    <span className="text-amber-300 font-bold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Simulated Command Input */}
            <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
              <input
                type="text"
                placeholder="Send server command (e.g. op username, time set day, weather clear)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      const cmd = input.value.trim();
                      setServerConsoleLogs((prev) => [
                        ...prev,
                        `> ${cmd}`,
                        `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Executed command: /${cmd}`,
                      ]);
                      input.value = '';
                    }
                  }
                }}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 font-mono"
              />
              <button
                onClick={() => setActiveConsoleServer(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================
// CREATE SERVER MODAL COMPONENT (Re-architected)
// ========================================================
interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (server: CloudServer) => void;
  currentCount: number;
  maxCount: number;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({
  onClose,
  onCreate,
  currentCount,
  maxCount,
}) => {
  const [name, setName] = useState('My Survival Realm');
  const [archetype, setArchetype] = useState<'smp' | 'fabric' | 'hardcore' | 'custom'>('smp');
  const [software, setSoftware] = useState<ServerSoftware>('paper');
  const [version, setVersion] = useState<string>(DEFAULT_VERSION);
  const [subdomain, setSubdomain] = useState('myserver');
  const [ramMb, setRamMb] = useState(3072);
  const [region, setRegion] = useState('US East (Virginia)');
  const [isDeploying, setIsDeploying] = useState(false);

  // Quick Archetype Presets
  const handleSelectArchetype = (type: 'smp' | 'fabric' | 'hardcore' | 'custom') => {
    setArchetype(type);
    if (type === 'smp') {
      setName('Friends Survival SMP');
      setSoftware('paper');
      setVersion('1.21.4');
      setRamMb(3072);
    } else if (type === 'fabric') {
      setName('Modded Fabric World');
      setSoftware('fabric');
      setVersion('1.21.4');
      setRamMb(4096);
    } else if (type === 'hardcore') {
      setName('Hardcore Season 1');
      setSoftware('paper');
      setVersion('1.20.4');
      setRamMb(2048);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsDeploying(true);

    setTimeout(() => {
      const cleanSub = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'server';
      const newServer: CloudServer = {
        id: `srv-${Date.now()}`,
        name: name.trim(),
        subdomain: `${cleanSub}.victuscloud.net`,
        port: 25565 + Math.floor(Math.random() * 500),
        version,
        software,
        status: 'online',
        playersOnline: 0,
        maxPlayers: 20,
        ramMb,
        cpuCores: 2,
        diskGb: 10,
        motd: `§b§l${name.trim()} §7• §a24/7 Free Victus Cloud`,
        region,
        createdAt: 'Just now',
        uptimeMinutes: 0,
        cpuPercent: 14,
        ramUsedMb: Math.round(ramMb * 0.4),
        autoSleep: true,
      };

      onCreate(newServer);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-view-fade-in select-none">
      <div className="w-full max-w-xl bg-[#0c0d15] border border-white/15 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Deploy Free Cloud Server</h3>
              <span className="text-[11px] text-white/50 font-mono">
                Cluster Node Slot {currentCount + 1} of {maxCount} Available
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Archetype Quick Pickers */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 'smp', label: 'Survival SMP', icon: Compass, sub: 'Paper • 3GB' },
            { id: 'fabric', label: 'Modded Realm', icon: Zap, sub: 'Fabric • 4GB' },
            { id: 'hardcore', label: 'Hardcore', icon: Flame, sub: '1 Life • 2GB' },
            { id: 'custom', label: 'Custom Config', icon: Sliders, sub: 'Choose All' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = archetype === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectArchetype(item.id as any)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-500/20 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-purple-300' : 'text-white/40'}`} />
                <div className="font-bold text-xs truncate">{item.label}</div>
                <div className="text-[9px] text-white/40 font-mono truncate">{item.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Name & Subdomain */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">Server Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friends SMP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">Free Subdomain IP</label>
              <div className="flex items-center rounded-xl bg-black/60 border border-white/10 overflow-hidden px-3 py-2.5">
                <input
                  type="text"
                  required
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="myserver"
                  className="bg-transparent text-xs text-white font-mono focus:outline-none min-w-0 flex-1 lowercase"
                />
                <span className="text-[10px] font-mono text-cyan-300 font-bold select-none shrink-0 pl-1">
                  .victuscloud.net
                </span>
              </div>
            </div>
          </div>

          {/* Software & Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">Software Platform</label>
              <select
                value={software}
                onChange={(e) => setSoftware(e.target.value as ServerSoftware)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400 capitalize"
              >
                <option value="paper">Paper (Optimized + Plugins)</option>
                <option value="fabric">Fabric (Mods Support)</option>
                <option value="purpur">Purpur (Performance Fork)</option>
                <option value="forge">Forge (Heavy Mods)</option>
                <option value="vanilla">Vanilla (Pure Minecraft)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">Minecraft Version</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
              >
                {MINECRAFT_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    Minecraft {v} {v === '26.3' ? '(Recommended)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RAM & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">
                Allocated RAM: <span className="text-purple-300 font-mono">{(ramMb / 1024).toFixed(1)} GB</span>
              </label>
              <select
                value={ramMb}
                onChange={(e) => setRamMb(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value={2048}>2.0 GB (Vanilla / Light)</option>
                <option value={3072}>3.0 GB (Standard SMP)</option>
                <option value={4096}>4.0 GB (Max Free Tier • Mods)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/80 block mb-1">Cluster Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="US East (Virginia)">US East (Virginia) • 22ms</option>
                <option value="EU Central (Frankfurt)">EU Central (Frankfurt) • 34ms</option>
                <option value="AP South (Mumbai)">AP South (Mumbai) • 42ms</option>
                <option value="AP East (Tokyo)">AP East (Tokyo) • 58ms</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center space-x-2"
            >
              {isDeploying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Provisioning Node...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Deploy Instant Node</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ServersView;
