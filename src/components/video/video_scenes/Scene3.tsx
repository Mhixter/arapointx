import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const OLD_NAME = 'ADEZE OKONKWO';
const NEW_NAME = 'ADAEZE OKONKWO';

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const [oldTyped, setOldTyped] = useState('');
  const [newTyped, setNewTyped] = useState('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 400));    // service eyebrow + form
    timers.push(setTimeout(() => setPhase(2), 1500));   // begin typing OLD
    OLD_NAME.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setOldTyped(OLD_NAME.slice(0, i + 1)), 1500 + (i + 1) * 70));
    });
    timers.push(setTimeout(() => setPhase(3), 3500));   // begin typing NEW
    NEW_NAME.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setNewTyped(NEW_NAME.slice(0, i + 1)), 3500 + (i + 1) * 70));
    });
    timers.push(setTimeout(() => setPhase(4), 5800));   // arrow + diff highlight
    timers.push(setTimeout(() => setPhase(5), 8500));   // submit chip + queue beat
    timers.push(setTimeout(() => setPhase(6), 12500));  // caption
    timers.push(setTimeout(() => setPhase(7), 17500));  // exit
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Compute character-level diff highlighting for the new name
  const diffNew = (text: string) =>
    text.split('').map((ch, i) => {
      const sameAsOld = OLD_NAME[i] === ch;
      return (
        <span key={i} style={{ color: sameAsOld ? 'white' : '#8B5CF6' }}>
          {ch}
        </span>
      );
    });

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Violet ambient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(139,92,246,0.14) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-data-flow.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[82vw]">
        {/* Service eyebrow */}
        <motion.div
          className="flex items-center gap-[0.8vw] mb-[1vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="px-[0.9vw] py-[0.35vw] rounded-full text-[0.85vw] tracking-[0.32em] uppercase font-bold"
            style={{
              background: 'rgba(139,92,246,0.18)',
              color: '#A78BFA',
              border: '1px solid rgba(139,92,246,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            BVN Modification · Name
          </div>
        </motion.div>

        <motion.h2
          className="text-[2.6vw] font-black text-white text-center leading-[1.1] mb-[2vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Fix a misspelt name. <span style={{ color: '#A78BFA' }}>Submit in minutes.</span>
        </motion.h2>

        {/* Form card */}
        <motion.div
          className="w-[64vw] rounded-[1vw] p-[1.6vw]"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            backdropFilter: 'blur(10px)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'rgba(139,92,246,0.35)',
            boxShadow: '0 25px 60px -25px rgba(0,0,0,0.7)',
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          {/* BVN row */}
          <div className="flex gap-[1.2vw] mb-[1.4vw]">
            <div className="flex-1">
              <div
                className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold mb-[0.4vw]"
                style={{ color: '#A78BFA', fontFamily: "'Inter', sans-serif" }}
              >
                BVN
              </div>
              <div
                className="px-[1vw] py-[0.85vw] rounded-[0.5vw] bg-white/5 border border-white/15 text-[1.3vw] font-bold text-white tracking-[0.18em]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                2210 234 5671
              </div>
            </div>
            <div className="w-[16vw]">
              <div
                className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold mb-[0.4vw]"
                style={{ color: '#A78BFA', fontFamily: "'Inter', sans-serif" }}
              >
                Category
              </div>
              <div
                className="px-[1vw] py-[0.85vw] rounded-[0.5vw] flex items-center justify-between text-[1vw] font-bold text-white"
                style={{
                  background: 'rgba(139,92,246,0.18)',
                  border: '1px solid rgba(139,92,246,0.5)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Change of Name
                <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw]" fill="none" stroke="#A78BFA" strokeWidth="2.5">
                  <polyline points="6,9 12,15 18,9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Old / New name row */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-[1vw] items-end">
            {/* Old */}
            <div>
              <div
                className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold mb-[0.4vw] text-white/60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Current Name
              </div>
              <div
                className="px-[1vw] py-[1.1vw] rounded-[0.5vw] bg-white/5 border border-white/15 text-[1.5vw] font-bold text-white/90 tracking-wider"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {oldTyped || '\u00A0'}
                {phase >= 2 && phase < 3 && (
                  <motion.span
                    className="inline-block w-[0.15vw] h-[1.4vw] align-middle ml-[0.2vw] bg-white/60"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  />
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="pb-[1.1vw] flex items-center justify-center">
              <motion.div
                className="w-[3vw] h-[3vw] rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.55)',
                }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={phase >= 4 ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <svg viewBox="0 0 24 24" className="w-[1.4vw] h-[1.4vw]" fill="none" stroke="#A78BFA" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  <polyline points="13,6 19,12 13,18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>

            {/* New */}
            <div>
              <div
                className="text-[0.8vw] tracking-[0.3em] uppercase font-semibold mb-[0.4vw]"
                style={{ color: '#A78BFA', fontFamily: "'Inter', sans-serif" }}
              >
                New Name
              </div>
              <div
                className="px-[1vw] py-[1.1vw] rounded-[0.5vw] text-[1.5vw] font-bold tracking-wider"
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.55)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: phase >= 4 ? '0 0 30px -8px rgba(139,92,246,0.55)' : 'none',
                  transition: 'box-shadow 0.5s ease',
                }}
              >
                {newTyped ? diffNew(newTyped) : '\u00A0'}
                {phase >= 3 && phase < 4 && (
                  <motion.span
                    className="inline-block w-[0.15vw] h-[1.4vw] align-middle ml-[0.2vw]"
                    style={{ background: '#A78BFA' }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Submit chip */}
          <motion.div
            className="mt-[1.6vw] flex items-center justify-end gap-[1vw]"
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-[0.95vw] tracking-[0.18em] uppercase text-white/55 font-semibold"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Cost shown in-app · 3–5 business days
            </div>
            <div
              className="px-[1.6vw] py-[0.8vw] rounded-[0.5vw] text-white text-[1.05vw] font-bold tracking-wide flex items-center gap-[0.6vw]"
              style={{ background: '#8B5CF6', fontFamily: "'Inter', sans-serif" }}
            >
              SUBMIT REQUEST
              <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw]" fill="none" stroke="white" strokeWidth="3">
                <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {/* Caption */}
        <motion.div
          className="mt-[1.5vw] text-[1.4vw] text-white/85 tracking-wide font-medium text-center max-w-[60vw]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Old name in. New name out. <span style={{ color: '#A78BFA' }} className="font-bold">Arapoint handles the rest.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
