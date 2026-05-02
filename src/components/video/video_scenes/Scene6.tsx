import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BrandFooter from '../BrandFooter';

/**
 * Scene 6 — 4 specializations + brand close.
 *
 * Four distinct specialization cards (Identity, Education, CAC, A2C) each in
 * its own brand colour, then resolves into the BrandFooter close.
 *
 * Allotted: 19_000 ms. All phase timers stay <= 18_500 ms.
 */
export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline + eyebrow
      setTimeout(() => setPhase(2), 2200),   // 4 specialization cards
      setTimeout(() => setPhase(3), 7800),   // CTA line
      setTimeout(() => setPhase(4), 9800),   // brand footer
      setTimeout(() => setPhase(5), 18500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const specs = [
    {
      tag: 'ID',
      name: 'Identity',
      services: 'NIN · BVN · verification',
      tone: '#6DB33F',
      bg: 'rgba(109,179,63,0.12)',
    },
    {
      tag: 'EDU',
      name: 'Education',
      services: 'WAEC · NECO · JAMB · NABTEB · NBAIS',
      tone: '#0EA5E9',
      bg: 'rgba(14,165,233,0.12)',
    },
    {
      tag: 'CAC',
      name: 'CAC',
      services: 'Company registration · post-incorporation',
      tone: '#D4A24C',
      bg: 'rgba(212,162,76,0.12)',
    },
    {
      tag: 'A2C',
      name: 'A2C · Civic',
      services: 'IPE clearance · birth attestation · more',
      tone: '#A78BFA',
      bg: 'rgba(167,139,250,0.12)',
    },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div
        className="absolute inset-0 opacity-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}logos/arapoint-logo-clear.png)`,
          backgroundSize: '50vh auto',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 35%, rgba(109,179,63,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />

      {phase < 4 && (
        <div className="relative z-10 flex flex-col items-center w-[84vw]">
          <motion.div
            className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
            style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            Pick your specialization
          </motion.div>

          <motion.h2
            className="text-[3.6vw] font-black text-white text-center leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Four lanes of work.{' '}
            <span style={{ color: '#6DB33F' }}>One platform.</span>
          </motion.h2>

          {/* 4 spec cards */}
          <div className="mt-[2.2vw] grid grid-cols-4 gap-[1vw] w-[78vw]">
            {specs.map((s, i) => (
              <motion.div
                key={s.name}
                className="rounded-[0.8vw] p-[1.2vw] flex flex-col"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.tone}AA`,
                  borderTop: `0.4vw solid ${s.tone}`,
                  boxShadow: `0 16px 36px -14px ${s.tone}66`,
                }}
                initial={{ opacity: 0, y: 18 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                transition={{ delay: 0.15 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="w-[3vw] h-[3vw] rounded-[0.5vw] flex items-center justify-center text-[1.1vw] font-black mb-[0.8vw]"
                  style={{
                    background: `linear-gradient(135deg, ${s.tone}, ${s.tone}AA)`,
                    color: 'white',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {s.tag}
                </div>
                <div
                  className="text-[1.5vw] font-black text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {s.name}
                </div>
                <div
                  className="text-[0.85vw] text-white/70 mt-[0.4vw] leading-snug"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {s.services}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-[2.2vw] text-[1.6vw] text-white/85 text-center font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Apply today.{' '}
            <span style={{ color: '#6DB33F' }} className="font-bold">
              Start serving tomorrow.
            </span>
          </motion.div>
        </div>
      )}

      {phase >= 4 && <BrandFooter variant="full" delay={0} />}
    </motion.div>
  );
}
