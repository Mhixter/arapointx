const YEAR = new Date().getFullYear();
const PLATFORM_URL = "https://arapoint.com.ng";

const G = {
  dark:   "#166534",
  mid:    "#16a34a",
  light:  "#22c55e",
  bg:     "#f0fdf4",
  border: "#bbf7d0",
  tint:   "#dcfce7",
  link:   "#15803d",
};

const userLogo = `
<table cellpadding="0" cellspacing="0" align="center">
  <tr>
    <td style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">A</span>
    </td>
    <td style="padding-left:12px;vertical-align:middle;">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:1px;font-family:Arial,sans-serif;">ARAPOINT</p>
      <p style="margin:2px 0 0;color:rgba(255,255,255,0.75);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Digital Services</p>
    </td>
  </tr>
</table>`;

const userFooter = `
<tr>
  <td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E5E7EB;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;color:#9CA3AF;font-size:11px;font-family:Arial,sans-serif;">© ${YEAR} Arapoint Solutions · All rights reserved</p>
          <p style="margin:4px 0 0;font-size:11px;font-family:Arial,sans-serif;">
            <a href="${PLATFORM_URL}" style="color:${G.link};text-decoration:none;">arapoint.com.ng</a>
            &nbsp;·&nbsp;
            <a href="mailto:hello@arapoint.com.ng" style="color:${G.link};text-decoration:none;">hello@arapoint.com.ng</a>
            &nbsp;·&nbsp;
            <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>
          </p>
          <p style="margin:8px 0 0;color:#D1D5DB;font-size:10px;font-family:Arial,sans-serif;">This is a transactional email from Arapoint. If you did not request this, please ignore or contact support.</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

function userBase(previewText: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#EEF2F7;">${previewText}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,${G.dark} 0%,${G.mid} 100%);padding:28px 32px;text-align:center;">
          ${userLogo}
        </td>
      </tr>

      <!-- Accent bar -->
      <tr><td style="height:3px;background:${accentColor};"></td></tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 32px;">
          ${body}
        </td>
      </tr>

      ${userFooter}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function userInfoCard(items: { label: string; value: string }[]): string {
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

function userNoteBox(text: string, color: string, bgColor: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:${bgColor};border:1px solid ${color}33;border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function userCTA(label: string, url: string, color = G.mid): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:${color};border-radius:8px;">
          <a href="${url}" style="display:block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">${label} →</a>
        </td>
      </tr>
    </table>`;
}

export function userOtpEmail(name: string, otp: string, purpose = "email verification"): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Verify Your ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}</h1>
    <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi ${name}, use the code below to complete your ${purpose}. This code expires in <strong style="color:#111827;">10 minutes</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:${G.bg};border:2px dashed ${G.border};border-radius:12px;padding:28px;">
          <p style="margin:0 0 6px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Your verification code</p>
          <p style="margin:0;color:${G.dark};font-size:40px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
        </td>
      </tr>
    </table>

    ${userNoteBox("Never share this code with anyone. Arapoint will never ask for your OTP. If you did not request this, please ignore this email.", "#F59E0B", "#FFFBEB")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Need help? Contact us at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>
    </p>`;

  return userBase(
    `Your verification code is ${otp}. It expires in 10 minutes.`,
    G.light, body
  );
}

export function userWelcomeEmail(name: string, email: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Welcome to Arapoint, ${name}!</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your account has been created successfully. You now have access to Arapoint's full suite of digital identity and verification services.
    </p>

    ${userInfoCard([
      { label: "Registered Email", value: email },
      { label: "Account Status", value: "Active" },
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" style="background:${G.bg};border:1px solid ${G.border};border-radius:10px;margin-bottom:24px;padding:18px;">
      <tr><td>
        <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">What you can do with Arapoint:</p>
        ${["NIN verification & personalization", "BVN services & modifications", "CAC business registration", "Educational result verification", "JAMB & WAEC services"].map(item =>
          `<p style="margin:0 0 6px;color:#6B7280;font-size:13px;font-family:Arial,sans-serif;">
            <span style="color:${G.mid};font-weight:700;margin-right:8px;">✓</span>${item}
          </p>`
        ).join('')}
      </td></tr>
    </table>

    ${userCTA("Go to Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Questions? Email us at <a href="mailto:hello@arapoint.com.ng" style="color:${G.link};text-decoration:none;">hello@arapoint.com.ng</a>
    </p>`;

  return userBase(
    `Your Arapoint account is ready. Start verifying identities today.`,
    G.light, body
  );
}

export function userWalletFundedEmail(name: string, amount: string, balance: string, reference: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Wallet Funded Successfully</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi ${name}, your Arapoint wallet has been credited.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="background:${G.bg};border:1px solid ${G.border};border-radius:12px;padding:24px;">
          <p style="margin:0 0 4px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Amount Credited</p>
          <p style="margin:0;color:${G.dark};font-size:36px;font-weight:900;font-family:Arial,sans-serif;">${amount}</p>
        </td>
      </tr>
    </table>

    ${userInfoCard([
      { label: "Available Balance", value: balance },
      { label: "Reference", value: reference },
      { label: "Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${userCTA("View Wallet", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Didn't make this transaction? Contact us immediately at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>
    </p>`;

  return userBase(
    `Your wallet has been funded with ${amount}. New balance: ${balance}.`,
    G.light, body
  );
}

export function userServiceCompletedEmail(name: string, serviceType: string, details: string, trackingId: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Request Completed</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi ${name}, your <strong style="color:#111827;">${serviceType}</strong> request has been completed successfully.
    </p>

    ${userInfoCard([
      { label: "Service", value: serviceType },
      { label: "Tracking ID", value: trackingId },
      { label: "Status", value: "✓ Completed" },
      { label: "Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${details ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:24px;padding:16px;">
      <tr><td>
        <p style="margin:0 0 6px;color:#9CA3AF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Details</p>
        <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${details}</p>
      </td></tr>
    </table>` : ""}

    ${userCTA("View in Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Thank you for choosing Arapoint. Contact <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a> if you have any questions.
    </p>`;

  return userBase(
    `Your ${serviceType} request (${trackingId}) has been completed.`,
    G.light, body
  );
}

export function userPasswordResetEmail(name: string, otp: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Password Reset Request</h1>
    <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Hi ${name}, we received a request to reset your Arapoint password. Use the code below. It expires in <strong style="color:#111827;">10 minutes</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:#FFF7ED;border:2px dashed #FED7AA;border-radius:12px;padding:28px;">
          <p style="margin:0 0 6px;color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Password reset code</p>
          <p style="margin:0;color:#92400E;font-size:40px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
        </td>
      </tr>
    </table>

    ${userNoteBox("If you did not request a password reset, please ignore this email. Your account is safe and no changes have been made.", "#EF4444", "#FEF2F2")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Security concerns? Email us at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>
    </p>`;

  return userBase(
    `Your password reset code is ${otp}. Expires in 10 minutes.`,
    "#F59E0B", body
  );
}

export function userBvnCompletedEmail(name: string, maskedBvn: string, serviceType: string): string {
  const body = `
    <h1 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">BVN Service Completed</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your <strong style="color:#111827;">BVN ${serviceType}</strong> request has been completed successfully.
    </p>

    ${userInfoCard([
      { label: "BVN (masked)", value: maskedBvn },
      { label: "Service Type", value: serviceType },
      { label: "Status", value: "✓ Completed" },
      { label: "Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${userCTA("View Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">
      Thank you for choosing Arapoint. Contact <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a> with questions.
    </p>`;

  return userBase(
    `Your BVN ${serviceType} request has been completed.`,
    G.light, body
  );
}
