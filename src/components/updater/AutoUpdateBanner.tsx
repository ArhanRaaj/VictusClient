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
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for updates pushed by main process
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable?.((info: UpdateData) => {
      if (info && info.updateAvailable) {
        setUpdateInfo(info);
        setIsDismissed(false);
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
      // If no direct binary, open releases page
      const releasesUrl = 'https://github.com/ArhanRaaj/VictusClient/releases';
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(releasesUrl);
      } else {
        window.open(releasesUrl, '_blank');
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    addNotification({
      type: 'info',
      title: 'Downloading Client Update',
      message: `Downloading VictusClient v${updateInfo.latestVersion} in background...`,
    });

    try {
      const res = await window.electronAPI.downloadUpdate(updateInfo.downloadUrl);
      if (res && res.success) {
        setIsReadyToInstall(true);
        setIsDownloading(false);
        addNotification({
          type: 'success',
          title: 'Update Downloaded',
          message: 'Client update is ready. Click "Restart & Install" to apply instantly.',
        });
      } else {
        setIsDownloading(false);
        addNotification({
          type: 'error',
          title: 'Download Failed',
          message: res?.error || 'Unable to download update package.',
        });
      }
    } catch {
      setIsDownloading(false);
    }
  };

  const handleRestartAndInstall = async () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    }
  };

  if (!updateInfo || !updateInfo.updateAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-view-fade-in select-none">
      <div className="relative rounded-[24px] bg-[#0c0d16]/95 border border-cyan-400/30 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.2)] backdrop-blur-xl overflow-hidden">
        {/* Animated Glow Border Top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 shadow-[0_0_15px_#22d3ee]" />

        {/* Close / Dismiss */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          title="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 fill-cyan-400/20" />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                AUTO-UPDATE
              </span>
              <span className="text-xs font-mono text-white/40">
                v{updateInfo.currentVersion} → <span className="text-white font-bold">v{updateInfo.latestVersion}</span>
              </span>
            </div>

            <h4 className="font-display font-black text-sm text-white mt-1">
              {updateInfo.releaseName || 'Victus Client Update Available'}
            </h4>

            <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed">
              {updateInfo.releaseNotes}
            </p>

            {/* Progress Bar when downloading */}
            {isDownloading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                  <span>Downloading package...</span>
                  <span>{downloadProgress || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center space-x-2.5">
              {isReadyToInstall ? (
                <button
                  onClick={handleRestartAndInstall}
                  className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 fill-black text-emerald-400" />
                  <span>Restart & Apply Now</span>
                </button>
              ) : isDownloading ? (
                <button
                  disabled
                  className="flex-1 py-2 px-4 rounded-xl bg-white/10 text-white/50 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-wait"
                >
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </button>
              ) : (
                <button
                  onClick={handleStartDownload}
                  className="flex-1 py-2 px-4 rounded-xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center space-x-1.5 active:scale-95 hover:scale-102"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Update In-Place</span>
                </button>
              )}

              <button
                onClick={() => setIsDismissed(true)}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
