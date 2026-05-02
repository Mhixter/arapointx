import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 5 — Zero-downtime key rotation.
 *
 * Three steps animated as a connected pipeline:
 *   1. POST /api/v1/developer/api-keys           → mint new key (ara_live_…)
 *   2. deploy: traffic flips from old → new
 *   3. DELETE /api/v1/developer/api-keys/:id     → revoke the old key
 *
 * Real key prefix and route shape from
 * Arapoint/server/src/api/routes/developer/apikeys.ts and shared.ts.
 *
 * Allotted: 16_000 ms. All phase timers stay <= 15_500 ms.
 */
export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),    // header
      setTimeout(() => setPhase(2), 1100),   // step 1
      setTimeout(() => setPhase(3), 5300),   // step 2 (deploy)
      setTimeout(() => setPhase(4), 9700),   // step 3 (revoke)
      setTimeout(() => setPhase(5), 14000),  // takeaway
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const steps = [
    {
      tone: '#A7E07A',
      method: 'POST',
      path: '/api/v1/developer/api-keys',
      title: 'mint a new key',
      body: 'ara_live_a1f9c4···d2',
    },
    {
      tone: '#22D3EE',
      method: 'DEPLOY',
      path: 'env API_KEY=<new>',
      title: 'deploy & cut over',
      body: 'old + new accepted in parallel',
    },
    {
      tone: '#FCA5A5',
      method: 'DELETE',
      path: '/api/v1/developer/api-keys/:id',
      title: 'revoke the old key',
      body: '"API key revoked"',
    },
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
            'radial-gradient(ellipse at 50% 28%, rgba(167,224,122,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-[6vw]">
        <motion.div
          className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.8vw]"
          style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
        >
          // key rotation · zero downtime
        </motion.div>

        <motion.h2
          className="text-[2.6vw] font-black text-white text-center mb-[1.6vw] leading-[1.05]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7 }}
        >
          Rotate keys. <span style={{ color: '#A7E07A' }}>Drop nothing.</span>
        </motion.h2>

        <div className="grid grid-cols-3 gap-[1.2vw] w-[78vw] relative">
          {/* connecting line */}
          <motion.div
            className="absolute top-[50%] left-[6vw] right-[6vw] h-[1px] -translate-y-[50%] z-0"
            style={{
              background: 'linear-gradient(90deg, #A7E07A 0%, #22D3EE 50%, #FCA5A5 100%)',
              opacity: 0.35,
            }}
            initial={{ scaleX: 0 }}
            animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {steps.map((s, i) => {
            const visible = phase >= 2 + i;
            return (
              <motion.div
                key={s.path}
                className="relative z-10 rounded-[0.7vw] overflow-hidden"
                style={{
                  background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
                  border: `1px solid ${s.tone}66`,
                  boxShadow: `0 18px 40px -16px ${s.tone}33`,
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.6 }}
              >
                <div className="px-[1vw] py-[0.7vw] border-b border-white/10 bg-black/30 flex items-center gap-[0.5vw] text-[0.78vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span
                    className="px-[0.5vw] py-[0.1vw] rounded font-bold"
                    style={{ background: `${s.tone}1A`, color: s.tone, border: `1px solid ${s.tone}55` }}
                  >
                    {s.method}
                  </span>
                  <span className="text-white/65 truncate">{s.path}</span>
                </div>
                <div className="px-[1.2vw] py-[1vw] min-h-[7vw]">
                  <div className="text-[1.1vw] font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {i + 1}. {s.title}
                  </div>
                  <div
                    className="mt-[0.7vw] px-[0.8vw] py-[0.5vw] rounded-[0.3vw] text-[0.92vw]"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      color: s.tone,
                      border: `1px solid ${s.tone}33`,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {s.body}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-[1.6vw] text-[1.15vw] text-white/85 text-center font-medium"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Up to 10 active keys per account. <span style={{ color: '#A7E07A' }} className="font-bold">No request is dropped.</span>
        </motion.div>

        {/* Real key prefix family from shared.ts → generateApiKey / generateSecretKey */}
        <motion.div
          className="mt-[0.9vw] flex flex-wrap gap-[0.6vw] justify-center text-[0.85vw]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 8 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {[
            { tag: 'ara_live_',     tone: '#A7E07A' },
            { tag: 'ara_sand_',     tone: '#22D3EE' },
            { tag: 'ara_sk_live_',  tone: '#FCD34D' },
            { tag: 'ara_sk_sand_',  tone: '#A78BFA' },
          ].map((p) => (
            <span
              key={p.tag}
              className="px-[0.7vw] py-[0.2vw] rounded-full"
              style={{
                background: `${p.tone}14`,
                color: p.tone,
                border: `1px solid ${p.tone}55`,
              }}
            >
              {p.tag}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
