import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — Retry semantics.
 *
 * Real schedule from Arapoint/server/src/services/webhookService.ts:37
 *   RETRY_DELAYS = [1m, 5m, 15m, 1h]   (max 4 retries; total 5 attempts)
 * Retries are persisted in webhook_retry_queue and reprocessed every 30s by
 * the background processor. After all retries the row is marked 'failed'.
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // header
      setTimeout(() => setPhase(2), 1300),   // attempt 1: 500
      setTimeout(() => setPhase(3), 3300),   // attempt 2 queued (1m)
      setTimeout(() => setPhase(4), 5300),   // attempt 3 queued (5m)
      setTimeout(() => setPhase(5), 7300),   // attempt 4 queued (15m)
      setTimeout(() => setPhase(6), 9300),   // attempt 5 queued (1h)
      setTimeout(() => setPhase(7), 11600),  // attempt 5 success
      setTimeout(() => setPhase(8), 14000),  // bottom callout
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Each row's "active" phase is the phase at which it appears.
  // The success-or-fail outcome flips at phase 7 for the last row only.
  const rows = [
    { attempt: 1, when: 't+0',    label: 'first delivery',          status: '500',     ok: false, appearAt: 2 },
    { attempt: 2, when: 't+1m',   label: 'retry · 1 minute',        status: '500',     ok: false, appearAt: 3 },
    { attempt: 3, when: 't+5m',   label: 'retry · 5 minutes',       status: '500',     ok: false, appearAt: 4 },
    { attempt: 4, when: 't+15m',  label: 'retry · 15 minutes',      status: '500',     ok: false, appearAt: 5 },
    { attempt: 5, when: 't+1h',   label: 'retry · 1 hour',          status: '200',     ok: true,  appearAt: 6 },
  ];

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
            'radial-gradient(ellipse at 50% 30%, rgba(252,165,165,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-[80vw]">
        {/* Eyebrow + headline */}
        <motion.div
          className="text-center mb-[1.2vw]"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.95vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#FCA5A5', fontFamily: "'JetBrains Mono', monospace" }}
          >
            // step 3 — your server is down
          </div>
          <h2
            className="text-[2.6vw] font-black text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            We retry.{' '}
            <span style={{ color: '#A7E07A' }}>Four times.</span>{' '}
            With backoff.
          </h2>
        </motion.div>

        {/* Retry timeline */}
        <div
          className="rounded-[0.7vw] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0F1B2E 0%, #050B16 100%)',
            border: '1.5px solid rgba(255,255,255,0.10)',
            boxShadow: '0 22px 50px -20px rgba(0,0,0,0.45)',
          }}
        >
          <div className="flex items-center justify-between px-[1.2vw] py-[0.6vw] border-b border-white/10 bg-black/30">
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-bold"
              style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}
            >
              webhook_retry_queue
            </div>
            <div
              className="text-[0.78vw] text-white/55"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              processor sweeps every 30s
            </div>
          </div>

          <div className="px-[1.2vw] py-[1vw] flex flex-col gap-[0.55vw]">
            {rows.map((r) => {
              const visible = phase >= r.appearAt;
              const isLast = r.attempt === 5;
              const showSuccess = isLast && phase >= 7;
              const tone = showSuccess ? '#A7E07A' : visible ? '#FCA5A5' : '#475569';
              const status = showSuccess ? '200 OK' : visible ? `${r.status} ✗` : '· · ·';
              return (
                <motion.div
                  key={r.attempt}
                  className="grid grid-cols-[7vw_5vw_1fr_8vw_5vw] items-center gap-[1vw] px-[0.9vw] py-[0.55vw] rounded-[0.45vw]"
                  style={{
                    background: visible ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.10)',
                    border: `1px solid ${tone}66`,
                  }}
                  initial={{ opacity: 0, x: -12 }}
                  animate={visible ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <div
                    className="text-[0.95vw] font-bold tracking-[0.18em]"
                    style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {r.when}
                  </div>
                  <div
                    className="text-[0.95vw] font-bold"
                    style={{ color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    #{r.attempt}
                  </div>
                  <div
                    className="text-[1vw] text-white/85"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {r.label}
                  </div>
                  <div
                    className="text-[0.95vw] font-bold tracking-[0.16em] text-right"
                    style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {status}
                  </div>
                  <div className="flex justify-end">
                    {visible && (
                      <span
                        className="px-[0.55vw] py-[0.16vw] rounded-full text-[0.7vw] font-bold tracking-[0.18em]"
                        style={{
                          background: `${tone}1A`,
                          color: tone,
                          border: `1px solid ${tone}66`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {showSuccess ? 'delivered' : 'queued'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom callout */}
        <motion.div
          className="mt-[1.2vw] grid grid-cols-3 gap-[1vw]"
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 8 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.6 }}
        >
          {[
            { tone: '#A7E07A', title: '5 attempts', body: '1 first try + 4 retries' },
            { tone: '#22D3EE', title: 'every attempt logged', body: 'GET /webhook/logs' },
            { tone: '#FCD34D', title: 'no event silently lost', body: 'queued, swept, retried' },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-[0.5vw] p-[0.9vw]"
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
                className="text-[0.95vw] text-white/85"
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
