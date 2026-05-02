import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  hook: 15000,
  curl: 18000,
  json: 20000,
  envs: 16000,
  unified: 18000,
  close: 28000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A1628]">
      {/* Subtle vignette + scanline-grid backdrop for the developer aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.18]"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4vw), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4vw)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050B16] via-transparent to-[#050B16]/60 mix-blend-multiply pointer-events-none z-50" />

      <AnimatePresence initial={false} mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="curl" />}
        {currentScene === 2 && <Scene3 key="json" />}
        {currentScene === 3 && <Scene4 key="envs" />}
        {currentScene === 4 && <Scene5 key="unified" />}
        {currentScene === 5 && <Scene6 key="close" />}
      </AnimatePresence>
    </div>
  );
}
