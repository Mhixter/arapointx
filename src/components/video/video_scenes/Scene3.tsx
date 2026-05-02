import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Event lifecycle (the centerpiece).
 *
 * Split-screen: Arapoint (left) → animated payload card travelling along
 * a pulsing connection line → Your server (right) → 200 OK ack flying back.
 *
 * Real payload shape (webhookService.ts:60):
 *   { event, timestamp, data: { jobId, status, result, error } }
 *
 * Real headers sent (webhookService.ts:78):
 *   X-Arapoint-Signature, X-Arapoint-Event, User-Agent: Arapoint-Webhook/1.0
 *
 * Real event types (verification.ts + bot.ts + webhooks.ts):
 *   verification.completed, verification.failed, verification.test
 *
 * Allotted: 20_000 ms. All phase timers stay <= 19_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),    // panels in
      setTimeout(() => setPhase(2), 1500),   // event fires (left pulse)
      setTimeout(() => setPhase(3), 2700),   // payload card flies right
      setTimeout(() => setPhase(4), 6300),   // payload arrives, server logs
      setTimeout(() => setPhase(5), 8200),   // 200 OK ack flies back
      setTimeout(() => setPhase(6), 10000),  // event types strip
      setTimeout(() => setPhase(7), 19500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 25% 50%, rgba(34,211,238,0.10) 0%, transparent 45%), radial-gradient(ellipse at 75% 50%, rgba(167,224,122,0.10) 0%, transparent 45%)',
        }}
      />

      <div className="relative z-10 w-[92vw]">
        {/* Eyebrow + headline */}
        <motion.div
          className="text-center mb-[1.2vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
          >
            // step 2 — event fires
          </div>
          <h2
            className="text-[2.4vw] font-black text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            One event.{' '}
            <span style={{ color: '#22D3EE' }}>One POST.</span>{' '}
            <span style={{ color: '#A7E07A' }}>One ack.</span>
          </h2>
        </motion.div>

        {/* Two-server diagram */}
        <div className="relative grid grid-cols-2 gap-[12vw] items-stretch min-h-[28vw]">
          {/* Connection line + animated payload card on top */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] z-0">
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(to right, rgba(34,211,238,0.55) 0%, rgba(167,224,122,0.55) 100%)',
                boxShadow: '0 0 18px rgba(34,211,238,0.25)',
              }}
            />
          </div>

          {/* LEFT — Arapoint side */}
          <motion.div
            className="relative z-10 rounded-[0.7vw] p-[1.2vw] flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1.5px solid rgba(34,211,238,0.45)',
              boxShadow: '0 22px 50px -20px rgba(34,211,238,0.40)',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-[0.7vw]">
              <div
                className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
              >
                arapoint
              </div>
              {/* Pulsing node */}
              <div className="relative">
                <motion.div
                  className="w-[1vw] h-[1vw] rounded-full"
                  style={{ background: '#22D3EE' }}
                  animate={
                    phase >= 2
                      ? { scale: [1, 1.6, 1], opacity: [1, 0.6, 1] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={{ duration: 1.2, repeat: phase >= 2 ? Infinity : 0 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#22D3EE', opacity: 0.4 }}
                  animate={phase >= 2 ? { scale: [1, 2.4], opacity: [0.4, 0] } : {}}
                  transition={{ duration: 1.4, repeat: phase >= 2 ? Infinity : 0 }}
                />
              </div>
            </div>
            <div
              className="text-[1.5vw] font-bold mb-[0.4vw]"
              style={{ color: '#22D3EE', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Job completes
            </div>
            <div
              className="text-[1vw] text-white/70 mb-[1vw]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              jobId: JOB-7F2A...91C4
            </div>
            <div className="mt-auto flex flex-col gap-[0.4vw]">
              <div
                className="px-[0.7vw] py-[0.35vw] rounded-[0.4vw] text-[0.85vw]"
                style={{
                  background: 'rgba(34,211,238,0.10)',
                  border: '1px solid rgba(34,211,238,0.45)',
                  color: '#A7E07A',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                event: <span style={{ color: '#22D3EE' }}>verification.completed</span>
              </div>
              <div
                className="px-[0.7vw] py-[0.35vw] rounded-[0.4vw] text-[0.85vw]"
                style={{
                  background: 'rgba(34,211,238,0.10)',
                  border: '1px solid rgba(34,211,238,0.45)',
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                signed: HMAC-SHA256
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Your server */}
          <motion.div
            className="relative z-10 rounded-[0.7vw] p-[1.2vw] flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1.5px solid rgba(167,224,122,0.45)',
              boxShadow: '0 22px 50px -20px rgba(167,224,122,0.40)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-[0.7vw]">
              <div
                className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                your server
              </div>
              <motion.div
                className="w-[1vw] h-[1vw] rounded-full"
                style={{
                  background: phase >= 4 ? '#A7E07A' : '#475569',
                  boxShadow: phase >= 4 ? '0 0 14px rgba(167,224,122,0.7)' : 'none',
                }}
                animate={phase >= 4 ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.6 }}
              />
            </div>
            <div
              className="text-[1.5vw] font-bold mb-[0.4vw]"
              style={{ color: '#A7E07A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              POST /hooks/arapoint
            </div>
            <div
              className="text-[1vw] text-white/70 mb-[1vw]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              api.yourapp.ng
            </div>
            {/* Server log */}
            <motion.div
              className="mt-auto rounded-[0.4vw] p-[0.7vw] text-[0.78vw] leading-[1.7]"
              style={{
                background: 'rgba(0,0,0,0.40)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#A7E07A',
                fontFamily: "'JetBrains Mono', monospace",
              }}
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div>[req] X-Arapoint-Event: verification.completed</div>
              <div>[req] X-Arapoint-Signature: 7b2c...e8a1</div>
              <div className="text-white/75">[ok ] payload verified · enqueued</div>
              <div style={{ color: '#A7E07A' }}>[res] HTTP 200 · 42ms</div>
            </motion.div>
          </motion.div>

          {/* Animated payload card travelling left → right */}
          <motion.div
            className="absolute z-20 top-1/2 -translate-y-1/2 rounded-[0.5vw] p-[0.8vw] text-[0.78vw] leading-[1.55] pointer-events-none"
            style={{
              left: '32%',
              width: '36%',
              background: 'linear-gradient(135deg, rgba(15,27,46,0.95) 0%, rgba(5,11,22,0.95) 100%)',
              border: '1.5px solid rgba(34,211,238,0.55)',
              boxShadow: '0 14px 30px -10px rgba(34,211,238,0.50)',
              color: '#E2F4FA',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={
              phase >= 5
                ? { x: '0%', opacity: 0 }
                : phase >= 4
                ? { x: '0%', opacity: 1 }
                : phase >= 3
                ? { x: '0%', opacity: 1 }
                : { x: '-100%', opacity: 0 }
            }
            transition={{ duration: phase >= 3 && phase < 4 ? 3.0 : 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={{ color: '#22D3EE' }}>{`{`}</div>
            <div>{`  "event":     "verification.completed",`}</div>
            <div>{`  "timestamp": "2026-05-02T14:22:08.412Z",`}</div>
            <div>{`  "data": {`}</div>
            <div>{`    "jobId":  "JOB-7F2A...91C4",`}</div>
            <div>{`    "status": "completed",`}</div>
            <div>{`    "result": { "score": 88, "verified": true },`}</div>
            <div>{`    "error":  null`}</div>
            <div>{`  }`}</div>
            <div style={{ color: '#22D3EE' }}>{`}`}</div>
          </motion.div>

          {/* Animated 200 OK ack flying back right → left */}
          <motion.div
            className="absolute z-20 top-1/2 -translate-y-1/2 rounded-full px-[1vw] py-[0.4vw] text-[1vw] font-bold tracking-[0.2em] pointer-events-none"
            style={{
              right: '32%',
              background: 'rgba(167,224,122,0.18)',
              color: '#A7E07A',
              border: '1.5px solid rgba(167,224,122,0.65)',
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: '0 14px 30px -10px rgba(167,224,122,0.55)',
            }}
            initial={{ x: 0, opacity: 0 }}
            animate={
              phase >= 5
                ? { x: '-260%', opacity: [0, 1, 1, 0] }
                : { x: 0, opacity: 0 }
            }
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1], times: [0, 0.1, 0.85, 1] }}
          >
            ← 200 OK
          </motion.div>
        </div>

        {/* Event types strip */}
        <motion.div
          className="mt-[1.6vw] flex items-center justify-center gap-[1vw]"
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
            style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}
          >
            events you'll receive
          </div>
          {[
            { name: 'verification.completed', tone: '#A7E07A' },
            { name: 'verification.failed',    tone: '#FCA5A5' },
            { name: 'verification.test',      tone: '#FCD34D' },
          ].map((e) => (
            <div
              key={e.name}
              className="px-[0.9vw] py-[0.35vw] rounded-full text-[0.95vw] font-bold"
              style={{
                background: `${e.tone}1A`,
                color: e.tone,
                border: `1px solid ${e.tone}66`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {e.name}
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
