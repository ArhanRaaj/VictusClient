import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Layers,
  Sparkles,
  Cpu,
  Check,
  ChevronDown,
  Upload,
  SlidersHorizontal,
  FolderOpen,
  ArrowRight,
  Shield,
  Zap,
  Box,
  Hammer,
  Settings2,
} from 'lucide-react';
import { ModLoader } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme } from '../../context/ThemeContext';

import { WALLPAPER_PRESETS, DEFAULT_WALLPAPER } from '../../constants/wallpapers';

import { MINECRAFT_VERSIONS, POPULAR_VERSIONS, DEFAULT_VERSION } from '../../constants/versions';

interface InstanceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoaderOption {
  id: ModLoader;
  name: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
}

const LOADERS: LoaderOption[] = [
  {
    id: 'fabric',
    name: 'Fabric',
    badge: 'Recommended',
    desc: 'Ultra lightweight & fastest FPS',
    icon: <Zap className="w-4 h-4 text-purple-400" />,
  },
  {
    id: 'neoforge',
    name: 'NeoForge',
    badge: 'Modern',
    desc: 'Modern community Forge standard',
    icon: <Hammer className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'forge',
    name: 'Forge',
    badge: 'Classic',
    desc: 'Huge legacy & modern mod catalog',
    icon: <Settings2 className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'quilt',
    name: 'Quilt',
    badge: 'Modular',
    desc: 'Next-gen modular Fabric ecosystem',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'vanilla',
    name: 'Vanilla',
    badge: 'Pure',
    desc: 'Clean official Mojang Minecraft',
    icon: <Box className="w-4 h-4 text-emerald-400" />,
  },
];

const ICON_PRESETS = ['⚡', '💎', '⚔️', '🔥', '⚙️', '🛡️', '🚀', '🌟', '🪐', '🎮', '🏹', '🧪'];

export const InstanceWizardModal: React.FC<InstanceWizardModalProps> = ({ isOpen, onClose }) => {
  const { createInstance } = useLauncher();
  const { theme } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [hasCustomName, setHasCustomName] = useState(false);
  const [mcVersion, setMcVersion] = useState<string>(DEFAULT_VERSION);
  const [loader, setLoader] = useState<ModLoader>('fabric');
  const [loaderVersion, setLoaderVersion] = useState('0.16.9 (Latest)');
  const [ramMax, setRamMax] = useState(4096);
  const [ramMin, setRamMin] = useState(2048);
  const [icon, setIcon] = useState('⚡');
  const [background, setBackground] = useState(WALLPAPER_PRESETS[0].url);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jvmArgs, setJvmArgs] = useState('-XX:+UseG1GC -Dsun.rmi.dgc.server.gcInterval=2147483646');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate name if user hasn't typed custom name
  useEffect(() => {
    if (!hasCustomName) {
      const loaderName = loader.charAt(0).toUpperCase() + loader.slice(1);
      setName(`${loaderName} ${mcVersion}`);
    }
  }, [loader, mcVersion, hasCustomName]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setHasCustomName(false);
      setName('Fabric 1.21.4');
      setMcVersion('1.21.4');
      setLoader('fabric');
      setRamMax(4096);
      setIcon('⚡');
      setShowAdvanced(false);
      setShowIconPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBackground(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInstance({
        name: name.trim() || `${loader.toUpperCase()} ${mcVersion}`,
        version: mcVersion,
        loader,
        loaderVersion,
        ramMin,
        ramMax,
        icon,
        background,
        jvmArgs,
      });
      onClose();
    } catch (err) {
      console.error('Failed to create instance:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const accentColor = theme.primaryAccent || '#7c3aed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 select-none animate-fade-in">
      {/* Creation Modal Box */}
      <div className="w-full max-w-xl rounded-2xl bg-[#0f1016] border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh] relative animate-modal-spring">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white tracking-wide">
                Create New Instance
              </h2>
              <p className="text-[11px] text-white/50">
                Configure your Minecraft profile, mod loader, and resources
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Row 1: Instance Name & Icon */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
              Instance Name & Icon
            </label>
            <div className="flex items-center space-x-2.5">
              {/* Icon Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Choose Icon"
                >
                  {icon}
                </button>

                {/* Popover Emoji Picker */}
                {showIconPicker && (
                  <div className="absolute top-13 left-0 z-30 p-2 rounded-xl bg-[#161722] border border-white/15 shadow-2xl grid grid-cols-4 gap-1.5 w-44 animate-fade-in">
                    {ICON_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setIcon(emoji);
                          setShowIconPicker(false);
                        }}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                          icon === emoji
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasCustomName(true);
                  }}
                  placeholder="e.g. Fabric 1.21.4, Speedrun, Modpack"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Mod Loader Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
              Select Mod Loader
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LOADERS.map((l) => {
                const isSelected = loader === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLoader(l.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="mb-1">{l.icon}</div>
                    <span className="font-bold text-xs text-white truncate w-full">
                      {l.name}
                    </span>
                    <span
                      className={`text-[9px] font-semibold mt-0.5 px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {l.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Game Version & Loader Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Minecraft Version */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Minecraft Version
                </label>
              </div>

              {/* Version Quick Pills */}
              <div className="flex flex-wrap gap-1 mb-2">
                {POPULAR_VERSIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMcVersion(v)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      mcVersion === v
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-white/60'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Custom Version Dropdown */}
              <div className="relative">
                <select
                  value={mcVersion}
                  onChange={(e) => setMcVersion(e.target.value)}
                  className="w-full appearance-none px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  {MINECRAFT_VERSIONS.map((v) => (
                    <option key={v} value={v} className="bg-[#12131c] text-white">
                      Minecraft {v} {v === '26.3' ? '(Latest)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Loader Version */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Loader Version
              </label>
              <div className="relative mt-7">
                <select
                  value={loaderVersion}
                  onChange={(e) => setLoaderVersion(e.target.value)}
                  disabled={loader === 'vanilla'}
                  className={`w-full appearance-none px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400 ${
                    loader === 'vanilla' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {loader === 'fabric' && (
                    <>
                      <option value="0.16.9 (Latest)">0.16.9 (Latest Stable)</option>
                      <option value="0.16.8">0.16.8</option>
                      <option value="0.16.7">0.16.7</option>
                    </>
                  )}
                  {loader === 'neoforge' && (
                    <>
                      <option value="21.4.24-beta (Latest)">21.4.24-beta (Latest)</option>
                      <option value="21.1.80">21.1.80</option>
                    </>
                  )}
                  {loader === 'forge' && (
                    <>
                      <option value="53.0.7 (Latest)">53.0.7 (Latest)</option>
                      <option value="47.3.0">47.3.0</option>
                    </>
                  )}
                  {loader === 'quilt' && (
                    <>
                      <option value="0.27.1 (Latest)">0.27.1 (Latest)</option>
                    </>
                  )}
                  {loader === 'vanilla' && (
                    <option value="Official">Official Mojang Jar</option>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 4: Memory RAM Allocation Slider */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                  Memory Allocation (RAM)
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-purple-300">
                {Math.round(ramMax / 1024)} GB <span className="text-white/40 font-normal">({ramMax} MB)</span>
              </span>
            </div>

            <input
              type="range"
              min="2048"
              max="16384"
              step="1024"
              value={ramMax}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRamMax(val);
                setRamMin(Math.min(ramMin, val));
              }}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] text-white/40 font-mono">
              <span>2 GB (Vanilla)</span>
              <span className="text-purple-300 font-semibold">4 - 6 GB (Recommended)</span>
              <span>8+ GB (Shaders)</span>
            </div>
          </div>

          {/* Row 5: Compact Wallpaper Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Cover Wallpaper (Optional)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer flex items-center space-x-1"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Custom</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {WALLPAPER_PRESETS.map((wp) => (
                <div
                  key={wp.name}
                  onClick={() => setBackground(wp.url)}
                  className={`h-11 rounded-lg overflow-hidden cursor-pointer border transition-all relative ${
                    background === wp.url
                      ? 'border-purple-400 ring-2 ring-purple-500/50 scale-[1.03]'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                  title={wp.name}
                >
                  <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                  {background === wp.url && (
                    <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-white/50 hover:text-white/80 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Java & JVM Arguments'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fade-in">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Custom JVM Arguments
                </label>
                <input
                  type="text"
                  value={jvmArgs}
                  onChange={(e) => setJvmArgs(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-white/80 focus:outline-none focus:border-purple-400"
                />
                <p className="text-[10px] text-white/40">
                  Java GC optimizations and parameters applied on launch.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/40">
          <div className="flex items-center space-x-2 text-xs text-white/60">
            <span className="font-semibold text-white">{icon} {name || 'New Instance'}</span>
            <span className="text-white/30">•</span>
            <span className="text-purple-300 font-medium">{mcVersion}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/60">{Math.round(ramMax / 1024)}GB</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center space-x-2 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 20px ${accentColor}66`,
              }}
            >
              {submitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Instance</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
