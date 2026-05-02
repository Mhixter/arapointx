import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Spend across every Arapoint service.
 *
 * Phone shows a transaction list populating in sequence; right column shows
 * the catalogue of services a single Arapoint Wallet pays for.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + phone
      setTimeout(() => setPhase(2), 2200),   // service grid reveal
      setTimeout(() => setPhase(3), 3800),   // tx 1 (NIN)
      setTimeout(() => setPhase(4), 5400),   // tx 2 (BVN)
      setTimeout(() => setPhase(5), 7000),   // tx 3 (WAEC)
      setTimeout(() => setPhase(6), 8600),   // tx 4 (IPE)
      setTimeout(() => setPhase(7), 11000),  // closing line
      setTimeout(() => setPhase(8), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const services = [
    { name: 'NIN', sub: 'Slip · verify', tone: '#6DB33F' },
    { name: 'BVN', sub: 'Retrieve · modify', tone: '#0EA5E9' },
    { name: 'IPE', sub: 'Police clearance', tone: '#D4A24C' },
    { name: 'Birth', sub: 'Attestation', tone: '#D4A24C' },
    { name: 'WAEC', sub: 'Result · PIN', tone: '#016B3A' },
    { name: 'NECO', sub: 'Result · PIN', tone: '#1E40AF' },
    { name: 'JAMB', sub: 'Admission · PIN', tone: '#B91C1C' },
    { name: 'NABTEB', sub: 'Result · PIN', tone: '#C2410C' },
  ];

  const txs = [
    { service: 'NIN Verification', tag: 'NIN', amount: '-₦200.00', tone: '#6DB33F', revealAt: 3 },
    { service: 'BVN Retrieval',    tag: 'BVN', amount: '-₦300.00', tone: '#0EA5E9', revealAt: 4 },
    { service: 'WAEC Checker PIN', tag: 'EDU', amount: '-₦3,500.00', tone: '#016B3A', revealAt: 5 },
    { service: 'IPE Clearance',    tag: 'IPE', amount: '-₦15,000.00', tone: '#D4A24C', revealAt: 6 },
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
            'radial-gradient(ellipse at 30% 35%, rgba(109,179,63,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.42) 0%, transparent 55%)',
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
              Recent transactions
            </div>

            {/* Balance pill */}
            <div className="mx-[1vw] mt-[0.8vw] flex items-center justify-between rounded-[0.5vw] px-[0.7vw] py-[0.5vw]"
              style={{ background: 'rgba(109,179,63,0.10)', border: '1px solid rgba(109,179,63,0.35)' }}
            >
              <div
                className="text-[0.55vw] tracking-[0.32em] uppercase font-bold text-white/55"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Available
              </div>
              <div
                className="text-[0.85vw] font-black text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ₦--,---.--
              </div>
            </div>

            {/* Transactions list */}
            <div className="mx-[1vw] mt-[0.8vw] flex flex-col gap-[0.45vw]">
              {txs.map((tx) => {
                const visible = phase >= tx.revealAt;
                return (
                  <motion.div
                    key={tx.service}
                    className="flex items-center gap-[0.6vw] rounded-[0.5vw] px-[0.6vw] py-[0.55vw]"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    initial={{ opacity: 0, x: -14 }}
                    animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="w-[1.6vw] h-[1.6vw] rounded-[0.3vw] flex items-center justify-center text-[0.6vw] font-black flex-shrink-0"
                      style={{
                        background: `${tx.tone}33`,
                        border: `1px solid ${tx.tone}AA`,
                        color: tx.tone,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {tx.tag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[0.72vw] font-bold text-white leading-tight truncate"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {tx.service}
                      </div>
                      <div
                        className="text-[0.55vw] text-white/55"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        Wallet · today
                      </div>
                    </div>
                    <div
                      className="text-[0.78vw] font-black"
                      style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {tx.amount}
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
            Spend · everything in one place
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            One balance pays for{' '}
            <span style={{ color: '#6DB33F' }}>every service.</span>
          </motion.h2>

          {/* Service grid */}
          <div className="mt-[1.4vw] grid grid-cols-4 gap-[0.8vw]">
            {services.map((s, i) => (
              <motion.div
                key={s.name}
                className="rounded-[0.6vw] px-[0.8vw] py-[0.9vw]"
                style={{
                  background: 'rgba(15,35,70,0.55)',
                  border: `1px solid ${s.tone}66`,
                  borderTop: `0.3vw solid ${s.tone}`,
                  boxShadow: `0 8px 22px -10px ${s.tone}66`,
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ delay: 0.07 * i, duration: 0.5 }}
              >
                <div
                  className="text-[1.2vw] font-black text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {s.name}
                </div>
                <div
                  className="text-[0.7vw] text-white/65 mt-[0.1vw]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {s.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.8vw] text-[1.4vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            One wallet —{' '}
            <span style={{ color: '#6DB33F' }} className="font-bold">
              covers it all.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
