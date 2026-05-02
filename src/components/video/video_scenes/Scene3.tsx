import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — JSON response builds line-by-line.
 *
 * Real envelope shape from Arapoint/server/src/api/routes/developer/
 * verification.ts: { status, code, message, data: { verification, source,
 * cached, requestId } }. The names inside `verification` follow the
 * provider's response shape.
 *
 * Allotted: 20_000 ms. All phase timers stay <= 19_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  // Each line is revealed one at a time, then individual key callouts highlight.
  const json: { text: string; tone: 'k' | 'v' | 's' | 'b' | 'p' }[] = [
    { text: '{',                                                          tone: 'p' },
    { text: '  "status":   "success",',                                   tone: 'k' },
    { text: '  "code":     200,',                                         tone: 'k' },
    { text: '  "message":  "NIN verification completed",',                tone: 'k' },
    { text: '  "data": {',                                                tone: 'p' },
    { text: '    "verification": {',                                      tone: 'p' },
    { text: '      "firstName":   "Adaeze",',                             tone: 'k' },
    { text: '      "lastName":    "Okafor",',                             tone: 'k' },
    { text: '      "dateOfBirth": "1995-03-14",',                         tone: 'k' },
    { text: '      "gender":      "Female",',                             tone: 'k' },
    { text: '      "photo":       "data:image/jpeg;base64,…"',            tone: 'k' },
    { text: '    },',                                                     tone: 'p' },
    { text: '    "source":    "ARAPOINT",',                               tone: 'k' },
    { text: '    "cached":    false,',                                    tone: 'k' },
    { text: '    "requestId": "NIN-7F31C2"',                              tone: 'k' },
    { text: '  }',                                                        tone: 'p' },
    { text: '}',                                                          tone: 'p' },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2000),   // start streaming JSON
      setTimeout(() => setPhase(3), 12200),  // pull-out callouts
      setTimeout(() => setPhase(4), 16800),  // closing line
      setTimeout(() => setPhase(5), 19400),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Per-line stream offset
  const [streamStart, setStreamStart] = useState<number | null>(null);
  useEffect(() => {
    if (phase >= 2 && streamStart === null) setStreamStart(performance.now());
  }, [phase, streamStart]);
  const [, force] = useState(0);
  useEffect(() => {
    if (phase < 2 || phase >= 3) return;
    let raf = 0;
    const tick = () => { force((n) => n + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);
  const linesElapsed = streamStart != null ? performance.now() - streamStart : 0;
  const linesShown = phase >= 3
    ? json.length
    : Math.min(json.length, Math.floor(linesElapsed / 580));

  const colorOf = (tone: 'k' | 'v' | 's' | 'b' | 'p') => {
    if (tone === 'p') return '#7DD3FC';
    return '#E5E7EB';
  };

  // Color the values in keyed lines green if they're string literals.
  const renderLine = (text: string) => {
    const m = text.match(/^(\s*)("[^"]+":)(\s*)(.*?)(,?)$/);
    if (!m) return <span style={{ color: '#7DD3FC' }}>{text}</span>;
    const [, indent, key, sp, val, comma] = m;
    let valColor = '#FCD34D';
    if (val.startsWith('"')) valColor = '#A7E07A';
    if (val === 'true' || val === 'false' || val === 'null') valColor = '#A78BFA';
    if (/^\d/.test(val)) valColor = '#FB923C';
    if (val.endsWith('{')) valColor = '#7DD3FC';
    return (
      <>
        <span>{indent}</span>
        <span style={{ color: '#22D3EE' }}>{key}</span>
        <span>{sp}</span>
        <span style={{ color: valColor }}>{val}</span>
        <span style={{ color: '#7DD3FC' }}>{comma}</span>
      </>
    );
  };

  const callouts = [
    { label: 'Stable envelope', sub: 'status · code · message', tone: '#22D3EE', x: 4, y: 8 },
    { label: 'Verified record', sub: 'real provider data', tone: '#A7E07A', x: 60, y: 38 },
    { label: 'Traceable', sub: 'every requestId logged', tone: '#FCD34D', x: 4, y: 70 },
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
          // response — 200 OK
        </motion.div>

        <motion.h2
          className="text-[3vw] font-black text-white leading-[1.05] tracking-tight self-start"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          The same shape —{' '}
          <span style={{ color: '#A7E07A' }}>every single time.</span>
        </motion.h2>

        {/* Response panel */}
        <motion.div
          className="relative w-full mt-[1.4vw] rounded-[0.8vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1px solid rgba(167,224,122,0.40)',
            boxShadow: '0 28px 70px -22px rgba(167,224,122,0.30)',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-b border-white/10 bg-black/30">
            <div className="flex items-center gap-[0.5vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FF5F56]" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#FFBD2E]" />
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#27C93F]" />
              <div
                className="ml-[1vw] text-[0.78vw] text-white/55"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                response.json
              </div>
            </div>
            <div
              className="px-[0.8vw] py-[0.32vw] rounded-full text-[0.72vw] tracking-[0.18em] font-bold"
              style={{
                background: 'rgba(167,224,122,0.20)',
                border: '1px solid rgba(167,224,122,0.65)',
                color: '#A7E07A',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ✓ 200 OK · 412 ms
            </div>
          </div>

          <div className="relative px-[1.4vw] py-[1.2vw] min-h-[18vw]">
            {json.slice(0, linesShown).map((ln, i) => (
              <div
                key={i}
                className="text-[0.95vw] leading-[1.55]"
                style={{ color: colorOf(ln.tone), fontFamily: "'JetBrains Mono', monospace" }}
              >
                {renderLine(ln.text)}
              </div>
            ))}

            {/* Callouts */}
            {callouts.map((c, i) => (
              <motion.div
                key={c.label}
                className="absolute pointer-events-none"
                style={{ right: `${c.x}%`, top: `${c.y}%` }}
                initial={{ opacity: 0, x: 16 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{ delay: 0.18 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="px-[0.8vw] py-[0.5vw] rounded-[0.4vw]"
                  style={{
                    background: 'rgba(15,27,46,0.92)',
                    border: `1px solid ${c.tone}AA`,
                    boxShadow: `0 10px 24px -10px ${c.tone}66`,
                  }}
                >
                  <div
                    className="text-[0.78vw] font-black tracking-[0.18em]"
                    style={{ color: c.tone, fontFamily: "'Inter', sans-serif" }}
                  >
                    {c.label.toUpperCase()}
                  </div>
                  <div
                    className="text-[0.7vw] text-white/70 mt-[0.1vw]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {c.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Closing line */}
        <motion.div
          className="mt-[1.4vw] text-[1.4vw] text-white/85 text-center font-medium tracking-wide"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7 }}
        >
          Parse it once,{' '}
          <span style={{ color: '#A7E07A' }} className="font-bold">
            ship it everywhere.
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
