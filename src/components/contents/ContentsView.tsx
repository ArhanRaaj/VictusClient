import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ContentCategory, ContentItem, InstalledModFile } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';

export const ContentsView: React.FC = () => {
  const { activeInstance, addNotification, openFolder } = useLauncher();
  const [activeCategory, setActiveCategory] = useState<ContentCategory>('mods');
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'installed'>('browse');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [installedMods, setInstalledMods] = useState<InstalledModFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  const categories: { id: ContentCategory; label: string; icon: string }[] = [
    { id: 'mods', label: 'Mods', icon: '🧩' },
    { id: 'shaders', label: 'Shaders', icon: '✨' },
    { id: 'resourcepacks', label: 'Resource Packs', icon: '🎨' },
    { id: 'modpacks', label: 'Modpacks', icon: '📦' },
    { id: 'datapacks', label: 'Datapacks', icon: '⚡' },
  ];

  // Curated fallbacks for instant instant browsing across all categories
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
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'iris',
        slug: 'iris',
        title: 'Iris Shaders',
        description: 'A modern shaders mod for Minecraft compatible with existing Shaders Presets.',
        author: 'coderbot',
        iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
        categories: ['shaders', 'optimization'],
        downloads: 179000000,
        follows: 98000,
        loaders: ['fabric', 'neoforge'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'fabric-api',
        slug: 'fabric-api',
        title: 'Fabric API',
        description: 'Core essential hooks and inter-compatibility layer for Fabric mod ecosystem.',
        author: 'modmuss50',
        iconUrl: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
        categories: ['library'],
        downloads: 261000000,
        follows: 240000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
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
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'ferrite-core',
        slug: 'ferrite-core',
        title: 'FerriteCore',
        description: 'Memory usage optimizations drastically reducing Minecraft RAM allocation requirements.',
        author: 'malte0811',
        iconUrl: 'https://cdn.modrinth.com/data/uXXizFIs/icon.png',
        categories: ['optimization'],
        downloads: 130000000,
        follows: 62000,
        loaders: ['fabric', 'neoforge', 'forge'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'mods',
      },
      {
        id: 'modmenu',
        slug: 'modmenu',
        title: 'Mod Menu',
        description: 'Adds a sleek in-game mod list screen to view configured and installed mods.',
        author: 'TerraformersMC',
        iconUrl: 'https://cdn.modrinth.com/data/mOgUt4GM/icon.png',
        categories: ['utility'],
        downloads: 115000000,
        follows: 88000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'mods',
      },
    ],
    shaders: [
      {
        id: 'complementary-reimagined',
        slug: 'complementary-reimagined',
        title: 'Complementary Shaders - Reimagined',
        description: 'Exceptional visual polish with custom water, clouds, god rays, and high performance.',
        author: 'EminGT',
        iconUrl: 'https://cdn.modrinth.com/data/R2Fr3SZJ/icon.png',
        categories: ['realistic', 'fantasy'],
        downloads: 67200000,
        follows: 85000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'complementary-unbound',
        slug: 'complementary-unbound',
        title: 'Complementary Shaders - Unbound',
        description: 'Stunning artistic lighting, atmospheric scattering, aurora borealis, and deep reflections.',
        author: 'EminGT',
        iconUrl: 'https://cdn.modrinth.com/data/1KVo5Edv/icon.png',
        categories: ['realistic', 'fantasy'],
        downloads: 43800000,
        follows: 62000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'bsl-shaders',
        slug: 'bsl-shaders',
        title: 'BSL Shaders',
        description: 'Bright, colorful, and distinct visual style with customizable real-time shadows.',
        author: 'CaptTatsu',
        iconUrl: 'https://cdn.modrinth.com/data/Q1ZOzgcl/icon.png',
        categories: ['realistic'],
        downloads: 29500000,
        follows: 51000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'photon-shaders',
        slug: 'photon-shaders',
        title: 'Photon Shaders',
        description: 'Cutting edge shader pack balancing cinematic fidelity and gameplay smoothness.',
        author: 'sixthsurge',
        iconUrl: 'https://cdn.modrinth.com/data/m1k5tB1Z/icon.png',
        categories: ['realistic', 'cinematic'],
        downloads: 27000000,
        follows: 44000,
        loaders: ['iris'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'solas-shader',
        slug: 'solas-shader',
        title: 'Solas Shader',
        description: 'Fantasy volumetric clouds, 3D aurora, colored lighting, and hyper-optimized performance.',
        author: 'Septonious',
        iconUrl: 'https://cdn.modrinth.com/data/HjW3o9K2/icon.png',
        categories: ['fantasy', 'vibrant'],
        downloads: 17200000,
        follows: 33000,
        loaders: ['iris'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
      {
        id: 'makeup-ultra-fast',
        slug: 'makeup-ultra-fast',
        title: 'MakeUp - Ultra Fast',
        description: 'Modular, ultra-lightweight shader pack designed for maximum FPS on all hardware.',
        author: 'XorDev',
        iconUrl: 'https://cdn.modrinth.com/data/mH4t3p8X/icon.png',
        categories: ['performance', 'minimal'],
        downloads: 12400000,
        follows: 28000,
        loaders: ['iris', 'optifine'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'shaders',
      },
    ],
    resourcepacks: [
      {
        id: 'fresh-animations',
        slug: 'fresh-animations',
        title: 'Fresh Animations',
        description: 'Dynamic mob animations giving Minecraft mobs expressive faces and natural movement.',
        author: 'FreshLX',
        iconUrl: 'https://cdn.modrinth.com/data/8BmcYKbN/icon.png',
        categories: ['animations', 'mobs'],
        downloads: 47700000,
        follows: 62000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'bare-bones',
        slug: 'bare-bones',
        title: 'Bare Bones',
        description: 'A texture pack bringing your world and default textures to clean, vibrant simplified art.',
        author: 'RobotPantaloons',
        iconUrl: 'https://cdn.modrinth.com/data/P3fC8P1s/icon.png',
        categories: ['stylized', 'simplistic'],
        downloads: 22100000,
        follows: 41000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'better-leaves',
        slug: 'better-leaves',
        title: "Motschen's Better Leaves",
        description: 'Round, fluffy 3D leaf models that transform Minecraft forests into dense wilderness.',
        author: 'Motschen',
        iconUrl: 'https://cdn.modrinth.com/data/qF1aWwE6/icon.png',
        categories: ['3d', 'environment'],
        downloads: 20200000,
        follows: 38000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'faithful-32x',
        slug: 'faithful-32x',
        title: 'Faithful 32x',
        description: 'The definitive high-resolution vanilla enhancement pack staying true to original art.',
        author: 'FaithfulTeam',
        iconUrl: 'https://cdn.modrinth.com/data/I13tqy5r/icon.png',
        categories: ['vanilla-plus', '32x'],
        downloads: 18400000,
        follows: 35000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'faithless',
        slug: 'faithless',
        title: 'Faithless',
        description: 'Beautifully crafted RPG visual overhaul with custom icons, armor, and UI elements.',
        author: 'ItsHardSole',
        iconUrl: 'https://cdn.modrinth.com/data/b822d64d/icon.png',
        categories: ['rpg', 'medieval'],
        downloads: 11200000,
        follows: 29000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
      {
        id: 'stay-true',
        slug: 'stay-true',
        title: 'Stay True',
        description: 'Subtle vanilla texture improvements, connected textures, and natural block color variations.',
        author: 'Trislux',
        iconUrl: 'https://cdn.modrinth.com/data/4t8a644c/icon.png',
        categories: ['vanilla-plus'],
        downloads: 14500000,
        follows: 26000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'resourcepacks',
      },
    ],
    datapacks: [
      {
        id: 'terralith',
        slug: 'terralith',
        title: 'Terralith',
        description: 'Transforms overworld world generation with nearly 100 brand-new, jaw-dropping biomes.',
        author: 'Starmute',
        iconUrl: 'https://cdn.modrinth.com/data/8shDXydS/icon.png',
        categories: ['worldgen'],
        downloads: 23200000,
        follows: 45000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'dungeons-and-taverns',
        slug: 'dungeons-and-taverns',
        title: 'Dungeons and Taverns',
        description: 'Generates sprawling underground dungeons, taverns, fortresses, and challenging arenas.',
        author: 'NovaWostra',
        iconUrl: 'https://cdn.modrinth.com/data/y2vY6Wd4/icon.png',
        categories: ['structures', 'adventure'],
        downloads: 21200000,
        follows: 39000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'towns-and-towers',
        slug: 'towns-and-towers',
        title: 'Towns and Towers',
        description: 'Extensive overhaul of villages, pillager outposts, and oceanic ships matching biome themes.',
        author: 'Biban_Auriu',
        iconUrl: 'https://cdn.modrinth.com/data/CV2A0Jc8/icon.png',
        categories: ['structures'],
        downloads: 17700000,
        follows: 31000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'incendium',
        slug: 'incendium',
        title: 'Incendium',
        description: 'Nether expansion with 8 new biomes, volcanic spires, ruined castles, and Sanctum of Fire.',
        author: 'Starmute',
        iconUrl: 'https://cdn.modrinth.com/data/vSEH1erm/icon.png',
        categories: ['worldgen', 'nether'],
        downloads: 14200000,
        follows: 27000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'nullscape',
        slug: 'nullscape',
        title: 'Nullscape',
        description: 'Rewrites the End dimension with verticality, crystalline biomes, and eerie alien atmospheres.',
        author: 'Starmute',
        iconUrl: 'https://cdn.modrinth.com/data/LPjGiSO4/icon.png',
        categories: ['worldgen', 'end'],
        downloads: 11800000,
        follows: 22000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
      {
        id: 'veinminer',
        slug: 'veinminer',
        title: 'VeinMiner',
        description: 'Fast, comfortable mining tool enabling one-click mining of entire ore veins and trees.',
        author: 'Miraculixx',
        iconUrl: 'https://cdn.modrinth.com/data/Wb5oqrNJ/icon.png',
        categories: ['utility', 'gameplay'],
        downloads: 86300000,
        follows: 19000,
        loaders: ['all'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'datapacks',
      },
    ],
    modpacks: [
      {
        id: 'fabulously-optimized',
        slug: 'fabulously-optimized',
        title: 'Fabulously Optimized',
        description: 'Top-tier Fabric modpack delivering OptiFine feature parity and massive FPS boosts.',
        author: 'robotkoer',
        iconUrl: 'https://cdn.modrinth.com/data/1KVo5Edv/icon.png',
        categories: ['optimization'],
        downloads: 17600000,
        follows: 48000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'modpacks',
      },
      {
        id: 'better-mc',
        slug: 'better-mc',
        title: 'Better MC [Fabric] - BMC2',
        description: 'The ultimate Minecraft overhaul featuring bosses, dungeons, dimensions, and quests.',
        author: 'SHXRKIE',
        iconUrl: 'https://cdn.modrinth.com/data/2X54e59f/icon.png',
        categories: ['adventure', 'quests'],
        downloads: 3500000,
        follows: 25000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'modpacks',
      },
      {
        id: 'cobblemon-official',
        slug: 'cobblemon-official',
        title: 'Cobblemon Official Modpack',
        description: 'Open-world Pokémon adventure modpack with seamless Minecraft battle animations.',
        author: 'CobbledStudios',
        iconUrl: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
        categories: ['adventure', 'gameplay'],
        downloads: 10800000,
        follows: 34000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'modpacks',
      },
      {
        id: 'simply-optimized',
        slug: 'simply-optimized',
        title: 'Simply Optimized',
        description: 'A pure, lightweight performance modpack focused on maximizing Minecraft framerates.',
        author: 'SimplyTeam',
        iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
        categories: ['optimization'],
        downloads: 8200000,
        follows: 21000,
        loaders: ['fabric'],
        gameVersions: ['1.21.4', '1.20.4'],
        projectType: 'modpacks',
      },
    ],
  };

  // Fetch from Modrinth API or fallback to curated list
  const fetchContent = async (searchQuery = query, category = activeCategory) => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.searchModrinth({
          query: searchQuery,
          category,
          loader: category === 'mods' && activeInstance?.loader !== 'vanilla' ? activeInstance?.loader : undefined,
          gameVersion: activeInstance?.version,
          limit: 24,
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

      // Fallback to rich curated preset if API returned 0 hits or offline
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
  }, [activeCategory]);

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
    if (activeSubTab === 'installed') {
      loadInstalled();
    }
  }, [activeSubTab, activeCategory, activeInstance]);

  const handleInstallSingle = async (item: ContentItem) => {
    if (!activeInstance) {
      addNotification('warning', 'No Instance Selected', 'Please select or create an instance first.');
      return;
    }

    setInstallingIds((prev) => new Set(prev).add(item.id));
    addNotification('info', 'Downloading', `Installing ${item.title} to "${activeInstance.name}"...`);

    try {
      if (window.electronAPI) {
        // Fetch latest version from Modrinth
        const versions = await window.electronAPI.getModrinthVersions(
          item.slug,
          activeCategory === 'mods' && activeInstance.loader !== 'vanilla' ? [activeInstance.loader] : undefined,
          activeInstance.version.startsWith('26.') ? undefined : [activeInstance.version]
        );
        if (versions && versions.length > 0) {
          const primaryFile = versions[0].files?.find((f: any) => f.primary) || versions[0].files[0];
          if (primaryFile) {
            await window.electronAPI.installContentFile({
              instanceId: activeInstance.id,
              category: activeCategory,
              fileUrl: primaryFile.url,
              fileName: primaryFile.filename,
              projectId: item.id,
              versionId: versions[0].id,
            });
          }
        }
      }
      setTimeout(() => {
        setInstallingIds((prev) => {
          const n = new Set(prev);
          n.delete(item.id);
          return n;
        });
        addNotification('success', 'Installed', `${item.title} installed successfully!`);
      }, 1200);
    } catch (e) {
      setInstallingIds((prev) => {
        const n = new Set(prev);
        n.delete(item.id);
        return n;
      });
      addNotification('error', 'Installation Failed', `Could not install ${item.title}`);
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
    addNotification('info', 'Mod Updated', `${mod.name} is now ${!mod.enabled ? 'enabled' : 'disabled'}.`);
  };

  const deleteModFile = async (mod: InstalledModFile) => {
    if (!activeInstance) return;
    if (window.electronAPI) {
      await window.electronAPI.deleteContentFile(activeInstance.id, activeCategory, mod.fileName);
      loadInstalled();
    } else {
      setInstalledMods((prev) => prev.filter((m) => m.fileName !== mod.fileName));
    }
    addNotification('info', 'File Deleted', `Removed ${mod.name} from instance.`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2 text-[var(--color-primary-light)] text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Content Directory</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Mods & Content Manager
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Active Instance:{' '}
            <span className="font-bold text-white">
              {activeInstance?.name || 'None Selected'} ({activeInstance?.loader} {activeInstance?.version})
            </span>
          </p>
        </div>

        {/* Action Tabs: Browse vs Installed */}
        <div className="flex items-center space-x-2">
          <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => setActiveSubTab('browse')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                activeSubTab === 'browse'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Browse Modrinth
            </button>
            <button
              onClick={() => setActiveSubTab('installed')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeSubTab === 'installed'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              <span>Installed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {installedMods.length}
              </span>
            </button>
          </div>

          {activeInstance && (
            <button
              onClick={() => openFolder(activeInstance.id, activeCategory)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all"
              title="Open Category Folder in Windows Explorer"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (MODS, SHADERS, RESOURCE PACKS, MODPACKS, DATAPACKS) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setQuery('');
              fetchContent('', cat.id);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white border-[var(--color-primary-light)] shadow-[0_0_15px_var(--color-glow)]'
                : 'bg-white/5 border-white/5 text-[var(--color-text-muted)] hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* BROWSE SUB-TAB */}
      {activeSubTab === 'browse' ? (
        <div className="space-y-4">
          {/* Search Bar + Multi-select Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder={`Search ${activeCategory} on Modrinth...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchContent(query, activeCategory)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
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

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleInstallSelected}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_var(--color-glow)] flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                onClick={() => fetchContent(query, activeCategory)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
                title="Refresh Content"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Items Grid / Loading Skeletons / Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl glass-panel p-4 border border-white/5 min-h-[170px] flex flex-col justify-between animate-pulse"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-1.5 my-3">
                    <div className="h-3 bg-white/5 rounded w-full" />
                    <div className="h-3 bg-white/5 rounded w-4/5" />
                  </div>
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="h-3 bg-white/5 rounded w-20" />
                    <div className="h-7 bg-white/10 rounded-xl w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isInstalling = installingIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`group rounded-2xl glass-panel p-4 border transition-all flex flex-col justify-between min-h-[170px] ${
                    isSelected
                      ? 'border-[var(--color-primary-light)] bg-[var(--color-primary)]/10 shadow-[0_0_15px_var(--color-glow)]'
                      : 'border-white/5 hover:border-[var(--color-border-hover)] hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-start space-x-3 overflow-hidden">
                        {item.iconUrl ? (
                          <img
                            src={item.iconUrl}
                            alt={item.title}
                            className="w-11 h-11 rounded-xl object-cover bg-black/40 flex-shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {item.title.charAt(0)}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-sm text-white group-hover:text-[var(--color-primary-light)] transition-colors truncate">
                            {item.title}
                          </h3>
                          <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                            by <span className="text-white/80 font-medium">{item.author}</span>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox for multi-select */}
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="text-white/40 hover:text-white p-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[var(--color-primary-light)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom Stats & Install Button */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 text-[var(--color-text-muted)]">
                      <span>{(item.downloads / 1000).toFixed(0)}k dl</span>
                      <span>•</span>
                      <span>{item.follows} ♥</span>
                    </div>

                    <button
                      onClick={() => handleInstallSingle(item)}
                      disabled={isInstalling}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm ${
                        isInstalling
                          ? 'bg-amber-600/60 text-white cursor-wait'
                          : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white hover:shadow-[0_0_12px_var(--color-glow)]'
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
                          <span>Install</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 glass-panel rounded-2xl border border-white/5 p-8">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                {categories.find((c) => c.id === activeCategory)?.icon || '🔍'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  No {categories.find((c) => c.id === activeCategory)?.label || 'content'} found
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm mt-1">
                  {query
                    ? `No results found matching "${query}". Try searching with different keywords.`
                    : `No items available for this selection.`}
                </p>
              </div>
              <button
                onClick={() => {
                  setQuery('');
                  fetchContent('', activeCategory);
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition-all shadow-[0_0_15px_var(--color-glow)]"
              >
                Browse Popular {categories.find((c) => c.id === activeCategory)?.label}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* INSTALLED SUB-TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Installed files in {activeInstance?.name || 'Selected Instance'}
            </h3>
            <button
              onClick={loadInstalled}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {installedMods.length > 0 ? (
            <div className="space-y-2">
              {installedMods.map((mod) => (
                <div
                  key={mod.fileName}
                  className={`flex items-center justify-between p-3.5 rounded-2xl glass-panel border transition-all ${
                    mod.enabled ? 'border-white/10' : 'border-white/5 opacity-50 bg-black/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        mod.enabled ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-bold text-xs text-white truncate">{mod.name}</div>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">
                        {mod.fileName} ({(mod.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleModState(mod)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                        mod.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                      }`}
                      title={mod.enabled ? 'Disable Mod' : 'Enable Mod'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{mod.enabled ? 'Enabled' : 'Disabled'}</span>
                    </button>
                    <button
                      onClick={() => deleteModFile(mod)}
                      className="p-1.5 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
                      title="Delete Mod File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 rounded-3xl glass-panel text-center flex flex-col items-center justify-center border border-dashed border-white/10">
              <Package className="w-12 h-12 text-white/20 mb-3" />
              <h4 className="font-bold text-sm text-white">No Installed {activeCategory}</h4>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">
                You haven't installed any {activeCategory} in "{activeInstance?.name}" yet.
              </p>
              <button
                onClick={() => setActiveSubTab('browse')}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider"
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
