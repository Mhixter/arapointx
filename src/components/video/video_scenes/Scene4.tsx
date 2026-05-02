import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + form skeleton
      setTimeout(() => setPhase(2), 1800),   // current DOB picker selects
      setTimeout(() => setPhase(3), 4000),   // calendar pivot to correct year/month
      setTimeout(() => setPhase(4), 5800),   // correct DOB selects, diff highlight
      setTimeout(() => setPhase(5), 8500),   // submit row
      setTimeout(() => setPhase(6), 12500),  // caption
      setTimeout(() => setPhase(7), 14500),  // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Violet ambient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(139,92,246,0.14) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[82vw]">
        {/* Service eyebrow */}
        <motion.div
          className="flex items-center gap-[0.8vw] mb-[1vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="px-[0.9vw] py-[0.35vw] rounded-full text-[0.85vw] tracking-[0.32em] uppercase font-bold"
            style={{
              background: 'rgba(139,92,246,0.18)',
              color: '#A78BFA',
              border: '1px solid rgba(139,92,246,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            BVN Modification · Date of Birth
          </div>
        </motion.div>

        <motion.h2
          className="text-[2.6vw] font-black text-white text-center leading-[1.1] mb-[2vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Wrong date of birth? <span style={{ color: '#A78BFA' }}>Pick the right one.</span>
        </motion.h2>

        {/* Form + calendar layout */}
        <motion.div
          className="w-[68vw] rounded-[1vw] p-[1.4vw] grid grid-cols-[1fr_auto_1fr] gap-[1.4vw] items-stretch"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            backdropFilter: 'blur(10px)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'rgba(139,92,246,0.35)',
            boxShadow: '0 25px 60px -25px rgba(0,0,0,0.7)',
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {/* LEFT — current DOB pill */}
          <div className="flex flex-col gap-[0.8vw]">
            <div
              className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold text-white/60"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Current Date of Birth
            </div>
            <div
              className="px-[1.2vw] py-[1.4vw] rounded-[0.6vw] bg-white/5 border border-white/15 flex items-center gap-[1vw]"
            >
              <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw]" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="16" y1="3" x2="16" y2="7" />
              </svg>
              <div
                className="text-[1.6vw] font-bold text-white/90 tracking-[0.1em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {phase >= 2 ? '14 / 03 / 1991' : 'DD / MM / YYYY'}
              </div>
            </div>
            <div
              className="text-[0.85vw] text-white/45 leading-snug mt-[0.3vw]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              On record at enrolment.
            </div>
          </div>

          {/* CENTRE — mini calendar with month flip */}
          <div className="flex items-center">
            <motion.div
              className="w-[18vw] rounded-[0.6vw] p-[0.9vw]"
              style={{
                background: 'rgba(15, 35, 70, 0.85)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(139,92,246,0.45)',
                boxShadow: '0 0 35px -10px rgba(139,92,246,0.5)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-[0.6vw]">
                <svg viewBox="0 0 24 24" className="w-[0.9vw] h-[0.9vw] text-white/50" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15,6 9,12 15,18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <motion.div
                  key={phase >= 3 ? 'march-1992' : 'march-1991'}
                  className="text-[0.95vw] font-bold text-white tracking-[0.18em]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {phase >= 3 ? 'MARCH 1992' : 'MARCH 1991'}
                </motion.div>
                <svg viewBox="0 0 24 24" className="w-[0.9vw] h-[0.9vw] text-white/50" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9,6 15,12 9,18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Day-of-week strip */}
              <div className="grid grid-cols-7 gap-[0.15vw] mb-[0.3vw]">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div
                    key={i}
                    className="text-[0.55vw] tracking-[0.2em] text-white/45 text-center font-semibold"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-[0.15vw]">
                {Array.from({ length: 35 }).map((_, i) => {
                  const day = i - 3; // March starts mid-week
                  const valid = day >= 1 && day <= 31;
                  const isPicked = valid && day === 14;
                  const showOldPick = isPicked && phase >= 2 && phase < 3;
                  const showNewPick = isPicked && phase >= 4;
                  return (
                    <div
                      key={i}
                      className="aspect-square flex items-center justify-center rounded-[0.2vw]"
                      style={{
                        background: showNewPick
                          ? '#8B5CF6'
                          : showOldPick
                          ? 'rgba(255,255,255,0.18)'
                          : 'transparent',
                        color: valid ? (showNewPick ? 'white' : 'rgba(255,255,255,0.85)') : 'transparent',
                        fontWeight: showNewPick || showOldPick ? 700 : 500,
                        boxShadow: showNewPick ? '0 0 18px -2px rgba(139,92,246,0.7)' : 'none',
                        transition: 'all 0.35s ease',
                        fontSize: '0.75vw',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {valid ? day : ''}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* RIGHT — corrected DOB pill */}
          <div className="flex flex-col gap-[0.8vw]">
            <div
              className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold"
              style={{ color: '#A78BFA', fontFamily: "'Inter', sans-serif" }}
            >
              Correct Date of Birth
            </div>
            <div
              className="px-[1.2vw] py-[1.4vw] rounded-[0.6vw] flex items-center gap-[1vw]"
              style={{
                background: 'rgba(139,92,246,0.12)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(139,92,246,0.55)',
                boxShadow: phase >= 4 ? '0 0 30px -8px rgba(139,92,246,0.55)' : 'none',
                transition: 'box-shadow 0.4s ease',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw]" fill="none" stroke="#A78BFA" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="16" y1="3" x2="16" y2="7" />
              </svg>
              <div
                className="text-[1.6vw] font-bold text-white tracking-[0.1em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {phase >= 4 ? (
                  <>
                    14 / 03 /{' '}
                    <motion.span
                      style={{ color: '#A78BFA' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      1992
                    </motion.span>
                  </>
                ) : (
                  'DD / MM / YYYY'
                )}
              </div>
            </div>
            <div
              className="text-[0.85vw] text-white/45 leading-snug mt-[0.3vw]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              The right one. Year off by one.
            </div>
          </div>
        </motion.div>

        {/* Submit chip + caption */}
        <motion.div
          className="mt-[1.6vw] w-[68vw] flex items-center justify-end gap-[1vw]"
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.95vw] tracking-[0.18em] uppercase text-white/55 font-semibold"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Cost shown in-app · 3–5 business days
          </div>
          <div
            className="px-[1.6vw] py-[0.8vw] rounded-[0.5vw] text-white text-[1.05vw] font-bold tracking-wide flex items-center gap-[0.6vw]"
            style={{ background: '#8B5CF6', fontFamily: "'Inter', sans-serif" }}
          >
            SUBMIT REQUEST
            <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw]" fill="none" stroke="white" strokeWidth="3">
              <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        <motion.div
          className="mt-[1.5vw] text-[1.4vw] text-white/85 tracking-wide font-medium text-center max-w-[60vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Pick the date currently on file. <span style={{ color: '#A78BFA' }} className="font-bold">Then pick the correct one.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
