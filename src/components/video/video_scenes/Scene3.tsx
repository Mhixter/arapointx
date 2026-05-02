import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // title
      setTimeout(() => setPhase(2), 1500),  // first row: phone -> NIN
      setTimeout(() => setPhase(3), 4500),  // arrow A activates / NIN populated
      setTimeout(() => setPhase(4), 7000),  // second row swap: NIN -> phone
      setTimeout(() => setPhase(5), 9500),  // arrow B activates / phone populated
      setTimeout(() => setPhase(6), 12000), // tracking-id chip + caption
      setTimeout(() => setPhase(7), 15500), // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const Pill = ({
    label,
    value,
    accent,
    show,
    delay = 0,
    mono = true,
  }: {
    label: string;
    value: string;
    accent: string;
    show: boolean;
    delay?: number;
    mono?: boolean;
  }) => (
    <motion.div
      className="w-[22vw] bg-white/6 backdrop-blur-md border border-white/15 rounded-[0.8vw] px-[1.4vw] py-[1.2vw]"
      initial={{ opacity: 0, y: 18 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.6, delay }}
    >
      <div
        className="text-[0.9vw] tracking-[0.35em] uppercase font-semibold"
        style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </div>
      <div
        className="text-[1.7vw] text-white font-bold mt-[0.3vw]"
        style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </div>
    </motion.div>
  );

  const Arrow = ({ active, reverse = false }: { active: boolean; reverse?: boolean }) => (
    <div className="relative w-[8vw] h-[2vw] flex items-center justify-center">
      <motion.div
        className="absolute h-[0.2vw] bg-white/20 left-0 right-0 top-1/2 -translate-y-1/2"
      />
      <motion.div
        className="absolute h-[0.2vw] bg-[#6DB33F] top-1/2 -translate-y-1/2"
        style={reverse ? { right: 0 } : { left: 0 }}
        initial={{ width: 0 }}
        animate={active ? { width: '100%' } : { width: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-[0.7vw] border-y-transparent ${
          reverse ? 'border-r-[1.1vw] border-r-[#6DB33F] left-0' : 'border-l-[1.1vw] border-l-[#6DB33F] right-0'
        }`}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      />
    </div>
  );

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-data-flow.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Title */}
        <motion.h2
          className="text-[3.6vw] font-black text-white text-center leading-[1.05] mb-[2.5vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7 }}
        >
          Search by phone. <span className="text-[#6DB33F]">Search by NIN.</span>
        </motion.h2>

        <div className="text-[1.2vw] text-white/60 tracking-[0.18em] uppercase font-semibold mb-[3vw]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Both directions, instantly
        </div>

        {/* Row 1: phone -> NIN */}
        <div className="flex items-center justify-center gap-[1vw] mb-[2vw]">
          <Pill label="Phone" value="+234 803 ••• 4521" accent="#6DB33F" show={phase >= 2} />
          <Arrow active={phase >= 3} />
          <Pill
            label="NIN"
            value={phase >= 3 ? '12345678901' : '•••••••••••'}
            accent="#D4A24C"
            show={phase >= 2}
            delay={0.15}
          />
        </div>

        {/* Row 2: NIN -> phone */}
        <div className="flex items-center justify-center gap-[1vw]">
          <Pill label="NIN" value="98765432109" accent="#D4A24C" show={phase >= 4} />
          <Arrow active={phase >= 5} reverse />
          <Pill
            label="Phone"
            value={phase >= 5 ? '+234 805 ••• 8902' : '••• ••• ••••'}
            accent="#6DB33F"
            show={phase >= 4}
            delay={0.15}
          />
        </div>

        {/* Tracking ID footnote chip */}
        <motion.div
          className="mt-[3vw] flex items-center gap-[1vw] text-[1.1vw] text-white/65"
          style={{ fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
        >
          <span className="px-[0.9vw] py-[0.4vw] rounded-full border border-white/25 bg-white/5 text-white/80 font-semibold tracking-wide">
            Tracking ID lookup also supported
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
