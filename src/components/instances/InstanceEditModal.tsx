import React, { useState, useEffect } from 'react';
import { X, Sliders, Cpu, Save, Image, Upload, Check, Sparkles, Gauge } from 'lucide-react';
import { Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';

import { WALLPAPER_PRESETS, DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface InstanceEditModalProps {
  instance: Instance | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InstanceEditModal: React.FC<InstanceEditModalProps> = ({
  instance,
  isOpen,
  onClose,
}) => {
  const { updateInstance } = useLauncher();
  const [name, setName] = useState('');
  const [ramMax, setRamMax] = useState(4096);
  const [jvmArgs, setJvmArgs] = useState('');
  const [performancePreset, setPerformancePreset] = useState(false);
  const [icon, setIcon] = useState('⚡');
  const [background, setBackground] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Sync state whenever instance changes
  useEffect(() => {
    if (instance) {
      setName(instance.name || '');
      setRamMax(instance.ramMax || 4096);
      setJvmArgs(instance.jvmArgs || '');
      setPerformancePreset(instance.performancePreset === true);
      setIcon(instance.icon || '⚡');
      setBackground(instance.background || DEFAULT_WALLPAPER);
      setCustomUrl('');
    }
  }, [instance]);

  if (!isOpen || !instance) return null;

  // Handle local image file upload
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

  const handleSave = async () => {
    await updateInstance({
      ...instance,
      name: name.trim() || instance.name,
      ramMax,
      jvmArgs,
      performancePreset,
      icon,
      background,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300 select-none animate-fade-in">
      <div className="w-full max-w-xl rounded-[28px] bg-[#141624] border border-white/12 shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-7 relative max-h-[90vh] overflow-y-auto animate-modal-spring">

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 mb-6 relative z-10">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-white">Edit Instance & Wallpaper</h2>
            <p className="text-xs text-white/65 font-medium">
              {instance.version} • {instance.loader}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* =========================================================================
              WALLPAPER & BACKGROUND CUSTOMIZATION (DIRECT USER REQUEST)
             ========================================================================= */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                <Image className="w-4 h-4" />
                <span>Instance Background Artwork</span>
              </label>
              <span className="text-[10px] text-white/50 font-mono">Live Preview</span>
            </div>

            {/* Live Mini Preview Box */}
            <div className="relative h-28 rounded-2xl overflow-hidden border border-white/20 shadow-inner group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${background})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent backdrop-blur-[2px]" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                <div>
                  <h4 className="font-bold text-sm truncate">{name || instance.name}</h4>
                  <span className="text-[10px] text-white/70 font-mono">
                    {instance.version} • {instance.loader}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold">
                  Active Card Preview
                </span>
              </div>
            </div>

            {/* Preset Wallpapers */}
            <div>
              <span className="text-[11px] font-semibold text-white/70 block mb-2">
                Curated Presets:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {WALLPAPER_PRESETS.map((p) => {
                  const isSelected = background === p.url;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setBackground(p.url)}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all text-left group ${
                        isSelected
                          ? 'border-purple-400 scale-[1.03] shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                          : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                        <span className="text-[10px] font-bold text-white text-center leading-tight truncate">
                          {p.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom URL or Local File Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
              {/* Custom Image URL */}
              <div>
                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    if (e.target.value.trim().startsWith('http')) {
                      setBackground(e.target.value.trim());
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Local File Upload */}
              <label className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-medium cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-purple-300" />
                <span>Upload Local Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Instance Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              Instance Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Allocated RAM */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Allocated Memory (RAM)</span>
              </label>
              <span className="font-mono text-xs font-bold text-purple-300">
                {Math.round(ramMax / 1024)} GB ({ramMax} MB)
              </span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="1024"
              value={ramMax}
              onChange={(e) => setRamMax(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          {/* Performance preset */}
          <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
            <button
              type="button"
              onClick={() => setPerformancePreset((v) => !v)}
              className="w-full flex items-start justify-between space-x-3 text-left cursor-pointer"
            >
              <span className="flex items-start space-x-3">
                <Gauge className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wider text-white/80">
                    Performance Preset
                  </span>
                  <span className="block text-[11px] text-white/55 mt-1 leading-relaxed">
                    Lowers render distance, simulation distance, mipmaps, cloud range and particles in
                    this instance&apos;s options.txt at launch. Use the in-game settings to change them back.
                  </span>
                </span>
              </span>
              <span
                className={`shrink-0 mt-0.5 w-9 h-5 rounded-full transition-all relative ${
                  performancePreset ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    performancePreset ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* JVM Launch Arguments */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
              JVM Launch Arguments
            </label>
            <input
              type="text"
              value={jvmArgs}
              onChange={(e) => setJvmArgs(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white/80 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center space-x-2 transition-all hover:scale-102"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
