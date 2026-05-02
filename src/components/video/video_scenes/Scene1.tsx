import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — One wallet, every service (Wallet hook).
 *
 * Stylized wallet card center-stage with orbiting service chips.
 * Sets up the value prop: fund once, transact anywhere on Arapoint.
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline in
      setTimeout(() => setPhase(2), 2400),   // wallet card + service chips
      setTimeout(() => setPhase(3), 6800),   // benefit pills
      setTimeout(() => setPhase(4), 10200),  // closing line
      setTimeout(() => setPhase(5), 13200),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Service chips that orbit the wallet card.
  const chips = [
    { label: 'NIN', x: -22, y: -12 },
    { label: 'BVN', x: 22, y: -12 },
    { label: 'WAEC', x: -28, y: 4 },
    { label: 'JAMB', x: 28, y: 4 },
    { label: 'IPE', x: -22, y: 18 },
    { label: 'PIN', x: 22, y: 18 },
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
            'radial-gradient(ellipse at 50% 35%, rgba(109,179,63,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Your money, your services
        </motion.div>

        <motion.h1
          className="text-[4.4vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          One wallet.{' '}
          <span style={{ color: '#6DB33F' }}>Every Arapoint service.</span>
        </motion.h1>

        {/* Wallet card with orbiting chips */}
        <motion.div
          className="relative mt-[3.2vw] w-[44vw] h-[14vw]"
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* The wallet card */}
          <div
            className="absolute inset-0 rounded-[1.2vw] overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, #0F2346 0%, #1C3A6B 40%, #0F2346 100%)',
              border: '1px solid rgba(109,179,63,0.55)',
              boxShadow:
                '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(109,179,63,0.06)',
            }}
          >
            {/* Subtle radial highlight */}
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  'radial-gradient(circle at 18% 18%, rgba(109,179,63,0.12), transparent 55%)',
              }}
            />

            {/* Top row: brand + chip */}
            <div className="absolute top-[1.2vw] left-[1.4vw] right-[1.4vw] flex items-center justify-between">
              <div
                className="text-[1vw] tracking-[0.32em] uppercase font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Arapoint <span style={{ color: '#6DB33F' }}>Wallet</span>
              </div>
              <div
                className="w-[3vw] h-[2.2vw] rounded-[0.3vw]"
                style={{
                  background:
                    'linear-gradient(135deg, #D4A24C 0%, #F5C977 50%, #A8782F 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* Balance label */}
            <div
              className="absolute top-[5.5vw] left-[1.4vw] text-[0.7vw] tracking-[0.32em] uppercase font-bold text-white/55"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Balance
            </div>
            <div
              className="absolute top-[6.4vw] left-[1.4vw] text-[2.6vw] font-black tracking-tight text-white"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ₦--,---.--
            </div>

            {/* Footer row: virtual account hint */}
            <div className="absolute bottom-[1vw] left-[1.4vw] right-[1.4vw] flex items-end justify-between">
              <div>
                <div
                  className="text-[0.6vw] tracking-[0.3em] uppercase font-bold text-white/55"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Dedicated Virtual Account
                </div>
                <div
                  className="text-[0.95vw] font-bold text-white mt-[0.05vw]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  •••• ••••  <span style={{ color: '#6DB33F' }}>4 7 2 9</span>
                </div>
              </div>
              <div
                className="text-[0.7vw] tracking-[0.3em] uppercase font-bold"
                style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
              >
                Active
              </div>
            </div>
          </div>

          {/* Orbiting service chips */}
          {chips.map((c, i) => (
            <motion.div
              key={c.label}
              className="absolute px-[1vw] py-[0.5vw] rounded-full text-[0.95vw] font-bold pointer-events-none"
              style={{
                left: `${50 + c.x}%`,
                top: `${50 + c.y * 1.6}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(15,35,70,0.85)',
                border: '1px solid rgba(109,179,63,0.5)',
                color: 'white',
                fontFamily: "'Inter', sans-serif",
                backdropFilter: 'blur(6px)',
                boxShadow: '0 8px 22px -8px rgba(109,179,63,0.4)',
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={
                phase >= 2
                  ? { opacity: 1, scale: 1, y: [0, -4, 0] }
                  : { opacity: 0, scale: 0.6 }
              }
              transition={{
                opacity: { delay: 0.4 + 0.12 * i, duration: 0.5 },
                scale: { delay: 0.4 + 0.12 * i, duration: 0.5 },
                y: { duration: 3 + (i % 3) * 0.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              {c.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Benefit pills */}
        <motion.div
          className="mt-[2.6vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {['Fund instantly', 'Spend anywhere on Arapoint', 'Earn while you transact'].map(
            (label, i) => (
              <motion.div
                key={label}
                className="px-[1.2vw] py-[0.5vw] rounded-full text-[1.05vw] font-semibold"
                style={{
                  background: 'rgba(109,179,63,0.10)',
                  border: '1px solid rgba(109,179,63,0.45)',
                  color: '#A7E07A',
                  fontFamily: "'Inter', sans-serif",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.12 * i, duration: 0.5 }}
              >
                {label}
              </motion.div>
            ),
          )}
        </motion.div>

        {/* Closing line */}
        <motion.div
          className="mt-[2vw] text-[1.55vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Fund once.{' '}
          <span style={{ color: '#6DB33F' }} className="font-bold">
            Transact anywhere.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
