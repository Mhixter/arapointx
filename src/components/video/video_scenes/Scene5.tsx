import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Commissions accruing.
 *
 * Gold/green ambient. Earnings counter rolls upward as completed-job cards
 * stack in. Numbers are illustrative examples only — task brief explicitly
 * forbids implying guaranteed earnings.
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [earned, setEarned] = useState(0);
  const targetEarned = 8400; // ₦8,400 illustrative example only

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2200),   // counter card + first job
      setTimeout(() => setPhase(3), 3000),   // counter starts rolling
      setTimeout(() => setPhase(4), 4400),   // job 2
      setTimeout(() => setPhase(5), 6000),   // job 3
      setTimeout(() => setPhase(6), 7400),   // job 4
      setTimeout(() => setPhase(7), 9600),   // closing line
      setTimeout(() => setPhase(8), 13400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 3) return;
    const start = performance.now();
    const duration = 4200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setEarned(Math.round(targetEarned * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const formatNaira = (v: number) =>
    `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const completedJobs = [
    { service: 'NIN Slip · ARP-83401', back: '+₦200',   revealAt: 2 },
    { service: 'WAEC Result · ARP-83402', back: '+₦400', revealAt: 4 },
    { service: 'BVN Retrieval · ARP-83405', back: '+₦300', revealAt: 5 },
    { service: 'CAC Search · ARP-83408', back: '+₦1,200', revealAt: 6 },
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
          Commissions · accrue with every closed job
        </motion.div>

        <motion.h2
          className="text-[3.6vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          The harder you work,{' '}
          <span style={{ color: '#D4A24C' }}>the more you earn.</span>
        </motion.h2>

        {/* Big counter card */}
        <motion.div
          className="mt-[2.2vw] w-[60vw] rounded-[1vw] px-[2.4vw] py-[1.6vw] flex items-center justify-between"
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
              Today · credited to wallet
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
              Illustrative example · per-service rates shown live in your dashboard
            </div>
          </div>

          {/* Withdraw chip */}
          <div className="flex flex-col items-end gap-[0.6vw]">
            <div
              className="px-[1vw] py-[0.5vw] rounded-full text-[0.85vw] font-bold tracking-[0.18em]"
              style={{
                background: 'rgba(109,179,63,0.18)',
                border: '1px solid rgba(109,179,63,0.6)',
                color: '#A7E07A',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              SAME-DAY PAYOUT
            </div>
            <div
              className="text-[0.78vw] text-white/55"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Withdraw to any Nigerian bank
            </div>
          </div>
        </motion.div>

        {/* Completed-jobs strip */}
        <div className="mt-[1.4vw] grid grid-cols-4 gap-[0.9vw] w-[60vw]">
          {completedJobs.map((c) => {
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
                  className="w-[1.6vw] h-[1.6vw] rounded-full flex items-center justify-center text-[0.8vw] font-black flex-shrink-0"
                  style={{ background: '#6DB33F', color: 'white' }}
                >
                  ✓
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
                    Closed · paid
                  </div>
                </div>
                <div
                  className="text-[0.95vw] font-black"
                  style={{ color: '#FFE9B0', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {c.back}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.6vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Same-day payout —{' '}
          <span style={{ color: '#D4A24C' }} className="font-bold">
            straight to your bank.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
