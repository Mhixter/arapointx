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
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Arapoint Agent Account</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f6f9;">Your ${role} account on Arapoint has been set up. Here are your login details.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a3c5e;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">ARAPOINT</h1>
            <p style="margin:6px 0 0;color:#a8c8e8;font-size:13px;">Digital Services Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#1a3c5e;font-size:18px;">Welcome, ${name}!</h2>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              Your <strong>${role}</strong> account has been set up on the Arapoint platform. Your login details are below — please keep them in a safe place.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Full Name</span><br>
                        <span style="color:#1a1a1a;font-size:15px;font-weight:600;">${name}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Login Email</span><br>
                        <span style="color:#1a3c5e;font-size:15px;font-weight:600;">${email}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Login Code</span><br>
                        <span style="color:#1a1a1a;font-size:15px;font-weight:600;font-family:monospace;background:#eef2f7;padding:2px 8px;border-radius:4px;">${password}</span>
                      </td>
                    </tr>
                    ${employeeId ? `<tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Employee ID</span><br>
                        <span style="color:#1a1a1a;font-size:15px;font-weight:600;">${employeeId}</span>
                      </td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Role</span><br>
                        <span style="color:#1a3c5e;font-size:15px;font-weight:600;">${role}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="${loginUrl}" style="display:inline-block;background:#1a3c5e;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:600;">
                Log In to Your Dashboard
              </a>
            </div>

            <p style="margin:0;color:#999;font-size:12px;line-height:1.5;border-top:1px solid #f0f0f0;padding-top:16px;">
              <strong>Note:</strong> Your login code is managed by your administrator and cannot be changed directly. If you require a new one, contact your administrator. Your Service Level Agreement (SLA) is attached — please review it before you begin work.
            </p>
            <p style="margin:8px 0 0;color:#bbb;font-size:11px;line-height:1.5;">
              This is an official account setup notification from Arapoint Solutions. If you did not expect this email, please contact support@arapoint.com.ng.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e9ecef;">
            <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Arapoint Solutions. All rights reserved. | support@arapoint.com.ng</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New ${serviceLabel} Request</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f6f9;">A new ${serviceLabel} request (${trackingId}) has been submitted and is ready for processing.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a3c5e;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">ARAPOINT</h1>
            <p style="margin:6px 0 0;color:#a8c8e8;font-size:13px;">New Service Request Alert</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#856404;font-size:14px;font-weight:600;">New request awaiting your attention</p>
            </div>

            <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
              Hi <strong>${agentName}</strong>, a new <strong>${serviceLabel}</strong> request has been submitted and is ready for processing.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tracking ID</span><br>
                        <span style="color:#1a3c5e;font-size:15px;font-weight:700;font-family:monospace;">${trackingId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Service</span><br>
                        <span style="color:#1a1a1a;font-size:15px;font-weight:600;">${serviceLabel}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e9ecef;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Customer</span><br>
                        <span style="color:#1a1a1a;font-size:15px;font-weight:600;">${customerName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Details</span><br>
                        <span style="color:#1a1a1a;font-size:14px;">${details}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#1a3c5e;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:600;">
                View Request in Dashboard
              </a>
            </div>

            <p style="margin:0;color:#999;font-size:12px;line-height:1.5;border-top:1px solid #f0f0f0;padding-top:16px;">
              Please log in to the agent dashboard and pick up this request as soon as possible to ensure timely delivery.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e9ecef;">
            <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Arapoint Solutions. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
