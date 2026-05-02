import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — Developer hook.
 *
 * Dark terminal aesthetic. Blinking cursor types out a developer's question,
 * three pain-point chips fade in, then the headline lands.
 *
 * Allotted: 15_000 ms. All phase timers stay <= 14_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');
  const target = '$ verify --nin --bvn --education --once';

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // terminal frame
      setTimeout(() => setPhase(2), 1200),   // typing starts
      setTimeout(() => setPhase(3), 5400),   // pain chips
      setTimeout(() => setPhase(4), 8200),   // headline
      setTimeout(() => setPhase(5), 11600),  // closing line
      setTimeout(() => setPhase(6), 14400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  const pains = [
    { label: 'Scattered providers', tone: '#FCA5A5' },
    { label: 'Inconsistent JSON', tone: '#FCD34D' },
    { label: 'Three keys, three bills', tone: '#A78BFA' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 95%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Eyebrow */}
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          // for builders
        </motion.div>

        {/* Terminal */}
        <motion.div
          className="relative w-[58vw] rounded-[0.8vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1px solid rgba(34,211,238,0.40)',
            boxShadow: '0 28px 70px -22px rgba(34,211,238,0.30)',
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header bar */}
          <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.7vw] border-b border-white/10 bg-black/30">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FF5F56]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FFBD2E]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27C93F]" />
            <div
              className="ml-[1vw] text-[0.78vw] text-white/55"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ~/arapoint — zsh
            </div>
          </div>
          {/* Prompt */}
          <div className="px-[1.4vw] py-[1.6vw] min-h-[5vw]">
            <div
              className="text-[1.45vw] leading-relaxed"
              style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {typed}
              <motion.span
                className="inline-block w-[0.6vw] h-[1.4vw] align-middle ml-[0.15vw]"
                style={{ background: '#A7E07A', verticalAlign: '-0.15vw' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>

        {/* Pain chips */}
        <motion.div
          className="mt-[1.6vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {pains.map((p, i) => (
            <motion.div
              key={p.label}
              className="px-[1.1vw] py-[0.5vw] rounded-full text-[1vw] font-semibold"
              style={{
                background: 'rgba(15,27,46,0.85)',
                border: `1px solid ${p.tone}88`,
                color: p.tone,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.18 * i, duration: 0.5 }}
            >
              ✗ {p.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-[2.2vw] text-[3.6vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          One API.{' '}
          <span style={{ color: '#22D3EE' }}>One JSON shape.</span>{' '}
          Every check.
        </motion.h1>

        {/* Closing line */}
        <motion.div
          className="mt-[1.4vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          The Arapoint{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">
            Developer API.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
