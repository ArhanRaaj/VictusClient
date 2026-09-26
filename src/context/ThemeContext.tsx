import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig } from '../types/launcher';

export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
  'Victus Purple': {
    preset: 'Victus Purple',
    primaryAccent: '#9333ea',
    primaryHover: '#a855f7',
    primaryLight: '#c084fc',
    secondaryAccent: '#3b82f6',
    sidebarColor: '#7c3aed',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#111116',
    borderColor: 'rgba(147, 51, 234, 0.28)',
    textColor: '#f3f4f6',
    textMutedColor: '#9ca3af',
  },
  'Midnight Blue': {
    preset: 'Midnight Blue',
    primaryAccent: '#2563eb',
    primaryHover: '#3b82f6',
    primaryLight: '#60a5fa',
    secondaryAccent: '#06b6d4',
    sidebarColor: '#1d4ed8',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#10141e',
    borderColor: 'rgba(37, 99, 235, 0.28)',
    textColor: '#f1f5f9',
    textMutedColor: '#94a3b8',
  },
  'Crimson': {
    preset: 'Crimson',
    primaryAccent: '#e11d48',
    primaryHover: '#f43f5e',
    primaryLight: '#fb7185',
    secondaryAccent: '#f97316',
    sidebarColor: '#be123c',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#181014',
    borderColor: 'rgba(225, 29, 72, 0.28)',
    textColor: '#fff1f2',
    textMutedColor: '#fda4af',
  },
  'Emerald': {
    preset: 'Emerald',
    primaryAccent: '#059669',
    primaryHover: '#10b981',
    primaryLight: '#34d399',
    secondaryAccent: '#06b6d4',
    sidebarColor: '#047857',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#0c1611',
    borderColor: 'rgba(5, 150, 105, 0.28)',
    textColor: '#ecfdf5',
    textMutedColor: '#6ee7b7',
  },
  'Cyan': {
    preset: 'Cyan',
    primaryAccent: '#0891b2',
    primaryHover: '#06b6d4',
    primaryLight: '#22d3ee',
    secondaryAccent: '#6366f1',
    sidebarColor: '#0e7490',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#0d161a',
    borderColor: 'rgba(8, 145, 178, 0.28)',
    textColor: '#ecfeff',
    textMutedColor: '#67e8f9',
  },
  'Sunset': {
    preset: 'Sunset',
    primaryAccent: '#f59e0b',
    primaryHover: '#fbbf24',
    primaryLight: '#fcd34d',
    secondaryAccent: '#f43f5e',
    sidebarColor: '#c2410c',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#17120e',
    borderColor: 'rgba(245, 158, 11, 0.28)',
    textColor: '#fffbeb',
    textMutedColor: '#fde68a',
  },
  'Monochrome': {
    preset: 'Monochrome',
    primaryAccent: '#e5e7eb',
    primaryHover: '#f3f4f6',
    primaryLight: '#ffffff',
    secondaryAccent: '#9ca3af',
    sidebarColor: '#27272a',
    backgroundColor: '#0a0a0c',
    surfaceColor: '#141416',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#f9fafb',
    textMutedColor: '#a1a1aa',
  },
};

export const DEFAULT_THEME: ThemeConfig = {
  preset: 'Victus Purple',
  primaryAccent: '#9333ea',
  primaryHover: '#a855f7',
  primaryLight: '#c084fc',
  secondaryAccent: '#3b82f6',
  sidebarColor: '#7c3aed',
  backgroundColor: '#0a0a0c',
  surfaceColor: '#111116',
  cardTransparency: 1.0,
  windowTransparency: 1.0,
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderOpacity: 0.06,
  textColor: '#f3f4f6',
  textMutedColor: '#9ca3af',
  glowIntensity: 0.35,
  blurIntensity: 0,
  glassmorphismEnabled: false,
  reducedMotion: false,
  particlesEnabled: true,
  customBackgroundUrl: '',
  customBackgroundOpacity: 0.4,
};

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
  applyPreset: (presetName: string) => void;
  updateThemeProperty: <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('victus_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.glassmorphismEnabled = false;
        parsed.cardTransparency = 1.0;
        parsed.windowTransparency = 1.0;
        return { ...DEFAULT_THEME, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    try {
      localStorage.setItem('victus_theme', JSON.stringify(theme));
    } catch (e) {}

    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--color-bg', theme.backgroundColor);
    root.style.setProperty('--color-surface', theme.surfaceColor);
    root.style.setProperty('--color-primary', theme.primaryAccent);
    root.style.setProperty('--color-primary-hover', theme.primaryHover || theme.primaryAccent);
    root.style.setProperty('--color-primary-light', theme.primaryLight || theme.primaryAccent);
    root.style.setProperty('--color-secondary', theme.secondaryAccent);
    root.style.setProperty('--color-sidebar', theme.sidebarColor || theme.primaryAccent);
    root.style.setProperty('--color-text', theme.textColor);
    root.style.setProperty('--color-text-muted', theme.textMutedColor);

    // RGB helpers for window & card surfaces
    const wr = parseInt((theme.backgroundColor || '#0e1017').slice(1, 3), 16) || 14;
    const wg = parseInt((theme.backgroundColor || '#0e1017').slice(3, 5), 16) || 16;
    const wb = parseInt((theme.backgroundColor || '#0e1017').slice(5, 7), 16) || 23;

    const cr = parseInt((theme.surfaceColor || '#12141c').slice(1, 3), 16) || 18;
    const cg = parseInt((theme.surfaceColor || '#12141c').slice(3, 5), 16) || 20;
    const cb = parseInt((theme.surfaceColor || '#12141c').slice(5, 7), 16) || 28;

    if (theme.glassmorphismEnabled) {
      const winAlpha = theme.windowTransparency ?? 0.32;
      const cardAlpha = theme.cardTransparency ?? 0.38;
      const modalAlpha = Math.min(0.85, cardAlpha + 0.24);

      root.style.setProperty('--color-window-bg', `rgba(${wr}, ${wg}, ${wb}, ${winAlpha})`);
      root.style.setProperty('--color-card', `rgba(${cr}, ${cg}, ${cb}, ${cardAlpha})`);
      root.style.setProperty('--color-modal-bg', `rgba(${cr}, ${cg}, ${cb}, ${modalAlpha})`);
      root.style.setProperty('--glass-blur', `${theme.blurIntensity || 24}px`);
      root.style.setProperty('--border-opacity', `${theme.borderOpacity || 0.22}`);
    } else {
      // Solid mode when Glass is toggled OFF
      root.style.setProperty('--color-window-bg', theme.backgroundColor);
      root.style.setProperty('--color-card', theme.surfaceColor);
      root.style.setProperty('--color-modal-bg', theme.surfaceColor);
      root.style.setProperty('--glass-blur', '0px');
      root.style.setProperty('--border-opacity', '0.12');
    }

    // Glow intensity & Border Glow
    const primaryGlow = hexToRgba(theme.primaryAccent, theme.glowIntensity);
    root.style.setProperty('--color-glow', primaryGlow);
    root.style.setProperty('--color-border', `rgba(255, 255, 255, ${theme.borderOpacity || 0.22})`);
    root.style.setProperty('--color-border-hover', hexToRgba(theme.primaryAccent, Math.min(1, (theme.borderOpacity || 0.22) * 1.8)));
  }, [theme]);

  const applyPreset = (presetName: string) => {
    const preset = THEME_PRESETS[presetName];
    if (preset) {
      setTheme((prev) => ({
        ...prev,
        ...preset,
        preset: presetName,
      }));
    }
  };

  const updateThemeProperty = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setTheme((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyPreset, updateThemeProperty, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return `rgba(147, 51, 234, ${alpha})`;
  }
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
