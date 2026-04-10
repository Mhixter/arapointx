const YEAR = new Date().getFullYear();
const SITE_URL = "https://arapoint.com.ng";
const DEV_PORTAL_URL = `${SITE_URL}/developer`;
const BLUE_LOGO_URL = `${SITE_URL}/email-logo-blue.png`;

function devBase(previewText: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint Developer Platform</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#0D1117;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0D1117;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#161B27;border-radius:8px;overflow:hidden;border:1px solid #21293A;">

      <!-- Logo Header -->
      <tr>
        <td style="padding:0;margin:0;line-height:0;">
          <img src="${BLUE_LOGO_URL}" alt="Arapoint — Secure Identity Infrastructure" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
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
        <td style="background:#0D1117;padding:28px 36px;border-top:1px solid #21293A;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border-bottom:1px solid #21293A;padding-bottom:16px;">
                <p style="margin:0;color:#E5E7EB;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Arapoint Developer Platform</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:12px;font-family:Arial,sans-serif;">Secure Identity Infrastructure for Nigeria</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding-right:16px;">
                      <a href="${DEV_PORTAL_URL}" style="color:#3B82F6;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">Developer Portal</a>
                    </td>
                    <td style="padding:0 16px;border-left:1px solid #374151;">
                      <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">developers@arapoint.com.ng</a>
                    </td>
                    <td style="padding:0 16px;border-left:1px solid #374151;">
                      <a href="${SITE_URL}" style="color:#3B82F6;font-size:12px;text-decoration:none;font-family:Arial,sans-serif;">arapoint.com.ng</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:#4B5563;font-size:11px;line-height:1.6;font-family:Arial,sans-serif;">
                  &copy; ${YEAR} Arapoint Solutions. All rights reserved.<br>
                  This is a transactional notification from the Arapoint Developer Platform. It is intended solely for the registered account holder. If you did not initiate this action, please contact developers@arapoint.com.ng immediately and do not click any links in this email.
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

function devInfoBox(items: { label: string; value: string }[]): string {
  const rows = items.map(({ label, value }) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #21293A;">
        <p style="margin:0;color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${label}</p>
        <p style="margin:4px 0 0;color:#E5E7EB;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${value}</p>
      </td>
    </tr>`).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1F2937;border:1px solid #21293A;border-radius:8px;margin-bottom:28px;overflow:hidden;">
      ${rows}
    </table>`;
}

function devNoteBox(note: string, borderColor: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td style="background:#1F2937;border:1px solid #21293A;border-left:4px solid ${borderColor};border-radius:0 6px 6px 0;padding:14px 18px;">
          <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${note}</p>
        </td>
      </tr>
    </table>`;
}

function devCTA(label: string, url: string, color = "#1D4ED8"): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td style="background:${color};border-radius:6px;">
          <a href="${url}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function devStepList(steps: string[], color = "#3B82F6"): string {
  return steps.map((step, i) => `
    <p style="margin:0 0 8px;color:#D1D5DB;font-size:13px;font-family:Arial,sans-serif;">
      <span style="display:inline-block;min-width:22px;color:${color};font-weight:700;">${i + 1}.</span>${step}
    </p>`).join('');
}

export function devKybApprovedEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#F9FAFB;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">KYB Verification Approved</h1>
    <p style="margin:0 0 28px;color:#9CA3AF;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, congratulations. Your business verification (KYB) application has been reviewed and <strong style="color:#10B981;">approved</strong>. You now have full access to the Arapoint Live API.
    </p>

    <p style="margin:0 0 12px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Verification Summary</p>
    ${devInfoBox([
      { label: "Verification Status", value: "Approved" },
      { label: "Access Level", value: "Full Live API Access" },
      { label: "Effective Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1F2937;border:1px solid #21293A;border-radius:8px;margin-bottom:28px;padding:20px;">
      <tr><td>
        <p style="margin:0 0 12px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">You can now</p>
        ${devStepList([
          "Switch your dashboard environment to Live Mode",
          "Generate live API keys for production integration",
          "Access real-time identity verification data",
          "Benefit from elevated rate limits",
        ], "#10B981")}
      </td></tr>
    </table>

    ${note ? devNoteBox(note, "#10B981") : ""}

    ${devCTA("Open Developer Dashboard", `${DEV_PORTAL_URL}/dashboard`, "#10B981")}

    <p style="margin:0;color:#4B5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      If you have any questions or require assistance, please contact our developer support team at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>.
    </p>`;

  return devBase(
    `Your KYB verification has been approved. You now have full Live API access on Arapoint.`,
    "#10B981", body
  );
}

export function devKybConditionalEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#F9FAFB;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">KYB — Conditional Approval</h1>
    <p style="margin:0 0 28px;color:#9CA3AF;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your business verification (KYB) application has been <strong style="color:#F59E0B;">conditionally approved</strong>. You have limited API access while our compliance team completes the final review of your submission.
    </p>

    <p style="margin:0 0 12px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Verification Summary</p>
    ${devInfoBox([
      { label: "Verification Status", value: "Conditional Approval — Action Required" },
      { label: "Access Level", value: "Sandbox and Partial Live Access" },
    ])}

    ${note ? devNoteBox(`<strong style="color:#E5E7EB;">Compliance Note:</strong> ${note}`, "#F59E0B") : ""}

    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Please review the compliance note above and update your application with any missing or corrected information as soon as possible to proceed to full approval.
    </p>

    ${devCTA("Review and Update Application", `${DEV_PORTAL_URL}/kyb`, "#F59E0B")}

    <p style="margin:0;color:#4B5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      For assistance, email us at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>.
    </p>`;

  return devBase(
    `Your KYB application has been conditionally approved. Review the conditions and update your application.`,
    "#F59E0B", body
  );
}

export function devKybRejectedEmail(name: string, note?: string | null): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#F9FAFB;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">KYB Application — Update Required</h1>
    <p style="margin:0 0 28px;color:#9CA3AF;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, following a thorough review of your business verification (KYB) application, we are unable to approve it at this time. Please review the feedback provided below and resubmit with updated documentation.
    </p>

    <p style="margin:0 0 12px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Verification Summary</p>
    ${devInfoBox([
      { label: "Verification Status", value: "Not Approved — Resubmission Required" },
      { label: "Access Level", value: "Sandbox Only" },
    ])}

    ${note ? devNoteBox(`<strong style="color:#E5E7EB;">Review Feedback:</strong> ${note}`, "#EF4444") : devNoteBox("Specific reasons for this decision have been flagged internally. Please contact our developer support team for a detailed explanation.", "#EF4444")}

    <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Please address the issues outlined above, prepare updated documentation, and resubmit your application through the developer portal. You may reapply as soon as you have resolved the flagged items.
    </p>

    ${devCTA("Resubmit Application", `${DEV_PORTAL_URL}/kyb`, "#EF4444")}

    <p style="margin:0;color:#4B5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      If you believe this decision is incorrect or require clarification, please contact us at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>.
    </p>`;

  return devBase(
    `Your KYB application was not approved. Review the feedback and resubmit with updated information.`,
    "#EF4444", body
  );
}

export function devWelcomeEmail(name: string, email: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#F9FAFB;font-size:24px;font-weight:800;font-family:Arial,sans-serif;">Welcome to Arapoint Developer Platform</h1>
    <p style="margin:0 0 28px;color:#9CA3AF;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your Arapoint Developer account has been created successfully. You now have access to Nigeria's most reliable identity verification infrastructure. Begin building and testing in the sandbox environment immediately.
    </p>

    <p style="margin:0 0 12px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Account Information</p>
    ${devInfoBox([
      { label: "Registered Email", value: email },
      { label: "Default Environment", value: "Sandbox (Test Mode — No Real Data)" },
      { label: "API Access", value: "Sandbox Keys Available Immediately" },
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1F2937;border:1px solid #21293A;border-radius:8px;margin-bottom:28px;padding:20px;">
      <tr><td>
        <p style="margin:0 0 12px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Getting Started</p>
        ${devStepList([
          "Log in to your dashboard and create your first sandbox API key",
          "Test all endpoints using sandbox credentials — no real data is accessed",
          "Complete the KYB (business verification) process to unlock live API access",
          "Review the API reference documentation for integration guides and code samples",
        ])}
      </td></tr>
    </table>

    ${devCTA("Go to Developer Dashboard", `${DEV_PORTAL_URL}/dashboard`)}

    <p style="margin:0;color:#4B5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Need help getting started? Our developer support team is available at <a href="mailto:developers@arapoint.com.ng" style="color:#3B82F6;text-decoration:none;">developers@arapoint.com.ng</a>.
    </p>`;

  return devBase(
    `Your Arapoint Developer account is ready. Start building with Nigeria's identity verification API.`,
    "#1D4ED8", body
  );
}
