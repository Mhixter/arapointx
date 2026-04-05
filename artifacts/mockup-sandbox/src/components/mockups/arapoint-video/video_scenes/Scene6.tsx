import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import logoImg from "@/assets/arapoint-logo.png";

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),  // Logo enters
      setTimeout(() => setPhase(2), 1000), // Tagline
      setTimeout(() => setPhase(3), 2000), // Contact info
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#0F2346] flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Background glow behind logo */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] rounded-full bg-[#1C3A6B] blur-[100px] opacity-50"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 0.5 } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.img 
          src={logoImg} 
          alt="Arapoint Logo"
          className="h-[12vw] object-contain mb-[2vw]"
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: 50, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />

        <motion.h2 
          className="text-[3vw] font-black text-white tracking-wide text-center leading-tight mb-[4vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Built for Nigeria.<br/>
          <span className="text-[#6DB33F]">Powered by trust.</span>
        </motion.h2>

        <motion.div 
          className="grid grid-cols-2 gap-x-[4vw] gap-y-[1vw] text-[1.2vw] font-mono text-white/70"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-[1vw] justify-end">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#6DB33F]" />
            arapoint.com.ng
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#6DB33F]" />
            developer.arapoint.com.ng
          </div>
          <div className="flex items-center gap-[1vw] justify-end">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-white/30" />
            hello@arapoint.com.ng
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-white/30" />
            support@arapoint.com.ng
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
