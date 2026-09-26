import enderSingularity from '../assets/wallpapers/ender-singularity.png';
import celestialVoid from '../assets/wallpapers/celestial-void.jpg';
import ancientCityVoid from '../assets/wallpapers/ancient-city-void.jpg';
import auroraMountains from '../assets/wallpapers/aurora-mountains.jpg';
import crimsonNether from '../assets/wallpapers/crimson-nether.jpg';
import cherrySunset from '../assets/wallpapers/cherry-sunset.jpg';

export interface WallpaperPreset {
  name: string;
  url: string;
  theme?: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    name: 'Ender Singularity',
    url: enderSingularity,
    theme: 'Cosmic End Dimension with Accretion Disk',
  },
  {
    name: 'Celestial Void',
    url: celestialVoid,
    theme: 'Floating Amethyst Islands & Sky Castle',
  },
  {
    name: 'Ancient City Void',
    url: ancientCityVoid,
    theme: 'Deepslate Ruins & Teal Sculk Glow',
  },
  {
    name: 'Aurora Peaks',
    url: auroraMountains,
    theme: 'Glacial Mountains & Northern Lights',
  },
  {
    name: 'Crimson Nether',
    url: crimsonNether,
    theme: 'Crimson Forest & Lava Falls',
  },
  {
    name: 'Cherry Sunset',
    url: cherrySunset,
    theme: 'Sakura Grove & Golden Twilight',
  },
];

export const DEFAULT_WALLPAPER = enderSingularity;
