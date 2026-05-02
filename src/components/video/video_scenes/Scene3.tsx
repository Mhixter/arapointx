import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Job feed in motion.
 *
 * Laptop-style job-feed UI on the left. Each card walks through its lifecycle
 * (Available → Claimed → Processing → Complete) on a staggered cadence so the
 * viewer feels the rhythm of the work.
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + dashboard frame
      setTimeout(() => setPhase(2), 2200),   // card 1 (NIN) appears
      setTimeout(() => setPhase(3), 3400),   // card 2 (WAEC) appears
      setTimeout(() => setPhase(4), 4600),   // card 3 (IPE) appears
      setTimeout(() => setPhase(5), 6000),   // card 1 → claimed
      setTimeout(() => setPhase(6), 7600),   // card 2 → claimed
      setTimeout(() => setPhase(7), 9200),   // card 1 → processing
      setTimeout(() => setPhase(8), 11000),  // card 2 → processing, card 3 → claimed
      setTimeout(() => setPhase(9), 12800),  // card 1 → complete (toast)
      setTimeout(() => setPhase(10), 14400), // closing line
      setTimeout(() => setPhase(11), 17400), // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Compute card status based on phase.
  type Status = 'available' | 'claimed' | 'processing' | 'complete';
  const cards: { ref: string; service: string; sla: string; tone: string; statusAt: { phase: number; status: Status }[] }[] = [
    {
      ref: 'ARP-83401',
      service: 'NIN Slip Retrieval',
      sla: '15 min',
      tone: '#6DB33F',
      statusAt: [
        { phase: 2, status: 'available' },
        { phase: 5, status: 'claimed' },
        { phase: 7, status: 'processing' },
        { phase: 9, status: 'complete' },
      ],
    },
    {
      ref: 'ARP-83402',
      service: 'WAEC Result Check',
      sla: '20 min',
      tone: '#016B3A',
      statusAt: [
        { phase: 3, status: 'available' },
        { phase: 6, status: 'claimed' },
        { phase: 8, status: 'processing' },
      ],
    },
    {
      ref: 'ARP-83403',
      service: 'IPE Clearance',
      sla: '4 days',
      tone: '#D4A24C',
      statusAt: [
        { phase: 4, status: 'available' },
        { phase: 8, status: 'claimed' },
      ],
    },
  ];

  const statusOf = (entries: { phase: number; status: Status }[]): Status | null => {
    let current: Status | null = null;
    for (const e of entries) {
      if (phase >= e.phase) current = e.status;
    }
    return current;
  };

  const statusBadge = (status: Status) => {
    const map: Record<Status, { label: string; bg: string; border: string; color: string }> = {
      available: {
        label: 'AVAILABLE',
        bg: 'rgba(109,179,63,0.12)',
        border: 'rgba(109,179,63,0.55)',
        color: '#A7E07A',
      },
      claimed: {
        label: 'CLAIMED',
        bg: 'rgba(212,162,76,0.16)',
        border: 'rgba(212,162,76,0.6)',
        color: '#FFE9B0',
      },
      processing: {
        label: 'PROCESSING',
        bg: 'rgba(14,165,233,0.16)',
        border: 'rgba(14,165,233,0.6)',
        color: '#7DD3FC',
      },
      complete: {
        label: 'COMPLETE ✓',
        bg: 'rgba(109,179,63,0.20)',
        border: 'rgba(109,179,63,0.75)',
        color: '#A7E07A',
      },
    };
    return map[status];
  };

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
            'radial-gradient(ellipse at 30% 35%, rgba(109,179,63,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(28,58,107,0.42) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-[3vw] w-[88vw]">
        {/* Job-feed dashboard */}
        <motion.div
          className="relative w-[42vw] rounded-[1vw] overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, #1C3A6B 0%, #0F2346 50%, #0A1628 100%)',
            border: '1px solid rgba(109,179,63,0.45)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header bar */}
          <div className="px-[1.4vw] py-[1vw] flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-[0.6vw]">
              <div
                className="w-[1.4vw] h-[1.4vw] rounded-[0.3vw] flex items-center justify-center text-[0.8vw] font-black"
                style={{
                  background: 'linear-gradient(135deg, #6DB33F, #4F8B23)',
                  color: 'white',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                A
              </div>
              <div
                className="text-[1.05vw] font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Agent Console · Job Feed
              </div>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              <motion.div
                className="w-[0.6vw] h-[0.6vw] rounded-full"
                style={{ background: '#6DB33F', boxShadow: '0 0 10px #6DB33F' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <div
                className="text-[0.78vw] tracking-[0.3em] uppercase font-bold"
                style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
              >
                Live
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="px-[1.4vw] py-[1.2vw] flex flex-col gap-[0.8vw] min-h-[26vw]">
            {cards.map((c) => {
              const status = statusOf(c.statusAt);
              if (status === null) return <div key={c.ref} className="h-[5vw]" />;
              const badge = statusBadge(status);
              return (
                <motion.div
                  key={c.ref}
                  className="rounded-[0.6vw] px-[1vw] py-[0.9vw] flex items-center gap-[1vw]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderLeft: `0.4vw solid ${c.tone}`,
                  }}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[1.1vw] font-bold text-white leading-tight"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {c.service}
                    </div>
                    <div className="flex items-center gap-[0.7vw] mt-[0.2vw]">
                      <div
                        className="text-[0.7vw] text-white/55"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        ref {c.ref}
                      </div>
                      <div
                        className="text-[0.7vw] tracking-[0.22em] uppercase font-semibold"
                        style={{ color: '#FCA5A5', fontFamily: "'Inter', sans-serif" }}
                      >
                        SLA · {c.sla}
                      </div>
                    </div>
                  </div>
                  <motion.div
                    key={`${c.ref}-${status}`}
                    className="px-[0.7vw] py-[0.35vw] rounded-full text-[0.72vw] font-black tracking-[0.2em]"
                    style={{
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      fontFamily: "'Inter', sans-serif",
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {badge.label}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Completion toast */}
          <motion.div
            className="absolute bottom-[1vw] right-[1vw] flex items-center gap-[0.6vw] px-[1vw] py-[0.8vw] rounded-[0.6vw]"
            style={{
              background: 'rgba(109,179,63,0.20)',
              border: '1px solid rgba(109,179,63,0.65)',
              boxShadow: '0 12px 30px -10px rgba(109,179,63,0.45)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 9 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="w-[1.4vw] h-[1.4vw] rounded-full flex items-center justify-center text-[0.8vw] font-black"
              style={{ background: '#6DB33F', color: 'white' }}
            >
              ✓
            </div>
            <div>
              <div
                className="text-[0.85vw] font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Job complete
              </div>
              <div
                className="text-[0.65vw]"
                style={{ color: '#A7E07A', fontFamily: "'Inter', sans-serif" }}
              >
                Commission credited to wallet
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right column */}
        <div className="flex-1 flex flex-col">
          <motion.div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#6DB33F', fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            The job feed · live, always
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            See it. Claim it.{' '}
            <span style={{ color: '#6DB33F' }}>Deliver it.</span>
          </motion.h2>

          <motion.p
            className="mt-[0.8vw] text-[1.2vw] text-white/70 leading-snug"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Real requests stream in from across Nigeria. You see the service, the customer reference, and the SLA before you ever press claim.
          </motion.p>

          {/* Status legend */}
          <div className="mt-[1.4vw] flex flex-wrap gap-[0.6vw]">
            {(['AVAILABLE', 'CLAIMED', 'PROCESSING', 'COMPLETE'] as const).map((s, i) => {
              const tones = ['#A7E07A', '#FFE9B0', '#7DD3FC', '#A7E07A'];
              return (
                <motion.div
                  key={s}
                  className="px-[0.9vw] py-[0.4vw] rounded-full text-[0.85vw] font-bold tracking-[0.18em]"
                  style={{
                    background: 'rgba(15,35,70,0.55)',
                    border: `1px solid ${tones[i]}88`,
                    color: tones[i],
                    fontFamily: "'Inter', sans-serif",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                >
                  {s}
                </motion.div>
              );
            })}
          </div>

          {/* Closing line */}
          <motion.div
            className="mt-[1.8vw] text-[1.4vw] text-white/85 font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 10 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Pick what you can deliver —{' '}
            <span style={{ color: '#6DB33F' }} className="font-bold">
              and own it.
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
