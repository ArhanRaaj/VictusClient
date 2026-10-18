import React from 'react';
import { Play, Square, Star, FolderOpen, Check } from 'lucide-react';
import { Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface InstanceMiniCardProps {
  instance: Instance;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: (instance: Instance) => void;
}

export const InstanceMiniCard: React.FC<InstanceMiniCardProps> = ({
  instance,
  isActive,
  onSelect,
}) => {
  const { launchInstance, killInstance, openFolder } = useLauncher();
  const isRunning = instance.status === 'running';
  const isLaunching =
    instance.status === 'preparing' ||
    instance.status === 'downloading' ||
    instance.status === 'installing' ||
    instance.status === 'launching';

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 p-4 flex flex-col justify-between min-h-[145px] border ${
        isActive
          ? 'bg-[#12141f] border-white/30 shadow-md ring-1 ring-white/15'
          : 'bg-[#0e1017] hover:bg-[#12141e] border-white/[0.07] hover:border-white/20 shadow-sm'
      }`}
    >
      {/* Background Wallpaper with Deep Matte Vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500 opacity-25 group-hover:opacity-35 scale-100 group-hover:scale-105 pointer-events-none"
        style={{
          backgroundImage: `url(${
            !instance.background || instance.background.includes('unsplash.com')
              ? DEFAULT_WALLPAPER
              : instance.background
          })`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-[#0e1017]/80 to-transparent pointer-events-none" />

      {/* Top Row: Icon, Title, Version & Status */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-inner">
            {instance.icon || instance.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate group-hover:text-white transition-colors">
              {instance.name}
            </h3>
            <div className="flex items-center space-x-1.5 text-[11px] text-white/45 font-mono">
              <span>{instance.version}</span>
              <span>•</span>
              <span className="capitalize">{instance.loader}</span>
            </div>
          </div>
        </div>

        {/* Status indicator or Star */}
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {isRunning ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          ) : isActive ? (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.1] text-white/80 border border-white/10">
              Active
            </span>
          ) : instance.isFavorite ? (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ) : null}
        </div>
      </div>

      {/* Bottom Row: Metadata & Quick Play Button */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/[0.06] mt-2">
        <span className="text-[10px] text-white/40 font-mono truncate max-w-[130px]">
          {instance.lastPlayed ? `Played ${instance.lastPlayed}` : 'Ready to launch'}
        </span>

        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openFolder(instance.id)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Open Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (isRunning) killInstance(instance.id);
              else launchInstance(instance.id);
            }}
            disabled={isLaunching}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : isLaunching
                ? 'bg-white/10 text-white cursor-wait'
                : 'bg-white/[0.1] hover:bg-white text-white hover:text-black border border-white/15'
            }`}
            title={isRunning ? 'Stop Instance' : 'Play Instance'}
          >
            {isRunning ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : isLaunching ? (
              <div className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstanceMiniCard;
