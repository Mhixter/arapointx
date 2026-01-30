import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generatePdfSlip, getSlipPdf, getSlipInfo, SlipData, getSlipPositions, setSlipPositions, getDefaultPositions, SlipPositions } from '../../services/pdfSlipGenerator';
import { authMiddleware } from '../middleware/auth';
import { publicRateLimiter } from '../middleware/rateLimit';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const verifyNinSchema = z.object({
  nin: z.string().min(11).max(11),
  surname: z.string().min(1),
  firstname: z.string().min(1),
  middlename: z.string().optional(),
  date_of_birth: z.string().min(1),
  gender: z.string().optional(),
  photo: z.string().optional(),
  tracking_id: z.string().optional(),
  verification_reference: z.string().optional(),
  slip_type: z.enum(['standard', 'premium', 'long']).default('standard')
});

router.post('/verify-nin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = verifyNinSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Validation error',
        errors: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const { slip_type, ...slipData } = validation.data;

    logger.info('Generating NIN slip', {
      userId: req.userId,
      slipType: slip_type,
      nin: `${slipData.nin.slice(0, 4)}***`
    });

    const result = await generatePdfSlip({
      userId: req.userId,
      slipType: slip_type,
      data: slipData as SlipData
    });

    logger.info('NIN slip generated successfully', {
      slipReference: result.slipReference,
      userId: req.userId
    });

    res.json({
      status: 'success',
      code: 200,
      message: 'NIN slip generated successfully',
      data: {
        slip_reference: result.slipReference,
        download_url: `/api/slips/download/${result.slipReference}`,
        verification_url: result.verificationUrl,
        slip_type: slip_type
      }
    });
  } catch (error: any) {
    logger.error('Failed to generate NIN slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to generate NIN slip',
      error: error.message
    });
  }
});

router.get('/download/:reference', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Slip reference is required'
      });
    }

    logger.info('Downloading slip', { reference, userId: req.userId });

    const pdfBuffer = await getSlipPdf(reference, req.userId);

    if (!pdfBuffer) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Slip not found or you do not have permission to access it'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reference}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to download slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to download slip'
    });
  }
});

router.get('/verify/:reference', publicRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Slip reference is required'
      });
    }

    const slipInfo = await getSlipInfo(reference);

    if (!slipInfo) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Slip not found',
        data: {
          verified: false,
          reference
        }
      });
    }

    res.json({
      status: 'success',
      code: 200,
      message: 'Slip verification successful',
      data: {
        verified: slipInfo.verified,
        slip_reference: reference,
        slip_type: slipInfo.slipType,
        holder_name: `${slipInfo.firstname} ${slipInfo.surname}`,
        nin_masked: slipInfo.ninMasked,
        verification_status: slipInfo.verificationStatus,
        issued_at: slipInfo.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Failed to verify slip', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to verify slip'
    });
  }
});

router.get('/positions/:type', async (req: Request, res: Response) => {
  try {
    const slipType = req.params.type as 'standard' | 'premium' | 'long';
    if (!['standard', 'premium', 'long'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, or long'
      });
    }

    const positions = getSlipPositions(slipType);
    const defaults = getDefaultPositions()[slipType];

    res.json({
      status: 'success',
      code: 200,
      message: `Positions for ${slipType} slip`,
      data: {
        slip_type: slipType,
        current_positions: positions,
        default_positions: defaults
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to get positions',
      error: error.message
    });
  }
});

router.post('/positions/:type', authMiddleware, async (req: Request, res: Response) => {
  try {
    const slipType = req.params.type as 'standard' | 'premium' | 'long';
    if (!['standard', 'premium', 'long'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, or long'
      });
    }

    const newPositions = setSlipPositions(slipType, req.body);

    res.json({
      status: 'success',
      code: 200,
      message: `Positions updated for ${slipType} slip`,
      data: {
        slip_type: slipType,
        positions: newPositions
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to update positions',
      error: error.message
    });
  }
});

router.get('/analyzer/:type', async (req: Request, res: Response) => {
  try {
    const slipType = req.params.type as 'standard' | 'premium' | 'long';
    if (!['standard', 'premium', 'long'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, or long'
      });
    }

    const positions = getSlipPositions(slipType);
    const templatePath = path.join(process.cwd(), 'server/src/templates', `${slipType}_template-1.png`);
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: `Template image not found for ${slipType}`
      });
    }

    const imageBuffer = fs.readFileSync(templatePath);
    const templateImage = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    const analyzerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slip Position Analyzer - ${slipType}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; min-height: 100vh; }
    .container { display: flex; gap: 20px; padding: 20px; }
    .preview { flex: 1; position: relative; }
    .preview-inner { position: relative; display: inline-block; }
    .template-img { max-width: 100%; height: auto; display: block; }
    .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .controls { width: 400px; background: #16213e; padding: 20px; border-radius: 10px; max-height: 90vh; overflow-y: auto; }
    h1 { margin-bottom: 20px; color: #e94560; font-size: 20px; }
    h2 { margin: 20px 0 10px; color: #0f3460; background: #e94560; padding: 8px; border-radius: 5px; font-size: 14px; }
    .field { margin-bottom: 15px; }
    label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; }
    input { width: 100%; padding: 8px; border: 1px solid #0f3460; border-radius: 5px; background: #1a1a2e; color: #fff; font-size: 14px; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin: 5px 5px 5px 0; }
    .btn-primary { background: #e94560; color: white; }
    .btn-secondary { background: #0f3460; color: white; }
    .photo-box { position: absolute; border: 2px dashed #00ff00; background: rgba(0,255,0,0.1); }
    .text-box { position: absolute; color: #000; font-weight: bold; text-transform: uppercase; white-space: nowrap; }
    .qr-box { position: absolute; border: 2px dashed #ff00ff; background: rgba(255,0,255,0.1); }
    .tabs { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
    .tab { padding: 8px 12px; background: #0f3460; border: none; color: #fff; cursor: pointer; border-radius: 5px; font-size: 12px; }
    .tab.active { background: #e94560; }
    pre { background: #0f3460; padding: 10px; border-radius: 5px; font-size: 11px; overflow-x: auto; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="preview">
      <div class="preview-inner" id="previewContainer">
        <img src="${templateImage}" class="template-img" id="templateImg">
        <div class="overlay" id="overlay"></div>
      </div>
    </div>
    <div class="controls">
      <h1>Slip Analyzer: ${slipType.toUpperCase()}</h1>
      
      <div class="tabs">
        <button class="tab active" data-section="photo">Photo</button>
        <button class="tab" data-section="surname">Surname</button>
        <button class="tab" data-section="names">Names</button>
        <button class="tab" data-section="dob">DOB</button>
        <button class="tab" data-section="nin">NIN</button>
        <button class="tab" data-section="qr">QR</button>
        ${slipType !== 'standard' ? '<button class="tab" data-section="sex">Sex</button>' : ''}
        ${slipType === 'premium' ? '<button class="tab" data-section="issue">Issue Date</button>' : ''}
        ${slipType === 'long' ? '<button class="tab" data-section="tracking">Tracking</button>' : ''}
      </div>
      
      <div id="sections">
        <div class="section" data-section="photo">
          <h2>Photo Position</h2>
          <div class="field"><label>Top</label><input type="text" id="photo_top" value="${positions.photo_top}"></div>
          <div class="field"><label>Left</label><input type="text" id="photo_left" value="${positions.photo_left}"></div>
          <div class="field"><label>Width</label><input type="text" id="photo_width" value="${positions.photo_width}"></div>
        </div>
        
        <div class="section" data-section="surname" style="display:none">
          <h2>Surname Position</h2>
          <div class="field"><label>Top</label><input type="text" id="surname_top" value="${positions.surname_top}"></div>
          <div class="field"><label>Left</label><input type="text" id="surname_left" value="${positions.surname_left}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="surname_size" value="${positions.surname_size}"></div>
        </div>
        
        <div class="section" data-section="names" style="display:none">
          <h2>Given Names Position</h2>
          <div class="field"><label>Top</label><input type="text" id="names_top" value="${positions.names_top}"></div>
          <div class="field"><label>Left</label><input type="text" id="names_left" value="${positions.names_left}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="names_size" value="${positions.names_size}"></div>
        </div>
        
        <div class="section" data-section="dob" style="display:none">
          <h2>Date of Birth Position</h2>
          <div class="field"><label>Top</label><input type="text" id="dob_top" value="${positions.dob_top}"></div>
          <div class="field"><label>Left</label><input type="text" id="dob_left" value="${positions.dob_left}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="dob_size" value="${positions.dob_size}"></div>
        </div>
        
        <div class="section" data-section="nin" style="display:none">
          <h2>NIN Position</h2>
          <div class="field"><label>Top</label><input type="text" id="nin_top" value="${positions.nin_top}"></div>
          <div class="field"><label>Left</label><input type="text" id="nin_left" value="${positions.nin_left}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="nin_size" value="${positions.nin_size}"></div>
        </div>
        
        <div class="section" data-section="qr" style="display:none">
          <h2>QR Code Position</h2>
          <div class="field"><label>Top</label><input type="text" id="qr_top" value="${positions.qr_top}"></div>
          <div class="field"><label>Right</label><input type="text" id="qr_right" value="${positions.qr_right}"></div>
          <div class="field"><label>Width</label><input type="text" id="qr_width" value="${positions.qr_width}"></div>
        </div>
        
        ${slipType !== 'standard' ? `
        <div class="section" data-section="sex" style="display:none">
          <h2>Sex/Gender Position</h2>
          <div class="field"><label>Top</label><input type="text" id="sex_top" value="${positions.sex_top || ''}"></div>
          <div class="field"><label>Left</label><input type="text" id="sex_left" value="${positions.sex_left || ''}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="sex_size" value="${positions.sex_size || ''}"></div>
        </div>
        ` : ''}
        
        ${slipType === 'premium' ? `
        <div class="section" data-section="issue" style="display:none">
          <h2>Issue Date Position</h2>
          <div class="field"><label>Top</label><input type="text" id="issue_top" value="${positions.issue_top || ''}"></div>
          <div class="field"><label>Right</label><input type="text" id="issue_right" value="${positions.issue_right || ''}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="issue_size" value="${positions.issue_size || ''}"></div>
        </div>
        ` : ''}
        
        ${slipType === 'long' ? `
        <div class="section" data-section="tracking" style="display:none">
          <h2>Tracking ID Position</h2>
          <div class="field"><label>Top</label><input type="text" id="tracking_top" value="${positions.tracking_top || ''}"></div>
          <div class="field"><label>Left</label><input type="text" id="tracking_left" value="${positions.tracking_left || ''}"></div>
          <div class="field"><label>Font Size</label><input type="text" id="tracking_size" value="${positions.tracking_size || ''}"></div>
        </div>
        ` : ''}
      </div>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-primary" onclick="updatePreview()">Update Preview</button>
        <button class="btn btn-secondary" onclick="savePositions()">Save Positions</button>
        <button class="btn btn-secondary" onclick="copyJson()">Copy JSON</button>
      </div>
      
      <pre id="jsonOutput"></pre>
    </div>
  </div>

  <script>
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.section');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        sections.forEach(s => s.style.display = 'none');
        document.querySelector('.section[data-section="' + tab.dataset.section + '"]').style.display = 'block';
      });
    });
    
    function getPositions() {
      const positions = {};
      document.querySelectorAll('#sections input').forEach(input => {
        if (input.value) positions[input.id] = input.value;
      });
      return positions;
    }
    
    function updatePreview() {
      const overlay = document.getElementById('overlay');
      const pos = getPositions();
      let html = '<div class="photo-box" style="top:'+pos.photo_top+';left:'+pos.photo_left+';width:'+pos.photo_width+';height:auto;aspect-ratio:3/4;">PHOTO</div>';
      html += '<div class="text-box" style="top:'+pos.surname_top+';left:'+pos.surname_left+';font-size:'+pos.surname_size+';">SURNAME</div>';
      html += '<div class="text-box" style="top:'+pos.names_top+';left:'+pos.names_left+';font-size:'+pos.names_size+';">FIRSTNAME MIDDLE</div>';
      html += '<div class="text-box" style="top:'+pos.dob_top+';left:'+pos.dob_left+';font-size:'+pos.dob_size+';">01 JAN 1990</div>';
      html += '<div class="text-box" style="top:'+pos.nin_top+';left:'+pos.nin_left+';font-size:'+pos.nin_size+';">123 4567 8901</div>';
      html += '<div class="qr-box" style="top:'+pos.qr_top+';right:'+pos.qr_right+';width:'+pos.qr_width+';aspect-ratio:1;">QR</div>';
      if (pos.sex_top) html += '<div class="text-box" style="top:'+pos.sex_top+';left:'+pos.sex_left+';font-size:'+pos.sex_size+';">M</div>';
      if (pos.issue_top) html += '<div class="text-box" style="top:'+pos.issue_top+';right:'+pos.issue_right+';font-size:'+pos.issue_size+';">30 JAN 2026</div>';
      if (pos.tracking_top) html += '<div class="text-box" style="top:'+pos.tracking_top+';left:'+pos.tracking_left+';font-size:'+pos.tracking_size+';">TRK123456</div>';
      overlay.innerHTML = html;
      document.getElementById('jsonOutput').textContent = JSON.stringify(pos, null, 2);
    }
    
    async function savePositions() {
      const pos = getPositions();
      try {
        const res = await fetch('/api/slips/positions/${slipType}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pos)
        });
        const data = await res.json();
        alert(data.message || 'Saved!');
      } catch (e) {
        alert('Error saving: ' + e.message);
      }
    }
    
    function copyJson() {
      navigator.clipboard.writeText(JSON.stringify(getPositions(), null, 2));
      alert('JSON copied to clipboard!');
    }
    
    updatePreview();
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(analyzerHtml);
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to load analyzer',
      error: error.message
    });
  }
});

router.get('/verify-page/:reference', publicRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const slipInfo = await getSlipInfo(reference);

    const verifiedHtml = slipInfo ? `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Slip Verification - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, #228b22 0%, #32cd32 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .icon { font-size: 60px; margin-bottom: 15px; }
    .content { padding: 30px; }
    .field { margin-bottom: 20px; }
    .field-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .field-value { font-size: 18px; font-weight: 600; color: #333; }
    .status-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .footer { padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">✓</div>
      <h1>Verified NIN Slip</h1>
      <p>This slip has been verified</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">Holder Name</div>
        <div class="field-value">${slipInfo.firstname} ${slipInfo.surname}</div>
      </div>
      <div class="field">
        <div class="field-label">NIN (Masked)</div>
        <div class="field-value">${slipInfo.ninMasked}</div>
      </div>
      <div class="field">
        <div class="field-label">Slip Type</div>
        <div class="field-value" style="text-transform: capitalize;">${slipInfo.slipType}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="status-badge">${slipInfo.verificationStatus?.toUpperCase()}</div>
      </div>
      <div class="field">
        <div class="field-label">Reference</div>
        <div class="field-value">${reference}</div>
      </div>
    </div>
    <div class="footer">
      Verified by Arapoint Solutions | Powered by NIMC
    </div>
  </div>
</body>
</html>
    ` : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Slip Verification Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, #c41e3a 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .icon { font-size: 60px; margin-bottom: 15px; }
    .content { padding: 30px; text-align: center; }
    .message { font-size: 16px; color: #666; line-height: 1.6; }
    .footer { padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">✗</div>
      <h1>Verification Failed</h1>
    </div>
    <div class="content">
      <p class="message">
        The slip reference <strong>${reference}</strong> could not be verified.<br><br>
        This slip may be invalid, expired, or does not exist in our records.
      </p>
    </div>
    <div class="footer">
      Arapoint Solutions | Nigeria Identity Verification
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(verifiedHtml);
  } catch (error: any) {
    logger.error('Failed to render verification page', { error: error.message });
    res.status(500).send('Failed to load verification page');
  }
});

export default router;
