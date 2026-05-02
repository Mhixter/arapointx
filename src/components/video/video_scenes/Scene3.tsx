import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Result slip reveal.
 *
 * Stylized WAEC-style result slip (NOT a 1:1 official document). Header band,
 * candidate fields, subjects/grades populating sequentially, VERIFIED seal.
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + slip frame
      setTimeout(() => setPhase(2), 2000),   // header band
      setTimeout(() => setPhase(3), 4200),   // candidate name + meta
      setTimeout(() => setPhase(4), 6200),   // exam metadata row
      setTimeout(() => setPhase(5), 8000),   // subjects begin populating
      setTimeout(() => setPhase(6), 12200),  // VERIFIED seal
      setTimeout(() => setPhase(7), 14000),  // caption
      setTimeout(() => setPhase(8), 17400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const subjects = [
    { name: 'English Language', grade: 'A1' },
    { name: 'Mathematics', grade: 'B2' },
    { name: 'Physics', grade: 'A1' },
    { name: 'Chemistry', grade: 'B3' },
    { name: 'Biology', grade: 'A1' },
    { name: 'Economics', grade: 'B2' },
    { name: 'Further Maths', grade: 'C4' },
    { name: 'Civic Education', grade: 'A1' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Green ambient — WAEC-leaning palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(1,107,58,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[1vw]"
          style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Document · Verified Result Slip
        </motion.div>

        {/* Slip frame */}
        <motion.div
          className="relative w-[58vw] h-[34vw] rounded-[0.5vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #FFFFFF 0%, #F8FAFC 100%)',
            boxShadow:
              '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 0 0.6vw #016B3A, inset 0 0 0 0.78vw #FFFFFF, inset 0 0 0 1vw #016B3A',
            color: '#0F2346',
          }}
          initial={{ opacity: 0, y: 30, rotateX: 14 }}
          animate={
            phase >= 1
              ? { opacity: 1, y: 0, rotateX: 0 }
              : { opacity: 0, y: 30, rotateX: 14 }
          }
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Diagonal ARAPOINT watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ transform: 'rotate(-22deg)' }}
          >
            <div
              className="text-[8vw] font-black tracking-[0.1em]"
              style={{
                color: 'rgba(1,107,58,0.07)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              ARAPOINT
            </div>
          </div>

          {/* Header band */}
          <motion.div
            className="absolute top-[1vw] left-[1vw] right-[1vw] flex items-center justify-between px-[1.4vw] py-[0.9vw] rounded-[0.3vw]"
            style={{
              background: 'linear-gradient(90deg, #0F2346 0%, #1C3A6B 50%, #0F2346 100%)',
              borderTop: '1.5px solid #6DB33F',
              borderBottom: '1.5px solid #6DB33F',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-[0.95vw] tracking-[0.32em] uppercase font-bold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Issued via Arapoint
            </div>
            <div
              className="text-[0.85vw] tracking-[0.3em] uppercase font-semibold"
              style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            >
              WAEC · MAY/JUNE
            </div>
          </motion.div>

          {/* Title block */}
          <motion.div
            className="absolute top-[5vw] left-0 right-0 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="text-[0.78vw] tracking-[0.42em] uppercase font-bold"
              style={{ color: '#016B3A', fontFamily: "'Inter', sans-serif" }}
            >
              West African Senior School Certificate
            </div>
            <div
              className="text-[2vw] font-black tracking-[0.04em] mt-[0.2vw]"
              style={{
                color: '#0F2346',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              VERIFIED RESULT SLIP
            </div>
            <div
              className="mt-[0.3vw] mx-auto h-[0.1vw] w-[10vw]"
              style={{ background: '#016B3A' }}
            />
          </motion.div>

          {/* Candidate */}
          <motion.div
            className="absolute top-[10vw] left-[2.4vw] right-[2.4vw] flex items-center justify-between"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div>
              <div
                className="text-[0.72vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#475569', fontFamily: "'Inter', sans-serif" }}
              >
                Candidate
              </div>
              <div
                className="text-[1.6vw] font-black mt-[0.05vw]"
                style={{ color: '#0F2346', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                ADAEZE OKONKWO
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-[0.72vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#475569', fontFamily: "'Inter', sans-serif" }}
              >
                Exam No.
              </div>
              <div
                className="text-[1vw] font-bold mt-[0.05vw]"
                style={{ color: '#0F2346', fontFamily: "'JetBrains Mono', monospace" }}
              >
                4250101019
              </div>
            </div>
          </motion.div>

          {/* Meta row */}
          <motion.div
            className="absolute top-[14vw] left-[2.4vw] right-[2.4vw] grid grid-cols-3 gap-[1vw]"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.6 }}
          >
            {[
              { label: 'Year', value: '2026' },
              { label: 'Centre', value: 'Lagos · 0193' },
              { label: 'Subjects', value: '8 / 9' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-[0.3vw] px-[0.7vw] py-[0.5vw]"
                style={{ background: 'rgba(1,107,58,0.07)', border: '1px solid rgba(1,107,58,0.25)' }}
              >
                <div
                  className="text-[0.62vw] tracking-[0.3em] uppercase font-bold"
                  style={{ color: '#016B3A', fontFamily: "'Inter', sans-serif" }}
                >
                  {m.label}
                </div>
                <div
                  className="text-[1.05vw] font-bold mt-[0.05vw]"
                  style={{ color: '#0F2346', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Subjects table */}
          <div className="absolute bottom-[4vw] left-[2.4vw] right-[2.4vw] grid grid-cols-2 gap-x-[2vw] gap-y-[0.45vw]">
            {subjects.map((s, i) => (
              <motion.div
                key={s.name}
                className="flex items-baseline justify-between px-[0.4vw]"
                style={{ borderBottom: '1px dashed rgba(1,107,58,0.4)' }}
                initial={{ opacity: 0, x: -10 }}
                animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ delay: 0.18 * i, duration: 0.45 }}
              >
                <div
                  className="text-[1vw] font-semibold"
                  style={{ color: '#0F2346', fontFamily: "'Inter', sans-serif" }}
                >
                  {s.name}
                </div>
                <div
                  className="text-[1.15vw] font-black"
                  style={{
                    color: s.grade.startsWith('A') ? '#016B3A' : '#0F2346',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {s.grade}
                </div>
              </motion.div>
            ))}
          </div>

          {/* VERIFIED seal */}
          <motion.div
            className="absolute bottom-[1vw] right-[2.4vw] flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={
              phase >= 6
                ? { opacity: 1, scale: 1, rotate: -8 }
                : { opacity: 0, scale: 0.6, rotate: -12 }
            }
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <div
              className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center text-center"
              style={{
                border: '0.25vw solid #016B3A',
                background: 'rgba(109,179,63,0.18)',
              }}
            >
              <div>
                <div
                  className="text-[0.85vw] font-black"
                  style={{
                    color: '#016B3A',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  VERIFIED
                </div>
                <div
                  className="text-[0.5vw] tracking-[0.25em] uppercase font-bold"
                  style={{ color: '#016B3A', fontFamily: "'Inter', sans-serif" }}
                >
                  ARAPOINT
                </div>
              </div>
            </div>
          </motion.div>

          {/* Issued via stamp on bottom-left */}
          <motion.div
            className="absolute bottom-[1.2vw] left-[2.4vw]"
            initial={{ opacity: 0 }}
            animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              className="text-[0.7vw] tracking-[0.3em] uppercase font-bold"
              style={{ color: '#475569', fontFamily: "'Inter', sans-serif" }}
            >
              Verified directly from WAEC
            </div>
            <div
              className="text-[0.85vw] font-bold mt-[0.1vw]"
              style={{ color: '#0F2346', fontFamily: "'JetBrains Mono', monospace" }}
            >
              REF · WAEC / 2026 / 048217
            </div>
          </motion.div>
        </motion.div>

        {/* Caption */}
        <motion.div
          className="mt-[2vw] text-[1.5vw] text-white/90 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Authentic results,{' '}
          <span style={{ color: '#6DB33F' }} className="font-bold">
            ready to share — instantly.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
