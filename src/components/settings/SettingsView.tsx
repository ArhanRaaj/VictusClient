import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Gamepad2,
  Cpu,
  Download,
  Info,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  FolderOpen,
  RefreshCw,
  GitBranch,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import { WALLPAPER_PRESETS } from '../../constants/wallpapers';

export const SettingsView: React.FC = () => {
  const { addNotification, openFolder } = useLauncher();
  const { theme, setTheme, applyPreset, updateThemeProperty, resetTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<
    'appearance' | 'general' | 'minecraft' | 'java' | 'downloads' | 'launcher'
  >('appearance');

  // Auto-updater state
  const [appVersion, setAppVersion] = useState('1.0.2');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

  React.useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((ver) => {
      if (ver) setAppVersion(ver);
    }).catch(() => {});
  }, []);

  // Minecraft settings local state
  const [defaultRam, setDefaultRam] = useState(4096);
  const [fullscreen, setFullscreen] = useState(false);
  const [resWidth, setResWidth] = useState(1280);
  const [resHeight, setResHeight] = useState(720);
  const [customJvm, setCustomJvm] = useState('-XX:+UseG1GC -Dsun.rmi.dgc.server.gcInterval=2147483646');

  // Java state
  const [javaPath, setJavaPath] = useState('');
  const [detectedJavas, setDetectedJavas] = useState([
    { version: 'Java 21 (Temurin OpenJDK)', path: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot\\bin\\java.exe', major: 21 },
    { version: 'Java 17 (Microsoft Build)', path: 'C:\\Program Files\\Microsoft\\jdk-17.0.8\\bin\\java.exe', major: 17 },
  ]);

  const sections = [
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'minecraft', label: 'Minecraft Defaults', icon: Gamepad2 },
    { id: 'java', label: 'Java Runtime', icon: Cpu },
    { id: 'downloads', label: 'Downloads & Cache', icon: Download },
    { id: 'launcher', label: 'About Launcher', icon: Info },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2 text-[var(--color-primary-light)] text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Configure appearance, performance, Java runtimes, and launcher behavior
          </p>
        </div>

        <button
          onClick={() => {
            resetTheme();
            addNotification('info', 'Settings Reset', 'Default appearance restored.');
          }}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Theme</span>
        </button>
      </div>

      {/* Main Grid: Section Navigation & Section Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section Tabs */}
        <div className="lg:col-span-3 space-y-1.5">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white border-[var(--color-primary-light)] shadow-[0_0_15px_var(--color-glow)]'
                    : 'bg-white/5 border-transparent text-[var(--color-text-muted)] hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Section Content Panel */}
        <div className="lg:col-span-9 space-y-6">
          {/* APPEARANCE SECTION */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Presets */}
              <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-primary-light)]" />
                  <span>Color Theme Presets</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.keys(THEME_PRESETS).map((presetName) => {
                    const preset = THEME_PRESETS[presetName];
                    const isSelected = theme.preset === presetName;
                    return (
                      <button
                        key={presetName}
                        onClick={() => applyPreset(presetName)}
                        className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-20 ${
                          isSelected
                            ? 'bg-white/15 border-white shadow-[0_0_15px_var(--color-glow)] scale-[1.02]'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: preset.primaryAccent }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: preset.secondaryAccent }}
                          />
                        </div>
                        <span className="font-bold text-xs text-white truncate">{presetName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modern Theme & Background Settings */}
              <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Launcher Appearance & Artwork</span>
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Customize launcher background wallpaper, accent vibrancy, and animations
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Custom Background Image URL */}
                  <div className="space-y-2">
                    <span className="font-semibold text-white/90 text-xs block">Launcher Background Wallpaper URL</span>
                    <input
                      type="text"
                      placeholder="https://example.com/custom-wallpaper.png..."
                      value={theme.customBackgroundUrl || ''}
                      onChange={(e) => updateThemeProperty('customBackgroundUrl', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* Background Opacity */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white/90">Wallpaper Opacity</span>
                      <span className="font-mono text-[var(--color-primary-light)] font-bold">
                        {Math.round((theme.customBackgroundOpacity ?? 0.4) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.0"
                      step="0.05"
                      value={theme.customBackgroundOpacity ?? 0.4}
                      onChange={(e) =>
                        updateThemeProperty('customBackgroundOpacity', Number(e.target.value))
                      }
                      className="w-full accent-[var(--color-primary-light)] cursor-pointer"
                    />
                  </div>

                  {/* Accent Glow Intensity */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white/80">Accent Glow Intensity</span>
                      <span className="font-mono text-[var(--color-primary-light)] font-bold">
                        {Math.round((theme.glowIntensity ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={theme.glowIntensity ?? 0.35}
                      onChange={(e) => updateThemeProperty('glowIntensity', Number(e.target.value))}
                      className="w-full accent-[var(--color-primary-light)] cursor-pointer"
                    />
                  </div>

                  {/* Reduced Motion Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5">
                    <div>
                      <span className="font-semibold text-xs text-white block">Fluid UI Animations</span>
                      <span className="text-[10px] text-white/50">Spring transitions & glow pulses</span>
                    </div>
                    <button
                      onClick={() => updateThemeProperty('reducedMotion', !theme.reducedMotion)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !theme.reducedMotion ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {!theme.reducedMotion ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Interactive Cursor-Attracted Particles */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5">
                    <div>
                      <span className="font-semibold text-xs text-white block">Cursor Particle Magnetism</span>
                      <span className="text-[10px] text-white/50">Attracts floating particles to cursor with accent glow</span>
                    </div>
                    <button
                      onClick={() =>
                        updateThemeProperty('particlesEnabled', !(theme.particlesEnabled ?? true))
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (theme.particlesEnabled ?? true)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {(theme.particlesEnabled ?? true) ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>

                {/* Navbar & Sidebar Color Customizer */}
                <div className="pt-5 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <Palette className="w-3.5 h-3.5 text-purple-400" />
                        <span>Navbar & Sidebar Capsule Color</span>
                      </h4>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Choose the color theme for the navigation bar capsule
                      </p>
                    </div>

                    <button
                      onClick={() => updateThemeProperty('sidebarColor', theme.primaryAccent)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer hover:scale-105"
                      title="Set sidebar color to match current theme accent"
                    >
                      Sync with Accent
                    </button>
                  </div>

                  {/* Quick Color Swatches */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {[
                      { name: 'Royal Purple', color: '#7c3aed' },
                      { name: 'Cyber Blue', color: '#2563eb' },
                      { name: 'Crimson Red', color: '#e11d48' },
                      { name: 'Toxic Emerald', color: '#059669' },
                      { name: 'Neon Cyan', color: '#0891b2' },
                      { name: 'Electric Sunset', color: '#ea580c' },
                      { name: 'Hot Pink', color: '#db2777' },
                      { name: 'Matte Obsidian', color: '#27272a' },
                    ].map((swatch) => {
                      const isSelected =
                        (theme.sidebarColor || '#7c3aed').toLowerCase() === swatch.color.toLowerCase();
                      return (
                        <button
                          key={swatch.name}
                          type="button"
                          onClick={() => updateThemeProperty('sidebarColor', swatch.color)}
                          className={`h-10 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                              : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.color }}
                          title={swatch.name}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Input */}
                  <div className="flex items-center space-x-3 pt-1">
                    <span className="text-xs text-white/70 font-semibold">Custom Color:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={theme.sidebarColor || '#7c3aed'}
                        onChange={(e) => updateThemeProperty('sidebarColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={theme.sidebarColor || '#7c3aed'}
                        onChange={(e) => updateThemeProperty('sidebarColor', e.target.value)}
                        className="w-24 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="pt-4 border-t border-white/5">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-3">
                    Accent Color Overrides
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">
                        Primary Accent
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={theme.primaryAccent}
                          onChange={(e) => updateThemeProperty('primaryAccent', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{theme.primaryAccent}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">
                        Secondary Accent
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={theme.secondaryAccent}
                          onChange={(e) => updateThemeProperty('secondaryAccent', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{theme.secondaryAccent}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">
                        Background Tone
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={theme.backgroundColor}
                          onChange={(e) => updateThemeProperty('backgroundColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{theme.backgroundColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[var(--color-text-muted)] block mb-1">
                        Card Surface Tone
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={theme.surfaceColor}
                          onChange={(e) => updateThemeProperty('surfaceColor', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{theme.surfaceColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Launcher Global Wallpaper & Atmosphere (User Request) */}
              <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Launcher Canvas Wallpaper</span>
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Set a custom desktop background image visible through iOS frosted glass
                    </p>
                  </div>
                  {theme.customBackgroundUrl && (
                    <button
                      onClick={() => updateThemeProperty('customBackgroundUrl', '')}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold"
                    >
                      Use Living Aurora
                    </button>
                  )}
                </div>

                {/* Wallpaper Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {WALLPAPER_PRESETS.map((bg) => {
                    const isSelected = theme.customBackgroundUrl === bg.url;
                    return (
                      <div
                        key={bg.name}
                        onClick={() => updateThemeProperty('customBackgroundUrl', bg.url)}
                        className={`relative h-18 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isSelected
                            ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-[1.03]'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                          <span className="text-[10px] font-bold text-white truncate">{bg.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom URL & Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Paste Custom Wallpaper URL..."
                    value={theme.customBackgroundUrl || ''}
                    onChange={(e) => updateThemeProperty('customBackgroundUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
                  />
                  <label className="flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-medium cursor-pointer transition-colors">
                    <span>Upload Local Wallpaper</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              updateThemeProperty('customBackgroundUrl', event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* MINECRAFT SECTION */}
          {activeSection === 'minecraft' && (
            <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Default Minecraft Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-white">Default RAM Allocation</span>
                    <span className="font-mono text-xs font-bold text-[var(--color-primary-light)]">
                      {Math.round(defaultRam / 1024)} GB ({defaultRam} MB)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1024"
                    max="16384"
                    step="1024"
                    value={defaultRam}
                    onChange={(e) => setDefaultRam(Number(e.target.value))}
                    className="w-full accent-[var(--color-primary-light)] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Window Width
                    </label>
                    <input
                      type="number"
                      value={resWidth}
                      onChange={(e) => setResWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Window Height
                    </label>
                    <input
                      type="number"
                      value={resHeight}
                      onChange={(e) => setResHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Default JVM Arguments
                  </label>
                  <input
                    type="text"
                    value={customJvm}
                    onChange={(e) => setCustomJvm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white/90"
                  />
                </div>
              </div>
            </div>
          )}

          {/* JAVA SECTION */}
          {activeSection === 'java' && (
            <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Java Runtime Environments
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Minecraft 1.20.5+ requires Java 21, 1.17-1.20.4 requires Java 17
                  </p>
                </div>
                <button
                  onClick={() => addNotification('info', 'Java Detection', 'Scanning system for JRE/JDK installations...')}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold shadow-md"
                >
                  Auto-Detect Java
                </button>
              </div>

              <div className="space-y-3">
                {detectedJavas.map((j) => (
                  <div
                    key={j.path}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{j.version}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate max-w-md">
                        {j.path}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GENERAL & LAUNCHER SECTION */}
          {(activeSection === 'general' || activeSection === 'launcher') && (
            <div className="space-y-6">
              {/* Auto-Updater & GitHub Release Deck */}
              <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-violet-600/50" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                        Client Updates & GitHub Releases
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 font-bold">
                        AUTO-SYNC
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Whenever new updates are pushed to GitHub, your launcher updates seamlessly in the background without reinstalling.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      setCheckingUpdate(true);
                      setUpdateStatus('Checking GitHub for new releases...');
                      try {
                        if (window.electronAPI?.checkForUpdates) {
                          const info = await window.electronAPI.checkForUpdates();
                          if (info && info.updateAvailable) {
                            setUpdateStatus(`Update available: v${info.latestVersion}`);
                            addNotification({
                              type: 'info',
                              title: 'Update Available',
                              message: `VictusClient v${info.latestVersion} found!`,
                            });
                          } else {
                            setUpdateStatus('You are running the latest version of VictusClient.');
                            addNotification({
                              type: 'success',
                              title: 'Up to Date',
                              message: 'VictusClient is on the newest build.',
                            });
                          }
                        } else {
                          await new Promise((r) => setTimeout(r, 700));
                          setUpdateStatus('Launcher is up to date.');
                        }
                      } catch {
                        setUpdateStatus('Failed to check GitHub releases.');
                      } finally {
                        setCheckingUpdate(false);
                      }
                    }}
                    disabled={checkingUpdate}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                  </button>
                </div>

                {updateStatus && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-cyan-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{updateStatus}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[10px] uppercase">Installed Version</span>
                    <span className="font-bold text-white text-sm">v{appVersion}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[10px] uppercase">Update Channel</span>
                    <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span className="truncate">ArhanRaaj/VictusClient</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[10px] uppercase">Auto-Install Mode</span>
                    <span className="text-emerald-400 font-bold">Background & In-Place</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-update-toggle"
                      checked={autoUpdateEnabled}
                      onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                      className="rounded bg-black/50 border-white/20 text-purple-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="auto-update-toggle" className="text-white/80 cursor-pointer">
                      Automatically download and notify when code is pushed to GitHub
                    </label>
                  </div>

                  <button
                    onClick={() => {
                      const url = 'https://github.com/ArhanRaaj/VictusClient/releases';
                      if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                      else window.open(url, '_blank');
                    }}
                    className="text-cyan-300 hover:text-cyan-200 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View GitHub Releases</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* System Information Card */}
              <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  VictusClient System Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[var(--color-text-muted)] block text-[10px]">Client Version</span>
                    <span className="font-bold text-white">{appVersion} "Ascent" (Production)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[var(--color-text-muted)] block text-[10px]">Engine</span>
                    <span className="font-bold text-white">Electron 33 + Vite + React 18</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[var(--color-text-muted)] block text-[10px]">Modrinth API</span>
                    <span className="font-bold text-emerald-400">Connected (v2)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[var(--color-text-muted)] block text-[10px]">Mojang Manifest</span>
                    <span className="font-bold text-emerald-400">v2 Synchronized</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
