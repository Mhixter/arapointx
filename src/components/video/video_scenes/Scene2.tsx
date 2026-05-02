import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const NIN = '12345678901';
const VNIN = 'AB12-CD34-EF56-7890';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase(1), 400));        // search input fades in
    timers.push(setTimeout(() => setPhase(2), 1400));       // start typing
    // type the NIN char-by-char between 1.4s and ~3.6s
    NIN.split('').forEach((ch, i) => {
      timers.push(setTimeout(() => setTyped(NIN.slice(0, i + 1)), 1400 + (i + 1) * 180));
    });
    timers.push(setTimeout(() => setPhase(3), 3800));       // submit / scan
    timers.push(setTimeout(() => setPhase(4), 5200));       // card reveals
    timers.push(setTimeout(() => setPhase(5), 7000));       // fields populate
    timers.push(setTimeout(() => setPhase(6), 12500));      // bottom caption
    timers.push(setTimeout(() => setPhase(7), 19500));      // exit
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const fields = [
    { label: 'NAME',           value: 'ADAEZE OKONKWO' },
    { label: 'DATE OF BIRTH',  value: '14 / 03 / 1992' },
    { label: 'GENDER',         value: 'F' },
    { label: 'STATE OF ORIGIN',value: 'ANAMBRA' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-0 opacity-10 bg-center bg-cover mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-fingerprint.png)` }}
      />

      <div className="relative z-10 flex flex-col items-center w-[78vw]">
        {/* Search input */}
        <motion.div
          className="w-[55vw] mb-[2.5vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div
            className="text-[1vw] tracking-[0.35em] text-white/50 uppercase font-semibold mb-[0.8vw]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Enter NIN
          </div>
          <div className="flex items-center gap-[1vw] bg-white/8 backdrop-blur-md border border-[#6DB33F]/40 rounded-[0.8vw] px-[1.5vw] py-[1.4vw] shadow-[0_0_40px_-10px_rgba(109,179,63,0.4)]">
            <div className="w-[1.4vw] h-[1.4vw] rounded-full border-2 border-[#6DB33F] flex items-center justify-center">
              <div className="w-[0.6vw] h-[0.15vw] bg-[#6DB33F] rotate-45 translate-x-[0.3vw] translate-y-[0.3vw]" />
            </div>
            <div
              className="text-[1.8vw] tracking-[0.18em] font-medium text-white flex-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {typed || (phase >= 1 && phase < 2 ? '\u00A0' : '\u00A0')}
              {phase >= 2 && phase < 3 && (
                <motion.span
                  className="inline-block w-[0.15vw] h-[1.6vw] bg-[#6DB33F] align-middle ml-[0.2vw]"
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
                className="px-[1.2vw] py-[0.6vw] rounded-[0.5vw] bg-[#6DB33F] text-white text-[1.1vw] font-bold tracking-wide"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                VERIFY
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Identity card */}
        <div className="relative w-[55vw] h-[26vw]" style={{ perspective: 1400 }}>
          <motion.div
            className="absolute inset-0 rounded-[1.2vw] border border-[#D4A24C]/40 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.7)] overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, #1C3A6B 0%, #0F2346 60%, #0A1628 100%)',
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
            {/* Guilloché linework */}
            <svg
              className="absolute inset-0 w-full h-full opacity-15"
              viewBox="0 0 600 280"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 28 }).map((_, i) => (
                <path
                  key={i}
                  d={`M0,${20 + i * 9} Q150,${10 + i * 8} 300,${20 + i * 9} T600,${20 + i * 9}`}
                  stroke="#D4A24C"
                  strokeWidth="0.4"
                  fill="none"
                />
              ))}
            </svg>

            {/* Top header bar */}
            <div className="absolute top-0 left-0 right-0 h-[3vw] bg-gradient-to-r from-[#0F2346] via-[#1C3A6B] to-[#0F2346] border-b border-[#6DB33F]/40 flex items-center px-[1.5vw] justify-between">
              <div
                className="text-[1.05vw] tracking-[0.35em] text-white font-bold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                ARAPOINT &nbsp;·&nbsp; IDENTITY VERIFIED
              </div>
              <div className="flex items-center gap-[0.6vw]">
                <div className="w-[0.5vw] h-[1.2vw] bg-white/80" />
                <div className="w-[0.5vw] h-[1.2vw] bg-[#6DB33F]" />
                <div className="w-[0.5vw] h-[1.2vw] bg-white/80" />
              </div>
            </div>

            {/* Body */}
            <div className="absolute top-[3vw] left-0 right-0 bottom-0 flex p-[1.5vw] gap-[1.5vw]">
              {/* Photo placeholder */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="w-[12vw] h-[15vw] rounded-[0.4vw] bg-gradient-to-b from-white/15 to-white/5 border border-white/20 flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#6DB33F]/10 to-transparent" />
                <div
                  className="text-[5vw] font-black text-white/80"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  AO
                </div>
                {phase >= 3 && phase < 5 && (
                  <motion.div
                    className="absolute inset-x-0 h-[2vw] bg-gradient-to-b from-transparent via-[#6DB33F]/40 to-transparent"
                    animate={{ y: ['-2vw', '15vw', '-2vw'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </motion.div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-2 gap-x-[1.5vw] gap-y-[1.2vw] content-center">
                {fields.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                    transition={{ delay: 0.15 * i, duration: 0.6 }}
                  >
                    <div
                      className="text-[0.85vw] tracking-[0.3em] text-[#6DB33F] uppercase font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {f.label}
                    </div>
                    <div
                      className="text-[1.6vw] font-bold text-white mt-[0.2vw]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {f.value}
                    </div>
                  </motion.div>
                ))}

                {/* vNIN row spans both cols */}
                <motion.div
                  className="col-span-2 mt-[0.3vw]"
                  initial={{ opacity: 0, x: 20 }}
                  animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  <div
                    className="text-[0.85vw] tracking-[0.3em] text-[#D4A24C] uppercase font-semibold"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Virtual NIN
                  </div>
                  <div
                    className="text-[1.5vw] font-bold text-white mt-[0.2vw] tracking-[0.15em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {VNIN}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Gold seal corner */}
            <motion.div
              className="absolute bottom-[1.2vw] right-[1.2vw] w-[3.2vw] h-[3.2vw] rounded-full border-2 border-[#D4A24C] flex items-center justify-center"
              initial={{ scale: 0, rotate: -90 }}
              animate={phase >= 5 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 180, damping: 16 }}
            >
              <div className="w-[2.4vw] h-[2.4vw] rounded-full border border-[#D4A24C]/60 flex items-center justify-center">
                <div
                  className="text-[0.85vw] font-black text-[#D4A24C] tracking-wider"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  AP
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Caption */}
        <motion.div
          className="mt-[2vw] text-[1.6vw] text-white/85 tracking-wide font-medium"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Verify any NIN <span className="text-[#6DB33F] font-bold">in seconds.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
