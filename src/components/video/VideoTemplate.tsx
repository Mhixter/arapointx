import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

// Total ~31 seconds
const SCENE_DURATIONS = {
  hook: 4000,
  identity: 5000,
  education: 5000,
  employment: 5500,
  api: 5000,
  outro: 6500
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0F2346]">
      {/* Persistent Background Video */}
      <div className="absolute inset-0 opacity-40">
        <video 
          src={`${import.meta.env.BASE_URL}videos/dark-navy-abstract.mp4`}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
        />
      </div>

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }}
      />

      {/* Global Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F2346] via-transparent to-[#0F2346]/50 mix-blend-multiply pointer-events-none" />

      {/* Persistent Decorative Elements */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px] pointer-events-none"
        animate={{
          background: currentScene === 3 ? 'radial-gradient(circle, rgba(109,179,63,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(28,58,107,0.4) 0%, transparent 70%)',
          x: ['-20vw', '50vw', '10vw', '60vw', '-10vw', '50vw'][currentScene],
          y: ['-10vh', '-20vh', '50vh', '40vh', '10vh', '0vh'][currentScene],
          scale: [1, 1.2, 0.8, 1.5, 1, 1.2][currentScene]
        }}
        transition={{ duration: 2, ease: [0.25, 1, 0.5, 1] }}
      />

      {/* Persistent Scene Divider Line */}
      <motion.div
        className="absolute h-[2px] bg-[#6DB33F] z-20"
        animate={{
          left: ['0%', '10%', '0%', '50%', '0%', '20%'][currentScene],
          width: ['100%', '80%', '40%', '50%', '100%', '60%'][currentScene],
          top: ['10%', '85%', '90%', '10%', '95%', '50%'][currentScene],
          opacity: currentScene === 0 ? 0 : 0.5
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Scene Content */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="identity" />}
        {currentScene === 2 && <Scene3 key="education" />}
        {currentScene === 3 && <Scene4 key="employment" />}
        {currentScene === 4 && <Scene5 key="api" />}
        {currentScene === 5 && <Scene6 key="outro" />}
      </AnimatePresence>
    </div>
  );
}
