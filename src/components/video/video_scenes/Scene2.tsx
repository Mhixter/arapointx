import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 2 — Register a webhook.
 *
 * Real route from Arapoint/server/src/api/routes/developer/webhooks.ts:
 *   POST /api/v1/developer/webhook
 *   body:    { webhookUrl, enabled }
 *   guard:   webhookUrl must start with "https://"
 *   returns: { webhookUrl, webhookSecret: 'ara_wh_<64 hex>', webhookEnabled }
 *   message: "Webhook configured. Save your new secret — it will not be shown again."
 *
 * Allotted: 18_000 ms. All phase timers stay <= 17_500 ms.
 */
export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [reqLines, setReqLines] = useState<string[]>([]);
  const [resLines, setResLines] = useState<string[]>([]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // header
      setTimeout(() => setPhase(2), 1100),   // request panel
      setTimeout(() => setPhase(3), 7800),   // 200 OK + response panel
      setTimeout(() => setPhase(4), 13400),  // secret callout
      setTimeout(() => setPhase(5), 17000),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Stream the request body line-by-line
  useEffect(() => {
    if (phase < 2) return;
    const lines = [
      'curl -X POST https://api.arapoint.com.ng/api/v1/developer/webhook \\',
      "  -H 'Authorization: Bearer <dashboard JWT>' \\",
      "  -H 'Content-Type: application/json' \\",
      "  -d '{",
      '    "webhookUrl": "https://api.yourapp.ng/hooks/arapoint",',
      '    "enabled":    true',
      "  }'",
    ];
    let i = 0;
    const id = setInterval(() => {
      i++;
      setReqLines(lines.slice(0, i));
      if (i >= lines.length) clearInterval(id);
    }, 720);
    return () => clearInterval(id);
  }, [phase]);

  // Stream the response body line-by-line
  useEffect(() => {
    if (phase < 3) return;
    const lines = [
      '{',
      '  "status":  "success",',
      '  "code":    200,',
      '  "message": "Webhook configured.',
      '              Save your new secret —',
      '              it will not be shown again.",',
      '  "data": {',
      '    "webhookUrl":     "https://api.yourapp.ng/hooks/arapoint",',
      '    "webhookSecret":  "ara_wh_a1f3...8c2f",',
      '    "webhookEnabled": true',
      '  }',
      '}',
    ];
    let i = 0;
    const id = setInterval(() => {
      i++;
      setResLines(lines.slice(0, i));
      if (i >= lines.length) clearInterval(id);
    }, 380);
    return () => clearInterval(id);
  }, [phase]);

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
            // step 1 — register
          </div>
          <h2
            className="text-[2.6vw] font-black text-white tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Tell us where to send events.{' '}
            <span style={{ color: '#22D3EE' }}>HTTPS only.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-[1.4vw]">
          {/* Request panel */}
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
                request
              </div>
              <div
                className="text-[0.78vw] text-white/55"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                POST /api/v1/developer/webhook
              </div>
            </div>
            <div
              className="px-[1vw] py-[1vw] min-h-[20vw] text-[0.92vw] leading-[1.7]"
              style={{ color: '#E2F4FA', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {reqLines.map((l, i) => (
                <div key={i} className="whitespace-pre">{l}</div>
              ))}
            </div>
          </motion.div>

          {/* Response panel */}
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
                response · 200 ok
              </div>
              <div
                className="px-[0.6vw] py-[0.18vw] rounded-full text-[0.75vw] font-bold tracking-[0.18em]"
                style={{
                  background: 'rgba(167,224,122,0.18)',
                  color: '#A7E07A',
                  border: '1px solid rgba(167,224,122,0.55)',
                }}
              >
                ✓ saved
              </div>
            </div>
            <div
              className="px-[1vw] py-[1vw] min-h-[20vw] text-[0.92vw] leading-[1.7]"
              style={{ color: '#E2F4FA', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {resLines.map((l, i) => (
                <div
                  key={i}
                  className="whitespace-pre"
                  style={{
                    color: l.includes('webhookSecret')
                      ? '#FCD34D'
                      : l.includes('webhookEnabled') || l.includes('webhookUrl')
                      ? '#A7E07A'
                      : '#E2F4FA',
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Secret callout */}
        <motion.div
          className="mt-[1.2vw] mx-auto w-[64vw] rounded-[0.6vw] px-[1.4vw] py-[1vw] flex items-center gap-[1.4vw]"
          style={{
            background:
              'linear-gradient(135deg, rgba(252,211,77,0.16) 0%, rgba(15,27,46,0.55) 60%)',
            border: '1.5px solid rgba(252,211,77,0.55)',
            boxShadow: '0 14px 30px -14px rgba(252,211,77,0.40)',
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="text-[1.6vw]"
            style={{ color: '#FCD34D' }}
          >
            ⚠
          </div>
          <div className="flex-1">
            <div
              className="text-[0.85vw] tracking-[0.32em] uppercase font-bold mb-[0.2vw]"
              style={{ color: '#FCD34D', fontFamily: "'JetBrains Mono', monospace" }}
            >
              shown once
            </div>
            <div
              className="text-[1.1vw] text-white/90"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Save the <span className="font-bold" style={{ color: '#FCD34D' }}>ara_wh_</span> secret —
              it never appears in the dashboard again. You'll use it to verify every event.
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
