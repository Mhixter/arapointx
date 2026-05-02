import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — SLA timer & accountability.
 *
 * Big animated countdown ring on the left, accountability points on the right.
 * Soft amber/red ambient lights up to communicate "the clock is honest".
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);
  // Animated ring progress (0 → 1) and remaining seconds.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + ring shell
      setTimeout(() => setPhase(2), 2400),   // ring starts running
      setTimeout(() => setPhase(3), 4400),   // accountability item 1
      setTimeout(() => setPhase(4), 5800),   // item 2
      setTimeout(() => setPhase(5), 7200),   // item 3
      setTimeout(() => setPhase(6), 9400),   // closing line
      setTimeout(() => setPhase(7), 13400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    const start = performance.now();
    const duration = 7000; // ring fills over ~7s
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Radius for the SVG ring; circumference = 2πr
  const R = 44;
  const C = 2 * Math.PI * R;

  // Show "remaining" timer counting down from 15:00 → ~04:30
  const totalSec = 15 * 60;
  const remainingSec = Math.max(0, Math.round(totalSec * (1 - progress * 0.7)));
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  const accountability = [
    {
      title: 'Customers get the speed they were promised',
      sub: 'Every job has a published SLA window — visible to both sides.',
      revealAt: 3,
    },
    {
      title: 'Agents get a fair, transparent track record',
      sub: 'Your on-time rate is measured the same way for everyone.',
      revealAt: 4,
    },
    {
      title: 'Reliable agents see more jobs, sooner',
      sub: 'The feed surfaces work to agents who deliver.',
      revealAt: 5,
    },
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
            'radial-gradient(ellipse at 30% 35%, rgba(252,165,165,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.42) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[4vw] w-[84vw]">
        {/* SLA ring */}
        <motion.div
          className="relative flex-shrink-0 w-[26vw] h-[26vw] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
            <defs>
              <linearGradient id="slaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FCA5A5" />
                <stop offset="60%" stopColor="#D4A24C" />
                <stop offset="100%" stopColor="#6DB33F" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="url(#slaGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ filter: 'drop-shadow(0 0 12px rgba(212,162,76,0.6))' }}
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center">
            <div
              className="text-[0.85vw] tracking-[0.4em] uppercase font-bold"
              style={{ color: '#FCA5A5', fontFamily: "'Inter', sans-serif" }}
            >
              SLA · remaining
            </div>
            <div
              className="text-[5.4vw] font-black text-white leading-none mt-[0.4vw]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {mm}:{ss}
            </div>
            <div
              className="text-[0.85vw] text-white/65 mt-[0.4vw]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ARP-83401 · NIN
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#FCA5A5', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            SLA · accountability
          </motion.div>

          <motion.h2
            className="text-[3vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            The clock keeps{' '}
            <span style={{ color: '#FCA5A5' }}>everyone honest.</span>
          </motion.h2>

          <div className="mt-[1.4vw] flex flex-col gap-[0.7vw]">
            {accountability.map((a) => (
              <motion.div
                key={a.title}
                className="flex items-start gap-[0.9vw] rounded-[0.6vw] px-[1vw] py-[0.9vw]"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: '1px solid rgba(252,165,165,0.32)',
                }}
                initial={{ opacity: 0, x: 18 }}
                animate={phase >= a.revealAt ? { opacity: 1, x: 0 } : { opacity: 0, x: 18 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw] flex items-center justify-center text-[0.85vw] font-black flex-shrink-0"
                  style={{
                    background: 'rgba(252,165,165,0.18)',
                    border: '1px solid rgba(252,165,165,0.55)',
                    color: '#FCA5A5',
                  }}
                >
                  ⏱
                </div>
                <div className="flex-1">
                  <div
                    className="text-[1.2vw] font-bold text-white leading-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {a.title}
                  </div>
                  <div
                    className="text-[0.85vw] text-white/65 mt-[0.15vw]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {a.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-[1.4vw] text-[1.3vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Show up on time —{' '}
            <span style={{ color: '#A7E07A' }} className="font-bold">
              the platform notices.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
