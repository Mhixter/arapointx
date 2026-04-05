import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),  // Circle shows up
      setTimeout(() => {
        setPhase(2);
        // Animate score from 0 to 98 over 1.5s
        let current = 0;
        const interval = setInterval(() => {
          current += 2;
          if (current >= 98) {
            current = 98;
            clearInterval(interval);
          }
          setScore(current);
        }, 30);
      }, 800),
      setTimeout(() => setPhase(3), 2500), // Breakdown bars
      setTimeout(() => setPhase(4), 4500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#0F2346]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex w-[80vw] gap-[5vw] items-center justify-between">
        {/* Left side: Text */}
        <div className="w-1/2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[3.5vw] font-black text-white leading-tight mb-[1vw]">
              EMPLOYMENT<br/>
              <span className="text-[#6DB33F]">TRUST SCORE</span>
            </h2>
            <p className="text-[1.5vw] text-white/70">
              Cross-reference NIN, BVN & SSCE instantly.
            </p>
          </motion.div>
        </div>

        {/* Right side: Dashboard UI element */}
        <motion.div 
          className="w-1/2 bg-[#1C3A6B]/50 border border-[#1C3A6B] rounded-[2vw] p-[3vw] flex flex-col items-center backdrop-blur-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
        >
          {/* Circular Score Meter */}
          <div className="relative w-[15vw] h-[15vw] mb-[3vw]">
            {/* Background track */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round" />
              {/* Animated Progress */}
              <motion.circle 
                cx="50" cy="50" r="45" fill="none" stroke="#6DB33F" strokeWidth="10" strokeLinecap="round"
                initial={{ strokeDasharray: "283", strokeDashoffset: 283 }}
                animate={phase >= 2 ? { strokeDashoffset: 283 - (283 * score) / 100 } : { strokeDashoffset: 283 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[4vw] font-bold text-white leading-none font-mono">{score}</span>
              <span className="text-[1vw] text-[#6DB33F] font-bold tracking-widest uppercase mt-[0.5vw]">Pass</span>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="w-full space-y-[1vw]">
            {[
              { label: "IDENTITY MATCH", val: 100, delay: 0 },
              { label: "ACADEMIC VALID", val: 100, delay: 0.1 },
              { label: "FRAUD RISK", val: 95, delay: 0.2 }
            ].map((item, i) => (
              <div key={i} className="w-full">
                <div className="flex justify-between text-[0.8vw] font-mono text-white/60 mb-[0.3vw]">
                  <span>{item.label}</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: item.delay + 0.3 }}
                  >{item.val}%</motion.span>
                </div>
                <div className="w-full h-[0.5vw] bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#6DB33F]"
                    initial={{ width: 0 }}
                    animate={phase >= 3 ? { width: `${item.val}%` } : { width: 0 }}
                    transition={{ duration: 0.8, delay: item.delay, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
