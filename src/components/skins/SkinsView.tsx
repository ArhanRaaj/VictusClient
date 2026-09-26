import React, { useState } from 'react';
import {
  Upload,
  Download,
  Check,
  Sparkles,
  RefreshCw,
  User,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PlayerModelViewer } from './PlayerModelViewer';
import { useLauncher } from '../../context/LauncherContext';

export const SkinsView: React.FC = () => {
  const { activeAccount, addNotification } = useLauncher();
  const [selectedSkinUrl, setSelectedSkinUrl] = useState<string>(
    activeAccount?.skinUrl ||
      'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697'
  );
  const [modelType, setModelType] = useState<'default' | 'slim'>('default');
  const [animationType, setAnimationType] = useState<'idle' | 'walk' | 'run'>('idle');

  // Curated Preset Skin Library
  const skinPresets = [
    {
      name: 'Victus Cyber Knight',
      type: 'default',
      url: 'https://textures.minecraft.net/texture/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697',
      thumb: 'https://mc-heads.net/avatar/292009a4925b58f02c77d6d330e88d40f6074e798d24e734ff70a02632e5b697/64',
    },
    {
      name: 'Neon Hunter',
      type: 'slim',
      url: 'https://textures.minecraft.net/texture/71a629c54e85dc6280fb5d7990117079cc621e25e1a141b7119f9f5fa4537166',
      thumb: 'https://mc-heads.net/avatar/71a629c54e85dc6280fb5d7990117079cc621e25e1a141b7119f9f5fa4537166/64',
    },
    {
      name: 'Void Assassin',
      type: 'default',
      url: 'https://textures.minecraft.net/texture/a36cb9eb2a297e68b3d68ef6ae8c9a35e95669894e75e9b867c4273abdfcfb8',
      thumb: 'https://mc-heads.net/avatar/a36cb9eb2a297e68b3d68ef6ae8c9a35e95669894e75e9b867c4273abdfcfb8/64',
    },
    {
      name: 'Modern Steve',
      type: 'default',
      url: 'https://textures.minecraft.net/texture/7592cf16efebff647ee56fa39f5c4ce9d7fe3b59367d3e0cb3aeb00cbcf6a',
      thumb: 'https://mc-heads.net/avatar/steve/64',
    },
    {
      name: 'Modern Alex',
      type: 'slim',
      url: 'https://textures.minecraft.net/texture/4ee6c3faebecae3b41d2757279fbccbfad796d1ebf40f2ec4172f3e8ca7797e8',
      thumb: 'https://mc-heads.net/avatar/alex/64',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.png')) {
        addNotification('error', 'Invalid Skin', 'Minecraft skins must be PNG files (64x64 or 64x32).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedSkinUrl(event.target.result as string);
          addNotification('success', 'Skin Loaded', `Loaded custom skin from "${file.name}"`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplySkin = () => {
    if (activeAccount) {
      activeAccount.skinUrl = selectedSkinUrl;
      activeAccount.avatarUrl = `https://mc-heads.net/avatar/${activeAccount.username}/128`;
    }
    addNotification('success', 'Skin Applied', 'Updated active player skin successfully!');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2 text-[var(--color-primary-light)] text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Character Wardrobe</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Skin & Cape Customizer
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Configure your 3D avatar, preview animations, and apply skins
          </p>
        </div>

        {/* Apply Skin Action */}
        <button
          onClick={handleApplySkin}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_var(--color-glow)] hover:shadow-[0_0_30px_var(--color-glow)] hover:scale-105 active:scale-95 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Apply to Account</span>
        </button>
      </div>

      {/* Main Grid: 3D Preview (Left) & Customizer Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Interactive Stage */}
        <div className="lg:col-span-6 rounded-3xl glass-panel p-6 border border-white/10 flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden">
          {/* Subtle Stage Lighting Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[var(--color-primary)]/15 blur-[80px] pointer-events-none" />

          {/* Model Type & Animation Bar */}
          <div className="w-full flex items-center justify-between z-10">
            {/* Model Type Selector */}
            <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                onClick={() => setModelType('default')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  modelType === 'default'
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                Classic (4px)
              </button>
              <button
                onClick={() => setModelType('slim')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  modelType === 'slim'
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                Slim / Alex (3px)
              </button>
            </div>

            {/* Animation Selector */}
            <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              {(['idle', 'walk', 'run'] as const).map((anim) => (
                <button
                  key={anim}
                  onClick={() => setAnimationType(anim)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                    animationType === anim
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  {anim}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Skin Canvas */}
          <div className="w-full flex-1 flex items-center justify-center my-4 z-10">
            <PlayerModelViewer
              skinUrl={selectedSkinUrl}
              width={280}
              height={340}
              modelType={modelType}
              animationType={animationType}
              autoRotate={true}
              enableControls={true}
            />
          </div>

          {/* Hint */}
          <div className="z-10 text-[11px] text-[var(--color-text-muted)] bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
            Click & drag to inspect 3D player mesh • Scroll to zoom
          </div>
        </div>

        {/* Right: Upload, Preset Library & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Upload Card */}
          <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <Upload className="w-4 h-4 text-[var(--color-primary-light)]" />
              <span>Import Skin File</span>
            </h3>

            <label className="border-2 border-dashed border-white/15 hover:border-[var(--color-primary)]/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group bg-black/20">
              <input type="file" accept=".png" onChange={handleFileUpload} className="hidden" />
              <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-[var(--color-primary)]/20 text-white/60 group-hover:text-[var(--color-primary-light)] flex items-center justify-center mb-3 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-[var(--color-primary-light)] transition-colors">
                Choose Skin File (.PNG)
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] mt-1">
                Drag and drop 64x64 skin texture file
              </span>
            </label>
          </div>

          {/* Preset Skins Library */}
          <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary-light)]" />
              <span>Curated Skin Presets</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skinPresets.map((preset) => {
                const isSelected = selectedSkinUrl === preset.url;
                return (
                  <div
                    key={preset.name}
                    onClick={() => {
                      setSelectedSkinUrl(preset.url);
                      setModelType(preset.type as any);
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] shadow-[0_0_12px_var(--color-glow)]'
                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <img
                      src={preset.thumb}
                      alt={preset.name}
                      className="w-10 h-10 rounded-xl bg-black/40 border border-white/10"
                    />
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-white truncate">{preset.name}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] capitalize">
                        {preset.type} model
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
