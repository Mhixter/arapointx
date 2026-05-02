import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Slip = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  premium?: boolean;
};

const SLIPS: Slip[] = [
  { id: 'standard', name: 'Standard', tagline: 'For everyday applications',     accent: '#6DB33F' },
  { id: 'premium',  name: 'Premium',  tagline: 'Identity-card-grade finish',    accent: '#D4A24C', premium: true },
  { id: 'long',     name: 'Long',     tagline: 'Full record on a single page',  accent: '#6DB33F' },
];

const PREMIUM_INDEX = SLIPS.findIndex(s => s.premium);

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // title
      setTimeout(() => setPhase(2), 1500),   // slips animate in
      setTimeout(() => setPhase(3), 7500),   // highlight pass starts
      setTimeout(() => setPhase(4), 17500),  // premium gold border emphasis
      setTimeout(() => setPhase(5), 22000),  // bottom caption
      setTimeout(() => setPhase(6), 25500),  // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Index of currently highlighted slip (cycles 0..N-1 over ~10s after phase 3)
  const [highlight, setHighlight] = useState(-1);
  useEffect(() => {
    if (phase < 3) return;
    if (phase >= 4) {
      setHighlight(PREMIUM_INDEX); // lock on Premium
      return;
    }
    const max = SLIPS.length - 1;
    const interval = setInterval(() => {
      setHighlight((h) => (h >= max ? 0 : h + 1));
    }, 1500);
    setHighlight(0);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-nigeria-map.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[88vw]">
        {/* Title */}
        <motion.div
          className="text-[1.2vw] tracking-[0.4em] text-[#6DB33F] uppercase font-semibold mb-[0.8vw]"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Choose your slip
        </motion.div>
        <motion.h2
          className="text-[3.4vw] font-black text-white text-center leading-[1.05] mb-[3vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Three formats. <span className="text-[#D4A24C]">One identity.</span>
        </motion.h2>

        {/* Slip row */}
        <div className="flex gap-[1.8vw] justify-center items-end" style={{ perspective: 1600 }}>
          {SLIPS.map((slip, i) => {
            const isHighlight = highlight === i;
            const isPremiumLock = phase >= 4 && slip.premium;
            return (
              <motion.div
                key={slip.id}
                className="relative w-[20vw] h-[28vw] rounded-[0.8vw] overflow-hidden shadow-[0_25px_60px_-25px_rgba(0,0,0,0.8)]"
                style={{
                  background:
                    'linear-gradient(160deg, #F5F0E2 0%, #EFE7D2 60%, #E5DBC0 100%)',
                  transformStyle: 'preserve-3d',
                }}
                initial={{ opacity: 0, y: 60, rotateY: 25 }}
                animate={
                  phase >= 2
                    ? {
                        opacity: 1,
                        y: isHighlight ? -16 : 0,
                        rotateY: 0,
                        scale: isPremiumLock ? 1.06 : isHighlight ? 1.04 : 1,
                      }
                    : { opacity: 0, y: 60, rotateY: 25 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 110,
                  damping: 18,
                  delay: phase >= 2 && phase < 3 ? i * 0.18 : 0,
                }}
              >
                {/* Top header bar (navy) */}
                <div className="h-[3vw] bg-[#0F2346] flex items-center justify-between px-[0.9vw] border-b-2" style={{ borderColor: slip.accent }}>
                  <div
                    className="text-[0.8vw] tracking-[0.32em] font-bold text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    ARAPOINT
                  </div>
                  <div className="text-[0.7vw] tracking-[0.25em] font-semibold text-white/70" style={{ fontFamily: "'Inter', sans-serif" }}>
                    NIN SLIP
                  </div>
                </div>

                {/* Guilloché lines on slip */}
                <svg
                  className="absolute top-[3vw] left-0 right-0 h-[25vw] w-full opacity-25"
                  viewBox="0 0 200 230"
                  preserveAspectRatio="none"
                >
                  {Array.from({ length: 22 }).map((_, j) => (
                    <path
                      key={j}
                      d={`M0,${15 + j * 9} Q50,${5 + j * 8} 100,${15 + j * 9} T200,${15 + j * 9}`}
                      stroke={slip.accent}
                      strokeWidth="0.3"
                      fill="none"
                      opacity="0.6"
                    />
                  ))}
                </svg>

                {/* Body */}
                <div className="relative px-[1vw] pt-[1vw] flex flex-col gap-[0.5vw]">
                  {/* Photo strip */}
                  <div className="flex gap-[0.8vw] items-start">
                    <div className="w-[5vw] h-[6vw] rounded-[0.3vw] bg-gradient-to-br from-[#0F2346]/15 to-[#0F2346]/5 border border-[#0F2346]/20 flex items-center justify-center">
                      <div
                        className="text-[1.7vw] font-black text-[#0F2346]/80"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        AO
                      </div>
                    </div>
                    <div className="flex-1 mt-[0.3vw]">
                      <div className="text-[0.7vw] tracking-[0.25em] uppercase text-[#0F2346]/60 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Holder
                      </div>
                      <div className="text-[1vw] font-bold text-[#0F2346] leading-tight mt-[0.1vw]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        ADAEZE<br />OKONKWO
                      </div>
                    </div>
                  </div>

                  {/* Field rows */}
                  <div className="mt-[0.6vw] grid grid-cols-2 gap-y-[0.4vw] gap-x-[0.5vw]">
                    {[
                      ['DOB', '14/03/92'],
                      ['SEX', 'F'],
                      ['LGA', 'IDEMILI'],
                      ['STATE', 'ANAMBRA'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[0.55vw] tracking-[0.25em] uppercase text-[#0F2346]/55 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {k}
                        </div>
                        <div className="text-[0.9vw] font-bold text-[#0F2346]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* NIN */}
                  <div className="mt-[0.4vw]">
                    <div className="text-[0.55vw] tracking-[0.3em] uppercase text-[#0F2346]/55 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                      NIN
                    </div>
                    <div className="text-[1.1vw] font-bold text-[#0F2346] tracking-[0.12em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      1234 5678 901
                    </div>
                  </div>

                  {/* Long-format extra rows */}
                  {slip.id === 'long' && (
                    <div className="mt-[0.3vw] grid grid-cols-2 gap-y-[0.3vw] gap-x-[0.5vw]">
                      {[
                        ['NATIONALITY', 'NIGERIAN'],
                        ['ISSUED', '02/05/19'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[0.5vw] tracking-[0.22em] uppercase text-[#0F2346]/55 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {k}
                          </div>
                          <div className="text-[0.8vw] font-bold text-[#0F2346]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Holographic motif on premium */}
                  {slip.premium && (
                    <div className="absolute bottom-[1.2vw] right-[0.8vw] w-[3.4vw] h-[3.4vw] rounded-full">
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background:
                            'conic-gradient(from 0deg, #D4A24C, #6DB33F, #1C3A6B, #D4A24C)',
                          opacity: 0.7,
                          filter: 'blur(2px)',
                        }}
                      />
                      <div className="absolute inset-[0.4vw] rounded-full bg-white/40 backdrop-blur-sm border border-white/60 flex items-center justify-center">
                        <div
                          className="text-[0.75vw] font-black text-[#0F2346]"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          AP
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom name banner (no pricing — out of scope) */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.4vw] flex flex-col items-center justify-center px-[0.9vw] border-t border-[#0F2346]/15 bg-white/55">
                  <div
                    className="text-[0.95vw] font-black tracking-[0.05em]"
                    style={{ color: slip.accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {slip.name.toUpperCase()}
                  </div>
                  <div
                    className="text-[0.6vw] tracking-[0.18em] uppercase text-[#0F2346]/65 font-semibold mt-[0.05vw]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {slip.tagline}
                  </div>
                </div>

                {/* Highlight glow */}
                <motion.div
                  className="absolute inset-0 rounded-[0.8vw] pointer-events-none"
                  style={{
                    boxShadow: isPremiumLock
                      ? `0 0 0 3px #D4A24C, 0 0 50px 6px rgba(212,162,76,0.5)`
                      : isHighlight
                      ? `0 0 0 2px ${slip.accent}, 0 0 30px 4px ${slip.accent}55`
                      : '0 0 0 0px transparent',
                  }}
                  animate={{ opacity: isPremiumLock || isHighlight ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Bottom caption */}
        <motion.div
          className="mt-[2.5vw] text-[1.5vw] text-white/85 text-center max-w-[60vw] leading-snug"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          From everyday verification to <span className="text-[#D4A24C] font-bold">identity-card-grade</span> — pick the slip that fits the moment.
        </motion.div>
      </div>
    </motion.div>
  );
}
