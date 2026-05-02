import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BrandFooter from '../BrandFooter';

/**
 * Scene 6 — Brand close.
 *
 * Headline + subhead + BrandFooter lockup. Warm gold accent ties back to the
 * civic certificate beats; calm navy base sustains the brand tone.
 *
 * Allotted: 15_000 ms. All phase timers stay <= 14_500 ms.
 */
export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline
      setTimeout(() => setPhase(2), 2400),   // subtitle
      setTimeout(() => setPhase(3), 4200),   // brand footer
      setTimeout(() => setPhase(4), 14500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Ambient gold + navy wash */}
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
            'radial-gradient(ellipse at 30% 35%, rgba(212,162,76,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 65%, rgba(28,58,107,0.40) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(28,58,107,0.45) 0%, rgba(15,35,70,0.2) 35%, rgba(10,22,40,0.95) 80%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[82vw]">
        {/* Headline */}
        <motion.h2
          className="text-[4.4vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Civic paperwork,{' '}
          <span style={{ color: '#D4A24C' }}>finally without the paperwork.</span>
        </motion.h2>

        {/* Subtitle */}
        <motion.div
          className="mt-[1.4vw] text-[1.55vw] text-white/75 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7 }}
        >
          IPE clearance and birth attestation,{' '}
          <span style={{ color: '#F5C977' }} className="font-semibold">
            done from your phone.
          </span>
        </motion.div>

        {/* Spacer so BrandFooter (absolute, full-screen centered) sits below */}
        <div className="h-[18vw]" />
      </div>

      {phase >= 3 && <BrandFooter variant="full" delay={0} />}
    </motion.div>
  );
}
