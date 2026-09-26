import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  Layers,
  Package,
  Terminal,
  Settings,
  Sparkles,
  Users,
  Palette,
  FolderOpen,
  Server,
  X,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveTab,
  onOpenCreateModal,
}) => {
  const { instances, activeInstance, launchInstance, openFolder } = useLauncher();
  const { applyPreset } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or trigger
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultCommands: CommandItem[] = [
    ...(activeInstance
      ? [
          {
            id: 'launch-active',
            title: `Launch ${activeInstance.name} (${activeInstance.version})`,
            category: 'Action',
            icon: Play,
            action: () => {
              launchInstance(activeInstance.id);
              onClose();
            },
          },
          {
            id: 'open-active-folder',
            title: `Open Folder: ${activeInstance.name}`,
            category: 'Instance',
            icon: FolderOpen,
            action: () => {
              openFolder(activeInstance.id);
              onClose();
            },
          },
        ]
      : []),
    {
      id: 'create-instance',
      title: 'Create New Instance Wizard',
      category: 'Action',
      icon: Layers,
      action: () => {
        onOpenCreateModal();
        onClose();
      },
    },
    {
      id: 'nav-instances',
      title: 'Go to Instances',
      category: 'Navigation',
      icon: Layers,
      action: () => {
        setActiveTab('instances');
        onClose();
      },
    },
    {
      id: 'nav-servers',
      title: 'Go to Free Cloud Servers (Deploy & Manage)',
      category: 'Navigation',
      icon: Server,
      action: () => {
        setActiveTab('servers');
        onClose();
      },
    },
    {
      id: 'nav-contents',
      title: 'Browse Mods, Shaders & Resource Packs',
      category: 'Navigation',
      icon: Package,
      action: () => {
        setActiveTab('contents');
        onClose();
      },
    },
    {
      id: 'nav-skins',
      title: 'Open Skin & Cape Customizer',
      category: 'Navigation',
      icon: Sparkles,
      action: () => {
        setActiveTab('skins');
        onClose();
      },
    },
    {
      id: 'nav-console',
      title: 'Open Minecraft Console',
      category: 'Navigation',
      icon: Terminal,
      action: () => {
        setActiveTab('console');
        onClose();
      },
    },
    {
      id: 'nav-accounts',
      title: 'Manage Minecraft Accounts',
      category: 'Navigation',
      icon: Users,
      action: () => {
        setActiveTab('accounts');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      title: 'Launcher Settings & Customization',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        setActiveTab('settings');
        onClose();
      },
    },
    // Theme presets
    ...Object.keys(THEME_PRESETS).map((preset) => ({
      id: `theme-${preset}`,
      title: `Switch Theme to ${preset}`,
      category: 'Themes',
      icon: Palette,
      action: () => {
        applyPreset(preset);
        onClose();
      },
    })),
    // Instances list
    ...instances.map((inst) => ({
      id: `inst-${inst.id}`,
      title: `Instance: ${inst.name} [${inst.loader} ${inst.version}]`,
      category: 'Instances',
      icon: Layers,
      action: () => {
        setActiveTab('instances');
        onClose();
      },
    })),
  ];

  const filtered = defaultCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-sm px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[24px] bg-[#141624] border border-white/12 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-modal-spring relative"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search className="w-5 h-5 text-[var(--color-primary-light)] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, instance name, mod, or theme..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/40 hover:text-white mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
              No matching commands or instances found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-gradient-to-r from-[var(--color-primary)]/40 to-transparent text-white border-l-2 border-[var(--color-primary-light)]'
                      : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-[0_0_10px_var(--color-glow)]'
                          : 'bg-white/5 text-white/70'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate font-medium">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/5 text-white/40">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>esc Dismiss</span>
          </div>
          <span className="font-semibold text-[var(--color-primary-light)]">VictusCommand</span>
        </div>
      </div>
    </div>
  );
};
