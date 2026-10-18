import React from 'react';
import { Plus, Upload, Package, Shirt, Terminal, Server } from 'lucide-react';

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
      title: 'New Profile',
      desc: 'Custom MC instance',
      icon: Plus,
      action: onOpenCreate,
    },
    {
      title: 'Import Pack',
      desc: 'Zip or CurseForge',
      icon: Upload,
      action: onOpenImport,
    },
    {
      title: 'Mods & Shaders',
      desc: 'Modrinth catalog',
      icon: Package,
      action: () => setActiveTab('contents'),
    },
    {
      title: 'Cloud Servers',
      desc: 'Free server hosting',
      icon: Server,
      action: () => setActiveTab('servers'),
    },
    {
      title: 'Skin Wardrobe',
      desc: '3D avatars & capes',
      icon: Shirt,
      action: () => setActiveTab('skins'),
    },
    {
      title: 'Live Console',
      desc: 'Game logs & debug',
      icon: Terminal,
      action: () => setActiveTab('console'),
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">
          Ecosystem & Tools
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.action}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-[#0e1017] hover:bg-[#12141e] border border-white/[0.07] hover:border-white/18 transition-all duration-150 text-left group cursor-pointer shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] group-hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/70 group-hover:text-white transition-colors shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-white/40 truncate font-mono">
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

export default QuickActions;
