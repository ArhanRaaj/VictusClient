import React, { useState } from 'react';
import { X, Globe, Mail, Lock, Shield, ArrowRight, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { useVictusCloud } from '../../context/VictusCloudContext';

export const CloudAuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authPromptMessage,
    loginWithBrowser,
    loginWithCredentials,
    syncState,
  } = useVictusCloud();

  const [activeTab, setActiveTab] = useState<'browser' | 'password'>('browser');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isAuthModalOpen) return null;

  const handleBrowserLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const ok = await loginWithBrowser();
      if (!ok) {
        setIsSubmitting(false);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Login failed.');
      setIsSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const ok = await loginWithCredentials(email.trim(), password);
      if (!ok) {
        setIsSubmitting(false);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Login failed.');
      setIsSubmitting(false);
    }
  };

  const handleOpenSignup = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal('https://victuscloud.com/free');
    } else {
      window.open('https://victuscloud.com/free', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-view-fade-in">
      <div className="w-full max-w-md bg-[#0d0e16] border border-white/15 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            if (!isSubmitting) setIsAuthModalOpen(false);
          }}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-2">
              <span>Connect Victus Cloud</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                SSO
              </span>
            </h2>
            <p className="text-xs text-white/50">{authPromptMessage}</p>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Tabs: Browser OAuth vs Email Password */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'browser'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Browser Login</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeTab === 'password'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email & Password</span>
          </button>
        </div>

        {/* Tab 1: Browser Login Flow */}
        {activeTab === 'browser' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 space-y-2">
              <div className="flex items-center space-x-2 text-purple-300 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Seamless Account Handshake</span>
              </div>
              <p className="leading-relaxed text-[11px] text-white/60">
                Clicking below opens <b>victuscloud.com</b> in your browser. Once signed in, you will be automatically returned to Victus Client and your free servers will synchronize instantly.
              </p>
            </div>

            <button
              onClick={handleBrowserLogin}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for Browser Return...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Login with Victus Cloud</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Tab 2: Direct Password Form */
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">Victus Cloud Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-white/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer: Create Free Account Link */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
          <span className="text-white/50">Don't have an account?</span>
          <button
            onClick={handleOpenSignup}
            className="text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>Create Free Server Account</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
