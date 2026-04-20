import path from 'path';
import fs from 'fs';

const NAVY = '#0A2540';
const NAVY_DEEP = '#06192E';
const GREEN = '#00B86B';
const GREEN_DEEP = '#009957';
const TEXT_BODY = '#3E5470';
const ACCENT_BLUE = '#3B82F6';

function loadLogoBase64(): string {
  const candidates = [
    path.resolve(process.cwd(), 'attached_assets', 'generated_images', 'arapoint_a_mark_transparent.png'),
    path.resolve(process.cwd(), 'Arapoint', 'attached_assets', 'generated_images', 'arapoint_a_mark_transparent.png'),
    path.resolve(process.cwd(), 'client', 'public', 'arapoint-logo.png'),
    path.resolve(process.cwd(), 'Arapoint', 'client', 'public', 'arapoint-logo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const b = fs.readFileSync(p);
      return `data:image/png;base64,${b.toString('base64')}`;
    }
  }
  return '';
}

export interface BannerTemplateConfig {
  headline: string;
  highlightWord?: string;
  bodyText?: string;
  photoDataUrl: string;
  feature1Title?: string; feature1Desc?: string;
  feature2Title?: string; feature2Desc?: string;
  feature3Title?: string; feature3Desc?: string;
  width: number;
  height: number;
  layoutId?: string;
  audience?: 'main' | 'developer';
  category?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string));
}

function highlightHeadline(headline: string, highlightWord?: string): string {
  if (!highlightWord) return escapeHtml(headline);
  const safeHL = highlightWord.trim();
  if (!safeHL) return escapeHtml(headline);
  const parts = headline.split(new RegExp(`(${safeHL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'));
  return parts.map(p =>
    p.toLowerCase() === safeHL.toLowerCase()
      ? `<span style="color:${GREEN}">${escapeHtml(p)}</span>`
      : escapeHtml(p)
  ).join('');
}

// ============================================================================
// LAYOUT REGISTRY
// ============================================================================

export interface LayoutMeta {
  id: string;
  name: string;
  description: string;
  audience?: 'main' | 'developer' | 'both';
  needsPersonPhoto: boolean;
  photoPromptHint: (subjectDesc: string) => string;
}

export const LAYOUTS: LayoutMeta[] = [
  { id: 'photo-right-cards', name: 'Person Right + Verify Cards', description: 'Headline left, person on right with floating verification cards', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, half-body shot facing camera, plenty of negative space on the left side` },
  { id: 'photo-left-glass', name: 'Person Left + Glass Card', description: 'Person on left, headline + glass content card on right', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, half-body shot facing camera, plenty of negative space on the right side` },
  { id: 'face-scan-grid', name: 'Face + Biometric Scan', description: 'Close-up face with green biometric scan grid overlay', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, tight head-and-shoulders portrait, facing camera dead-on, neutral expression, dark studio background` },
  { id: 'trust-gauge', name: 'Trust Score Gauge', description: 'Large circular trust score gauge with verified breakdown', audience: 'both', needsPersonPhoto: false,
    photoPromptHint: () => `abstract premium dark navy gradient background with subtle green particle network nodes, no people, no text` },
  { id: 'fingerprint-scan', name: 'Fingerprint Scan', description: 'Glowing green fingerprint with scan lines, text on left', audience: 'both', needsPersonPhoto: false,
    photoPromptHint: () => `abstract premium dark navy background with subtle circuitry pattern, soft green glow, no people, no text` },
  { id: 'user-dashboard', name: 'User Dashboard Mockup', description: 'Stylized user wallet/dashboard panel on right', audience: 'main', needsPersonPhoto: false,
    photoPromptHint: () => `clean light grey gradient background with subtle abstract shapes, no people, no text` },
  { id: 'dev-dashboard-code', name: 'Developer Code Snippet', description: 'API code/response panel on right (for developer banners)', audience: 'developer', needsPersonPhoto: false,
    photoPromptHint: () => `dark abstract circuit background, soft blue and green glow, no people, no text` },
  { id: 'id-card-center', name: 'Verified ID Card (Center)', description: 'Centered glassmorphic ID card with person photo inside, text wraps', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, official passport-style head-and-shoulders portrait, plain neutral background, sharp lighting` },
  { id: 'community-grid', name: 'Community + Peers Grid', description: 'Text left, person on right with a small grid of peer/community avatars overlay', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, candid group of diverse Nigerian professionals collaborating around a laptop, warm office lighting, half-body composition` },
  { id: 'api-key-card', name: 'API Key Credit Card', description: 'Person celebrating right + green credit-card-style API key card overlay on left', audience: 'developer', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, joyful Nigerian developer celebrating success with raised fists at laptop, bright modern home office, half-body composition with negative space on left` },
  { id: 'dashboard-pointing', name: 'Person Pointing at Dashboards', description: 'Person on right gesturing at floating laptop + admin-panel mockups in the center', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, professional Nigerian person standing and gesturing toward something off-frame to their left, three-quarter body, soft modern office background, plenty of negative space on the left` },
  { id: 'twin-icon-preview', name: 'Twin Biometric Icons (Coming Soon)', description: 'Text top + person right + face-wireframe and fingerprint twin icons on bottom navy strip', audience: 'both', needsPersonPhoto: true,
    photoPromptHint: (s) => `${s}, professional Nigerian woman in lab coat or smart casual smiling slightly, looking off to the left, half-body, soft bright background` },
];

export function pickLayout(opts: { layoutId?: string; audience?: 'main' | 'developer'; category?: string; headline?: string }): LayoutMeta {
  const requested = (opts.layoutId || '').trim();
  const aud = opts.audience || 'main';
  const cat = (opts.category || '').toLowerCase();
  const head = (opts.headline || '').toLowerCase();
  const text = `${cat} ${head}`;

  if (requested && requested !== 'auto' && requested !== 'random') {
    const m = LAYOUTS.find(l => l.id === requested);
    if (m) return m;
  }

  const eligible = LAYOUTS.filter(l => !l.audience || l.audience === 'both' || l.audience === aud);

  if (requested === 'random') {
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  // AUTO: smart pick by category/headline keywords + small randomness
  const score = (id: string): number => {
    let s = Math.random() * 0.5; // base randomness so two same-category banners differ
    if (/trust|score|reputation|rating/.test(text) && id === 'trust-gauge') s += 5;
    if (/(finger|biometric|scan|secur)/.test(text) && id === 'fingerprint-scan') s += 5;
    if (/(face|kyc|selfie|liveness|identity)/.test(text) && id === 'face-scan-grid') s += 4;
    if (/(api|developer|sandbox|integrate|sdk|endpoint|code)/.test(text) && id === 'dev-dashboard-code') s += 5;
    if (/(dashboard|wallet|balance|account|recent|history)/.test(text) && id === 'user-dashboard') s += 4;
    if (/(verified|certificate|id|card|badge|passport)/.test(text) && id === 'id-card-center') s += 3;
    if (/(festival|eid|sallah|christmas|independence|family|celebrat)/.test(text) && id === 'photo-right-cards') s += 3;
    if (/(business|professional|hire|onboard|enterprise|kyb)/.test(text) && (id === 'photo-right-cards' || id === 'photo-left-glass')) s += 2;
    if (/(community|builders|join|members|peers|users|10\,?000|thousand)/.test(text) && id === 'community-grid') s += 5;
    if (/(api key|access key|key in|seconds|get started|sign up|free)/.test(text) && id === 'api-key-card') s += 5;
    if (/(portal|dashboard|admin|panel|console|powerful)/.test(text) && id === 'dashboard-pointing') s += 4;
    if (/(coming soon|launching|preview|new|biometric|face\s*\+\s*finger|multi)/.test(text) && id === 'twin-icon-preview') s += 4;
    return s;
  };
  return eligible.slice().sort((a, b) => score(b.id) - score(a.id))[0];
}

// ============================================================================
// SHARED PIECES
// ============================================================================

const baseStyles = (w: number, h: number, bodyBg = '#fff') => `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
  html,body{width:${w}px;height:${h}px;font-family:'Inter','Segoe UI',-apple-system,sans-serif;background:${bodyBg};}
  .banner{position:relative;width:${w}px;height:${h}px;background:${bodyBg};overflow:hidden;}
  .logo-row{display:flex;align-items:center;gap:10px;}
  .logo-row img{width:42px;height:42px;object-fit:contain;display:block;}
  .logo-row .wordmark{font-size:28px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;line-height:1;}
  .logo-row.light .wordmark{color:#fff;}
  .accent-bar{width:3px;background:${GREEN};border-radius:2px;flex-shrink:0;}
`;

const bottomStrip = (features: { t: string; d: string; icon: string }[]) => `
  <div class="bottom">
    <div class="feat"><div class="ficon">${features[0].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[0].t)}</div><div class="fd">${escapeHtml(features[0].d)}</div></div></div>
    <div class="divider"></div>
    <div class="feat"><div class="ficon">${features[1].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[1].t)}</div><div class="fd">${escapeHtml(features[1].d)}</div></div></div>
    <div class="divider"></div>
    <div class="feat"><div class="ficon">${features[2].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[2].t)}</div><div class="fd">${escapeHtml(features[2].d)}</div></div></div>
  </div>
`;

const bottomStripStyles = `
  .bottom{position:absolute;bottom:0;left:0;right:0;height:130px;background:${NAVY};display:flex;align-items:center;padding:0 56px;gap:48px;}
  .feat{flex:1;display:flex;align-items:center;gap:18px;color:#fff;}
  .feat .ficon{width:54px;height:54px;border-radius:14px;background:rgba(0,184,107,0.18);display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:26px;font-weight:800;flex-shrink:0;}
  .feat .ftxt .ft{color:${GREEN};font-weight:800;font-size:15px;letter-spacing:0.6px;text-transform:uppercase;}
  .feat .ftxt .fd{color:#E6EDF5;font-size:14px;line-height:1.4;margin-top:3px;}
  .divider{width:1px;height:60px;background:rgba(255,255,255,0.12);}
`;

function logoBlock(light = false): string {
  const logo = loadLogoBase64();
  return logo
    ? `<div class="logo-row ${light ? 'light' : ''}"><img src="${logo}"/><div class="wordmark">Arapoint</div></div>`
    : `<div class="logo-row ${light ? 'light' : ''}"><div class="wordmark">Arapoint</div></div>`;
}

// ============================================================================
// LAYOUT BUILDERS
// ============================================================================

function layoutPhotoRightCards(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:#fff;display:flex;}
    .left{flex:1.05;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1;position:relative;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:54px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:22px;}
    .body-block{display:flex;gap:14px;}
    .body-text{font-size:16px;line-height:1.55;color:${TEXT_BODY};max-width:560px;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
    .photo-fade{position:absolute;top:0;bottom:0;left:0;width:140px;background:linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);}
    .green-arc{position:absolute;top:-10%;right:-12%;width:340px;height:120%;background:${GREEN};border-radius:60% 0 0 60%;opacity:0.12;}
    .verify-cards{position:absolute;right:34px;bottom:36px;display:flex;flex-direction:column;gap:14px;z-index:4;}
    .vcard{background:rgba(255,255,255,0.96);box-shadow:0 12px 28px rgba(10,37,64,0.14);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;width:280px;}
    .vcard .iconbox{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;}
    .vcard .meta .t{font-size:14px;font-weight:700;color:${NAVY};}
    .vcard .meta .s{font-size:12px;color:${GREEN};font-weight:600;margin-top:2px;}
    .vcard .check{width:30px;height:30px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left"><div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>${c.bodyText ? `<div class="body-block"><div class="accent-bar"></div><div class="body-text">${escapeHtml(c.bodyText)}</div></div>` : ''}</div>
    <div class="right">
      <div class="green-arc"></div>
      <div class="photo-wrap"><img src="${c.photoDataUrl}"/></div>
      <div class="photo-fade"></div>
      <div class="verify-cards">
        <div class="vcard"><div class="iconbox" style="background:${NAVY}">ID</div><div class="meta"><div class="t">BVN Verification</div><div class="s">Verified</div></div><div class="check">✓</div></div>
        <div class="vcard"><div class="iconbox" style="background:#5B5BFF">EC</div><div class="meta"><div class="t">Education Check</div><div class="s">Verified</div></div><div class="check">✓</div></div>
        <div class="vcard"><div class="iconbox" style="background:#22C55E">IM</div><div class="meta"><div class="t">Identity Match</div><div class="s">Verified</div></div><div class="check">✓</div></div>
      </div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutPhotoLeftGlass(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:#F4F8FB;display:flex;}
    .left{flex:1;position:relative;}
    .right{flex:1;padding:120px 56px 24px 36px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
    .photo-fade{position:absolute;top:0;bottom:0;right:0;width:160px;background:linear-gradient(to left, rgba(244,248,251,1) 0%, rgba(244,248,251,0) 100%);}
    .glass{background:rgba(255,255,255,0.92);border-radius:20px;padding:36px 32px;box-shadow:0 24px 60px rgba(10,37,64,0.18);border:1px solid rgba(10,37,64,0.06);}
    .glass .pill{display:inline-block;background:${GREEN};color:#fff;font-size:11px;font-weight:800;letter-spacing:1.4px;padding:6px 12px;border-radius:99px;margin-bottom:14px;text-transform:uppercase;}
    .headline{font-size:48px;font-weight:800;color:${NAVY};line-height:1.06;letter-spacing:-1px;margin-bottom:18px;}
    .body-text{font-size:15px;line-height:1.6;color:${TEXT_BODY};margin-bottom:18px;}
    .seal{display:flex;align-items:center;gap:10px;color:${GREEN};font-weight:700;font-size:13px;}
    .seal .ring{width:30px;height:30px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left"><div class="photo-wrap"><img src="${c.photoDataUrl}"/></div><div class="photo-fade"></div></div>
    <div class="right"><div class="glass">
      <span class="pill">${escapeHtml((c.category || 'Verified').toUpperCase())}</span>
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
      <div class="seal"><div class="ring">✓</div>Trusted by 10,000+ Nigerian businesses</div>
    </div></div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutFaceScanGrid(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height, NAVY_DEEP)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:radial-gradient(circle at 70% 50%, #0E2B5A 0%, ${NAVY_DEEP} 70%);display:flex;color:#fff;}
    .left{flex:1.1;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:3;}
    .right{flex:1;position:relative;display:flex;align-items:center;justify-content:center;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:52px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-1.2px;margin-bottom:20px;}
    .body-text{font-size:16px;line-height:1.6;color:#B8C7D9;max-width:540px;}
    .face-frame{position:relative;width:380px;height:440px;border-radius:30px;overflow:hidden;box-shadow:0 30px 80px rgba(0,184,107,0.3);}
    .face-frame img{width:100%;height:100%;object-fit:cover;display:block;}
    .scan-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,184,107,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(0,184,107,0.18) 1px,transparent 1px);background-size:30px 30px;mix-blend-mode:screen;}
    .scan-line{position:absolute;left:0;right:0;height:60px;background:linear-gradient(to bottom, rgba(0,184,107,0) 0%, rgba(0,184,107,0.55) 100%);top:55%;box-shadow:0 0 30px ${GREEN};}
    .corner{position:absolute;width:36px;height:36px;border:3px solid ${GREEN};}
    .corner.tl{top:14px;left:14px;border-right:none;border-bottom:none;}
    .corner.tr{top:14px;right:14px;border-left:none;border-bottom:none;}
    .corner.bl{bottom:14px;left:14px;border-right:none;border-top:none;}
    .corner.br{bottom:14px;right:14px;border-left:none;border-top:none;}
    .scan-pill{position:absolute;top:30px;left:50%;transform:translateX(-50%);background:rgba(0,184,107,0.95);color:#fff;font-size:12px;font-weight:800;letter-spacing:1.5px;padding:6px 14px;border-radius:99px;text-transform:uppercase;}
    .badges{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap;}
    .bdg{background:rgba(0,184,107,0.15);color:${GREEN};border:1px solid rgba(0,184,107,0.4);padding:8px 14px;border-radius:99px;font-size:12px;font-weight:700;letter-spacing:0.5px;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock(true)}
    <div class="left">
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
      <div class="badges"><div class="bdg">✓ Liveness</div><div class="bdg">✓ Face Match</div><div class="bdg">✓ NIN Linked</div></div>
    </div>
    <div class="right">
      <div class="face-frame">
        <img src="${c.photoDataUrl}"/>
        <div class="scan-grid"></div>
        <div class="scan-line"></div>
        <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
        <div class="scan-pill">Biometric Match · 99.7%</div>
      </div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutTrustGauge(c: BannerTemplateConfig, features: any[], topH: number): string {
  const score = 87;
  const circumference = 2 * Math.PI * 110;
  const offset = circumference * (1 - score / 100);
  return `<style>${baseStyles(c.width, c.height, '#F4F8FB')}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:linear-gradient(135deg,#F4F8FB 0%,#E6EFF7 100%);display:flex;}
    .left{flex:1.1;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1;position:relative;display:flex;align-items:center;justify-content:center;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:52px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:18px;}
    .body-text{font-size:16px;line-height:1.6;color:${TEXT_BODY};max-width:540px;}
    .gauge{position:relative;width:300px;height:300px;}
    .score-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${NAVY};}
    .score-num .n{font-size:84px;font-weight:900;line-height:1;letter-spacing:-3px;color:${GREEN};}
    .score-num .lbl{font-size:13px;font-weight:700;color:${NAVY};letter-spacing:2px;text-transform:uppercase;margin-top:6px;}
    .stats{position:absolute;right:60px;bottom:36px;background:#fff;border-radius:14px;padding:18px 22px;box-shadow:0 18px 40px rgba(10,37,64,0.12);width:240px;}
    .stat{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;}
    .stat .lbl{color:${TEXT_BODY};font-weight:600;}
    .stat .v{color:${GREEN};font-weight:800;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left">
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
    </div>
    <div class="right">
      <svg class="gauge" viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="110" fill="none" stroke="#D6E2EC" stroke-width="18"/>
        <circle cx="120" cy="120" r="110" fill="none" stroke="${GREEN}" stroke-width="18" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 120 120)"/>
      </svg>
      <div class="score-num"><div class="n">${score}</div><div class="lbl">Trust Score</div></div>
      <div class="stats">
        <div class="stat"><span class="lbl">BVN Match</span><span class="v">✓ Verified</span></div>
        <div class="stat"><span class="lbl">NIN Linked</span><span class="v">✓ Verified</span></div>
        <div class="stat"><span class="lbl">Address</span><span class="v">✓ Confirmed</span></div>
        <div class="stat"><span class="lbl">Risk Flags</span><span class="v">0 Found</span></div>
      </div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutFingerprintScan(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height, NAVY_DEEP)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:radial-gradient(circle at 75% 50%, #0E2B5A 0%, ${NAVY_DEEP} 75%);display:flex;color:#fff;}
    .left{flex:1.1;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1;position:relative;display:flex;align-items:center;justify-content:center;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:52px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-1.2px;margin-bottom:20px;}
    .body-text{font-size:16px;line-height:1.6;color:#B8C7D9;max-width:540px;margin-bottom:22px;}
    .stat-row{display:flex;gap:24px;margin-top:8px;}
    .stat-row .item .v{color:${GREEN};font-size:30px;font-weight:900;line-height:1;}
    .stat-row .item .l{color:#7A93B0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:6px;}
    .fp-wrap{position:relative;width:340px;height:340px;}
    .fp-glow{position:absolute;inset:-30px;border-radius:50%;background:radial-gradient(circle, rgba(0,184,107,0.35) 0%, rgba(0,184,107,0) 70%);}
    .fp-svg{position:relative;width:100%;height:100%;filter:drop-shadow(0 0 20px ${GREEN});}
    .fp-scan{position:absolute;left:0;right:0;height:4px;background:linear-gradient(90deg, transparent 0%, ${GREEN} 50%, transparent 100%);top:50%;box-shadow:0 0 20px ${GREEN};}
    .fp-pill{position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:${GREEN};color:#fff;font-size:11px;font-weight:800;letter-spacing:1.5px;padding:6px 14px;border-radius:99px;text-transform:uppercase;white-space:nowrap;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock(true)}
    <div class="left">
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
      <div class="stat-row"><div class="item"><div class="v">99.9%</div><div class="l">Match Accuracy</div></div><div class="item"><div class="v">&lt; 2s</div><div class="l">Verification Time</div></div><div class="item"><div class="v">256-bit</div><div class="l">Encryption</div></div></div>
    </div>
    <div class="right">
      <div class="fp-wrap">
        <div class="fp-glow"></div>
        <svg class="fp-svg" viewBox="0 0 200 200" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round">
          <path d="M100 30 C 60 30, 35 60, 35 100 C 35 140, 50 165, 65 175"/>
          <path d="M100 45 C 70 45, 50 70, 50 100 C 50 130, 60 150, 70 162"/>
          <path d="M100 60 C 80 60, 65 80, 65 100 C 65 122, 72 140, 80 152"/>
          <path d="M100 75 C 90 75, 80 88, 80 100 C 80 118, 88 135, 95 145"/>
          <path d="M100 90 C 95 90, 92 96, 92 102 C 92 115, 100 128, 105 135"/>
          <path d="M105 102 C 105 115, 110 130, 115 140"/>
          <path d="M120 75 C 125 88, 125 100, 125 115 C 125 132, 122 148, 118 158"/>
          <path d="M135 65 C 142 80, 145 95, 145 115 C 145 138, 138 158, 130 170"/>
          <path d="M150 75 C 158 90, 162 105, 162 125 C 162 148, 152 165, 145 175"/>
        </svg>
        <div class="fp-scan"></div>
        <div class="fp-pill">Biometric · Verified</div>
      </div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutUserDashboard(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height, '#F4F8FB')}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:linear-gradient(135deg,#F4F8FB 0%,#E6EFF7 100%);display:flex;}
    .left{flex:1.05;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1.1;position:relative;display:flex;align-items:center;justify-content:center;padding:30px;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:50px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:18px;}
    .body-text{font-size:16px;line-height:1.6;color:${TEXT_BODY};max-width:520px;}
    .dash{width:100%;max-width:480px;background:#fff;border-radius:20px;box-shadow:0 30px 70px rgba(10,37,64,0.18);overflow:hidden;border:1px solid rgba(10,37,64,0.06);}
    .dh{background:${NAVY};padding:18px 22px;display:flex;align-items:center;gap:12px;color:#fff;}
    .dh .av{width:36px;height:36px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;}
    .dh .who{flex:1;}
    .dh .who .n{font-size:14px;font-weight:700;}
    .dh .who .e{font-size:11px;color:#9CB3CC;}
    .dh .badge{background:rgba(0,184,107,0.2);color:${GREEN};font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;letter-spacing:1px;}
    .dbody{padding:20px 22px;}
    .balance{background:linear-gradient(135deg,${GREEN} 0%, ${GREEN_DEEP} 100%);color:#fff;border-radius:14px;padding:18px;margin-bottom:14px;}
    .balance .l{font-size:11px;font-weight:700;letter-spacing:1.5px;opacity:0.85;}
    .balance .v{font-size:30px;font-weight:900;line-height:1;margin-top:6px;letter-spacing:-1px;}
    .row{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #EEF2F7;}
    .row .ic{width:36px;height:36px;border-radius:10px;background:#EEF7F1;color:${GREEN};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;}
    .row .ic.b{background:#EAF1FB;color:${ACCENT_BLUE};}
    .row .ic.p{background:#F3EBFB;color:#8B5CF6;}
    .row .meta{flex:1;}
    .row .meta .t{font-size:13px;font-weight:700;color:${NAVY};}
    .row .meta .s{font-size:11px;color:#7A8FA6;margin-top:2px;}
    .row .ok{color:${GREEN};font-size:12px;font-weight:800;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left">
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
    </div>
    <div class="right"><div class="dash">
      <div class="dh"><div class="av">A</div><div class="who"><div class="n">Adekunle Okafor</div><div class="e">adekunle@example.com</div></div><div class="badge">VERIFIED</div></div>
      <div class="dbody">
        <div class="balance"><div class="l">WALLET BALANCE</div><div class="v">₦24,500</div></div>
        <div class="row"><div class="ic">ID</div><div class="meta"><div class="t">BVN Verified</div><div class="s">2 minutes ago</div></div><div class="ok">+₦50</div></div>
        <div class="row"><div class="ic b">EC</div><div class="meta"><div class="t">Education Check</div><div class="s">1 hour ago</div></div><div class="ok">+₦200</div></div>
        <div class="row"><div class="ic p">DL</div><div class="meta"><div class="t">Driver's License</div><div class="s">Yesterday</div></div><div class="ok">+₦100</div></div>
      </div>
    </div></div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutDevDashboardCode(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height, NAVY_DEEP)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:linear-gradient(135deg,${NAVY_DEEP} 0%,#0E2B5A 100%);display:flex;color:#fff;}
    .left{flex:1.05;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1.15;position:relative;display:flex;align-items:center;justify-content:center;padding:30px;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:50px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-1.2px;margin-bottom:18px;}
    .body-text{font-size:16px;line-height:1.6;color:#B8C7D9;max-width:520px;margin-bottom:18px;}
    .ep{display:inline-flex;align-items:center;gap:10px;background:rgba(0,184,107,0.15);border:1px solid rgba(0,184,107,0.4);padding:8px 14px;border-radius:8px;font-family:'JetBrains Mono','Courier New',monospace;font-size:13px;color:${GREEN};font-weight:700;}
    .ide{width:100%;max-width:540px;background:#0F1A2E;border-radius:14px;box-shadow:0 30px 70px rgba(0,0,0,0.4);overflow:hidden;border:1px solid rgba(255,255,255,0.08);}
    .tab{background:#08111F;padding:10px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.06);}
    .dot{width:11px;height:11px;border-radius:50%;}
    .tab .name{margin-left:14px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#9CB3CC;}
    .code{padding:18px 22px;font-family:'JetBrains Mono','Courier New',monospace;font-size:13px;line-height:1.7;color:#E6EDF5;}
    .cm{color:#5C7A92;}
    .kw{color:#7DD3FC;}
    .st{color:${GREEN};}
    .nm{color:#FCD34D;}
    .pr{color:#F472B6;}
    .resp{margin-top:14px;padding-top:14px;border-top:1px dashed rgba(255,255,255,0.1);}
    .ok-pill{display:inline-block;background:${GREEN};color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px;margin-right:8px;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock(true)}
    <div class="left">
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
      <div class="ep">POST /v1/identity/verify</div>
    </div>
    <div class="right"><div class="ide">
      <div class="tab"><div class="dot" style="background:#FF5F57"></div><div class="dot" style="background:#FEBC2E"></div><div class="dot" style="background:#28C840"></div><div class="name">verify.ts</div></div>
      <div class="code"><span class="cm">// Verify a Nigerian identity in one call</span><br/>
<span class="kw">const</span> <span class="nm">res</span> = <span class="kw">await</span> arapoint.<span class="pr">identity</span>.verify({<br/>
&nbsp;&nbsp;<span class="pr">type</span>: <span class="st">'BVN'</span>,<br/>
&nbsp;&nbsp;<span class="pr">number</span>: <span class="st">'22198765432'</span>,<br/>
&nbsp;&nbsp;<span class="pr">firstName</span>: <span class="st">'Adekunle'</span>,<br/>
&nbsp;&nbsp;<span class="pr">lastName</span>: <span class="st">'Okafor'</span><br/>
});
        <div class="resp"><span class="ok-pill">200 OK</span><span class="cm">// 1.2s · verified</span><br/>
<span class="pr">verified</span>: <span class="st">true</span>, <span class="pr">match</span>: <span class="nm">99.7</span></div>
      </div>
    </div></div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutIdCardCenter(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height, '#F4F8FB')}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:linear-gradient(135deg,#F4F8FB 0%,#E6EFF7 100%);display:flex;align-items:center;justify-content:center;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .stack{position:relative;display:flex;align-items:center;gap:48px;padding:0 56px;width:100%;justify-content:center;}
    .left-text{flex:1;max-width:500px;}
    .headline{font-size:46px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:16px;margin-top:60px;}
    .body-text{font-size:15px;line-height:1.6;color:${TEXT_BODY};}
    .pill{display:inline-block;background:${GREEN};color:#fff;font-size:11px;font-weight:800;padding:6px 12px;border-radius:99px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:14px;}
    .id-card{position:relative;width:340px;background:#fff;border-radius:18px;box-shadow:0 30px 70px rgba(10,37,64,0.22);overflow:hidden;border:1px solid rgba(10,37,64,0.06);margin-top:60px;}
    .id-card .hd{background:${NAVY};color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;}
    .id-card .hd .ttl{font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;}
    .id-card .hd .vbadge{background:${GREEN};color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:4px;letter-spacing:1px;}
    .id-card .photo{width:100%;height:200px;overflow:hidden;}
    .id-card .photo img{width:100%;height:100%;object-fit:cover;}
    .id-card .info{padding:14px 18px;}
    .id-card .info .row{display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid #F1F5F9;}
    .id-card .info .row:last-child{border-bottom:none;}
    .id-card .info .lbl{color:#7A8FA6;font-weight:600;}
    .id-card .info .val{color:${NAVY};font-weight:700;}
    .seal{position:absolute;top:14px;right:14px;width:64px;height:64px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;box-shadow:0 8px 20px rgba(0,184,107,0.5);transform:rotate(8deg);}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="stack">
      <div class="left-text">
        <span class="pill">Verified Identity</span>
        <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
        ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
      </div>
      <div class="id-card">
        <div class="hd"><div class="ttl">Arapoint ID</div><div class="vbadge">VERIFIED</div></div>
        <div class="photo"><img src="${c.photoDataUrl}"/></div>
        <div class="info">
          <div class="row"><span class="lbl">Name</span><span class="val">Adekunle O.</span></div>
          <div class="row"><span class="lbl">BVN</span><span class="val">221****432</span></div>
          <div class="row"><span class="lbl">Status</span><span class="val" style="color:${GREEN}">✓ Active</span></div>
        </div>
      </div>
      <div class="seal">✓</div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutCommunityGrid(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:#fff;display:flex;}
    .left{flex:1;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1.05;position:relative;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .pill{display:inline-block;background:${GREEN};color:#fff;font-size:11px;font-weight:800;letter-spacing:1.4px;padding:6px 12px;border-radius:99px;margin-bottom:14px;text-transform:uppercase;}
    .headline{font-size:54px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:18px;}
    .body-text{font-size:16px;line-height:1.55;color:${TEXT_BODY};max-width:540px;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
    .photo-fade{position:absolute;top:0;bottom:0;left:0;width:140px;background:linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);}
    .check-float{position:absolute;width:54px;height:54px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:26px;box-shadow:0 14px 30px rgba(0,184,107,0.45);z-index:4;}
    .check-1{top:18%;left:14%;}
    .check-2{top:54%;left:28%;}
    .peers-card{position:absolute;top:24px;right:24px;background:rgba(255,255,255,0.96);border-radius:14px;padding:12px;box-shadow:0 18px 40px rgba(10,37,64,0.18);width:200px;z-index:5;}
    .peers-card .ttl{font-size:11px;font-weight:800;color:${NAVY};letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;}
    .peers-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
    .pa{aspect-ratio:1;border-radius:6px;background:linear-gradient(135deg,#A78BFA,#5B5BFF);position:relative;}
    .pa:nth-child(2n){background:linear-gradient(135deg,#FBBF24,#F97316);}
    .pa:nth-child(3n){background:linear-gradient(135deg,#34D399,#10B981);}
    .pa:nth-child(5n){background:linear-gradient(135deg,#F472B6,#EC4899);}
    .pa:nth-child(7n){background:linear-gradient(135deg,#60A5FA,#3B82F6);}
    .count-pill{position:absolute;top:50%;right:36px;transform:translateY(-50%);background:${NAVY};color:#fff;border-radius:99px;padding:10px 18px;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;z-index:6;box-shadow:0 14px 30px rgba(10,37,64,0.3);}
    .count-pill .dot{width:8px;height:8px;border-radius:50%;background:${GREEN};box-shadow:0 0 10px ${GREEN};}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left">
      <span class="pill">Trusted Community</span>
      <div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>
      ${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}
    </div>
    <div class="right">
      <div class="photo-wrap"><img src="${c.photoDataUrl}"/></div>
      <div class="photo-fade"></div>
      <div class="check-float check-1">✓</div>
      <div class="check-float check-2">✓</div>
      <div class="peers-card">
        <div class="ttl">Verified Peers</div>
        <div class="peers-grid"><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div><div class="pa"></div></div>
      </div>
      <div class="count-pill"><div class="dot"></div>10,000+ live</div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutApiKeyCard(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:#fff;display:flex;}
    .left{flex:1.05;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1;position:relative;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:54px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:22px;}
    .body-text{font-size:16px;line-height:1.55;color:${TEXT_BODY};max-width:540px;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
    .photo-fade{position:absolute;top:0;bottom:0;left:0;width:140px;background:linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);}
    .check-float{position:absolute;width:48px;height:48px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;box-shadow:0 14px 30px rgba(0,184,107,0.4);z-index:4;}
    .check-a{top:14%;right:32%;}
    .check-b{top:46%;right:14%;}
    .api-card{position:absolute;left:-30px;bottom:36px;width:330px;height:200px;background:linear-gradient(135deg,${GREEN} 0%,${GREEN_DEEP} 100%);border-radius:18px;padding:22px 24px;color:#fff;box-shadow:0 30px 60px rgba(0,184,107,0.35);transform:rotate(-6deg);z-index:5;overflow:hidden;}
    .api-card::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18) 0%, transparent 40%),radial-gradient(circle at 20% 90%, rgba(0,0,0,0.18) 0%, transparent 50%);}
    .api-card .top-row{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;}
    .api-card .brand{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:0.5px;}
    .api-card .brand .dot{width:14px;height:14px;border-radius:3px;background:#fff;}
    .api-card .chip{width:38px;height:28px;border-radius:5px;background:linear-gradient(135deg,#FCD34D,#F59E0B);}
    .api-card .key{font-family:'JetBrains Mono','Courier New',monospace;font-size:24px;font-weight:800;letter-spacing:2px;margin-top:34px;position:relative;z-index:2;}
    .api-card .label{font-size:46px;font-weight:900;line-height:1;letter-spacing:-1px;margin-top:6px;position:relative;z-index:2;}
    .api-card .sub{font-family:'JetBrains Mono',monospace;font-size:13px;opacity:0.85;margin-top:8px;position:relative;z-index:2;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left"><div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}</div>
    <div class="right">
      <div class="photo-wrap"><img src="${c.photoDataUrl}"/></div>
      <div class="photo-fade"></div>
      <div class="check-float check-a">✓</div>
      <div class="check-float check-b">✓</div>
      <div class="api-card">
        <div class="top-row"><div class="brand"><div class="dot"></div>Arapoint</div><div class="chip"></div></div>
        <div class="key">/00B86B</div>
        <div class="label">API Key</div>
        <div class="sub">#002f63</div>
      </div>
    </div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutDashboardPointing(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH}px;background:linear-gradient(135deg,#fff 0%,#F4F8FB 100%);display:flex;}
    .left{flex:0.85;padding:120px 24px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:3;}
    .center{flex:1.2;position:relative;display:flex;align-items:center;justify-content:center;padding:30px 0;}
    .right{flex:0.95;position:relative;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:48px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:18px;}
    .body-text{font-size:15px;line-height:1.55;color:${TEXT_BODY};max-width:380px;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:left center;}
    .photo-fade{position:absolute;top:0;bottom:0;left:0;width:160px;background:linear-gradient(to right, rgba(244,248,251,1) 0%, rgba(244,248,251,0) 100%);}
    .check-float{position:absolute;width:50px;height:50px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;box-shadow:0 14px 30px rgba(0,184,107,0.4);z-index:6;}
    .check-1{top:8%;left:46%;}
    .check-2{top:62%;left:32%;}
    .panel-back{position:absolute;left:5%;top:8%;width:78%;background:#0F1A2E;border-radius:12px;box-shadow:0 30px 60px rgba(10,37,64,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.08);z-index:2;}
    .panel-back .pbar{display:flex;gap:6px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);}
    .panel-back .d{width:9px;height:9px;border-radius:50%;}
    .panel-back .body{display:flex;}
    .panel-back .nav{width:30%;background:#08111F;padding:14px 12px;color:#9CB3CC;font-size:9px;font-weight:600;}
    .panel-back .nav .it{padding:5px 0;border-radius:4px;padding-left:8px;}
    .panel-back .nav .it.act{background:${GREEN};color:#fff;}
    .panel-back .main{flex:1;padding:14px;}
    .panel-back .stat{background:rgba(255,255,255,0.05);border-radius:6px;padding:8px;margin-bottom:6px;}
    .panel-back .stat .lbl{font-size:8px;color:#7A93B0;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;}
    .panel-back .stat .v{font-size:14px;color:${GREEN};font-weight:800;margin-top:2px;}
    .panel-front{position:absolute;left:38%;top:36%;width:60%;background:#0F1A2E;border-radius:10px;padding:12px 14px;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:1.7;color:#E6EDF5;box-shadow:0 30px 60px rgba(10,37,64,0.4);z-index:5;}
    .panel-front .ln .kw{color:#7DD3FC;}
    .panel-front .ln .st{color:${GREEN};}
    .panel-front .ln .cm{color:#5C7A92;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left"><div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}</div>
    <div class="center">
      <div class="panel-back">
        <div class="pbar"><div class="d" style="background:#FF5F57"></div><div class="d" style="background:#FEBC2E"></div><div class="d" style="background:#28C840"></div></div>
        <div class="body">
          <div class="nav"><div class="it act">Overview</div><div class="it">Identity</div><div class="it">KYC</div><div class="it">Logs</div><div class="it">Keys</div></div>
          <div class="main">
            <div class="stat"><div class="lbl">Verifications</div><div class="v">12,847</div></div>
            <div class="stat"><div class="lbl">Success Rate</div><div class="v">99.7%</div></div>
            <div class="stat"><div class="lbl">Avg Latency</div><div class="v">1.2s</div></div>
          </div>
        </div>
      </div>
      <div class="panel-front">
        <div class="ln"><span class="cm">// arapoint sdk</span></div>
        <div class="ln"><span class="kw">await</span> verify(<span class="st">'BVN'</span>);</div>
        <div class="ln"><span class="cm">// → 200 OK</span></div>
        <div class="ln" style="color:${GREEN}">✓ verified: true</div>
      </div>
      <div class="check-float check-1">✓</div>
      <div class="check-float check-2">✓</div>
    </div>
    <div class="right"><div class="photo-wrap"><img src="${c.photoDataUrl}"/></div></div>
  </div>${bottomStrip(features)}</div>`;
}

function layoutTwinIconPreview(c: BannerTemplateConfig, features: any[], topH: number): string {
  return `<style>${baseStyles(c.width, c.height)}${bottomStripStyles}
    .top{position:absolute;top:0;left:0;right:0;height:${topH - 80}px;background:#fff;display:flex;}
    .left{flex:1.1;padding:120px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
    .right{flex:1;position:relative;}
    .logo-row{position:absolute;top:36px;left:56px;z-index:5;}
    .headline{font-size:54px;font-weight:800;color:${NAVY};line-height:1.06;letter-spacing:-1.2px;margin-bottom:18px;}
    .headline .api-pill{background:${GREEN};color:#fff;padding:2px 10px;border-radius:6px;font-weight:800;display:inline-block;}
    .body-text{font-size:16px;line-height:1.55;color:${TEXT_BODY};max-width:540px;}
    .photo-wrap{position:absolute;inset:0;overflow:hidden;}
    .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
    .photo-fade{position:absolute;top:0;bottom:0;left:0;width:140px;background:linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);}
    .check-float{position:absolute;width:48px;height:48px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;box-shadow:0 14px 30px rgba(0,184,107,0.4);z-index:4;}
    .glass-stack{position:absolute;right:34%;top:24%;display:flex;flex-direction:column;gap:8px;z-index:3;}
    .gs{background:rgba(255,255,255,0.85);backdrop-filter:blur(8px);border-radius:10px;padding:8px 12px;width:160px;box-shadow:0 10px 24px rgba(10,37,64,0.12);display:flex;align-items:center;gap:8px;}
    .gs .gc{width:22px;height:22px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;}
    .gs .gl{height:6px;background:#CBD5E1;border-radius:3px;flex:1;}
    .twin-strip{position:absolute;bottom:130px;left:0;right:0;height:80px;background:${NAVY_DEEP};display:flex;align-items:center;padding:0 56px;gap:36px;z-index:5;}
    .twin-icon{width:60px;height:60px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .twin-meta{color:#fff;}
    .twin-meta .t{font-size:13px;font-weight:800;color:${GREEN};letter-spacing:1px;text-transform:uppercase;}
    .twin-meta .d{font-size:11px;color:#B8C7D9;margin-top:2px;}
  </style>
  <div class="banner"><div class="top">
    ${logoBlock()}
    <div class="left"><div class="headline">${highlightHeadline(c.headline, c.highlightWord)}</div>${c.bodyText ? `<div class="body-text">${escapeHtml(c.bodyText)}</div>` : ''}</div>
    <div class="right">
      <div class="photo-wrap"><img src="${c.photoDataUrl}"/></div>
      <div class="photo-fade"></div>
      <div class="check-float" style="top:14%;left:18%;">✓</div>
      <div class="glass-stack"><div class="gs"><div class="gc">✓</div><div class="gl"></div></div><div class="gs"><div class="gc">✓</div><div class="gl"></div></div><div class="gs"><div class="gc">✓</div><div class="gl"></div></div></div>
    </div>
  </div>
  <div class="twin-strip">
    <div class="twin-icon">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round">
        <rect x="4" y="4" width="10" height="3"/><rect x="4" y="4" width="3" height="10"/>
        <rect x="42" y="4" width="10" height="3"/><rect x="49" y="4" width="3" height="10"/>
        <rect x="4" y="49" width="10" height="3"/><rect x="4" y="42" width="3" height="10"/>
        <rect x="42" y="49" width="10" height="3"/><rect x="49" y="42" width="3" height="10"/>
        <circle cx="22" cy="24" r="2" fill="${GREEN}"/><circle cx="34" cy="24" r="2" fill="${GREEN}"/>
        <path d="M20 34 Q28 40 36 34"/>
        <path d="M16 18 L18 22 L16 26"/><path d="M40 18 L38 22 L40 26"/>
      </svg>
    </div>
    <div class="twin-meta"><div class="t">Face Match</div><div class="d">Liveness + selfie</div></div>
    <div style="width:1px;height:50px;background:rgba(255,255,255,0.15);"></div>
    <div class="twin-icon">
      <svg width="48" height="56" viewBox="0 0 48 56" fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round">
        <path d="M24 6 C 14 6, 8 14, 8 24 C 8 34, 12 40, 16 44"/>
        <path d="M24 12 C 16 12, 12 18, 12 24 C 12 32, 14 38, 18 44"/>
        <path d="M24 18 C 20 18, 17 22, 17 26 C 17 34, 20 40, 22 46"/>
        <path d="M24 24 C 22 24, 21 26, 21 28 C 21 36, 24 44, 26 48"/>
        <path d="M28 26 Q 30 36, 32 46"/>
        <path d="M32 14 C 36 18, 38 22, 38 28 C 38 38, 36 44, 34 48"/>
      </svg>
    </div>
    <div class="twin-meta"><div class="t">Fingerprint</div><div class="d">Biometric capture</div></div>
    <div style="flex:1"></div>
    <div style="background:${GREEN};color:#fff;font-size:11px;font-weight:800;padding:7px 14px;border-radius:99px;letter-spacing:1.2px;text-transform:uppercase;">Coming Soon</div>
  </div>
  ${bottomStrip(features)}</div>`;
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

const LAYOUT_BUILDERS: Record<string, (c: BannerTemplateConfig, features: any[], topH: number) => string> = {
  'photo-right-cards': layoutPhotoRightCards,
  'photo-left-glass': layoutPhotoLeftGlass,
  'face-scan-grid': layoutFaceScanGrid,
  'trust-gauge': layoutTrustGauge,
  'fingerprint-scan': layoutFingerprintScan,
  'user-dashboard': layoutUserDashboard,
  'dev-dashboard-code': layoutDevDashboardCode,
  'id-card-center': layoutIdCardCenter,
  'community-grid': layoutCommunityGrid,
  'api-key-card': layoutApiKeyCard,
  'dashboard-pointing': layoutDashboardPointing,
  'twin-icon-preview': layoutTwinIconPreview,
};

export function buildBannerHtml(c: BannerTemplateConfig): string {
  const features = [
    { t: c.feature1Title || 'REDUCE RISK', d: c.feature1Desc || 'Prevent fraud and bad hires.', icon: '🛡' },
    { t: c.feature2Title || 'TRUSTED DATA', d: c.feature2Desc || 'Use reliable data you can trust.', icon: '◐' },
    { t: c.feature3Title || 'SAVE TIME', d: c.feature3Desc || 'Verify fast and onboard confidently.', icon: '⚡' },
  ];
  const layout = pickLayout({ layoutId: c.layoutId, audience: c.audience, category: c.category, headline: c.headline });
  const builder = LAYOUT_BUILDERS[layout.id] || layoutPhotoRightCards;
  const topH = c.height - 130;
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body>${builder(c, features, topH)}</body></html>`;
}
