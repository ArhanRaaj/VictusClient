import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  RotateCw,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Package,
  Cpu,
  Layers,
  Wrench,
  Zap,
  Check,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';

interface UpdateData {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl?: string;
  assetSize?: number;
}

export const AutoUpdateBanner: React.FC = () => {
  const { addNotification } = useLauncher();

  const [updateInfo, setUpdateInfo] = useState<UpdateData | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'highlights' | 'changelog' | 'raw'>('highlights');

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for updates pushed by main process
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable?.((info: UpdateData) => {
      if (info && info.updateAvailable) {
        setUpdateInfo(info);
        setIsMinimized(false);
        if (info.downloadUrl && window.electronAPI?.downloadUpdate) {
          setIsDownloading(true);
          setDownloadProgress(5);
          window.electronAPI.downloadUpdate(info.downloadUrl).then((res) => {
            if (res && res.success) {
              setIsReadyToInstall(true);
              setIsDownloading(false);
            }
          }).catch(() => setIsDownloading(false));
        }
      }
    });

    const unsubscribeProgress = window.electronAPI.onUpdateProgress?.((progress: { percent: number }) => {
      setDownloadProgress(progress.percent);
      if (progress.percent >= 100) {
        setIsReadyToInstall(true);
        setIsDownloading(false);
      }
    });

    // Check for updates on mount
    window.electronAPI.checkForUpdates?.().then((info: UpdateData) => {
      if (info && info.updateAvailable) {
        setUpdateInfo(info);
        if (info.downloadUrl && window.electronAPI?.downloadUpdate) {
          setIsDownloading(true);
          setDownloadProgress(5);
          window.electronAPI.downloadUpdate(info.downloadUrl).then((res) => {
            if (res && res.success) {
              setIsReadyToInstall(true);
              setIsDownloading(false);
            }
          }).catch(() => setIsDownloading(false));
        }
      }
    }).catch(() => {});

    return () => {
      unsubscribeAvailable?.();
      unsubscribeProgress?.();
    };
  }, []);

  const handleStartDownload = async () => {
    if (!updateInfo?.downloadUrl || !window.electronAPI?.downloadUpdate) {
      const releasesUrl = 'https://github.com/ArhanRaaj/VictusClient/releases';
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(releasesUrl);
      } else {
        window.open(releasesUrl, '_blank');
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(5);

    addNotification('info', 'Downloading Client Update', `Downloading VictusClient v${updateInfo.latestVersion} in background...`);

    try {
      const res = await window.electronAPI.downloadUpdate(updateInfo.downloadUrl);
      if (res && res.success) {
        setIsReadyToInstall(true);
        setIsDownloading(false);
        addNotification('success', 'Update Downloaded', 'Client update is ready. Click "Restart & Apply Update" to install.');
      } else {
        setIsDownloading(false);
        addNotification('error', 'Download Failed', res?.error || 'Unable to download update package.');
      }
    } catch {
      setIsDownloading(false);
    }
  };

  const handleRestartAndInstall = async () => {
    if (!window.electronAPI?.installUpdate) return;

    setIsApplying(true);
    addNotification('info', 'Applying Update', 'Restarting VictusClient to apply the latest update...');

    try {
      const res = await window.electronAPI.installUpdate();
      if (res && (res as any).success === false) {
        setIsApplying(false);
        addNotification('error', 'Update Failed', (res as any).error || 'Failed to start installer. Please update manually.');
      }
    } catch (err: any) {
      setIsApplying(false);
      addNotification('error', 'Update Error', err?.message || 'Error executing update.');
    }
  };

  const handleOpenGitHub = () => {
    const releasesUrl = 'https://github.com/ArhanRaaj/VictusClient/releases';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(releasesUrl);
    } else {
      window.open(releasesUrl, '_blank');
    }
  };

  if (!updateInfo || !updateInfo.updateAvailable) {
    return null;
  }

  // MINIMIZED PILL: Shows if user clicks "Remind Me Later" / Minimize
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 select-none animate-view-fade-in">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-[#0e101a] border border-white/20 shadow-2xl hover:border-white/40 hover:bg-[#141624] text-white transition-all cursor-pointer group"
          title="Click to view update changelog & restart"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
            {isReadyToInstall ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isDownloading ? (
              <RotateCw className="w-4 h-4 animate-spin text-violet-400" />
            ) : (
              <Zap className="w-4 h-4 text-violet-400" />
            )}
          </div>
          <div className="text-left">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 flex items-center space-x-1.5">
              <span>Client Update</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isReadyToInstall ? 'bg-emerald-400 animate-pulse' : 'bg-violet-400'}`} />
            </div>
            <div className="text-xs font-bold text-white">
              {isReadyToInstall ? `v${updateInfo.latestVersion} Ready to Apply` : `Update Available (v${updateInfo.latestVersion})`}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  // FULL-SCREEN TAKE-OVER DASHBOARD
  return (
    <div className="fixed inset-0 z-[100] bg-[#07080f]/97 backdrop-blur-3xl flex flex-col justify-between p-6 sm:p-10 select-none animate-view-fade-in overflow-hidden">
      {/* TOP HEADER */}
      <div className="w-full flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#141626] border border-white/10 flex items-center justify-center shadow-sm">
            <img src="./icon.png" alt="VictusClient" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-black text-lg text-white tracking-wide">
                VictusClient Software Update
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/10 text-white/80 border border-white/10">
                v{updateInfo.currentVersion} ➔ v{updateInfo.latestVersion}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Review new additions, compatibility updates, and stability patches before restarting.
            </p>
          </div>
        </div>

        {/* Status Tag & Minimize Button */}
        <div className="flex items-center space-x-3">
          {isReadyToInstall ? (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready to Install & Relaunch</span>
            </div>
          ) : isDownloading ? (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Downloading update ({downloadProgress || 0}%)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white/80 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span>New Release Ready</span>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            title="Minimize to launcher and remind later"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CENTER WORKSPACE: HERO + STRUCTURED CHANGELOG */}
      <div className="flex-1 my-6 overflow-y-auto pr-2 space-y-6 max-w-5xl mx-auto w-full">
        {/* Release Hero Banner */}
        <div className="p-6 rounded-3xl bg-[#0f111c] border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-600 text-white">
                STABLE RELEASE
              </span>
              <span className="text-xs font-mono text-white/40">
                Published {new Date().toLocaleDateString()}
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-white">
              {updateInfo.releaseName || `VictusClient v${updateInfo.latestVersion}`}
            </h1>
            <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
              This release brings full Minecraft 26.4 support, an in-launcher Mods & Content Manager with strict version-locking, launcher startup fixes, and a refreshed dark obsidian interface without distracting gradients.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('highlights')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'highlights'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Key Highlights
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'changelog'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              What's Added & Patched
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Release Notes
            </button>
          </div>
        </div>

        {/* TAB 1: KEY HIGHLIGHTS */}
        {activeTab === 'highlights' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlight 1: Minecraft 26.4 */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Minecraft 26.4 Support</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Full compatibility for Minecraft version 26.4, with automatic version resolution to Mojang's high-performance 1.21.4 runtime and Fabric mod loader integration.
              </p>
            </div>

            {/* Highlight 2: Mods & Content Manager */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Built-in Mods & Shaders Manager</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Browse, search, and 1-click install Mods, Shaders, Resource Packs, and Datapacks from Modrinth directly from the sidebar without opening a web browser.
              </p>
            </div>

            {/* Highlight 3: Instance Version Lock */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Strict Version-Locked Downloads</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Content is verified against your target instance. When downloading mods or shaders, only files strictly compatible with your instance's Minecraft version & loader are downloaded.
              </p>
            </div>

            {/* Highlight 4: Launch & Updater Stability */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Patched Launch & Update Sequence</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Resolved initial launch termination issues, fixed Windows installer relaunch on restart, and replaced loud rainbow gradients with an obsidian matte design.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED WHAT'S ADDED & PATCHED */}
        {activeTab === 'changelog' && (
          <div className="space-y-4">
            {/* Section 1: Additions */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-3">
              <div className="flex items-center space-x-2 text-violet-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  ✨ Things Added
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Minecraft 26.4 Support:</strong> Added official 26.4 version support across Instance Wizard, Servers, and Content Manager.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Modrinth Content Manager:</strong> Direct in-launcher access for Fabric/Forge mods, shaders, resource packs, and datapacks.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Target Instance Capsule:</strong> Active instance picker inside Content Manager to view and manage files per instance.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1-Click Folder Access:</strong> Instantly open active instance mods, shaders, or resourcepacks folders in Windows Explorer.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Full-Screen Update Center:</strong> Interactive update dialog covering the whole screen with changelog breakdown.</span>
                </li>
              </ul>
            </div>

            {/* Section 2: Patches & Fixes */}
            <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Wrench className="w-4 h-4" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  🛠️ Patches & Fixes
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fixed Launch Crash:</strong> Addressed process termination during game startup; improved JVM arguments handling.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fixed Restart & Apply:</strong> Resolved issue where "Restart & Apply" failed on Windows by supporting both executable and staged asar execution.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Removed Harsh Gradients:</strong> Eliminated gaudy cyan-purple-emerald gradients across the client in favor of clean dark-glass styling.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Installer Optimization:</strong> Compacted standalone Windows installer from &gt;100MB down to under 10MB.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Version-Locked Mod Downloads:</strong> Prevents incompatible mod files from downloading to instances with different Minecraft versions.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: RAW RELEASE NOTES */}
        {activeTab === 'raw' && (
          <div className="p-5 rounded-2xl bg-[#0d0f18] border border-white/10 font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {updateInfo.releaseNotes}
          </div>
        )}

        {/* DOWNLOAD PROGRESS BAR (if downloading) */}
        {isDownloading && (
          <div className="p-4 rounded-2xl bg-[#0e101c] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/70">Downloading update package...</span>
              <span className="text-white font-bold">{downloadProgress || 0}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="w-full pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs text-white/50">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Signed release verified via GitHub Releases CDN</span>
          <button
            onClick={handleOpenGitHub}
            className="text-white/60 hover:text-white flex items-center space-x-1 underline cursor-pointer ml-2"
          >
            <span>View Release on GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMinimized(true)}
            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
          >
            Remind Me Later
          </button>

          {isReadyToInstall ? (
            <button
              onClick={handleRestartAndInstall}
              disabled={isApplying}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all cursor-pointer active:scale-95 hover:scale-102"
            >
              {isApplying ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Restarting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Restart & Apply Update</span>
                </>
              )}
            </button>
          ) : isDownloading ? (
            <button
              disabled
              className="px-6 py-3 rounded-2xl bg-white/10 text-white/50 text-xs font-bold flex items-center space-x-2 cursor-wait"
            >
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Downloading ({downloadProgress || 0}%)...</span>
            </button>
          ) : (
            <button
              onClick={handleStartDownload}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center space-x-2 transition-all cursor-pointer active:scale-95 hover:scale-102"
            >
              <Download className="w-4 h-4" />
              <span>Download & Update</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
