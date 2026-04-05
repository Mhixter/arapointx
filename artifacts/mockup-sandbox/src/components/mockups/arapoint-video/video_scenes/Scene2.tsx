import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const TYPING_TEXT = '12345678901';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 3400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase !== 3) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(TYPING_TEXT.slice(0, i));
      if (i >= TYPING_TEXT.length) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-50%', opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex gap-[4vw] items-center w-full max-w-[90vw]">

        {/* Left text */}
        <div className="w-[32vw] shrink-0">
          <motion.div
            className="w-[4vw] h-[0.5vw] bg-[#6DB33F] mb-[2vw]"
            initial={{ x: '-100%', opacity: 0 }}
            animate={phase >= 1 ? { x: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
          />
          <motion.h2
            className="text-[4vw] font-black text-white leading-[1.1] tracking-tight"
            initial={{ y: 30, opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            INSTANT<br />
            IDENTITY<br />
            <span className="text-[#6DB33F]">CHECKS</span>
          </motion.h2>
          <motion.p
            className="text-[1.4vw] text-white/60 font-medium mt-[1.5vw] leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            NIN & BVN verified directly from<br />
            NIMC & CBN in under 3 seconds.
          </motion.p>

          <motion.div
            className="mt-[2vw] flex items-center gap-[1vw]"
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-[2vw] h-[2vw] rounded-full bg-[#6DB33F] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] fill-white">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[1.1vw] text-[#6DB33F] font-semibold">Identity Verified</span>
          </motion.div>
        </div>

        {/* Browser window mockup */}
        <motion.div
          className="flex-1 bg-[#0A1628] rounded-[1vw] border border-white/10 overflow-hidden shadow-2xl"
          initial={{ y: 30, opacity: 0, scale: 0.96 }}
          animate={phase >= 2 ? { y: 0, opacity: 1, scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        >
          {/* Browser chrome */}
          <div className="h-[3vw] bg-[#111827] flex items-center px-[1.2vw] gap-[1.5vw] border-b border-white/5">
            <div className="flex gap-[0.45vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500/70" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-yellow-400/70" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 bg-white/5 rounded-[0.4vw] h-[1.6vw] flex items-center px-[0.8vw] gap-[0.5vw]">
              <svg viewBox="0 0 20 20" className="w-[0.9vw] h-[0.9vw] fill-green-400/60">
                <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" />
              </svg>
              <span className="text-[0.75vw] font-mono text-white/40">arapoint.com.ng/verify</span>
            </div>
          </div>

          {/* Site nav bar */}
          <div className="h-[3.2vw] bg-[#0F2346] flex items-center justify-between px-[2vw] border-b border-white/5">
            <span className="text-[1.1vw] font-black text-white tracking-wide">ARAPOINT</span>
            <div className="flex gap-[2vw] items-center">
              {['Dashboard', 'Verify', 'History'].map((item, i) => (
                <span key={i} className={`text-[0.85vw] font-medium ${item === 'Verify' ? 'text-[#6DB33F]' : 'text-white/40'}`}>{item}</span>
              ))}
            </div>
          </div>

          {/* Page content */}
          <div className="p-[2vw]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              <div className="text-[0.8vw] text-white/30 mb-[0.3vw] uppercase tracking-widest">Identity Verification</div>
              <div className="text-[1.8vw] font-bold text-white mb-[1.5vw]">NIN Lookup</div>

              {/* Form */}
              <div className="flex gap-[1vw] mb-[1.5vw]">
                <div className="flex-1">
                  <div className="text-[0.75vw] text-white/40 mb-[0.4vw] uppercase tracking-wider">National Identification Number</div>
                  <div className={`h-[2.8vw] bg-white/5 border rounded-[0.4vw] flex items-center px-[0.8vw] font-mono text-[1.1vw] ${phase >= 3 ? 'border-[#6DB33F]/60' : 'border-white/10'}`}>
                    <span className="text-white">{typed}</span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-[0.12vw] h-[1.3vw] bg-[#6DB33F] ml-[0.1vw]"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <motion.div
                    className="h-[2.8vw] px-[1.5vw] bg-[#6DB33F] rounded-[0.4vw] flex items-center text-[0.9vw] font-bold text-white cursor-pointer"
                    animate={phase >= 4 ? { backgroundColor: '#4a9e28' } : { backgroundColor: '#6DB33F' }}
                  >
                    {phase >= 4 ? 'Verified ✓' : 'Verify Now'}
                  </motion.div>
                </div>
              </div>

              {/* Result card */}
              <motion.div
                className="bg-[#6DB33F]/10 border border-[#6DB33F]/30 rounded-[0.6vw] p-[1.2vw]"
                initial={{ opacity: 0, height: 0 }}
                animate={phase >= 4 ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              >
                <div className="flex items-center justify-between mb-[1vw]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#6DB33F]/30 flex items-center justify-center text-[#6DB33F] font-bold text-[1.1vw]">CO</div>
                    <div>
                      <div className="text-[1vw] font-bold text-white">CHUKWUEMEKA OKONKWO</div>
                      <div className="text-[0.75vw] text-white/40">NIN: 123 456 789 01</div>
                    </div>
                  </div>
                  <div className="text-[0.75vw] font-bold bg-[#6DB33F]/20 text-[#6DB33F] px-[0.8vw] py-[0.3vw] rounded-full">VERIFIED</div>
                </div>
                <div className="flex gap-[2vw] text-[0.8vw]">
                  <div><span className="text-white/40">DOB</span> <span className="text-white ml-[0.5vw]">14 May 1990</span></div>
                  <div><span className="text-white/40">Gender</span> <span className="text-white ml-[0.5vw]">Male</span></div>
                  <div><span className="text-white/40">State</span> <span className="text-white ml-[0.5vw]">Anambra</span></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
