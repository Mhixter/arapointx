import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Text
      setTimeout(() => setPhase(2), 2000), // Scan lines
      setTimeout(() => setPhase(3), 4000), // Card pop
      setTimeout(() => setPhase(4), 14000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-50%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-20 bg-center bg-cover mix-blend-overlay" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-fingerprint.png)` }} />

      <div className="flex w-[80vw] justify-between items-center z-10">
        <div className="w-[40%]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-[5vw] font-black text-white leading-tight mb-[1vw]">
              IDENTITY
            </h2>
            <div className="w-[4vw] h-[0.5vw] bg-[#6DB33F] mb-[2vw]" />
            <p className="text-[1.8vw] text-white/70 font-medium leading-relaxed">
              Instantly cross-reference NIN and BVN directly with official national databases.
            </p>
          </motion.div>
        </div>

        <div className="w-[45%] h-[50vh] relative flex items-center justify-center" style={{ perspective: 1000 }}>
          {/* Identity Card Mockup */}
          <motion.div 
            className="w-[30vw] h-[18vw] bg-[#1C3A6B]/80 backdrop-blur-xl border border-[#6DB33F]/30 rounded-[1vw] shadow-2xl relative overflow-hidden"
            initial={{ rotateY: 45, opacity: 0, z: -100 }}
            animate={phase >= 3 ? { rotateY: -10, opacity: 1, z: 0 } : { rotateY: 45, opacity: 0, z: -100 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="absolute top-[10%] left-[5%] w-[6vw] h-[6vw] bg-white/10 rounded-full" />
            <div className="absolute top-[20%] left-[30%] w-[12vw] h-[1vw] bg-white/20 rounded" />
            <div className="absolute top-[35%] left-[30%] w-[8vw] h-[1vw] bg-white/10 rounded" />
            
            <div className="absolute bottom-[20%] left-[5%] w-[25vw] h-[0.5vw] bg-[#6DB33F]/50 rounded" />
            
            {/* Animated Scan Line */}
            {phase >= 2 && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6DB33F]/20 to-transparent h-[4vw] w-full"
                animate={{ y: ['-4vw', '18vw', '-4vw'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
