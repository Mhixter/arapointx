const YEAR = new Date().getFullYear();
const DEV_PORTAL_URL = "https://arapoint.com.ng/developer";

const devLogo = `
<table cellpadding="0" cellspacing="0" align="center">
  <tr>
    <td style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-size:18px;font-weight:900;font-family:Arial,sans-serif;">A</span>
    </td>
    <td style="padding-left:12px;vertical-align:middle;">
      <p style="margin:0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:1.5px;font-family:Arial,sans-serif;">ARAPOINT</p>
      <p style="margin:2px 0 0;color:rgba(255,255,255,0.65);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Developer Platform</p>
    </td>
  </tr>
</table>`;

const devFooter = `
<tr>
  <td style="background:#070B14;padding:20px 32px;border-top:1px solid #1F2937;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;color:#4B5563;font-size:11px;font-family:Arial,sans-serif;">© ${YEAR} Arapoint Solutions · All rights reserved</p>
          <p style="margin:4px 0 0;font-size:11px;font-family:Arial,sans-serif;">
            <a href="${DEV_PORTAL_URL}" style="color:#3B82F6;text-decoration:none;">Developer Portal</a>
            &nbsp;·&nbsp;
            <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

function devBase(previewText: string, headerBadge: string, headerBadgeColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint Developer Portal</title>
</head>
<body style="margin:0;padding:0;background:#030712;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#030712;">${previewText}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#030712;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#0D1526;border-radius:16px;overflow:hidden;border:1px solid #1F2937;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0B5FFF 0%,#0A3DD4 100%);padding:28px 32px;text-align:center;">
          ${devLogo}
        </td>
      </tr>

      <!-- Badge strip -->
      <tr>
        <td style="background:#111827;padding:14px 32px;border-bottom:1px solid #1F2937;">
          <span style="display:inline-block;background:${headerBadgeColor}22;color:${headerBadgeColor};border:1px solid ${headerBadgeColor}44;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:0.5px;font-family:Arial,sans-serif;">${headerBadge}</span>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          ${body}
        </td>
      </tr>

      ${devFooter}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function devInfoBox(items: { label: string; value: string }[]): string {
  const rows = items.map(({ label, value }) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1F2937;">
        <p style="margin:0;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">${label}</p>
        <p style="margin:3px 0 0;color:#E5E7EB;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${value}</p>
      </td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1F2937;border-radius:10px;margin-bottom:24px;overflow:hidden;">
      ${rows}
    </table>`;
}

function devNoteBox(note: string, color: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#111827;border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;"><strong style="color:#E5E7EB;">Note: </strong>${note}</p>
        </td>
      </tr>
    </table>`;
}

function devCTA(label: string, url: string, color = "#0B5FFF"): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:${color};border-radius:8px;">
          <a href="${url}" style="display:block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">${label} →</a>
        </td>
      </tr>
    </table>`;
}

export function devKybApprovedEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Congratulations, ${name}!</h1>
    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your business verification (KYB) has been <strong style="color:#12B76A;">approved</strong>. You now have full access to the Arapoint Live API.
    </p>

    ${devInfoBox([
      { label: "Verification Status", value: "✓ KYB Approved" },
      { label: "Access Level", value: "Full Live API Access" },
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #12B76A33;border-radius:10px;margin-bottom:24px;padding:18px;">
      <tr><td style="padding:0 2px;">
        <p style="margin:0 0 10px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">What you can do now</p>
        <table cellpadding="0" cellspacing="0">
          ${["Switch your dashboard to Live Mode", "Create live API keys", "Access real identity verification data", "Use higher rate limits"].map(item =>
            `<tr><td style="padding:4px 0;color:#D1FAE5;font-size:13px;font-family:Arial,sans-serif;">
              <span style="color:#12B76A;font-weight:700;margin-right:8px;">✓</span>${item}
            </td></tr>`
          ).join('')}
        </table>
      </td></tr>
    </table>

    ${note ? devNoteBox(note, "#12B76A") : ""}

    ${devCTA("Open Developer Dashboard", `${DEV_PORTAL_URL}/dashboard`, "#12B76A")}

    <p style="margin:0;color:#4B5563;font-size:12px;font-family:Arial,sans-serif;">
      If you have any questions, contact us at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>
    </p>`;

  return devBase(
    `Your KYB verification has been approved. You now have full Live API access.`,
    "KYB Approved", "#12B76A", body
  );
}

export function devKybConditionalEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Conditional Approval, ${name}</h1>
    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your KYB application has been <strong style="color:#F59E0B;">conditionally approved</strong>. You have limited API access while our compliance team completes the final review.
    </p>

    ${devInfoBox([
      { label: "Verification Status", value: "⚠ Conditional Approval" },
      { label: "Access Level", value: "Limited Sandbox + Partial Live" },
    ])}

    ${note ? devNoteBox(note, "#F59E0B") : ""}

    <p style="margin:0 0 20px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Please review the compliance note above and update your application with any missing information as soon as possible.
    </p>

    ${devCTA("Review & Update Application", `${DEV_PORTAL_URL}/kyb`, "#F59E0B")}

    <p style="margin:0;color:#4B5563;font-size:12px;font-family:Arial,sans-serif;">
      Questions? Email us at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>
    </p>`;

  return devBase(
    `Your KYB application has been conditionally approved. Review the conditions and update your application.`,
    "Conditional Approval", "#F59E0B", body
  );
}

export function devKybRejectedEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">KYB Application Update</h1>
    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi ${name}, unfortunately your business verification (KYB) application was <strong style="color:#EF4444;">not approved</strong> at this time. You may review the feedback below and resubmit with updated information.
    </p>

    ${devInfoBox([
      { label: "Verification Status", value: "✗ Application Not Approved" },
    ])}

    ${note ? devNoteBox(note, "#EF4444") : ""}

    <p style="margin:0 0 20px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Please address the issues outlined above, update your documents, and resubmit your application through the developer portal.
    </p>

    ${devCTA("Resubmit Application", `${DEV_PORTAL_URL}/kyb`, "#EF4444")}

    <p style="margin:0;color:#4B5563;font-size:12px;font-family:Arial,sans-serif;">
      If you believe this decision is incorrect, contact <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>
    </p>`;

  return devBase(
    `Your KYB application was not approved. Review the feedback and resubmit.`,
    "Not Approved", "#EF4444", body
  );
}

export function devWelcomeEmail(name: string, email: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Welcome, ${name}!</h1>
    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your Arapoint Developer account has been successfully created. You can now start building with Nigeria's identity verification infrastructure.
    </p>

    ${devInfoBox([
      { label: "Account Email", value: email },
      { label: "Initial Environment", value: "Sandbox (Test Mode)" },
      { label: "API Access", value: "Sandbox Keys Available" },
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1F2937;border-radius:10px;margin-bottom:24px;padding:18px;">
      <tr><td>
        <p style="margin:0 0 10px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Getting started</p>
        ${["Create your first API key in the dashboard", "Test with sandbox credentials — no real data", "Complete KYB verification to unlock live access", "Read the API documentation for integration guides"].map((item, i) =>
          `<p style="margin:0 0 6px;color:#D1D5DB;font-size:13px;font-family:Arial,sans-serif;">
            <span style="color:#0B5FFF;font-weight:700;margin-right:8px;">${i + 1}.</span>${item}
          </p>`
        ).join('')}
      </td></tr>
    </table>

    ${devCTA("Go to Developer Dashboard", `${DEV_PORTAL_URL}/dashboard`)}

    <p style="margin:0;color:#4B5563;font-size:12px;font-family:Arial,sans-serif;">
      Need help? Visit our docs or email <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>
    </p>`;

  return devBase(
    `Your Arapoint Developer account is ready. Start building with Nigeria's identity API.`,
    "Account Activated", "#0B5FFF", body
  );
}
