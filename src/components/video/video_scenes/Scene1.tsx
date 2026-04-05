import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Split effect
      setTimeout(() => setPhase(2), 1200), // Question appears
      setTimeout(() => setPhase(3), 2000), // Emphasis
      setTimeout(() => setPhase(4), 3200), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center relative z-10">
        <motion.div 
          className="overflow-hidden"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h1 
            className="text-[6vw] font-black tracking-tighter text-white leading-tight"
            animate={phase >= 1 ? { letterSpacing: '-0.02em' } : { letterSpacing: '0.1em' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            CAN YOU TRUST
          </motion.h1>
        </motion.div>
        
        <div className="overflow-hidden mt-[1vw]">
          <motion.h1 
            className="text-[6vw] font-black tracking-tighter text-white leading-tight"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            WHO YOU'RE <span className="text-[#6DB33F] relative inline-block">
              HIRING?
              {phase >= 3 && (
                <motion.div 
                  className="absolute -bottom-[1vw] left-0 right-0 h-[0.5vw] bg-[#6DB33F]"
                  initial={{ scaleX: 0, transformOrigin: 'left' }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </span>
          </motion.h1>
        </div>
      </div>

      {/* Dramatic Splitting Background Motif */}
      <motion.div 
        className="absolute inset-0 bg-[#1C3A6B] mix-blend-overlay"
        initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
        animate={phase >= 1 ? { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' } : { clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      />
    </motion.div>
  );
}
