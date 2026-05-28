import './_group.css';
import { useState, useEffect } from 'react';

const LINES = [
  { t: 'key', v: '"status"', c: '#4ade80' },
  { t: 'key', v: '"firstName"', c: '#93c5fd' },
  { t: 'key', v: '"lastName"', c: '#93c5fd' },
  { t: 'key', v: '"nin"', c: '#fcd34d' },
  { t: 'key', v: '"decision"', c: '#4ade80' },
  { t: 'key', v: '"score"', c: '#fb923c' },
];

const VALS = ['"success"', '"CHUKWUEMEKA"', '"OKONKWO"', '"12345678901"', '"PASS"', '94'];

function Terminal() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= LINES.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 260);
    return () => clearTimeout(t);
  }, [shown]);
  useEffect(() => {
    const t = setTimeout(() => setShown(0), 6000);
    return () => clearTimeout(t);
  }, [shown === LINES.length]);

  return (
    <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, overflow: 'hidden', fontFamily: "'DM Mono', monospace", width: 480 }}>
      <div style={{ background: '#161b22', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #21262d' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 8, color: '#6e7681', fontSize: 12 }}>POST /v1/verify/nin → 200 OK</span>
        <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          live
        </span>
      </div>
      <div style={{ padding: '20px 24px', minHeight: 220, fontSize: 13, lineHeight: '28px' }}>
        <div style={{ color: '#6e7681' }}>{'{'}</div>
        {LINES.slice(0, shown).map((l, i) => (
          <div key={i} style={{ paddingLeft: 20 }}>
            <span style={{ color: l.c }}>{l.v}</span>
            <span style={{ color: '#6e7681' }}>: </span>
            <span style={{ color: '#e6edf3' }}>{VALS[i]}</span>
            {i < LINES.length - 1 && <span style={{ color: '#6e7681' }}>,</span>}
          </div>
        ))}
        {shown < LINES.length && (
          <div style={{ paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#4ade80', fontSize: 13, animation: 'blink 0.8s infinite' }}>▌</span>
          </div>
        )}
        {shown >= LINES.length && <div style={{ color: '#6e7681' }}>{'}'}</div>}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export function DarkInfrastructure() {
  return (
    <div className="ara-sans" style={{ background: '#020408', minHeight: '100vh', color: '#e6edf3', overflow: 'hidden' }}>
      <nav style={{ borderBottom: '1px solid #21262d', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>A</span>
          </div>
          <span className="ara-heading" style={{ fontWeight: 700, fontSize: 17, color: '#e6edf3' }}>Arapoint</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, color: '#8b949e' }}>
          <span>Docs</span><span>Pricing</span><span>Status</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={{ background: 'transparent', border: '1px solid #30363d', color: '#e6edf3', padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Sign in</button>
          <button style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Get API Key →</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0d2818', border: '1px solid #1a4730', borderRadius: 100, padding: '6px 14px', marginBottom: 28, fontSize: 12, color: '#4ade80' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            All systems operational · 99.98% uptime
          </div>

          <h1 className="ara-heading" style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#e6edf3' }}>Nigeria's identity</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg,#4ade80,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              infrastructure
            </span>
            <br />
            <span style={{ color: '#e6edf3' }}>layer</span>
          </h1>

          <p style={{ fontSize: 17, color: '#8b949e', lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
            NIN, BVN, WAEC, and employment screening as a single API. 
            Production-ready. NDPA compliant. Sub-2s response on identity.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
            <button style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              Start building free
              <span style={{ fontSize: 16 }}>→</span>
            </button>
            <button style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '14px 24px', borderRadius: 10, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', color: '#4ade80', fontSize: 13 }}>&lt;/&gt;</span> View docs
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6e7681', borderTop: '1px solid #21262d', paddingTop: 28 }}>
            {['250K+ verifications', '< 2s NIN/BVN', '4 exam bodies', 'NDPA compliant'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#4ade80' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Terminal />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Latency', value: '1.4s', sub: 'avg NIN response', color: '#4ade80' },
              { label: 'Decision', value: 'PASS', sub: 'confidence: 94%', color: '#22d3ee' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: '#6e7681', marginBottom: 4 }}>{s.label}</div>
                <div className="ara-mono" style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6e7681', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '64px auto 0', padding: '0 48px 0', borderTop: '1px solid #21262d', paddingTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
        {[
          { v: '250K+', l: 'Verifications' },
          { v: '99.98%', l: 'Uptime SLA' },
          { v: '< 2s', l: 'NIN/BVN response' },
          { v: '4', l: 'Exam bodies' },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: '24px 0', borderLeft: i > 0 ? '1px solid #21262d' : 'none', paddingLeft: i > 0 ? 32 : 0 }}>
            <div className="ara-heading" style={{ fontSize: 30, fontWeight: 800, color: '#e6edf3', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 13, color: '#6e7681' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
