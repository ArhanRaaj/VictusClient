import React from 'react';
import { ExternalLink, Flame, ShieldAlert, Sparkles } from 'lucide-react';
import { WALLPAPER_PRESETS } from '../../constants/wallpapers';

export const NewsFeed: React.FC = () => {
  const newsItems = [
    {
      id: 'news-1',
      title: 'VictusClient 1.0 "Ascent" Released',
      tag: 'Update',
      tagColor: 'bg-[var(--color-primary)] text-white',
      date: 'Today',
      summary: 'Brand new high-performance engine, glassmorphism compositor, and native Adoptium Java 21 integration.',
      image: WALLPAPER_PRESETS[0].url,
    },
    {
      id: 'news-2',
      title: 'Minecraft 1.21.4 The Garden Awakens',
      tag: 'Minecraft',
      tagColor: 'bg-emerald-600 text-white',
      date: 'Dec 2024',
      summary: 'The Pale Garden biome, Creaking monster, and resin bricks are now playable with full Fabric and NeoForge support.',
      image: WALLPAPER_PRESETS[2].url,
    },
    {
      id: 'news-3',
      title: 'Modrinth API v2 Integration Live',
      tag: 'Feature',
      tagColor: 'bg-blue-600 text-white',
      date: 'Nov 2024',
      summary: 'Browse and install 100,000+ mods, shaders, and resource packs with one click directly inside VictusClient.',
      image: WALLPAPER_PRESETS[3].url,
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center space-x-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>News & Highlights</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {newsItems.map((news) => (
          <div
            key={news.id}
            className="group rounded-2xl glass-panel border border-white/5 hover:border-[var(--color-border-hover)] p-3.5 flex flex-col justify-between hover:bg-white/[0.03] transition-all cursor-pointer overflow-hidden relative"
          >
            <div>
              <div className="relative h-28 rounded-xl overflow-hidden mb-3">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${news.tagColor}`}
                >
                  {news.tag}
                </span>
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80 font-mono">
                  {news.date}
                </span>
              </div>
              <h4 className="font-bold text-xs text-white group-hover:text-[var(--color-primary-light)] transition-colors line-clamp-1 mb-1">
                {news.title}
              </h4>
              <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                {news.summary}
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/50 group-hover:text-[var(--color-primary-light)] transition-colors">
              <span>Read article</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
