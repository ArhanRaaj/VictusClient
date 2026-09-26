import React from 'react';
import {
  Edit3,
  Package,
  Folder,
  Trash2,
  Play,
  Square,
  Image,
} from 'lucide-react';
import { Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface InstanceCardProps {
  instance: Instance;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onOpenContents: () => void;
  onDuplicate?: () => void;
  onDeleteRequest: () => void;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onEdit,
  onOpenContents,
  onDeleteRequest,
}) => {
  const { launchInstance, killInstance, openFolder } = useLauncher();
  const isRunning = instance.status === 'running';
  const isLaunching =
    instance.status === 'preparing' ||
    instance.status === 'downloading' ||
    instance.status === 'installing' ||
    instance.status === 'launching';

  const ramGb = Math.round((instance.ramMax || 4096) / 1024);

  return (
    <div className="relative rounded-[28px] overflow-hidden glass-panel border border-white/15 flex flex-col justify-between min-h-[220px] select-none shadow-xl group hover:border-purple-400/50 transition-all duration-300">
      {/* Background Instance Wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 pointer-events-none opacity-45"
        style={{
          backgroundImage: `url(${
            (!instance.background || instance.background.includes('unsplash.com'))
              ? DEFAULT_WALLPAPER
              : instance.background
          })`,
        }}
      />
      {/* Solid Dark Gradient Overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1017]/85 via-[#121422]/75 to-[#0b0c14]/90" />

      {/* Main Card Content */}
      <div className="relative z-10 p-6 flex flex-col justify-between flex-1">
        <div className="flex items-start justify-between">
          <div>
            {/* Top Title: Instance Name */}
            <h3 className="font-display font-black text-2xl text-white tracking-tight drop-shadow-sm">
              {instance.name}
            </h3>
            <span className="text-xs text-purple-300/80 font-mono mt-0.5 block">
              {instance.loader.toUpperCase()} • MC {instance.version}
            </span>
          </div>

          {/* Quick Wallpaper / Edit Icon */}
          <button
            onClick={onEdit}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 transition-all backdrop-blur-md"
            title="Change Background or Edit Instance"
          >
            <Image className="w-4 h-4 text-purple-300" />
          </button>
        </div>

        {/* Specs Pill */}
        <div className="my-2 flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono font-medium text-white/90">
            {instance.version}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono font-medium text-cyan-300 capitalize">
            {instance.loader}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono font-medium text-white/90">
            {ramGb} GB RAM
          </span>
        </div>
      </div>

      {/* Signature Segmented Action Bar from Screenshot 2:
          [ Edit | Contents mods, shaders | Folder | Delete | Play ] */}
      <div className="relative z-10 instance-action-bar w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-white">
        {/* Section 1: Edit */}
        <button
          onClick={onEdit}
          className="flex items-center space-x-1.5 hover:text-purple-300 transition-colors cursor-pointer flex-1"
        >
          <Edit3 className="w-3.5 h-3.5 text-white/70" />
          <span>Edit</span>
        </button>

        <div className="h-5 w-[1px] bg-white/20 mx-2" />

        {/* Section 2: Contents */}
        <button
          onClick={onOpenContents}
          className="flex flex-col items-start hover:text-purple-300 transition-colors cursor-pointer flex-1"
        >
          <div className="flex items-center space-x-1">
            <Package className="w-3.5 h-3.5 text-white/70" />
            <span>Contents</span>
          </div>
          <span className="text-[9px] text-white/50 font-mono leading-none truncate max-w-[120px]">
            mods, shaders
          </span>
        </button>

        <div className="h-5 w-[1px] bg-white/20 mx-2" />

        {/* Section 3: Open Folder */}
        <button
          onClick={() => openFolder(instance.id)}
          className="flex items-center space-x-1 hover:text-purple-300 transition-colors cursor-pointer px-2"
          title="Open Game Folder"
        >
          <Folder className="w-4 h-4 text-white/80" />
        </button>

        <div className="h-5 w-[1px] bg-white/20 mx-2" />

        {/* Section 4: Delete */}
        <button
          onClick={onDeleteRequest}
          className="flex items-center space-x-1 hover:text-rose-400 transition-colors cursor-pointer px-2"
          title="Delete Instance"
        >
          <Trash2 className="w-4 h-4 text-rose-400/90" />
        </button>

        {/* Play/Launch Quick Button */}
        <button
          onClick={() => {
            if (isRunning) killInstance(instance.id);
            else launchInstance(instance.id);
          }}
          disabled={isLaunching}
          className={`ml-3 px-3.5 py-1.5 rounded-full text-xs font-black uppercase transition-all shadow-lg flex items-center space-x-1 ${
            isRunning
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40'
              : isLaunching
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-white text-black hover:bg-purple-100 hover:scale-105 shadow-white/25'
          }`}
          title={isRunning ? 'Stop Instance' : 'Play Instance'}
        >
          {isRunning ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
};
