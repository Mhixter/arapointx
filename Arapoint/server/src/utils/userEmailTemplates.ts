const YEAR = new Date().getFullYear();
const PLATFORM_URL = "https://arapoint.com.ng";

const GREEN_HEADER = `
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
</tr>`;

const G = {
  dark:   "#166534",
  mid:    "#16a34a",
  light:  "#22c55e",
  bg:     "#F0FDF4",
  border: "#BBF7D0",
  link:   "#15803d",
};

function userBase(previewText: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arapoint</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#EEF2F7;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:32px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- Branded Header -->
      ${GREEN_HEADER}

      <!-- Accent bar -->
      <tr>
        <td style="height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;background:${accentColor};">&nbsp;</td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 32px;">
          ${body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;padding:24px 32px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Arapoint Solutions</p>
          <p style="margin:0 0 14px;color:#6B7280;font-size:11px;font-family:Arial,sans-serif;">Nigeria's Digital Identity &amp; Verification Platform</p>
          <p style="margin:0 0 10px;font-size:12px;font-family:Arial,sans-serif;">
            <a href="${PLATFORM_URL}" style="color:${G.link};text-decoration:none;">arapoint.com.ng</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="mailto:hello@arapoint.com.ng" style="color:${G.link};text-decoration:none;">hello@arapoint.com.ng</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>
          </p>
          <p style="margin:0;color:#9CA3AF;font-size:10px;line-height:1.7;font-family:Arial,sans-serif;">
            &copy; ${YEAR} Arapoint Solutions. All rights reserved.<br>
            This is a transactional email from Arapoint. If you did not initiate this action or did not create an account with us,<br>
            please disregard this email or contact support@arapoint.com.ng.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function userInfoCard(items: { label: string; value: string }[]): string {
  const rows = items.map(({ label, value }) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F3F4F6;">
        <p style="margin:0;color:#9CA3AF;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${label}</p>
        <p style="margin:4px 0 0;color:#111827;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${value}</p>
      </td>
    </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:28px;overflow:hidden;">
      ${rows}
    </table>`;
}

function userNoteBox(text: string, borderColor: string, bgColor: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:${bgColor};border:1px solid ${borderColor}44;border-left:4px solid ${borderColor};border-radius:0 6px 6px 0;padding:14px 18px;">
          <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function userCTA(label: string, url: string, color = G.mid): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:${color};border-radius:6px;">
          <a href="${url}" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

export function userOtpEmail(name: string, otp: string, purpose = "email verification"): string {
  const purposeTitle = purpose.charAt(0).toUpperCase() + purpose.slice(1);
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">${purposeTitle} Code</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, please use the code below to complete your ${purpose}. This code is valid for <strong style="color:#111827;">10 minutes</strong> and can only be used once.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:${G.bg};border:2px dashed ${G.border};border-radius:10px;padding:32px 24px;">
          <p style="margin:0 0 8px;color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">Your Verification Code</p>
          <p style="margin:0;color:${G.dark};font-size:42px;font-weight:900;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</p>
        </td>
      </tr>
    </table>

    ${userNoteBox("Do not share this code with anyone. Arapoint staff will never ask for your OTP. If you did not request this code, please ignore this email — your account remains secure.", "#F59E0B", "#FFFBEB")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Need help? Contact us at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your ${purpose} code is ${otp}. It expires in 10 minutes.`,
    G.light, body
  );
}

export function userWelcomeEmail(name: string, email: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Welcome to Arapoint, ${name}</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Your account has been created successfully. You now have access to Arapoint's full suite of digital identity, verification, and government services.
    </p>

    <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Account Information</p>
    ${userInfoCard([
      { label: "Registered Email", value: email },
      { label: "Account Status", value: "Active" },
    ])}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${G.bg};border:1px solid ${G.border};border-radius:8px;margin-bottom:28px;padding:20px;">
      <tr><td>
        <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Services available to you:</p>
        ${["NIN verification, personalization and modifications", "BVN services and modifications", "CAC business name and company registration", "Educational result verification (WAEC, NECO, JAMB, NABTEB)", "Bill payments and digital utility services"].map(item =>
          `<p style="margin:0 0 6px;color:#374151;font-size:13px;font-family:Arial,sans-serif;padding-left:14px;">- ${item}</p>`
        ).join('')}
      </td></tr>
    </table>

    ${userCTA("Go to Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Questions? Our support team is available at <a href="mailto:hello@arapoint.com.ng" style="color:${G.link};text-decoration:none;">hello@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your Arapoint account is ready. Log in to get started.`,
    G.light, body
  );
}

export function userWalletFundedEmail(name: string, amount: string, balance: string, reference: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Wallet Funded Successfully</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your Arapoint wallet has been credited. The details of this transaction are provided below for your records.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:${G.bg};border:1px solid ${G.border};border-radius:10px;padding:28px 24px;">
          <p style="margin:0 0 6px;color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,sans-serif;">Amount Credited</p>
          <p style="margin:0;color:${G.dark};font-size:40px;font-weight:900;font-family:Arial,sans-serif;">${amount}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Transaction Details</p>
    ${userInfoCard([
      { label: "New Available Balance", value: balance },
      { label: "Transaction Reference", value: reference },
      { label: "Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${userCTA("View Wallet", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      If you did not authorise this transaction, contact us immediately at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your Arapoint wallet has been funded with ${amount}. New balance: ${balance}.`,
    G.light, body
  );
}

export function userServiceCompletedEmail(name: string, serviceType: string, details: string, trackingId: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Request Completed</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your <strong style="color:#111827;">${serviceType}</strong> request has been processed and completed successfully.
    </p>

    <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Request Summary</p>
    ${userInfoCard([
      { label: "Service", value: serviceType },
      { label: "Tracking ID", value: trackingId },
      { label: "Status", value: "Completed" },
      { label: "Date Completed", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${details ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:28px;padding:18px;">
      <tr><td>
        <p style="margin:0 0 6px;color:#9CA3AF;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Additional Details</p>
        <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${details}</p>
      </td></tr>
    </table>` : ""}

    ${userCTA("View in Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Thank you for choosing Arapoint. For any questions, contact <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your ${serviceType} request (${trackingId}) has been completed.`,
    G.light, body
  );
}

export function userPasswordResetEmail(name: string, otp: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Password Reset Request</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, we received a request to reset the password for your Arapoint account. Use the code below to proceed. This code expires in <strong style="color:#111827;">10 minutes</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:#FFF7ED;border:2px dashed #FED7AA;border-radius:10px;padding:32px 24px;">
          <p style="margin:0 0 8px;color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">Password Reset Code</p>
          <p style="margin:0;color:#92400E;font-size:42px;font-weight:900;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</p>
        </td>
      </tr>
    </table>

    ${userNoteBox("If you did not request a password reset, please disregard this email. Your account remains secure and no changes have been made. Do not share this code with anyone.", "#EF4444", "#FEF2F2")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      If you have security concerns, contact us immediately at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your Arapoint password reset code is ${otp}. It expires in 10 minutes.`,
    "#F59E0B", body
  );
}

export function userServiceRejectedEmail(name: string, serviceType: string, trackingId: string, reason?: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">Request Update</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, we have an update regarding your <strong style="color:#111827;">${serviceType}</strong> request. Unfortunately, we were unable to process it at this time.
    </p>

    <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Request Summary</p>
    ${userInfoCard([
      { label: "Service", value: serviceType },
      { label: "Tracking ID", value: trackingId },
      { label: "Status", value: "Unable to Process" },
      { label: "Date", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${reason
      ? userNoteBox(`<strong>Reason:</strong> ${reason}`, "#EF4444", "#FEF2F2")
      : userNoteBox("We were unable to process this request at this time. Please contact our support team for further assistance and next steps.", "#EF4444", "#FEF2F2")
    }

    ${userCTA("Contact Support", `${PLATFORM_URL}/contact`, "#EF4444")}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Our support team is ready to assist. Reach us at <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Update on your ${serviceType} request (${trackingId}).`,
    "#EF4444", body
  );
}

export function userBvnCompletedEmail(name: string, maskedBvn: string, serviceType: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;font-family:Arial,sans-serif;">BVN Service Completed</h1>
    <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
      Dear ${name}, your <strong style="color:#111827;">BVN ${serviceType}</strong> request has been processed and completed successfully.
    </p>

    <p style="margin:0 0 10px;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Service Summary</p>
    ${userInfoCard([
      { label: "BVN (Masked)", value: maskedBvn },
      { label: "Service Type", value: serviceType },
      { label: "Status", value: "Completed" },
      { label: "Date Completed", value: new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) },
    ])}

    ${userCTA("View Dashboard", `${PLATFORM_URL}/dashboard`)}

    <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      Thank you for choosing Arapoint. For questions, contact <a href="mailto:support@arapoint.com.ng" style="color:${G.link};text-decoration:none;">support@arapoint.com.ng</a>.
    </p>`;

  return userBase(
    `Your BVN ${serviceType} request has been completed successfully.`,
    G.light, body
  );
}
