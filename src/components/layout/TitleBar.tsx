import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Search, User, Sparkles } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme } from '../../context/ThemeContext';

interface TitleBarProps {
  onOpenSearch: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenSearch, activeTab, setActiveTab }) => {
  const { activeAccount, isElectron } = useLauncher();
  const { theme } = useTheme();
  const accentColor = theme.sidebarColor || theme.primaryAccent || '#7c3aed';
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState('v1.0.8');

  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.isWindowMaximized().then(setIsMaximized);
      window.electronAPI.getAppVersion?.().then((v) => {
        if (v) setAppVersion(`v${v}`);
      }).catch(() => {});
    }
  }, [isElectron]);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  return (
    <header className="h-11 w-full flex items-center justify-between px-5 select-none drag-region bg-[#0a0a0e]/95 backdrop-blur-xl border-b border-white/[0.07] relative z-50">
      {/* Left: Sleek Brand Mark with Coordinated Accent Glow */}
      <div className="flex items-center space-x-2.5 no-drag">
        <img
          src="./icon.png"
          alt="VictusClient"
          className="w-5 h-5 object-contain transition-transform duration-200 hover:scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
        />
        <div className="flex items-center space-x-1.5">
          <span className="font-display font-black text-xs tracking-[0.2em] uppercase text-white">
            Victus<span style={{ color: accentColor }}>Client</span>
          </span>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-white/[0.06] text-white/50 border border-white/5">
            {appVersion}
          </span>
        </div>
      </div>

      {/* Center: Sleek URL-style / Omnibar Pill */}
      <div
        onClick={onOpenSearch}
        className="no-drag hidden sm:flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-[#12131a]/80 hover:bg-[#161722] border border-white/[0.08] hover:border-white/20 text-white/60 hover:text-white text-[11px] font-mono cursor-pointer transition-all shadow-sm hover:scale-[1.01]"
        title="Quick Search (Ctrl + K)"
      >
        <Search className="w-3 h-3 text-white/45" />
        <span className="tracking-wide">victusclient.net</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/[0.08] text-white/80 font-sans font-bold ml-1 border border-white/5">
          Ctrl+K
        </span>
      </div>

      {/* Right: Account Status Chip + 3D Traffic Light Controls */}
      <div className="flex items-center space-x-3.5 no-drag">
        {/* Quick Account Pill */}
        <button
          onClick={() => setActiveTab('accounts')}
          className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/20 text-white/80 hover:text-white transition-all cursor-pointer shadow-sm group"
          title="Manage Account"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-tight">
            {activeAccount?.username || 'VictusHero'}
          </span>
        </button>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* 3D Glossy Jewel Traffic Light Window Controls */}
        <div className="flex items-center space-x-2">
          {/* Minimize: Amber / Yellow 3D Jewel */}
          <button
            onClick={handleMinimize}
            className="w-3.5 h-3.5 rounded-full traffic-btn-yellow flex items-center justify-center cursor-pointer group"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Maximize: Emerald / Green 3D Jewel */}
          <button
            onClick={handleMaximize}
            className="w-3.5 h-3.5 rounded-full traffic-btn-green flex items-center justify-center cursor-pointer group"
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label="Maximize"
          >
            <Square className="w-1.5 h-1.5 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Close: Ruby / Red 3D Jewel */}
          <button
            onClick={handleClose}
            className="w-3.5 h-3.5 rounded-full traffic-btn-red flex items-center justify-center cursor-pointer group"
            title="Close"
            aria-label="Close"
          >
            <X className="w-2 h-2 text-black/70 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </header>
  );
};
