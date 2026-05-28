import './_group.css';

const BADGES = [
  { label: 'NIN', color: '#16a34a', bg: '#dcfce7' },
  { label: 'BVN', color: '#1d4ed8', bg: '#dbeafe' },
  { label: 'WAEC', color: '#9333ea', bg: '#f3e8ff' },
  { label: 'NECO', color: '#b45309', bg: '#fef3c7' },
  { label: 'PASS', color: '#fff', bg: '#16a34a' },
];

function VerificationCard({ name, type, result, delay }: { name: string; type: string; result: string; delay: number }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e5e7eb',
      borderRadius: 14,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      animation: `slideup 0.5s ease ${delay}ms both`,
    }}>
      <div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, color: '#111827' }}>{name}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{type}</div>
      </div>
      <div style={{
        background: result === 'PASS' ? '#dcfce7' : result === 'REVIEW' ? '#fef3c7' : '#fee2e2',
        color: result === 'PASS' ? '#166534' : result === 'REVIEW' ? '#92400e' : '#991b1b',
        fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 100,
      }}>{result}</div>
    </div>
  );
}

export function BoldNigerian() {
  return (
    <div className="ara-sans" style={{ background: '#ffffff', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideup { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <nav style={{ padding: '0 56px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>A</span>
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: '#111827' }}>Arapoint</span>
        </div>
        <div style={{ display: 'flex', gap: 40, fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
          <span>Features</span><span>Pricing</span><span>API Docs</span><span>Developers</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ background: 'transparent', border: '1.5px solid #e5e7eb', color: '#374151', padding: '9px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
          <button style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '9px 22px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Get Started</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 56px 0', display: 'grid', gridTemplateColumns: '58% 42%', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
            {BADGES.map(b => (
              <span key={b.label} style={{ background: b.bg, color: b.color, fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 100, letterSpacing: '0.04em' }}>{b.label}</span>
            ))}
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 72, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#0f1117', marginBottom: 24 }}>
            Know every<br />
            <span style={{ color: '#16a34a' }}>Nigerian</span><br />
            you work with.
          </h1>

          <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.75, maxWidth: 480, marginBottom: 40 }}>
            Instant NIN, BVN and SSCE verification. Cross-referenced, scored, and decided — so you don't have to guess. Trusted by fintechs, lenders, and HR teams across Nigeria.
          </p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 48 }}>
            <button style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: '0 8px 30px rgba(22,163,74,0.3)' }}>
              Start Verifying Free →
            </button>
            <button style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ▶ See how it works
            </button>
          </div>

          <div style={{ display: 'flex', gap: 32, paddingTop: 28, borderTop: '1px solid #f3f4f6' }}>
            {[
              { n: '250K+', l: 'verifications processed' },
              { n: '99%', l: 'uptime guarantee' },
              { n: '< 2s', l: 'NIN / BVN response' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>{s.n}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20 }}>
          <div style={{
            background: 'linear-gradient(145deg,#f0fdf4,#dcfce7)',
            border: '1.5px solid #bbf7d0',
            borderRadius: 20,
            padding: 28,
            marginBottom: 4,
            animation: 'float 4s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>🛡️</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: '#14532d' }}>Identity Verified</div>
                <div style={{ fontSize: 12, color: '#16a34a' }}>ADAEZE NWOSU · NIN + BVN · PASS</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { l: 'NIN Match', v: '✓ Verified', c: '#15803d' },
                { l: 'BVN Match', v: '✓ Verified', c: '#15803d' },
                { l: 'Name Match', v: '97% similar', c: '#1d4ed8' },
                { l: 'Trust Score', v: '94 / 100', c: '#16a34a' },
              ].map(r => (
                <div key={r.l} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{r.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: r.c, marginTop: 2 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          <VerificationCard name="EMEKA OKAFOR" type="Employment Screen · WAEC C4" result="PASS" delay={100} />
          <VerificationCard name="FATIMA ABUBAKAR" type="NIN Verification" result="REVIEW" delay={200} />
          <VerificationCard name="IBRAHIM SALISU" type="BVN Check" result="PASS" delay={300} />
        </div>
      </div>
    </div>
  );
}
