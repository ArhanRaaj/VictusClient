import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useLauncher, LauncherNotification } from '../../context/LauncherContext';

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useLauncher();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none select-none">
      {notifications.map((notif) => {
        let Icon = Info;
        let borderClass = 'border-blue-500/30';
        let bgGlow = 'rgba(59, 130, 246, 0.2)';
        let textClass = 'text-blue-400';

        if (notif.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-emerald-500/40';
          bgGlow = 'rgba(16, 185, 129, 0.2)';
          textClass = 'text-emerald-400';
        } else if (notif.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-amber-500/40';
          bgGlow = 'rgba(245, 158, 11, 0.2)';
          textClass = 'text-amber-400';
        } else if (notif.type === 'error') {
          Icon = XCircle;
          borderClass = 'border-rose-500/40';
          bgGlow = 'rgba(244, 63, 94, 0.2)';
          textClass = 'text-rose-400';
        }

        return (
          <div
            key={notif.id}
            style={{ boxShadow: `0 8px 24px -4px ${bgGlow}` }}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl bg-[#141624]/90 backdrop-blur-xl border ${borderClass} shadow-2xl transition-all duration-300 animate-slide-in`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textClass}`} />
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-bold text-white tracking-wide">{notif.title}</h4>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                {notif.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-white/40 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
