import React from 'react';
import { Play, Square, Star, FolderOpen, MoreVertical } from 'lucide-react';
import { Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface InstanceMiniCardProps {
  instance: Instance;
  isActive: boolean;
  onSelect: () => void;
  onEdit: (instance: Instance) => void;
}

export const InstanceMiniCard: React.FC<InstanceMiniCardProps> = ({
  instance,
  isActive,
  onSelect,
  onEdit,
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
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 p-4 flex flex-col justify-between min-h-[160px] border ${
        isActive
          ? 'glass-panel border-[var(--color-primary-light)] shadow-[0_0_20px_var(--color-glow)] scale-[1.02]'
          : 'glass-panel border-white/10 hover:border-[var(--color-primary)]/50 hover:scale-[1.01]'
      }`}
    >
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url(${
            (!instance.background || instance.background.includes('unsplash.com'))
              ? DEFAULT_WALLPAPER
              : instance.background
          })`,
        }}
      />
      <div className="absolute inset-0 bg-[#0d0e15]/80 group-hover:bg-[#0d0e15]/70 transition-colors" />

      {/* Top row: Icon, Name, and Status */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg shadow-sm">
            {instance.icon || '⚡'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white group-hover:text-[var(--color-primary-light)] transition-colors truncate max-w-[130px]">
              {instance.name}
            </h3>
            <div className="flex items-center space-x-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span>{instance.version}</span>
              <span>•</span>
              <span className="capitalize text-white/80">{instance.loader}</span>
            </div>
          </div>
        </div>

        {/* Status indicator or Star */}
        {isRunning ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : instance.isFavorite ? (
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        ) : null}
      </div>

      {/* Bottom row: Last played & Play button */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/5">
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {instance.lastPlayed ? `Played ${instance.lastPlayed}` : 'Never played'}
        </span>

        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openFolder(instance.id)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
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
            className={`p-2 rounded-xl transition-all shadow-md ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : isLaunching
                ? 'bg-amber-600/60 text-white cursor-wait'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[0_0_12px_var(--color-glow)]'
            }`}
            title={isRunning ? 'Stop Instance' : 'Play Instance'}
          >
            {isRunning ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : isLaunching ? (
              <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
