import React, { useState } from 'react';
import {
  Play,
  Square,
  Image,
  Layers,
  Cpu,
  HardDrive,
  X,
  Check,
  Upload,
  FolderOpen,
  SlidersHorizontal,
  Shirt,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
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
  setActiveTab,
}) => {
  const {
    launchInstance,
    killInstance,
    launchProgress,
    activeAccount,
    updateInstance,
    addNotification,
    openFolder,
  } = useLauncher();

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
    addNotification('success', 'Wallpaper Updated', 'Instance background changed successfully.');
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
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#0d0f17] border border-white/[0.08] p-6 lg:p-7 flex flex-col lg:flex-row items-stretch justify-between gap-6 min-h-[350px] select-none shadow-[0_16px_36px_rgba(0,0,0,0.65)]">
      {/* Background Instance Artwork with Refined Matte Vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none opacity-40 scale-100"
        style={{
          backgroundImage: `url(${
            !instance.background || instance.background.includes('unsplash.com')
              ? DEFAULT_WALLPAPER
              : instance.background
          })`,
        }}
      />
      {/* Precision Matte Shadow Masks: Deep black on left for maximum readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f17] via-[#0d0f17]/90 to-[#0d0f17]/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-transparent pointer-events-none" />

      {/* Left Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-between space-y-6">
        {/* Top Header & Fast Action Toolbar */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono font-semibold tracking-wider text-white/80 uppercase">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning
                      ? 'bg-emerald-400'
                      : isLaunching
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-white/60'
                  }`}
                />
                <span>{isRunning ? 'Running' : isLaunching ? 'Launching' : 'Primary Instance'}</span>
              </span>

              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-mono text-white/50 border border-white/[0.05]">
                {instance.loader.toUpperCase()}
              </span>
            </div>

            <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight pt-1">
              {instance.name}
            </h2>

            <div className="flex items-center space-x-2 text-xs text-white/45 font-mono">
              <span>{instance.version}</span>
              <span>•</span>
              <span className="capitalize">{instance.loader}</span>
              {instance.lastPlayed && (
                <>
                  <span>•</span>
                  <span>Played {instance.lastPlayed}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center space-x-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => openFolder(instance.id)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Open Instance Folder"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>

            {onEdit && (
              <button
                onClick={() => onEdit(instance)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Configure Instance"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowWallpaperPicker((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] text-xs font-medium transition-colors"
              title="Change Background Wallpaper Artwork"
            >
              <Image className="w-3.5 h-3.5 text-white/60" />
              <span className="hidden sm:inline">Wallpaper</span>
            </button>
          </div>
        </div>

        {/* Center: Tactile Launch Controller */}
        <div className="my-1">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleLaunchClick}
              disabled={isLaunching}
              className={`px-8 py-3.5 rounded-xl font-bold flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40'
                  : isLaunching
                  ? 'bg-white/10 text-white cursor-wait border border-white/15'
                  : 'bg-white hover:bg-neutral-100 text-[#090a0f] shadow-lg shadow-black/40 border border-white/90'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {isRunning ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span className="text-sm font-black tracking-wider uppercase">STOP INSTANCE</span>
                  </>
                ) : isLaunching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-black tracking-wider uppercase">INITIALIZING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span className="text-base font-black tracking-wider uppercase">LAUNCH GAME</span>
                  </>
                )}
              </div>
            </button>

            <div className="hidden sm:flex flex-col text-[11px] text-white/40 font-mono">
              <span className="text-white/70 font-semibold">Adoptium Java 21 LTS</span>
              <span>Memory Limit: {ramGb} GB Allocated</span>
            </div>
          </div>

          {/* Minimalist Progress Meter */}
          {isLaunching && currentProgress && (
            <div className="mt-4 max-w-md bg-black/40 border border-white/[0.08] p-3 rounded-xl">
              <div className="flex justify-between text-xs text-white/80 font-mono mb-1.5 font-medium">
                <span className="truncate pr-2">{currentProgress.message}</span>
                <span className="text-white font-bold">{currentProgress.percent}%</span>
              </div>
              <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${currentProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Specifications Strip (Clean Architectural Grid) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-w-xl">
          {/* Spec: Version */}
          <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center space-x-2.5">
            <Layers className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
                Version
              </div>
              <div className="text-xs font-bold text-white truncate font-mono">
                {instance.version}
              </div>
            </div>
          </div>

          {/* Spec: Mod Loader */}
          <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center space-x-2.5">
            <Cpu className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
                Engine
              </div>
              <div className="text-xs font-bold text-white truncate capitalize font-mono">
                {instance.loader}
              </div>
            </div>
          </div>

          {/* Spec: RAM */}
          <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] flex items-center space-x-2.5">
            <HardDrive className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
                RAM
              </div>
              <div className="text-xs font-bold text-white truncate font-mono">
                {ramGb} GB
              </div>
            </div>
          </div>

          {/* Spec: Status */}
          <div className="hidden sm:flex px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] items-center space-x-2.5">
            <Sparkles className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
                Profile
              </div>
              <div className="text-xs font-bold text-emerald-400 truncate font-mono">
                Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Matte 3D Character Showcase Pedestal */}
      <div className="relative z-10 w-full lg:w-64 rounded-xl bg-[#0a0b12] border border-white/[0.08] p-3.5 flex flex-col items-center justify-between min-h-[300px]">
        {/* Top: Player Username & Account Badge */}
        <div className="w-full flex items-center justify-between text-xs px-1 font-mono">
          <span className="font-semibold text-white/90 truncate max-w-[130px]">
            {activeAccount?.username || 'VictusHero'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 font-mono uppercase tracking-wider border border-white/[0.06]">
            {activeAccount?.type || 'Online'}
          </span>
        </div>

        {/* 3D Player Model Viewer with Subtle Pedestal Reflection */}
        <div className="w-full flex-1 flex items-center justify-center overflow-hidden my-1 relative">
          {/* Subtle Pedestal Glow Floor */}
          <div className="absolute bottom-2 w-28 h-5 rounded-full bg-white/[0.03] blur-sm pointer-events-none" />

          <PlayerModelViewer
            skinUrl={activeAccount?.skinUrl}
            width={210}
            height={240}
            animationType="walk"
            autoRotate={true}
          />
        </div>

        {/* Bottom Wardrobe Shortcut */}
        <div className="w-full pt-1">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('skins')}
              className="w-full py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 text-[11px] font-medium text-white/70 hover:text-white transition-colors flex items-center justify-center space-x-1.5"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Wardrobe & Skins</span>
            </button>
          )}
        </div>
      </div>

      {/* Wallpaper Picker Modal */}
      {showWallpaperPicker && (
        <div className="absolute inset-0 z-30 bg-[#0d0f17]/98 rounded-2xl p-6 flex flex-col justify-between animate-modal-spring border border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4 text-white/70" />
              <h3 className="font-semibold text-sm text-white">Choose Instance Background Artwork</h3>
            </div>
            <button
              onClick={() => setShowWallpaperPicker(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
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
                  className={`group relative h-20 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-1 text-center">
                    <span className="text-[10px] font-medium text-white leading-tight">
                      {preset.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom URL or Upload File */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-white/[0.08]">
            <div className="flex-1 flex items-center space-x-2 w-full">
              <input
                type="text"
                placeholder="Paste custom wallpaper image URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomUrlApply()}
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
              <button
                onClick={handleCustomUrlApply}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.12] hover:bg-white/[0.2] border border-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>

            <label className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-white/90 font-medium cursor-pointer transition-colors w-full sm:w-auto justify-center">
              <Upload className="w-3.5 h-3.5 text-white/60" />
              <span>Upload File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedInstanceCard;
