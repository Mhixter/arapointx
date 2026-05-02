import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + crumpled slip
      setTimeout(() => setPhase(2), 2400),   // first failed input
      setTimeout(() => setPhase(3), 4800),   // second failed input
      setTimeout(() => setPhase(4), 7400),   // big "?" mark / not found
      setTimeout(() => setPhase(5), 10200),  // pivot line in
      setTimeout(() => setPhase(6), 11500),  // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw',
        }}
      />

      {/* Cyan/violet tinted radial wash to set up the BVN palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 35%, rgba(6,182,212,0.10) 0%, transparent 50%), radial-gradient(ellipse at 70% 65%, rgba(139,92,246,0.10) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Eyebrow */}
        <motion.div
          className="text-[1.2vw] tracking-[0.4em] uppercase font-semibold mb-[2.2vw]"
          style={{ fontFamily: "'Inter', sans-serif", color: '#06B6D4' }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          Lost your BVN?
        </motion.div>

        {/* Mock failed BVN search */}
        <motion.div
          className="w-[55vw] mb-[2.5vw] relative"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
        >
          <div
            className="text-[0.95vw] tracking-[0.32em] text-white/50 uppercase font-semibold mb-[0.8vw]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Enter BVN
          </div>
          <div className="flex items-center gap-[1vw] bg-white/6 backdrop-blur-md border border-white/15 rounded-[0.8vw] px-[1.5vw] py-[1.3vw]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full border-2 border-white/40 flex items-center justify-center">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-white/40" />
            </div>
            <div
              className="text-[1.7vw] font-medium text-white/85 flex-1 tracking-[0.18em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {phase < 2 && '\u00A0'}
              {phase >= 2 && phase < 3 && '2210•••'}
              {phase >= 3 && phase < 4 && '22102•3•••'}
              {phase >= 4 && 'BVN not found'}
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
              className="absolute right-[2.2vw] bottom-[1.6vw] w-[0.15vw] h-[1.7vw]"
              style={{ background: '#06B6D4' }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Crumpled-slip + scattered question motif */}
        <motion.div
          className="flex items-center justify-center gap-[2.2vw] mb-[2.2vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Lost paper slip */}
          <div className="relative w-[12vw] h-[7vw] rotate-[-6deg]">
            <div
              className="absolute inset-0 rounded-[0.4vw] shadow-[0_8px_25px_-8px_rgba(0,0,0,0.6)]"
              style={{
                background:
                  'linear-gradient(135deg, #F5F0E2 0%, #E5DBC0 60%, #C9BC95 100%)',
              }}
            />
            <div className="absolute inset-x-[1vw] top-[1vw] h-[0.25vw] bg-[#0F2346]/30 rounded-full" />
            <div className="absolute inset-x-[1vw] top-[2vw] h-[0.18vw] bg-[#0F2346]/20 rounded-full" />
            <div className="absolute inset-x-[1vw] top-[2.7vw] h-[0.18vw] bg-[#0F2346]/20 rounded-full w-[6vw]" />
            <div className="absolute inset-x-[1vw] top-[3.4vw] h-[0.18vw] bg-[#0F2346]/20 rounded-full w-[7vw]" />
            {/* Tear */}
            <svg
              className="absolute -right-[0.1vw] top-0 h-full w-[1.8vw]"
              viewBox="0 0 18 70"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 L12,8 L4,18 L14,28 L2,38 L13,48 L5,58 L18,70 L0,70 Z"
                fill="#E5DBC0"
              />
            </svg>
          </div>

          {/* Question marks fanning */}
          {[
            { x: 0, y: -2, size: 2.4, c: '#06B6D4' },
            { x: 3, y: 1, size: 1.6, c: '#8B5CF6' },
            { x: -2, y: 2, size: 1.4, c: '#06B6D4' },
          ].map((q, i) => (
            <motion.div
              key={i}
              className="absolute font-black"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: q.c,
                fontSize: `${q.size}vw`,
                marginLeft: `${q.x}vw`,
                marginTop: `${q.y}vw`,
              }}
              initial={{ opacity: 0, y: 10, rotate: -8 }}
              animate={phase >= 4 ? { opacity: 0.9, y: 0, rotate: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
            >
              ?
            </motion.div>
          ))}
        </motion.div>

        {/* Pivot line */}
        <motion.h2
          className="text-[3.4vw] font-black text-white text-center leading-[1.1] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Get it back <span style={{ color: '#06B6D4' }}>in seconds.</span>
        </motion.h2>
      </div>
    </motion.div>
  );
}
