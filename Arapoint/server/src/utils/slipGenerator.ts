import { NINData, BVNData } from '../services/premblyService';
import * as fs from 'fs';
import * as path from 'path';

interface SlipData {
  html: string;
  reference: string;
  type: 'nin' | 'bvn';
  generatedAt: string;
}

let cachedPremiumTemplateBase64: string | null = null;

const getPremiumTemplateBase64 = (): string => {
  if (cachedPremiumTemplateBase64) return cachedPremiumTemplateBase64;
  
  try {
    const templatePath = path.join(process.cwd(), 'server/src/templates/premium_slip_template.jpg');
    if (fs.existsSync(templatePath)) {
      const imageBuffer = fs.readFileSync(templatePath);
      cachedPremiumTemplateBase64 = imageBuffer.toString('base64');
      return cachedPremiumTemplateBase64;
    }
  } catch (error) {
    console.error('Failed to load premium template image:', error);
  }
  return '';
};

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const formatDateSlash = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatNIN = (nin: string): string => {
  if (!nin) return '0000 000 0000';
  return nin.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
};

const generateTrackingId = (reference: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateNINSlip = (data: NINData, reference: string, slipType: 'information' | 'regular' | 'standard' | 'premium' = 'standard'): SlipData => {
  const generatedAt = new Date().toISOString();
  
  let html = '';
  
  if (slipType === 'information') {
    html = generateInformationSlip(data, reference, generatedAt);
  } else if (slipType === 'regular') {
    html = generateRegularSlip(data, reference, generatedAt);
  } else if (slipType === 'standard') {
    html = generateStandardSlip(data, reference, generatedAt);
  } else {
    html = generatePremiumSlip(data, reference, generatedAt);
  }

  return {
    html,
    reference,
    type: 'nin',
    generatedAt,
  };
};

function generateInformationSlip(data: NINData, reference: string, generatedAt: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Verification - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
    .slip { max-width: 900px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #008751; padding-bottom: 15px; margin-bottom: 25px; }
    .header-title { text-align: center; flex: 1; }
    .header-title h1 { color: #008751; font-size: 22px; margin-bottom: 5px; }
    .header-title h2 { color: #333; font-size: 18px; }
    .content { display: flex; gap: 30px; }
    .info-section { flex: 1; }
    .info-row { display: flex; margin-bottom: 12px; }
    .info-label { font-weight: bold; width: 140px; color: #333; }
    .info-value { flex: 1; color: #000; }
    .photo-section { display: flex; flex-direction: column; align-items: center; gap: 15px; }
    .photo { width: 120px; height: 150px; border: 2px solid #008751; border-radius: 5px; object-fit: cover; background: #f0f0f0; }
    .verified-badge { background: #e8f5e9; color: #2e7d32; padding: 10px 25px; border-radius: 5px; font-weight: bold; font-size: 18px; }
    @media print { .slip { border: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="header-title">
        <h1>Federal Republic of Nigeria</h1>
        <h2>Verified NIN Details</h2>
      </div>
    </div>
    <div class="content">
      <div class="info-section">
        <div class="info-row"><span class="info-label">First Name:</span><span class="info-value">${escapeHtml(data.firstName)}</span></div>
        <div class="info-row"><span class="info-label">Middle Name:</span><span class="info-value">${escapeHtml(data.middleName) || '-'}</span></div>
        <div class="info-row"><span class="info-label">Last Name:</span><span class="info-value">${escapeHtml(data.lastName)}</span></div>
        <div class="info-row"><span class="info-label">Date of Birth:</span><span class="info-value">${formatDateShort(data.dateOfBirth)}</span></div>
        <div class="info-row"><span class="info-label">Gender:</span><span class="info-value">${escapeHtml(data.gender)}</span></div>
        <div class="info-row"><span class="info-label">NIN:</span><span class="info-value" style="font-weight: bold;">${escapeHtml(data.id)}</span></div>
        <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(data.phone) || '-'}</span></div>
        <div class="info-row"><span class="info-label">State:</span><span class="info-value">${escapeHtml(data.state) || '-'}</span></div>
        <div class="info-row"><span class="info-label">LGA:</span><span class="info-value">${escapeHtml(data.lga) || '-'}</span></div>
      </div>
      <div class="photo-section">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999;">No Photo</div>'}
        <div class="verified-badge">Verified</div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// REGULAR SLIP - Matches the long table-style NIMC slip exactly
function generateRegularSlip(data: NINData, reference: string, generatedAt: string): string {
  const trackingId = generateTrackingId(reference);
  const issueDate = formatDateSlash(new Date().toISOString());
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .slip { max-width: 850px; margin: 0 auto; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(to bottom, #fffaf0 0%, #fff 100%); padding: 15px 25px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0e0; }
    .coat-of-arms { width: 65px; height: 75px; flex-shrink: 0; }
    .coat-of-arms img { width: 100%; height: 100%; object-fit: contain; }
    .header-center { text-align: center; flex: 1; padding: 0 20px; }
    .header-center h1 { font-size: 26px; color: #1a472a; margin-bottom: 3px; font-weight: bold; }
    .header-center h2 { font-size: 14px; color: #333; font-weight: normal; margin-bottom: 2px; }
    .header-center h3 { font-size: 13px; color: #666; font-style: italic; }
    .nimc-logo { text-align: right; flex-shrink: 0; }
    .nimc-logo .nimc-text { font-size: 32px; font-weight: bold; color: #1a472a; font-style: italic; font-family: 'Times New Roman', serif; }
    .nimc-logo .nimc-sub { font-size: 8px; color: #666; display: block; text-align: center; }
    .content { padding: 15px 25px; }
    .main-table { width: 100%; border-collapse: collapse; }
    .main-table td { padding: 8px 10px; vertical-align: top; }
    .left-col { width: 200px; }
    .center-col { width: 280px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; padding-left: 15px !important; }
    .right-col { width: auto; }
    .field-group { margin-bottom: 10px; }
    .field-label { font-size: 11px; color: #333; font-weight: bold; }
    .field-value { font-size: 14px; color: #000; margin-top: 2px; }
    .nin-box { display: inline-block; border: 2px solid #c41e3a; border-radius: 50px; padding: 6px 18px; margin-top: 5px; }
    .nin-box .field-value { color: #c41e3a; font-weight: bold; font-size: 13px; margin: 0; }
    .photo { width: 130px; height: 160px; border: 1px solid #ccc; object-fit: cover; background: #f5f5f5; float: right; }
    .note-section { margin-top: 15px; padding: 12px 25px; background: #fffde7; border-top: 1px solid #e0e0e0; }
    .note-section p { font-size: 11px; color: #333; }
    .note-section strong { color: #1a472a; }
    .footer { background: #f8f8f8; padding: 12px 25px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e0e0e0; }
    .footer-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #333; }
    .footer-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; }
    .footer-icon.email { background: #e3f2fd; color: #1565c0; }
    .footer-icon.web { background: #e8f5e9; color: #2e7d32; }
    .footer-icon.phone { background: #fff3e0; color: #ef6c00; }
    .nimc-footer { text-align: right; }
    .nimc-footer h4 { font-size: 11px; color: #1a472a; margin-bottom: 2px; }
    .nimc-footer p { font-size: 8px; color: #666; }
    @media print { body { background: white; padding: 0; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="coat-of-arms">
        <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="55" rx="35" ry="40" fill="#228b22"/>
          <circle cx="50" cy="30" r="12" fill="#c41e3a"/>
          <path d="M30 55 L50 85 L70 55" fill="#333"/>
          <circle cx="25" cy="50" r="10" fill="#ffd700"/>
          <circle cx="75" cy="50" r="10" fill="#ffd700"/>
          <rect x="45" y="10" width="10" height="15" fill="#c41e3a"/>
          <text x="50" y="105" text-anchor="middle" fill="#228b22" font-size="6" font-weight="bold">UNITY AND FAITH, PEACE AND PROGRESS</text>
        </svg>
      </div>
      <div class="header-center">
        <h1>National Identity Management System</h1>
        <h2>Federal Republic of Nigeria</h2>
        <h3>National Identification Number Slip (NINS)</h3>
      </div>
      <div class="nimc-logo">
        <span class="nimc-text">Nimc</span>
        <span class="nimc-sub">Promoting Digital Identity</span>
      </div>
    </div>
    
    <div class="content">
      <table class="main-table">
        <tr>
          <td class="left-col">
            <div class="field-group">
              <div class="field-label">Tracking ID</div>
              <div class="field-value">${trackingId}</div>
            </div>
            <div class="field-group">
              <div class="field-label">NIN</div>
              <div class="nin-box">
                <div class="field-value">${escapeHtml(data.id)}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field-label">Issue Date</div>
              <div class="field-value">${issueDate}</div>
            </div>
          </td>
          <td class="center-col">
            <div class="field-group">
              <div class="field-label">Surname</div>
              <div class="field-value">${escapeHtml(data.lastName).toUpperCase()}</div>
            </div>
            <div class="field-group">
              <div class="field-label">First Name</div>
              <div class="field-value">${escapeHtml(data.firstName).toUpperCase()}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Middle Name</div>
              <div class="field-value">${escapeHtml(data.middleName).toUpperCase() || '-'}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Gender</div>
              <div class="field-value">${data.gender?.charAt(0).toUpperCase() || 'M'}</div>
            </div>
          </td>
          <td class="right-col">
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1;">
                <div class="field-group">
                  <div class="field-label">Address:</div>
                  <div class="field-value">${escapeHtml(data.address) || 'N/A'}</div>
                </div>
                <div class="field-group">
                  <div class="field-value">${escapeHtml(data.lga) || ''}</div>
                </div>
                <div class="field-group">
                  <div class="field-value">${escapeHtml(data.state) || ''}</div>
                </div>
              </div>
              <div style="flex-shrink: 0;">
                ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px;">Photo</div>'}
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
    
    <div class="note-section">
      <p><strong>Note:</strong> This transaction slip does not confer the right to the <strong>General Multipurpose Card</strong> (For any enquiry please contact)</p>
    </div>
    
    <div class="footer">
      <div class="footer-item">
        <div class="footer-icon email">@</div>
        <span>helpdesk@nimc.gov.ng</span>
      </div>
      <div class="footer-item">
        <div class="footer-icon web">🌐</div>
        <span>www.nimc.gov.ng</span>
      </div>
      <div class="footer-item">
        <div class="footer-icon phone">📞</div>
        <span>07040144452,07040144453,<br>07040144453</span>
      </div>
      <div class="nimc-footer">
        <h4>National Identity Management Commission</h4>
        <p>11 Sokode Crescent, Off Dalaba Street Zone 5, Wuse Abuja Nigeria</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// STANDARD SLIP - Uses exact user template image as background with data overlay
function generateStandardSlip(data: NINData, reference: string, generatedAt: string): string {
  const fullName = `${data.firstName} ${data.middleName || ''} ${data.lastName}`.replace(/\s+/g, ' ').trim();
  const qrData = JSON.stringify({ nin: data.id, name: fullName });
  
  // Load the standard template as base64
  const templatePath = path.join(__dirname, '../templates/standard_slip_template.jpg');
  let templateSrc = '';
  try {
    const templateBuffer = fs.readFileSync(templatePath);
    templateSrc = `data:image/jpeg;base64,${templateBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to load standard template:', error);
    templateSrc = '';
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Standard Slip - ${reference}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;900&display=swap');
    
    @page {
      size: A4;
      margin: 10mm;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Roboto', Arial, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
    }
    
    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    
    .slip-wrapper {
      position: relative;
      width: 100%;
      max-width: 190mm;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .template-bg {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .data-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    
    /* Photo positioned in the empty photo area on the card */
    .photo-overlay {
      position: absolute;
      top: 27%;
      left: 15%;
      width: 10%;
      height: 11%;
      object-fit: cover;
    }
    
    /* Surname field */
    .surname-overlay {
      position: absolute;
      top: 28%;
      left: 28%;
      font-size: 1.1vw;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Given Names field */
    .given-names-overlay {
      position: absolute;
      top: 32%;
      left: 28%;
      font-size: 1.1vw;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Date of Birth field */
    .dob-overlay {
      position: absolute;
      top: 36%;
      left: 28%;
      font-size: 1.1vw;
      font-weight: 700;
      color: #000;
      letter-spacing: 0.5px;
    }
    
    /* NIN - centered below the card content */
    .nin-overlay {
      position: absolute;
      top: 43%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 2.5vw;
      font-weight: 900;
      color: #000;
      letter-spacing: 6px;
      font-family: 'Arial Black', Arial, sans-serif;
    }
    
    /* QR Code positioned in the QR area on the right side */
    .qr-overlay {
      position: absolute;
      top: 26%;
      right: 16%;
      width: 10%;
      height: auto;
    }
    
    .qr-overlay canvas {
      width: 100% !important;
      height: 100% !important;
    }
    
    @media print {
      body { 
        background: white; 
        padding: 0; 
        margin: 0;
      }
      .page-container {
        box-shadow: none;
        padding: 0;
      }
      .slip-wrapper { 
        box-shadow: none; 
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="slip-wrapper">
      <img src="${templateSrc}" alt="NIN Slip Template" class="template-bg">
      
      <div class="data-overlay">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo-overlay">` : ''}
        
        <div class="surname-overlay">${escapeHtml(data.lastName)}</div>
        <div class="given-names-overlay">${escapeHtml(data.firstName)}${data.middleName ? ' ' + escapeHtml(data.middleName) : ''}</div>
        <div class="dob-overlay">${formatDateShort(data.dateOfBirth)}</div>
        <div class="nin-overlay">${formatNIN(data.id)}</div>
        
        <div class="qr-overlay" id="qrcode"></div>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const qrData = ${JSON.stringify(qrData)};
      const qrContainer = document.getElementById('qrcode');
      if (qrContainer && typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrData, { 
          width: 150,
          margin: 1,
          errorCorrectionLevel: 'M'
        }, function(error, canvas) {
          if (error) {
            console.error('QR Code generation error:', error);
            return;
          }
          qrContainer.appendChild(canvas);
        });
      }
    });
  </script>
</body>
</html>
  `.trim();
}

// PREMIUM SLIP - Uses exact user template image as background with data overlay
// Template image stored at: server/src/templates/premium_slip_template.jpg
function generatePremiumSlip(data: NINData, reference: string, generatedAt: string): string {
  const issueDate = formatDateShort(new Date().toISOString());
  const gender = data.gender?.charAt(0).toUpperCase() || 'M';
  const givenNames = data.firstName + (data.middleName ? ', ' + data.middleName : '');
  const templateBase64 = getPremiumTemplateBase64();
  const templateSrc = templateBase64 ? `data:image/jpeg;base64,${templateBase64}` : '/api/identity/template-image';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital NIN Slip - ${reference}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;900&display=swap');
    
    @page {
      size: A4;
      margin: 10mm;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Roboto', Arial, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
    }
    
    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    
    .slip-wrapper {
      position: relative;
      width: 100%;
      max-width: 190mm;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .template-bg {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .data-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    
    @media print {
      body { 
        background: white; 
        padding: 0; 
        margin: 0;
      }
      .page-container {
        box-shadow: none;
        padding: 0;
      }
      .slip-wrapper { 
        box-shadow: none; 
        max-width: 100%;
      }
    }
    
    /* Photo positioned over the empty photo area - left side of the front card */
    .photo-overlay {
      position: absolute;
      top: 26%;
      left: 7%;
      width: 15%;
      height: 17%;
      object-fit: cover;
      z-index: 10;
    }
    
    /* Surname value - positioned below SURNAME/NOM label */
    .surname-value {
      position: absolute;
      top: 27%;
      left: 27%;
      font-size: 14px;
      font-weight: 700;
      color: #1a3a20;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 10;
    }
    
    /* Given names value - positioned below GIVEN NAMES/PRÉNOMS label */
    .given-names-value {
      position: absolute;
      top: 32%;
      left: 27%;
      font-size: 14px;
      font-weight: 700;
      color: #1a3a20;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 10;
    }
    
    /* Date of birth value */
    .dob-value {
      position: absolute;
      top: 38%;
      left: 27%;
      font-size: 12px;
      font-weight: 700;
      color: #1a3a20;
      z-index: 10;
    }
    
    /* Sex value */
    .sex-value {
      position: absolute;
      top: 38%;
      left: 42%;
      font-size: 12px;
      font-weight: 700;
      color: #1a3a20;
      z-index: 10;
    }
    
    /* Issue date value - right side under ISSUE DATE label */
    .issue-value {
      position: absolute;
      top: 40%;
      right: 6%;
      font-size: 10px;
      font-weight: 700;
      color: #1a3a20;
      text-align: center;
      z-index: 10;
    }
    
    /* NIN value - centered at bottom of front card */
    .nin-value {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 22px;
      font-weight: 900;
      color: #0a2010;
      letter-spacing: 5px;
      font-family: 'Arial Black', Arial, sans-serif;
      z-index: 10;
    }
    
    /* QR code positioned on the right side of the front card */
    .qr-code-container {
      position: absolute;
      top: 25%;
      right: 18%;
      width: 12%;
      height: 14%;
      z-index: 10;
      background: white;
      padding: 2px;
    }
    
    .qr-code-container canvas {
      width: 100% !important;
      height: 100% !important;
    }
    
    @media print { 
      body { background: white; padding: 0; } 
      .slip-wrapper { box-shadow: none; } 
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="slip-wrapper">
      <img src="${templateSrc}" alt="NIN Slip Template" class="template-bg">
      
      <div class="data-overlay">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo-overlay">` : ''}
        
        <div class="surname-value">${escapeHtml(data.lastName).toUpperCase()}</div>
        <div class="given-names-value">${escapeHtml(givenNames).toUpperCase()}</div>
        <div class="dob-value">${formatDateShort(data.dateOfBirth)}</div>
        <div class="sex-value">${gender}</div>
        <div class="issue-value">${issueDate}</div>
        <div class="nin-value">${formatNIN(data.id)}</div>
        <div class="qr-code-container" id="qrcode"></div>
      </div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <script>
    const qrData = "NIN:${escapeHtml(data.id)}|NAME:${escapeHtml(data.lastName).toUpperCase()}, ${escapeHtml(givenNames).toUpperCase()}";
    QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
      width: 150,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    });
  </script>
</body>
</html>
  `.trim();
}

export const generateBVNSlip = (data: BVNData, reference: string, slipType: 'standard' | 'premium' = 'standard'): SlipData => {
  const generatedAt = new Date().toISOString();
  
  let html = '';
  if (slipType === 'premium') {
    html = generateBVNPremiumSlip(data, reference, generatedAt);
  } else {
    html = generateBVNStandardSlip(data, reference, generatedAt);
  }

  return {
    html,
    reference,
    type: 'bvn',
    generatedAt,
  };
};

function generateBVNStandardSlip(data: BVNData, reference: string, generatedAt: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BVN Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 420px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); padding: 15px 20px; text-align: center; }
    .header h1 { font-size: 14px; color: #fff; letter-spacing: 1px; margin-bottom: 3px; }
    .header h2 { font-size: 11px; color: rgba(255,255,255,0.9); font-weight: normal; }
    .content { padding: 25px 20px; display: flex; gap: 20px; }
    .photo { width: 100px; height: 120px; border: 2px solid #1565c0; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .info { flex: 1; }
    .name-section { margin-bottom: 15px; }
    .surname { font-size: 22px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .firstname { font-size: 18px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 9px; color: #666; text-transform: uppercase; }
    .field-value { font-size: 13px; font-weight: bold; color: #1a1a1a; }
    .bvn-section { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); padding: 15px; text-align: center; }
    .bvn-label { font-size: 10px; color: rgba(255,255,255,0.9); margin-bottom: 5px; }
    .bvn-value { font-size: 26px; font-weight: bold; color: #fff; letter-spacing: 3px; font-family: 'Courier New', monospace; }
    .footer { background: #f5f5f5; padding: 10px 20px; text-align: center; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <h1>CENTRAL BANK OF NIGERIA</h1>
      <h2>Bank Verification Number (BVN) Slip</h2>
    </div>
    <div class="content">
      ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px;">Photo</div>'}
      <div class="info">
        <div class="name-section">
          <div class="surname">${escapeHtml(data.lastName)}</div>
          <div class="firstname">${escapeHtml(data.firstName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Date of Birth</div>
          <div class="field-value">${formatDateShort(data.dateOfBirth)}</div>
        </div>
        <div class="field">
          <div class="field-label">Gender</div>
          <div class="field-value">${escapeHtml(data.gender)}</div>
        </div>
        <div class="field">
          <div class="field-label">Phone</div>
          <div class="field-value">${escapeHtml(data.phone)}</div>
        </div>
      </div>
    </div>
    <div class="bvn-section">
      <div class="bvn-label">Bank Verification Number</div>
      <div class="bvn-value">${escapeHtml(data.id)}</div>
    </div>
    <div class="footer">${reference} | ${new Date(generatedAt).toLocaleDateString('en-NG')}</div>
  </div>
</body>
</html>
  `.trim();
}

function generateBVNPremiumSlip(data: BVNData, reference: string, generatedAt: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BVN Premium Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #0d47a1; padding: 20px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .slip { width: 550px; background: linear-gradient(180deg, #0d47a1 0%, #1565c0 30%, #1976d2 60%, #1565c0 100%); border-radius: 15px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.4); position: relative; padding: 30px; }
    .header { text-align: center; margin-bottom: 25px; }
    .cbn-logo { width: 70px; height: 70px; margin: 0 auto 12px; background: #ffd700; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: #0d47a1; }
    .header h1 { font-size: 18px; color: #ffd700; letter-spacing: 2px; margin-bottom: 3px; }
    .header h2 { font-size: 11px; color: rgba(255,255,255,0.9); }
    .main-content { display: flex; gap: 20px; margin-bottom: 20px; }
    .photo { width: 120px; height: 145px; border: 3px solid #ffd700; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .info-section { flex: 1; color: #fff; }
    .field { margin-bottom: 10px; }
    .field-label { font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; }
    .field-value { font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .field-row { display: flex; gap: 15px; }
    .field-row .field { flex: 1; }
    .bvn-section { background: rgba(255,215,0,0.15); border: 2px solid #ffd700; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 15px; }
    .bvn-label { font-size: 10px; color: rgba(255,255,255,0.9); margin-bottom: 5px; }
    .bvn-value { font-size: 32px; font-weight: bold; color: #ffd700; letter-spacing: 4px; font-family: 'Courier New', monospace; }
    .footer { text-align: center; font-size: 9px; color: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="cbn-logo">CBN</div>
      <h1>CENTRAL BANK OF NIGERIA</h1>
      <h2>Bank Verification Number System</h2>
    </div>
    <div class="main-content">
      ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #666; font-size: 11px;">Photo</div>'}
      <div class="info-section">
        <div class="field">
          <div class="field-label">Surname</div>
          <div class="field-value">${escapeHtml(data.lastName)}</div>
        </div>
        <div class="field">
          <div class="field-label">First Name</div>
          <div class="field-value">${escapeHtml(data.firstName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Middle Name</div>
          <div class="field-value">${escapeHtml(data.middleName) || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field">
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${formatDateShort(data.dateOfBirth)}</div>
          </div>
          <div class="field">
            <div class="field-label">Gender</div>
            <div class="field-value">${escapeHtml(data.gender)}</div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Phone Number</div>
          <div class="field-value">${escapeHtml(data.phone)}</div>
        </div>
      </div>
    </div>
    <div class="bvn-section">
      <div class="bvn-label">BANK VERIFICATION NUMBER (BVN)</div>
      <div class="bvn-value">${escapeHtml(data.id)}</div>
    </div>
    <div class="footer">${reference} | ${new Date(generatedAt).toLocaleDateString('en-NG')}</div>
  </div>
</body>
</html>
  `.trim();
}
