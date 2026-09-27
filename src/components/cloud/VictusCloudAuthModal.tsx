import React, { useState } from 'react';
import {
  X,
  Globe,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
  ExternalLink,
  Shield,
  KeyRound,
  Check,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { useVictusCloud } from '../../context/VictusCloudContext';

export const VictusCloudAuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authPromptMessage,
    activeLinkCode,
    activeLinkUrl,
    cancelBrowserAuth,
    loginWithBrowser,
    loginWithCredentials,
  } = useVictusCloud();

  const [activeTab, setActiveTab] = useState<'browser' | 'password'>('browser');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleCancelBrowser = () => {
    cancelBrowserAuth();
    setIsSubmitting(false);
    setErrorMessage('');
  };

  const handleReopenBrowser = () => {
    const url =
      activeLinkUrl ||
      (activeLinkCode
        ? `https://victuscloud.com/mc-link?code=${activeLinkCode}`
        : 'https://victuscloud.com/login');
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCopyCode = () => {
    if (!activeLinkCode) return;
    navigator.clipboard.writeText(activeLinkCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
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

  const handleClose = () => {
    if (activeLinkCode || isSubmitting) {
      cancelBrowserAuth();
      setIsSubmitting(false);
    }
    setIsAuthModalOpen(false);
  };

  const isBrowserWaiting = Boolean(activeLinkCode || (isSubmitting && activeTab === 'browser'));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-view-fade-in select-none">
      <div className="w-full max-w-md bg-[#0c0d16] border border-white/15 rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-black text-xl text-white tracking-tight">
                Victus Cloud
              </h2>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20">
                victuscloud.com
              </span>
            </div>
            <p className="text-xs text-white/50">
              Free Server Hosting & Coin Synchronization
            </p>
          </div>
        </div>

        {/* Context / Reason Notice */}
        <div className="my-3.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-400/20 text-xs text-purple-200/90 leading-relaxed flex items-start space-x-2.5">
          <Shield className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Account Linking</span>
            <span className="text-purple-200/70 text-[11px]">{authPromptMessage}</span>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Tab Switcher: Browser & Passkey vs Direct Email/Password */}
        {!isBrowserWaiting && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-4">
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
              <span>Browser & Passkey</span>
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
              <span>Direct Sign In</span>
            </button>
          </div>
        )}

        {/* Tab 1: Browser & Passkey Modal Flow */}
        {activeTab === 'browser' ? (
          isBrowserWaiting ? (
            /* Active Waiting State in Browser */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-3">
                <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Waiting for browser authorization...</span>
                </div>

                <p className="text-[11px] text-white/70 leading-relaxed">
                  We opened your default browser (Chrome, Edge, etc.) so you can sign in with your native{' '}
                  <span className="text-purple-300 font-bold">Passkey / Windows Hello</span>, Google Account, or saved session.
                </p>

                {activeLinkCode && (
                  <div className="mt-2 p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 block uppercase tracking-wider font-mono">
                        Verification Code
                      </span>
                      <span className="font-mono font-black text-lg tracking-widest text-cyan-300">
                        {activeLinkCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-white/50 space-y-1 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Step 1: Sign in on victuscloud.com in your browser.</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Step 2: Click <strong>"Link These Accounts"</strong> on the web page.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleReopenBrowser}
                  className="flex-1 py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Reopen Browser Tab</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelBrowser}
                  className="py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Idle Browser Flow */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 space-y-2.5">
                <div className="flex items-center space-x-2 text-purple-300 font-bold">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>External Browser Authentication</span>
                </div>
                <p className="leading-relaxed text-[11px] text-white/60">
                  Opens victuscloud.com directly in your default browser. Supports hardware Passkeys (Windows Hello, Touch ID), Google Accounts, and saved sessions.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-purple-200/80 flex items-center space-x-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Passkeys & Biometrics</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-purple-200/80 flex items-center space-x-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Instant Link-Back</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBrowserLogin}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-50 active:scale-98"
              >
                <Globe className="w-4 h-4" />
                <span>Login with Victus Cloud</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          /* Tab 2: Direct Password Form */
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">
                Victus Cloud Email
              </label>
              <div className="flex items-center rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus-within:border-purple-400 transition-colors">
                <Mail className="w-3.5 h-3.5 text-white/40 mr-2 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  disabled={isSubmitting}
                  className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 block mb-1">Password</label>
              <div className="flex items-center rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus-within:border-purple-400 transition-colors">
                <Lock className="w-3.5 h-3.5 text-white/40 mr-2 shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Victus Cloud</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer: Create Free Account Link */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
          <span className="text-white/50">Need a Victus Cloud account?</span>
          <button
            onClick={handleBrowserLogin}
            className="text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>Create Free Account & Server</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

