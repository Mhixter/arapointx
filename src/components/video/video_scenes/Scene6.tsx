import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 14000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex w-[80vw] justify-between items-center z-10" style={{ perspective: 1200 }}>
        <div className="w-[45%]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-[4.5vw] font-black text-white leading-tight mb-[1vw]">
              VTU <span className="text-[#6DB33F]">SERVICES</span>
            </h2>
            <div className="w-[4vw] h-[0.5vw] bg-[#6DB33F] mb-[2vw]" />
            <p className="text-[1.8vw] text-white/70 font-medium leading-relaxed">
              Process electricity bills, cable, data, and airtime with guaranteed uptime.
            </p>
          </motion.div>
        </div>

        <div className="w-[45%] grid grid-cols-2 gap-[1.5vw]">
          {['Electricity', 'Cable TV', 'Data', 'Airtime'].map((service, i) => (
            <motion.div
              key={service}
              className="aspect-square bg-[#1C3A6B]/40 backdrop-blur-md rounded-[1vw] border border-white/10 flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.5, rotateY: 90 }}
              transition={{ type: 'spring', stiffness: 150, damping: 20, delay: i * 0.15 }}
            >
              <div className="w-[4vw] h-[4vw] bg-[#6DB33F]/20 rounded-full mb-[1vw] flex items-center justify-center">
                <div className="w-[2vw] h-[2vw] bg-[#6DB33F] rounded-full" />
              </div>
              <div className="text-[1.5vw] font-medium text-white">{service}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
