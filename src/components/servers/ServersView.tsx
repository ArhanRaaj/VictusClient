import React, { useState } from 'react';
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
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
  LogOut,
  LogIn,
} from 'lucide-react';
import { CloudServer } from '../../types/servers';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme } from '../../context/ThemeContext';
import { useVictusCloud } from '../../context/VictusCloudContext';

interface ServersViewProps {
  setActiveTab?: (tab: string) => void;
}

// Ping Signal Bars (authentic Minecraft style)
const PingBars: React.FC<{ pingMs: number }> = ({ pingMs }) => {
  const activeCount = pingMs < 50 ? 5 : pingMs < 100 ? 4 : pingMs < 180 ? 3 : 2;
  const barColor = pingMs < 80 ? 'bg-emerald-400' : pingMs < 150 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="flex items-end space-x-0.5 h-3" title={`${pingMs}ms latency`}>
      {[1, 2, 3, 4, 5].map((bar) => (
        <span
          key={bar}
          className={`w-1 rounded-sm transition-all ${
            bar <= activeCount ? barColor : 'bg-white/15'
          }`}
          style={{ height: `${bar * 20}%` }}
        />
      ))}
    </div>
  );
};

export const ServersView: React.FC<ServersViewProps> = () => {
  const { addNotification, launchInstance, activeInstance } = useLauncher();
  const { theme } = useTheme();
  const accentColor = theme.sidebarColor || theme.primaryAccent || '#7c3aed';

  const {
    cloudUser,
    isLoggedIn,
    freeServers,
    isServersLoading,
    refreshUserData,
    refreshServers,
    powerServer,
    openPanelSSO,
    openCreateFreeServer,
    setIsAuthModalOpen,
    logout,
  } = useVictusCloud();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyServerId, setBusyServerId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time automatic polling: Refresh live player count & server status every 8 seconds
  React.useEffect(() => {
    if (!isLoggedIn) return;
    refreshServers();
    const interval = setInterval(() => {
      refreshServers();
    }, 8000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshServers]);

  // Copy IP handler
  const handleCopyIp = (server: CloudServer) => {
    const address = server.fullAddress || `${server.subdomain}:${server.port}`;
    navigator.clipboard.writeText(address);
    setCopiedId(server.id);
    addNotification({
      type: 'success',
      title: 'Server Address Copied',
      message: `${address} copied to clipboard! Paste into Minecraft multiplayer.`,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Launch Minecraft & Join Server
  const handleDirectConnect = (server: CloudServer) => {
    const address = server.fullAddress || `${server.subdomain}:${server.port}`;
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
  const handleStartServer = async (server: CloudServer) => {
    if (!server.uuid || server.nodeId === undefined) return;
    setBusyServerId(server.id);
    await powerServer(server.uuid, server.nodeId, 'start');
    setBusyServerId(null);
  };

  // Stop Server
  const handleStopServer = async (server: CloudServer) => {
    if (!server.uuid || server.nodeId === undefined) return;
    setBusyServerId(server.id);
    await powerServer(server.uuid, server.nodeId, 'stop');
    setBusyServerId(null);
  };

  // Manual Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshUserData(), refreshServers()]);
    setIsRefreshing(false);
    addNotification({
      type: 'info',
      title: 'Cloud Synced',
      message: 'Server status and coins updated from Victus Cloud.',
    });
  };

  const onlineCount = freeServers.filter((s) => s.status === 'online').length;

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
                  Free Cloud Servers
                </h1>
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VICTUS CLOUD INFRA</span>
                </span>
              </div>
              <p className="text-xs text-white/50">
                Manage your free 24/7 Minecraft servers hosted on Victus Cloud nodes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls: Account Status, Coins Vault & Deploy */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isServersLoading}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-30"
            title="Refresh Server Status & Coins"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing || isServersLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Victus Cloud Coins Vault */}
          <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl bg-[#0f1118] border border-amber-400/25 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-mono font-black text-sm text-amber-300 tracking-tight">
                  {cloudUser ? cloudUser.coins.toLocaleString() : '---'}
                </span>
                <span className="text-[10px] font-bold text-amber-400/70 uppercase">Coins</span>
              </div>
              <span className="text-[9px] text-white/40 block leading-none">Victus Cloud Vault</span>
            </div>
          </div>

          {/* Account Indicator */}
          {isLoggedIn && cloudUser ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-white/90">@{cloudUser.username}</span>
              <button
                onClick={logout}
                className="ml-1 p-1 rounded-lg hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
                title="Unlink Victus Cloud Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Victus Cloud</span>
            </button>
          )}

          {/* Create Free Server Button */}
          <button
            onClick={openCreateFreeServer}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 transition-all"
            title="Create a new free server on victuscloud.com"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Free Server</span>
          </button>
        </div>
      </div>

      {/* 2. Cluster Status Strip */}
      <div className="my-4 px-4 py-3 rounded-2xl bg-[#0d0e15]/70 border border-white/[0.08] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 text-white/70 font-mono text-[11px]">
          <span className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
              }`}
            />
            <span className="text-white font-bold">
              {onlineCount} Online &bull; {freeServers.length - onlineCount} Standby
            </span>
          </span>
          <span className="text-white/20">&bull;</span>
          <span className="text-white/60">Node Locations: Germany (DE-1) &bull; Singapore (SG-1)</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono text-white/60">
          <div className="flex items-center space-x-1 text-cyan-300">
            <Zap className="w-3 h-3" />
            <span>24/7 Smart Wake</span>
          </div>
          <span className="text-white/20">&bull;</span>
          <div className="flex items-center space-x-1 text-emerald-300">
            <Shield className="w-3 h-3" />
            <span>DDoS Guarded</span>
          </div>
        </div>
      </div>

      {/* Not Logged In Banner */}
      {!isLoggedIn && (
        <div className="mb-6 p-6 rounded-[26px] bg-gradient-to-r from-purple-900/30 via-[#0f101c] to-indigo-900/20 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Connect Your Victus Cloud Account</h3>
              <p className="text-xs text-white/60 max-w-lg mt-0.5 leading-relaxed">
                Link your account to view live player counts, start and stop your free servers, and one-click SSO into Victus Panel.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              Login with Victus Cloud
            </button>
            <button
              onClick={openCreateFreeServer}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Sign Up / Create Free
            </button>
          </div>
        </div>
      )}

      {/* 3. Server Cards Grid */}
      <div className="flex items-center justify-between mb-3 mt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center space-x-2">
          <span>Your Free Servers</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80">
            {freeServers.length} Active
          </span>
        </h2>
      </div>

      {isServersLoading && freeServers.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 p-12 text-center flex flex-col items-center justify-center my-6 glass-panel">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
          <h3 className="font-bold text-base text-white mb-1">Loading Free Servers...</h3>
          <p className="text-xs text-white/50">Fetching your server cluster and node status from Pterodactyl.</p>
        </div>
      ) : freeServers.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-white/10 p-12 text-center flex flex-col items-center justify-center my-6 glass-panel">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/40">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white mb-1">No Free Minecraft Servers Found</h3>
          <p className="text-xs text-white/50 max-w-sm mb-5 leading-relaxed">
            {isLoggedIn
              ? "You haven't provisioned any free Minecraft servers on Victus Cloud yet. Click below to spin up a 24/7 server on Germany or Singapore node."
              : 'Sign in with your Victus Cloud account or create your first free Minecraft server.'}
          </p>
          <button
            onClick={openCreateFreeServer}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Free Server</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          {freeServers.map((server) => {
            const isOnline = server.status === 'online';
            const isStarting = server.status === 'starting';
            const isStopping = server.status === 'stopping';
            const isBusy = busyServerId === server.id || isStarting || isStopping;

            return (
              <div
                key={server.id}
                className="rounded-[26px] bg-[#0c0d15]/85 border border-white/[0.12] p-5 flex flex-col justify-between shadow-2xl hover:border-white/25 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Top Ambient Status Glow */}
                <div
                  className={`absolute top-0 inset-x-0 h-1 transition-all ${
                    isOnline
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_12px_#34d399]'
                      : isStarting
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 animate-pulse shadow-[0_0_12px_#f59e0b]'
                      : isStopping
                      ? 'bg-gradient-to-r from-rose-500 to-red-400 animate-pulse'
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
                        <Server className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-display font-black text-lg text-white tracking-tight">
                            {server.name}
                          </h3>

                          {/* Software Badge */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 uppercase">
                            FREE SERVER &bull; 2GB RAM
                          </span>
                        </div>

                        {/* Region & Latency */}
                        <div className="flex items-center space-x-3 mt-0.5 text-[11px] text-white/50 font-mono">
                          <span className="flex items-center space-x-1">
                            <Globe className="w-3 h-3 text-cyan-400" />
                            <span>{server.region}</span>
                          </span>
                          <span>&bull;</span>
                          <PingBars pingMs={server.region.includes('Singapore') ? 54 : 32} />
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                          : isStarting
                          ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : isStopping
                          ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                          : 'bg-white/5 text-white/50 border-white/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline
                            ? 'bg-emerald-400 animate-pulse'
                            : isStarting
                            ? 'bg-amber-400 animate-ping'
                            : isStopping
                            ? 'bg-rose-400'
                            : 'bg-white/30'
                        }`}
                      />
                      <span className="uppercase">{server.status}</span>
                    </div>
                  </div>

                  {/* Subdomain & Port Bar */}
                  <div
                    onClick={() => handleCopyIp(server)}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group/ip mb-3"
                    title="Click to copy server address"
                  >
                    <div className="flex items-center space-x-2 text-xs font-mono text-white/80 group-hover/ip:text-white truncate">
                      <span className="text-white/40">IP:</span>
                      <span className="font-bold text-cyan-300 select-all">
                        {server.fullAddress || `${server.subdomain}:${server.port}`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] font-mono text-white/50 group-hover/ip:text-white/90">
                      {copiedId === server.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy IP</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Telemetry: Player Count Focus */}
                  <div className="py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-white/50 uppercase font-mono leading-none mb-0.5">
                          Player Count
                        </div>
                        <div className="font-mono text-sm font-black text-white">
                          {server.playersOnline}{' '}
                          <span className="text-xs text-white/40 font-normal">
                            / {server.maxPlayers} Online
                          </span>
                        </div>
                      </div>
                    </div>

                    {isOnline && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/25">
                        Accepting Connections
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Controls: Start, Stop, SSO into Victus Panel */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  {/* Power Buttons (Start & Stop) */}
                  <div className="flex items-center space-x-2">
                    {isOnline ? (
                      <button
                        onClick={() => handleStopServer(server)}
                        disabled={isBusy}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Stop Minecraft Server"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartServer(server)}
                        disabled={isBusy}
                        className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95 hover:scale-105 disabled:opacity-50"
                        title="Start Minecraft Server"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </button>
                    )}

                    {/* Join Game Direct Launch */}
                    <button
                      onClick={() => handleDirectConnect(server)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs transition-all cursor-pointer shadow-sm"
                      title="Launch Minecraft and copy server IP"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>Join Game</span>
                    </button>
                  </div>

                  {/* SSO into Victus Panel Button */}
                  <button
                    onClick={() => openPanelSSO(server.identifier)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/35 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    title="SSO into Victus Panel for full console, file manager, and backups control"
                  >
                    <span>Open Victus Panel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
