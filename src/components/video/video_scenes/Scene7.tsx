import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 14000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-15 bg-center bg-cover mix-blend-overlay" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-nigeria-map.png)` }} />

      <div className="text-center z-10 w-[80vw]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-[5vw] font-black text-white leading-tight mb-[2vw]">
            EMPOWERING <span className="text-[#6DB33F]">AGENTS</span>
          </h2>
        </motion.div>

        <motion.p
          className="text-[2vw] text-white/80 font-medium max-w-[60vw] mx-auto"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Start your own business offering Arapoint services locally, bringing digital trust to every corner of Nigeria.
        </motion.p>
        
        {/* Animated glowing nodes */}
        {phase >= 2 && (
          <div className="absolute inset-0 pointer-events-none">
             {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[1vw] h-[1vw] bg-[#D4A24C] rounded-full blur-[2px]"
                  style={{
                    left: `${20 + i * 15}vw`,
                    top: `${30 + (i % 3) * 15}vh`
                  }}
                  animate={{ scale: [1, 2, 1], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
             ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
