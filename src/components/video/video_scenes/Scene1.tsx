import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Line draw
      setTimeout(() => setPhase(2), 2000), // First text
      setTimeout(() => setPhase(3), 6000), // Second text
      setTimeout(() => setPhase(4), 10000), // Third text
      setTimeout(() => setPhase(5), 15000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Abstract Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }}
      />

      <div className="text-center relative z-10">
        <motion.div 
          className="mb-[2vw]"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}logos/arapoint-logo-clear.png`}
            alt="Arapoint"
            className="w-[20vw] mx-auto opacity-90"
          />
        </motion.div>

        <div className="h-[8vw] relative flex items-center justify-center overflow-hidden">
          <motion.h1 
            className="absolute text-[5vw] font-black tracking-tighter text-white leading-tight"
            initial={{ y: '100%', opacity: 0 }}
            animate={phase >= 2 && phase < 3 ? { y: 0, opacity: 1 } : { y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            BUILT FOR <span className="text-[#6DB33F]">NIGERIA</span>
          </motion.h1>

          <motion.h1 
            className="absolute text-[4.5vw] font-black tracking-tighter text-white leading-tight"
            initial={{ y: '100%', opacity: 0 }}
            animate={phase >= 3 && phase < 4 ? { y: 0, opacity: 1 } : { y: phase >= 4 ? '-100%' : '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            THE DEFINITIVE SOURCE
          </motion.h1>

          <motion.h1 
            className="absolute text-[4vw] font-black tracking-tighter text-white leading-tight"
            initial={{ y: '100%', opacity: 0 }}
            animate={phase >= 4 ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            OF <span className="text-[#6DB33F]">DIGITAL TRUST</span>
          </motion.h1>
        </div>
      </div>
    </motion.div>
  );
}
