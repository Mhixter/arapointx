import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Text
      setTimeout(() => setPhase(2), 600),  // Card 1 (WAEC)
      setTimeout(() => setPhase(3), 1000), // Card 2 (NECO)
      setTimeout(() => setPhase(4), 1400), // Card 3 (JAMB)
      setTimeout(() => setPhase(5), 2200), // Badge
      setTimeout(() => setPhase(6), 4200), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const cards = [
    { title: "WAEC RESULT", color: "#1C3A6B", y: "-5vh", rotate: -10, z: 10 },
    { title: "NECO RESULT", color: "#0F2346", y: "0vh", rotate: 5, z: 20 },
    { title: "JAMB STATUS", color: "#6DB33F", y: "5vh", rotate: -5, z: 30 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cards Stack */}
      <div className="relative w-full h-[40vh] flex items-center justify-center mb-[5vh]">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="absolute w-[22vw] h-[14vw] rounded-[1vw] border border-white/20 p-[1.5vw] shadow-2xl flex flex-col justify-between"
            style={{ backgroundColor: card.color, zIndex: card.z }}
            initial={{ y: '50vh', x: i % 2 === 0 ? '-20vw' : '20vw', opacity: 0, rotate: 0 }}
            animate={phase >= i + 2 ? { y: card.y, x: `${(i - 1) * 8}vw`, opacity: 1, rotate: card.rotate } : { y: '50vh', x: i % 2 === 0 ? '-20vw' : '20vw', opacity: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="flex justify-between items-start">
              <div className="text-white/50 text-[1vw] font-mono tracking-widest">{card.title}</div>
              <div className="w-[2vw] h-[2vw] rounded-full bg-white/20" />
            </div>
            <div>
              <div className="w-[80%] h-[1vw] bg-white/20 rounded-full mb-[0.8vw]" />
              <div className="w-[50%] h-[1vw] bg-white/20 rounded-full" />
            </div>
          </motion.div>
        ))}

        {/* Secure Badge overlay */}
        <motion.div
          className="absolute z-40 w-[8vw] h-[8vw] bg-[#6DB33F] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(109,179,63,0.5)] border-[4px] border-[#0F2346]"
          initial={{ scale: 0, opacity: 0, y: "10vh" }}
          animate={phase >= 5 ? { scale: 1, opacity: 1, y: "5vh" } : { scale: 0, opacity: 0, y: "10vh" }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/shield-badge.png`} className="w-[4vw] h-[4vw] object-contain drop-shadow-xl" alt="" />
        </motion.div>
      </div>

      <div className="text-center relative z-10">
        <motion.h2 
          className="text-[4vw] font-black text-white leading-tight"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          NO FORGERIES.
        </motion.h2>
        <motion.h2 
          className="text-[4vw] font-black text-[#6DB33F] leading-tight"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          NO SHORTCUTS.
        </motion.h2>
        <motion.p
          className="text-[1.5vw] text-white/70 mt-[1.5vw] font-medium max-w-[50vw] mx-auto"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Direct academic verification from WAEC, NECO & JAMB.
        </motion.p>
      </div>
    </motion.div>
  );
}
