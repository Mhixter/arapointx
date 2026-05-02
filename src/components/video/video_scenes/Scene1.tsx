import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — Hook: bureaucracy pain.
 *
 * Cool slate wash, silhouette queue, paper stack and ticking clock.
 * Pivot copy: "Civic paperwork, the old way." → "Took weeks. Sometimes longer."
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline in
      setTimeout(() => setPhase(2), 2400),   // queue + paper + clock in
      setTimeout(() => setPhase(3), 5800),   // pain bullet pills
      setTimeout(() => setPhase(4), 9200),   // closing line
      setTimeout(() => setPhase(5), 13200),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Cool slate ambient — feels institutional, dated */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(125,140,160,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      {/* Faint paper grain */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 3px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Headline */}
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-semibold mb-[1vw] text-white/55"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
        >
          Nigerian civic services
        </motion.div>

        <motion.h1
          className="text-[4.6vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Civic paperwork,{' '}
          <span style={{ color: '#94A3B8' }}>the old way.</span>
        </motion.h1>

        {/* Visual triad: queue silhouette + paper stack + clock */}
        <motion.div
          className="mt-[3.4vw] flex items-end gap-[3vw]"
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Queue silhouette */}
          <div className="flex items-end gap-[0.55vw]">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.svg
                key={i}
                viewBox="0 0 40 90"
                className="w-[2.8vw] h-[6.2vw]"
                initial={{ opacity: 0, y: 10 }}
                animate={phase >= 2 ? { opacity: 0.55, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.08 * i, duration: 0.5 }}
              >
                <circle cx="20" cy="14" r="9" fill="#94A3B8" />
                <path
                  d="M6 90 C 6 50, 34 50, 34 90 Z"
                  fill="#94A3B8"
                />
              </motion.svg>
            ))}
            {/* Trailing fade pair */}
            <motion.svg
              viewBox="0 0 40 90"
              className="w-[2.8vw] h-[6.2vw]"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 0.25 } : { opacity: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <circle cx="20" cy="14" r="9" fill="#94A3B8" />
              <path d="M6 90 C 6 50, 34 50, 34 90 Z" fill="#94A3B8" />
            </motion.svg>
          </div>

          {/* Paper stack */}
          <div className="relative w-[8vw] h-[6.2vw]">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 -translate-x-1/2 rounded-[0.18vw]"
                style={{
                  bottom: `${i * 0.45}vw`,
                  width: `${7 - i * 0.15}vw`,
                  height: '0.6vw',
                  background: i % 2 === 0 ? '#E2E8F0' : '#CBD5E1',
                  boxShadow: '0 0.05vw 0.2vw rgba(0,0,0,0.35)',
                  transform: `translateX(-50%) rotate(${(i - 2) * 0.6}deg)`,
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={phase >= 2 ? { opacity: 0.85, y: 0 } : { opacity: 0, y: 6 }}
                transition={{ delay: 0.7 + 0.08 * i, duration: 0.4 }}
              />
            ))}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 bottom-[2.7vw] text-center"
              style={{ fontFamily: "'Inter', sans-serif" }}
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 0.9 } : { opacity: 0 }}
              transition={{ delay: 1.1 }}
            >
              <div
                className="text-[0.7vw] tracking-[0.3em] uppercase font-bold"
                style={{ color: '#94A3B8' }}
              >
                Forms
              </div>
            </motion.div>
          </div>

          {/* Clock */}
          <div className="relative w-[6vw] h-[6vw]">
            <div
              className="absolute inset-0 rounded-full border-[0.25vw]"
              style={{
                borderColor: '#94A3B8',
                background: 'rgba(255,255,255,0.04)',
              }}
            />
            {/* Tick marks */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: '0.15vw',
                  height: '0.55vw',
                  background: '#94A3B8',
                  transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-2.55vw)`,
                }}
              />
            ))}
            {/* Hour hand */}
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{
                width: '0.22vw',
                height: '1.6vw',
                background: '#CBD5E1',
                transformOrigin: 'top center',
                transform: 'translate(-50%, 0) rotate(40deg)',
              }}
              initial={{ rotate: 40 }}
              animate={phase >= 2 ? { rotate: [40, 360 + 40] } : { rotate: 40 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            {/* Minute hand */}
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{
                width: '0.18vw',
                height: '2.3vw',
                background: '#E2E8F0',
                transformOrigin: 'top center',
                transform: 'translate(-50%, 0) rotate(0deg)',
              }}
              initial={{ rotate: 0 }}
              animate={phase >= 2 ? { rotate: [0, 360 * 6] } : { rotate: 0 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <div
              className="absolute left-1/2 top-1/2 w-[0.4vw] h-[0.4vw] rounded-full"
              style={{ background: '#E2E8F0', transform: 'translate(-50%,-50%)' }}
            />
          </div>
        </motion.div>

        {/* Pain pills */}
        <motion.div
          className="mt-[3vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {['Long queues', 'Paper forms', 'Stamps', 'Weeks of waiting'].map((label, i) => (
            <motion.div
              key={label}
              className="px-[1.2vw] py-[0.5vw] rounded-full text-[1.05vw] font-semibold"
              style={{
                background: 'rgba(148,163,184,0.10)',
                border: '1px solid rgba(148,163,184,0.35)',
                color: '#CBD5E1',
                fontFamily: "'Inter', sans-serif",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.12 * i, duration: 0.5 }}
            >
              {label}
            </motion.div>
          ))}
        </motion.div>

        {/* Closing line */}
        <motion.div
          className="mt-[2.8vw] text-[1.55vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Took weeks.{' '}
          <span style={{ color: '#94A3B8' }} className="font-bold">
            Sometimes longer.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
