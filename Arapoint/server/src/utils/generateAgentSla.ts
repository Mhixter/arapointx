import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';

const PRIMARY = rgb(0.102, 0.235, 0.369);   // #1a3c5e
const ACCENT  = rgb(0.161, 0.502, 0.725);   // #2980b9
const DARK    = rgb(0.2,   0.2,   0.2);
const GRAY    = rgb(0.5,   0.5,   0.5);
const WHITE   = rgb(1,     1,     1);
const LIGHT   = rgb(0.957, 0.965, 0.976);   // #f4f6f9
const BORDER  = rgb(0.816, 0.843, 0.886);   // #d0d7e2

export async function generateAgentSlaPdf(
  agentName: string,
  role: string,
  employeeId?: string | null,
): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  const W = PageSizes.A4[0]; // 595.28
  const H = PageSizes.A4[1]; // 841.89
  const ML = 55;
  const MR = 55;
  const TW = W - ML - MR;

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const year  = new Date().getFullYear();

  /* ── Helpers ─────────────────────────────────────────────── */
  let page = doc.addPage(PageSizes.A4);

  const newPage = () => {
    page = doc.addPage(PageSizes.A4);
    // mini header stripe on continuation pages
    page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: PRIMARY });
    page.drawText('ARAPOINT SOLUTIONS  —  Agent Service Level Agreement', {
      x: ML, y: H - 19, size: 8, font: bold, color: WHITE,
    });
    return H - 50;
  };

  let y = H;

  // wrap a block of text returning how many lines it used
  const wrapDraw = (
    text: string,
    x: number,
    startY: number,
    maxW: number,
    size: number,
    font: typeof reg,
    color = DARK,
    lineH = size * 1.45,
  ): number => {
    const words = text.split(' ');
    let line = '';
    let cy = startY;

    const flush = (l: string) => {
      if (cy < 60) { cy = newPage() - lineH; }
      page.drawText(l, { x, y: cy, size, font, color });
      cy -= lineH;
    };

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        flush(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) flush(line);
    return cy;
  };

  /* ── Page 1: Header band ──────────────────────────────────── */
  page.drawRectangle({ x: 0, y: H - 88, width: W, height: 88, color: PRIMARY });
  page.drawText('ARAPOINT SOLUTIONS', { x: ML, y: H - 38, size: 22, font: bold, color: WHITE });
  page.drawText('Digital Services Platform', { x: ML, y: H - 56, size: 10, font: reg, color: rgb(0.659, 0.784, 0.910) });
  page.drawText('SERVICE LEVEL AGREEMENT', { x: ML, y: H - 74, size: 10, font: bold, color: WHITE });

  y = H - 120;

  /* ── Title ─────────────────────────────────────────────────── */
  const titleText = 'Agent Service Level Agreement (SLA)';
  const titleW = bold.widthOfTextAtSize(titleText, 15);
  page.drawText(titleText, { x: (W - titleW) / 2, y, size: 15, font: bold, color: PRIMARY });
  y -= 22;

  const dateText = `Effective Date: ${today}`;
  const dateW = reg.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, { x: (W - dateW) / 2, y, size: 10, font: reg, color: GRAY });
  y -= 28;

  /* ── Party box ─────────────────────────────────────────────── */
  const boxH = 98;
  page.drawRectangle({ x: ML, y: y - boxH, width: TW, height: boxH, color: LIGHT, borderColor: BORDER, borderWidth: 1 });
  page.drawText('PARTIES TO THIS AGREEMENT', { x: ML + 12, y: y - 18, size: 9, font: bold, color: PRIMARY });
  const partyLines = [
    `Service Provider:   Arapoint Solutions Ltd`,
    `Agent Name:         ${agentName}`,
    `Role:               ${role}`,
    `Employee ID:        ${employeeId || 'N/A'}`,
  ];
  partyLines.forEach((l, i) => {
    page.drawText(l, { x: ML + 12, y: y - 34 - i * 16, size: 10, font: reg, color: DARK });
  });
  y -= boxH + 20;

  /* ── Section helper ─────────────────────────────────────────── */
  const section = (title: string, body: string) => {
    if (y < 120) { y = newPage(); }
    page.drawText(title, { x: ML, y, size: 11, font: bold, color: PRIMARY });
    y -= 16;
    y = wrapDraw(body, ML, y, TW, 10, reg);
    y -= 10;
  };

  const bulletList = (items: string[]) => {
    items.forEach(item => {
      if (y < 80) { y = newPage(); }
      y = wrapDraw(`•  ${item}`, ML + 8, y, TW - 8, 10, reg);
      y -= 2;
    });
    y -= 8;
  };

  /* ── Body sections ─────────────────────────────────────────── */
  section('1. Purpose',
    'This Service Level Agreement (SLA) sets out the standards, expectations, and obligations agreed between Arapoint Solutions Ltd ("Arapoint" or "the Company") and the Agent named above. By accepting your account credentials and logging in, you agree to be bound by all terms herein.');

  section('2. Scope of Service',
    'The Agent is authorised to process customer requests assigned to them through the Arapoint Agent Dashboard. The specific service categories available to the Agent are determined by their assigned role and communicated by the Administrator.');

  if (y < 120) { y = newPage(); }
  page.drawText('3. Agent Obligations', { x: ML, y, size: 11, font: bold, color: PRIMARY });
  y -= 16;
  bulletList([
    'Process all assigned requests promptly and within the turnaround times specified in Section 4.',
    'Treat all customer information as strictly confidential. No customer data may be shared with third parties.',
    'Log in to the dashboard at least once every business day and acknowledge newly assigned requests.',
    'Communicate professionally with customers and team members at all times.',
    'Report system issues, discrepancies, or suspicious activity to the Administrator immediately.',
    'Ensure that all uploaded documents and results are accurate before marking a request as complete.',
    'Not share login credentials with any other person.',
    'Comply with all applicable Nigerian laws, regulations, and Arapoint internal policies.',
  ]);

  section('4. Service Turnaround Times',
    'The following maximum turnaround times apply from the moment a request is assigned to the Agent:');
  bulletList([
    'Identity Services (NIN Validation, IPE Clearance, Personalization): 1 – 30 minutes',
    'NIN Tracking / Birth Attestation: 24 – 48 hours',
    'Education Services (O\'Level Upload, Admission Letter, JAMB Score): 1 – 24 hours',
    'CAC Registration: 5 – 10 business days',
    'Airtime to Cash (A2C): Within 2 hours of assignment',
  ]);
  y = wrapDraw('Failure to meet turnaround times without prior notification to the Administrator may result in reassignment or disciplinary action.', ML, y, TW, 10, reg);
  y -= 10;

  section('5. Performance Standards',
    'Agents are expected to maintain the following minimum performance benchmarks:');
  bulletList([
    'Request completion rate: 95% or above',
    'Customer satisfaction (where feedback is collected): 4.0 / 5.0 or above',
    'Requests escalated without justification: less than 5%',
  ]);
  y = wrapDraw('Performance is reviewed monthly. Agents falling below benchmarks for two consecutive months may have their accounts suspended pending review.', ML, y, TW, 10, reg);
  y -= 10;

  section('6. Confidentiality',
    'The Agent agrees to keep strictly confidential all information relating to Arapoint customers, business processes, pricing structures, system credentials, and any other proprietary information accessed during their duties. This obligation survives the termination of this Agreement.');

  section('7. Account Credentials & Security',
    'The login credentials issued to the Agent are personal and non-transferable. The Agent must not share their password or allow any other person to use their account. Password resets must be requested through the Administrator — agents do not have the ability to change their own passwords. Arapoint reserves the right to monitor account activity for compliance and security purposes.');

  section('8. Compensation',
    'Agent compensation, commission structures, and payment schedules will be communicated separately by the Administrator and form part of the overall engagement terms. This SLA does not independently constitute a payment agreement.');

  if (y < 120) { y = newPage(); }
  page.drawText('9. Disciplinary & Termination', { x: ML, y, size: 11, font: bold, color: PRIMARY });
  y -= 16;
  y = wrapDraw('Arapoint reserves the right to suspend or permanently deactivate the Agent account for:', ML, y, TW, 10, reg);
  y -= 4;
  bulletList([
    'Breach of confidentiality obligations',
    'Repeated failure to meet turnaround times',
    'Fraud, misrepresentation, or misconduct',
    'Sharing credentials or facilitating unauthorised access',
  ]);
  y = wrapDraw('Where a breach is remedial, the Agent will be given written notice and a reasonable opportunity to rectify the issue before termination.', ML, y, TW, 10, reg);
  y -= 10;

  section('10. Dispute Resolution',
    'Any dispute arising from this Agreement shall first be addressed through internal escalation to the Administrator. If unresolved, disputes shall be referred to mediation under the Laws of the Federal Republic of Nigeria. The parties agree to the jurisdiction of the Nigerian courts for any matter that cannot be resolved by mediation.');

  section('11. Amendments',
    'Arapoint reserves the right to update this SLA at any time. Agents will be notified of material changes via their registered email address. Continued use of the Agent Dashboard after notification constitutes acceptance of the revised terms.');

  /* ── Acknowledgement ─────────────────────────────────────── */
  if (y < 160) { y = newPage(); }
  y -= 10;
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 1, color: BORDER });
  y -= 20;

  const ackTitle = 'ACKNOWLEDGEMENT';
  const ackW = bold.widthOfTextAtSize(ackTitle, 11);
  page.drawText(ackTitle, { x: (W - ackW) / 2, y, size: 11, font: bold, color: PRIMARY });
  y -= 18;
  y = wrapDraw(
    'By logging into the Arapoint Agent Dashboard for the first time, the Agent named above acknowledges that they have read, understood, and agreed to all terms set out in this Service Level Agreement.',
    ML, y, TW, 10, reg, DARK,
  );
  y -= 24;

  const halfW = (TW - 30) / 2;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + halfW, y }, thickness: 1, color: DARK });
  page.drawLine({ start: { x: ML + halfW + 30, y }, end: { x: ML + TW, y }, thickness: 1, color: DARK });
  y -= 14;
  page.drawText('Agent Signature & Date', { x: ML, y, size: 9, font: reg, color: GRAY });
  page.drawText('For Arapoint Solutions Ltd', { x: ML + halfW + 30, y, size: 9, font: reg, color: GRAY });

  /* ── Footer on every page ────────────────────────────────── */
  const pages = doc.getPages();
  const footerText = `© ${year} Arapoint Solutions Ltd  |  support@arapoint.com.ng  |  +234 813 368 8584  |  arapoint.com.ng`;
  const footerW = reg.widthOfTextAtSize(footerText, 8);
  pages.forEach(p => {
    p.drawText(footerText, { x: (W - footerW) / 2, y: 22, size: 8, font: reg, color: GRAY });
    p.drawLine({ start: { x: ML, y: 34 }, end: { x: W - MR, y: 34 }, thickness: 0.5, color: BORDER });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
