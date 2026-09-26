import React from 'react';
import { PlusCircle, Upload, PackagePlus, Sparkles, Terminal } from 'lucide-react';

interface QuickActionsProps {
  onOpenCreate: () => void;
  onOpenImport: () => void;
  setActiveTab: (tab: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenCreate,
  onOpenImport,
  setActiveTab,
}) => {
  const actions = [
    {
      title: 'Create Instance',
      desc: 'Set up a custom client',
      icon: PlusCircle,
      action: onOpenCreate,
      color: 'from-purple-500 to-indigo-600',
    },
    {
      title: 'Import Pack',
      desc: 'Zip, CurseForge, MRPack',
      icon: Upload,
      action: onOpenImport,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Install Mods',
      desc: 'Browse Modrinth directory',
      icon: PackagePlus,
      action: () => setActiveTab('contents'),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Manage Skins',
      desc: '3D model & capes',
      icon: Sparkles,
      action: () => setActiveTab('skins'),
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Open Console',
      desc: 'Live game logs & stats',
      icon: Terminal,
      action: () => setActiveTab('console'),
      color: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Quick Actions
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.action}
              className="flex items-center space-x-3 p-3 rounded-2xl glass-panel border border-white/5 hover:border-[var(--color-border-hover)] hover:bg-white/5 transition-all text-left group"
            >
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white group-hover:text-[var(--color-primary-light)] transition-colors truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                  {item.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
