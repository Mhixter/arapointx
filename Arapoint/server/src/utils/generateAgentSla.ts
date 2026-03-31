import PDFDocument from 'pdfkit';

export function generateAgentSlaPdf(agentName: string, role: string, employeeId?: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#1a3c5e';
    const accentColor = '#2980b9';
    const lightGray = '#f4f6f9';
    const textColor = '#333333';
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const year = new Date().getFullYear();

    // ── Header band ──
    doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('ARAPOINT SOLUTIONS', 60, 25, { align: 'left' });
    doc.fontSize(10).font('Helvetica')
      .text('Digital Services Platform', 60, 52, { align: 'left' });
    doc.fontSize(10).font('Helvetica-Bold')
      .text('SERVICE LEVEL AGREEMENT', 60, 68, { align: 'left' });

    doc.fillColor(primaryColor);
    doc.moveDown(5);

    // ── Title section ──
    doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor)
      .text('Agent Service Level Agreement (SLA)', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Effective Date: ${today}`, { align: 'center' });

    doc.moveDown(1);

    // ── Party details box ──
    const boxTop = doc.y;
    doc.rect(60, boxTop, doc.page.width - 120, 90).fill(lightGray).stroke('#d0d7e2');
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold')
      .text('PARTIES TO THIS AGREEMENT', 70, boxTop + 12);
    doc.font('Helvetica').fontSize(10)
      .text(`Service Provider:  Arapoint Solutions Ltd`, 70, boxTop + 30)
      .text(`Agent Name:        ${agentName}`, 70, boxTop + 46)
      .text(`Role:              ${role}`, 70, boxTop + 62)
      .text(`Employee ID:       ${employeeId || 'N/A'}`, 70, boxTop + 78);
    doc.y = boxTop + 100;

    doc.moveDown(1);

    // ── Section helper ──
    const section = (title: string, body: string) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
        .text(title);
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor(textColor)
        .text(body, { align: 'justify', lineGap: 3 });
      doc.moveDown(0.8);
    };

    const numberedList = (items: string[]) => {
      items.forEach((item, i) => {
        doc.fontSize(10).font('Helvetica').fillColor(textColor)
          .text(`${i + 1}.  ${item}`, { indent: 10, align: 'justify', lineGap: 2 });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.5);
    };

    // ── Sections ──
    section('1. Purpose',
      'This Service Level Agreement (SLA) sets out the standards, expectations, and obligations agreed between Arapoint Solutions Ltd ("Arapoint" or "the Company") and the Agent named above. By accepting your account credentials and logging in, you agree to be bound by all terms herein.');

    section('2. Scope of Service',
      'The Agent is authorised to process customer requests assigned to them through the Arapoint Agent Dashboard. The specific service categories available to the Agent are determined by their assigned role and will be communicated by the Administrator.');

    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor).text('3. Agent Obligations');
    doc.moveDown(0.3);
    numberedList([
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
      'The following are the maximum expected turnaround times from the moment a request is assigned to the Agent:\n\n' +
      '• Identity Services (NIN Validation, IPE Clearance, Personalization): 1 – 30 minutes\n' +
      '• NIN Tracking / Birth Attestation: 24 – 48 hours\n' +
      '• Education Services (O\'Level Upload, Admission Letter, JAMB Score): 1 – 24 hours\n' +
      '• CAC Registration: 5 – 10 business days\n' +
      '• Airtime to Cash (A2C): Within 2 hours of assignment\n\n' +
      'Failure to meet turnaround times without prior notification to the Administrator may result in reassignment or disciplinary action.');

    section('5. Performance Standards',
      'Agents are expected to maintain the following minimum performance benchmarks:\n\n' +
      '• Request completion rate: ≥ 95%\n' +
      '• Customer satisfaction (where feedback is collected): ≥ 4.0 / 5.0\n' +
      '• Requests escalated without justification: < 5%\n\n' +
      'Performance is reviewed monthly. Agents falling below the minimum benchmarks for two consecutive months may have their accounts suspended pending review.');

    section('6. Confidentiality',
      'The Agent agrees to keep strictly confidential all information relating to Arapoint customers, business processes, pricing structures, system credentials, and any other proprietary information accessed during the course of their duties. This obligation survives the termination of this Agreement.');

    section('7. Account Credentials & Security',
      'The login credentials issued to the Agent are personal and non-transferable. The Agent must not share their password or allow any other person to use their account. Password resets must be requested through the Administrator — agents do not have the ability to change their own passwords. Arapoint reserves the right to monitor account activity for compliance and security purposes.');

    section('8. Compensation',
      'Agent compensation, commission structures, and payment schedules will be communicated separately by the Administrator and form part of the overall engagement terms. This SLA does not independently constitute a payment agreement.');

    section('9. Disciplinary & Termination',
      'Arapoint reserves the right to suspend or permanently deactivate the Agent account for:\n\n' +
      '• Breach of confidentiality obligations\n' +
      '• Repeated failure to meet turnaround times\n' +
      '• Fraud, misrepresentation, or misconduct\n' +
      '• Sharing credentials or facilitating unauthorised access\n\n' +
      'Where a breach is remedial, the Agent will be given written notice and a reasonable opportunity to rectify the issue before termination.');

    section('10. Dispute Resolution',
      'Any dispute arising from this Agreement shall first be addressed through internal escalation to the Administrator. If unresolved, disputes shall be referred to mediation under the Laws of the Federal Republic of Nigeria. The parties agree to the jurisdiction of the Nigerian courts for any matter that cannot be resolved by mediation.');

    section('11. Amendments',
      'Arapoint reserves the right to update this SLA at any time. Agents will be notified of material changes via their registered email address. Continued use of the Agent Dashboard after notification constitutes acceptance of the revised terms.');

    // ── Signature block ──
    doc.moveDown(1);
    doc.rect(60, doc.y, doc.page.width - 120, 1).fill('#d0d7e2');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
      .text('ACKNOWLEDGEMENT', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor(textColor)
      .text(
        'By logging into the Arapoint Agent Dashboard for the first time, the Agent named above acknowledges that they have read, understood, and agreed to all terms set out in this Service Level Agreement.',
        { align: 'center', lineGap: 3 }
      );

    doc.moveDown(1.5);

    const sigY = doc.y;
    const leftX = 70;
    const rightX = doc.page.width / 2 + 20;
    const lineW = (doc.page.width - 140) / 2 - 20;

    doc.rect(leftX, sigY, lineW, 1).fill('#333');
    doc.rect(rightX, sigY, lineW, 1).fill('#333');

    doc.moveDown(0.4);
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text('Agent Signature & Date', leftX, doc.y)
      .text('For Arapoint Solutions Ltd', rightX, doc.y, { align: 'left' });

    // ── Footer ──
    doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
      .text(
        `© ${year} Arapoint Solutions Ltd  |  support@arapoint.com.ng  |  +234 813 368 8584  |  arapoint.com.ng`,
        60,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 120 }
      );

    doc.end();
  });
}
