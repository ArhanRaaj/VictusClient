import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { SplashScreen } from './components/layout/SplashScreen';
import { CommandPalette } from './components/layout/CommandPalette';
import { NotificationToast } from './components/layout/NotificationToast';
import { HomeView } from './components/home/HomeView';
import { InstancesView } from './components/instances/InstancesView';
import { ContentsView } from './components/contents/ContentsView';
import { SkinsView } from './components/skins/SkinsView';
import { ConsoleView } from './components/console/ConsoleView';
import { AccountsView } from './components/accounts/AccountsView';
import { ServersView } from './components/servers/ServersView';
import { SettingsView } from './components/settings/SettingsView';
import { InstanceWizardModal } from './components/instances/InstanceWizardModal';
import { InstanceEditModal } from './components/instances/InstanceEditModal';
import { VictusCloudAuthModal } from './components/cloud/VictusCloudAuthModal';
import { WebControlPanelModal } from './components/cloud/WebControlPanelModal';
import { Instance } from './types/launcher';
import { useTheme } from './context/ThemeContext';
import { ParticleBackground } from './components/layout/ParticleBackground';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const { theme } = useTheme();

  // Global Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#0a0a0c] border border-white/[0.06] rounded-[20px] text-[#f3f4f6] overflow-hidden font-sans select-none shadow-2xl">
      {/* Boot Splash Screen */}
      {loading && <SplashScreen onComplete={() => setLoading(false)} />}

      {/* Pure Matte Black Base & Optional User Custom Wallpaper */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[#0a0a0c]">
        {/* Optional Custom User Wallpaper (if set in Settings) */}
        {theme.customBackgroundUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${theme.customBackgroundUrl})`,
              opacity: theme.customBackgroundOpacity || 0.35,
              filter: `blur(${Math.max(0, (theme.blurIntensity || 20) - 10)}px)`,
            }}
          />
        )}

        {/* Interactive Cursor-Attracted Particles */}
        <ParticleBackground />
      </div>

      {/* Frameless Desktop Title Bar with 3 macOS-style Circles (Gray, Green, Red) */}
      <TitleBar
        onOpenSearch={() => setIsSearchOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Launcher Body: Slim Left Symbol-Only Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10 pb-1">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* View Switcher Container with Smooth Fluid Animations */}
        <main
          key={activeTab}
          className="flex-1 flex flex-col overflow-hidden relative animate-view-fade-in"
        >
          {activeTab === 'home' && (
            <HomeView
              setActiveTab={setActiveTab}
              onOpenCreateModal={() => setIsCreateOpen(true)}
              onOpenImportModal={() => setIsCreateOpen(true)}
              onEditInstance={(inst) => setEditingInstance(inst)}
            />
          )}

          {activeTab === 'instances' && (
            <InstancesView
              setActiveTab={setActiveTab}
              onOpenCreate={() => setIsCreateOpen(true)}
              isCreateOpen={isCreateOpen}
              setIsCreateOpen={setIsCreateOpen}
            />
          )}

          {activeTab === 'servers' && <ServersView setActiveTab={setActiveTab} />}

          {activeTab === 'contents' && <ContentsView />}

          {activeTab === 'skins' && <SkinsView />}

          {activeTab === 'console' && <ConsoleView />}

          {activeTab === 'accounts' && <AccountsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      {/* Global Create Instance Modal */}
      <InstanceWizardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Global Edit Instance Modal */}
      <InstanceEditModal
        instance={editingInstance}
        isOpen={!!editingInstance}
        onClose={() => setEditingInstance(null)}
      />

      {/* Victus Cloud Bridge Authentication Modal */}
      <VictusCloudAuthModal />

      {/* Victus Cloud Web Control Panel Modal */}
      <WebControlPanelModal />

      {/* Global Notification Toast Container */}
      <NotificationToast />
    </div>
  );
};
export default App;
