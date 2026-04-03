const YEAR = new Date().getFullYear();

const agentLogo = `
<table cellpadding="0" cellspacing="0" align="center">
  <tr>
    <td style="width:36px;height:36px;background:rgba(255,255,255,0.18);border-radius:8px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-size:16px;font-weight:900;font-family:Arial,sans-serif;">A</span>
    </td>
    <td style="padding-left:10px;vertical-align:middle;">
      <p style="margin:0;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:1.5px;font-family:Arial,sans-serif;">ARAPOINT</p>
      <p style="margin:1px 0 0;color:rgba(255,255,255,0.65);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Agent Network</p>
    </td>
  </tr>
</table>`;

function agentBase(previewText: string, accentColor: string, accentBg: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint Agent Portal</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F9;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F0F4F9;">${previewText}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F9;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${accentBg} 0%,${accentColor} 100%);padding:26px 32px;text-align:center;">
          ${agentLogo}
        </td>
      </tr>

      <!-- Accent bar -->
      <tr><td style="height:3px;background:${accentColor};"></td></tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          ${body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;padding:18px 32px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;color:#9CA3AF;font-size:11px;font-family:Arial,sans-serif;">© ${YEAR} Arapoint Solutions · All rights reserved</p>
          <p style="margin:4px 0 0;color:#9CA3AF;font-size:10px;font-family:Arial,sans-serif;">This is an official notification from Arapoint. If you did not expect this, contact support@arapoint.com.ng</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function agentInfoCard(items: { label: string; value: string }[]): string {
  const rows = items.map(({ label, value }) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;">
        <p style="margin:0;color:#9CA3AF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">${label}</p>
        <p style="margin:3px 0 0;color:#111827;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${value}</p>
      </td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;overflow:hidden;">
      ${rows}
    </table>`;
}

export function agentWelcomeEmailHtml({
  name,
  email,
  password,
  employeeId,
  role,
  loginUrl,
}: {
  name: string;
  email: string;
  password: string;
  employeeId?: string | null;
  role: string;
  loginUrl: string;
}): string {
  const infoItems = [
    { label: "Full Name", value: name },
    { label: "Login Email", value: email },
    { label: "Login Code", value: `<span style="font-family:'Courier New',monospace;background:#EEF2FF;color:#3730A3;padding:2px 8px;border-radius:4px;">${password}</span>` },
    ...(employeeId ? [{ label: "Employee ID", value: employeeId }] : []),
    { label: "Role", value: role },
  ];

  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Welcome, ${name}!</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your <strong style="color:#111827;">${role}</strong> account has been set up on the Arapoint Agent Portal. Keep your login details safe and secure.
    </p>

    ${agentInfoCard(infoItems)}

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#1e3a8a;border-radius:8px;">
          <a href="${loginUrl}" style="display:block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Log In to Agent Dashboard →</a>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:8px;">
      <tr>
        <td>
          <p style="margin:0;color:#92400E;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">
            <strong>Important:</strong> Your login code is managed by your administrator. If you require a new one, contact your supervisor. Your Service Level Agreement (SLA) is attached — please review it before you begin work.
          </p>
        </td>
      </tr>
    </table>`;

  return agentBase(
    `Your ${role} account on Arapoint has been set up. Here are your login details.`,
    "#1d4ed8", "#1e3a8a", body
  );
}

export function agentNewRequestEmailHtml({
  agentName,
  serviceLabel,
  trackingId,
  customerName,
  details,
  dashboardUrl,
}: {
  agentName: string;
  serviceLabel: string;
  trackingId: string;
  customerName: string;
  details: string;
  dashboardUrl: string;
}): string {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;color:#92400E;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">⚡ New request awaiting your attention</p>
        </td>
      </tr>
    </table>

    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">New ${serviceLabel} Request</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi <strong style="color:#111827;">${agentName}</strong>, a new <strong style="color:#111827;">${serviceLabel}</strong> request has been submitted and is assigned to you for processing.
    </p>

    ${agentInfoCard([
      { label: "Tracking ID", value: trackingId },
      { label: "Service", value: serviceLabel },
      { label: "Customer", value: customerName },
      { label: "Details", value: details },
      { label: "Received", value: new Date().toLocaleString("en-NG") },
    ])}

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#1e3a8a;border-radius:8px;">
          <a href="${dashboardUrl}" style="display:block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">View Request in Dashboard →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">Please log in and pick up this request as soon as possible to meet your SLA commitment.</p>`;

  return agentBase(
    `New ${serviceLabel} request (${trackingId}) — ${customerName} — ready for processing.`,
    "#F59E0B", "#92400E", body
  );
}

export const SERVICE_LABELS: Record<string, string> = {
  nin_validation: 'NIN Validation',
  nin_personalization: 'NIN Personalization',
  ipe_clearance: 'IPE Clearance',
  nin_modification: 'NIN Modification',
  nin_tracking: 'NIN Tracking',
  birth_attestation: 'Birth Attestation',
  bvn_modification: 'BVN Modification',
  'cac-business-name': 'CAC Business Name Registration',
  'cac-private-limited': 'CAC Private Limited Company',
  'cac-public-limited': 'CAC Public Limited Company',
  'cac-ngo': 'CAC NGO / Association Registration',
  jamb: 'JAMB Services',
  waec: 'WAEC Result Verification',
  neco: 'NECO Result Verification',
  nabteb: 'NABTEB Result Verification',
  nbais: 'NBAIS Result Verification',
  a2c: 'Airtime to Cash',
};
