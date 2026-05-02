import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 14000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-nigeria-map.png)` }} />

      <div className="flex w-[80vw] justify-between items-center z-10" style={{ perspective: 1200 }}>
        <motion.div 
          className="w-[45%] bg-[#0A1628] rounded-[1vw] border border-white/10 p-[2vw] font-mono text-[1.2vw] shadow-2xl relative overflow-hidden"
          initial={{ rotateY: -30, opacity: 0, x: -50 }}
          animate={phase >= 1 ? { rotateY: 5, opacity: 1, x: 0 } : { rotateY: -30, opacity: 0, x: -50 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2vw] bg-white/5 flex items-center px-[1vw] gap-[0.5vw]">
             <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-white/20" />
             <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-white/20" />
          </div>
          <div className="mt-[2vw] text-white/80 whitespace-pre">
            <span className="text-[#D4A24C]">import</span> {'{'} Arapoint {'}'} <span className="text-[#D4A24C]">from</span> 'arapoint-node';<br/><br/>
            <span className="text-[#6DB33F]">const</span> api = <span className="text-[#D4A24C]">new</span> Arapoint(process.env.KEY);<br/><br/>
            <span className="text-[#6DB33F]">const</span> cac = <span className="text-[#D4A24C]">await</span> api.business.verify({'{\n'}
            {'  '}rcNumber: <span className="text-green-300">'RC-123456'</span>{'\n}'});
          </div>
        </motion.div>

        <div className="w-[45%] text-right">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-[4.5vw] font-black text-white leading-tight mb-[1vw]">
              BUSINESS & <span className="text-[#D4A24C]">API</span>
            </h2>
            <div className="w-[4vw] h-[0.5vw] bg-[#D4A24C] mb-[2vw] ml-auto" />
            <p className="text-[1.8vw] text-white/70 font-medium leading-relaxed">
              Retrieve Corporate Affairs Commission details instantly. Integrate securely into your apps.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
