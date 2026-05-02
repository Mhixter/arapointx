import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const REAL_NIN = '12345678901';
const VNIN = 'AB12-CD34-EF56-7890';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // title
      setTimeout(() => setPhase(2), 1800),  // real NIN visible
      setTimeout(() => setPhase(3), 4200),  // shield sweeps across
      setTimeout(() => setPhase(4), 5400),  // vNIN replaces visible NIN
      setTimeout(() => setPhase(5), 8000),  // verification check
      setTimeout(() => setPhase(6), 11500), // vault badge for real NIN
      setTimeout(() => setPhase(7), 17500), // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 opacity-15 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/shield-badge.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[1.2vw] tracking-[0.4em] text-[#6DB33F] uppercase font-semibold mb-[1vw]"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Privacy by default
        </motion.div>

        <motion.h2
          className="text-[3.4vw] font-black text-white text-center leading-[1.05] mb-[3vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Your real NIN stays private.
        </motion.h2>

        {/* Display panel: real NIN morphs into vNIN */}
        <div className="relative w-[55vw] h-[12vw] flex items-center justify-center mb-[2.5vw]">
          {/* Frame */}
          <div className="absolute inset-0 rounded-[1vw] border border-white/15 bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-md" />

          {/* Real NIN */}
          <motion.div
            className="absolute text-[4.5vw] font-bold text-white tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            initial={{ opacity: 0 }}
            animate={
              phase >= 4
                ? { opacity: 0 }
                : phase >= 2
                ? { opacity: 1 }
                : { opacity: 0 }
            }
            transition={{ duration: 0.5 }}
          >
            {REAL_NIN}
          </motion.div>

          {/* vNIN */}
          <motion.div
            className="absolute text-[3.6vw] font-bold text-[#6DB33F] tracking-[0.18em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            {VNIN}
          </motion.div>

          {/* Sweeping shield bar */}
          {phase >= 3 && phase < 5 && (
            <motion.div
              className="absolute top-0 bottom-0 w-[6vw]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(109,179,63,0.5), rgba(109,179,63,0.85), rgba(109,179,63,0.5), transparent)',
              }}
              initial={{ left: '-10%' }}
              animate={{ left: '110%' }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* Verification check */}
          <motion.div
            className="absolute -right-[3.5vw] top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] rounded-full bg-[#6DB33F] flex items-center justify-center shadow-[0_0_30px_rgba(109,179,63,0.5)]"
            initial={{ scale: 0, rotate: -90 }}
            animate={phase >= 5 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <svg viewBox="0 0 24 24" className="w-[2.4vw] h-[2.4vw]" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>

        {/* Bottom row: vaulted real NIN + caption */}
        <div className="flex items-center gap-[2.5vw] w-full justify-center">
          <motion.div
            className="flex items-center gap-[1vw] px-[1.4vw] py-[1vw] rounded-[0.7vw] bg-[#0A1628]/80 border border-white/15"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 6 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-[2.6vw] h-[2.6vw] rounded-md bg-[#1C3A6B] border border-[#D4A24C]/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.4vw] h-[1.4vw]" fill="none" stroke="#D4A24C" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              </svg>
            </div>
            <div>
              <div className="text-[0.85vw] tracking-[0.3em] uppercase text-[#D4A24C] font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                Vaulted
              </div>
              <div className="text-[1.3vw] text-white font-bold tracking-[0.18em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ••• ••• ••• ••
              </div>
            </div>
          </motion.div>

          <motion.div
            className="text-[1.5vw] text-white/85 max-w-[35vw] leading-snug"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 6 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Share a <span className="text-[#6DB33F] font-bold">vNIN</span> with banks, telcos, and employers — it expires, your real number doesn&rsquo;t.
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
