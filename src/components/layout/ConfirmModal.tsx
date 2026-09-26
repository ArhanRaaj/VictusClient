import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300 select-none animate-fade-in">
      <div className="w-full max-w-md rounded-[24px] bg-[#141624] border border-white/12 shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-6 relative animate-modal-spring">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${
              isDestructive ? 'bg-rose-500/20 text-rose-400' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-6">{message}</p>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[0_0_15px_var(--color-glow)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
