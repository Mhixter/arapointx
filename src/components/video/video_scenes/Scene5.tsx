import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + warning slab in
      setTimeout(() => setPhase(2), 2200),   // bank-vs-agent split rows
      setTimeout(() => setPhase(3), 5800),   // bank "X" / agent "✓"
      setTimeout(() => setPhase(4), 9500),   // trust strip: 3-5 days, affidavit, transparent pricing
      setTimeout(() => setPhase(5), 16500),  // CTA caption
      setTimeout(() => setPhase(6), 21500),  // exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const trustItems = [
    {
      label: '3–5 business days',
      sub: 'After a verified submission',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw]" fill="none" stroke="#06B6D4" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12,7 12,12 16,14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Affidavit fees included',
      sub: 'No extra running around',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw]" fill="none" stroke="#A78BFA" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="9" y1="14" x2="15" y2="14" />
          <line x1="9" y1="18" x2="13" y2="18" />
        </svg>
      ),
    },
    {
      label: 'Transparent in-app pricing',
      sub: 'See the cost before you pay',
      icon: (
        <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw]" fill="none" stroke="#06B6D4" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7" x2="12" y2="13" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.6" fill="#06B6D4" stroke="none" />
        </svg>
      ),
    },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Amber + cyan + violet wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 25%, rgba(245,158,11,0.10) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[84vw]">
        {/* Eyebrow */}
        <motion.div
          className="text-[1.05vw] tracking-[0.4em] uppercase font-semibold mb-[1vw]"
          style={{ fontFamily: "'Inter', sans-serif", color: '#F59E0B' }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Read this first
        </motion.div>

        {/* Warning slab */}
        <motion.div
          className="w-[72vw] rounded-[1vw] p-[1.6vw] flex items-start gap-[1.4vw]"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.08) 100%)',
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: 'rgba(245,158,11,0.55)',
            boxShadow: '0 25px 60px -25px rgba(0,0,0,0.7), 0 0 50px -10px rgba(245,158,11,0.3)',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div
            className="w-[4vw] h-[4vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.25)', border: '2px solid rgba(245,158,11,0.7)' }}
          >
            <svg viewBox="0 0 24 24" className="w-[2.2vw] h-[2.2vw]" fill="none" stroke="#F59E0B" strokeWidth="2.5">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
              <circle cx="12" cy="17" r="0.7" fill="#F59E0B" stroke="none" />
            </svg>
          </div>
          <div className="flex-1">
            <div
              className="text-[2vw] font-black text-white leading-[1.05]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Modification works only for{' '}
              <span style={{ color: '#F59E0B' }}>agent-enrolled BVNs.</span>
            </div>
            <div
              className="mt-[0.7vw] text-[1.25vw] text-white/85 leading-snug"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              If your BVN was enrolled at a <span className="font-bold text-white">bank branch</span>, please visit your bank — Arapoint cannot change those records.
            </div>
          </div>
        </motion.div>

        {/* Bank vs Agent split */}
        <div className="mt-[1.4vw] w-[72vw] grid grid-cols-2 gap-[1.2vw]">
          {/* Bank-enrolled — NOT supported */}
          <motion.div
            className="rounded-[0.7vw] p-[1.1vw] flex items-center gap-[1vw]"
            style={{
              background: 'rgba(239,68,68,0.10)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(239,68,68,0.45)',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="w-[2.6vw] h-[2.6vw] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1.5px solid rgba(239,68,68,0.6)' }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw]" fill="none" stroke="#FCA5A5" strokeWidth="2">
                <line x1="3" y1="22" x2="21" y2="22" />
                <line x1="6" y1="18" x2="6" y2="11" />
                <line x1="10" y1="18" x2="10" y2="11" />
                <line x1="14" y1="18" x2="14" y2="11" />
                <line x1="18" y1="18" x2="18" y2="11" />
                <polygon points="2,11 12,4 22,11" />
              </svg>
            </div>
            <div className="flex-1">
              <div
                className="text-[1.05vw] font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Bank-enrolled BVN
              </div>
              <div
                className="text-[0.85vw] text-white/60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Visit your bank branch
              </div>
            </div>
            <motion.div
              className="w-[2.4vw] h-[2.4vw] rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.25)', border: '1.5px solid rgba(239,68,68,0.65)' }}
              initial={{ scale: 0 }}
              animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.3vw] h-[1.3vw]" fill="none" stroke="#FCA5A5" strokeWidth="3">
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              </svg>
            </motion.div>
          </motion.div>

          {/* Agent-enrolled — supported */}
          <motion.div
            className="rounded-[0.7vw] p-[1.1vw] flex items-center gap-[1vw]"
            style={{
              background: 'rgba(139,92,246,0.10)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(139,92,246,0.5)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div
              className="w-[2.6vw] h-[2.6vw] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1.5px solid rgba(139,92,246,0.6)' }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.6vw] h-[1.6vw]" fill="none" stroke="#A78BFA" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <div
                className="text-[1.05vw] font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Agent-enrolled BVN
              </div>
              <div
                className="text-[0.85vw] text-white/60"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Modify with Arapoint
              </div>
            </div>
            <motion.div
              className="w-[2.4vw] h-[2.4vw] rounded-full flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.25)', border: '1.5px solid rgba(139,92,246,0.65)' }}
              initial={{ scale: 0 }}
              animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
            >
              <svg viewBox="0 0 24 24" className="w-[1.3vw] h-[1.3vw]" fill="none" stroke="#A78BFA" strokeWidth="3">
                <polyline points="5,12 10,17 19,7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* Trust strip */}
        <motion.div
          className="mt-[1.6vw] w-[72vw] grid grid-cols-3 gap-[1vw]"
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7 }}
        >
          {trustItems.map((item, i) => (
            <motion.div
              key={i}
              className="rounded-[0.7vw] p-[1.1vw] flex items-center gap-[1vw] bg-white/5 border border-white/15"
              initial={{ opacity: 0, y: 14 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.55, delay: 0.12 * i }}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <div>
                <div
                  className="text-[1.05vw] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-[0.8vw] text-white/55 mt-[0.15vw]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom caption */}
        <motion.div
          className="mt-[1.6vw] text-[1.35vw] text-white/85 text-center max-w-[60vw] leading-snug font-medium"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Banking-grade reliability. <span style={{ color: '#06B6D4' }} className="font-bold">Agent-grade speed.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
