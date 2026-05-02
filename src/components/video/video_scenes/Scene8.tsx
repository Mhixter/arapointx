import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BrandFooter from '../BrandFooter';

export function Scene8() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Show footer
      setTimeout(() => setPhase(3), 16000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#0A1628] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 opacity-30">
        <video 
          src={`${import.meta.env.BASE_URL}videos/dark-navy-abstract.mp4`}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.h2
          className="text-[3.5vw] font-black text-white text-center leading-tight mb-[4vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1 }}
        >
          EXPERIENCE THE FUTURE<br/>
          OF DIGITAL TRUST
        </motion.h2>

        {phase >= 2 && <BrandFooter variant="full" delay={0} />}
      </div>
    </motion.div>
  );
}
