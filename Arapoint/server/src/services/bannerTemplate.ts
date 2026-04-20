import path from 'path';
import fs from 'fs';

const NAVY = '#0A2540';
const GREEN = '#00B86B';
const TEXT_BODY = '#3E5470';

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
  feature1Title?: string;
  feature1Desc?: string;
  feature2Title?: string;
  feature2Desc?: string;
  feature3Title?: string;
  feature3Desc?: string;
  width: number;
  height: number;
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string));
}

export function buildBannerHtml(c: BannerTemplateConfig): string {
  const logo = loadLogoBase64();
  const headlineHtml = highlightHeadline(c.headline, c.highlightWord);
  const body = c.bodyText ? escapeHtml(c.bodyText) : '';
  const photo = c.photoDataUrl;

  const features = [
    { t: c.feature1Title || 'REDUCE RISK', d: c.feature1Desc || 'Prevent fraud and bad hires.', icon: '🛡' },
    { t: c.feature2Title || 'TRUSTED DATA', d: c.feature2Desc || 'Use reliable data you can trust.', icon: '◐' },
    { t: c.feature3Title || 'SAVE TIME', d: c.feature3Desc || 'Verify fast and onboard confidently.', icon: '⚡' },
  ];

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
  html,body{width:${c.width}px;height:${c.height}px;font-family:'Inter','Segoe UI',-apple-system,sans-serif;background:#fff;}
  .banner{position:relative;width:${c.width}px;height:${c.height}px;background:#fff;overflow:hidden;}
  .top{position:absolute;top:0;left:0;right:0;height:${c.height - 130}px;background:#fff;display:flex;}
  .left{flex:1.05;padding:48px 36px 24px 56px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;}
  .right{flex:1;position:relative;}
  .logo-row{position:absolute;top:36px;left:56px;display:flex;align-items:center;gap:12px;z-index:5;}
  .logo-row img{width:48px;height:48px;object-fit:contain;display:block;}
  .logo-row .wordmark{font-size:34px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;line-height:1;}
  .headline{font-size:54px;font-weight:800;color:${NAVY};line-height:1.05;letter-spacing:-1.2px;margin-bottom:22px;margin-top:64px;}
  .body-block{display:flex;gap:14px;}
  .accent-bar{width:3px;background:${GREEN};border-radius:2px;flex-shrink:0;}
  .body-text{font-size:16px;line-height:1.55;color:${TEXT_BODY};max-width:560px;}
  .body-text b{color:${GREEN};font-weight:600;}
  .photo-wrap{position:absolute;inset:0;overflow:hidden;}
  .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:center;}
  .photo-fade{position:absolute;top:0;bottom:0;left:0;width:140px;background:linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);}
  .green-arc{position:absolute;top:-10%;right:-12%;width:340px;height:120%;background:${GREEN};border-radius:60% 0 0 60%;opacity:0.12;}
  .verify-cards{position:absolute;right:34px;bottom:36px;display:flex;flex-direction:column;gap:14px;z-index:4;}
  .vcard{background:rgba(255,255,255,0.96);box-shadow:0 12px 28px rgba(10,37,64,0.14);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;width:280px;backdrop-filter:blur(10px);}
  .vcard .iconbox{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;}
  .vcard .meta{flex:1;line-height:1.2;}
  .vcard .meta .t{font-size:14px;font-weight:700;color:${NAVY};}
  .vcard .meta .s{font-size:12px;color:${GREEN};font-weight:600;margin-top:2px;}
  .vcard .check{width:30px;height:30px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;}
  .bottom{position:absolute;bottom:0;left:0;right:0;height:130px;background:${NAVY};display:flex;align-items:center;padding:0 56px;gap:48px;}
  .feat{flex:1;display:flex;align-items:center;gap:18px;color:#fff;}
  .feat .ficon{width:54px;height:54px;border-radius:14px;background:rgba(0,184,107,0.18);display:flex;align-items:center;justify-content:center;color:${GREEN};font-size:26px;font-weight:800;flex-shrink:0;}
  .feat .ftxt .ft{color:${GREEN};font-weight:800;font-size:15px;letter-spacing:0.6px;text-transform:uppercase;}
  .feat .ftxt .fd{color:#E6EDF5;font-size:14px;line-height:1.4;margin-top:3px;}
  .divider{width:1px;height:60px;background:rgba(255,255,255,0.12);}
</style></head>
<body>
  <div class="banner">
    <div class="top">
      <div class="left">
        <div class="headline">${headlineHtml}</div>
        ${body ? `<div class="body-block"><div class="accent-bar"></div><div class="body-text">${body}</div></div>` : ''}
      </div>
      <div class="right">
        <div class="green-arc"></div>
        <div class="photo-wrap"><img src="${photo}"/></div>
        <div class="photo-fade"></div>
        <div class="verify-cards">
          <div class="vcard"><div class="iconbox" style="background:${NAVY}">ID</div><div class="meta"><div class="t">BVN Verification</div><div class="s">Verified</div></div><div class="check">✓</div></div>
          <div class="vcard"><div class="iconbox" style="background:#5B5BFF">EC</div><div class="meta"><div class="t">Education Check</div><div class="s">Verified</div></div><div class="check">✓</div></div>
          <div class="vcard"><div class="iconbox" style="background:#22C55E">IM</div><div class="meta"><div class="t">Identity Match</div><div class="s">Verified</div></div><div class="check">✓</div></div>
        </div>
      </div>
      ${logo ? `<div class="logo-row"><img src="${logo}"/><div class="wordmark">Arapoint</div></div>` : `<div class="logo-row"><div class="wordmark" style="color:${NAVY}">Arapoint</div></div>`}
    </div>
    <div class="bottom">
      <div class="feat"><div class="ficon">${features[0].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[0].t)}</div><div class="fd">${escapeHtml(features[0].d)}</div></div></div>
      <div class="divider"></div>
      <div class="feat"><div class="ficon">${features[1].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[1].t)}</div><div class="fd">${escapeHtml(features[1].d)}</div></div></div>
      <div class="divider"></div>
      <div class="feat"><div class="ficon">${features[2].icon}</div><div class="ftxt"><div class="ft">${escapeHtml(features[2].t)}</div><div class="fd">${escapeHtml(features[2].d)}</div></div></div>
    </div>
  </div>
</body></html>`;
}
