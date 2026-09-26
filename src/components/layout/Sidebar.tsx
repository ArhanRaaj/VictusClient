import React from 'react';
import {
  Home,
  Folder,
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
  const sidebarColor = theme.sidebarColor || theme.primaryAccent || '#7c3aed';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'instances', label: 'Instances', icon: Folder },
    { id: 'servers', label: 'Free Servers', icon: Server },
    { id: 'skins', label: 'Skin & Cape', icon: Shirt },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'accounts', label: 'Accounts', icon: Users },
  ];

  return (
    <aside className="w-18 h-full py-2.5 pl-3.5 pr-1 select-none flex flex-col items-center z-40">
      {/* Sleek Obsidian Glass Floating Capsule with Ambient Glow */}
      <div
        className="w-full h-full rounded-[28px] p-2 flex flex-col justify-between items-center relative transition-all duration-300 backdrop-blur-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${sidebarColor} 12%, #0e1017) 0%, #0a0b10 50%, color-mix(in srgb, ${sidebarColor} 8%, #090a0e) 100%)`,
          border: `1.5px solid color-mix(in srgb, ${sidebarColor} 30%, rgba(255, 255, 255, 0.12))`,
          boxShadow: `0 0 35px color-mix(in srgb, ${sidebarColor} 20%, transparent), 0 16px 40px rgba(0, 0, 0, 0.75), inset 0 1px 1.5px rgba(255, 255, 255, 0.18)`,
        }}
      >
        {/* Subtle Top Ambient Crest Glow in User Chosen Color */}
        <div
          className="absolute top-0 inset-x-0 h-24 rounded-t-[28px] pointer-events-none opacity-30 blur-sm"
          style={{
            background: `radial-gradient(ellipse at top, ${sidebarColor} 0%, transparent 75%)`,
          }}
        />

        {/* Top Nav Buttons (Icons with Active Glow & Floating Tooltip) */}
        <div className="flex flex-col space-y-3 w-full items-center relative z-10 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group flex items-center justify-center w-full">
                {/* Discord/Linear-style Left Pill Indicator */}
                {isActive && (
                  <div
                    className="absolute -left-2 w-1.5 h-6 rounded-r-full transition-all duration-300 animate-pulse"
                    style={{
                      backgroundColor: sidebarColor,
                      boxShadow: `0 0 12px ${sidebarColor}, 0 0 24px ${sidebarColor}`,
                    }}
                  />
                )}

                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-label={item.label}
                  className={`w-11 h-11 rounded-[18px] flex items-center justify-center transition-all duration-200 cursor-pointer relative ${
                    isActive
                      ? 'scale-105 shadow-lg'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] text-white/60 hover:text-white border border-white/[0.05] hover:border-white/20 hover:scale-105 active:scale-95'
                  }`}
                  style={
                    isActive
                      ? {
                          background: `color-mix(in srgb, ${sidebarColor} 24%, rgba(255, 255, 255, 0.08))`,
                          border: `1.5px solid color-mix(in srgb, ${sidebarColor} 65%, white)`,
                          boxShadow: `0 0 20px color-mix(in srgb, ${sidebarColor} 45%, transparent), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)`,
                        }
                      : undefined
                  }
                >
                  <Icon
                    className="w-5 h-5 transition-transform duration-200"
                    style={
                      isActive
                        ? {
                            color: '#ffffff',
                            filter: `drop-shadow(0 0 8px ${sidebarColor})`,
                          }
                        : undefined
                    }
                  />
                </button>

                {/* Sleek Floating Hover Tooltip */}
                <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-[#0f1017]/95 border border-white/15 text-[11px] font-semibold text-white whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-6px] group-hover:translate-x-0 z-50 backdrop-blur-md">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Pinned Setting Section */}
        <div className="w-full flex flex-col items-center pb-1 relative z-10">
          {/* Subtle Hairline Divider */}
          <div
            className="w-7 h-[1px] mb-3 rounded-full opacity-40"
            style={{
              backgroundColor: `color-mix(in srgb, ${sidebarColor} 40%, rgba(255, 255, 255, 0.15))`,
            }}
          />

          <div className="relative group flex items-center justify-center w-full">
            {activeTab === 'settings' && (
              <div
                className="absolute -left-2 w-1.5 h-6 rounded-r-full transition-all duration-300 animate-pulse"
                style={{
                  backgroundColor: sidebarColor,
                  boxShadow: `0 0 12px ${sidebarColor}, 0 0 24px ${sidebarColor}`,
                }}
              />
            )}

            <button
              onClick={() => setActiveTab('settings')}
              aria-label="Settings"
              className={`w-11 h-11 rounded-[18px] flex items-center justify-center transition-all duration-200 cursor-pointer relative ${
                activeTab === 'settings'
                  ? 'scale-105 shadow-lg'
                  : 'bg-white/[0.04] hover:bg-white/[0.09] text-white/60 hover:text-white border border-white/[0.05] hover:border-white/20 hover:scale-105 active:scale-95'
              }`}
              style={
                activeTab === 'settings'
                  ? {
                      background: `color-mix(in srgb, ${sidebarColor} 24%, rgba(255, 255, 255, 0.08))`,
                      border: `1.5px solid color-mix(in srgb, ${sidebarColor} 65%, white)`,
                      boxShadow: `0 0 20px color-mix(in srgb, ${sidebarColor} 45%, transparent), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)`,
                    }
                  : undefined
              }
            >
              <Settings
                className={`w-5 h-5 transition-transform duration-300 ${
                  activeTab === 'settings'
                    ? 'text-white'
                    : 'group-hover:rotate-45'
                }`}
                style={
                  activeTab === 'settings'
                    ? {
                        color: '#ffffff',
                        filter: `drop-shadow(0 0 8px ${sidebarColor})`,
                      }
                    : undefined
                }
              />
            </button>

            {/* Sleek Floating Hover Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-[#0f1017]/95 border border-white/15 text-[11px] font-semibold text-white whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-6px] group-hover:translate-x-0 z-50 backdrop-blur-md">
              Settings
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
