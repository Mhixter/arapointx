import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Exam body logo parade.
 *
 * WAEC, NECO, JAMB, NABTEB, NBAIS each get a brief brand-colored callout card.
 * Logos sit in white tiles so the official marks read cleanly against navy.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2200),   // WAEC card
      setTimeout(() => setPhase(3), 4000),   // NECO card
      setTimeout(() => setPhase(4), 5800),   // JAMB card
      setTimeout(() => setPhase(5), 7600),   // NABTEB card
      setTimeout(() => setPhase(6), 9400),   // NBAIS card
      setTimeout(() => setPhase(7), 11800),  // closing line
      setTimeout(() => setPhase(8), 15400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const bodies = [
    {
      key: 'waec',
      name: 'WAEC',
      full: 'West African Examinations Council',
      brand: '#016B3A',
      logo: 'waec.png',
      revealAt: 2,
    },
    {
      key: 'neco',
      name: 'NECO',
      full: 'National Examinations Council',
      brand: '#1E40AF',
      logo: 'neco.png',
      revealAt: 3,
    },
    {
      key: 'jamb',
      name: 'JAMB',
      full: 'Joint Admissions & Matriculation Board',
      brand: '#B91C1C',
      logo: 'jamb.png',
      revealAt: 4,
    },
    {
      key: 'nabteb',
      name: 'NABTEB',
      full: 'National Business & Technical Examinations Board',
      brand: '#C2410C',
      logo: null, // stylized text card
      revealAt: 5,
    },
    {
      key: 'nbais',
      name: 'NBAIS',
      full: 'National Board for Arabic & Islamic Studies',
      brand: '#A16207',
      logo: 'nbais.png',
      revealAt: 6,
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
            'radial-gradient(ellipse at 50% 30%, rgba(28,58,107,0.32) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[88vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Verified directly from official sources
        </motion.div>

        <motion.h2
          className="text-[3.6vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Every major exam body.{' '}
          <span style={{ color: '#6DB33F' }}>One platform.</span>
        </motion.h2>

        {/* Logo grid */}
        <div className="mt-[3vw] grid grid-cols-5 gap-[1.4vw] w-full">
          {bodies.map((b) => {
            const visible = phase >= b.revealAt;
            return (
              <motion.div
                key={b.key}
                className="flex flex-col items-center rounded-[0.8vw] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)',
                  border: `2px solid ${b.brand}`,
                  boxShadow: visible
                    ? `0 18px 50px -12px ${b.brand}66, 0 0 0 1px rgba(255,255,255,0.05)`
                    : '0 0 0 transparent',
                }}
                initial={{ opacity: 0, y: 18, scale: 0.92 }}
                animate={
                  visible
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 18, scale: 0.92 }
                }
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Brand band */}
                <div
                  className="w-full h-[0.6vw]"
                  style={{ background: b.brand }}
                />

                {/* Logo box */}
                <div className="flex items-center justify-center w-full h-[8vw] px-[0.8vw] py-[1vw]">
                  {b.logo ? (
                    <img
                      src={`${import.meta.env.BASE_URL}logos/exam-bodies/${b.logo}`}
                      alt={b.name}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="text-[2.6vw] font-black tracking-[0.04em]"
                        style={{
                          color: b.brand,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        className="text-[0.55vw] tracking-[0.3em] uppercase font-bold mt-[0.2vw]"
                        style={{ color: b.brand, fontFamily: "'Inter', sans-serif" }}
                      >
                        Examinations Board
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div
                  className="w-full text-center pb-[0.8vw] pt-[0.2vw] px-[0.4vw]"
                  style={{ background: 'rgba(15,35,70,0.04)' }}
                >
                  <div
                    className="text-[1.05vw] font-black"
                    style={{ color: '#0F2346', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {b.name}
                  </div>
                  <div
                    className="text-[0.62vw] tracking-[0.18em] uppercase font-semibold mt-[0.1vw]"
                    style={{ color: '#475569', fontFamily: "'Inter', sans-serif" }}
                  >
                    Result Verification
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing line */}
        <motion.div
          className="mt-[2.8vw] text-[1.5vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Verified directly from each{' '}
          <span style={{ color: '#6DB33F' }} className="font-bold">
            official source.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
