import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Filter,
  Package,
  Layers,
  Sparkles,
  Check,
  Trash2,
  FolderOpen,
  CheckSquare,
  Square,
  ExternalLink,
  RefreshCw,
  Power,
  X,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { ContentCategory, ContentItem, InstalledModFile, Instance } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';

export const ContentsView: React.FC = () => {
  const { instances, activeInstance, setActiveInstance, addNotification, openFolder } = useLauncher();
  const [activeCategory, setActiveCategory] = useState<ContentCategory>('mods');
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'installed'>('browse');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledModFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'downloads' | 'relevance' | 'follows'>('downloads');
  const [strictVersionFilter, setStrictVersionFilter] = useState(true);
  const [instanceDropdownOpen, setInstanceDropdownOpen] = useState(false);
  const [installedSearch, setInstalledSearch] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstanceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories: { id: ContentCategory; label: string; icon: string }[] = [
    { id: 'mods', label: 'Mods', icon: '🧩' },
    { id: 'shaders', label: 'Shaders', icon: '✨' },
    { id: 'resourcepacks', label: 'Resource Packs', icon: '🎨' },
    { id: 'datapacks', label: 'Datapacks', icon: '⚡' },
    { id: 'modpacks', label: 'Modpacks', icon: '📦' },
  ];

  // Helper to map custom / launcher versions to real Mojang versions for Modrinth
  const resolveRealGameVersion = (version?: string): string => {
    if (!version) return '1.21.4';
    const v = version.trim();
    if (v.startsWith('26.') || v === '1.21.11' || v === '1.21.8' || v === '1.21') return '1.21.4';
    if (v === '1.20.8' || v === '1.20') return '1.20.4';
    if (v === '1.8') return '1.8.9';
    return v;
  };

  const currentRealVersion = resolveRealGameVersion(activeInstance?.version);
  const currentLoader = activeInstance?.loader && activeInstance.loader !== 'vanilla' ? activeInstance.loader : undefined;

  // Curated fallbacks across all categories
  const CURATED_FALLBACKS: Record<ContentCategory, ContentItem[]> = {
    mods: [
      {
        id: 'sodium',
        slug: 'sodium',
        title: 'Sodium',
        description: 'A modern, high-performance rendering engine and optimization mod for Minecraft.',
        author: 'jellysquid3',
        iconUrl: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
        categories: ['optimization'],
        downloads: 231000000,
        follows: 125000,
        loaders: ['fabric', 'neoforge'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'iris',
        slug: 'iris',
        title: 'Iris Shaders',
        description: 'A modern shaders mod for Minecraft compatible with existing OptiFine/Iris shader packs.',
        author: 'coderbot',
        iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
        categories: ['shaders', 'optimization'],
        downloads: 179000000,
        follows: 98000,
        loaders: ['fabric', 'neoforge'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'fabric-api',
        slug: 'fabric-api',
        title: 'Fabric API',
        description: 'Core essential hooks and inter-compatibility layer for the Fabric mod ecosystem.',
        author: 'modmuss50',
        iconUrl: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
        categories: ['library'],
        downloads: 261000000,
        follows: 240000,
        loaders: ['fabric'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'lithium',
        slug: 'lithium',
        title: 'Lithium',
        description: 'General-purpose physics, mob AI, and tick loop performance optimization mod.',
        author: 'jellysquid3',
        iconUrl: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png',
        categories: ['optimization'],
        downloads: 140000000,
        follows: 75000,
        loaders: ['fabric', 'neoforge'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'ferrite-core',
        slug: 'ferrite-core',
        title: 'FerriteCore',
        description: 'Memory usage optimizations reducing RAM consumption by up to 50%.',
        author: 'malte0811',
        iconUrl: 'https://cdn.modrinth.com/data/uXXizFIs/icon.png',
        categories: ['optimization'],
        downloads: 110000000,
        follows: 54000,
        loaders: ['fabric', 'forge', 'neoforge'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'modmenu',
        slug: 'modmenu',
        title: 'Mod Menu',
        description: 'Adds an in-game mod list screen and config manager to browse installed mods.',
        author: 'TerraformersMC',
        iconUrl: 'https://cdn.modrinth.com/data/mOgUt4GM/icon.png',
        categories: ['utility'],
        downloads: 185000000,
        follows: 112000,
        loaders: ['fabric'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'mods',
      },
    ],
    shaders: [
      {
        id: 'complementary-unbound',
        slug: 'complementary-unbound',
        title: 'Complementary Shaders - Unbound',
        description: 'A premium Minecraft shaderpack aiming for visual perfection with peak performance.',
        author: 'EminGT',
        iconUrl: 'https://cdn.modrinth.com/data/R2Fr3SZJ/icon.png',
        categories: ['realistic'],
        downloads: 62000000,
        follows: 51000,
        loaders: ['iris', 'optifine', 'canvas'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'complementary-reimagined',
        slug: 'complementary-reimagined',
        title: 'Complementary Shaders - Reimagined',
        description: 'Preserves the unique vanilla Minecraft aesthetic while adding stunning dynamic lighting.',
        author: 'EminGT',
        iconUrl: 'https://cdn.modrinth.com/data/1KVo5Edv/icon.png',
        categories: ['vanilla-like'],
        downloads: 48000000,
        follows: 42000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'bsl-shaders',
        slug: 'bsl-shaders',
        title: 'BSL Shaders',
        description: 'Customizable and high-FPS shaderpack with warm lighting, soft shadows, and volumetric clouds.',
        author: 'Capt_Tatsu',
        iconUrl: 'https://cdn.modrinth.com/data/Q1ZOzgcl/icon.png',
        categories: ['realistic'],
        downloads: 39000000,
        follows: 34000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
    ],
    resourcepacks: [
      {
        id: 'fresh-animations',
        slug: 'fresh-animations',
        title: 'Fresh Animations',
        description: 'Dynamic, expressive mob animations giving all Minecraft creatures life.',
        author: 'FreshLX',
        iconUrl: 'https://cdn.modrinth.com/data/8BmcYKbN/icon.png',
        categories: ['animation'],
        downloads: 51000000,
        follows: 62000,
        loaders: ['minecraft'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'bare-bones',
        slug: 'bare-bones',
        title: 'Bare Bones',
        description: 'Brings the official Minecraft animated promotional trailer look into your game.',
        author: 'RobotPantaloons',
        iconUrl: 'https://cdn.modrinth.com/data/P3fC8P1s/icon.png',
        categories: ['simplistic'],
        downloads: 28000000,
        follows: 38000,
        loaders: ['minecraft'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
    ],
    datapacks: [
      {
        id: 'terralith',
        slug: 'terralith',
        title: 'Terralith Overworld Overhaul',
        description: 'Massive world generation overhaul adding 100+ unique, stunning biomes to Minecraft.',
        author: 'Starmute',
        iconUrl: 'https://cdn.modrinth.com/data/8shDXydS/icon.png',
        categories: ['worldgen'],
        downloads: 32000000,
        follows: 31000,
        loaders: ['datapack'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'incendium',
        slug: 'incendium',
        title: 'Incendium Nether Expansion',
        description: 'Completely redesigns the Nether dimension with terrifying castles and new structures.',
        author: 'Starmute',
        iconUrl: 'https://cdn.modrinth.com/data/y2vY6Wd4/icon.png',
        categories: ['worldgen'],
        downloads: 18000000,
        follows: 19000,
        loaders: ['datapack'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
    ],
    modpacks: [
      {
        id: 'fabulously-optimized',
        slug: 'fabulously-optimized',
        title: 'Fabulously Optimized',
        description: 'A simple Fabric modpack that gives enormous FPS improvements and OptiFine feature parity.',
        author: 'RobotKoer',
        iconUrl: 'https://cdn.modrinth.com/data/1KVo5Edv/icon.png',
        categories: ['optimization'],
        downloads: 42000000,
        follows: 38000,
        loaders: ['fabric'],
        gameVersions: ['26.4', '26.3', '1.21.4', '1.20.4'],
        projectType: 'modpacks',
      },
    ],
  };

  const fetchContent = async (searchQuery: string, category: ContentCategory) => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.searchModrinth({
          query: searchQuery,
          category,
          loader: category === 'mods' && currentLoader ? currentLoader : undefined,
          gameVersion: strictVersionFilter ? currentRealVersion : undefined,
          limit: 30,
        });

        if (res && res.hits && res.hits.length > 0) {
          const mapped: ContentItem[] = res.hits.map((h: any) => ({
            id: h.project_id || h.slug,
            slug: h.slug,
            title: h.title,
            description: h.description,
            author: h.author,
            iconUrl: h.icon_url,
            categories: h.categories || [],
            downloads: h.downloads,
            follows: h.follows,
            loaders: h.loaders || [],
            gameVersions: h.game_versions || [],
            projectType: category,
          }));
          setItems(mapped);
          setLoading(false);
          return;
        }
      }

      // Fallback curated list
      const fallbackList = CURATED_FALLBACKS[category] || [];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const filtered = fallbackList.filter(
          (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
        );
        setItems(filtered);
      } else {
        setItems(fallbackList);
      }
    } catch (e) {
      console.warn('Modrinth fetch error, falling back:', e);
      const fallbackList = CURATED_FALLBACKS[category] || [];
      setItems(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(query, activeCategory);
  }, [activeCategory, activeInstance?.version, activeInstance?.loader, strictVersionFilter]);

  const loadInstalled = async () => {
    if (!activeInstance) return;
    if (window.electronAPI) {
      const list = await window.electronAPI.getInstalledContent(activeInstance.id, activeCategory);
      setInstalledMods(list || []);
    } else {
      // Mock installed for web preview
      setInstalledMods([
        { fileName: 'sodium-fabric-0.6.5+mc1.21.4.jar', name: 'Sodium', version: '0.6.5', enabled: true, size: 1450000 },
        { fileName: 'iris-fabric-1.8.2+mc1.21.4.jar', name: 'Iris Shaders', version: '1.8.2', enabled: true, size: 2800000 },
        { fileName: 'fabric-api-0.110.1+1.21.4.jar', name: 'Fabric API', version: '0.110.1', enabled: true, size: 2100000 },
      ]);
    }
  };

  useEffect(() => {
    loadInstalled();
  }, [activeCategory, activeInstance?.id]);

  // Check if an item is already installed in the active instance
  const isItemInstalled = (item: ContentItem): boolean => {
    const slug = (item.slug || '').toLowerCase();
    const title = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return installedMods.some((m) => {
      const fn = m.fileName.toLowerCase();
      const mn = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return fn.includes(slug) || mn.includes(title) || fn.includes(title);
    });
  };

  // Check if item claims compatibility with active instance version
  const isItemCompatible = (item: ContentItem): boolean => {
    if (!activeInstance) return true;
    const realVer = currentRealVersion;
    const hasVersionMatch =
      !item.gameVersions ||
      item.gameVersions.length === 0 ||
      item.gameVersions.some((gv) => {
        if (gv === activeInstance.version || gv === realVer) return true;
        if (realVer.startsWith('1.21') && gv.startsWith('1.21')) return true;
        if (realVer.startsWith('1.20') && gv.startsWith('1.20')) return true;
        return false;
      });

    if (activeCategory === 'mods' && currentLoader) {
      const hasLoaderMatch =
        !item.loaders ||
        item.loaders.length === 0 ||
        item.loaders.some((l) => l.toLowerCase() === currentLoader.toLowerCase());
      return hasVersionMatch && hasLoaderMatch;
    }

    return hasVersionMatch;
  };

  const handleInstallSingle = async (item: ContentItem) => {
    if (!activeInstance) {
      addNotification('warning', 'No Instance Selected', 'Please select or create an instance first.');
      return;
    }

    const realVer = currentRealVersion;
    const loader = currentLoader;

    setInstallingIds((prev) => new Set(prev).add(item.id));
    addNotification('info', 'Searching Release', `Locating compatible ${item.title} for ${activeInstance.name} (v${activeInstance.version})...`);

    try {
      if (window.electronAPI) {
        // Specifically query Modrinth for versions strictly matching this instance's loader and resolved Minecraft version!
        const versions = await window.electronAPI.getModrinthVersions(
          item.slug,
          activeCategory === 'mods' && loader ? [loader] : undefined,
          [realVer]
        );

        if (!versions || versions.length === 0) {
          throw new Error(
            `No compatible release of "${item.title}" found for Minecraft ${activeInstance.version} (${realVer})${
              loader ? ` with ${loader}` : ''
            }.`
          );
        }

        // Strictly match version supporting current game version
        const targetVersion =
          versions.find((v: any) => {
            const hasVer = v.game_versions && v.game_versions.some((gv: string) => {
              return gv === realVer || gv === activeInstance.version || (realVer.startsWith('1.21') && gv.startsWith('1.21'));
            });
            if (activeCategory === 'mods' && loader) {
              const hasLoader = v.loaders && v.loaders.map((l: string) => l.toLowerCase()).includes(loader.toLowerCase());
              return hasVer && hasLoader;
            }
            return hasVer;
          }) || versions[0];

        const primaryFile = targetVersion.files?.find((f: any) => f.primary) || targetVersion.files?.[0];
        if (!primaryFile) {
          throw new Error(`No downloadable file available for ${item.title} (${targetVersion.version_number}).`);
        }

        const res = await window.electronAPI.installContentFile({
          instanceId: activeInstance.id,
          category: activeCategory,
          fileUrl: primaryFile.url,
          fileName: primaryFile.filename,
          projectId: item.id,
          versionId: targetVersion.id,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to save downloaded file.');
        }

        addNotification('success', 'Installed Successfully', `${item.title} (${targetVersion.version_number}) installed to "${activeInstance.name}"!`);
        loadInstalled();
      } else {
        // Web simulation
        addNotification('success', 'Installed', `${item.title} installed for ${activeInstance.name}!`);
      }
    } catch (err: any) {
      addNotification('error', 'Installation Incompatible', err.message || `Could not install ${item.title}`);
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleInstallSelected = async () => {
    const list = items.filter((i) => selectedIds.has(i.id));
    for (const item of list) {
      await handleInstallSingle(item);
    }
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModState = async (mod: InstalledModFile) => {
    if (!activeInstance) return;
    if (window.electronAPI) {
      await window.electronAPI.toggleModFile(activeInstance.id, mod.fileName, !mod.enabled);
      loadInstalled();
    } else {
      setInstalledMods((prev) =>
        prev.map((m) => (m.fileName === mod.fileName ? { ...m, enabled: !m.enabled } : m))
      );
    }
    addNotification('info', 'File Updated', `${mod.name} is now ${!mod.enabled ? 'enabled' : 'disabled'}.`);
  };

  const deleteModFile = async (mod: InstalledModFile) => {
    if (!activeInstance) return;
    if (window.electronAPI) {
      await window.electronAPI.deleteContentFile(activeInstance.id, activeCategory, mod.fileName);
      loadInstalled();
    } else {
      setInstalledMods((prev) => prev.filter((m) => m.fileName !== mod.fileName));
    }
    addNotification('info', 'File Removed', `Deleted ${mod.name} from "${activeInstance.name}".`);
  };

  // Filtered and sorted items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'downloads') return b.downloads - a.downloads;
      if (sortBy === 'follows') return b.follows - a.follows;
      return 0; // relevance
    });
  }, [items, sortBy]);

  const filteredInstalledMods = useMemo(() => {
    if (!installedSearch.trim()) return installedMods;
    const q = installedSearch.toLowerCase();
    return installedMods.filter((m) => m.name.toLowerCase().includes(q) || m.fileName.toLowerCase().includes(q));
  }, [installedMods, installedSearch]);

  const totalInstalledSizeMB = useMemo(() => {
    const bytes = installedMods.reduce((acc, m) => acc + (m.size || 0), 0);
    return (bytes / 1024 / 1024).toFixed(1);
  }, [installedMods]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none">
      {/* Top Banner & Target Instance Capsule */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Official Modrinth Directory</span>
            <span className="text-white/20">•</span>
            <span className="text-purple-300">Targeted Multi-Loader Engine</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight flex items-center space-x-3">
            <span>Mods & Visual Customization</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Browse and install high-performance Fabric/Forge mods, shaders, and resource packs verified for your active instance.
          </p>
        </div>

        {/* Target Instance Picker Capsule */}
        <div className="flex items-center space-x-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setInstanceDropdownOpen(!instanceDropdownOpen)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-[#141624] border border-white/15 hover:border-white/30 shadow-md transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-[#1d2033] border border-white/10 flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                {activeInstance?.icon || '⚡'}
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 flex items-center space-x-1.5">
                  <span>Target Instance</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {activeInstance ? activeInstance.name : 'No Instance Selected'}
                </div>
              </div>
              <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/10 text-white/80">
                  {activeInstance?.version || '26.4'}
                </span>
                <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </div>
            </button>

            {/* Instance Switcher Dropdown */}
            {instanceDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#0e101a] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-2xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 py-1.5">
                  Select Target Instance
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {instances.map((inst) => {
                    const isSelected = activeInstance?.id === inst.id;
                    return (
                      <button
                        key={inst.id}
                        onClick={() => {
                          setActiveInstance(inst);
                          setInstanceDropdownOpen(false);
                          addNotification('info', 'Target Changed', `Now managing content for "${inst.name}"`);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-white/10 border border-white/20 text-white font-bold'
                            : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-base">{inst.icon || '⚡'}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{inst.name}</div>
                            <div className="text-[10px] text-white/40">
                              {inst.loader} • Minecraft {inst.version}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {activeInstance && (
            <button
              onClick={() => openFolder(activeInstance.id, activeCategory)}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shadow-sm"
              title="Open Content Folder in File Explorer"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs & Category Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setQuery('');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeCategory === cat.id
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-[#121422]/70 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {installedMods.length > 0 && activeCategory === cat.id && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === cat.id ? 'bg-black/15 text-black' : 'bg-white/20'}`}>
                  {installedMods.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View Switcher: Browse vs Installed */}
        <div className="flex items-center p-1 rounded-2xl bg-[#121422] border border-white/10 text-xs flex-shrink-0">
          <button
            onClick={() => setActiveSubTab('browse')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeSubTab === 'browse'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Browse Modrinth
          </button>
          <button
            onClick={() => setActiveSubTab('installed')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'installed'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>Installed</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {installedMods.length}
            </span>
          </button>
        </div>
      </div>

      {/* BROWSE SUB-TAB */}
      {activeSubTab === 'browse' ? (
        <div className="space-y-4">
          {/* Search Bar & Smart Filter Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0f111c]/80 border border-white/10 backdrop-blur-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder={`Search ${activeCategory} for Minecraft ${activeInstance?.version || '26.4'} (${currentRealVersion})...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchContent(query, activeCategory)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    fetchContent('', activeCategory);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/40 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Smart Version Lock Filter Indicator */}
            <button
              onClick={() => setStrictVersionFilter(!strictVersionFilter)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                strictVersionFilter
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="When enabled, only displays and downloads releases matching your selected instance version exactly"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="truncate">
                {strictVersionFilter
                  ? `Locked to ${activeInstance?.version || '26.4'} (${currentRealVersion})`
                  : 'All MC Versions'}
              </span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 hidden sm:inline">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
              >
                <option value="downloads">Most Downloads</option>
                <option value="relevance">Relevance</option>
                <option value="follows">Most Followed</option>
              </select>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleInstallSelected}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install ({selectedIds.size})</span>
                </button>
              )}

              <button
                onClick={() => fetchContent(query, activeCategory)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                title="Refresh Content"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-[#121422]/60 p-4 border border-white/5 min-h-[180px] flex flex-col justify-between animate-pulse"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 my-3">
                    <div className="h-3 bg-white/5 rounded w-full" />
                    <div className="h-3 bg-white/5 rounded w-4/5" />
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="h-3 bg-white/5 rounded w-24" />
                    <div className="h-8 bg-white/10 rounded-xl w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isInstalling = installingIds.has(item.id);
                const installed = isItemInstalled(item);
                const compatible = isItemCompatible(item);

                return (
                  <div
                    key={item.id}
                    className={`group rounded-2xl p-4 border transition-all flex flex-col justify-between min-h-[184px] backdrop-blur-xl ${
                      isSelected
                        ? 'border-white/30 bg-[#161828] shadow-md'
                        : 'bg-[#121422]/80 border-white/[0.08] hover:border-white/20 hover:bg-[#151726] hover:shadow-lg'
                    }`}
                  >
                    {/* Top Content */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-start space-x-3 overflow-hidden">
                          {item.iconUrl ? (
                            <img
                              src={item.iconUrl}
                              alt={item.title}
                              className="w-12 h-12 rounded-2xl object-cover bg-black/40 flex-shrink-0 border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center font-bold text-xl flex-shrink-0">
                              {item.title.charAt(0)}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <h3 className="font-bold text-sm text-white group-hover:text-white transition-colors truncate">
                              {item.title}
                            </h3>
                            <div className="text-[11px] text-white/50 truncate">
                              by <span className="text-white/80 font-medium">{item.author}</span>
                            </div>
                            {item.categories && item.categories.length > 0 && (
                              <div className="flex items-center space-x-1.5 mt-1 overflow-hidden">
                                {item.categories.slice(0, 2).map((cat) => (
                                  <span
                                    key={cat}
                                    className="px-1.5 py-0.2 rounded-md text-[9px] font-mono uppercase bg-white/5 text-white/60 border border-white/5 truncate"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Multi-Select Checkbox */}
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className="text-white/30 hover:text-white p-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed mb-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Compatibility & Install Deck */}
                    <div className="pt-3 border-t border-white/5 space-y-2.5">
                      {/* Compatibility indicator */}
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1.5">
                          {compatible ? (
                            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                              <span>Verified {activeInstance?.version || '26.4'}</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Check compatibility</span>
                            </span>
                          )}
                        </div>

                        <div className="text-white/40 font-mono">
                          {(item.downloads / 1000000).toFixed(1)}M dl
                        </div>
                      </div>

                      {/* Button Action */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40">
                          {activeInstance?.name || 'Instance'}
                        </span>

                        {installed ? (
                          <button
                            onClick={() => setActiveSubTab('installed')}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Installed</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInstallSingle(item)}
                            disabled={isInstalling}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md ${
                              isInstalling
                                ? 'bg-amber-600/70 text-white cursor-wait'
                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm hover:scale-[1.02] active:scale-95'
                            }`}
                          >
                            {isInstalling ? (
                              <>
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                <span>Installing</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Install ➔</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-3xl bg-[#121422]/60 border border-white/5 p-8 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                {categories.find((c) => c.id === activeCategory)?.icon || '🔍'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  No {categories.find((c) => c.id === activeCategory)?.label || 'content'} found
                </h3>
                <p className="text-xs text-white/50 max-w-sm mt-1">
                  {query
                    ? `No releases found matching "${query}" for Minecraft ${activeInstance?.version || '26.4'}. Try relaxing the version filter or search query.`
                    : `No items available for this selection.`}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {strictVersionFilter && (
                  <button
                    onClick={() => setStrictVersionFilter(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10"
                  >
                    Disable Version Lock
                  </button>
                )}
                <button
                  onClick={() => {
                    setQuery('');
                    fetchContent('', activeCategory);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15"
                >
                  Browse Popular {categories.find((c) => c.id === activeCategory)?.label}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INSTALLED SUB-TAB */
        <div className="space-y-4">
          {/* Header Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#121422]/80 border border-white/10 backdrop-blur-xl flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-white/40">Active Category</div>
                <div className="text-sm font-bold text-white capitalize">{activeCategory}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121422]/80 border border-white/10 backdrop-blur-xl flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-white/40">Installed Items</div>
                <div className="text-sm font-bold text-white">{installedMods.length} Files Active</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121422]/80 border border-white/10 backdrop-blur-xl flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-white/40">Total Disk Size</div>
                <div className="text-sm font-bold text-white">{totalInstalledSizeMB} MB</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#0f111c]/80 border border-white/10 backdrop-blur-xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Filter installed files..."
                value={installedSearch}
                onChange={(e) => setInstalledSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {installedSearch && (
                <button
                  onClick={() => setInstalledSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {activeInstance && (
                <button
                  onClick={() => openFolder(activeInstance.id, activeCategory)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white flex items-center space-x-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Directory</span>
                </button>
              )}
              <button
                onClick={loadInstalled}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                title="Refresh Installed"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Installed Items List */}
          {filteredInstalledMods.length > 0 ? (
            <div className="space-y-2">
              {filteredInstalledMods.map((mod) => (
                <div
                  key={mod.fileName}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all backdrop-blur-xl ${
                    mod.enabled
                      ? 'bg-[#121422]/90 border-white/10 hover:border-cyan-500/30'
                      : 'bg-[#0b0c14]/60 border-white/5 opacity-55'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        mod.enabled
                          ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                          : 'bg-neutral-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-bold text-xs text-white truncate flex items-center space-x-2">
                        <span>{mod.name}</span>
                        {mod.version && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/10 text-white/60">
                            v{mod.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-white/40 truncate mt-0.5">
                        {mod.fileName} • {(mod.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => toggleModState(mod)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                        mod.enabled
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                      }`}
                      title={mod.enabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{mod.enabled ? 'Enabled' : 'Disabled'}</span>
                    </button>
                    <button
                      onClick={() => deleteModFile(mod)}
                      className="p-2 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/30"
                      title="Delete File from Instance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 rounded-3xl bg-[#121422]/60 text-center flex flex-col items-center justify-center border border-dashed border-white/10 backdrop-blur-xl">
              <Package className="w-14 h-14 text-white/20 mb-3" />
              <h4 className="font-bold text-sm text-white">No Installed {activeCategory}</h4>
              <p className="text-xs text-white/50 mt-1 mb-5 max-w-sm">
                You haven't installed any {activeCategory} in "{activeInstance?.name || 'Selected Instance'}" yet.
              </p>
              <button
                onClick={() => setActiveSubTab('browse')}
                className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95"
              >
                Browse & Install Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
