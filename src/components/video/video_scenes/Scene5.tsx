import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Unified verification + bundle discount.
 *
 * Real prices from Arapoint/server/src/api/routes/developer/shared.ts
 *   nin: 130, bvn: 80, education: 250, unified: 400
 * Three-call total: 460. Unified call: 400. Saves ₦60 per request (~13%).
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2400),   // 3 separate calls fly in
      setTimeout(() => setPhase(3), 5400),   // sum line drops in
      setTimeout(() => setPhase(4), 7400),   // unified replacement
      setTimeout(() => setPhase(5), 9200),   // savings tally rolls
      setTimeout(() => setPhase(6), 13800),  // closing line
      setTimeout(() => setPhase(7), 17400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Animate the savings counter from 0 → 60.
  useEffect(() => {
    if (phase < 5) return;
    const start = performance.now();
    const duration = 1800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCounted(Math.round(60 * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const calls = [
    { endpoint: 'POST /verify/nin',       price: 130, tone: '#22D3EE' },
    { endpoint: 'POST /verify/bvn',       price:  80, tone: '#A78BFA' },
    { endpoint: 'POST /verify/education', price: 250, tone: '#FCD34D' },
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
            'radial-gradient(ellipse at 50% 30%, rgba(167,224,122,0.12) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
          style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          // POST /api/v1/developer/verify/unified
        </motion.div>

        <motion.h2
          className="text-[3.2vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Three checks.{' '}
          <span style={{ color: '#A7E07A' }}>One call.</span>
        </motion.h2>

        <div className="mt-[2vw] grid grid-cols-2 gap-[2vw] w-full items-start">
          {/* Left: 3 separate calls + sum */}
          <div className="flex flex-col gap-[0.8vw]">
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
            >
              Without unified
            </div>
            {calls.map((c, i) => (
              <motion.div
                key={c.endpoint}
                className="rounded-[0.5vw] px-[1vw] py-[0.7vw] flex items-center justify-between"
                style={{
                  background: 'rgba(15,27,46,0.55)',
                  border: `1px solid ${c.tone}55`,
                  opacity: phase >= 4 ? 0.45 : 1,
                  transition: 'opacity 0.6s ease',
                }}
                initial={{ opacity: 0, x: -16 }}
                animate={phase >= 2 ? { opacity: phase >= 4 ? 0.45 : 1, x: 0 } : { opacity: 0, x: -16 }}
                transition={{ delay: 0.18 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="text-[1vw]"
                  style={{ color: c.tone, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {c.endpoint}
                </div>
                <div
                  className="text-[1.1vw] font-black"
                  style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₦{c.price}
                </div>
              </motion.div>
            ))}
            <motion.div
              className="rounded-[0.5vw] px-[1vw] py-[0.8vw] flex items-center justify-between mt-[0.4vw]"
              style={{
                background: 'rgba(252,165,165,0.12)',
                border: '1.5px solid rgba(252,165,165,0.55)',
                opacity: phase >= 4 ? 0.5 : 1,
                transition: 'opacity 0.6s ease',
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 3 ? { opacity: phase >= 4 ? 0.5 : 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="text-[1vw] tracking-[0.18em] font-bold"
                style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
              >
                3 calls · 3 envelopes
              </div>
              <div
                className="text-[1.4vw] font-black"
                style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
              >
                ₦460
              </div>
            </motion.div>
          </div>

          {/* Right: unified call */}
          <div className="flex flex-col gap-[0.8vw]">
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
            >
              With unified
            </div>
            <motion.div
              className="rounded-[0.6vw] p-[1.4vw]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(167,224,122,0.16) 0%, rgba(15,27,46,0.55) 60%)',
                border: '1.5px solid rgba(167,224,122,0.65)',
                boxShadow: '0 18px 40px -16px rgba(167,224,122,0.50)',
              }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-[1.1vw]"
                  style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  POST /verify/unified
                </div>
                <div
                  className="text-[2.4vw] font-black leading-none"
                  style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₦400
                </div>
              </div>
              <div
                className="mt-[0.6vw] text-[0.85vw]"
                style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {`{ "nin": "...", "bvn": "...", "education": { ... } }`}
              </div>
              <div className="mt-[0.8vw] flex flex-wrap gap-[0.5vw]">
                {['NIN', 'BVN', 'Education'].map((s) => (
                  <div
                    key={s}
                    className="px-[0.7vw] py-[0.3vw] rounded-full text-[0.75vw] font-bold tracking-[0.18em]"
                    style={{
                      background: 'rgba(167,224,122,0.20)',
                      border: '1px solid rgba(167,224,122,0.55)',
                      color: '#A7E07A',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    ✓ {s}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Savings tally */}
            <motion.div
              className="rounded-[0.6vw] p-[1.2vw] flex items-center justify-between"
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,162,76,0.16) 0%, rgba(15,27,46,0.55) 60%)',
                border: '1.5px solid rgba(212,162,76,0.65)',
                boxShadow: '0 14px 30px -14px rgba(212,162,76,0.45)',
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div
                  className="text-[0.78vw] tracking-[0.32em] uppercase font-bold"
                  style={{ color: '#F5C977', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  saved per request
                </div>
                <div
                  className="text-[2.6vw] font-black leading-none mt-[0.2vw]"
                  style={{ color: '#FFE9B0', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₦{counted}
                </div>
              </div>
              <div
                className="text-[1vw] text-white/65"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ~13% bundle
              </div>
            </motion.div>
          </div>
        </div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.4vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          One request, one bill —{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">
            every signal you need.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
