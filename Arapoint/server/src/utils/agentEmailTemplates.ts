const YEAR = new Date().getFullYear();
const SITE_URL = "https://arapoint.com.ng";
const GREEN_LOGO_URL = `${SITE_URL}/email-logo-green.png`;

function agentBase(previewText: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint Agent Portal</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F0F4F8;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0F4F8;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- Logo Header -->
      <tr>
        <td style="padding:0;margin:0;line-height:0;">
          <img src="${GREEN_LOGO_URL}" alt="Arapoint Solutions" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
        </td>
      </tr>

      <!-- Accent bar -->
      <tr><td style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 36px;">
          ${body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;padding:28px 36px;border-top:1px solid #E5E7EB;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border-bottom:1px solid #E5E7EB;padding-bottom:16px;margin-bottom:16px;">
                <p style="margin:0;color:#374151;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Arapoint Solutions</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:12px;font-family:Arial,sans-serif;">Nigeria's Digital Identity &amp; Verification Platform</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding-right:16px;">
                      <a href="${SITE_URL}" style="color:#166534;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">arapoint.com.ng</a>
                    </td>
                    <td style="padding:0 16px;border-left:1px solid #D1D5DB;">
                      <a href="mailto:support@arapoint.com.ng" style="color:#166534;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">support@arapoint.com.ng</a>
                    </td>
                    <td style="padding:0 16px;border-left:1px solid #D1D5DB;">
                      <a href="mailto:hello@arapoint.com.ng" style="color:#166534;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">hello@arapoint.com.ng</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:#9CA3AF;font-size:11px;line-height:1.6;font-family:Arial,sans-serif;">
                  &copy; ${YEAR} Arapoint Solutions. All rights reserved.<br>
                  This is an official internal notification from the Arapoint Agent Network. It is intended solely for the named recipient. If you received this in error, please contact your supervisor or email support@arapoint.com.ng immediately.
                </p>
              </td>
            </tr>
          </table>
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
      <td style="padding:12px 16px;border-bottom:1px solid #F3F4F6;">
        <p style="margin:0;color:#9CA3AF;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${label}</p>
        <p style="margin:4px 0 0;color:#111827;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${value}</p>
      </td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:28px;overflow:hidden;">
      ${rows}
    </table>`;
}

function agentAlertBox(text: string, borderColor: string, bgColor: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td style="background:${bgColor};border:1px solid ${borderColor}44;border-left:4px solid ${borderColor};border-radius:0 6px 6px 0;padding:14px 18px;">
          <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function agentCTA(label: string, url: string, color = "#166534"): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td style="background:${color};border-radius:6px;">
          <a href="${url}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">${label}</a>
        </td>
      </tr>
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
    { label: "Login Code", value: `<span style="font-family:'Courier New',monospace;background:#F0FDF4;color:#166534;padding:3px 10px;border-radius:4px;font-size:15px;letter-spacing:2px;">${password}</span>` },
    ...(employeeId ? [{ label: "Employee ID", value: employeeId }] : []),
    { label: "Role / Position", value: role },
  ];

  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">Welcome, ${name}</h1>
    <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Your <strong style="color:#111827;">${role}</strong> account has been set up on the Arapoint Agent Portal. Please keep your login credentials confidential and do not share them with anyone.
    </p>

    <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Your Account Details</p>
    ${agentInfoCard(infoItems)}

    ${agentCTA("Log In to Agent Dashboard", loginUrl)}

    ${agentAlertBox("<strong>Important:</strong> Your login code is managed by your administrator. If you require a new one, please contact your supervisor directly. Review your Service Level Agreement (SLA) before you begin processing requests.", "#F59E0B", "#FFFBEB")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      For technical assistance, contact the Arapoint support team at <a href="mailto:support@arapoint.com.ng" style="color:#166534;text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return agentBase(
    `Your ${role} account on the Arapoint Agent Portal is ready. Here are your login details.`,
    "#16a34a", body
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
    <h1 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">New Request Assigned to You</h1>
    <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear <strong style="color:#111827;">${agentName}</strong>, a new <strong style="color:#111827;">${serviceLabel}</strong> request has been submitted and assigned to you for processing. Please review the details below and action it promptly.
    </p>

    <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Request Details</p>
    ${agentInfoCard([
      { label: "Tracking ID", value: trackingId },
      { label: "Service Type", value: serviceLabel },
      { label: "Customer Name", value: customerName },
      { label: "Additional Information", value: details },
      { label: "Date Received", value: new Date().toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" }) },
    ])}

    ${agentCTA("View Request in Dashboard", dashboardUrl)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Please log in and begin processing this request as soon as possible to meet your SLA commitment. For queries, contact your team supervisor.
    </p>`;

  return agentBase(
    `New ${serviceLabel} request (${trackingId}) assigned to you — ${customerName} — action required.`,
    "#16a34a", body
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
