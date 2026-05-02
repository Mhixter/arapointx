import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — JAMB extras.
 *
 * Phone frame on the left showing JAMB admission status; right column lists
 * the broader JAMB service stack (course change, regularization, profile).
 * Brief red-accented JAMB callout, then settles back to the navy/green system.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + phone
      setTimeout(() => setPhase(2), 2400),   // admission status card
      setTimeout(() => setPhase(3), 4400),   // course change card
      setTimeout(() => setPhase(4), 6800),   // regularization card
      setTimeout(() => setPhase(5), 9000),   // profile / email card
      setTimeout(() => setPhase(6), 11400),  // closing line
      setTimeout(() => setPhase(7), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const services = [
    {
      key: 'admission',
      title: 'Admission Status',
      sub: 'Live check against JAMB CAPS',
      icon: '✓',
      revealAt: 2,
    },
    {
      key: 'change',
      title: 'Course / Institution Change',
      sub: 'Submit and track your change request',
      icon: '↻',
      revealAt: 3,
    },
    {
      key: 'reg',
      title: 'JAMB Regularization',
      sub: 'For graduates with no JAMB record on file',
      icon: '★',
      revealAt: 4,
    },
    {
      key: 'profile',
      title: 'Profile & Email Recovery',
      sub: 'Reset access, fix details, recover login',
      icon: '@',
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
            'radial-gradient(ellipse at 25% 35%, rgba(185,28,28,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Phone frame on the left */}
        <motion.div
          className="relative w-[20vw] h-[40vw] rounded-[2.4vw] flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
            border: '1px solid rgba(185,28,28,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 60px rgba(185,28,28,0.05)',
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
              style={{ color: '#B91C1C', fontFamily: "'Inter', sans-serif" }}
            >
              JAMB · Admission
            </div>
            <div
              className="px-[1.2vw] mt-[0.4vw] text-[1.2vw] font-bold text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Admission status
            </div>
            <div
              className="px-[1.2vw] mt-[0.3vw] text-[0.75vw] text-white/55"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Checking JAMB CAPS in real time…
            </div>

            {/* Status block */}
            <motion.div
              className="mx-[1vw] mt-[1.4vw] rounded-[0.6vw] p-[0.9vw]"
              style={{
                background: 'rgba(109,179,63,0.10)',
                border: '1px solid rgba(109,179,63,0.45)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div
                className="text-[0.6vw] tracking-[0.3em] uppercase font-bold"
                style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
              >
                Status
              </div>
              <div
                className="text-[1.1vw] font-black text-white mt-[0.1vw]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                ADMITTED
              </div>
              <div
                className="text-[0.6vw] text-white/65 mt-[0.2vw]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                University of Lagos · B.Sc. Computer Science
              </div>
            </motion.div>

            {/* Sub fields */}
            <div className="mx-[1vw] mt-[0.8vw] flex flex-col gap-[0.5vw]">
              {[
                { l: 'Reg No.', v: '20251119DA' },
                { l: 'Session', v: '2025 / 2026' },
                { l: 'Mode', v: 'UTME' },
              ].map((row, i) => (
                <motion.div
                  key={row.l}
                  className="flex items-center justify-between px-[0.6vw] py-[0.4vw] rounded-[0.4vw]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                  transition={{ delay: 0.4 + 0.12 * i, duration: 0.4 }}
                >
                  <div
                    className="text-[0.55vw] tracking-[0.25em] uppercase font-bold text-white/55"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {row.l}
                  </div>
                  <div
                    className="text-[0.78vw] font-bold text-white"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {row.v}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live tag */}
            <motion.div
              className="absolute bottom-[1vw] left-[1.2vw] right-[1.2vw] flex items-center justify-center gap-[0.4vw]"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.7 }}
            >
              <motion.div
                className="w-[0.4vw] h-[0.4vw] rounded-full"
                style={{ background: '#6DB33F' }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <div
                className="text-[0.55vw] tracking-[0.32em] uppercase font-bold text-white/65"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Live · JAMB official
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#B91C1C', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            JAMB · Beyond results
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Admission status, course change,{' '}
            <span style={{ color: '#FCA5A5' }}>regularization.</span>
          </motion.h2>

          {/* Service cards */}
          <div className="mt-[2vw] flex flex-col gap-[0.9vw]">
            {services.map((s) => {
              const visible = phase >= s.revealAt;
              return (
                <motion.div
                  key={s.key}
                  className="flex items-center gap-[1.2vw] rounded-[0.7vw] px-[1.2vw] py-[1vw]"
                  style={{
                    background: 'rgba(15,35,70,0.55)',
                    border: visible
                      ? '1px solid rgba(109,179,63,0.55)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: visible
                      ? '0 12px 30px -12px rgba(109,179,63,0.35)'
                      : 'none',
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="w-[2.6vw] h-[2.6vw] rounded-[0.5vw] flex items-center justify-center text-[1.4vw] font-black flex-shrink-0"
                    style={{
                      background: 'rgba(185,28,28,0.18)',
                      border: '1px solid rgba(185,28,28,0.55)',
                      color: '#FCA5A5',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-[1.4vw] font-bold text-white leading-tight"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="text-[0.95vw] text-white/65 mt-[0.1vw]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {s.sub}
                    </div>
                  </div>
                  {visible && (
                    <motion.div
                      className="text-[0.68vw] tracking-[0.3em] uppercase font-bold"
                      style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Available
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.6vw] text-[1.35vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Every JAMB service.{' '}
            <span style={{ color: '#FCA5A5' }} className="font-bold">
              One trusted dashboard.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
