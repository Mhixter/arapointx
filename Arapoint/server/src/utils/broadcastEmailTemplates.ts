const YEAR = new Date().getFullYear();
const PLATFORM_URL = "https://arapoint.com.ng";

const GREEN_HEADER = `<!-- arapoint-logo-green-start -->
<tr>
  <td style="background:#166534;padding:22px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td valign="middle" width="56" style="padding-right:15px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" valign="middle" style="width:50px;height:50px;background:#ffffff;border-radius:9px;text-align:center;">
                <span style="display:block;font-size:26px;font-weight:900;color:#166534;font-family:Georgia,'Times New Roman',serif;line-height:50px;text-align:center;">A</span>
              </td>
            </tr>
          </table>
        </td>
        <td valign="middle">
          <p style="margin:0;font-size:21px;font-weight:900;color:#ffffff;letter-spacing:3px;font-family:Arial,Helvetica,sans-serif;line-height:1.1;">ARAPOINT</p>
          <p style="margin:5px 0 0;font-size:10px;color:#86efac;letter-spacing:1.5px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1;">DIGITAL IDENTITY &amp; VERIFICATION &middot; NIGERIA</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
<!-- arapoint-logo-green-end -->`;

const BLUE_HEADER = `<!-- arapoint-logo-blue-start -->
<tr>
  <td style="background:#1e3a8a;padding:22px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td valign="middle" width="56" style="padding-right:15px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" valign="middle" style="width:50px;height:50px;background:#ffffff;border-radius:9px;text-align:center;">
                <span style="display:block;font-size:26px;font-weight:900;color:#1e3a8a;font-family:Georgia,'Times New Roman',serif;line-height:50px;text-align:center;">A</span>
              </td>
            </tr>
          </table>
        </td>
        <td valign="middle">
          <p style="margin:0;font-size:21px;font-weight:900;color:#ffffff;letter-spacing:3px;font-family:Arial,Helvetica,sans-serif;line-height:1.1;">ARAPOINT</p>
          <p style="margin:5px 0 0;font-size:10px;color:#93c5fd;letter-spacing:1.5px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1;">DEVELOPER PLATFORM &middot; SECURE IDENTITY INFRASTRUCTURE</p>
        </td>
        <td valign="middle" align="right">
          <p style="margin:0;font-size:10px;color:#60a5fa;font-weight:700;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">API PORTAL</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
<!-- arapoint-logo-blue-end -->`;

function bannerBlock(url: string): string {
  return `<tr>
  <td style="padding:0;font-size:0;line-height:0;">
    <img src="${url}" alt="Arapoint Banner" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
  </td>
</tr>`;
}

function greenFooter(): string {
  return `<tr>
  <td style="background:#f0fdf4;border-top:2px solid #bbf7d0;padding:28px 32px;text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">ARAPOINT SOLUTIONS</p>
    <p style="margin:0 0 4px;font-size:11px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Digital Identity &amp; Verification Platform &bull; Nigeria</p>
    <p style="margin:0 0 12px;font-size:11px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">
      <a href="${PLATFORM_URL}" style="color:#166534;text-decoration:none;">arapoint.com.ng</a>
    </p>
    <p style="margin:0;font-size:10px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">&copy; ${YEAR} Arapoint Solutions. All rights reserved.</p>
  </td>
</tr>`;
}

function blueFooter(): string {
  return `<tr>
  <td style="background:#0f172a;border-top:2px solid #1e3a8a;padding:28px 32px;text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#60a5fa;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">ARAPOINT DEVELOPER PLATFORM</p>
    <p style="margin:0 0 4px;font-size:11px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Secure Identity API Infrastructure &bull; Nigeria</p>
    <p style="margin:0 0 12px;font-size:11px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">
      <a href="${PLATFORM_URL}/developer" style="color:#3b82f6;text-decoration:none;">arapoint.com.ng/developer</a>
    </p>
    <p style="margin:0;font-size:10px;color:#475569;font-family:Arial,Helvetica,sans-serif;">&copy; ${YEAR} Arapoint Solutions. All rights reserved.</p>
  </td>
</tr>`;
}

function bodyRows(bodyHtml: string): string {
  return `<tr>
  <td style="padding:36px 32px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
    ${bodyHtml}
  </td>
</tr>`;
}

export type BannerPosition = 'top' | 'middle' | 'bottom';
export type RecipientType = 'users' | 'agents' | 'developers';

export interface BroadcastEmailOptions {
  subject: string;
  bodyText: string;
  bannerUrl?: string;
  bannerPosition?: BannerPosition;
  recipientType: RecipientType;
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(para => {
      const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return '';
      return `<p style="margin:0 0 16px;">${lines.join('<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function buildBroadcastEmail(opts: BroadcastEmailOptions): string {
  const { bodyText, bannerUrl, bannerPosition = 'top', recipientType } = opts;
  const isDev = recipientType === 'developers';

  const header = isDev ? BLUE_HEADER : GREEN_HEADER;
  const accentColor = isDev ? '#3b82f6' : '#22c55e';
  const bg = isDev ? '#0D1117' : '#EEF2F7';
  const cardBg = isDev ? '#161B27' : '#FFFFFF';
  const border = isDev ? 'border:1px solid #21293A;' : '';
  const footer = isDev ? blueFooter() : greenFooter();

  const bodyHtml = textToHtml(bodyText);
  const banner = bannerUrl ? bannerBlock(bannerUrl) : '';

  let contentRows: string;
  if (bannerUrl) {
    if (bannerPosition === 'top') {
      contentRows = `${banner}${bodyRows(bodyHtml)}`;
    } else if (bannerPosition === 'bottom') {
      contentRows = `${bodyRows(bodyHtml)}${banner}`;
    } else {
      const paras = bodyHtml.split('</p>').filter(Boolean).map(p => p + '</p>');
      const mid = Math.ceil(paras.length / 2);
      const firstHalf = paras.slice(0, mid).join('');
      const secondHalf = paras.slice(mid).join('');
      contentRows = `${bodyRows(firstHalf)}${banner}${bodyRows(secondHalf)}`;
    }
  } else {
    contentRows = bodyRows(bodyHtml);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint</title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:32px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${cardBg};border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);${border}">

      ${header}

      <tr>
        <td style="height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;background:${accentColor};">&nbsp;</td>
      </tr>

      ${contentRows}

      ${footer}

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
