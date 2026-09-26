import React, { useEffect, useRef, useState } from 'react';
import * as skinview3d from 'skinview3d';
import { RotateCw, Pause, Play } from 'lucide-react';
import { DEFAULT_STEVE_SKIN } from './defaultSkin';

interface PlayerModelViewerProps {
  skinUrl?: string;
  capeUrl?: string;
  width?: number;
  height?: number;
  modelType?: 'default' | 'slim';
  animationType?: 'idle' | 'walk' | 'run' | 'none';
  enableControls?: boolean;
  autoRotate?: boolean;
  className?: string;
}

export const PlayerModelViewer: React.FC<PlayerModelViewerProps> = ({
  skinUrl,
  capeUrl,
  width = 240,
  height = 320,
  modelType = 'default',
  animationType = 'walk',
  enableControls = true,
  autoRotate = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const initialSkin = (skinUrl && skinUrl.startsWith('data:')) ? skinUrl : DEFAULT_STEVE_SKIN;

      const viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
        skin: initialSkin,
        model: modelType,
      });

      viewerRef.current = viewer;

      // Adjust camera & lighting for rich aesthetic
      viewer.camera.position.set(0, 0, 60);
      viewer.autoRotate = isRotating;
      viewer.autoRotateSpeed = 1.0;

      if (capeUrl) {
        viewer.loadCape(capeUrl).catch(() => {});
      }

      // If external URL was passed, try loading it; fall back to embedded Steve on failure
      if (skinUrl && !skinUrl.startsWith('data:')) {
        viewer.loadSkin(skinUrl).catch(() => {
          viewer.loadSkin(DEFAULT_STEVE_SKIN);
        });
      }

      // Set walking animation by default
      if (animationType === 'idle') {
        viewer.animation = new skinview3d.IdleAnimation();
      } else if (animationType === 'walk') {
        viewer.animation = new skinview3d.WalkingAnimation();
      } else if (animationType === 'run') {
        viewer.animation = new skinview3d.RunningAnimation();
      }

      return () => {
        viewer.dispose();
        viewerRef.current = null;
      };
    } catch (err) {
      console.warn('SkinViewer initialization error:', err);
    }
  }, [skinUrl, modelType, width, height]);

  // Update animation dynamically
  useEffect(() => {
    if (!viewerRef.current) return;
    if (!animating) {
      viewerRef.current.animation = null;
      return;
    }
    if (animationType === 'idle') {
      viewerRef.current.animation = new skinview3d.IdleAnimation();
    } else if (animationType === 'walk') {
      viewerRef.current.animation = new skinview3d.WalkingAnimation();
    } else if (animationType === 'run') {
      viewerRef.current.animation = new skinview3d.RunningAnimation();
    } else {
      viewerRef.current.animation = null;
    }
  }, [animationType, animating]);

  // Update rotation
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  return (
    <div className={`relative flex flex-col items-center justify-center group ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing rounded-2xl drop-shadow-[0_16px_28px_rgba(0,0,0,0.65)]"
      />

      {/* Floating subtle controls on hover */}
      {enableControls && (
        <div className="absolute bottom-2 right-2 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 z-20">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1 rounded transition-colors ${
              isRotating ? 'text-purple-300' : 'text-white/40 hover:text-white'
            }`}
            title={isRotating ? 'Pause Rotation' : 'Auto Rotate'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin-slow' : ''}`} />
          </button>
          <button
            onClick={() => setAnimating(!animating)}
            className="p-1 rounded text-white/60 hover:text-white transition-colors"
            title={animating ? 'Pause Animation' : 'Play Animation'}
          >
            {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
