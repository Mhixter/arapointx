import { NINData, BVNData } from '../services/premblyService';

interface SlipData {
  html: string;
  reference: string;
  type: 'nin' | 'bvn';
  generatedAt: string;
}

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

// STANDARD SLIP - White card with coat of arms, matches sample exactly
function generateStandardSlip(data: NINData, reference: string, generatedAt: string): string {
  const issueDate = formatDateShort(new Date().toISOString());
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Standard Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #e8e8e8; padding: 30px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 580px; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); overflow: hidden; position: relative; padding: 25px 30px 35px; }
    .watermark { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.06; pointer-events: none; width: 280px; height: 320px; }
    .watermark svg { width: 100%; height: 100%; }
    .nin-watermark-left { position: absolute; left: -10px; top: 50%; transform: translateY(-50%) rotate(-90deg); font-size: 11px; color: rgba(0,0,0,0.08); letter-spacing: 3px; white-space: nowrap; }
    .nin-watermark-right { position: absolute; right: -10px; top: 50%; transform: translateY(-50%) rotate(90deg); font-size: 11px; color: rgba(0,0,0,0.08); letter-spacing: 3px; white-space: nowrap; }
    .coat-of-arms { width: 90px; height: 100px; margin: 0 auto 15px; display: block; }
    .coat-of-arms svg { width: 100%; height: 100%; }
    .content { display: flex; gap: 20px; position: relative; z-index: 1; }
    .photo-section { flex-shrink: 0; }
    .photo { width: 110px; height: 135px; border: 1px solid #ccc; object-fit: cover; background: #e8e8e8; }
    .info-section { flex: 1; padding-top: 5px; }
    .field { margin-bottom: 10px; }
    .field-label { font-size: 11px; color: #555; font-style: italic; }
    .field-value { font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; margin-top: 1px; }
    .right-section { text-align: right; flex-shrink: 0; width: 120px; }
    .nga-code { font-size: 36px; font-weight: bold; color: #333; margin-bottom: 3px; }
    .nga-numbers { font-size: 9px; color: #aaa; letter-spacing: 1px; margin-bottom: 8px; }
    .qr-code { width: 95px; height: 95px; margin-left: auto; border: 1px solid #ddd; background: #fff; }
    .qr-code svg { width: 100%; height: 100%; }
    .issue-date { margin-top: 10px; text-align: right; }
    .issue-label { font-size: 9px; color: #c41e3a; font-weight: bold; }
    .issue-value { font-size: 12px; color: #333; font-weight: bold; }
    .nin-section { margin-top: 25px; text-align: center; position: relative; z-index: 1; }
    .nin-label { font-size: 15px; font-weight: bold; color: #000; margin-bottom: 8px; }
    .nin-value { font-size: 48px; font-weight: bold; color: #000; letter-spacing: 10px; font-family: 'Arial Black', Arial, sans-serif; }
    @media print { body { background: white; padding: 0; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="nin-watermark-left">00000000000</div>
    <div class="nin-watermark-right">00000000000</div>
    
    <div class="watermark">
      <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="55" rx="38" ry="45" fill="#228b22"/>
        <circle cx="50" cy="28" r="14" fill="#c41e3a"/>
        <path d="M25 55 L50 90 L75 55" fill="#333"/>
        <circle cx="22" cy="48" r="12" fill="#ffd700"/>
        <circle cx="78" cy="48" r="12" fill="#ffd700"/>
      </svg>
    </div>
    
    <div class="coat-of-arms">
      <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="55" rx="35" ry="42" fill="#228b22"/>
        <circle cx="50" cy="28" r="12" fill="#c41e3a"/>
        <path d="M28 52 L50 88 L72 52" fill="#333"/>
        <circle cx="23" cy="48" r="10" fill="#ffd700"/>
        <circle cx="77" cy="48" r="10" fill="#ffd700"/>
        <rect x="46" y="8" width="8" height="14" fill="#c41e3a"/>
        <text x="50" y="108" text-anchor="middle" fill="#228b22" font-size="5" font-weight="bold">UNITY AND FAITH, PEACE AND PROGRESS</text>
      </svg>
    </div>
    
    <div class="content">
      <div class="photo-section">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px;">Photo</div>'}
      </div>
      
      <div class="info-section">
        <div class="field">
          <div class="field-label">Surname/Nom</div>
          <div class="field-value">${escapeHtml(data.lastName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Given Names/Prénoms</div>
          <div class="field-value">${escapeHtml(data.firstName)}${data.middleName ? ', ' + escapeHtml(data.middleName) : ''}</div>
        </div>
        <div class="field">
          <div class="field-label">Date of Birth</div>
          <div class="field-value">${formatDateShort(data.dateOfBirth)}</div>
        </div>
      </div>
      
      <div class="right-section">
        <div class="nga-code">NGA</div>
        <div class="nga-numbers">00000000000</div>
        <div class="qr-code">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect fill="#fff" width="100" height="100"/>
            <rect fill="#000" x="8" y="8" width="25" height="25"/>
            <rect fill="#fff" x="13" y="13" width="15" height="15"/>
            <rect fill="#000" x="16" y="16" width="9" height="9"/>
            <rect fill="#000" x="67" y="8" width="25" height="25"/>
            <rect fill="#fff" x="72" y="13" width="15" height="15"/>
            <rect fill="#000" x="75" y="16" width="9" height="9"/>
            <rect fill="#000" x="8" y="67" width="25" height="25"/>
            <rect fill="#fff" x="13" y="72" width="15" height="15"/>
            <rect fill="#000" x="16" y="75" width="9" height="9"/>
            <rect fill="#000" x="40" y="8" width="5" height="5"/>
            <rect fill="#000" x="50" y="8" width="5" height="5"/>
            <rect fill="#000" x="40" y="18" width="5" height="5"/>
            <rect fill="#000" x="55" y="18" width="5" height="5"/>
            <rect fill="#000" x="8" y="40" width="5" height="5"/>
            <rect fill="#000" x="18" y="45" width="5" height="5"/>
            <rect fill="#000" x="8" y="55" width="5" height="5"/>
            <rect fill="#000" x="40" y="40" width="20" height="20" fill="none" stroke="#000" stroke-width="2"/>
            <rect fill="#000" x="46" y="46" width="8" height="8"/>
            <rect fill="#000" x="67" y="40" width="5" height="5"/>
            <rect fill="#000" x="77" y="45" width="5" height="5"/>
            <rect fill="#000" x="87" y="40" width="5" height="5"/>
            <rect fill="#000" x="67" y="55" width="5" height="5"/>
            <rect fill="#000" x="82" y="55" width="5" height="5"/>
            <rect fill="#000" x="40" y="67" width="5" height="5"/>
            <rect fill="#000" x="50" y="72" width="5" height="5"/>
            <rect fill="#000" x="40" y="82" width="5" height="5"/>
            <rect fill="#000" x="55" y="87" width="5" height="5"/>
            <rect fill="#000" x="67" y="67" width="5" height="5"/>
            <rect fill="#000" x="77" y="72" width="5" height="5"/>
            <rect fill="#000" x="87" y="67" width="5" height="5"/>
            <rect fill="#000" x="67" y="82" width="5" height="5"/>
            <rect fill="#000" x="82" y="87" width="5" height="5"/>
          </svg>
        </div>
        <div class="issue-date">
          <div class="issue-label">ISSUE DATE</div>
          <div class="issue-value">${issueDate}</div>
        </div>
      </div>
    </div>
    
    <div class="nin-section">
      <div class="nin-label">National Identification Number (NIN)</div>
      <div class="nin-value">${formatNIN(data.id)}</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// PREMIUM SLIP - Exact NIMC Digital NIN Slip template matching user's sample exactly
function generatePremiumSlip(data: NINData, reference: string, generatedAt: string): string {
  const issueDate = formatDateShort(new Date().toISOString());
  const gender = data.gender?.charAt(0).toUpperCase() || 'M';
  const givenNames = data.firstName + (data.middleName ? ', ' + data.middleName : '');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital NIN Slip - ${reference}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Roboto', Arial, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
    }
    
    .slip-container {
      width: 540px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      position: relative;
    }
    
    .slip {
      width: 100%;
      height: 345px;
      background: 
        radial-gradient(ellipse at 30% 70%, rgba(100,180,120,0.4) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 30%, rgba(80,160,100,0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(60,140,80,0.2) 0%, transparent 60%),
        linear-gradient(145deg, 
          #5cb06c 0%, 
          #4a9c5a 10%,
          #3d8a4a 25%, 
          #358040 40%,
          #3d8a4a 55%,
          #4a9c5a 70%,
          #5cb06c 85%,
          #4a9c5a 100%
        );
      position: relative;
      overflow: hidden;
    }
    
    /* Coat of arms watermark - more visible */
    .watermark {
      position: absolute;
      bottom: 55px;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 180px;
      opacity: 0.18;
      pointer-events: none;
      z-index: 1;
    }
    
    /* Side watermarks */
    .side-watermark-left {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      font-size: 9px;
      color: rgba(0,50,0,0.12);
      letter-spacing: 1px;
      white-space: nowrap;
      font-weight: 700;
      font-family: monospace;
    }
    .side-watermark-right {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%) rotate(90deg);
      font-size: 9px;
      color: rgba(0,50,0,0.12);
      letter-spacing: 1px;
      white-space: nowrap;
      font-weight: 700;
      font-family: monospace;
    }
    
    /* Header */
    .header {
      position: relative;
      z-index: 5;
    }
    .header-main {
      background: linear-gradient(90deg, 
        rgba(30,80,50,0.85) 0%, 
        rgba(50,100,60,0.7) 30%,
        rgba(60,110,70,0.6) 50%,
        rgba(50,100,60,0.7) 70%,
        rgba(30,80,50,0.85) 100%
      );
      padding: 12px 25px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header-title {
      color: #fff;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }
    .header-sub {
      background: linear-gradient(90deg, #1a4525 0%, #234d2d 50%, #1a4525 100%);
      padding: 5px 25px;
      text-align: center;
    }
    .header-subtitle {
      color: rgba(255,255,255,0.95);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 4px;
      text-transform: uppercase;
    }
    
    /* Content */
    .content {
      display: flex;
      padding: 14px 22px;
      gap: 14px;
      position: relative;
      z-index: 5;
    }
    
    .photo-section { flex-shrink: 0; }
    .photo {
      width: 95px;
      height: 118px;
      background: #bbb;
      border: 2px solid rgba(255,255,255,0.5);
      object-fit: cover;
    }
    .photo-placeholder {
      width: 95px;
      height: 118px;
      background: linear-gradient(180deg, #8a8a8a 0%, #6a6a6a 100%);
      border: 2px solid rgba(255,255,255,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-placeholder svg {
      width: 55px;
      height: 70px;
      opacity: 0.6;
    }
    
    .info-section {
      flex: 1;
      color: #fff;
      padding-top: 2px;
    }
    .field { margin-bottom: 7px; }
    .field-label {
      font-size: 8px;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 500;
    }
    .field-value {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
      text-shadow: 0 1px 1px rgba(0,0,0,0.2);
    }
    .field-row {
      display: flex;
      gap: 20px;
      margin-top: 8px;
    }
    .field-row .field { margin-bottom: 0; }
    
    .right-section {
      flex-shrink: 0;
      width: 105px;
      text-align: center;
      color: #fff;
    }
    .qr-code {
      width: 78px;
      height: 78px;
      background: #fff;
      margin: 0 auto 6px;
      padding: 4px;
      border-radius: 3px;
    }
    .qr-code svg { width: 100%; height: 100%; }
    .nga-text {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 4px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.25);
    }
    .issue-section { text-align: center; }
    .issue-label {
      font-size: 7px;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .issue-value {
      font-size: 10px;
      font-weight: 700;
      margin-top: 1px;
    }
    
    /* NIN Bottom Section */
    .nin-section {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(180deg, 
        rgba(80,140,90,0.5) 0%, 
        rgba(60,120,70,0.6) 30%,
        rgba(50,100,60,0.7) 100%
      );
      padding: 8px 22px 14px;
      text-align: center;
      z-index: 5;
      border-top: 1px solid rgba(255,255,255,0.15);
    }
    .nin-label {
      font-size: 10px;
      color: rgba(255,255,255,0.95);
      margin-bottom: 4px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .nin-value {
      font-size: 36px;
      font-weight: 900;
      color: #1a3520;
      letter-spacing: 6px;
      font-family: 'Arial Black', Arial, sans-serif;
      text-shadow: 0 1px 0 rgba(255,255,255,0.4);
    }
    
    @media print { 
      body { background: white; padding: 0; } 
      .slip-container { box-shadow: none; } 
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="slip">
      <div class="side-watermark-left">00000000000</div>
      <div class="side-watermark-right">00000000000</div>
      
      <!-- Coat of arms watermark -->
      <div class="watermark">
        <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
          <!-- Shield -->
          <path d="M100 10 L170 50 L170 120 Q170 180 100 210 Q30 180 30 120 L30 50 Z" fill="#2a5a35" stroke="#1a4a25" stroke-width="3"/>
          <!-- Eagle -->
          <ellipse cx="100" cy="55" rx="28" ry="22" fill="#333"/>
          <path d="M72 55 L60 45 M128 55 L140 45" stroke="#333" stroke-width="4"/>
          <!-- Black Y -->
          <path d="M50 75 L100 140 L150 75" fill="none" stroke="#222" stroke-width="18"/>
          <!-- Horses -->
          <ellipse cx="55" cy="100" rx="18" ry="22" fill="#8B7355"/>
          <ellipse cx="145" cy="100" rx="18" ry="22" fill="#8B7355"/>
          <!-- Motto ribbon -->
          <path d="M30 195 Q100 185 170 195 L170 210 Q100 200 30 210 Z" fill="#2a5a35"/>
          <text x="100" y="206" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold" font-family="Arial">UNITY AND FAITH, PEACE AND PROGRESS</text>
        </svg>
      </div>
      
      <div class="header">
        <div class="header-main">
          <div class="header-title">Federal Republic of Nigeria</div>
        </div>
        <div class="header-sub">
          <div class="header-subtitle">Digital NIN Slip</div>
        </div>
      </div>
      
      <div class="content">
        <div class="photo-section">
          ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : `
          <div class="photo-placeholder">
            <svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="30" cy="20" rx="16" ry="18" fill="#555"/>
              <ellipse cx="30" cy="68" rx="26" ry="22" fill="#555"/>
            </svg>
          </div>`}
        </div>
        
        <div class="info-section">
          <div class="field">
            <div class="field-label">Surname/Nom</div>
            <div class="field-value">${escapeHtml(data.lastName) || 'RESIDENT'}</div>
          </div>
          <div class="field">
            <div class="field-label">Given Names/Prénoms</div>
            <div class="field-value">${escapeHtml(givenNames) || 'PROUD, NIGERIAN'}</div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">Date of Birth</div>
              <div class="field-value">${formatDateShort(data.dateOfBirth) || '01 OCT 1960'}</div>
            </div>
            <div class="field">
              <div class="field-label">Sex/Sexe</div>
              <div class="field-value">${gender || 'F'}</div>
            </div>
          </div>
        </div>
        
        <div class="right-section">
          <div class="qr-code">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect fill="#fff" width="100" height="100"/>
              <rect fill="#000" x="5" y="5" width="28" height="28"/>
              <rect fill="#fff" x="10" y="10" width="18" height="18"/>
              <rect fill="#000" x="13" y="13" width="12" height="12"/>
              <rect fill="#000" x="67" y="5" width="28" height="28"/>
              <rect fill="#fff" x="72" y="10" width="18" height="18"/>
              <rect fill="#000" x="75" y="13" width="12" height="12"/>
              <rect fill="#000" x="5" y="67" width="28" height="28"/>
              <rect fill="#fff" x="10" y="72" width="18" height="18"/>
              <rect fill="#000" x="13" y="75" width="12" height="12"/>
              <rect fill="#000" x="40" y="5" width="6" height="6"/>
              <rect fill="#000" x="50" y="5" width="6" height="6"/>
              <rect fill="#000" x="40" y="15" width="6" height="6"/>
              <rect fill="#000" x="54" y="15" width="6" height="6"/>
              <rect fill="#000" x="5" y="40" width="6" height="6"/>
              <rect fill="#000" x="15" y="48" width="6" height="6"/>
              <rect fill="#000" x="5" y="56" width="6" height="6"/>
              <rect fill="#000" x="40" y="40" width="20" height="20" fill="none" stroke="#000" stroke-width="3"/>
              <rect fill="#000" x="46" y="46" width="8" height="8"/>
              <rect fill="#000" x="67" y="40" width="6" height="6"/>
              <rect fill="#000" x="77" y="48" width="6" height="6"/>
              <rect fill="#000" x="89" y="40" width="6" height="6"/>
              <rect fill="#000" x="67" y="56" width="6" height="6"/>
              <rect fill="#000" x="83" y="56" width="6" height="6"/>
              <rect fill="#000" x="40" y="70" width="6" height="6"/>
              <rect fill="#000" x="50" y="78" width="6" height="6"/>
              <rect fill="#000" x="40" y="86" width="6" height="6"/>
              <rect fill="#000" x="56" y="89" width="6" height="6"/>
              <rect fill="#000" x="67" y="70" width="6" height="6"/>
              <rect fill="#000" x="77" y="78" width="6" height="6"/>
              <rect fill="#000" x="89" y="70" width="6" height="6"/>
              <rect fill="#000" x="67" y="86" width="6" height="6"/>
              <rect fill="#000" x="83" y="89" width="6" height="6"/>
            </svg>
          </div>
          <div class="nga-text">NGA</div>
          <div class="issue-section">
            <div class="issue-label">Issue Date</div>
            <div class="issue-value">${issueDate || '01 JAN 2021'}</div>
          </div>
        </div>
      </div>
      
      <div class="nin-section">
        <div class="nin-label">National Identification Number (NIN)</div>
        <div class="nin-value">${formatNIN(data.id) || '0000 000 0000'}</div>
      </div>
    </div>
  </div>
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
