import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),  // Text appears
      setTimeout(() => setPhase(2), 800),  // Card base appears
      setTimeout(() => setPhase(3), 1500), // Card details load
      setTimeout(() => setPhase(4), 2200), // Verified stamp
      setTimeout(() => setPhase(5), 4200), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-50%', opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2 pl-[10vw] pr-[5vw] relative z-10">
        <motion.div className="overflow-hidden mb-[2vw]">
          <motion.div
            className="w-[4vw] h-[0.5vw] bg-[#6DB33F] mb-[2vw]"
            initial={{ x: '-100%' }}
            animate={phase >= 1 ? { x: 0 } : { x: '-100%' }}
            transition={{ duration: 0.5 }}
          />
          <motion.h2 
            className="text-[4vw] font-black text-white leading-[1.1]"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            INSTANT<br/>
            IDENTITY<br/>
            CHECKS
          </motion.h2>
        </motion.div>
        
        <motion.p 
          className="text-[1.5vw] text-white/70 font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          NIN & BVN verification in seconds.
        </motion.p>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center pr-[10vw]">
        {/* Verification Card Mockup */}
        <motion.div 
          className="w-[28vw] bg-[#1C3A6B]/80 backdrop-blur-xl border border-white/10 rounded-[1.5vw] p-[2.5vw] relative overflow-hidden shadow-2xl"
          initial={{ y: '20vh', opacity: 0, rotateY: 30, rotateX: 10 }}
          animate={phase >= 2 ? { y: 0, opacity: 1, rotateY: -5, rotateX: 5 } : { y: '20vh', opacity: 0, rotateY: 30, rotateX: 10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{ transformPerspective: 1000 }}
        >
          <div className="flex items-center gap-[1.5vw] mb-[2.5vw]">
            <motion.div 
              className="w-[5vw] h-[5vw] bg-white/10 rounded-full"
              initial={{ scale: 0 }}
              animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
              transition={{ type: 'spring', delay: 0.1 }}
            />
            <div className="flex-1 space-y-[0.8vw]">
              <motion.div 
                className="h-[1vw] bg-white/20 rounded-full w-3/4"
                initial={{ scaleX: 0, transformOrigin: 'left' }}
                animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
              <motion.div 
                className="h-[0.8vw] bg-white/10 rounded-full w-1/2"
                initial={{ scaleX: 0, transformOrigin: 'left' }}
                animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              />
            </div>
          </div>

          <div className="space-y-[1vw]">
            {[1, 2, 3].map((i) => (
              <motion.div 
                key={i}
                className="h-[3vw] bg-white/5 rounded-[0.5vw] border border-white/5 flex items-center px-[1vw] gap-[1vw]"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: 0.3 + (i * 0.1) }}
              >
                <div className="w-[1vw] h-[1vw] rounded-full bg-[#6DB33F]/50" />
                <div className="h-[0.5vw] bg-white/10 w-1/3 rounded-full" />
              </motion.div>
            ))}
          </div>

          {/* VERIFIED STAMP */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ scale: 3, opacity: 0 }}
            animate={phase >= 4 ? { scale: 1, opacity: 1 } : { scale: 3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className="border-[0.4vw] border-[#6DB33F] text-[#6DB33F] font-black text-[3.5vw] tracking-widest px-[1.5vw] py-[0.5vw] rounded-[1vw] rotate-[-15deg] shadow-[0_0_30px_rgba(109,179,63,0.3)] bg-[#0F2346]/80 backdrop-blur-sm">
              VERIFIED
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
