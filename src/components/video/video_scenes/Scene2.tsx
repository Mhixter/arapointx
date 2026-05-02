import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const BVN = '22102345671';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 400));     // eyebrow + search input
    timers.push(setTimeout(() => setPhase(2), 1500));    // start typing
    BVN.split('').forEach((_, i) => {
      timers.push(setTimeout(() => setTyped(BVN.slice(0, i + 1)), 1500 + (i + 1) * 150));
    });
    timers.push(setTimeout(() => setPhase(3), 3700));    // RETRIEVE submit
    timers.push(setTimeout(() => setPhase(4), 5000));    // result card reveals
    timers.push(setTimeout(() => setPhase(5), 6800));    // photo/identity fields populate
    timers.push(setTimeout(() => setPhase(6), 11500));   // contact + registered info row
    timers.push(setTimeout(() => setPhase(7), 16500));   // bottom caption
    timers.push(setTimeout(() => setPhase(8), 21500));   // exit
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const identityFields = [
    { label: 'NAME',           value: 'ADAEZE OKONKWO' },
    { label: 'DATE OF BIRTH',  value: '14 / 03 / 1992' },
    { label: 'GENDER',         value: 'F' },
    { label: 'ENROLMENT',      value: 'AGENT' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cyan ambient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(6,182,212,0.14) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-fingerprint.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[82vw]">
        {/* Service eyebrow */}
        <motion.div
          className="flex items-center gap-[0.8vw] mb-[1.2vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="px-[0.9vw] py-[0.35vw] rounded-full text-[0.85vw] tracking-[0.32em] uppercase font-bold"
            style={{
              background: 'rgba(6,182,212,0.15)',
              color: '#06B6D4',
              border: '1px solid rgba(6,182,212,0.45)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            BVN Retrieval
          </div>
        </motion.div>

        {/* Search input */}
        <motion.div
          className="w-[55vw] mb-[2vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div
            className="text-[0.95vw] tracking-[0.32em] text-white/55 uppercase font-semibold mb-[0.7vw]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Enter 11-digit BVN
          </div>
          <div
            className="flex items-center gap-[1vw] bg-white/8 backdrop-blur-md rounded-[0.8vw] px-[1.5vw] py-[1.3vw]"
            style={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(6,182,212,0.45)',
              boxShadow: '0 0 40px -10px rgba(6,182,212,0.45)',
            }}
          >
            <div
              className="w-[1.4vw] h-[1.4vw] rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: '#06B6D4' }}
            >
              <div
                className="w-[0.6vw] h-[0.15vw] rotate-45 translate-x-[0.3vw] translate-y-[0.3vw]"
                style={{ background: '#06B6D4' }}
              />
            </div>
            <div
              className="text-[1.8vw] tracking-[0.18em] font-medium text-white flex-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {typed || '\u00A0'}
              {phase >= 2 && phase < 3 && (
                <motion.span
                  className="inline-block w-[0.15vw] h-[1.6vw] align-middle ml-[0.2vw]"
                  style={{ background: '#06B6D4' }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              )}
            </div>
            {phase >= 3 && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="px-[1.2vw] py-[0.55vw] rounded-[0.5vw] text-white text-[1.05vw] font-bold tracking-wide"
                style={{ background: '#06B6D4', fontFamily: "'Inter', sans-serif" }}
              >
                RETRIEVE
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Result card */}
        <div className="relative w-[60vw] h-[24vw]" style={{ perspective: 1400 }}>
          <motion.div
            className="absolute inset-0 rounded-[1.2vw] overflow-hidden shadow-[0_25px_70px_-20px_rgba(0,0,0,0.7)]"
            style={{
              background:
                'linear-gradient(135deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(6,182,212,0.45)',
              transformStyle: 'preserve-3d',
            }}
            initial={{ rotateX: 18, rotateY: -8, opacity: 0, y: 30 }}
            animate={
              phase >= 4
                ? { rotateX: 0, rotateY: 0, opacity: 1, y: 0 }
                : { rotateX: 18, rotateY: -8, opacity: 0, y: 30 }
            }
            transition={{ type: 'spring', stiffness: 90, damping: 20 }}
          >
            {/* Cyan guilloche */}
            <svg
              className="absolute inset-0 w-full h-full opacity-15"
              viewBox="0 0 600 250"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <path
                  key={i}
                  d={`M0,${20 + i * 9} Q150,${10 + i * 8} 300,${20 + i * 9} T600,${20 + i * 9}`}
                  stroke="#06B6D4"
                  strokeWidth="0.45"
                  fill="none"
                />
              ))}
            </svg>

            {/* Top header bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2.8vw] flex items-center px-[1.4vw] justify-between"
              style={{
                background: 'linear-gradient(90deg, #0F2346 0%, #1C3A6B 50%, #0F2346 100%)',
                borderBottom: '1px solid rgba(6,182,212,0.45)',
              }}
            >
              <div
                className="text-[1vw] tracking-[0.32em] text-white font-bold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                ARAPOINT &nbsp;·&nbsp; BVN RECORD
              </div>
              <div className="flex items-center gap-[0.5vw]">
                <div className="w-[0.45vw] h-[1.1vw] bg-white/80" />
                <div className="w-[0.45vw] h-[1.1vw]" style={{ background: '#06B6D4' }} />
                <div className="w-[0.45vw] h-[1.1vw] bg-white/80" />
              </div>
            </div>

            {/* Body */}
            <div className="absolute top-[2.8vw] left-0 right-0 bottom-0 flex p-[1.3vw] gap-[1.4vw]">
              {/* Photo placeholder */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="w-[10vw] h-[12.5vw] rounded-[0.4vw] bg-gradient-to-b from-white/15 to-white/5 border border-white/20 flex items-center justify-center relative overflow-hidden"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(45deg, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
                />
                <div
                  className="text-[4vw] font-black text-white/85"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  AO
                </div>
                {phase >= 3 && phase < 5 && (
                  <motion.div
                    className="absolute inset-x-0 h-[2vw]"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent, rgba(6,182,212,0.55), transparent)',
                    }}
                    animate={{ y: ['-2vw', '13vw', '-2vw'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </motion.div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-2 gap-x-[1.2vw] gap-y-[0.9vw] content-start pt-[0.2vw]">
                {identityFields.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                    transition={{ delay: 0.12 * i, duration: 0.55 }}
                  >
                    <div
                      className="text-[0.78vw] tracking-[0.3em] uppercase font-semibold"
                      style={{ color: '#06B6D4', fontFamily: "'Inter', sans-serif" }}
                    >
                      {f.label}
                    </div>
                    <div
                      className="text-[1.4vw] font-bold text-white mt-[0.15vw]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {f.value}
                    </div>
                  </motion.div>
                ))}

                {/* Registered phone — second batch */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={phase >= 6 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ delay: 0.05, duration: 0.55 }}
                >
                  <div
                    className="text-[0.78vw] tracking-[0.3em] uppercase font-semibold"
                    style={{ color: '#06B6D4', fontFamily: "'Inter', sans-serif" }}
                  >
                    REGISTERED PHONE
                  </div>
                  <div
                    className="text-[1.3vw] font-bold text-white mt-[0.15vw] tracking-[0.1em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    +234 803 ••• 4521
                  </div>
                </motion.div>

                {/* BVN value */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={phase >= 6 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ delay: 0.18, duration: 0.55 }}
                >
                  <div
                    className="text-[0.78vw] tracking-[0.3em] uppercase font-semibold"
                    style={{ color: '#06B6D4', fontFamily: "'Inter', sans-serif" }}
                  >
                    BVN
                  </div>
                  <div
                    className="text-[1.3vw] font-bold text-white mt-[0.15vw] tracking-[0.12em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    2210 234 5671
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Cyan seal */}
            <motion.div
              className="absolute bottom-[1vw] right-[1vw] w-[2.8vw] h-[2.8vw] rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: '#06B6D4' }}
              initial={{ scale: 0, rotate: -90 }}
              animate={phase >= 6 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 16 }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw]" fill="none" stroke="#06B6D4" strokeWidth="3">
                <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* Caption */}
        <motion.div
          className="mt-[1.6vw] text-[1.5vw] text-white/85 tracking-wide font-medium text-center"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 7 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Photo, name, registered details — <span style={{ color: '#06B6D4' }} className="font-bold">all in one place.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
