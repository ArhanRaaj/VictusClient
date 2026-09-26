import React, { useState } from 'react';
import { Play, Square, Image, Sparkles, Layers, Cpu, HardDrive, X, Check, Upload } from 'lucide-react';
import { Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { PlayerModelViewer } from '../skins/PlayerModelViewer';
import { WALLPAPER_PRESETS, DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface FeaturedInstanceCardProps {
  instance: Instance;
  onEdit?: (instance: Instance) => void;
  setActiveTab?: (tab: string) => void;
}

export const FeaturedInstanceCard: React.FC<FeaturedInstanceCardProps> = ({
  instance,
  onEdit,
}) => {
  const { launchInstance, killInstance, launchProgress, activeAccount, updateInstance, addNotification } = useLauncher();
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const currentProgress = launchProgress[instance.id];
  const isLaunching =
    instance.status === 'preparing' ||
    instance.status === 'downloading' ||
    instance.status === 'installing' ||
    instance.status === 'launching';
  const isRunning = instance.status === 'running';

  const handleLaunchClick = () => {
    if (isRunning) {
      killInstance(instance.id);
    } else if (!isLaunching) {
      launchInstance(instance.id);
    }
  };

  const handleSelectWallpaper = async (url: string) => {
    await updateInstance({
      ...instance,
      background: url,
    });
    addNotification('success', 'Wallpaper Updated', `Instance background changed successfully.`);
  };

  const handleCustomUrlApply = async () => {
    if (customUrl.trim()) {
      await handleSelectWallpaper(customUrl.trim());
      setCustomUrl('');
      setShowWallpaperPicker(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          await handleSelectWallpaper(event.target.result as string);
          setShowWallpaperPicker(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const ramGb = Math.round((instance.ramMax || 4096) / 1024);

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden glass-panel border border-white/10 p-7 md:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-6 min-h-[360px] select-none shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
      {/* Background Instance Wallpaper Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105 pointer-events-none opacity-75"
        style={{
          backgroundImage: `url(${
            (!instance.background || instance.background.includes('unsplash.com'))
              ? DEFAULT_WALLPAPER
              : instance.background
          })`,
        }}
      />
      {/* Matte Black Gradient Overlay: Deep black on left for high contrast, soft transparency on right for glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/98 via-[#0a0a0c]/75 to-[#0a0a0c]/15 pointer-events-none" />

      {/* Left Content Area: Title + Launch Button + Specs Capsule */}
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        {/* Header & Change Wallpaper Action */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Featured Instance</span>
              </span>
            </div>
            <h2 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight drop-shadow-md">
              {instance.name}
            </h2>
          </div>

          {/* Quick Change Background Action Button */}
          <button
            onClick={() => setShowWallpaperPicker((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-md hover:scale-105"
            title="Change Background Wallpaper Artwork"
          >
            <Image className="w-3.5 h-3.5 text-purple-300" />
            <span>Change Background</span>
          </button>
        </div>

        {/* Center: Signature Glowing White LAUNCH Button */}
        <div className="my-6">
          <button
            onClick={handleLaunchClick}
            disabled={isLaunching}
            className={`glass-launch-btn px-11 py-4 rounded-[24px] flex items-center justify-center cursor-pointer transition-all duration-300 animate-launch-glow hover:scale-[1.025] active:scale-[0.98] ${
              isRunning ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-none' : ''
            }`}
          >
            <div className="flex items-center space-x-3.5">
              {isRunning ? (
                <>
                  <Square className="w-6 h-6 fill-current" />
                  <span className="text-xl font-black uppercase tracking-wider">STOP INSTANCE</span>
                </>
              ) : isLaunching ? (
                <>
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span className="text-xl font-black uppercase tracking-wider">LAUNCHING...</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  <span className="text-2xl font-black uppercase tracking-wider">LAUNCH</span>
                </>
              )}
            </div>
          </button>

          {/* Real Launch Progress Bar */}
          {isLaunching && currentProgress && (
            <div className="mt-3.5 max-w-sm">
              <div className="flex justify-between text-[11px] text-white/90 font-mono mb-1 font-semibold">
                <span>{currentProgress.message}</span>
                <span>{currentProgress.percent}%</span>
              </div>
              <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 via-pink-300 to-white transition-all duration-300 shadow-[0_0_12px_white]"
                  style={{ width: `${currentProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Horizontal Specs Pill */}
        <div className="glass-specs-pill rounded-full px-6 py-3 inline-flex items-center justify-between max-w-lg shadow-xl">
          {/* Column 1: Version */}
          <div className="flex items-center space-x-3 flex-1 justify-center">
            <div className="p-1.5 rounded-full bg-black/60 border border-white/10 text-white/80">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">{instance.version}</div>
              <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                Version
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/10" />

          {/* Column 2: Software */}
          <div className="flex items-center space-x-3 flex-1 justify-center px-4">
            <div className="p-1.5 rounded-full bg-black/60 border border-white/10 text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white capitalize">{instance.loader}</div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                Software
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/10" />

          {/* Column 3: RAM */}
          <div className="flex items-center space-x-3 flex-1 justify-center">
            <div className="p-1.5 rounded-full bg-black/60 border border-white/10 text-purple-300">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-white">{ramGb} GB</div>
              <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                RAM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Tall Dedicated Showcase Container for 3D Player Model (Glassmorphic Blur with Opaque Model) */}
      <div className="relative z-10 w-full lg:w-72 rounded-[24px] glass-player-card p-4 flex flex-col items-center justify-between min-h-[320px] shadow-2xl">
        <div className="w-full flex items-center justify-between text-xs text-white/90 px-2 pt-1 font-mono">
          <span className="font-bold tracking-wide">{activeAccount?.username || 'VictusHero'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-bold border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            3D LIVE
          </span>
        </div>

        {/* 3D Player Model Canvas - 100% Opaque, walking and rotating */}
        <div className="w-full flex-1 flex items-center justify-center overflow-hidden my-2">
          <PlayerModelViewer
            skinUrl={activeAccount?.skinUrl}
            width={240}
            height={270}
            animationType="walk"
            autoRotate={true}
          />
        </div>

        <div className="w-full text-center pb-1">
          <span className="text-[10px] font-mono text-white/80 bg-black/45 backdrop-blur-md px-3 py-1 rounded-full border border-white/12 inline-block shadow-sm">
            Steve • Active Avatar
          </span>
        </div>
      </div>

      {/* Quick Wallpaper Selector Overlay (Instant 1-Click Changes) */}
      {showWallpaperPicker && (
        <div className="absolute inset-0 z-30 bg-[#0a0a0c]/98 rounded-[28px] p-6 flex flex-col justify-between animate-modal-spring border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm text-white">Choose Instance Wallpaper</h3>
            </div>
            <button
              onClick={() => setShowWallpaperPicker(false)}
              className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Wallpapers Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 my-4">
            {WALLPAPER_PRESETS.map((preset) => {
              const isSelected = instance.background === preset.url;
              return (
                <button
                  key={preset.name}
                  onClick={() => handleSelectWallpaper(preset.url)}
                  className={`group relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                    <span className="text-[10px] font-bold text-white leading-tight">{preset.name}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom URL or Upload File */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-white/10">
            <div className="flex-1 flex items-center space-x-2 w-full">
              <input
                type="text"
                placeholder="Paste custom wallpaper image URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomUrlApply()}
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleCustomUrlApply}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Apply URL
              </button>
            </div>

            <label className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-medium cursor-pointer transition-colors w-full sm:w-auto justify-center">
              <Upload className="w-3.5 h-3.5 text-purple-300" />
              <span>Upload Local Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
export default FeaturedInstanceCard;
