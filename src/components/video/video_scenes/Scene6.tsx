import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BrandFooter from '../BrandFooter';

/**
 * Scene 6 — Security (IP allowlist + key management) + analytics + brand close.
 *
 * Real route sources:
 *   GET/POST/DELETE /api/v1/developer/security/ip-allowlist (security.ts)
 *   GET/POST/DELETE /api/v1/developer/api-keys             (apikeys.ts)
 *   GET            /api/v1/developer/analytics             (analytics.ts)
 *
 * Allotted: 28_000 ms. All phase timers stay <= 27_500 ms.
 */
export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),    // eyebrow + headline
      setTimeout(() => setPhase(2), 2400),   // API keys panel
      setTimeout(() => setPhase(3), 5800),   // IP allowlist panel
      setTimeout(() => setPhase(4), 9000),   // analytics panel
      setTimeout(() => setPhase(5), 13800),  // CTA line
      setTimeout(() => setPhase(6), 16400),  // brand footer reveal
      setTimeout(() => setPhase(7), 27500),  // exit prep
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const apiKeys = [
    { name: 'web-app · live',  env: 'LIVE',  tone: '#A7E07A', mask: 'ara_live_••••3a91' },
    { name: 'mobile · sandbox', env: 'SBX',  tone: '#FCD34D', mask: 'ara_sand_•••••8c2f' },
  ];
  const ipRows = [
    { ip: '203.0.113.42',   note: 'web prod · NG-LAG-01' },
    { ip: '198.51.100.17',  note: 'web prod · NG-ABV-01' },
    { ip: '192.0.2.88',     note: 'office · CI runner' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div
        className="absolute inset-0 opacity-10 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}logos/arapoint-logo-clear.png)`,
          backgroundSize: '50vh auto',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 25% 25%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, rgba(167,224,122,0.10) 0%, transparent 55%)',
        }}
      />

      {phase < 6 && (
        <div className="relative z-10 flex flex-col items-center w-[88vw]">
          <motion.div
            className="text-[1vw] tracking-[0.42em] uppercase font-bold mb-[0.6vw]"
            style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6 }}
          >
            // security · keys · analytics
          </motion.div>

          <motion.h2
            className="text-[3.2vw] font-black text-white text-center leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Built for{' '}
            <span style={{ color: '#22D3EE' }}>production teams.</span>
          </motion.h2>

          <div className="mt-[2vw] grid grid-cols-3 gap-[1vw] w-full">
            {/* API Keys */}
            <motion.div
              className="rounded-[0.6vw] p-[1.2vw]"
              style={{
                background: 'rgba(15,27,46,0.65)',
                border: '1px solid rgba(167,224,122,0.45)',
                borderTop: '0.4vw solid #A7E07A',
                boxShadow: '0 14px 30px -14px rgba(167,224,122,0.4)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-[0.5vw] mb-[0.6vw]">
                <div
                  className="px-[0.5vw] py-[0.2vw] rounded text-[0.62vw] font-black tracking-[0.2em]"
                  style={{
                    background: 'rgba(167,224,122,0.18)',
                    color: '#A7E07A',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  GET /api-keys
                </div>
              </div>
              <div
                className="text-[1.3vw] font-black text-white leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                API keys per project
              </div>
              <div className="mt-[0.7vw] flex flex-col gap-[0.4vw]">
                {apiKeys.map((k) => (
                  <div
                    key={k.mask}
                    className="px-[0.7vw] py-[0.45vw] rounded-[0.3vw] flex items-center justify-between"
                    style={{
                      background: 'rgba(5,11,22,0.65)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[0.78vw] text-white/85 truncate"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {k.name}
                      </div>
                      <div
                        className="text-[0.7vw] text-white/55 truncate"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {k.mask}
                      </div>
                    </div>
                    <div
                      className="px-[0.4vw] py-[0.15vw] rounded-full text-[0.62vw] font-black tracking-[0.18em]"
                      style={{
                        background: `${k.tone}22`,
                        border: `1px solid ${k.tone}88`,
                        color: k.tone,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {k.env}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* IP Allowlist */}
            <motion.div
              className="rounded-[0.6vw] p-[1.2vw]"
              style={{
                background: 'rgba(15,27,46,0.65)',
                border: '1px solid rgba(34,211,238,0.45)',
                borderTop: '0.4vw solid #22D3EE',
                boxShadow: '0 14px 30px -14px rgba(34,211,238,0.4)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-[0.5vw] mb-[0.6vw]">
                <div
                  className="px-[0.5vw] py-[0.2vw] rounded text-[0.62vw] font-black tracking-[0.2em]"
                  style={{
                    background: 'rgba(34,211,238,0.18)',
                    color: '#22D3EE',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  POST /security/ip-allowlist
                </div>
              </div>
              <div
                className="text-[1.3vw] font-black text-white leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                IP allowlist
              </div>
              <div className="mt-[0.7vw] flex flex-col gap-[0.35vw]">
                {ipRows.map((r) => (
                  <div
                    key={r.ip}
                    className="px-[0.7vw] py-[0.45vw] rounded-[0.3vw] flex items-center gap-[0.5vw]"
                    style={{
                      background: 'rgba(5,11,22,0.65)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <div
                      className="text-[0.62vw] font-black"
                      style={{ color: '#A7E07A', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[0.85vw] text-white/90"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {r.ip}
                      </div>
                      <div
                        className="text-[0.65vw] text-white/55"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {r.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Analytics */}
            <motion.div
              className="rounded-[0.6vw] p-[1.2vw]"
              style={{
                background: 'rgba(15,27,46,0.65)',
                border: '1px solid rgba(252,211,77,0.45)',
                borderTop: '0.4vw solid #FCD34D',
                boxShadow: '0 14px 30px -14px rgba(252,211,77,0.4)',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-[0.5vw] mb-[0.6vw]">
                <div
                  className="px-[0.5vw] py-[0.2vw] rounded text-[0.62vw] font-black tracking-[0.2em]"
                  style={{
                    background: 'rgba(252,211,77,0.18)',
                    color: '#FCD34D',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  GET /analytics
                </div>
              </div>
              <div
                className="text-[1.3vw] font-black text-white leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Live analytics
              </div>
              <div className="mt-[0.7vw] grid grid-cols-2 gap-[0.5vw]">
                {[
                  { v: '124,830', l: 'requests · 30d' },
                  { v: '328 ms',  l: 'p95 latency' },
                  { v: '99.7%',   l: '2xx rate' },
                  { v: 'NIN',     l: 'top service' },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="px-[0.6vw] py-[0.5vw] rounded-[0.3vw]"
                    style={{
                      background: 'rgba(5,11,22,0.65)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <div
                      className="text-[1vw] font-black text-white leading-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {m.v}
                    </div>
                    <div
                      className="text-[0.6vw] text-white/55 mt-[0.2vw] tracking-[0.14em] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {m.l}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            className="mt-[2vw] text-[1.6vw] text-white/85 text-center font-medium tracking-wide"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.7 }}
          >
            Start in the sandbox today —{' '}
            <span style={{ color: '#A7E07A' }} className="font-bold">
              ship to production tomorrow.
            </span>
          </motion.div>
        </div>
      )}

      {phase >= 6 && <BrandFooter variant="full" delay={0} />}
    </motion.div>
  );
}
