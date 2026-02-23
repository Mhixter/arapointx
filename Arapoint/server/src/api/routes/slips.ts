import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generatePdfSlip, getSlipPdf, getSlipInfo, SlipData, getSlipPositions, setSlipPositions, getDefaultPositions, SlipPositions, getSlipSettings, setSlipSettings, SlipSettings } from '../../services/pdfSlipGenerator';
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
    const slipType = req.params.type as 'standard' | 'premium' | 'long' | 'full_info';
    if (!['standard', 'premium', 'long', 'full_info'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, long, or full_info'
      });
    }

    const settings = getSlipSettings(slipType);
    const defaults = getDefaultPositions()[slipType];

    res.json({
      status: 'success',
      code: 200,
      message: `Settings for ${slipType} slip`,
      data: {
        slip_type: slipType,
        current_positions: settings.positions,
        default_positions: defaults,
        hidden_fields: settings.hidden_fields,
        field_configs: settings.field_configs,
        global_font_family: settings.global_font_family,
        global_font_weight: settings.global_font_weight,
        global_color: settings.global_color,
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

router.post('/positions/:type', async (req: Request, res: Response) => {
  try {
    const slipType = req.params.type as 'standard' | 'premium' | 'long' | 'full_info';
    if (!['standard', 'premium', 'long', 'full_info'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, long, or full_info'
      });
    }

    const { hidden_fields, field_configs, global_font_family, global_font_weight, global_color, ...positions } = req.body;

    const newSettings = setSlipSettings(slipType, {
      positions: Object.keys(positions).length > 0 ? positions : undefined,
      hidden_fields,
      field_configs,
      global_font_family,
      global_font_weight,
      global_color,
    });

    res.json({
      status: 'success',
      code: 200,
      message: `Settings updated for ${slipType} slip`,
      data: {
        slip_type: slipType,
        settings: newSettings
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

router.get('/analyzer/:type', async (req: Request, res: Response) => {
  try {
    const slipType = req.params.type as 'standard' | 'premium' | 'long' | 'full_info';
    if (!['standard', 'premium', 'long', 'full_info'].includes(slipType)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid slip type. Must be standard, premium, long, or full_info'
      });
    }

    const settings = getSlipSettings(slipType);
    const positions = settings.positions;
    const templateFileName = slipType === 'full_info' ? 'full_info_template.png' : `${slipType}_template-1.png`;
    const templatePath = path.join(process.cwd(), 'server/src/templates', templateFileName);
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: `Template image not found for ${slipType}`
      });
    }

    const imageBuffer = fs.readFileSync(templatePath);
    const templateImage = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    const hiddenFieldsJson = JSON.stringify(settings.hidden_fields || []);
    const fieldConfigsJson = JSON.stringify(settings.field_configs || {});

    const allFieldDefs: {key: string; label: string; condition: boolean; posFields: {id: string; label: string}[]; isImage?: boolean}[] = [
      { key: 'photo', label: 'Photo', condition: true, posFields: [{id:'photo_top',label:'Top'},{id:'photo_left',label:'Left'},{id:'photo_width',label:'Width'}], isImage: true },
      { key: 'surname', label: 'Surname', condition: true, posFields: [{id:'surname_top',label:'Top'},{id:'surname_left',label:'Left'},{id:'surname_size',label:'Font Size'}] },
      { key: 'names', label: 'Given Names', condition: true, posFields: [{id:'names_top',label:'Top'},{id:'names_left',label:'Left'},{id:'names_size',label:'Font Size'}] },
      { key: 'dob', label: 'Date of Birth', condition: true, posFields: [{id:'dob_top',label:'Top'},{id:'dob_left',label:'Left'},{id:'dob_size',label:'Font Size'}] },
      { key: 'nin', label: 'NIN', condition: true, posFields: [{id:'nin_top',label:'Top'},{id:'nin_left',label:'Left'},{id:'nin_size',label:'Font Size'}] },
      { key: 'qr_code', label: 'QR Code', condition: true, posFields: [{id:'qr_top',label:'Top'},{id:'qr_right',label:'Right'},{id:'qr_width',label:'Width'}], isImage: true },
      { key: 'sex', label: 'Sex/Gender', condition: slipType !== 'standard', posFields: [{id:'sex_top',label:'Top'},{id:'sex_left',label:'Left'},{id:'sex_size',label:'Font Size'}] },
      { key: 'issue_date', label: 'Issue Date', condition: slipType === 'premium' || slipType === 'full_info', posFields: [{id:'issue_top',label:'Top'},{id: slipType === 'premium' ? 'issue_right' : 'issue_left',label: slipType === 'premium' ? 'Right' : 'Left'},{id:'issue_size',label:'Font Size'}] },
      { key: 'tracking_id', label: 'Tracking ID', condition: slipType === 'long' || slipType === 'full_info', posFields: [{id:'tracking_top',label:'Top'},{id:'tracking_left',label:'Left'},{id:'tracking_size',label:'Font Size'}] },
      { key: 'address', label: 'Address', condition: slipType === 'long' || slipType === 'full_info', posFields: [{id:'address_top',label:'Top'},{id:'address_left',label:'Left'},{id:'address_size',label:'Font Size'}] },
      { key: 'phone', label: 'Phone', condition: slipType === 'full_info', posFields: [{id:'phone_top',label:'Top'},{id:'phone_left',label:'Left'},{id:'phone_size',label:'Font Size'}] },
      { key: 'state', label: 'State', condition: slipType === 'full_info', posFields: [{id:'state_top',label:'Top'},{id:'state_left',label:'Left'},{id:'state_size',label:'Font Size'}] },
      { key: 'lga', label: 'LGA', condition: slipType === 'full_info', posFields: [{id:'lga_top',label:'Top'},{id:'lga_left',label:'Left'},{id:'lga_size',label:'Font Size'}] },
      { key: 'birth_state', label: 'Birth State', condition: slipType === 'full_info', posFields: [{id:'birth_state_top',label:'Top'},{id:'birth_state_left',label:'Left'},{id:'birth_state_size',label:'Font Size'}] },
      { key: 'birth_lga', label: 'Birth LGA', condition: slipType === 'full_info', posFields: [{id:'birth_lga_top',label:'Top'},{id:'birth_lga_left',label:'Left'},{id:'birth_lga_size',label:'Font Size'}] },
      { key: 'nationality', label: 'Nationality', condition: slipType === 'full_info', posFields: [{id:'nationality_top',label:'Top'},{id:'nationality_left',label:'Left'},{id:'nationality_size',label:'Font Size'}] },
    ];

    const activeFields = allFieldDefs.filter(f => f.condition);

    const tabsHtml = activeFields.map((f, i) =>
      `<button class="tab ${i===0?'active':''}" data-section="${f.key}">${f.label}</button>`
    ).join('\n');

    const sectionsHtml = activeFields.map((f, i) => {
      const posInputs = f.posFields.map(pf =>
        `<div class="field"><label>${pf.label}</label><input type="text" id="${pf.id}" value="${(positions as any)[pf.id] || ''}"></div>`
      ).join('\n');

      const fontControls = f.isImage ? '' : `
          <h3 style="margin:15px 0 8px;color:#e94560;font-size:13px;">Font Style (per field)</h3>
          <div class="field"><label>Font Family</label>
            <select id="fc_${f.key}_font_family" class="select-input">
              <option value="">Use Global</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Arial Black', sans-serif">Arial Black</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Georgia', serif">Georgia</option>
              <option value="'Verdana', sans-serif">Verdana</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="'Impact', sans-serif">Impact</option>
            </select>
          </div>
          <div class="field"><label>Font Weight</label>
            <select id="fc_${f.key}_font_weight" class="select-input">
              <option value="">Use Global</option>
              <option value="400">Normal (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="900">Black (900)</option>
            </select>
          </div>
          <div class="field"><label>Font Style</label>
            <select id="fc_${f.key}_font_style" class="select-input">
              <option value="">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </div>
          <div class="field"><label>Color</label><input type="color" id="fc_${f.key}_color" value="#000000" style="height:35px;"></div>
          <div class="field"><label>Letter Spacing</label><input type="text" id="fc_${f.key}_letter_spacing" value="" placeholder="e.g. 2px"></div>`;

      return `<div class="section" data-section="${f.key}" style="${i>0?'display:none':''}">
          <h2>${f.label}</h2>
          <div class="toggle-row">
            <label class="toggle-label">Show on Slip</label>
            <label class="switch">
              <input type="checkbox" id="toggle_${f.key}" checked onchange="toggleField('${f.key}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
          ${posInputs}
          ${fontControls}
        </div>`;
    }).join('\n');

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
    .preview { flex: 1; position: relative; overflow: auto; }
    .preview-inner { position: relative; display: inline-block; width: ${slipType === 'full_info' ? '1162px' : '1267px'}; height: ${slipType === 'full_info' ? '1758px' : '1652px'}; }
    .template-img { width: ${slipType === 'full_info' ? '1162px' : '1267px'}; height: ${slipType === 'full_info' ? '1758px' : '1652px'}; display: block; }
    .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .controls { width: 420px; background: #16213e; padding: 20px; border-radius: 10px; max-height: 90vh; overflow-y: auto; }
    h1 { margin-bottom: 15px; color: #e94560; font-size: 20px; }
    h2 { margin: 15px 0 10px; color: #fff; background: #e94560; padding: 8px 12px; border-radius: 5px; font-size: 14px; }
    h3 { color: #e94560; }
    .field { margin-bottom: 12px; }
    label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; }
    input[type="text"], input[type="color"] { width: 100%; padding: 8px; border: 1px solid #0f3460; border-radius: 5px; background: #1a1a2e; color: #fff; font-size: 14px; }
    .select-input { width: 100%; padding: 8px; border: 1px solid #0f3460; border-radius: 5px; background: #1a1a2e; color: #fff; font-size: 13px; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin: 5px 5px 5px 0; }
    .btn-primary { background: #e94560; color: white; }
    .btn-secondary { background: #0f3460; color: white; }
    .btn-success { background: #2e7d32; color: white; }
    .photo-box { position: absolute; border: 2px dashed #00ff00; background: rgba(0,255,0,0.1); display: flex; align-items: center; justify-content: center; color: #00ff00; font-weight: bold; }
    .text-box { position: absolute; color: #000; font-weight: bold; text-transform: uppercase; white-space: nowrap; }
    .text-box.hidden { opacity: 0.15; text-decoration: line-through; }
    .qr-box { position: absolute; border: 2px dashed #ff00ff; background: rgba(255,0,255,0.1); display: flex; align-items: center; justify-content: center; color: #ff00ff; font-weight: bold; }
    .tabs { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
    .tab { padding: 8px 12px; background: #0f3460; border: none; color: #fff; cursor: pointer; border-radius: 5px; font-size: 12px; }
    .tab.active { background: #e94560; }
    .tab.disabled { opacity: 0.4; text-decoration: line-through; }
    pre { background: #0f3460; padding: 10px; border-radius: 5px; font-size: 11px; overflow-x: auto; margin-top: 15px; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 8px; background: #0f3460; border-radius: 5px; }
    .toggle-label { font-size: 13px; color: #fff; margin: 0; }
    .switch { position: relative; display: inline-block; width: 48px; height: 26px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .3s; border-radius: 26px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #4caf50; }
    input:checked + .slider:before { transform: translateX(22px); }
    .global-section { background: #0f3460; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .global-section h2 { margin-top: 0; background: #2e7d32; }
    .status-msg { padding: 8px 12px; border-radius: 5px; margin-top: 10px; font-size: 13px; display: none; }
    .status-msg.success { display: block; background: #1b5e20; color: #a5d6a7; }
    .status-msg.error { display: block; background: #b71c1c; color: #ef9a9a; }
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
      
      <div class="global-section">
        <h2>Global Font Settings</h2>
        <div class="field"><label>Default Font Family</label>
          <select id="global_font_family" class="select-input">
            <option value="'Roboto', Arial, sans-serif">Roboto</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Arial Black', sans-serif">Arial Black</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Georgia', serif">Georgia</option>
            <option value="'Verdana', sans-serif">Verdana</option>
          </select>
        </div>
        <div class="field"><label>Default Font Weight</label>
          <select id="global_font_weight" class="select-input">
            <option value="400">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi-Bold (600)</option>
            <option value="700" selected>Bold (700)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>
        <div class="field"><label>Default Color</label><input type="color" id="global_color" value="#000000" style="height:35px;"></div>
      </div>

      <div class="tabs">
        ${tabsHtml}
      </div>
      
      <div id="sections">
        ${sectionsHtml}
      </div>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-primary" onclick="updatePreview()">Update Preview</button>
        <button class="btn btn-success" onclick="saveAll()">Save All Settings</button>
        <button class="btn btn-secondary" onclick="copyJson()">Copy JSON</button>
      </div>
      
      <div id="statusMsg" class="status-msg"></div>
      <pre id="jsonOutput"></pre>
    </div>
  </div>

  <script>
    let hiddenFields = ${hiddenFieldsJson};
    let fieldConfigs = ${fieldConfigsJson};

    (function initGlobals() {
      const gf = '${settings.global_font_family || "'Roboto', Arial, sans-serif"}';
      const gw = '${settings.global_font_weight || "700"}';
      const gc = '${settings.global_color || "#000000"}';
      document.getElementById('global_font_family').value = gf;
      document.getElementById('global_font_weight').value = gw;
      document.getElementById('global_color').value = gc;
    })();

    (function initToggles() {
      hiddenFields.forEach(function(f) {
        var cb = document.getElementById('toggle_' + f);
        if (cb) { cb.checked = false; }
        var tab = document.querySelector('.tab[data-section="' + f + '"]');
        if (tab) tab.classList.add('disabled');
      });
    })();

    (function initFieldConfigs() {
      for (var key in fieldConfigs) {
        var cfg = fieldConfigs[key];
        if (cfg.font_family) { var el = document.getElementById('fc_'+key+'_font_family'); if(el) el.value = cfg.font_family; }
        if (cfg.font_weight) { var el = document.getElementById('fc_'+key+'_font_weight'); if(el) el.value = cfg.font_weight; }
        if (cfg.font_style) { var el = document.getElementById('fc_'+key+'_font_style'); if(el) el.value = cfg.font_style; }
        if (cfg.color) { var el = document.getElementById('fc_'+key+'_color'); if(el) el.value = cfg.color; }
        if (cfg.letter_spacing) { var el = document.getElementById('fc_'+key+'_letter_spacing'); if(el) el.value = cfg.letter_spacing; }
      }
    })();

    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.section');
    
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        sections.forEach(function(s) { s.style.display = 'none'; });
        var sec = document.querySelector('.section[data-section="' + tab.dataset.section + '"]');
        if (sec) sec.style.display = 'block';
      });
    });

    function toggleField(fieldKey, visible) {
      if (visible) {
        hiddenFields = hiddenFields.filter(function(f) { return f !== fieldKey; });
      } else {
        if (hiddenFields.indexOf(fieldKey) === -1) hiddenFields.push(fieldKey);
      }
      var tab = document.querySelector('.tab[data-section="' + fieldKey + '"]');
      if (tab) {
        if (visible) tab.classList.remove('disabled');
        else tab.classList.add('disabled');
      }
      updatePreview();
    }
    
    function getPositions() {
      var positions = {};
      document.querySelectorAll('#sections input[type="text"]').forEach(function(input) {
        if (input.id.startsWith('fc_')) return;
        if (input.value) positions[input.id] = input.value;
      });
      return positions;
    }

    function getFieldConfigs() {
      var configs = {};
      var fieldKeys = ${JSON.stringify(activeFields.filter(f => !f.isImage).map(f => f.key))};
      fieldKeys.forEach(function(key) {
        var cfg = {};
        var ff = document.getElementById('fc_'+key+'_font_family');
        var fw = document.getElementById('fc_'+key+'_font_weight');
        var fs = document.getElementById('fc_'+key+'_font_style');
        var fc = document.getElementById('fc_'+key+'_color');
        var ls = document.getElementById('fc_'+key+'_letter_spacing');
        if (ff && ff.value) cfg.font_family = ff.value;
        if (fw && fw.value) cfg.font_weight = fw.value;
        if (fs && fs.value) cfg.font_style = fs.value;
        if (fc && fc.value && fc.value !== '#000000') cfg.color = fc.value;
        if (ls && ls.value) cfg.letter_spacing = ls.value;
        if (Object.keys(cfg).length > 0) configs[key] = cfg;
      });
      return configs;
    }

    function getAllSettings() {
      var pos = getPositions();
      return Object.assign({}, pos, {
        hidden_fields: hiddenFields,
        field_configs: getFieldConfigs(),
        global_font_family: document.getElementById('global_font_family').value,
        global_font_weight: document.getElementById('global_font_weight').value,
        global_color: document.getElementById('global_color').value
      });
    }

    var previewLabels = {
      photo: 'PHOTO', surname: 'SURNAME', names: 'FIRSTNAME MIDDLE',
      dob: '01 JAN 1990', nin: '123 4567 8901', qr_code: 'QR',
      sex: 'M', issue_date: '30 JAN 2026', tracking_id: 'TRK-AB12CD34EF56',
      address: '123 SAMPLE STREET', phone: '08012345678', state: 'LAGOS',
      lga: 'IKEJA', birth_state: 'OGUN', birth_lga: 'ABEOKUTA', nationality: 'NIGERIAN'
    };

    function updatePreview() {
      var overlay = document.getElementById('overlay');
      var pos = getPositions();
      var fc = getFieldConfigs();
      var gFamily = document.getElementById('global_font_family').value;
      var gWeight = document.getElementById('global_font_weight').value;
      var gColor = document.getElementById('global_color').value;
      var html = '';

      function isHidden(key) { return hiddenFields.indexOf(key) !== -1; }
      function fontStyle(key) {
        var c = fc[key] || {};
        var s = '';
        s += 'font-family:' + (c.font_family || gFamily) + ';';
        s += 'font-weight:' + (c.font_weight || gWeight) + ';';
        if (c.font_style) s += 'font-style:' + c.font_style + ';';
        s += 'color:' + (c.color || gColor) + ';';
        if (c.letter_spacing) s += 'letter-spacing:' + c.letter_spacing + ';';
        return s;
      }

      if (pos.photo_top) {
        html += '<div class="photo-box' + (isHidden('photo') ? ' hidden' : '') + '" style="top:'+pos.photo_top+';left:'+pos.photo_left+';width:'+pos.photo_width+';height:auto;aspect-ratio:3/4;">PHOTO</div>';
      }
      if (pos.surname_top) {
        html += '<div class="text-box' + (isHidden('surname') ? ' hidden' : '') + '" style="top:'+pos.surname_top+';left:'+pos.surname_left+';font-size:'+pos.surname_size+';'+fontStyle('surname')+'">SURNAME</div>';
      }
      if (pos.names_top) {
        html += '<div class="text-box' + (isHidden('names') ? ' hidden' : '') + '" style="top:'+pos.names_top+';left:'+pos.names_left+';font-size:'+pos.names_size+';'+fontStyle('names')+'">FIRSTNAME MIDDLE</div>';
      }
      if (pos.dob_top) {
        html += '<div class="text-box' + (isHidden('dob') ? ' hidden' : '') + '" style="top:'+pos.dob_top+';left:'+pos.dob_left+';font-size:'+pos.dob_size+';'+fontStyle('dob')+'">01 JAN 1990</div>';
      }
      if (pos.nin_top) {
        html += '<div class="text-box' + (isHidden('nin') ? ' hidden' : '') + '" style="top:'+pos.nin_top+';left:'+pos.nin_left+';font-size:'+pos.nin_size+';'+fontStyle('nin')+'">123 4567 8901</div>';
      }
      if (pos.qr_top) {
        html += '<div class="qr-box' + (isHidden('qr_code') ? ' hidden' : '') + '" style="top:'+pos.qr_top+';right:'+pos.qr_right+';width:'+pos.qr_width+';aspect-ratio:1;">QR</div>';
      }
      if (pos.sex_top) {
        html += '<div class="text-box' + (isHidden('sex') ? ' hidden' : '') + '" style="top:'+pos.sex_top+';left:'+pos.sex_left+';font-size:'+pos.sex_size+';'+fontStyle('sex')+'">M</div>';
      }
      if (pos.issue_top) {
        var issuePos = pos.issue_right ? 'right:'+pos.issue_right : 'left:'+pos.issue_left;
        html += '<div class="text-box' + (isHidden('issue_date') ? ' hidden' : '') + '" style="top:'+pos.issue_top+';'+issuePos+';font-size:'+pos.issue_size+';'+fontStyle('issue_date')+'">30 JAN 2026</div>';
      }
      if (pos.tracking_top) {
        html += '<div class="text-box' + (isHidden('tracking_id') ? ' hidden' : '') + '" style="top:'+pos.tracking_top+';left:'+pos.tracking_left+';font-size:'+pos.tracking_size+';'+fontStyle('tracking_id')+'">TRK-AB12CD34EF56</div>';
      }
      if (pos.address_top) {
        html += '<div class="text-box' + (isHidden('address') ? ' hidden' : '') + '" style="top:'+pos.address_top+';left:'+pos.address_left+';font-size:'+pos.address_size+';max-width:40%;'+fontStyle('address')+'">123 SAMPLE STREET, LAGOS</div>';
      }
      if (pos.phone_top) {
        html += '<div class="text-box' + (isHidden('phone') ? ' hidden' : '') + '" style="top:'+pos.phone_top+';left:'+pos.phone_left+';font-size:'+pos.phone_size+';'+fontStyle('phone')+'">08012345678</div>';
      }
      if (pos.state_top) {
        html += '<div class="text-box' + (isHidden('state') ? ' hidden' : '') + '" style="top:'+pos.state_top+';left:'+pos.state_left+';font-size:'+pos.state_size+';'+fontStyle('state')+'">LAGOS</div>';
      }
      if (pos.lga_top) {
        html += '<div class="text-box' + (isHidden('lga') ? ' hidden' : '') + '" style="top:'+pos.lga_top+';left:'+pos.lga_left+';font-size:'+pos.lga_size+';'+fontStyle('lga')+'">IKEJA</div>';
      }
      if (pos.birth_state_top) {
        html += '<div class="text-box' + (isHidden('birth_state') ? ' hidden' : '') + '" style="top:'+pos.birth_state_top+';left:'+pos.birth_state_left+';font-size:'+pos.birth_state_size+';'+fontStyle('birth_state')+'">OGUN</div>';
      }
      if (pos.birth_lga_top) {
        html += '<div class="text-box' + (isHidden('birth_lga') ? ' hidden' : '') + '" style="top:'+pos.birth_lga_top+';left:'+pos.birth_lga_left+';font-size:'+pos.birth_lga_size+';'+fontStyle('birth_lga')+'">ABEOKUTA</div>';
      }
      if (pos.nationality_top) {
        html += '<div class="text-box' + (isHidden('nationality') ? ' hidden' : '') + '" style="top:'+pos.nationality_top+';left:'+pos.nationality_left+';font-size:'+pos.nationality_size+';'+fontStyle('nationality')+'">NIGERIAN</div>';
      }
      overlay.innerHTML = html;
      document.getElementById('jsonOutput').textContent = JSON.stringify(getAllSettings(), null, 2);
    }
    
    async function saveAll() {
      var data = getAllSettings();
      var statusEl = document.getElementById('statusMsg');
      try {
        var res = await fetch('/api/slips/positions/${slipType}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        var result = await res.json();
        statusEl.className = 'status-msg success';
        statusEl.textContent = 'Settings saved successfully! Slip generator will use these settings.';
        setTimeout(function() { statusEl.className = 'status-msg'; }, 4000);
      } catch (e) {
        statusEl.className = 'status-msg error';
        statusEl.textContent = 'Error saving: ' + e.message;
      }
    }
    
    function copyJson() {
      navigator.clipboard.writeText(JSON.stringify(getAllSettings(), null, 2));
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
