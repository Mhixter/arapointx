import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 4800),
      setTimeout(() => setPhase(4), 7800),
      setTimeout(() => setPhase(5), 10500),
      setTimeout(() => setPhase(6), 13500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const queueDots = Array.from({ length: 9 });

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background: subtle grid + bg-fingerprint at low opacity */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-fingerprint.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Eyebrow */}
        <motion.div
          className="text-[1.2vw] tracking-[0.4em] text-[#6DB33F] uppercase font-semibold mb-[2.5vw]"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          The everyday Nigerian problem
        </motion.div>

        {/* Mock failed search */}
        <motion.div
          className="w-[55vw] mb-[3vw] relative"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
        >
          <div className="flex items-center gap-[1vw] bg-white/5 backdrop-blur-md border border-white/15 rounded-[0.8vw] px-[1.5vw] py-[1.2vw]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full border-2 border-white/40 flex items-center justify-center">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-white/40" />
            </div>
            <div
              className="text-[1.6vw] font-medium text-white/80 flex-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {phase >= 2 && phase < 3 && '8743•••'}
              {phase >= 3 && phase < 4 && '12345•6•'}
              {phase >= 4 && 'NIN not found'}
            </div>
            {phase >= 4 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                className="w-[2vw] h-[2vw] rounded-full bg-red-500/20 border border-red-400/60 flex items-center justify-center text-red-300 text-[1.4vw] font-bold"
              >
                ×
              </motion.div>
            )}
          </div>
          {/* Caret blink */}
          {phase >= 2 && phase < 4 && (
            <motion.div
              className="absolute right-[2vw] top-1/2 -translate-y-1/2 w-[0.15vw] h-[1.8vw] bg-[#6DB33F]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Queue silhouettes + clock */}
        <motion.div
          className="flex items-end justify-center gap-[0.6vw] h-[7vw] mb-[3vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {queueDots.map((_, i) => (
            <motion.div
              key={i}
              className="w-[1.4vw] bg-white/30 rounded-t-full"
              style={{ height: `${4 + (i % 3) * 0.8}vw` }}
              initial={{ y: 20, opacity: 0 }}
              animate={phase >= 5 ? { y: 0, opacity: 0.5 } : { y: 20, opacity: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
            />
          ))}
          <div
            className="w-[3vw] h-[3vw] rounded-full border-2 border-[#D4A24C]/70 flex items-center justify-center ml-[1.5vw] relative"
          >
            <motion.div
              className="absolute top-1/2 left-1/2 origin-left h-[0.15vw] w-[1vw] bg-[#D4A24C] rounded-full"
              style={{ translateY: '-50%' }}
              animate={phase >= 5 ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 origin-left h-[0.15vw] w-[0.7vw] bg-[#D4A24C]/70 rounded-full"
              style={{ translateY: '-50%' }}
              animate={phase >= 5 ? { rotate: -180 } : { rotate: 0 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>

        {/* Pivot line */}
        <motion.h2
          className="text-[3.6vw] font-black text-white text-center leading-[1.1] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          There&rsquo;s a <span className="text-[#6DB33F]">faster way.</span>
        </motion.h2>
      </div>
    </motion.div>
  );
}
