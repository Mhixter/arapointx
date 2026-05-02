import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BrandFooter } from '../BrandFooter';

/**
 * Scene 6 — Recap + brand close.
 *
 * Recap of the 4 production pillars: backoff, idempotency, observability,
 * key rotation. Then dissolves into the BrandFooter outro.
 *
 * Allotted: 25_000 ms.
 */
export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // recap header
      setTimeout(() => setPhase(2), 1200),   // pillars in
      setTimeout(() => setPhase(3), 7400),   // recap exits, brand starts
      setTimeout(() => setPhase(4), 24500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const pillars = [
    { name: 'Retry-with-backoff', tone: '#FCA5A5', desc: 'pace your client around X-RateLimit headers' },
    { name: 'Idempotency keys',   tone: '#A78BFA', desc: 'safe retries · 24-hour replay window' },
    { name: 'Live observability', tone: '#22D3EE', desc: '/developer/analytics + /developer/logs' },
    { name: 'Zero-downtime keys', tone: '#A7E07A', desc: 'mint, deploy, revoke — never drop a call' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      {/* Recap */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-[6vw]"
        initial={{ opacity: 0 }}
        animate={phase >= 1 && phase < 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
        >
          // production checklist
        </div>
        <h2
          className="text-[3vw] font-black text-white tracking-tight text-center leading-[1.05] mb-[1.6vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Four pillars. <span style={{ color: '#A7E07A' }}>One reliable API.</span>
        </h2>
        <div className="flex flex-col gap-[0.7vw] w-[58vw]">
          {pillars.map((e, i) => (
            <motion.div
              key={e.name}
              className="flex items-center gap-[1.2vw] px-[1.2vw] py-[0.7vw] rounded-[0.5vw]"
              style={{
                background: 'rgba(15,27,46,0.85)',
                border: `1px solid ${e.tone}66`,
              }}
              initial={{ opacity: 0, x: -16 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
              transition={{ delay: 0.16 * i, duration: 0.5 }}
            >
              <div
                className="px-[0.9vw] py-[0.3vw] rounded-full text-[1vw] font-bold"
                style={{
                  background: `${e.tone}1A`,
                  color: e.tone,
                  border: `1px solid ${e.tone}66`,
                  fontFamily: "'JetBrains Mono', monospace",
                  minWidth: '18vw',
                  textAlign: 'center',
                }}
              >
                {e.name}
              </div>
              <div
                className="text-[1.05vw] text-white/85"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {e.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Brand close */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.0 }}
      >
        <BrandFooter variant="full" delay={0.2} />
      </motion.div>
    </motion.div>
  );
}
