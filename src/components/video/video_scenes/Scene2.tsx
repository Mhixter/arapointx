import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Map + agents across Nigeria.
 *
 * Abstract organic blob shape (NOT a real Nigeria geography — task brief
 * explicitly forbids precise reproduction). Animated agent pins drop across
 * the shape over time. Right column shows the network stats.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + map outline
      setTimeout(() => setPhase(2), 2200),   // first wave of pins
      setTimeout(() => setPhase(3), 4400),   // second wave
      setTimeout(() => setPhase(4), 6400),   // third wave
      setTimeout(() => setPhase(5), 8000),   // stats reveal
      setTimeout(() => setPhase(6), 12000),  // closing line
      setTimeout(() => setPhase(7), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Pins distributed across the abstract shape (percentage-based).
  // These are NOT geographic positions — they're aesthetic clusters.
  const pins = [
    { x: 28, y: 22, wave: 2 },
    { x: 60, y: 18, wave: 2 },
    { x: 42, y: 30, wave: 2 },
    { x: 72, y: 36, wave: 3 },
    { x: 22, y: 42, wave: 3 },
    { x: 50, y: 50, wave: 3 },
    { x: 36, y: 60, wave: 4 },
    { x: 64, y: 58, wave: 4 },
    { x: 48, y: 72, wave: 4 },
    { x: 30, y: 78, wave: 4 },
  ];

  const stats = [
    { value: '36', sub: 'states served' },
    { value: '4', sub: 'specializations' },
    { value: '24/7', sub: 'job feed' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(109,179,63,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3vw] w-[88vw]">
        {/* Abstract map column */}
        <motion.div
          className="relative w-[42vw] h-[34vw] flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Faint grid backdrop */}
          <div
            className="absolute inset-0 rounded-[1.4vw] opacity-30"
            style={{
              background:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4vw), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4vw)',
            }}
          />

          {/* Abstract organic blob — NOT a real Nigeria map */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="blobFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6DB33F" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#1C3A6B" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="blobStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6DB33F" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#A7E07A" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            {/*
              Soft, purposely-imprecise blob. Reads as "a country shape" without
              reproducing Nigeria's actual borders. Stays compliant with brief.
            */}
            <motion.path
              d="M 18 28 Q 14 18, 28 14 Q 42 8, 56 14 Q 72 12, 78 22 Q 88 30, 82 44 Q 86 58, 76 70 Q 64 82, 50 84 Q 36 88, 26 78 Q 14 68, 16 54 Q 12 40, 18 28 Z"
              fill="url(#blobFill)"
              stroke="url(#blobStroke)"
              strokeWidth="0.6"
              initial={{ pathLength: 0 }}
              animate={phase >= 1 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          {/* Map label */}
          <div
            className="absolute top-[1.2vw] left-[1.2vw] text-[0.8vw] tracking-[0.34em] uppercase font-bold"
            style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
          >
            Agents · across Nigeria
          </div>

          {/* Pins */}
          {pins.map((p, i) => {
            const visible = phase >= p.wave;
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -100%)',
                }}
                initial={{ opacity: 0, y: -16, scale: 0.6 }}
                animate={
                  visible
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: -16, scale: 0.6 }
                }
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 * i }}
              >
                {/* Pulse ring */}
                <motion.div
                  className="absolute left-1/2 top-full -translate-x-1/2 w-[2vw] h-[2vw] rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(109,179,63,0.55), rgba(109,179,63,0) 65%)',
                  }}
                  animate={visible ? { scale: [0.6, 1.6, 0.6], opacity: [0.55, 0, 0.55] } : {}}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                {/* Pin */}
                <div
                  className="relative w-[1vw] h-[1vw] rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #A7E07A, #4F8B23)',
                    boxShadow: '0 0 16px rgba(109,179,63,0.7), 0 4px 6px rgba(0,0,0,0.4)',
                    border: '1.5px solid white',
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            A national network
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Agents across Nigeria —{' '}
            <span style={{ color: '#6DB33F' }}>and there's room for more.</span>
          </motion.h2>

          <motion.p
            className="mt-[0.8vw] text-[1.2vw] text-white/70 leading-snug"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Real customers, real demand — every state, every day. The Arapoint network is built on people who show up.
          </motion.p>

          {/* Stats row */}
          <div className="mt-[1.6vw] grid grid-cols-3 gap-[0.9vw]">
            {stats.map((s, i) => (
              <motion.div
                key={s.sub}
                className="rounded-[0.6vw] px-[1vw] py-[1vw] flex flex-col"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: '1px solid rgba(109,179,63,0.4)',
                  boxShadow: '0 8px 22px -10px rgba(109,179,63,0.35)',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 0.15 * i, duration: 0.55 }}
              >
                <div
                  className="text-[2.4vw] font-black text-white leading-none"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[0.78vw] tracking-[0.24em] uppercase font-semibold mt-[0.4vw]"
                  style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
                >
                  {s.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.6vw] text-[1.4vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Wherever you are —{' '}
            <span style={{ color: '#6DB33F' }} className="font-bold">
              there's work to claim.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
