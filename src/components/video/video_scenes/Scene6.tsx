import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BrandFooter from '../BrandFooter';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // headline
      setTimeout(() => setPhase(2), 2200),  // subtitle
      setTimeout(() => setPhase(3), 4000),  // brand footer (logo + URL + email)
      setTimeout(() => setPhase(4), 15500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Ambient: shield badge at very low opacity, centered */}
      <div
        className="absolute inset-0 opacity-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/shield-badge.png)`,
          backgroundSize: '50vh auto',
        }}
      />
      {/* Subtle radial vignette toward center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(28,58,107,0.5) 0%, rgba(15,35,70,0.2) 35%, rgba(10,22,40,0.95) 80%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Headline */}
        <motion.h2
          className="text-[4.6vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Get your slip <span className="text-[#6DB33F]">in seconds.</span>
        </motion.h2>

        {/* Subtitle */}
        <motion.div
          className="mt-[1.6vw] text-[1.6vw] text-white/70 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7 }}
        >
          No queues. No NIMC office. Just Arapoint.
        </motion.div>

        {/* Spacer so BrandFooter (absolute, full-screen centered) sits below */}
        <div className="h-[18vw]" />
      </div>

      {phase >= 3 && <BrandFooter variant="full" delay={0} />}
    </motion.div>
  );
}
