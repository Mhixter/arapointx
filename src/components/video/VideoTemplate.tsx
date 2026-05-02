import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';

const SCENE_DURATIONS = {
  open: 15000,
  identity: 14000,
  education: 14000,
  business: 14000,
  wallet: 14000,
  vtu: 14000,
  agents: 14000,
  close: 16000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0F2346]">
      {/* Global Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F2346] via-transparent to-[#0F2346]/50 mix-blend-multiply pointer-events-none z-50" />

      {/* Scene Content */}
      <AnimatePresence initial={false} mode="popLayout">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="identity" />}
        {currentScene === 2 && <Scene3 key="education" />}
        {currentScene === 3 && <Scene4 key="business" />}
        {currentScene === 4 && <Scene5 key="wallet" />}
        {currentScene === 5 && <Scene6 key="vtu" />}
        {currentScene === 6 && <Scene7 key="agents" />}
        {currentScene === 7 && <Scene8 key="close" />}
      </AnimatePresence>
    </div>
  );
}
