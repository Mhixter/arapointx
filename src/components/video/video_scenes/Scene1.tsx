import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 1 — Polling pain hook.
 *
 * Developer is repeatedly polling GET /verify/.../result every 5 seconds,
 * still getting "pending". Three pain chips fade in, then the headline
 * lands: "Your server, our events. Real-time."
 *
 * Allotted: 15_000 ms. All phase timers stay <= 14_500 ms.
 */
export function Scene1() {
  const [phase, setPhase] = useState(0);
  const [polls, setPolls] = useState<Array<{ status: string; latency: string; tone: string }>>([]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // terminal frame
      setTimeout(() => setPhase(2), 1100),   // start poll loop
      setTimeout(() => setPhase(3), 7500),   // pain chips
      setTimeout(() => setPhase(4), 9700),   // headline
      setTimeout(() => setPhase(5), 12600),  // closing line
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Fire 6 polls — first 5 still pending, last one finally resolves.
  useEffect(() => {
    if (phase < 2) return;
    const sequence = [
      { status: 'pending',   latency: '128ms', tone: '#FCD34D' },
      { status: 'pending',   latency: '142ms', tone: '#FCD34D' },
      { status: 'pending',   latency: '136ms', tone: '#FCD34D' },
      { status: 'pending',   latency: '151ms', tone: '#FCD34D' },
      { status: 'pending',   latency: '129ms', tone: '#FCD34D' },
      { status: 'completed', latency: '146ms', tone: '#A7E07A' },
    ];
    const ids: any[] = [];
    sequence.forEach((row, i) => {
      ids.push(setTimeout(() => setPolls((prev) => [...prev, row]), 700 + i * 950));
    });
    return () => ids.forEach((t) => clearTimeout(t));
  }, [phase]);

  const pains = [
    { label: '5s loops, no signal', tone: '#FCA5A5' },
    { label: 'Wasted requests', tone: '#FCD34D' },
    { label: 'Stale UX',           tone: '#A78BFA' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 95%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[80vw]">
        {/* Eyebrow */}
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          // for builders · part 2
        </motion.div>

        {/* Terminal */}
        <motion.div
          className="relative w-[60vw] rounded-[0.8vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1px solid rgba(34,211,238,0.40)',
            boxShadow: '0 28px 70px -22px rgba(34,211,238,0.30)',
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header bar */}
          <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.7vw] border-b border-white/10 bg-black/30">
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FF5F56]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FFBD2E]" />
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27C93F]" />
            <div
              className="ml-[1vw] text-[0.78vw] text-white/55"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ~/your-app — polling-loop.sh
            </div>
            <div className="ml-auto text-[0.78vw] text-white/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              every 5s
            </div>
          </div>

          {/* Loop body */}
          <div className="px-[1.4vw] py-[1.2vw] min-h-[19vw]">
            <div
              className="text-[1.1vw] mb-[0.7vw]"
              style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
            >
              $ while true; do curl -s GET /verify/unified/result/$ID; sleep 5; done
            </div>

            <div className="flex flex-col gap-[0.45vw]">
              {polls.map((p, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-[1vw] text-[1vw]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <span className="text-white/40">[{String(i + 1).padStart(2, '0')}:0{i * 5}]</span>
                  <span className="text-white/75">→ HTTP 200</span>
                  <span className="text-white/55">·</span>
                  <span className="text-white/75">{p.latency}</span>
                  <span className="text-white/55">·</span>
                  <span
                    className="px-[0.7vw] py-[0.18vw] rounded-full text-[0.85vw] font-bold tracking-[0.18em]"
                    style={{
                      background: `${p.tone}22`,
                      color: p.tone,
                      border: `1px solid ${p.tone}66`,
                    }}
                  >
                    {p.status}
                  </span>
                </motion.div>
              ))}
              {phase >= 2 && polls.length < 6 && (
                <motion.span
                  className="inline-block w-[0.6vw] h-[1.2vw] mt-[0.3vw]"
                  style={{ background: '#A7E07A' }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Pain chips */}
        <motion.div
          className="mt-[1.4vw] flex flex-wrap gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {pains.map((p, i) => (
            <motion.div
              key={p.label}
              className="px-[1.1vw] py-[0.5vw] rounded-full text-[1vw] font-semibold"
              style={{
                background: 'rgba(15,27,46,0.85)',
                border: `1px solid ${p.tone}88`,
                color: p.tone,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.18 * i, duration: 0.5 }}
            >
              ✗ {p.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-[1.6vw] text-[3.4vw] font-black text-white text-center leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Your server.{' '}
          <span style={{ color: '#22D3EE' }}>Our events.</span>{' '}
          Real-time.
        </motion.h1>

        {/* Closing line */}
        <motion.div
          className="mt-[1vw] text-[1.3vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Arapoint{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">
            Webhooks.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
