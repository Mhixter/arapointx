import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 14000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-20 bg-center bg-cover mix-blend-overlay" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-wallet.png)` }} />

      <div className="flex flex-col items-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-[4vw]"
        >
          <h2 className="text-[4.5vw] font-black text-white leading-tight">
            ARAPOINT <span className="text-[#D4A24C]">WALLET</span>
          </h2>
          <p className="text-[1.5vw] text-white/70 font-medium">One unified, secure balance.</p>
        </motion.div>

        <motion.div 
          className="w-[40vw] bg-gradient-to-br from-[#1C3A6B] to-[#0A1628] rounded-[2vw] p-[3vw] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <div className="text-[1.2vw] text-white/50 mb-[0.5vw]">Total Balance</div>
          <div className="text-[4vw] font-black text-white font-mono mb-[2vw]">₦ 2,540,000.00</div>
          
          <div className="flex gap-[1vw]">
            <div className="flex-1 bg-white/5 rounded-[1vw] py-[1.5vw] text-center text-white text-[1.2vw] border border-white/10">Fund</div>
            <div className="flex-1 bg-[#6DB33F] rounded-[1vw] py-[1.5vw] text-center text-white font-bold text-[1.2vw]">Transfer</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
