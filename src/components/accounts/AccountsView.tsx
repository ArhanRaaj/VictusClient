import React, { useState } from 'react';
import {
  Users,
  Plus,
  CheckCircle2,
  Trash2,
  Key,
  ShieldCheck,
  User,
  ExternalLink,
  Laptop,
  Check,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { Account } from '../../types/launcher';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    activeAccount,
    switchAccount,
    deleteAccount,
    createOfflineAccount,
    startMicrosoftLogin,
    addNotification,
  } = useLauncher();

  const [showAddModal, setShowAddModal] = useState(false);
  const [offlineName, setOfflineName] = useState('');
  const [loginMode, setLoginMode] = useState<'microsoft' | 'offline'>('offline');
  const [deviceFlowData, setDeviceFlowData] = useState<{ userCode?: string; verificationUri?: string } | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleCreateOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineName.trim()) return;
    await createOfflineAccount(offlineName.trim());
    setOfflineName('');
    setShowAddModal(false);
  };

  const handleStartMicrosoft = async () => {
    setLoggingIn(true);
    try {
      const res = await startMicrosoftLogin();
      if (res.userCode && res.verificationUri) {
        setDeviceFlowData({ userCode: res.userCode, verificationUri: res.verificationUri });
      }
    } catch (e) {
      addNotification('error', 'Login Error', 'Failed to initialize Microsoft login.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2 text-[var(--color-primary-light)] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Profile Authentication</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Account Manager
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Manage your Microsoft and offline Minecraft player profiles
          </p>
        </div>

        {/* Add Account Button */}
        <button
          onClick={() => {
            setShowAddModal(true);
            setDeviceFlowData(null);
          }}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_var(--color-glow)] hover:shadow-[0_0_30px_var(--color-glow)] hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const isActive = acc.id === activeAccount?.id;
          return (
            <div
              key={acc.id}
              onClick={() => switchAccount(acc.id)}
              className={`rounded-3xl glass-panel p-5 border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                isActive
                  ? 'border-[var(--color-primary-light)] bg-[var(--color-primary)]/10 shadow-[0_0_20px_var(--color-glow)] scale-[1.01]'
                  : 'border-white/5 hover:border-[var(--color-border-hover)] hover:bg-white/[0.02]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={acc.avatarUrl || `https://mc-heads.net/avatar/${acc.username}/64`}
                    alt={acc.username}
                    className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://mc-heads.net/avatar/steve/64';
                    }}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-white">{acc.username}</h3>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] truncate max-w-[200px] block">
                      UUID: {acc.uuid}
                    </span>
                  </div>
                </div>

                {/* Account Type Badge */}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    acc.type === 'microsoft'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {acc.type}
                </span>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {isActive ? (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Profile</span>
                    </span>
                  ) : (
                    'Click to switch'
                  )}
                </span>

                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  {!isActive && (
                    <button
                      onClick={() => switchAccount(acc.id)}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors"
                    >
                      Use Profile
                    </button>
                  )}
                  {accounts.length > 1 && (
                    <button
                      onClick={() => deleteAccount(acc.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
                      title="Remove Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-md rounded-3xl glass-panel bg-[#121424] border border-[var(--color-border)] shadow-2xl p-6 relative">
            <h2 className="font-display font-bold text-lg text-white mb-1">Add Minecraft Account</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              Choose Microsoft OAuth or quick offline account
            </p>

            {/* Toggle Modes */}
            <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 text-xs mb-5">
              <button
                onClick={() => setLoginMode('offline')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  loginMode === 'offline'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                Offline / Dev Profile
              </button>
              <button
                onClick={() => setLoginMode('microsoft')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  loginMode === 'microsoft'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                Microsoft Login
              </button>
            </div>

            {/* OFFLINE FORM */}
            {loginMode === 'offline' ? (
              <form onSubmit={handleCreateOffline} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Player Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VictusKnight, EnderPro"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_var(--color-glow)]"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            ) : (
              /* MICROSOFT OAUTH FLOW */
              <div className="space-y-4">
                {deviceFlowData ? (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-3">
                    <p className="text-xs text-white/80">
                      Visit the link below and enter this authorization code:
                    </p>
                    <div className="font-mono text-xl font-black text-[var(--color-primary-light)] tracking-widest bg-white/5 py-2 rounded-xl border border-white/10">
                      {deviceFlowData.userCode}
                    </div>
                    <a
                      href={deviceFlowData.verificationUri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
                    >
                      <span>Open Microsoft Login Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                      <Key className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                      Sign in with your official Mojang / Microsoft account to access official multiplayer servers and your skins.
                    </p>
                    <button
                      onClick={handleStartMicrosoft}
                      disabled={loggingIn}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>{loggingIn ? 'Connecting...' : 'Sign in with Microsoft'}</span>
                    </button>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
