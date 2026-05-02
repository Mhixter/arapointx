import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — Earn while you help (Agent recruitment hook).
 *
 * Centered figure (stylized agent silhouette) surrounded by orbiting service
 * chips. Sets up the value prop: serve your community, earn for your work.
 *
 * Allotted: 14_000 ms. All phase timers stay <= 13_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // headline in
      setTimeout(() => setPhase(2), 2400),   // figure + chips
      setTimeout(() => setPhase(3), 6800),   // benefit pills
      setTimeout(() => setPhase(4), 10200),  // closing line
      setTimeout(() => setPhase(5), 13200),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Service requests orbiting around the agent figure.
  const requests = [
    { label: 'NIN slip', x: -28, y: -18, tone: '#6DB33F' },
    { label: 'WAEC check', x: 28, y: -18, tone: '#016B3A' },
    { label: 'BVN retrieval', x: -32, y: 0, tone: '#0EA5E9' },
    { label: 'IPE clearance', x: 32, y: 0, tone: '#D4A24C' },
    { label: 'CAC search', x: -28, y: 18, tone: '#A16207' },
    { label: 'Birth attest.', x: 28, y: 18, tone: '#D4A24C' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A1628]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(109,179,63,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(10,22,40,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          For people who serve
        </motion.div>

        <motion.h1
          className="text-[4.6vw] font-black text-white text-center leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Earn while you{' '}
          <span style={{ color: '#6DB33F' }}>help your community.</span>
        </motion.h1>

        {/* Agent figure with orbiting service requests */}
        <motion.div
          className="relative mt-[3vw] w-[44vw] h-[16vw]"
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Stylized agent figure (abstract) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[12vw] h-[12vw] rounded-full flex flex-col items-center justify-center"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, rgba(109,179,63,0.25), rgba(15,35,70,0.85) 65%)',
              border: '1.5px solid rgba(109,179,63,0.55)',
              boxShadow: '0 0 80px -10px rgba(109,179,63,0.45)',
            }}
          >
            {/* Head */}
            <div
              className="w-[2.4vw] h-[2.4vw] rounded-full mt-[1.5vw]"
              style={{
                background: 'linear-gradient(135deg, #A7E07A, #4F8B23)',
                boxShadow: '0 0 24px rgba(109,179,63,0.6)',
              }}
            />
            {/* Body / shoulders */}
            <div
              className="mt-[0.4vw] w-[5vw] h-[4vw] rounded-t-[2.5vw]"
              style={{
                background: 'linear-gradient(180deg, rgba(109,179,63,0.55) 0%, rgba(109,179,63,0.18) 100%)',
                border: '1px solid rgba(109,179,63,0.4)',
                borderBottom: 'none',
              }}
            />
            {/* "AGENT" label */}
            <div
              className="absolute bottom-[1.4vw] text-[0.85vw] tracking-[0.34em] uppercase font-bold"
              style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
            >
              Agent
            </div>
          </div>

          {/* Orbiting service-request chips */}
          {requests.map((r, i) => (
            <motion.div
              key={r.label}
              className="absolute px-[1vw] py-[0.5vw] rounded-full text-[0.95vw] font-bold pointer-events-none flex items-center gap-[0.4vw]"
              style={{
                left: `${50 + r.x}%`,
                top: `${50 + r.y * 1.5}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(15,35,70,0.85)',
                border: `1px solid ${r.tone}AA`,
                color: 'white',
                fontFamily: "'Inter', sans-serif",
                backdropFilter: 'blur(6px)',
                boxShadow: `0 8px 22px -8px ${r.tone}66`,
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={
                phase >= 2
                  ? { opacity: 1, scale: 1, y: [0, -4, 0] }
                  : { opacity: 0, scale: 0.6 }
              }
              transition={{
                opacity: { delay: 0.4 + 0.12 * i, duration: 0.5 },
                scale: { delay: 0.4 + 0.12 * i, duration: 0.5 },
                y: { duration: 3 + (i % 3) * 0.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <div
                className="w-[0.6vw] h-[0.6vw] rounded-full"
                style={{ background: r.tone, boxShadow: `0 0 8px ${r.tone}` }}
              />
              {r.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Benefit pills */}
        <motion.div
          className="mt-[2.4vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {['Real jobs', 'Real customers', 'Real pay — same day'].map((label, i) => (
            <motion.div
              key={label}
              className="px-[1.2vw] py-[0.5vw] rounded-full text-[1.05vw] font-semibold"
              style={{
                background: 'rgba(109,179,63,0.10)',
                border: '1px solid rgba(109,179,63,0.45)',
                color: '#A7E07A',
                fontFamily: "'Inter', sans-serif",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.12 * i, duration: 0.5 }}
            >
              {label}
            </motion.div>
          ))}
        </motion.div>

        {/* Closing line */}
        <motion.div
          className="mt-[2vw] text-[1.55vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          The platform is ready —{' '}
          <span style={{ color: '#6DB33F' }} className="font-bold">
            are you?
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
