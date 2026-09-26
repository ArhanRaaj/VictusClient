import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { FeaturedInstanceCard } from './FeaturedInstanceCard';
import { Instance } from '../../types/launcher';
import { Play, Plus, ArrowRight, Sparkles, Package, Shirt, DownloadCloud } from 'lucide-react';
import { DEFAULT_WALLPAPER } from '../../constants/wallpapers';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onEditInstance: (instance: Instance) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  setActiveTab,
  onOpenCreateModal,
  onEditInstance,
}) => {
  const { activeAccount, activeInstance, setActiveInstance, instances, launchInstance } = useLauncher();

  // Get other instances/profiles of the user
  const otherInstances = instances.filter((i) => i.id !== activeInstance?.id);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6 select-none flex flex-col justify-between">
      {/* Top Greeting Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Welcome, <span className="bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">{activeAccount?.username || 'VictusHero'}</span>!
          </h1>
          <p className="text-sm text-white/70 mt-0.5 font-sans font-medium">
            Launch into your customized Minecraft environment
          </p>
        </div>

        {/* Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#111116] border border-white/[0.06] shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-mono text-white/90 font-semibold tracking-wide">
            Ready to Play
          </span>
        </div>
      </div>

      {/* Featured Hero Instance Card */}
      {activeInstance && (
        <FeaturedInstanceCard
          instance={activeInstance}
          onEdit={onEditInstance}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Bottom Row: Your Profiles (No duplicate placeholder junk) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              Your Profiles
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16161d] text-purple-300 font-mono font-bold border border-white/[0.06] shadow-sm">
              {instances.length}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('instances')}
            className="text-xs font-semibold text-purple-300 hover:text-white flex items-center space-x-1 transition-colors"
          >
            <span>Manage All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* If user has other profiles, show them cleanly + ONE Create card */}
        {otherInstances.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherInstances.slice(0, 3).map((inst) => (
              <div
                key={inst.id}
                onClick={() => setActiveInstance(inst)}
                className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col justify-between cursor-pointer border border-white/[0.06] hover:border-purple-400/60 hover:scale-[1.02] transition-all relative overflow-hidden group shadow-lg"
              >
                {/* Wallpaper */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-all duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${
                      (!inst.background || inst.background.includes('unsplash.com'))
                        ? DEFAULT_WALLPAPER
                        : inst.background
                    })`,
                  }}
                />
                {/* Dark gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/65 to-transparent" />

                <div className="relative z-10">
                  <h4 className="font-bold text-sm text-white truncate drop-shadow">{inst.name}</h4>
                  <span className="text-[10px] text-white/70 font-mono">
                    {inst.version} • {inst.loader}
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-1.5 border-t border-white/10">
                  <span className="text-[9px] font-semibold text-white/50 uppercase tracking-wider">
                    Profile
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      launchInstance(inst.id);
                    }}
                    className="p-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-all shadow-md group-hover:scale-110"
                    title="Launch profile"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            ))}

            {/* Exactly ONE New Profile Slot */}
            <div
              onClick={onOpenCreateModal}
              className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col items-center justify-center border border-dashed border-white/15 text-center text-white/60 hover:text-white hover:border-purple-400 hover:bg-white/5 cursor-pointer transition-all group shadow-md"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center mb-1.5 group-hover:scale-110 group-hover:bg-purple-500/25 transition-all">
                <Plus className="w-3.5 h-3.5 text-white/70 group-hover:text-purple-300" />
              </div>
              <span className="text-xs font-bold text-white/80">Add Profile</span>
              <span className="text-[9px] text-white/40 font-mono mt-0.5">New Instance</span>
            </div>
          </div>
        ) : (
          /* When only 1 instance exists: Show 4 rich, distinct, actionable exploration cards */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Action 1: Create New Profile */}
            <div
              onClick={onOpenCreateModal}
              className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-purple-400 hover:scale-[1.02] transition-all group shadow-md"
            >
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center group-hover:scale-110 transition-all">
                <Plus className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Create Profile</h4>
                <p className="text-[10px] text-white/50">Install new MC version</p>
              </div>
            </div>

            {/* Action 2: Explore Modpacks */}
            <div
              onClick={() => setActiveTab('contents')}
              className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-cyan-400 hover:scale-[1.02] transition-all group shadow-md"
            >
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center group-hover:scale-110 transition-all">
                <Package className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Explore Modpacks</h4>
                <p className="text-[10px] text-white/50">Browse Modrinth catalog</p>
              </div>
            </div>

            {/* Action 3: Character Wardrobe */}
            <div
              onClick={() => setActiveTab('skins')}
              className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-pink-400 hover:scale-[1.02] transition-all group shadow-md"
            >
              <div className="w-7 h-7 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center group-hover:scale-110 transition-all">
                <Shirt className="w-4 h-4 text-pink-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Skin Wardrobe</h4>
                <p className="text-[10px] text-white/50">Customize 3D character</p>
              </div>
            </div>

            {/* Action 4: All Instances */}
            <div
              onClick={() => setActiveTab('instances')}
              className="rounded-[22px] glass-panel p-3.5 h-28 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-emerald-400 hover:scale-[1.02] transition-all group shadow-md"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center group-hover:scale-110 transition-all">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Manage Profiles</h4>
                <p className="text-[10px] text-white/50">Configure RAM & files</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default HomeView;
