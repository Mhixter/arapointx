import PDFDocument from 'pdfkit';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

type ScreeningReportInput = {
  candidate: {
    fullName: string;
    reference: string;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    educationProvider?: string | null;
    decision?: string | null;
    overallScore?: number | null;
  };
  orgName?: string | null;
  generatedAt: string;
  nin?: any;
  bvn?: any;
  ninData?: any;
  bvnData?: any;
  dobMatch?: boolean;
  edu?: any;
  fraud?: { score: number; level: string; flags: string[] } | null;
};

const colors = {
  text: '#0f172a',
  muted: '#64748b',
  border: '#dbe5dd',
  panel: '#f8fafc',
  white: '#ffffff',
  green700: '#15803d',
  green600: '#16a34a',
  green500: '#22c55e',
  green100: '#dcfce7',
  green50: '#f0fdf4',
  amber700: '#a16207',
  amber100: '#fef3c7',
  amber50: '#fffbeb',
  red700: '#b91c1c',
  red100: '#fee2e2',
  red50: '#fef2f2',
};

function safeText(value: unknown, fallback = '—') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toSentenceCase(value: string | null | undefined) {
  if (!value) return '—';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toneColors(tone: Tone) {
  if (tone === 'success') return { bg: colors.green50, border: colors.green100, text: colors.green700 };
  if (tone === 'warning') return { bg: colors.amber50, border: colors.amber100, text: colors.amber700 };
  if (tone === 'danger') return { bg: colors.red50, border: colors.red100, text: colors.red700 };
  return { bg: colors.panel, border: colors.border, text: colors.text };
}

function decisionTone(decision: string | null | undefined): Tone {
  if (decision === 'PASS') return 'success';
  if (decision === 'REVIEW') return 'warning';
  if (decision === 'FAIL') return 'danger';
  return 'neutral';
}

function decisionLabel(decision: string | null | undefined) {
  if (decision === 'PASS') return 'Proceed to onboarding';
  if (decision === 'REVIEW') return 'Manual review required';
  if (decision === 'FAIL') return 'Do not proceed';
  return 'Pending decision';
}

function decisionMessage(decision: string | null | undefined) {
  if (decision === 'PASS') {
    return 'The candidate passed the critical verification checks. Identity records are aligned and no significant fraud indicators were found, subject to normal HR due diligence.';
  }
  if (decision === 'REVIEW') {
    return 'One or more verification checks need a human decision. Review the flagged items in this report and request extra documentation before moving forward.';
  }
  if (decision === 'FAIL') {
    return 'The candidate failed one or more critical checks. Significant inconsistencies or risk indicators were identified and should be escalated before any next step.';
  }
  return 'A final recommendation is not yet available because some screening steps are still pending.';
}

function riskTone(score: number | null | undefined): Tone {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

function decodeBase64Image(photo: string | undefined | null) {
  if (!photo) return null;
  try {
    const cleaned = photo.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    return Buffer.from(cleaned, 'base64');
  } catch {
    return null;
  }
}

export function buildScreeningReportPdf(input: ScreeningReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      info: {
        Title: `${input.candidate.reference} Screening Report`,
        Author: 'Arapoint',
        Subject: 'Employment screening report',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = () => doc.page.margins.left;
    const right = () => doc.page.width - doc.page.margins.right;
    const width = () => right() - left();
    const top = () => doc.page.margins.top;
    const footerTop = () => doc.page.height - 54;
    const bottom = () => footerTop() - 14;
    let cursorY = top();

    const drawFooter = () => {
      const y = footerTop();
      doc.save();
      doc.moveTo(left(), y - 12).lineTo(right(), y - 12).lineWidth(1).strokeColor(colors.border).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.muted).text('Arapoint Employment Screening Platform', left(), y, {
        width: 220,
      });
      doc.font('Helvetica').fontSize(8.5).fillColor(colors.muted).text(`Reference ${input.candidate.reference}`, left(), y + 11, {
        width: 220,
      });
      doc.text('Confidential · For authorised HR use only', right() - 210, y + 5, {
        width: 210,
        align: 'right',
      });
      doc.restore();
    };

    const resetCursor = (y = top()) => {
      cursorY = y;
      doc.y = y;
    };

    const ensureSpace = (needed = 40) => {
      if (cursorY + needed <= bottom()) return;
      doc.addPage();
    };

    doc.on('pageAdded', () => {
      drawFooter();
      resetCursor();
    });

    const drawPill = (x: number, y: number, text: string, tone: Tone, maxWidth = 150) => {
      const palette = toneColors(tone);
      doc.font('Helvetica-Bold').fontSize(9);
      const textWidth = Math.min(doc.widthOfString(text) + 18, maxWidth);
      doc.save();
      doc.roundedRect(x, y, textWidth, 18, 9).fillAndStroke(palette.bg, palette.border);
      doc.restore();
      doc.fillColor(palette.text).text(text, x, y + 5, { width: textWidth, align: 'center' });
    };

    const drawSectionTitle = (title: string, badge?: { text: string; tone: Tone }) => {
      ensureSpace(34);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.text).text(title, left(), cursorY);
      if (badge) {
        drawPill(right() - 140, cursorY - 1, badge.text, badge.tone, 140);
      }
      cursorY += 17;
      doc.moveTo(left(), cursorY).lineTo(right(), cursorY).lineWidth(1).strokeColor(colors.border).stroke();
      cursorY += 12;
    };

    const drawMessageBox = (title: string, body: string, tone: Tone) => {
      doc.font('Helvetica-Bold').fontSize(11);
      const titleHeight = doc.heightOfString(title, { width: width() - 30 });
      doc.font('Helvetica').fontSize(10.5);
      const bodyHeight = doc.heightOfString(body, { width: width() - 30, lineGap: 2 });
      const boxHeight = titleHeight + bodyHeight + 24;
      const palette = toneColors(tone);
      ensureSpace(boxHeight + 4);
      doc.save();
      doc.roundedRect(left(), cursorY, width(), boxHeight, 12).fillAndStroke(palette.bg, palette.border);
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(11).fillColor(palette.text).text(title, left() + 14, cursorY + 12, {
        width: width() - 28,
      });
      doc.font('Helvetica').fontSize(10.5).fillColor(colors.text).text(body, left() + 14, cursorY + 12 + titleHeight + 4, {
        width: width() - 28,
        lineGap: 2,
      });
      cursorY += boxHeight + 12;
    };

    const drawFieldGrid = (fields: Array<{ label: string; value: string }>, columns = 2) => {
      if (!fields.length) return;
      const gap = 12;
      const cardWidth = (width() - gap * (columns - 1)) / columns;
      let index = 0;
      while (index < fields.length) {
        const row = fields.slice(index, index + columns);
        const heights = row.map((field) => {
          doc.font('Helvetica-Bold').fontSize(9);
          const labelHeight = doc.heightOfString(field.label.toUpperCase(), { width: cardWidth - 24 });
          doc.font('Helvetica').fontSize(10.5);
          const valueHeight = doc.heightOfString(field.value, { width: cardWidth - 24, lineGap: 2 });
          return labelHeight + valueHeight + 28;
        });
        const rowHeight = Math.max(...heights);
        ensureSpace(rowHeight + 8);
        row.forEach((field, offset) => {
          const x = left() + offset * (cardWidth + gap);
          doc.save();
          doc.roundedRect(x, cursorY, cardWidth, rowHeight, 12).fillAndStroke(colors.panel, colors.border);
          doc.restore();
          doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.muted).text(field.label.toUpperCase(), x + 12, cursorY + 12, {
            width: cardWidth - 24,
          });
          doc.font('Helvetica').fontSize(10.5).fillColor(colors.text).text(field.value, x + 12, cursorY + 25, {
            width: cardWidth - 24,
            lineGap: 2,
          });
        });
        cursorY += rowHeight + 10;
        index += columns;
      }
    };

    const drawSummaryCards = (cards: Array<{ label: string; value: string; tone: Tone }>) => {
      const gap = 12;
      const columns = 3;
      const cardWidth = (width() - gap * (columns - 1)) / columns;
      const cardHeight = 54;
      cards.forEach((card, index) => {
        if (index % columns === 0) ensureSpace(cardHeight + 8);
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = left() + col * (cardWidth + gap);
        const y = cursorY + row * (cardHeight + gap);
        const palette = toneColors(card.tone);
        doc.save();
        doc.roundedRect(x, y, cardWidth, cardHeight, 12).fillAndStroke(palette.bg, palette.border);
        doc.restore();
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(colors.muted).text(card.label.toUpperCase(), x + 12, y + 10, {
          width: cardWidth - 24,
        });
        doc.font('Helvetica-Bold').fontSize(12).fillColor(palette.text).text(card.value, x + 12, y + 25, {
          width: cardWidth - 24,
        });
      });
      cursorY += Math.ceil(cards.length / 3) * (cardHeight + gap);
    };

    const drawTable = (
      headers: string[],
      rows: Array<{ cells: string[]; tones?: Tone[] }>,
      columnRatios: number[],
    ) => {
      if (!rows.length) return;
      const tableWidth = width();
      const totalRatio = columnRatios.reduce((sum, value) => sum + value, 0);
      const columnWidths = columnRatios.map((ratio) => (tableWidth * ratio) / totalRatio);
      const paddingX = 10;
      const paddingY = 8;

      ensureSpace(28);
      doc.save();
      doc.roundedRect(left(), cursorY, tableWidth, 28, 10).fillAndStroke(colors.panel, colors.border);
      doc.restore();
      let x = left();
      headers.forEach((header, index) => {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.muted).text(header, x + paddingX, cursorY + 9, {
          width: columnWidths[index] - paddingX * 2,
        });
        x += columnWidths[index];
      });
      cursorY += 28;

      rows.forEach((row, rowIndex) => {
        const heights = row.cells.map((cell, index) => {
          doc.font('Helvetica').fontSize(10);
          return doc.heightOfString(cell, { width: columnWidths[index] - paddingX * 2, lineGap: 1.5 });
        });
        const rowHeight = Math.max(...heights, 14) + paddingY * 2;
        ensureSpace(rowHeight + 2);
        doc.save();
        doc.roundedRect(left(), cursorY, tableWidth, rowHeight, 10).fillAndStroke(colors.white, colors.border);
        doc.restore();
        let columnX = left();
        row.cells.forEach((cell, index) => {
          const tone = row.tones?.[index] ?? 'neutral';
          const palette = toneColors(tone);
          doc.font(index === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(index === 1 ? palette.text : colors.text).text(
            cell,
            columnX + paddingX,
            cursorY + paddingY,
            {
              width: columnWidths[index] - paddingX * 2,
              lineGap: 1.5,
            },
          );
          columnX += columnWidths[index];
        });
        cursorY += rowHeight + (rowIndex === rows.length - 1 ? 0 : 6);
      });
      cursorY += 12;
    };

    const drawRiskBar = (score: number) => {
      const tone = riskTone(score);
      const palette = toneColors(tone);
      const barY = cursorY + 42;
      doc.save();
      doc.roundedRect(left(), cursorY, width(), 86, 14).fillAndStroke(palette.bg, palette.border);
      doc.restore();
      doc.save();
      doc.roundedRect(left() + 16, cursorY + 16, 72, 54, 12).fillAndStroke(colors.white, palette.border);
      doc.restore();
      doc.font('Helvetica-Bold').fontSize(24).fillColor(palette.text).text(`${score}%`, left() + 16, cursorY + 26, {
        width: 72,
        align: 'center',
      });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.muted).text('Risk score', left() + 16, cursorY + 54, {
        width: 72,
        align: 'center',
      });
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.text).text('Fraud checks overview', left() + 104, cursorY + 18);
      doc.font('Helvetica').fontSize(10).fillColor(colors.muted).text('Higher scores indicate more consistent records and fewer detected risk signals.', left() + 104, cursorY + 34, {
        width: width() - 120,
        lineGap: 2,
      });
      doc.save();
      doc.roundedRect(left() + 104, barY, width() - 120, 10, 5).fill(colors.white).stroke(colors.border);
      doc.roundedRect(left() + 104, barY, ((width() - 120) * Math.max(0, Math.min(score, 100))) / 100, 10, 5).fill(palette.text);
      doc.restore();
      cursorY += 100;
    };

    const drawPhotoStrip = (photos: Array<{ label: string; photo?: string | null }>) => {
      const available = photos
        .map((item) => ({ ...item, image: decodeBase64Image(item.photo) }))
        .filter((item) => item.image);
      if (!available.length) return;
      const cardWidth = 96;
      const cardHeight = 126;
      const gap = 14;
      ensureSpace(cardHeight + 10);
      available.forEach((photo, index) => {
        const x = left() + index * (cardWidth + gap);
        doc.save();
        doc.roundedRect(x, cursorY, cardWidth, cardHeight, 12).fillAndStroke(colors.white, colors.border);
        doc.restore();
        try {
          doc.image(photo.image, x + 10, cursorY + 10, {
            width: cardWidth - 20,
            height: 88,
            fit: [cardWidth - 20, 88],
            align: 'center',
            valign: 'center',
          });
        } catch {}
        doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.muted).text(photo.label, x + 8, cursorY + 104, {
          width: cardWidth - 16,
          align: 'center',
        });
      });
      cursorY += cardHeight + 12;
    };

    drawFooter();

    const headerGradient = typeof doc.linearGradient === 'function'
      ? doc.linearGradient(0, 0, doc.page.width, 0).stop(0, colors.green700).stop(0.55, colors.green600).stop(1, colors.green500)
      : colors.green600;
    const headerHeight = 128;
    doc.rect(0, 0, doc.page.width, headerHeight).fill(headerGradient as any);
    doc.fillColor('#d1fae5').font('Helvetica-Bold').fontSize(10).text('ARAPOINT EMPLOYMENT SCREENING', left(), 24, {
      characterSpacing: 1.1,
    });
    doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(24).text(safeText(input.candidate.fullName, 'Candidate report'), left(), 42, {
      width: width() - 180,
    });
    doc.font('Helvetica').fontSize(10.5).fillColor('#ecfdf5').text(
      `${safeText(input.candidate.reference)} • ${safeText(input.candidate.position, 'Position N/A')}`,
      left(),
      76,
      { width: width() - 180 },
    );
    doc.text(`Generated ${safeText(input.generatedAt)}`, left(), 94, { width: width() - 180 });
    doc.save();
    doc.roundedRect(right() - 138, 22, 138, 82, 16).fillOpacity(0.16).fill(colors.white);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#dcfce7').text('Organisation', right() - 122, 34, { width: 106 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.white).text(safeText(input.orgName, 'N/A'), right() - 122, 48, {
      width: 106,
      align: 'right',
    });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.white).text(
      input.candidate.overallScore !== null && input.candidate.overallScore !== undefined ? `${input.candidate.overallScore}%` : '—',
      right() - 122,
      68,
      { width: 106, align: 'right' },
    );
    drawPill(right() - 126, 88, safeText(input.candidate.decision, 'Pending'), decisionTone(input.candidate.decision), 126);

    resetCursor(headerHeight + 18);

    drawSummaryCards([
      { label: 'NIN check', value: input.nin?.success ? 'Verified' : 'Failed', tone: input.nin?.success ? 'success' : 'danger' },
      { label: 'BVN check', value: input.bvn?.success ? 'Verified' : 'Failed', tone: input.bvn?.success ? 'success' : 'danger' },
      {
        label: 'DOB match',
        value: input.ninData && input.bvnData ? (input.dobMatch ? 'Matched' : 'Mismatch') : 'Unavailable',
        tone: input.ninData && input.bvnData ? (input.dobMatch ? 'success' : 'danger') : 'neutral',
      },
      {
        label: 'Education',
        value: input.edu ? (input.edu.manualReview && input.edu.reviewStatus !== 'completed' ? 'Manual review' : input.edu.found ? 'Verified' : 'Not found') : 'Not requested',
        tone: input.edu ? (input.edu.manualReview && input.edu.reviewStatus !== 'completed' ? 'warning' : input.edu.found ? 'success' : 'danger') : 'neutral',
      },
      {
        label: 'Risk score',
        value: input.fraud ? `${input.fraud.score}% ${safeText(input.fraud.level)}` : 'Unavailable',
        tone: input.fraud ? riskTone(input.fraud.score) : 'neutral',
      },
    ]);

    drawSectionTitle('Candidate information');
    drawFieldGrid([
      { label: 'Candidate name', value: safeText(input.candidate.fullName) },
      { label: 'Reference', value: safeText(input.candidate.reference) },
      { label: 'Position', value: safeText(input.candidate.position, 'Position N/A') },
      { label: 'Email', value: safeText(input.candidate.email) },
      { label: 'Phone', value: safeText(input.candidate.phone) },
      { label: 'Current status', value: toSentenceCase(input.candidate.status) },
      { label: 'Decision', value: safeText(input.candidate.decision, 'Pending') },
      {
        label: 'Overall score',
        value: input.candidate.overallScore !== null && input.candidate.overallScore !== undefined ? `${input.candidate.overallScore}%` : '—',
      },
    ]);

    drawSectionTitle('Identity verification', {
      text: input.nin?.success && input.bvn?.success ? 'Verified' : 'Issues found',
      tone: input.nin?.success && input.bvn?.success ? 'success' : 'danger',
    });
    drawPhotoStrip([
      { label: 'NIN photo', photo: input.ninData?.photo },
      { label: 'BVN photo', photo: input.bvnData?.photo },
    ]);
    drawTable(
      ['Check', 'Result', 'Details'],
      [
        {
          cells: ['NIN verification', input.nin?.success ? 'Verified' : 'Failed', input.ninData ? safeText([input.ninData.firstName, input.ninData.lastName].filter(Boolean).join(' ')) : 'No NIN data available'],
          tones: ['neutral', input.nin?.success ? 'success' : 'danger', 'neutral'],
        },
        {
          cells: ['BVN verification', input.bvn?.success ? 'Verified' : 'Failed', input.bvnData ? safeText([input.bvnData.firstName, input.bvnData.lastName].filter(Boolean).join(' ')) : 'No BVN data available'],
          tones: ['neutral', input.bvn?.success ? 'success' : 'danger', 'neutral'],
        },
        ...(input.ninData && input.bvnData
          ? [{
              cells: ['Date of birth match', input.dobMatch ? 'Matched' : 'Mismatch', `${safeText(input.ninData.dateOfBirth)} (NIN) / ${safeText(input.bvnData.dateOfBirth)} (BVN)`],
              tones: ['neutral', input.dobMatch ? 'success' : 'danger', 'neutral'] as Tone[],
            }]
          : []),
      ],
      [1.45, 1.1, 2.35],
    );
    if (input.ninData || input.bvnData) {
      const source = input.ninData || input.bvnData;
      drawFieldGrid([
        { label: 'Full name', value: safeText([source?.firstName, source?.middleName, source?.lastName].filter(Boolean).join(' ')) },
        { label: 'Date of birth', value: safeText(source?.dateOfBirth) },
        { label: 'Gender', value: safeText(source?.gender) },
        { label: 'State of origin', value: safeText(source?.state) },
        { label: 'LGA', value: safeText(source?.lga) },
        { label: 'Phone', value: safeText(source?.phone) },
      ], 3);
    } else {
      drawMessageBox('Identity data unavailable', 'Identity verification results have not been returned for this candidate yet.', 'neutral');
    }

    drawSectionTitle('Education verification', {
      text: input.edu ? (input.edu.manualReview && input.edu.reviewStatus !== 'completed' ? 'Manual review' : input.edu.found ? 'Verified' : 'Not found') : 'Not requested',
      tone: input.edu ? (input.edu.manualReview && input.edu.reviewStatus !== 'completed' ? 'warning' : input.edu.found ? 'success' : 'danger') : 'neutral',
    });
    if (!input.edu) {
      drawMessageBox('No education verification data', 'This screening report does not include an education result for the candidate.', 'neutral');
    } else if (input.edu.manualReview && input.edu.reviewStatus !== 'completed') {
      drawMessageBox(
        'Awaiting manual review',
        safeText(input.edu.failureReason, 'Education verification has been escalated for manual review. The team should review the institution response before making a hiring decision.'),
        'warning',
      );
    } else {
      drawFieldGrid([
        { label: 'Provider', value: safeText(input.candidate.educationProvider, 'Not specified') },
        { label: 'Record found', value: input.edu.found ? 'Yes' : 'No' },
        { label: 'Name match', value: input.edu.nameMatch === undefined ? 'Unavailable' : input.edu.nameMatch ? 'Matched' : 'Mismatch' },
        { label: 'Name on record', value: safeText(input.edu.candidateName) },
      ]);
      const subjectRows = Array.isArray(input.edu.subjects)
        ? input.edu.subjects
            .filter((subject: any) => subject?.subject || subject?.grade)
            .map((subject: any, index: number) => ({
              cells: [String(index + 1), safeText(subject.subject), safeText(subject.grade)],
              tones: ['neutral', 'neutral', 'neutral'] as Tone[],
            }))
        : [];
      if (subjectRows.length) {
        drawTable(['#', 'Subject', 'Grade'], subjectRows, [0.55, 2.7, 1]);
      }
      const reviewedGradeRows = input.edu.subjectGrades && typeof input.edu.subjectGrades === 'object'
        ? Object.entries(input.edu.subjectGrades).map(([subject, grade], index) => ({
            cells: [String(index + 1), safeText(subject), safeText(grade)],
            tones: ['neutral', 'neutral', 'neutral'] as Tone[],
          }))
        : [];
      if (!subjectRows.length && reviewedGradeRows.length) {
        drawTable(['#', 'Subject', 'Grade'], reviewedGradeRows, [0.55, 2.7, 1]);
      }
      if (!subjectRows.length && !reviewedGradeRows.length && !input.edu.found) {
        drawMessageBox('No education record found', 'The education provider did not return a matching record for the submitted candidate details.', 'danger');
      }
    }

    drawSectionTitle('Fraud checks', {
      text: input.fraud ? safeText(input.fraud.level) : 'Unavailable',
      tone: input.fraud ? riskTone(input.fraud.score) : 'neutral',
    });
    if (!input.fraud) {
      drawMessageBox('Fraud analysis unavailable', 'Fraud scoring could not be generated because the required identity results are incomplete.', 'neutral');
    } else {
      drawRiskBar(input.fraud.score);
      if (input.fraud.flags.length) {
        input.fraud.flags.forEach((flag) => drawMessageBox('Risk flag', safeText(flag), 'warning'));
      } else {
        drawMessageBox('No significant risk indicators', 'No major fraud flags were detected from the available screening data.', 'success');
      }
    }

    drawSectionTitle('Recommendations', {
      text: decisionLabel(input.candidate.decision),
      tone: decisionTone(input.candidate.decision),
    });
    drawMessageBox(decisionLabel(input.candidate.decision), decisionMessage(input.candidate.decision), decisionTone(input.candidate.decision));

    doc.end();
  });
}
