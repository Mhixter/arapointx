import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Agent assignment beat.
 *
 * Verified-agent network on the left (dot map of Nigeria),
 * agent profile card slides in on the right, and a 3-stage tracking
 * pipeline (Submitted → In progress → Ready) advances under it.
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + map appears
      setTimeout(() => setPhase(2), 2000),   // agent dots pulse on
      setTimeout(() => setPhase(3), 4200),   // agent profile card slides in
      setTimeout(() => setPhase(4), 6800),   // tracker stage 1 lit
      setTimeout(() => setPhase(5), 9000),   // tracker stage 2 lit
      setTimeout(() => setPhase(6), 11200),  // tracker stage 3 lit
      setTimeout(() => setPhase(7), 12800),  // caption
      setTimeout(() => setPhase(8), 13500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Agent dot positions across a stylized Nigeria-shaped grid
  const dots = [
    { x: 22, y: 35, big: false },
    { x: 38, y: 28, big: true },  // Abuja-ish
    { x: 30, y: 55, big: false },
    { x: 18, y: 70, big: true },  // Lagos-ish
    { x: 50, y: 45, big: false },
    { x: 62, y: 32, big: false },
    { x: 70, y: 55, big: true },  // Port Harcourt-ish
    { x: 45, y: 65, big: false },
    { x: 80, y: 40, big: false },
    { x: 28, y: 22, big: false },
    { x: 56, y: 70, big: false },
  ];

  const stages = [
    { label: 'Submitted', threshold: 4 },
    { label: 'In progress', threshold: 5 },
    { label: 'Ready', threshold: 6 },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(212,162,76,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 50%, rgba(6,182,212,0.08) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3.5vw] w-[88vw]">
        {/* Left — agent network "map" */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="flex items-center gap-[0.8vw] mb-[1vw]"
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
              Verified agent network
            </div>
          </motion.div>

          <motion.h2
            className="text-[2.6vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            An agent picks up.{' '}
            <span style={{ color: '#D4A24C' }}>Right away.</span>
          </motion.h2>

          {/* Map area */}
          <motion.div
            className="relative mt-[1.6vw] w-[34vw] h-[26vw] rounded-[1vw] overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(28,58,107,0.55) 0%, rgba(15,35,70,0.55) 100%)',
              border: '1px solid rgba(212,162,76,0.30)',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Faint grid */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(212,162,76,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,76,0.10) 1px, transparent 1px)',
                backgroundSize: '2vw 2vw',
              }}
            />

            {/* Connection lines from a central hub */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {dots.map((d, i) => (
                <motion.line
                  key={i}
                  x1={48}
                  y1={50}
                  x2={d.x}
                  y2={d.y}
                  stroke="#D4A24C"
                  strokeWidth="0.18"
                  strokeOpacity="0.55"
                  initial={{ pathLength: 0 }}
                  animate={phase >= 2 ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 0.7, delay: 0.05 * i }}
                />
              ))}
            </svg>

            {/* Dots */}
            {dots.map((d, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: d.big ? '0.95vw' : '0.55vw',
                  height: d.big ? '0.95vw' : '0.55vw',
                  background: '#D4A24C',
                  boxShadow: d.big ? '0 0 18px rgba(212,162,76,0.85)' : '0 0 8px rgba(212,162,76,0.5)',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 240,
                  damping: 18,
                  delay: 0.07 * i,
                }}
              />
            ))}

            {/* Central pulse */}
            <motion.div
              className="absolute rounded-full border-[0.18vw]"
              style={{
                left: '48%',
                top: '50%',
                width: '4vw',
                height: '4vw',
                borderColor: '#D4A24C',
                transform: 'translate(-50%,-50%)',
              }}
              animate={
                phase >= 2
                  ? { scale: [1, 1.6, 1], opacity: [0.85, 0, 0.85] }
                  : { scale: 1, opacity: 0 }
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: '48%',
                top: '50%',
                width: '1.6vw',
                height: '1.6vw',
                background: '#D4A24C',
                transform: 'translate(-50%,-50%)',
                boxShadow: '0 0 30px rgba(212,162,76,0.85)',
              }}
            />
          </motion.div>
        </div>

        {/* Right — agent card + tracker */}
        <div className="flex-1 flex flex-col gap-[1.4vw]">
          {/* Agent profile card */}
          <motion.div
            className="rounded-[1vw] p-[1.4vw]"
            style={{
              background:
                'linear-gradient(135deg, rgba(212,162,76,0.16) 0%, rgba(15,35,70,0.55) 100%)',
              border: '1.5px solid rgba(212,162,76,0.65)',
              boxShadow: '0 30px 70px -25px rgba(0,0,0,0.7)',
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-[1.2vw]">
              <div
                className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center text-[1.7vw] font-black text-[#0A1628]"
                style={{
                  background: 'linear-gradient(135deg, #F5C977 0%, #D4A24C 100%)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                CA
              </div>
              <div className="flex-1">
                <div
                  className="text-[0.78vw] tracking-[0.3em] uppercase font-bold"
                  style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
                >
                  Agent assigned
                </div>
                <div
                  className="text-[1.7vw] font-bold text-white mt-[0.1vw]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Chinedu A.
                </div>
                <div
                  className="text-[0.95vw] text-white/65 flex items-center gap-[0.7vw] mt-[0.15vw]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span>Lagos · Identity & Civic</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-[0.25vw]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className="w-[0.95vw] h-[0.95vw]"
                      fill="#D4A24C"
                    >
                      <path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 15 L7 19 L9 13 L4 9 L10 9 Z" />
                    </svg>
                  ))}
                </div>
                <div
                  className="text-[0.85vw] text-white/70 mt-[0.15vw] font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  4.9 · 412 jobs
                </div>
              </div>
            </div>

            {/* Verified strip */}
            <div className="mt-[1.2vw] flex items-center gap-[0.7vw]">
              <div
                className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.20)', border: '1px solid rgba(34,197,94,0.6)' }}
              >
                <svg viewBox="0 0 24 24" className="w-[0.85vw] h-[0.85vw]" fill="none" stroke="#22C55E" strokeWidth="3.5">
                  <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div
                className="text-[0.95vw] text-white/85 font-medium"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                ID verified · Background-checked · Bonded
              </div>
            </div>
          </motion.div>

          {/* Tracker pipeline */}
          <motion.div
            className="rounded-[1vw] p-[1.4vw]"
            style={{
              background: 'rgba(15,35,70,0.55)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-bold mb-[1vw]"
              style={{ color: '#D4A24C', fontFamily: "'Inter', sans-serif" }}
            >
              Live tracking
            </div>
            <div className="flex items-center gap-[0.8vw]">
              {stages.map((s, i) => {
                const lit = phase >= s.threshold;
                return (
                  <div key={s.label} className="flex-1 flex items-center gap-[0.8vw]">
                    <motion.div
                      className="flex flex-col items-center gap-[0.45vw]"
                      animate={lit ? { scale: 1 } : { scale: 0.96 }}
                    >
                      <div
                        className="w-[2.2vw] h-[2.2vw] rounded-full flex items-center justify-center"
                        style={{
                          background: lit ? '#D4A24C' : 'rgba(255,255,255,0.10)',
                          border: lit
                            ? '2px solid #D4A24C'
                            : '2px solid rgba(255,255,255,0.20)',
                          boxShadow: lit ? '0 0 22px rgba(212,162,76,0.6)' : 'none',
                        }}
                      >
                        {lit ? (
                          <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw]" fill="none" stroke="#0A1628" strokeWidth="3.5">
                            <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <div
                            className="text-[1vw] font-bold text-white/50"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {i + 1}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-[0.85vw] font-bold whitespace-nowrap"
                        style={{
                          color: lit ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {s.label}
                      </div>
                    </motion.div>
                    {i < stages.length - 1 && (
                      <div className="flex-1 h-[0.18vw] rounded-full overflow-hidden bg-white/10">
                        <motion.div
                          className="h-full"
                          style={{ background: '#D4A24C' }}
                          initial={{ width: '0%' }}
                          animate={
                            phase > s.threshold ? { width: '100%' } : { width: '0%' }
                          }
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Caption */}
          <motion.div
            className="text-[1.2vw] text-white/80 font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.5 }}
          >
            Real-time status. Every step. <span style={{ color: '#D4A24C' }} className="font-bold">No guessing.</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
