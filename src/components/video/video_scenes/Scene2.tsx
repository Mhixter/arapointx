import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Animated curl request.
 *
 * A real Arapoint developer endpoint shape is typed out line-by-line in
 * a terminal frame. After the request lands a "Sending…" pill flips to
 * "200 OK" to bridge into the next scene.
 *
 * Real route source: Arapoint/server/src/api/routes/developer/verification.ts
 *   POST /api/v1/developer/verify/nin (apiKeyAuth)
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);

  // Each line types in sequence so the developer can read the request shape.
  const lines: { text: string; tone: string; delay: number }[] = [
    { text: 'curl -X POST \\',                                                    tone: '#A7E07A', delay: 1500 },
    { text: '  https://api.arapoint.com.ng/api/v1/developer/verify/nin \\',       tone: '#22D3EE', delay: 2400 },
    { text: '  -H "Content-Type: application/json" \\',                           tone: '#A7E07A', delay: 3500 },
    { text: '  -H "x-api-key: ara_live_••••••••••••" \\',                         tone: '#FCD34D', delay: 4400 },
    { text: '  -d \'{ "nin": "12345678901" }\'',                                  tone: '#A7E07A', delay: 5400 },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline + terminal shell
      setTimeout(() => setPhase(2), 2200),   // line 1 prompt
      setTimeout(() => setPhase(3), 7400),   // sending pill
      setTimeout(() => setPhase(4), 9600),   // 200 OK pill
      setTimeout(() => setPhase(5), 11400),  // benefit row
      setTimeout(() => setPhase(6), 14400),  // closing line
      setTimeout(() => setPhase(7), 17400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Drive per-line typing using small offsets from phase>=2 onset.
  const [tickStart, setTickStart] = useState<number | null>(null);
  useEffect(() => {
    if (phase >= 2 && tickStart === null) setTickStart(performance.now());
  }, [phase, tickStart]);
  const elapsed = tickStart != null ? performance.now() - tickStart : 0;

  // Force re-render at 60fps once typing begins.
  const [, force] = useState(0);
  useEffect(() => {
    if (phase < 2 || phase >= 3) return;
    let raf = 0;
    const tick = () => { force((n) => n + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
            'radial-gradient(ellipse at 30% 30%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(167,224,122,0.08) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-[84vw]">
        <motion.div
          className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw] self-start"
          style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          // request — POST /api/v1/developer/verify/nin
        </motion.div>

        <motion.h2
          className="text-[3vw] font-black text-white leading-[1.05] tracking-tight self-start"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          One key. One header.{' '}
          <span style={{ color: '#A7E07A' }}>One endpoint.</span>
        </motion.h2>

        {/* Terminal */}
        <motion.div
          className="relative w-full mt-[1.4vw] rounded-[0.8vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1px solid rgba(34,211,238,0.40)',
            boxShadow: '0 28px 70px -22px rgba(34,211,238,0.30)',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7 }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-b border-white/10 bg-black/30">
            <div className="flex items-center gap-[0.5vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FF5F56]" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FFBD2E]" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27C93F]" />
              <div
                className="ml-[1vw] text-[0.78vw] text-white/55"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                arapoint:request.sh
              </div>
            </div>

            {/* Status pill */}
            <div className="relative h-[1.6vw] w-[6.5vw]">
              {phase >= 3 && phase < 4 && (
                <motion.div
                  key="sending"
                  className="absolute inset-0 flex items-center justify-center px-[0.8vw] rounded-full text-[0.78vw] tracking-[0.18em] font-bold"
                  style={{
                    background: 'rgba(252,211,77,0.16)',
                    border: '1px solid rgba(252,211,77,0.55)',
                    color: '#FCD34D',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.span
                    className="inline-block mr-[0.4vw] w-[0.5vw] h-[0.5vw] rounded-full"
                    style={{ background: '#FCD34D' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                  SENDING
                </motion.div>
              )}
              {phase >= 4 && (
                <motion.div
                  key="ok"
                  className="absolute inset-0 flex items-center justify-center px-[0.8vw] rounded-full text-[0.78vw] tracking-[0.18em] font-bold"
                  style={{
                    background: 'rgba(167,224,122,0.20)',
                    border: '1px solid rgba(167,224,122,0.65)',
                    color: '#A7E07A',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  ✓ 200 OK
                </motion.div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-[1.4vw] py-[1.4vw] min-h-[14vw]">
            {lines.map((ln, i) => {
              if (phase < 2) return null;
              const lineElapsed = elapsed - ln.delay;
              if (lineElapsed < 0) return null;
              // Typing speed ~55 chars/sec.
              const charsTyped = phase >= 3 ? ln.text.length : Math.min(ln.text.length, Math.floor(lineElapsed / 18));
              return (
                <div
                  key={i}
                  className="text-[1.05vw] leading-[1.7]"
                  style={{ color: ln.tone, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {ln.text.slice(0, charsTyped)}
                  {phase < 3 && i === lines.length - 1 && charsTyped < ln.text.length && (
                    <motion.span
                      className="inline-block w-[0.5vw] h-[1.1vw] align-middle ml-[0.1vw]"
                      style={{ background: ln.tone, verticalAlign: '-0.1vw' }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Benefit row */}
        <motion.div
          className="mt-[1.4vw] flex gap-[0.8vw] justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { tone: '#A7E07A', icon: '✓', label: 'TLS by default' },
            { tone: '#22D3EE', icon: '✓', label: 'JSON in · JSON out' },
            { tone: '#FCD34D', icon: '✓', label: 'Predictable envelope' },
          ].map((b, i) => (
            <motion.div
              key={b.label}
              className="px-[1vw] py-[0.5vw] rounded-full text-[0.95vw] font-semibold"
              style={{
                background: 'rgba(15,27,46,0.65)',
                border: `1px solid ${b.tone}88`,
                color: b.tone,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ delay: 0.12 * i, duration: 0.5 }}
            >
              {b.icon} {b.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.6vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Auth, content, payload —{' '}
          <span style={{ color: '#22D3EE' }} className="font-bold">
            shipped.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
