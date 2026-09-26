import React, { useState } from 'react';
import {
  Server,
  X,
  Sparkles,
  Shield,
  Zap,
  Lock,
  Globe,
  ArrowRight,
  User,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useVictusCloud } from '../../context/VictusCloudContext';
import { useLauncher } from '../../context/LauncherContext';

export const VictusCloudAuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authPromptMessage,
    login,
    quickConnect,
  } = useVictusCloud();
  const { activeAccount } = useLauncher();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  if (!isAuthModalOpen) return null;

  const currentProfileName = activeAccount?.username || 'VictusHero';

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim()) return;
    setIsLoading(true);
    await login(usernameOrEmail.trim(), password);
    setIsLoading(false);
  };

  const handleQuickConnect = async () => {
    setIsLoading(true);
    await quickConnect(currentProfileName);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-view-fade-in select-none">
      <div className="w-full max-w-md bg-[#0c0d16] border border-white/15 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
        {/* Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />

        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-black text-xl text-white tracking-tight">
                Victus Cloud Bridge
              </h2>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25">
                panel.victusclient.net
              </span>
            </div>
            <p className="text-xs text-white/50">
              Unified Minecraft Server & Web Control Panel
            </p>
          </div>
        </div>

        {/* Context / Reason Notice */}
        <div className="my-3.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-400/20 text-xs text-purple-200/90 leading-relaxed flex items-start space-x-2.5">
          <Lock className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Authentication Required</span>
            <span className="text-purple-200/70 text-[11px]">{authPromptMessage}</span>
          </div>
        </div>

        {/* 1-Click Quick Connect with Active Profile */}
        <div className="my-4 p-3.5 rounded-2xl bg-[#12131f] border border-white/10 hover:border-cyan-400/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(currentProfileName)}/64`}
                  alt={currentProfileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] text-white/40 block font-mono">Fast Bridge</span>
                <span className="text-xs font-bold text-white">@{currentProfileName}</span>
              </div>
            </div>

            <button
              onClick={handleQuickConnect}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>1-Click Connect</span>
            </button>
          </div>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="px-3 text-[10px] uppercase font-mono text-white/40">
            or sign in with credentials
          </span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-white/70 block mb-1">
              Victus Cloud Username or Email
            </label>
            <div className="flex items-center rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white">
              <User className="w-3.5 h-3.5 text-white/40 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="e.g. Parasjainop_ or user@victusclient.net"
                className="bg-transparent text-xs text-white focus:outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/70 block mb-1">
              Password
            </label>
            <div className="flex items-center rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white">
              <KeyRound className="w-3.5 h-3.5 text-white/40 mr-2 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-transparent text-xs text-white focus:outline-none w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-white/90 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center space-x-2 mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Authenticating with Victus Cloud...</span>
              </>
            ) : (
              <>
                <span>Sign In to Victus Cloud</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Web */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
          <span>Need a free web account?</span>
          <button
            onClick={() => {
              const url = 'https://victusclient.net/register';
              if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }}
            className="text-cyan-300 hover:text-cyan-200 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <span>victusclient.net/register</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
