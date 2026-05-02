import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — Sandbox vs Production.
 *
 * Real env mode source: Arapoint/server/src/api/routes/developer/profile.ts
 *   PATCH /api/v1/developer/mode  (toggles environmentMode = 'sandbox' | 'live')
 * The same API key works in both modes — the toggle decides which backend
 * is hit and whether the wallet is charged.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2400),   // SANDBOX panel highlighted
      setTimeout(() => setPhase(3), 6800),   // toggle flips
      setTimeout(() => setPhase(4), 7800),   // PRODUCTION panel highlighted
      setTimeout(() => setPhase(5), 11800),  // closing line
      setTimeout(() => setPhase(6), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const sandboxFeatures = [
    'Deterministic mock data',
    'No wallet charges',
    'Higher burst limits',
  ];
  const productionFeatures = [
    'Real registry lookups',
    'Per-call billing from wallet',
    'Audit-grade logging',
  ];

  // Whether the toggle is "live" (true) or "sandbox" (false)
  const onLive = phase >= 3;

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
            'radial-gradient(ellipse at 25% 30%, rgba(252,211,77,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 70%, rgba(167,224,122,0.10) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[84vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
          style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          // PATCH /api/v1/developer/mode
        </motion.div>

        <motion.h2
          className="text-[3.2vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Sandbox to production —{' '}
          <span style={{ color: '#A7E07A' }}>no rewrite.</span>
        </motion.h2>

        {/* Toggle */}
        <motion.div
          className="mt-[2vw] relative w-[24vw] h-[3.4vw] rounded-full p-[0.3vw]"
          style={{
            background: 'rgba(15,27,46,0.85)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {/* Knob */}
          <motion.div
            className="absolute top-[0.3vw] h-[2.8vw] w-[11.7vw] rounded-full flex items-center justify-center"
            style={{
              background: onLive
                ? 'linear-gradient(135deg, #6DB33F, #4F8B23)'
                : 'linear-gradient(135deg, #FCD34D, #B45309)',
              boxShadow: onLive
                ? '0 6px 18px -4px rgba(109,179,63,0.6)'
                : '0 6px 18px -4px rgba(252,211,77,0.55)',
              left: onLive ? 'calc(100% - 11.7vw - 0.3vw)' : '0.3vw',
            }}
            animate={{ left: onLive ? 'calc(100% - 11.7vw - 0.3vw)' : '0.3vw' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-[1.1vw] font-black tracking-[0.24em] text-white"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {onLive ? 'LIVE' : 'SANDBOX'}
            </span>
          </motion.div>
          {/* Off-state labels */}
          <div className="absolute inset-0 flex items-center justify-between px-[2vw] pointer-events-none">
            <span
              className="text-[0.95vw] font-black tracking-[0.24em]"
              style={{
                color: onLive ? '#FCD34D' : 'transparent',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SANDBOX
            </span>
            <span
              className="text-[0.95vw] font-black tracking-[0.24em]"
              style={{
                color: onLive ? 'transparent' : '#A7E07A',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              LIVE
            </span>
          </div>
        </motion.div>

        {/* Two panels */}
        <div className="mt-[2vw] grid grid-cols-2 gap-[1.4vw] w-full">
          {/* Sandbox panel */}
          <motion.div
            className="rounded-[0.8vw] p-[1.4vw]"
            style={{
              background: 'rgba(15,27,46,0.55)',
              border: `1px solid ${!onLive && phase >= 2 ? 'rgba(252,211,77,0.85)' : 'rgba(252,211,77,0.30)'}`,
              boxShadow: !onLive && phase >= 2 ? '0 14px 34px -14px rgba(252,211,77,0.55)' : 'none',
              transition: 'all 0.4s ease',
              opacity: !onLive && phase >= 2 ? 1 : 0.55,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: !onLive ? 1 : 0.55, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-[0.6vw] mb-[0.8vw]">
              <div
                className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw] flex items-center justify-center text-[0.85vw] font-black"
                style={{
                  background: 'linear-gradient(135deg, #FCD34D, #B45309)',
                  color: '#0A1628',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                SBX
              </div>
              <div
                className="text-[1.4vw] font-black text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Sandbox
              </div>
              <div
                className="ml-auto text-[0.78vw] tracking-[0.22em] uppercase font-bold"
                style={{ color: '#FCD34D', fontFamily: "'JetBrains Mono', monospace" }}
              >
                ARAPOINT-SANDBOX
              </div>
            </div>
            <ul className="flex flex-col gap-[0.4vw]">
              {sandboxFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-[0.5vw] text-[1vw] text-white/85"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span style={{ color: '#FCD34D' }}>›</span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Production panel */}
          <motion.div
            className="rounded-[0.8vw] p-[1.4vw]"
            style={{
              background: 'rgba(15,27,46,0.55)',
              border: `1px solid ${onLive && phase >= 4 ? 'rgba(167,224,122,0.85)' : 'rgba(167,224,122,0.30)'}`,
              boxShadow: onLive && phase >= 4 ? '0 14px 34px -14px rgba(167,224,122,0.55)' : 'none',
              transition: 'all 0.4s ease',
              opacity: onLive && phase >= 4 ? 1 : 0.55,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: onLive ? 1 : 0.55, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-[0.6vw] mb-[0.8vw]">
              <div
                className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw] flex items-center justify-center text-[0.85vw] font-black"
                style={{
                  background: 'linear-gradient(135deg, #6DB33F, #4F8B23)',
                  color: 'white',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                LIVE
              </div>
              <div
                className="text-[1.4vw] font-black text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Production
              </div>
              <div
                className="ml-auto text-[0.78vw] tracking-[0.22em] uppercase font-bold"
                style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                ARAPOINT
              </div>
            </div>
            <ul className="flex flex-col gap-[0.4vw]">
              {productionFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-[0.5vw] text-[1vw] text-white/85"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span style={{ color: '#A7E07A' }}>›</span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.6vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Same key. Same code.{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">
            Real money only when you say so.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
