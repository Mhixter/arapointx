import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scene 4 — Analytics dashboard reveal.
 *
 * Mirrors GET /api/v1/developer/analytics + GET /api/v1/developer/logs:
 *   - 4 stat tiles: totalCalls, successRate, avgDurationMs, totalSpent
 *   - 14-day request-volume bar chart
 *   - top endpoints list (sourced from API_PRICES catalog in shared.ts)
 *   - recent requests log
 *
 * Allotted: 22_000 ms.
 */
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 350),    // header
      setTimeout(() => setPhase(2), 1000),   // tiles
      setTimeout(() => setPhase(3), 4400),   // chart
      setTimeout(() => setPhase(4), 8200),   // endpoints
      setTimeout(() => setPhase(5), 12200),  // recent log
      setTimeout(() => setPhase(6), 19200),  // takeaway
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const tiles = [
    { label: 'Total calls',  value: '47,219',     sub: '30 days', tone: '#22D3EE' },
    { label: 'Success rate', value: '99.4%',      sub: '↑ 0.3%',  tone: '#A7E07A' },
    { label: 'Avg latency',  value: '142ms',      sub: 'p50',     tone: '#FCD34D' },
    { label: 'Total spent',  value: '₦5.86M',     sub: '30 days', tone: '#A78BFA' },
  ];

  const chartBars = [
    1.2, 1.4, 1.1, 1.6, 1.8, 1.3, 1.0,
    1.5, 2.1, 2.4, 2.6, 2.2, 2.9, 3.4,
  ];
  const chartMax = Math.max(...chartBars);

  const endpoints = [
    { path: '/verify/nin',        calls: 18420, spent: '₦2.39M', tone: '#22D3EE' },
    { path: '/verify/bvn',        calls: 11280, spent: '₦902K',  tone: '#A7E07A' },
    { path: '/verify/unified',    calls:  4910, spent: '₦1.96M', tone: '#A78BFA' },
    { path: '/verify/education',  calls:  3640, spent: '₦910K',  tone: '#FCD34D' },
  ];

  const logs = [
    { time: '15:02:14', method: 'POST', path: '/verify/nin',     code: 200, latency: '138ms', cost: '₦130' },
    { time: '15:02:11', method: 'POST', path: '/verify/bvn',     code: 200, latency: '152ms', cost:  '₦80' },
    { time: '15:02:06', method: 'POST', path: '/verify/unified', code: 200, latency: '247ms', cost: '₦340' },
    { time: '15:01:58', method: 'POST', path: '/verify/nin',     code: 429, latency:  '38ms', cost:   '₦0' },
    { time: '15:01:51', method: 'POST', path: '/verify/nin',     code: 200, latency: '141ms', cost: '₦130' },
  ];

  const codeTone = (c: number) => (c >= 200 && c < 300 ? '#A7E07A' : c === 429 ? '#FCD34D' : '#FCA5A5');

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
            'radial-gradient(ellipse at 50% 18%, rgba(34,211,238,0.10) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(5,11,22,0.95) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-[4vw] py-[3vw]">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-[1.2vw]"
          initial={{ opacity: 0, y: -10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="text-[0.85vw] tracking-[0.42em] uppercase font-bold" style={{ color: '#22D3EE', fontFamily: "'JetBrains Mono', monospace" }}>
              GET /api/v1/developer/analytics
            </div>
            <h2 className="text-[2.2vw] font-black text-white tracking-tight mt-[0.2vw] leading-[1.05]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              You're never flying blind.
            </h2>
          </div>
          <div className="flex items-center gap-[0.6vw] text-[0.85vw] text-white/65" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <motion.span
              className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#A7E07A]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span>live · environment: live</span>
          </div>
        </motion.div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-[1vw] mb-[1.2vw]">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              className="rounded-[0.6vw] px-[1.2vw] py-[1vw]"
              style={{
                background: 'linear-gradient(160deg, rgba(15,27,46,0.95) 0%, rgba(5,11,22,0.95) 100%)',
                border: `1px solid ${t.tone}55`,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <div className="text-[0.78vw] tracking-[0.22em] uppercase text-white/55 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {t.label}
              </div>
              <div className="text-[2.2vw] font-black mt-[0.3vw] leading-none" style={{ color: t.tone, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {t.value}
              </div>
              <div className="text-[0.82vw] text-white/55 mt-[0.4vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {t.sub}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-[1vw] flex-1 min-h-0">
          {/* LEFT — chart + endpoints (col-span 2) */}
          <div className="col-span-2 flex flex-col gap-[1vw] min-h-0">
            {/* Chart */}
            <motion.div
              className="rounded-[0.6vw] px-[1.2vw] py-[1vw] flex flex-col"
              style={{ background: 'rgba(15,27,46,0.85)', border: '1px solid rgba(34,211,238,0.30)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-baseline justify-between mb-[0.6vw]">
                <div className="text-[0.85vw] tracking-[0.22em] uppercase text-white/65 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  request volume · last 14d
                </div>
                <div className="text-[0.78vw] text-white/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  thousands of calls / day
                </div>
              </div>
              <div className="flex items-end gap-[0.5vw] h-[7vw]">
                {chartBars.map((v, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-[0.2vw]"
                    style={{
                      background: i === chartBars.length - 1
                        ? 'linear-gradient(180deg, #22D3EE 0%, #1B7AA0 100%)'
                        : 'linear-gradient(180deg, #22D3EE99 0%, #1B7AA044 100%)',
                    }}
                    initial={{ height: 0 }}
                    animate={phase >= 3 ? { height: `${(v / chartMax) * 100}%` } : { height: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Endpoints */}
            <motion.div
              className="rounded-[0.6vw] px-[1.2vw] py-[1vw] flex-1 min-h-0"
              style={{ background: 'rgba(15,27,46,0.85)', border: '1px solid rgba(167,139,250,0.30)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-[0.85vw] tracking-[0.22em] uppercase text-white/65 font-bold mb-[0.7vw]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                top endpoints
              </div>
              <div className="flex flex-col gap-[0.5vw]">
                {endpoints.map((e, i) => (
                  <motion.div
                    key={e.path}
                    className="flex items-center gap-[1vw] text-[0.92vw]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                  >
                    <span className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: e.tone }} />
                    <span className="text-white/85 w-[10vw]">{e.path}</span>
                    <div className="flex-1 h-[0.5vw] rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: e.tone }}
                        initial={{ width: 0 }}
                        animate={phase >= 4 ? { width: `${(e.calls / 18420) * 100}%` } : { width: 0 }}
                        transition={{ delay: 0.08 * i + 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="text-white/65 w-[5vw] text-right">{e.calls.toLocaleString()}</span>
                    <span className="text-white/85 w-[4vw] text-right font-bold" style={{ color: e.tone }}>{e.spent}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT — recent requests (logs) */}
          <motion.div
            className="rounded-[0.6vw] px-[1.2vw] py-[1vw] flex flex-col min-h-0"
            style={{ background: 'rgba(15,27,46,0.85)', border: '1px solid rgba(252,211,77,0.30)' }}
            initial={{ opacity: 0, x: 12 }}
            animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-baseline justify-between mb-[0.7vw]">
              <div className="text-[0.85vw] tracking-[0.22em] uppercase text-white/65 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                /developer/logs
              </div>
              <div className="text-[0.72vw] text-white/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                page 1
              </div>
            </div>

            <div className="flex flex-col gap-[0.4vw]">
              {logs.map((l, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-[0.5vw] text-[0.78vw]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                >
                  <span className="text-white/45">{l.time}</span>
                  <span className="text-white/55">{l.method}</span>
                  <span className="text-white/85 flex-1 truncate">{l.path}</span>
                  <span
                    className="px-[0.4vw] py-[0.05vw] rounded font-bold"
                    style={{ background: `${codeTone(l.code)}1A`, color: codeTone(l.code), border: `1px solid ${codeTone(l.code)}55` }}
                  >
                    {l.code}
                  </span>
                  <span className="text-white/55 w-[3.5vw] text-right">{l.latency}</span>
                  <span className="text-white/65 w-[2.8vw] text-right">{l.cost}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-auto pt-[0.8vw] text-[0.78vw] text-white/55 border-t border-white/10"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              initial={{ opacity: 0 }}
              animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-[#A7E07A]">●</span> every request — body, status, latency, spend
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
