import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 3 — Idempotency.
 *
 * Two identical POSTs are sent with the same X-Idempotency-Key. The first
 * runs end-to-end (charged + verified). The second is replayed from the
 * 24-hour cache — same response body, no re-charge — and the response
 * carries `X-Idempotent-Replay: true`.
 *
 * Sourced from Arapoint/server/src/api/middleware/idempotency.ts
 *   - Header: X-Idempotency-Key (max 255 chars, scoped to user)
 *   - TTL:    24 hours
 *   - Replay header: X-Idempotent-Replay: true
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),    // header
      setTimeout(() => setPhase(2), 1100),   // request 1 in
      setTimeout(() => setPhase(3), 4200),   // request 1 result
      setTimeout(() => setPhase(4), 7400),   // request 2 in (duplicate)
      setTimeout(() => setPhase(5), 10400),  // request 2 result (replay)
      setTimeout(() => setPhase(6), 13700),  // takeaway
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

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
            'radial-gradient(ellipse at 50% 30%, rgba(167,139,250,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-[5vw]">
        <motion.div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#A78BFA', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
        >
          // X-Idempotency-Key
        </motion.div>

        <motion.h2
          className="text-[2.6vw] font-black text-white text-center mb-[1.4vw] leading-[1.05]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7 }}
        >
          Send it twice. <span style={{ color: '#A78BFA' }}>Charge it once.</span>
        </motion.h2>

        <div className="grid grid-cols-2 gap-[1.4vw] w-[84vw]">
          {/* Request 1 — first time */}
          <motion.div
            className="rounded-[0.8vw] overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)', border: '1px solid rgba(167,224,122,0.40)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30 text-[0.78vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="px-[0.5vw] py-[0.1vw] rounded text-[#A7E07A] bg-[#A7E07A]/10 border border-[#A7E07A]/30">POST</span>
              <span className="text-white/65">request #1 — fresh call</span>
            </div>
            <pre className="px-[1vw] py-[0.8vw] text-[0.85vw] leading-[1.6] text-white/85 m-0 min-h-[10vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
{`X-Idempotency-Key: pay_8f3a92e1
X-API-Key:         ara_live_••••3a91
Content-Type:      application/json

{
  "nin": "12345678901"
}`}
            </pre>
            <motion.div
              className="mx-[1vw] mb-[1vw] mt-[0.4vw] px-[0.9vw] py-[0.7vw] rounded-[0.4vw]"
              style={{ background: 'rgba(167,224,122,0.10)', border: '1px solid rgba(167,224,122,0.45)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-[0.7vw] text-[0.92vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="px-[0.5vw] py-[0.1vw] rounded font-bold text-[#A7E07A] bg-[#A7E07A]/10 border border-[#A7E07A]/55">HTTP 200</span>
                <span className="text-white/65">verified · charged ₦130</span>
                <span className="ml-auto text-white/45">stored 24h</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Request 2 — duplicate, replay */}
          <motion.div
            className="rounded-[0.8vw] overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)', border: '1px solid rgba(167,139,250,0.40)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30 text-[0.78vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="px-[0.5vw] py-[0.1vw] rounded text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/30">POST</span>
              <span className="text-white/65">request #2 — same key, retried</span>
            </div>
            <pre className="px-[1vw] py-[0.8vw] text-[0.85vw] leading-[1.6] text-white/85 m-0 min-h-[10vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
{`X-Idempotency-Key: pay_8f3a92e1   ← same
X-API-Key:         ara_live_••••3a91
Content-Type:      application/json

{
  "nin": "12345678901"
}`}
            </pre>
            <motion.div
              className="mx-[1vw] mb-[1vw] mt-[0.4vw] px-[0.9vw] py-[0.7vw] rounded-[0.4vw]"
              style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.45)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-[0.7vw] text-[0.92vw] mb-[0.3vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="px-[0.5vw] py-[0.1vw] rounded font-bold text-[#A7E07A] bg-[#A7E07A]/10 border border-[#A7E07A]/55">HTTP 200</span>
                <span className="text-white/65">replayed from cache · ₦0 charged</span>
              </div>
              <div className="text-[0.82vw] text-white/65" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="text-white/45">response header →</span>{' '}
                <span className="text-[#A78BFA]">X-Idempotent-Replay: true</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="mt-[1.6vw] text-[1.15vw] text-white/85 text-center font-medium"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          24-hour cache ·{' '}
          <span style={{ color: '#A78BFA' }} className="font-bold">scoped to your account</span>{' '}
          · safe to retry on any network blip
        </motion.div>
      </div>
    </motion.div>
  );
}
