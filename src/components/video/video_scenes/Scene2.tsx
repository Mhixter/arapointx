import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Traffic spike → 429 → exponential backoff retry.
 *
 * Left: a stream of POST /verify/nin requests showing 200s, then a 429
 * with the real Arapoint response shape and rate-limit headers.
 * Right: the client's exponential-backoff retry plan (1s → 2s → 4s)
 * which then succeeds.
 *
 * All shapes mirror Arapoint/server/src/api/routes/developer/shared.ts:
 *   { status: 'error', code: 429, message: '...', retry_after: <seconds> }
 *   X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset / Retry-After
 *
 * Allotted: 20_000 ms. All phase timers stay <= 19_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [reqs, setReqs] = useState<Array<{ code: number; latency: string; tone: string; remaining: number }>>([]);
  const [retryStep, setRetryStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),    // header
      setTimeout(() => setPhase(2), 1000),   // start request stream
      setTimeout(() => setPhase(3), 7800),   // show 429 envelope
      setTimeout(() => setPhase(4), 11200),  // show backoff plan
      setTimeout(() => setPhase(5), 18800),  // success badge
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Stream requests: 5 successes with falling X-RateLimit-Remaining inside
  // the live burst window of 60/min, then the 6th call trips the limit.
  useEffect(() => {
    if (phase < 2) return;
    const seq = [
      { code: 200, latency: '142ms', tone: '#A7E07A', remaining: 4 },
      { code: 200, latency: '128ms', tone: '#A7E07A', remaining: 3 },
      { code: 200, latency: '139ms', tone: '#A7E07A', remaining: 2 },
      { code: 200, latency: '146ms', tone: '#A7E07A', remaining: 1 },
      { code: 200, latency: '151ms', tone: '#A7E07A', remaining: 0 },
      { code: 429, latency:  '38ms', tone: '#FCA5A5', remaining: 0 },
    ];
    const ids: ReturnType<typeof setTimeout>[] = [];
    seq.forEach((row, i) => {
      ids.push(setTimeout(() => setReqs((prev) => [...prev, row]), 600 + i * 950));
    });
    return () => ids.forEach((t) => clearTimeout(t));
  }, [phase]);

  // The 429 envelope mirrors the real Arapoint developer rate-limit response:
  //   - X-RateLimit-Limit:     60 (live burst, per shared.ts BURST_LIMITS)
  //   - X-RateLimit-Remaining: 0
  //   - X-RateLimit-Reset:     unix-second when the window rolls over
  //   - JSON body:             { status, code, message, retry_after }
  // (Note: the developer auth path does NOT send a Retry-After header — the
  //  retry hint lives in the JSON body's retry_after field.)

  // Retry steps step in one at a time after phase 4.
  useEffect(() => {
    if (phase < 4) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    [1, 2, 3].forEach((step, i) => {
      ids.push(setTimeout(() => setRetryStep(step), 600 + i * 1700));
    });
    return () => ids.forEach((t) => clearTimeout(t));
  }, [phase]);

  const retryPlan = [
    { wait: '1s',  attempt: 'attempt 1', code: 429, tone: '#FCA5A5', label: 'still throttled' },
    { wait: '2s',  attempt: 'attempt 2', code: 429, tone: '#FCD34D', label: 'window cooling' },
    { wait: '4s',  attempt: 'attempt 3', code: 200, tone: '#A7E07A', label: 'request succeeded' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 25%, rgba(252,165,165,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-[5vw]">
        <motion.div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
        >
          // 429 · rate limit hit
        </motion.div>

        <motion.h2
          className="text-[2.6vw] font-black text-white text-center mb-[1.6vw] leading-[1.05]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7 }}
        >
          We don't refuse. <span style={{ color: '#22D3EE' }}>We tell you when.</span>
        </motion.h2>

        <div className="grid grid-cols-2 gap-[1.4vw] w-[88vw]">
          {/* LEFT — request stream + 429 envelope */}
          <motion.div
            className="rounded-[0.8vw] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1px solid rgba(252,165,165,0.40)',
            }}
            initial={{ opacity: 0, x: -16 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30 text-[0.78vw] text-white/65" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="px-[0.5vw] py-[0.1vw] rounded text-[#A7E07A] bg-[#A7E07A]/10 border border-[#A7E07A]/30">POST</span>
              <span>/api/v1/developer/verify/nin</span>
              <span className="ml-auto text-white/45">burst: 60/min · sandbox: 10/min</span>
            </div>

            <div className="px-[1vw] py-[0.9vw] flex flex-col gap-[0.35vw] min-h-[14vw]">
              {reqs.map((r, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-[0.7vw] text-[0.92vw]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-white/40">[{String(i + 1).padStart(2, '0')}]</span>
                  <span
                    className="px-[0.55vw] py-[0.1vw] rounded font-bold"
                    style={{ background: `${r.tone}1A`, color: r.tone, border: `1px solid ${r.tone}55` }}
                  >
                    HTTP {r.code}
                  </span>
                  <span className="text-white/55">·</span>
                  <span className="text-white/70">{r.latency}</span>
                  <span className="ml-auto text-white/50">X-RateLimit-Remaining: <span className="text-white/85">{r.remaining}</span></span>
                </motion.div>
              ))}
            </div>

            {/* 429 envelope */}
            <motion.div
              className="mx-[1vw] mb-[1vw] rounded-[0.5vw] overflow-hidden"
              style={{ background: 'rgba(252,165,165,0.08)', border: '1px solid rgba(252,165,165,0.45)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.6 }}
            >
              <div className="px-[0.9vw] py-[0.45vw] text-[0.82vw] text-[#FCA5A5] tracking-[0.2em] uppercase font-bold border-b border-[#FCA5A5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                response · 429 too many requests
              </div>
              <pre className="px-[0.9vw] py-[0.55vw] text-[0.78vw] leading-[1.5] text-white/75 m-0 border-b border-white/5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
{`X-RateLimit-Limit:     60
X-RateLimit-Remaining: 0
X-RateLimit-Reset:     1746230447`}
              </pre>
              <pre className="px-[0.9vw] py-[0.55vw] text-[0.85vw] leading-[1.55] text-white/85 m-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
{`{
  "status":      "error",
  "code":        429,
  "message":     "Burst limit exceeded. Maximum 60
                  requests per minute on live, 10
                  on sandbox.",
  "retry_after": 47
}`}
              </pre>
            </motion.div>
          </motion.div>

          {/* RIGHT — exponential backoff plan */}
          <motion.div
            className="rounded-[0.8vw] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1px solid rgba(34,211,238,0.40)',
            }}
            initial={{ opacity: 0, x: 16 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30 text-[0.78vw] text-white/65" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="px-[0.5vw] py-[0.1vw] rounded text-[#22D3EE] bg-[#22D3EE]/10 border border-[#22D3EE]/30">CLIENT</span>
              <span>retry-with-backoff (1s · 2s · 4s)</span>
            </div>

            <div className="px-[1.2vw] py-[1vw] flex flex-col gap-[0.6vw] min-h-[14vw]">
              {retryPlan.map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-[1vw] px-[0.9vw] py-[0.6vw] rounded-[0.4vw]"
                  style={{
                    background: 'rgba(15,27,46,0.85)',
                    border: `1px solid ${s.tone}66`,
                  }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={retryStep > i ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                  transition={{ duration: 0.45 }}
                >
                  <div
                    className="text-[1.2vw] font-bold"
                    style={{ color: s.tone, fontFamily: "'JetBrains Mono', monospace", minWidth: '4vw' }}
                  >
                    +{s.wait}
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.95vw] text-white/85 font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {s.attempt}
                    </div>
                    <div className="text-[0.78vw] text-white/55 mt-[0.1vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.label}
                    </div>
                  </div>
                  <div
                    className="px-[0.7vw] py-[0.2vw] rounded text-[0.85vw] font-bold"
                    style={{ background: `${s.tone}1A`, color: s.tone, border: `1px solid ${s.tone}55`, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    HTTP {s.code}
                  </div>
                </motion.div>
              ))}

              <motion.div
                className="mt-auto self-end px-[1vw] py-[0.5vw] rounded-full text-[0.95vw] font-bold"
                style={{
                  background: 'rgba(167,224,122,0.15)',
                  color: '#A7E07A',
                  border: '1px solid rgba(167,224,122,0.55)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={phase >= 5 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
              >
                ✓ recovered in &lt; 7s
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
