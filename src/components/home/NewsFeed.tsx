import React from 'react';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { WALLPAPER_PRESETS } from '../../constants/wallpapers';

export const NewsFeed: React.FC = () => {
  const newsItems = [
    {
      id: 'news-1',
      title: 'VictusClient 1.1 "Ascent" Released',
      tag: 'Update',
      date: 'Latest',
      summary:
        'Refined matte architecture, high-efficiency launch subsystem, and native Adoptium Java 21 support.',
      image: WALLPAPER_PRESETS[0]?.url || '',
    },
    {
      id: 'news-2',
      title: 'Minecraft 1.21.4 Pale Garden & NeoForge',
      tag: 'Minecraft',
      date: 'Dec 2024',
      summary:
        'The Creaking monster, resin bricks, and Pale Garden biome with full Fabric & NeoForge modding pipelines.',
      image: WALLPAPER_PRESETS[2]?.url || '',
    },
    {
      id: 'news-3',
      title: 'Modrinth API v2 Integrated',
      tag: 'Feature',
      date: 'Nov 2024',
      summary:
        'Explore, install, and update 100,000+ mods, shaders, and resource packs with 1-click zero hassle.',
      image: WALLPAPER_PRESETS[3]?.url || '',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono flex items-center space-x-1.5">
          <Newspaper className="w-3.5 h-3.5 text-white/40" />
          <span>Release Notes & Highlights</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {newsItems.map((news) => (
          <div
            key={news.id}
            className="group rounded-2xl bg-[#0e1017] hover:bg-[#12141e] border border-white/[0.07] hover:border-white/18 p-3 flex flex-col justify-between transition-all duration-150 cursor-pointer overflow-hidden shadow-sm"
          >
            <div>
              <div className="relative h-28 rounded-xl overflow-hidden mb-2.5 bg-black/40">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-md border border-white/10 text-white/90">
                  {news.tag}
                </span>

                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-white/70 font-mono">
                  {news.date}
                </span>
              </div>

              <h4 className="font-bold text-xs text-white group-hover:text-white transition-colors line-clamp-1 mb-1">
                {news.title}
              </h4>
              <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                {news.summary}
              </p>
            </div>

            <div className="pt-2.5 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40 group-hover:text-white/80 transition-colors font-mono">
              <span>View details</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
