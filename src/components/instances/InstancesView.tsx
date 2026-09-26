import React, { useState } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { InstanceCard } from './InstanceCard';
import { InstanceWizardModal } from './InstanceWizardModal';
import { InstanceEditModal } from './InstanceEditModal';
import { ConfirmModal } from '../layout/ConfirmModal';
import { Instance } from '../../types/launcher';
import { Plus } from 'lucide-react';

interface InstancesViewProps {
  setActiveTab: (tab: string) => void;
  onOpenCreate: () => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
}

export const InstancesView: React.FC<InstancesViewProps> = ({
  setActiveTab,
  isCreateOpen,
  setIsCreateOpen,
}) => {
  const { instances, activeInstance, setActiveInstance, deleteInstance } = useLauncher();
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [deletingInstance, setDeletingInstance] = useState<Instance | null>(null);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5 select-none flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight drop-shadow-sm">
            Instances
          </h1>
          <p className="text-sm text-white/70 mt-0.5 font-sans font-medium">
            Manage your Minecraft installations, versions, and modpacks
          </p>
        </div>

        {/* Top-Right Create Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="glass-launch-btn px-6 py-2.5 rounded-full flex items-center space-x-2.5 cursor-pointer shadow-xl hover:scale-105 transition-all"
        >
          <span className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-white">
            <Plus className="w-3 h-3 stroke-[3]" />
          </span>
          <span className="text-sm font-black text-black uppercase tracking-wider">Create</span>
        </button>
      </div>

      {/* Responsive Grid with ALL instances + exactly ONE '+ Add Instance' card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-5 flex-1">
        {instances.map((instance) => (
          <InstanceCard
            key={instance.id}
            instance={instance}
            isSelected={instance.id === activeInstance?.id}
            onSelect={() => setActiveInstance(instance)}
            onEdit={() => setEditingInstance(instance)}
            onOpenContents={() => {
              setActiveInstance(instance);
              setActiveTab('contents');
            }}
            onDeleteRequest={() => setDeletingInstance(instance)}
          />
        ))}

        {/* Exactly ONE New Instance Card at end of list */}
        <div
          onClick={() => setIsCreateOpen(true)}
          className="rounded-[28px] glass-panel border border-dashed border-white/15 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all min-h-[220px] group shadow-lg"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-500/20 group-hover:border-purple-400 transition-all">
            <Plus className="w-6 h-6 text-white/60 group-hover:text-purple-300" />
          </div>
          <h3 className="font-bold text-white text-base">New Instance</h3>
          <span className="text-xs text-white/50 font-medium mt-1">
            Install another version, Fabric, Forge, or NeoForge
          </span>
        </div>
      </div>

      {/* Modals */}
      <InstanceWizardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <InstanceEditModal
        instance={editingInstance}
        isOpen={!!editingInstance}
        onClose={() => setEditingInstance(null)}
      />

      <ConfirmModal
        isOpen={!!deletingInstance}
        title="Delete Instance?"
        message={`Are you sure you want to delete "${deletingInstance?.name}"? All mods, saves, and world data will be permanently removed.`}
        confirmText="Delete"
        onConfirm={() => {
          if (deletingInstance) {
            deleteInstance(deletingInstance.id);
            setDeletingInstance(null);
          }
        }}
        onCancel={() => setDeletingInstance(null)}
      />
    </div>
  );
};
export default InstancesView;
