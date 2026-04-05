import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Code window
      setTimeout(() => setPhase(2), 600),  // Typing starts
      setTimeout(() => setPhase(3), 2000), // Result JSON appears
      setTimeout(() => setPhase(4), 4200), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const codeSnippet = `const response = await arapoint.verify({
  type: "unified",
  nin: "12345678901",
  bvn: "22345678901"
});`;

  const jsonResult = `{
  "status": "success",
  "verified": true,
  "confidence": 98.5,
  "data": { ... }
}`;

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, rotateX: 20, y: '20vh' }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1500 }}
    >
      <div className="absolute inset-0 z-0 opacity-30">
        <video 
          src={`${import.meta.env.BASE_URL}videos/data-grid.mp4`}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[70vw]">
        <motion.h2 
          className="text-[4vw] font-black text-white text-center leading-tight mb-[3vw]"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          ONE API.<br/>
          <span className="text-[#6DB33F]">EVERY VERIFICATION.</span>
        </motion.h2>

        <div className="flex w-full gap-[2vw]">
          {/* Code Editor */}
          <motion.div 
            className="w-1/2 bg-[#0A162D] rounded-[1vw] border border-white/10 overflow-hidden shadow-2xl font-mono text-[1.2vw]"
            initial={{ x: -50, opacity: 0 }}
            animate={phase >= 1 ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="h-[2.5vw] bg-white/5 flex items-center px-[1vw] gap-[0.5vw]">
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-red-500/80" />
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-yellow-500/80" />
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-green-500/80" />
            </div>
            <div className="p-[2vw] text-white/80 whitespace-pre">
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-[#6DB33F]">const</span> response = <span className="text-[#6DB33F]">await</span> arapoint.verify({'{'}<br/>
                  {'  '}type: <span className="text-yellow-300">"unified"</span>,<br/>
                  {'  '}nin: <span className="text-yellow-300">"12345678901"</span>,<br/>
                  {'  '}bvn: <span className="text-yellow-300">"22345678901"</span><br/>
                  {'}'});
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Response JSON */}
          <motion.div 
            className="w-1/2 bg-[#1C3A6B]/30 backdrop-blur-md rounded-[1vw] border border-[#6DB33F]/30 overflow-hidden shadow-2xl font-mono text-[1.2vw]"
            initial={{ x: 50, opacity: 0 }}
            animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="h-[2.5vw] bg-[#6DB33F]/10 flex items-center px-[1.5vw]">
              <span className="text-[#6DB33F] text-[0.8vw] tracking-wider font-bold">200 OK</span>
            </div>
            <div className="p-[2vw] text-green-300 whitespace-pre">
              {jsonResult}
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          className="mt-[3vw] text-[1.2vw] text-white/50 font-mono tracking-widest"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
        >
          developer.arapoint.com.ng
        </motion.div>
      </div>
    </motion.div>
  );
}
