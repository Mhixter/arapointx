import './_group.css';

const SERVICES = [
  { code: 'NIN', label: 'National Identity Number', price: '₦130', time: '< 2s' },
  { code: 'BVN', label: 'Bank Verification Number', price: '₦80', time: '< 2s' },
  { code: 'EDU', label: 'WAEC / NECO / NABTEB', price: '₦250', time: '3–5 min' },
  { code: 'EMP', label: 'Employment Screening', price: '₦391', time: '< 5 min' },
];

export function EditorialMinimal() {
  return (
    <div className="ara-sans" style={{ background: '#fafafa', minHeight: '100vh', color: '#0a0a0a' }}>
      <nav style={{
        padding: '0 64px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>A</span>
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>Arapoint</span>
          <span style={{ marginLeft: 6, background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid #bbf7d0', letterSpacing: '0.04em' }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 36, fontSize: 13, color: '#6b7280', letterSpacing: '0.01em' }}>
          <span>Features</span><span>Pricing</span><span>Developers</span><span>Contact</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ background: 'transparent', border: '1px solid #e5e7eb', color: '#374151', padding: '7px 18px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Sign in</button>
          <button style={{ background: '#0a0a0a', border: 'none', color: '#fff', padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Get started</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '96px 64px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 100, padding: '6px 16px', marginBottom: 40, fontSize: 12, color: '#6b7280', background: '#fff' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          NDPA Compliant &nbsp;·&nbsp; Registry Connected &nbsp;·&nbsp; 250,000+ verifications
        </div>

        <h1 style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.08,
          color: '#0a0a0a',
          marginBottom: 28,
        }}>
          Nigeria's verification<br />
          <span style={{
            fontStyle: 'italic',
            fontWeight: 300,
            color: '#9ca3af',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}>infrastructure</span>
          {' '}<span style={{ color: '#16a34a' }}>API</span>
        </h1>

        <p style={{ fontSize: 17, color: '#6b7280', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 48px', fontWeight: 400 }}>
          NIN, BVN, WAEC, NECO, and employment screening.
          A single, well-documented API for every Nigerian identity check your business needs.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 72 }}>
          <button style={{
            background: '#16a34a',
            border: 'none',
            color: '#fff',
            padding: '13px 32px',
            borderRadius: 9,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}>
            Start for free
          </button>
          <button style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            color: '#374151',
            padding: '13px 28px',
            borderRadius: 9,
            fontSize: 15,
            cursor: 'pointer',
          }}>
            Read the docs →
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 64px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ borderBottom: '1px solid #f3f4f6', padding: '16px 24px', display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px', gap: 16, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span>Code</span><span>Service</span><span>Price</span><span>Response</span>
          </div>
          {SERVICES.map((s, i) => (
            <div key={s.code} style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: '80px 1fr 100px 100px',
              gap: 16,
              alignItems: 'center',
              borderBottom: i < SERVICES.length - 1 ? '1px solid #f9fafb' : 'none',
              transition: 'background 0.15s',
            }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>{s.code}</span>
              <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 14, color: '#374151', fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>{s.price}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{s.time}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 40, paddingBottom: 24 }}>
          {[
            { l: 'No setup fee', i: '○' },
            { l: 'Free sandbox', i: '○' },
            { l: 'Pay per use', i: '○' },
            { l: 'Cancel anytime', i: '○' },
          ].map(t => (
            <span key={t.l} style={{ fontSize: 13, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span> {t.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
