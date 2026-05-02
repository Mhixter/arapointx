import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Withdraw to any Nigerian bank.
 *
 * Phone frame on the left runs the withdraw flow: bank picker → amount entry
 * → confirm → success. Right column shows the trust strip (instant settlement,
 * transparent fees, real receipts) and the bank network.
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + phone + headline
      setTimeout(() => setPhase(2), 2400),   // bank selected
      setTimeout(() => setPhase(3), 4400),   // amount entered
      setTimeout(() => setPhase(4), 6800),   // fee preview
      setTimeout(() => setPhase(5), 9000),   // confirm pressed
      setTimeout(() => setPhase(6), 11400),  // success state
      setTimeout(() => setPhase(7), 13800),  // closing line
      setTimeout(() => setPhase(8), 17400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const trustItems = [
    { title: 'Any Nigerian bank', sub: 'GTBank · Access · Zenith · Opay · UBA · 50+ more' },
    { title: 'Fee shown upfront', sub: 'Always see the cost before you confirm' },
    { title: 'Real receipts', sub: 'Downloadable, shareable, verifiable' },
    { title: 'Settlement you can feel', sub: 'Most withdrawals land in minutes' },
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

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Phone frame */}
        <motion.div
          className="relative w-[20vw] h-[40vw] rounded-[2.4vw] flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
            border: '1px solid rgba(252,165,165,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(252,165,165,0.04)',
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
              style={{ color: '#FCA5A5', fontFamily: "'Inter', sans-serif" }}
            >
              Arapoint · Withdraw
            </div>
            <div
              className="px-[1.2vw] mt-[0.4vw] text-[1.15vw] font-bold text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Withdraw to bank
            </div>

            {/* Bank picker */}
            <motion.div
              className="mx-[1vw] mt-[1.1vw] rounded-[0.6vw] p-[0.8vw] flex items-center gap-[0.7vw]"
              style={{
                background: phase >= 2 ? 'rgba(109,179,63,0.10)' : 'rgba(255,255,255,0.04)',
                border: phase >= 2 ? '1px solid rgba(109,179,63,0.55)' : '1px solid rgba(255,255,255,0.10)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="w-[1.8vw] h-[1.8vw] rounded-[0.3vw] flex items-center justify-center text-[0.7vw] font-black"
                style={{
                  background: 'linear-gradient(135deg, #B45309, #D97706)',
                  color: 'white',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                GT
              </div>
              <div className="flex-1">
                <div
                  className="text-[0.78vw] font-bold text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  GTBank
                </div>
                <div
                  className="text-[0.6vw] text-white/55"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  •••• ••• 8421
                </div>
              </div>
              {phase >= 2 && (
                <motion.div
                  className="text-[0.6vw] tracking-[0.3em] uppercase font-bold"
                  style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  Selected
                </motion.div>
              )}
            </motion.div>

            {/* Amount field */}
            <motion.div
              className="mx-[1vw] mt-[0.7vw] rounded-[0.6vw] p-[0.9vw]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="text-[0.55vw] tracking-[0.32em] uppercase font-bold text-white/55"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Amount
              </div>
              <div
                className="text-[1.4vw] font-black text-white mt-[0.1vw]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {phase >= 3 ? '₦15,000.00' : (
                  <span className="text-white/30">₦--,---.--</span>
                )}
                {phase >= 3 && phase < 5 && (
                  <motion.span
                    className="ml-[0.2vw] inline-block w-[0.12vw] h-[1.4vw] align-middle"
                    style={{ background: 'white' }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>

            {/* Fee preview */}
            <motion.div
              className="mx-[1vw] mt-[0.7vw] rounded-[0.5vw] px-[0.8vw] py-[0.6vw] flex items-center justify-between"
              style={{
                background: 'rgba(212,162,76,0.10)',
                border: '1px solid rgba(212,162,76,0.4)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="text-[0.6vw] tracking-[0.3em] uppercase font-bold"
                style={{ color: '#F5C977', fontFamily: "'Inter', sans-serif" }}
              >
                Fee · upfront
              </div>
              <div
                className="text-[0.78vw] font-black text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ₦25.00
              </div>
            </motion.div>

            {/* Confirm CTA */}
            <motion.div
              className="absolute bottom-[5.2vw] left-[1vw] right-[1vw] rounded-[0.6vw] py-[0.85vw] flex items-center justify-center text-[0.95vw] font-black"
              style={{
                background:
                  phase >= 5
                    ? 'linear-gradient(135deg, #6DB33F, #4F8B23)'
                    : 'linear-gradient(135deg, #D4A24C, #A8782F)',
                color: 'white',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 12px 24px -10px rgba(0,0,0,0.6)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              {phase >= 5 ? 'PROCESSING…' : 'CONFIRM WITHDRAWAL'}
            </motion.div>

            {/* Success toast */}
            <motion.div
              className="absolute bottom-[1vw] left-[1vw] right-[1vw] flex items-center gap-[0.5vw] rounded-[0.5vw] px-[0.7vw] py-[0.6vw]"
              style={{
                background: 'rgba(109,179,63,0.18)',
                border: '1px solid rgba(109,179,63,0.6)',
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-[1vw] h-[1vw] rounded-full flex items-center justify-center text-[0.65vw] font-black"
                style={{ background: '#6DB33F', color: 'white' }}
              >
                ✓
              </div>
              <div className="flex-1">
                <div
                  className="text-[0.7vw] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Withdrawal sent · receipt available
                </div>
                <div
                  className="text-[0.55vw] text-white/65"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  REF · ARP-WDR-77204
                </div>
              </div>
            </motion.div>
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
            Withdraw · cash out clearly
          </motion.div>

          <motion.h2
            className="text-[3vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Take your money to{' '}
            <span style={{ color: '#FCA5A5' }}>any Nigerian bank.</span>
          </motion.h2>

          {/* Trust list */}
          <div className="mt-[1.6vw] flex flex-col gap-[0.7vw]">
            {trustItems.map((t, i) => (
              <motion.div
                key={t.title}
                className="flex items-start gap-[0.9vw] rounded-[0.6vw] px-[1vw] py-[0.8vw]"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: '1px solid rgba(252,165,165,0.32)',
                }}
                initial={{ opacity: 0, x: 16 }}
                animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{ delay: 0.18 * i + 0.4, duration: 0.55 }}
              >
                <div
                  className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw] flex items-center justify-center text-[0.85vw] font-black flex-shrink-0"
                  style={{
                    background: 'rgba(252,165,165,0.18)',
                    border: '1px solid rgba(252,165,165,0.55)',
                    color: '#FCA5A5',
                  }}
                >
                  ✓
                </div>
                <div className="flex-1">
                  <div
                    className="text-[1.2vw] font-bold text-white leading-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {t.title}
                  </div>
                  <div
                    className="text-[0.85vw] text-white/65 mt-[0.1vw]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {t.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.4vw] text-[1.3vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Withdraw anytime —{' '}
            <span style={{ color: '#FCA5A5' }} className="font-bold">
              with the fee in plain sight.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
