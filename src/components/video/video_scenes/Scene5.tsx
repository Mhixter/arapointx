import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Signature verification.
 *
 * Real signing from webhookService.ts:45
 *   signature = HMAC-SHA256(JSON.stringify(payload), webhookSecret).hex
 *   sent as header: X-Arapoint-Signature: <hex>
 *
 * Real headers (webhookService.ts:78):
 *   X-Arapoint-Signature, X-Arapoint-Event, User-Agent: Arapoint-Webhook/1.0
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // header
      setTimeout(() => setPhase(2), 1300),   // headers panel
      setTimeout(() => setPhase(3), 4300),   // verify snippet
      setTimeout(() => setPhase(4), 9300),   // verified pill flips
      setTimeout(() => setPhase(5), 11600),  // bottom rules
      setTimeout(() => setPhase(6), 15500),  // exit prep
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
            'radial-gradient(ellipse at 50% 30%, rgba(167,224,122,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-[88vw]">
        {/* Eyebrow + headline */}
        <motion.div
          className="text-center mb-[1.2vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
          >
            // step 4 — trust the source
          </div>
          <h2
            className="text-[2.6vw] font-black text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Every event is{' '}
            <span style={{ color: '#A7E07A' }}>signed.</span>{' '}
            Verify before you trust.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-[1.4vw]">
          {/* Headers panel */}
          <motion.div
            className="rounded-[0.7vw] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1.5px solid rgba(34,211,238,0.45)',
              boxShadow: '0 22px 50px -20px rgba(34,211,238,0.40)',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30">
              <div
                className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
              >
                request headers
              </div>
              <div
                className="text-[0.78vw] text-white/55"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                from arapoint
              </div>
            </div>
            <div
              className="px-[1vw] py-[1vw] min-h-[16vw] text-[0.95vw] leading-[2]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <div>
                <span style={{ color: '#94A3B8' }}>Content-Type</span>
                <span style={{ color: '#94A3B8' }}>: </span>
                <span style={{ color: '#E2F4FA' }}>application/json</span>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>User-Agent</span>
                <span style={{ color: '#94A3B8' }}>: </span>
                <span style={{ color: '#E2F4FA' }}>Arapoint-Webhook/1.0</span>
              </div>
              <div>
                <span style={{ color: '#22D3EE' }}>X-Arapoint-Event</span>
                <span style={{ color: '#94A3B8' }}>: </span>
                <span style={{ color: '#A7E07A' }}>verification.completed</span>
              </div>
              <div>
                <span style={{ color: '#FCD34D' }}>X-Arapoint-Signature</span>
                <span style={{ color: '#94A3B8' }}>: </span>
                <span style={{ color: '#FCD34D' }}>7b2c4f...3e8a1d</span>
              </div>
              <div className="mt-[0.6vw] text-[0.78vw] text-white/55">
                ↳ hex digest of HMAC-SHA256(rawBody, ara_wh_…)
              </div>
            </div>
          </motion.div>

          {/* Verify snippet panel */}
          <motion.div
            className="rounded-[0.7vw] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
              border: '1.5px solid rgba(167,224,122,0.45)',
              boxShadow: '0 22px 50px -20px rgba(167,224,122,0.40)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-[1vw] py-[0.6vw] border-b border-white/10 bg-black/30">
              <div
                className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
                style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                your handler · node.js
              </div>
              <motion.div
                className="px-[0.6vw] py-[0.18vw] rounded-full text-[0.75vw] font-bold tracking-[0.18em]"
                style={{
                  background: phase >= 4 ? 'rgba(167,224,122,0.18)' : 'rgba(252,211,77,0.18)',
                  color: phase >= 4 ? '#A7E07A' : '#FCD34D',
                  border: `1px solid ${phase >= 4 ? 'rgba(167,224,122,0.55)' : 'rgba(252,211,77,0.55)'}`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                animate={phase >= 4 ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {phase >= 4 ? '✓ verified' : '… checking'}
              </motion.div>
            </div>
            <div
              className="px-[1vw] py-[1vw] min-h-[16vw] text-[0.92vw] leading-[1.7]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E2F4FA' }}
            >
              <div><span style={{ color: '#A78BFA' }}>import</span> <span style={{ color: '#FCD34D' }}>crypto</span> <span style={{ color: '#A78BFA' }}>from</span> <span style={{ color: '#A7E07A' }}>'crypto'</span>;</div>
              <div className="mt-[0.4vw]">
                <span style={{ color: '#A78BFA' }}>const</span>{' '}
                <span style={{ color: '#22D3EE' }}>expected</span> = crypto
              </div>
              <div>{`  .createHmac(`}<span style={{ color: '#A7E07A' }}>'sha256'</span>, WEBHOOK_SECRET)</div>
              <div>{`  .update(rawBody)`}</div>
              <div>{`  .digest(`}<span style={{ color: '#A7E07A' }}>'hex'</span>);</div>
              <div className="mt-[0.6vw]">
                <span style={{ color: '#A78BFA' }}>if</span> (!crypto.<span style={{ color: '#FCD34D' }}>timingSafeEqual</span>(
              </div>
              <div>{`  Buffer.from(`}<span style={{ color: '#22D3EE' }}>expected</span>, <span style={{ color: '#A7E07A' }}>'hex'</span>),</div>
              <div>{`  Buffer.from(req.headers[`}<span style={{ color: '#A7E07A' }}>'x-arapoint-signature'</span>], <span style={{ color: '#A7E07A' }}>'hex'</span>)</div>
              <div>)) <span style={{ color: '#A78BFA' }}>return</span> res.<span style={{ color: '#FCD34D' }}>sendStatus</span>(<span style={{ color: '#FCA5A5' }}>401</span>);</div>
            </div>
          </motion.div>
        </div>

        {/* Bottom rules */}
        <motion.div
          className="mt-[1vw] grid grid-cols-3 gap-[1vw]"
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.6 }}
        >
          {[
            { tone: '#22D3EE', title: 'always HTTPS',  body: 'plain http is rejected on register' },
            { tone: '#A7E07A', title: 'compare safely', body: 'use timing-safe comparison' },
            { tone: '#FCA5A5', title: 'reject mismatch', body: '401 — never process the body' },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-[0.5vw] p-[0.85vw]"
              style={{
                background: 'rgba(15,27,46,0.85)',
                border: `1px solid ${c.tone}66`,
              }}
            >
              <div
                className="text-[0.78vw] tracking-[0.32em] uppercase font-bold mb-[0.2vw]"
                style={{ color: c.tone, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {c.title}
              </div>
              <div
                className="text-[0.92vw] text-white/85"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {c.body}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
