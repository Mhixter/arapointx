import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — "Friday at 3pm" hook.
 *
 * A live request-rate sparkline climbs from a calm baseline into a steep
 * spike while a clock face shows the time crossing 14:55 → 15:00. Three
 * scenario chips fade in (traffic spike / mass onboarding / payment flow),
 * then the headline lands: "Friday at 3pm. Are you ready?"
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 7600),
      setTimeout(() => setPhase(4), 9700),
      setTimeout(() => setPhase(5), 12300),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Animated rps sparkline: calm baseline then steep spike.
  useEffect(() => {
    if (phase < 2) return;
    const sequence = [
      8, 9, 7, 10, 8, 11, 9, 12, 10, 14, 17, 22, 31, 44, 58, 74, 89, 102, 118, 132,
    ];
    const ids: ReturnType<typeof setTimeout>[] = [];
    sequence.forEach((v, i) => {
      ids.push(setTimeout(() => setPoints((prev) => [...prev, v]), 220 + i * 290));
    });
    return () => ids.forEach((t) => clearTimeout(t));
  }, [phase]);

  const W = 56; // viewBox width (vw-ish)
  const H = 18; // viewBox height
  const max = 140;
  const path = points.length === 0
    ? ''
    : points
        .map((v, i) => {
          const x = (i / 19) * W;
          const y = H - (v / max) * H;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

  const scenarios = [
    { label: 'Traffic spike',     tone: '#22D3EE' },
    { label: 'Mass onboarding',   tone: '#A78BFA' },
    { label: 'Friday payouts',    tone: '#FCD34D' },
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
          // for builders · part 3
        </motion.div>

        {/* Live monitor card */}
        <motion.div
          className="relative w-[60vw] rounded-[0.8vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1px solid rgba(34,211,238,0.40)',
            boxShadow: '0 28px 70px -22px rgba(34,211,238,0.30)',
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.7vw] border-b border-white/10 bg-black/30">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FF5F56]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FFBD2E]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27C93F]" />
            <div className="ml-[1vw] text-[0.78vw] text-white/55" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              api.arapoint.com.ng — live monitor
            </div>
            <div className="ml-auto flex items-center gap-[0.5vw] text-[0.78vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <motion.span
                className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#FCA5A5]"
                animate={phase >= 2 ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-white/65">14:5{Math.min(9, points.length)} WAT</span>
            </div>
          </div>

          <div className="px-[1.4vw] py-[1.2vw] min-h-[20vw]">
            <div className="flex items-end justify-between mb-[1vw]">
              <div>
                <div className="text-[0.85vw] text-white/55 tracking-[0.18em] uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  requests / sec
                </div>
                <div className="text-[3.2vw] font-black text-white leading-none mt-[0.2vw]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {points.length > 0 ? points[points.length - 1] : 0}
                  <span className="text-[1.2vw] text-white/55 font-medium ml-[0.4vw]">rps</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.85vw] text-white/55 tracking-[0.18em] uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  burst limit
                </div>
                <div className="text-[1.5vw] font-bold text-[#FCA5A5] leading-none mt-[0.3vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  60 / min
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[10vw]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Burst-limit threshold (60/120 ≈ 43% from top) */}
              <line x1="0" y1={H - (60 / max) * H} x2={W} y2={H - (60 / max) * H} stroke="#FCA5A5" strokeWidth="0.08" strokeDasharray="0.4 0.4" opacity="0.7" />
              {path && (
                <>
                  <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#sparkFill)" />
                  <path d={path} fill="none" stroke="#22D3EE" strokeWidth="0.18" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
          </div>
        </motion.div>

        {/* Scenario chips */}
        <motion.div
          className="mt-[1.4vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {scenarios.map((p, i) => (
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
              ▲ {p.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-[1.6vw] text-[3.4vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Friday at 3pm.{' '}
          <span style={{ color: '#22D3EE' }}>Are you ready?</span>
        </motion.h1>

        <motion.div
          className="mt-[1vw] text-[1.3vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Arapoint API in{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">production.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
