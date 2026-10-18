import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { FeaturedInstanceCard } from './FeaturedInstanceCard';
import { InstanceMiniCard } from './InstanceMiniCard';
import { QuickActions } from './QuickActions';
import { NewsFeed } from './NewsFeed';
import { Instance } from '../../types/launcher';
import { Plus, ArrowRight, Upload, FolderPlus } from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onEditInstance: (instance: Instance) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  setActiveTab,
  onOpenCreateModal,
  onOpenImportModal,
  onEditInstance,
}) => {
  const { activeAccount, activeInstance, setActiveInstance, instances } = useLauncher();

  // Filter instances excluding current active instance
  const otherInstances = instances.filter((i) => i.id !== activeInstance?.id);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 select-none">
      {/* Top Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Welcome back, {activeAccount?.username || 'VictusHero'}
          </h1>
          <p className="text-xs text-white/50 mt-0.5 font-sans">
            Ready to launch your customized Minecraft environment
          </p>
        </div>

        {/* Top Quick Actions & Status Strip */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0e1017] border border-white/[0.08] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-white/80 font-medium">Ready</span>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Create New Instance Profile"
          >
            <Plus className="w-3.5 h-3.5 text-white/80" />
            <span>New Profile</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Import Modpack or Zip"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Featured Primary Instance Card */}
      {activeInstance && (
        <FeaturedInstanceCard
          instance={activeInstance}
          onEdit={onEditInstance}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Profile Roster Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">
              Instance Profiles
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/70 font-mono font-semibold border border-white/[0.06]">
              {instances.length}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('instances')}
            className="text-xs font-medium text-white/60 hover:text-white flex items-center space-x-1 transition-colors"
          >
            <span>Manage All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Profile Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {otherInstances.slice(0, 3).map((inst) => (
            <InstanceMiniCard
              key={inst.id}
              instance={inst}
              isActive={inst.id === activeInstance?.id}
              onSelect={() => setActiveInstance(inst)}
              onEdit={onEditInstance}
            />
          ))}

          {/* Dotted Minimalist "Add New Profile" Card */}
          <div
            onClick={onOpenCreateModal}
            className="rounded-2xl bg-[#0b0c12]/60 hover:bg-[#11131c] p-4 min-h-[145px] flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-white/30 text-center cursor-pointer transition-all duration-150 group shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center mb-2 transition-colors">
              <FolderPlus className="w-4 h-4 text-white/60 group-hover:text-white" />
            </div>
            <span className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
              Add Profile
            </span>
            <span className="text-[10px] text-white/40 font-mono mt-0.5">
              Install new Minecraft version
            </span>
          </div>
        </div>
      </div>

      {/* Ecosystem & Quick Tools Strip */}
      <QuickActions
        onOpenCreate={onOpenCreateModal}
        onOpenImport={onOpenImportModal}
        setActiveTab={setActiveTab}
      />

      {/* Release Notes & Highlights */}
      <NewsFeed />
    </div>
  );
};

export default HomeView;
