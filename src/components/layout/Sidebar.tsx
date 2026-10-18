import React from 'react';
import {
  Home,
  Folder,
  Package,
  Server,
  Shirt,
  Terminal,
  Users,
  Settings,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { theme } = useTheme();
  const accentColor = theme.primaryAccent || '#9333ea';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'instances', label: 'Instances', icon: Folder },
    { id: 'contents', label: 'Mods & Content', icon: Package },
    { id: 'servers', label: 'Free Servers', icon: Server },
    { id: 'skins', label: 'Skin & Cape', icon: Shirt },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'accounts', label: 'Accounts', icon: Users },
  ];

  return (
    <aside className="w-[72px] h-full py-3 pl-3 pr-1 select-none flex flex-col items-center z-40">
      {/* Premium Architectural Matte Obsidian Sidebar Chassis */}
      <div className="w-full h-full rounded-[22px] py-3 px-1.5 flex flex-col justify-between items-center relative transition-colors duration-200 bg-[#0b0c12] border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Top Navigation Items */}
        <div className="flex flex-col space-y-2 w-full items-center relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group flex items-center justify-center w-full">
                {/* Crisp Left Active Pill Indicator */}
                {isActive && (
                  <div
                    className="absolute -left-1.5 w-1 h-5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 0 8px ${accentColor}`,
                    }}
                  />
                )}

                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-label={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer relative ${
                    isActive
                      ? 'bg-white/[0.12] border border-white/[0.18] text-white shadow-sm'
                      : 'text-white/45 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] active:scale-95'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] transition-transform duration-150" />
                </button>

                {/* Sleek Minimalist Tooltip */}
                <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#141622] border border-white/12 text-[11px] font-medium text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-[-4px] group-hover:translate-x-0 z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Pinned Settings Section */}
        <div className="w-full flex flex-col items-center relative z-10 pt-2">
          {/* Hairline Divider */}
          <div className="w-6 h-[1px] mb-2.5 bg-white/[0.08]" />

          <div className="relative group flex items-center justify-center w-full">
            {activeTab === 'settings' && (
              <div
                className="absolute -left-1.5 w-1 h-5 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 8px ${accentColor}`,
                }}
              />
            )}

            <button
              onClick={() => setActiveTab('settings')}
              aria-label="Settings"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer relative ${
                activeTab === 'settings'
                  ? 'bg-white/[0.12] border border-white/[0.18] text-white shadow-sm'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] active:scale-95'
              }`}
            >
              <Settings
                className={`w-[18px] h-[18px] transition-transform duration-300 ${
                  activeTab === 'settings' ? 'text-white' : 'group-hover:rotate-45'
                }`}
              />
            </button>

            {/* Sleek Minimalist Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#141622] border border-white/12 text-[11px] font-medium text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-[-4px] group-hover:translate-x-0 z-50">
              Settings
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
