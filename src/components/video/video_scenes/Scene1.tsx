import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — Student hook (Education).
 *
 * Cool slate wash with stylized academic motifs (open book + grad cap + clock).
 * Sets up the audience triad: students, parents, recruiters.
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline in
      setTimeout(() => setPhase(2), 2400),   // visual triad in
      setTimeout(() => setPhase(3), 5800),   // audience pills
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
      {/* Cool slate ambient — institutional, scholarly */}
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
        {/* Eyebrow */}
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-semibold mb-[1vw] text-white/55"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
        >
          Education in Nigeria
        </motion.div>

        <motion.h1
          className="text-[4.4vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Results, slips and admissions —{' '}
          <span style={{ color: '#94A3B8' }}>without the runaround.</span>
        </motion.h1>

        {/* Visual triad: open book + graduation cap + clock */}
        <motion.div
          className="mt-[3.2vw] flex items-end gap-[3.5vw]"
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Open book */}
          <motion.svg
            viewBox="0 0 110 80"
            className="w-[10vw] h-[7.2vw]"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 2 ? { opacity: 0.85, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <defs>
              <linearGradient id="bookPage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>
            </defs>
            <path
              d="M55 18 C 35 8, 8 10, 4 22 L 4 70 C 8 60, 35 58, 55 68 Z"
              fill="url(#bookPage)"
              opacity="0.95"
            />
            <path
              d="M55 18 C 75 8, 102 10, 106 22 L 106 70 C 102 60, 75 58, 55 68 Z"
              fill="url(#bookPage)"
              opacity="0.95"
            />
            <line x1="55" y1="18" x2="55" y2="68" stroke="#0F2346" strokeWidth="1.5" opacity="0.6" />
            {[24, 32, 40, 48].map((y) => (
              <g key={y}>
                <line x1="12" y1={y} x2="48" y2={y - 2} stroke="#0F2346" strokeWidth="0.7" opacity="0.45" />
                <line x1="62" y1={y - 2} x2="98" y2={y} stroke="#0F2346" strokeWidth="0.7" opacity="0.45" />
              </g>
            ))}
          </motion.svg>

          {/* Graduation cap */}
          <motion.svg
            viewBox="0 0 100 80"
            className="w-[8vw] h-[6.4vw]"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 2 ? { opacity: 0.9, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <path d="M50 12 L 96 30 L 50 48 L 4 30 Z" fill="#CBD5E1" />
            <path
              d="M22 38 L 22 56 C 22 62, 78 62, 78 56 L 78 38"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="3.5"
            />
            <path d="M88 32 L 88 56" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="88" cy="60" r="3" fill="#D4A24C" />
            <path d="M88 60 L 84 70" stroke="#D4A24C" strokeWidth="1.5" />
            <path d="M88 60 L 92 70" stroke="#D4A24C" strokeWidth="1.5" />
          </motion.svg>

          {/* Clock — same as Video 4 hook for series continuity */}
          <div className="relative w-[6vw] h-[6vw]">
            <div
              className="absolute inset-0 rounded-full border-[0.25vw]"
              style={{
                borderColor: '#94A3B8',
                background: 'rgba(255,255,255,0.04)',
              }}
            />
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

        {/* Audience pills */}
        <motion.div
          className="mt-[2.8vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {['Students', 'Parents', 'Schools', 'HR & recruiters'].map((label, i) => (
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
          className="mt-[2.6vw] text-[1.55vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Students wait. Parents worry.{' '}
          <span style={{ color: '#94A3B8' }} className="font-bold">
            Recruiters can't verify.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
