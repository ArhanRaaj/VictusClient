import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(10);
  const [statusText, setStatusText] = useState('Initializing VictusClient Core...');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const stages = [
      { p: 30, text: 'Loading Theme & Glassmorphism Engine...' },
      { p: 60, text: 'Resolving Installed Instances & Content...' },
      { p: 85, text: 'Connecting to Modrinth & Mojang APIs...' },
      { p: 100, text: 'Welcome to VictusClient' },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stages.length) {
        setProgress(stages[current].p);
        setStatusText(stages[current].text);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            onComplete();
          }, 600);
        }, 400);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0b12]/80 backdrop-blur-2xl text-white transition-opacity duration-600 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow circles */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[var(--color-primary)]/15 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[90px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center z-10 max-w-sm w-full px-6">
        {/* Animated Brand Emblem */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] opacity-60 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-[#0f111c]/90 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden p-3">
            {/* Gloss highlight */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-md" />
            <img src="./icon.png" alt="VictusClient Logo" className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_16px_rgba(168,85,247,0.5)]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display font-extrabold text-2xl tracking-wider text-white uppercase mb-1">
          Victus<span className="text-[var(--color-primary-light)]">Client</span>
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] tracking-widest uppercase mb-8">
          Next-Level Minecraft Launcher
        </p>

        {/* Custom Sleek Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 p-0.5 border border-white/10 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-secondary)] transition-all duration-300 ease-out shadow-[0_0_12px_var(--color-glow)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between w-full text-[11px] text-[var(--color-text-muted)] font-mono">
          <span className="truncate">{statusText}</span>
          <span className="ml-2 font-semibold text-white/70">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
