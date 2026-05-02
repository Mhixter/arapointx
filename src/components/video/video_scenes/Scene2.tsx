import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Arapoint request flow.
 *
 * Phone-shaped frame on the left showing the service-selection screen.
 * Right column shows the service cards expanded large with selection animation,
 * then the "Submit Request" button pops.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + phone frame
      setTimeout(() => setPhase(2), 2200),   // service cards reveal
      setTimeout(() => setPhase(3), 5400),   // IPE selected
      setTimeout(() => setPhase(4), 8000),   // Birth selected (multi-select feel)
      setTimeout(() => setPhase(5), 10500),  // submit button
      setTimeout(() => setPhase(6), 12800),  // confirmation toast
      setTimeout(() => setPhase(7), 14600),  // caption
      setTimeout(() => setPhase(8), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const services = [
    {
      key: 'ipe',
      title: 'IPE Clearance',
      subtitle: 'Police character certificate',
      icon: 'shield',
    },
    {
      key: 'birth',
      title: 'Birth Attestation',
      subtitle: 'Civil registry record',
      icon: 'star',
    },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Warm gold ambient — first hint of the brand civic palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 35%, rgba(212,162,76,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(6,182,212,0.08) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Phone frame on the left */}
        <motion.div
          className="relative w-[20vw] h-[40vw] rounded-[2.4vw] flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
            border: '1px solid rgba(212,162,76,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(212,162,76,0.05)',
          }}
          initial={{ opacity: 0, y: 30, rotate: -3 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotate: -3 } : { opacity: 0, y: 30, rotate: -3 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Notch */}
          <div
            className="absolute top-[1vw] left-1/2 -translate-x-1/2 w-[5vw] h-[0.6vw] rounded-full"
            style={{ background: '#0A1628' }}
          />
          {/* Screen */}
          <div
            className="absolute inset-[1vw] top-[2vw] rounded-[1.6vw] overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0F2346 100%)' }}
          >
            <div
              className="px-[1.2vw] pt-[1.4vw] text-[0.78vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
            >
              Arapoint
            </div>
            <div
              className="px-[1.2vw] mt-[0.4vw] text-[1.2vw] font-bold text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Request a document
            </div>
            <div
              className="px-[1.2vw] mt-[0.3vw] text-[0.75vw] text-white/55"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Pick what you need to get started.
            </div>

            {/* Mini service rows mirroring the right side */}
            <div className="px-[1vw] mt-[1.4vw] flex flex-col gap-[0.8vw]">
              {services.map((s, i) => {
                const selected =
                  (s.key === 'ipe' && phase >= 3) ||
                  (s.key === 'birth' && phase >= 4);
                return (
                  <motion.div
                    key={s.key}
                    className="rounded-[0.6vw] px-[0.9vw] py-[0.7vw] flex items-center gap-[0.7vw]"
                    style={{
                      background: selected
                        ? 'rgba(212,162,76,0.15)'
                        : 'rgba(255,255,255,0.05)',
                      border: selected
                        ? '1px solid rgba(212,162,76,0.7)'
                        : '1px solid rgba(255,255,255,0.10)',
                    }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={
                      phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }
                    }
                    transition={{ delay: 0.15 * i, duration: 0.5 }}
                  >
                    <div
                      className="w-[0.7vw] h-[0.7vw] rounded-full"
                      style={{
                        background: selected
                          ? '#D4A24C'
                          : 'rgba(255,255,255,0.25)',
                      }}
                    />
                    <div
                      className="text-[0.75vw] font-bold text-white"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {s.title}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Submit row inside phone */}
            <motion.div
              className="absolute bottom-[1.2vw] left-[1vw] right-[1vw] rounded-[0.6vw] py-[0.85vw] text-center text-[0.85vw] font-bold tracking-wide"
              style={{
                background: '#D4A24C',
                color: '#0A1628',
                fontFamily: "'Inter', sans-serif",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              Submit Request
            </motion.div>
          </div>
        </motion.div>

        {/* Right column — large service cards + flow */}
        <div className="flex-1 flex flex-col gap-[1.4vw]">
          <motion.div
            className="flex items-center gap-[0.8vw]"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="px-[0.9vw] py-[0.35vw] rounded-full text-[0.85vw] tracking-[0.32em] uppercase font-bold"
              style={{
                background: 'rgba(212,162,76,0.15)',
                color: '#D4A24C',
                border: '1px solid rgba(212,162,76,0.45)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              The Arapoint way
            </div>
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Pick the document.{' '}
            <span style={{ color: '#D4A24C' }}>Submit. Done.</span>
          </motion.h2>

          {/* Big service cards */}
          <div className="grid grid-cols-2 gap-[1.2vw] mt-[0.6vw]">
            {services.map((s, i) => {
              const selected =
                (s.key === 'ipe' && phase >= 3) ||
                (s.key === 'birth' && phase >= 4);
              return (
                <motion.div
                  key={s.key}
                  className="relative rounded-[1vw] p-[1.4vw] overflow-hidden"
                  style={{
                    background: selected
                      ? 'linear-gradient(135deg, rgba(212,162,76,0.18) 0%, rgba(15,35,70,0.5) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(15,35,70,0.4) 100%)',
                    border: selected
                      ? '1.5px solid rgba(212,162,76,0.85)'
                      : '1px solid rgba(255,255,255,0.10)',
                    boxShadow: selected
                      ? '0 0 36px -8px rgba(212,162,76,0.5)'
                      : 'none',
                  }}
                  initial={{ opacity: 0, y: 18 }}
                  animate={
                    phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }
                  }
                  transition={{ delay: 0.18 * i, duration: 0.6 }}
                >
                  {/* Icon */}
                  <div
                    className="w-[3.5vw] h-[3.5vw] rounded-[0.6vw] flex items-center justify-center mb-[0.9vw]"
                    style={{
                      background: selected
                        ? 'rgba(212,162,76,0.25)'
                        : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(212,162,76,0.45)',
                    }}
                  >
                    {s.icon === 'shield' ? (
                      <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw]" fill="none" stroke="#D4A24C" strokeWidth="2">
                        <path d="M12 2 L4 5 V12 C4 17 8 21 12 22 C16 21 20 17 20 12 V5 Z" strokeLinejoin="round" />
                        <polyline points="9,12 11,14 15,10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw]" fill="none" stroke="#D4A24C" strokeWidth="2">
                        <path
                          d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 15 L7 19 L9 13 L4 9 L10 9 Z"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <div
                    className="text-[1.5vw] font-bold text-white leading-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="text-[0.95vw] text-white/65 mt-[0.2vw]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {s.subtitle}
                  </div>

                  {/* Selected badge */}
                  {selected && (
                    <motion.div
                      className="absolute top-[0.9vw] right-[0.9vw] w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center"
                      style={{ background: '#D4A24C' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 220,
                        damping: 16,
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw]" fill="none" stroke="#0A1628" strokeWidth="3.5">
                        <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Submit button */}
          <motion.div
            className="mt-[1.2vw] flex items-center gap-[1.2vw]"
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="px-[2vw] py-[1vw] rounded-[0.7vw] text-[1.3vw] font-bold tracking-wide"
              style={{
                background: '#D4A24C',
                color: '#0A1628',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 18px 40px -10px rgba(212,162,76,0.5)',
              }}
            >
              Submit Request
            </div>
            {phase >= 6 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-[0.6vw] px-[1vw] py-[0.6vw] rounded-full"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.55)',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw]" fill="none" stroke="#22C55E" strokeWidth="3">
                  <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div
                  className="text-[1vw] font-semibold"
                  style={{ color: '#86EFAC', fontFamily: "'Inter', sans-serif" }}
                >
                  Request received
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Caption */}
          <motion.div
            className="mt-[0.8vw] text-[1.2vw] text-white/70 font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.5 }}
          >
            From your phone. In minutes.
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
