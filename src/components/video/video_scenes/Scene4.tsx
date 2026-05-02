import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — Earn while you transact (commission earnings).
 *
 * Warm gold ambient. Big eased counter rolls up "Commissions Earned"; small
 * earn-back cards stack as transactions complete. Numbers are illustrative
 * examples only — task brief explicitly forbids implying guaranteed earnings.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [earned, setEarned] = useState(0);
  const targetEarned = 1240; // ₦1,240.00 illustrative example only

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2400),   // earn-back card 1
      setTimeout(() => setPhase(3), 4200),   // counter starts rolling
      setTimeout(() => setPhase(4), 5400),   // earn-back card 2
      setTimeout(() => setPhase(5), 7400),   // earn-back card 3
      setTimeout(() => setPhase(6), 9400),   // earn-back card 4
      setTimeout(() => setPhase(7), 11800),  // closing line
      setTimeout(() => setPhase(8), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 3) return;
    const start = performance.now();
    const duration = 4800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setEarned(Math.round(targetEarned * eased * 100) / 100);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const earnCards = [
    { service: 'NIN Verification', back: '+₦8.00',  revealAt: 2 },
    { service: 'BVN Retrieval',    back: '+₦12.00', revealAt: 4 },
    { service: 'WAEC Checker PIN', back: '+₦140.00', revealAt: 5 },
    { service: 'IPE Clearance',    back: '+₦600.00', revealAt: 6 },
  ];

  const formatNaira = (v: number) =>
    `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            'radial-gradient(ellipse at 50% 30%, rgba(212,162,76,0.16) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Commissions · the part most people love
        </motion.div>

        <motion.h2
          className="text-[3.6vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Arapoint pays you back —{' '}
          <span style={{ color: '#D4A24C' }}>straight into your wallet.</span>
        </motion.h2>

        {/* Big counter card */}
        <motion.div
          className="mt-[2.4vw] w-[60vw] rounded-[1vw] px-[2.4vw] py-[1.6vw] flex items-center justify-between"
          style={{
            background:
              'linear-gradient(135deg, rgba(212,162,76,0.16) 0%, rgba(15,35,70,0.55) 60%)',
            border: '1px solid rgba(212,162,76,0.55)',
            boxShadow: '0 30px 80px -20px rgba(212,162,76,0.35)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <div
              className="text-[0.85vw] tracking-[0.34em] uppercase font-bold"
              style={{ color: '#F5C977', fontFamily: "'Inter', sans-serif" }}
            >
              Commissions earned · this month
            </div>
            <div
              className="mt-[0.2vw] text-[4.4vw] font-black tracking-tight"
              style={{
                color: '#FFE9B0',
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: '0 2px 30px rgba(212,162,76,0.45)',
              }}
            >
              {formatNaira(earned)}
            </div>
            <div
              className="text-[0.85vw] text-white/55 mt-[0.2vw]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Illustrative example · live rates shown in your dashboard
            </div>
          </div>

          {/* Sparkline-ish bars */}
          <div className="flex items-end gap-[0.5vw] h-[6vw]">
            {[1.4, 2.2, 1.8, 3.0, 2.4, 3.4, 4.2].map((h, i) => (
              <motion.div
                key={i}
                className="w-[0.8vw] rounded-t-[0.2vw]"
                style={{
                  background: 'linear-gradient(180deg, #F5C977 0%, #A8782F 100%)',
                  height: `${h}vw`,
                }}
                initial={{ scaleY: 0, originY: 1 }}
                animate={phase >= 3 ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </div>
        </motion.div>

        {/* Earn-back cards strip */}
        <div className="mt-[1.6vw] grid grid-cols-4 gap-[0.9vw] w-[60vw]">
          {earnCards.map((c) => {
            const visible = phase >= c.revealAt;
            return (
              <motion.div
                key={c.service}
                className="rounded-[0.6vw] px-[0.9vw] py-[0.8vw] flex items-center gap-[0.7vw]"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: '1px solid rgba(212,162,76,0.4)',
                  boxShadow: visible ? '0 10px 26px -10px rgba(212,162,76,0.35)' : 'none',
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="w-[1.6vw] h-[1.6vw] rounded-full flex items-center justify-center text-[0.85vw] font-black flex-shrink-0"
                  style={{ background: '#D4A24C', color: '#0F2346' }}
                >
                  ↑
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[0.78vw] font-bold text-white truncate"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {c.service}
                  </div>
                  <div
                    className="text-[0.62vw] text-white/55"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Earn-back credited
                  </div>
                </div>
                <div
                  className="text-[0.95vw] font-black"
                  style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {c.back}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.8vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          The more you transact,{' '}
          <span style={{ color: '#D4A24C' }} className="font-bold">
            the more you earn back.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
