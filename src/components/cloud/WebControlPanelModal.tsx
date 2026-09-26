import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  Terminal,
  FolderTree,
  Users,
  Settings,
  HardDrive,
  Cpu,
  Activity,
  Play,
  Square,
  RotateCw,
  Copy,
  Check,
  FileCode,
  Download,
  Lock,
  Globe,
  Radio,
} from 'lucide-react';
import { useVictusCloud } from '../../context/VictusCloudContext';
import { useLauncher } from '../../context/LauncherContext';

export const WebControlPanelModal: React.FC = () => {
  const {
    isWebPanelModalOpen,
    setIsWebPanelModalOpen,
    activeWebPanelServerId,
    cloudUser,
  } = useVictusCloud();
  const { addNotification } = useLauncher();

  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'console' | 'players' | 'backups'>('overview');
  const [copiedIp, setCopiedIp] = useState(false);
  const [remoteConsoleLogs, setRemoteConsoleLogs] = useState<string[]>([
    `[VICTUS-PANEL-SYNC] Connected to cloud cluster us-east-1 via WSS secure tunnel`,
    `[VICTUS-PANEL-SYNC] Authenticated session token: ${cloudUser?.ssoToken ? cloudUser.ssoToken.substring(0, 16) + '...' : 'sso_active'}`,
    `[Server thread/INFO]: Container healthy. Node responsive on port 25565`,
    `[Server thread/INFO]: Dynamic Wake-on-Ping active. Listening for player handshake`,
  ]);

  if (!isWebPanelModalOpen) return null;

  const serverName = activeWebPanelServerId ? 'Victus Friends SMP' : 'Cloud Cluster Hub';
  const serverDomain = activeWebPanelServerId ? 'smp-victus.victuscloud.net' : 'cluster.victuscloud.net';
  const panelUrl = `https://panel.victusclient.net/${activeWebPanelServerId ? `server/${activeWebPanelServerId}` : 'dashboard'}`;

  const handleOpenExternal = () => {
    const fullUrl = `${panelUrl}?sso=${cloudUser?.ssoToken || 'demo'}&user=${encodeURIComponent(cloudUser?.username || 'user')}`;
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(fullUrl);
    } else {
      window.open(fullUrl, '_blank');
    }
    addNotification({
      type: 'info',
      title: 'Opening Web Panel',
      message: 'Redirecting to panel.victusclient.net in your browser with SSO session token.',
    });
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(`${serverDomain}:25565`);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-view-fade-in select-none">
      <div className="w-full max-w-4xl bg-[#0b0c13] border border-white/15 rounded-[28px] shadow-2xl flex flex-col h-[600px] overflow-hidden relative">
        {/* Top Browser Bridge Header */}
        <div className="px-5 py-3 bg-[#11121c] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* SSL Badge & URL Bar */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-white/80">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white/50 select-none">https://</span>
              <span className="font-bold text-white">panel.victusclient.net</span>
              <span className="text-cyan-300">
                /{activeWebPanelServerId ? `server/${activeWebPanelServerId}` : 'dashboard'}
              </span>
            </div>

            <span className="hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SSO: @{cloudUser?.username || 'Active'}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenExternal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs transition-all cursor-pointer"
              title="Open full web control panel in Chrome/Edge/Firefox"
            >
              <span>Open in Browser</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsWebPanelModalOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel Sidebar */}
          <div className="w-48 bg-[#0e0f17] border-r border-white/10 p-3 space-y-1 select-none flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-white/40 px-3 py-1 tracking-wider">
                Management
              </div>

              {[
                { id: 'overview', label: 'Dashboard', icon: Activity },
                { id: 'files', label: 'File Manager', icon: FolderTree },
                { id: 'console', label: 'Web Terminal', icon: Terminal },
                { id: 'players', label: 'Player List', icon: Users },
                { id: 'backups', label: 'Backups & World', icon: HardDrive },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/20 text-white border border-purple-400/40 shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-300' : 'text-white/40'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Node Status */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono text-white/50 space-y-1">
              <div className="flex items-center justify-between text-white/70">
                <span>Node:</span>
                <span className="text-emerald-400">us-east-1a</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Anycast IP:</span>
                <span className="text-white/80">Active</span>
              </div>
            </div>
          </div>

          {/* Right Panel Content */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-[#090a10]">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Server Banner & Live Connection Bar */}
                <div className="p-4 rounded-2xl bg-[#12131e] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-display font-black text-lg text-white">
                          {serverName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                          ONLINE
                        </span>
                      </div>
                      <p className="text-xs text-white/50 font-mono mt-0.5">
                        Paper 1.21.4 • Port 25565 • Virginia Cluster
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyIp}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-white font-mono text-xs transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{serverDomain}</span>
                    {copiedIp ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-white/40 ml-1" />
                    )}
                  </button>
                </div>

                {/* Telemetry Widgets */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#12131e] border border-white/10">
                    <span className="text-[10px] font-mono text-white/40 block mb-1 uppercase">
                      Memory Allocated
                    </span>
                    <span className="font-mono text-lg font-black text-white">1.74 GB</span>
                    <span className="text-xs text-white/40 font-mono"> / 3.00 GB</span>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-cyan-400 h-full w-[58%] rounded-full" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#12131e] border border-white/10">
                    <span className="text-[10px] font-mono text-white/40 block mb-1 uppercase">
                      CPU Utilization
                    </span>
                    <span className="font-mono text-lg font-black text-white">18.4%</span>
                    <span className="text-xs text-emerald-400 font-mono"> (Normal)</span>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[18%] rounded-full" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#12131e] border border-white/10">
                    <span className="text-[10px] font-mono text-white/40 block mb-1 uppercase">
                      Online Players
                    </span>
                    <span className="font-mono text-lg font-black text-white">4</span>
                    <span className="text-xs text-white/40 font-mono"> / 20 Max</span>
                    <div className="flex items-center space-x-1.5 mt-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-white/60 font-mono">All slots healthy</span>
                    </div>
                  </div>
                </div>

                {/* Quick Web Actions */}
                <div className="p-4 rounded-2xl bg-[#12131e] border border-white/10">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
                    Remote Node Controls
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() =>
                        addNotification({
                          type: 'info',
                          title: 'Command Sent via Web Panel',
                          message: 'Reboot signal sent to node.',
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Restart Container</span>
                    </button>

                    <button
                      onClick={() =>
                        addNotification({
                          type: 'success',
                          title: 'Instant Backup',
                          message: 'World snapshot created on cloud NVMe storage.',
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>Take Instant Snapshot</span>
                    </button>

                    <button
                      onClick={handleOpenExternal}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer ml-auto"
                    >
                      <span>Launch Full Web Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs text-white/50 font-mono">
                  <span>File Path: /home/container</span>
                  <span>NVMe 15.0 GB Quota</span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {[
                    { name: 'server.properties', size: '1.2 KB', type: 'config' },
                    { name: 'spigot.yml', size: '3.4 KB', type: 'config' },
                    { name: 'paper-global.yml', size: '5.1 KB', type: 'config' },
                    { name: 'world/', size: '342 MB', type: 'dir' },
                    { name: 'world_nether/', size: '84 MB', type: 'dir' },
                    { name: 'plugins/', size: '24.1 MB', type: 'dir' },
                    { name: 'ops.json', size: '256 B', type: 'config' },
                    { name: 'whitelist.json', size: '128 B', type: 'config' },
                  ].map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#12131e] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 text-white">
                        <FileCode className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="font-bold">{f.name}</span>
                      </div>
                      <span className="text-[11px] text-white/40">{f.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'console' && (
              <div className="h-full flex flex-col space-y-2">
                <div className="flex-1 bg-black/90 rounded-2xl p-4 font-mono text-xs text-white/80 overflow-y-auto space-y-1 border border-white/10 custom-scrollbar">
                  {remoteConsoleLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log.includes('INFO') ? (
                        <span className="text-emerald-400">{log}</span>
                      ) : (
                        <span className="text-cyan-300">{log}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    placeholder="Send command to remote web control panel..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        if (input.value.trim()) {
                          setRemoteConsoleLogs((prev) => [
                            ...prev,
                            `> ${input.value}`,
                            `[RemoteWeb/INFO]: Executed command: /${input.value}`,
                          ]);
                          input.value = '';
                        }
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Players Connected (4)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {['Parasjainop_', 'Notch', 'Alex_Craft', 'VictusHero'].map((p) => (
                    <div
                      key={p}
                      className="p-3 rounded-2xl bg-[#12131e] border border-white/10 flex items-center space-x-3"
                    >
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(p)}/64`}
                        alt={p}
                        className="w-8 h-8 rounded-lg"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{p}</div>
                        <span className="text-[10px] text-emerald-400 font-mono">Ping: 22ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'backups' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Cloud Storage Snapshots (2 / 5)
                  </h4>
                  <button
                    onClick={() =>
                      addNotification({
                        type: 'success',
                        title: 'Snapshot Started',
                        message: 'Creating backup on Victus Cloud...',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-bold transition-all cursor-pointer"
                  >
                    + New Snapshot
                  </button>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 rounded-2xl bg-[#12131e] border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">daily-auto-save-2026-09-26.tar.gz</div>
                      <div className="text-[10px] text-white/40">Created today at 04:00 AM • 412 MB</div>
                    </div>
                    <span className="text-emerald-400 text-xs">Verified</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#12131e] border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">pre-modpack-upgrade.tar.gz</div>
                      <div className="text-[10px] text-white/40">Created 2 days ago • 390 MB</div>
                    </div>
                    <span className="text-emerald-400 text-xs">Verified</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
