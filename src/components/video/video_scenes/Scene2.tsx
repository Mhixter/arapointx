import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Fund via virtual bank account.
 *
 * Phone frame on the left showing the wallet "Fund" sheet with a dedicated
 * virtual account number; balance ticks up as a transfer settles. Right
 * column shows the partner-bank chips (Palmpay, Moniepoint, Payvessel).
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);
  // Eased balance counter — illustrative example value, not a guarantee.
  const [balance, setBalance] = useState(0);
  const targetBalance = 25000;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + phone
      setTimeout(() => setPhase(2), 2400),   // virtual account card
      setTimeout(() => setPhase(3), 4400),   // bank partner chips
      setTimeout(() => setPhase(4), 6800),   // transfer in flight
      setTimeout(() => setPhase(5), 8400),   // balance starts rolling
      setTimeout(() => setPhase(6), 12200),  // closing line
      setTimeout(() => setPhase(7), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 5) return;
    const start = performance.now();
    const duration = 2400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setBalance(Math.round(targetBalance * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const banks = [
    { name: 'Palmpay', tag: 'Pp', tone: '#7C3AED' },
    { name: 'Moniepoint', tag: 'Mo', tone: '#1E40AF' },
    { name: 'Payvessel', tag: 'Pv', tone: '#0D9488' },
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
            'radial-gradient(ellipse at 25% 35%, rgba(109,179,63,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Phone frame */}
        <motion.div
          className="relative w-[20vw] h-[40vw] rounded-[2.4vw] flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
            border: '1px solid rgba(109,179,63,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(109,179,63,0.05)',
          }}
          initial={{ opacity: 0, y: 30, rotate: -3 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotate: -3 } : { opacity: 0, y: 30, rotate: -3 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="absolute top-[1vw] left-1/2 -translate-x-1/2 w-[5vw] h-[0.6vw] rounded-full"
            style={{ background: '#0A1628' }}
          />
          <div
            className="absolute inset-[1vw] top-[2vw] rounded-[1.6vw] overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0F2346 100%)' }}
          >
            <div
              className="px-[1.2vw] pt-[1.4vw] text-[0.78vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            >
              Arapoint · Wallet
            </div>
            <div
              className="px-[1.2vw] mt-[0.4vw] text-[1.15vw] font-bold text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Fund wallet
            </div>

            {/* Balance card */}
            <motion.div
              className="mx-[1vw] mt-[1.2vw] rounded-[0.7vw] p-[1vw]"
              style={{
                background: 'linear-gradient(135deg, rgba(109,179,63,0.12), rgba(15,35,70,0.4))',
                border: '1px solid rgba(109,179,63,0.4)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="text-[0.55vw] tracking-[0.32em] uppercase font-bold text-white/55"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Wallet balance
              </div>
              <div
                className="text-[1.5vw] font-black text-white mt-[0.1vw]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {phase >= 5 ? formatNaira(balance) : '₦0.00'}
              </div>
            </motion.div>

            {/* Virtual account card */}
            <motion.div
              className="mx-[1vw] mt-[0.8vw] rounded-[0.7vw] p-[0.9vw]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="text-[0.55vw] tracking-[0.3em] uppercase font-bold text-white/55"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Your dedicated account
              </div>
              <div
                className="text-[1.05vw] font-bold text-white mt-[0.15vw]"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}
              >
                9 0 4 7 · 2 6 1 8 · 5 5
              </div>
              <div
                className="text-[0.6vw] text-white/55 mt-[0.2vw]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Adaeze Okonkwo · Arapoint VA
              </div>
            </motion.div>

            {/* Transfer in-flight */}
            <motion.div
              className="absolute bottom-[1vw] left-[1vw] right-[1vw] flex items-center gap-[0.5vw] rounded-[0.5vw] px-[0.7vw] py-[0.6vw]"
              style={{
                background: 'rgba(109,179,63,0.18)',
                border: '1px solid rgba(109,179,63,0.55)',
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-[1vw] h-[1vw] rounded-full flex items-center justify-center text-[0.65vw] font-black"
                style={{ background: '#6DB33F', color: 'white' }}
                animate={phase >= 5 ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                ↓
              </motion.div>
              <div className="flex-1">
                <div
                  className="text-[0.7vw] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {phase >= 5 ? 'Transfer received' : 'Transfer pending…'}
                </div>
                <div
                  className="text-[0.55vw] text-white/65"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  via Palmpay · ref ARP-FND-39811
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            Funding · the easy part
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Your own dedicated{' '}
            <span style={{ color: '#6DB33F' }}>virtual bank account.</span>
          </motion.h2>

          <motion.p
            className="mt-[0.8vw] text-[1.2vw] text-white/70 leading-snug"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Send from your usual bank app — your Arapoint balance updates the moment the transfer settles.
          </motion.p>

          {/* Bank partner cards */}
          <div className="mt-[1.6vw] grid grid-cols-3 gap-[1vw]">
            {banks.map((b, i) => (
              <motion.div
                key={b.name}
                className="rounded-[0.6vw] px-[1vw] py-[1vw] flex flex-col items-center"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: `1px solid ${b.tone}88`,
                  boxShadow: `0 12px 30px -12px ${b.tone}66`,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: 0.12 * i, duration: 0.55 }}
              >
                <div
                  className="w-[3vw] h-[3vw] rounded-[0.5vw] flex items-center justify-center text-[1.25vw] font-black"
                  style={{
                    background: `linear-gradient(135deg, ${b.tone}, ${b.tone}AA)`,
                    color: 'white',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {b.tag}
                </div>
                <div
                  className="mt-[0.6vw] text-[1.15vw] font-bold text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {b.name}
                </div>
                <div
                  className="text-[0.7vw] tracking-[0.22em] uppercase font-semibold mt-[0.1vw]"
                  style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
                >
                  Partner Bank
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.6vw] text-[1.4vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Instant funding.{' '}
            <span style={{ color: '#6DB33F' }} className="font-bold">
              Zero hassle.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
