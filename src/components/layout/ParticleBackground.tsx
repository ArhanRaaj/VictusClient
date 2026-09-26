import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  // Parse primaryAccent to RGB
  const hexToRgb = (hex: string) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 147, g: 51, b: 234 }; // Default purple
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  useEffect(() => {
    if (theme.particlesEnabled === false || theme.reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates tracking
    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Create particles
    const particleCount = 70;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.35,
        alpha: 0.5,
      });
    }

    const { r, g, b } = hexToRgb(theme.primaryAccent || '#9333ea');

    // Main animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Natural movement
        p.x += p.vx;
        p.y += p.vy;

        // Interactive cursor attraction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 220;

          if (dist < maxDist && dist > 1) {
            // Attraction physics: closer particles get pulled towards mouse
            const force = (1 - dist / maxDist) * 0.18;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;

            // Particles glow brighter near cursor
            p.alpha = Math.min(1.0, p.baseAlpha + (1 - dist / maxDist) * 0.55);
          } else {
            p.alpha = p.baseAlpha;
          }
        } else {
          p.alpha = p.baseAlpha;
        }

        // Friction & terminal velocity damping
        p.vx *= 0.97;
        p.vy *= 0.97;

        // Ensure minimum organic drift
        if (Math.abs(p.vx) < 0.15) p.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(p.vy) < 0.15) p.vy += (Math.random() - 0.5) * 0.1;

        // Bounce / wrap around edges
        if (p.x < 0) {
          p.x = width;
        } else if (p.x > width) {
          p.x = 0;
        }
        if (p.y < 0) {
          p.y = height;
        } else if (p.y > height) {
          p.y = 0;
        }

        // Draw particle dot with soft glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby particles with subtle constellation web lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distLine = Math.hypot(p.x - p2.x, p.y - p2.y);
          const connectionLimit = 110;

          if (distLine < connectionLimit) {
            const lineAlpha = (1 - distLine / connectionLimit) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse if nearby
        if (mouse.active) {
          const distMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (distMouse < 140) {
            const mouseLineAlpha = (1 - distMouse / 140) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${mouseLineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme.primaryAccent, theme.particlesEnabled, theme.reducedMotion]);

  if (theme.particlesEnabled === false || theme.reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1] w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
};
export default ParticleBackground;
