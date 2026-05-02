import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 14000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-20 bg-center bg-cover mix-blend-overlay" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-data-flow.png)` }} />

      <div className="flex flex-col items-center z-10 w-full">
        <motion.h2 
          className="text-[4.5vw] font-black text-white leading-tight mb-[4vw] text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          EDUCATION <span className="text-[#6DB33F]">VERIFIED</span>
        </motion.h2>

        <div className="flex gap-[3vw] w-[80vw] justify-center" style={{ perspective: 1000 }}>
          {['WAEC', 'NECO', 'JAMB'].map((board, i) => (
            <motion.div
              key={board}
              className="w-[20vw] bg-[#1C3A6B]/60 backdrop-blur-md border border-white/10 rounded-[1vw] p-[2vw] text-center flex flex-col items-center shadow-xl relative overflow-hidden"
              initial={{ opacity: 0, rotateX: 30, y: 50 }}
              animate={phase >= 2 ? { opacity: 1, rotateX: 0, y: 0 } : { opacity: 0, rotateX: 30, y: 50 }}
              transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.2 }}
            >
              <div className="w-[4vw] h-[4vw] rounded-full bg-white/10 mb-[1.5vw] flex items-center justify-center">
                <div className="w-[2vw] h-[2vw] rounded-full bg-[#6DB33F]/50" />
              </div>
              <h3 className="text-[2vw] font-bold text-white mb-[1vw]">{board}</h3>
              <div className="w-[80%] h-[0.5vw] bg-white/20 rounded mb-[0.5vw]" />
              <div className="w-[60%] h-[0.5vw] bg-white/10 rounded" />
              
              <motion.div 
                className="absolute inset-0 border-2 border-[#6DB33F] rounded-[1vw]"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5, delay: i * 0.2 + 0.5 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
