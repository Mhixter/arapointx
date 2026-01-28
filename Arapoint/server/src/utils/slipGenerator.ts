import { NINData, BVNData } from '../services/premblyService';

interface SlipData {
  html: string;
  reference: string;
  type: 'nin' | 'bvn';
  generatedAt: string;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return dateStr;
  }
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
  <title>NIN Verification Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
    .slip { max-width: 900px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #008751; padding-bottom: 15px; margin-bottom: 25px; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .coat-of-arms { width: 60px; height: 60px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23008751"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="20">NG</text></svg>'); background-size: contain; }
    .header-title { text-align: center; flex: 1; }
    .header-title h1 { color: #008751; font-size: 22px; margin-bottom: 5px; }
    .header-title h2 { color: #333; font-size: 18px; }
    .nimc-logo { font-weight: bold; color: #008751; font-size: 24px; }
    .content { display: flex; gap: 30px; }
    .info-section { flex: 1; }
    .info-row { display: flex; margin-bottom: 12px; }
    .info-label { font-weight: bold; width: 140px; color: #333; }
    .info-value { flex: 1; color: #000; }
    .photo-section { display: flex; flex-direction: column; align-items: center; gap: 15px; }
    .photo { width: 120px; height: 150px; border: 2px solid #008751; border-radius: 5px; object-fit: cover; background: #f0f0f0; }
    .verified-badge { background: #e8f5e9; color: #2e7d32; padding: 10px 25px; border-radius: 5px; font-weight: bold; font-size: 18px; }
    .notice { margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #008751; font-size: 12px; }
    .notice p { margin-bottom: 8px; }
    .notice .highlight { color: #c62828; font-weight: bold; }
    @media print { .slip { border: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="header-left">
        <div class="coat-of-arms"></div>
      </div>
      <div class="header-title">
        <h1>Federal Republic of Nigeria</h1>
        <h2>Verified NIN Details</h2>
      </div>
      <div class="nimc-logo">NIMC</div>
    </div>
    
    <div class="content">
      <div class="info-section">
        <div class="info-row"><span class="info-label">First Name:</span><span class="info-value">${escapeHtml(data.firstName)}</span></div>
        <div class="info-row"><span class="info-label">Middle Name:</span><span class="info-value">${escapeHtml(data.middleName)}</span></div>
        <div class="info-row"><span class="info-label">Last Name:</span><span class="info-value">${escapeHtml(data.lastName)}</span></div>
        <div class="info-row"><span class="info-label">Date of birth:</span><span class="info-value">${formatDateShort(data.dateOfBirth)}</span></div>
        <div class="info-row"><span class="info-label">Gender:</span><span class="info-value">${escapeHtml(data.gender)}</span></div>
        <div class="info-row"><span class="info-label">NIN Number:</span><span class="info-value" style="font-weight: bold; font-size: 16px;">${escapeHtml(data.id)}</span></div>
        <div class="info-row"><span class="info-label">Tracking ID:</span><span class="info-value">${escapeHtml(reference)}</span></div>
        <div class="info-row"><span class="info-label">Phone Number:</span><span class="info-value">${escapeHtml(data.phone)}</span></div>
        <div class="info-row"><span class="info-label">Residence State:</span><span class="info-value">${escapeHtml(data.state)}</span></div>
        <div class="info-row"><span class="info-label">Residence LGA/Town:</span><span class="info-value">${escapeHtml(data.lga)} / ${escapeHtml(data.town)}</span></div>
        <div class="info-row"><span class="info-label">Birth State:</span><span class="info-value">${escapeHtml(data.birthState)}</span></div>
        <div class="info-row"><span class="info-label">Birth LGA:</span><span class="info-value">${escapeHtml(data.birthLga)}</span></div>
        <div class="info-row"><span class="info-label">Address:</span><span class="info-value">${escapeHtml(data.address)}</span></div>
      </div>
      
      <div class="photo-section">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999;">No Photo</div>'}
        <div class="verified-badge">Verified</div>
      </div>
    </div>
    
    <div class="notice">
      <p>1. This NIN slip remains the property of the Federal Republic of Nigeria, and MUST be surrendered on demand;</p>
      <p>2. This NIN slip does not imply nor confer citizenship of the Federal Republic of Nigeria on the individual;</p>
      <p>3. This NIN slip is valid for the lifetime of the holder and <span class="highlight">DOES NOT EXPIRE</span>.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateRegularSlip(data: NINData, reference: string, generatedAt: string): string {
  const trackingId = reference.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16);
  const issueDate = formatDateShort(new Date().toISOString()).replace(/ /g, '/');
  
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
    .slip { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(to bottom, #fff8e1 0%, #fff 100%); padding: 20px 30px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0e0; }
    .coat-of-arms { width: 70px; height: 70px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><ellipse cx="50" cy="60" rx="40" ry="50" fill="%23006400"/><circle cx="50" cy="40" r="15" fill="%23c41e3a"/><rect x="35" y="55" width="30" height="40" fill="%23333"/><text x="50" y="100" text-anchor="middle" fill="%23fff" font-size="8">UNITY</text></svg>'); background-size: contain; background-repeat: no-repeat; }
    .header-center { text-align: center; flex: 1; }
    .header-center h1 { font-size: 24px; color: #1a472a; margin-bottom: 5px; }
    .header-center h2 { font-size: 14px; color: #333; font-weight: normal; }
    .header-center h3 { font-size: 13px; color: #666; font-style: italic; }
    .nimc-logo { text-align: right; }
    .nimc-logo span { font-size: 28px; font-weight: bold; color: #1a472a; font-style: italic; }
    .nimc-logo small { display: block; font-size: 9px; color: #666; }
    .content { padding: 20px 30px; }
    .main-grid { display: grid; grid-template-columns: 200px 1fr 180px; gap: 20px; }
    .left-col { }
    .field-group { margin-bottom: 12px; }
    .field-label { font-size: 11px; color: #666; font-weight: bold; }
    .field-value { font-size: 14px; color: #333; }
    .nin-box { border: 2px solid #c41e3a; border-radius: 50%; padding: 8px 15px; display: inline-block; margin-top: 5px; }
    .nin-box .field-value { color: #c41e3a; font-weight: bold; }
    .center-col { border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; padding: 0 20px; }
    .right-col { }
    .photo { width: 150px; height: 180px; border: 2px solid #1a472a; object-fit: cover; background: #f0f0f0; }
    .address-section { margin-top: 10px; }
    .note-section { margin-top: 20px; padding: 15px; background: #fffde7; border-top: 1px solid #e0e0e0; }
    .note-section p { font-size: 11px; color: #333; }
    .note-section strong { color: #1a472a; }
    .footer { background: #f5f5f5; padding: 15px 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; border-top: 1px solid #e0e0e0; }
    .footer-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #333; }
    .footer-item .icon { width: 24px; height: 24px; background: #1a472a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; }
    .nimc-footer { text-align: right; }
    .nimc-footer h4 { font-size: 12px; color: #1a472a; margin-bottom: 3px; }
    .nimc-footer p { font-size: 9px; color: #666; }
    @media print { body { background: white; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="coat-of-arms"></div>
      <div class="header-center">
        <h1>National Identity Management System</h1>
        <h2>Federal Republic of Nigeria</h2>
        <h3>National Identification Number Slip (NINS)</h3>
      </div>
      <div class="nimc-logo">
        <span>Nimc</span>
        <small>Promoting Digital Identity</small>
      </div>
    </div>
    
    <div class="content">
      <div class="main-grid">
        <div class="left-col">
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
        </div>
        
        <div class="center-col">
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
            <div class="field-value">${escapeHtml(data.gender)}</div>
          </div>
        </div>
        
        <div class="right-col">
          <div class="field-group">
            <div class="field-label">Address:</div>
            <div class="field-value">${escapeHtml(data.address) || 'N/A'}</div>
          </div>
          <div class="address-section">
            <div class="field-value">${escapeHtml(data.lga) || ''} ${escapeHtml(data.town) || ''}</div>
            <div class="field-value">${escapeHtml(data.state) || ''}</div>
          </div>
          <div style="margin-top: 15px;">
            ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Photo</div>'}
          </div>
        </div>
      </div>
    </div>
    
    <div class="note-section">
      <p><strong>Note:</strong> This transaction slip does not confer the right to the <strong>General Multipurpose Card</strong> (For any enquiry please contact)</p>
    </div>
    
    <div class="footer">
      <div class="footer-item">
        <div class="icon">@</div>
        <span>helpdesk@nimc.gov.ng</span>
      </div>
      <div class="footer-item">
        <div class="icon">W</div>
        <span>www.nimc.gov.ng</span>
      </div>
      <div class="footer-item">
        <div class="icon">T</div>
        <span>07040144452, 07040144453</span>
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
    body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 550px; background: #fff; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; position: relative; padding: 30px; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; pointer-events: none; }
    .watermark img, .watermark svg { width: 300px; height: auto; }
    .coat-of-arms { width: 80px; height: 90px; margin: 0 auto 20px; display: block; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><ellipse cx="50" cy="60" rx="35" ry="45" fill="%23228b22"/><circle cx="50" cy="35" r="12" fill="%23c41e3a"/><path d="M25 60 L50 90 L75 60" fill="%23333"/><circle cx="30" cy="50" r="8" fill="%23ffd700"/><circle cx="70" cy="50" r="8" fill="%23ffd700"/><text x="50" y="110" text-anchor="middle" fill="%23228b22" font-size="7" font-weight="bold">UNITY AND FAITH</text></svg>'); background-size: contain; background-repeat: no-repeat; background-position: center; }
    .content { display: flex; gap: 25px; position: relative; z-index: 1; }
    .photo-section { flex-shrink: 0; }
    .photo { width: 120px; height: 150px; border: 2px solid #ccc; object-fit: cover; background: #e0e0e0; }
    .info-section { flex: 1; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 11px; color: #666; font-style: italic; }
    .field-value { font-size: 16px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .right-section { text-align: right; }
    .nga-code { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 5px; }
    .nga-numbers { font-size: 10px; color: #999; letter-spacing: 1px; }
    .qr-code { width: 100px; height: 100px; margin: 10px 0; border: 1px solid #ccc; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23fff" width="100" height="100"/><rect fill="%23000" x="10" y="10" width="25" height="25"/><rect fill="%23fff" x="15" y="15" width="15" height="15"/><rect fill="%23000" x="18" y="18" width="9" height="9"/><rect fill="%23000" x="65" y="10" width="25" height="25"/><rect fill="%23fff" x="70" y="15" width="15" height="15"/><rect fill="%23000" x="73" y="18" width="9" height="9"/><rect fill="%23000" x="10" y="65" width="25" height="25"/><rect fill="%23fff" x="15" y="70" width="15" height="15"/><rect fill="%23000" x="18" y="73" width="9" height="9"/><rect fill="%23000" x="40" y="40" width="5" height="5"/><rect fill="%23000" x="50" y="40" width="5" height="5"/><rect fill="%23000" x="45" y="50" width="5" height="5"/><rect fill="%23000" x="55" y="55" width="5" height="5"/><rect fill="%23000" x="65" y="45" width="5" height="5"/><rect fill="%23000" x="70" y="55" width="5" height="5"/><rect fill="%23000" x="80" y="65" width="5" height="5"/><rect fill="%23000" x="65" y="75" width="5" height="5"/><rect fill="%23000" x="75" y="80" width="5" height="5"/></svg>'); background-size: contain; }
    .issue-date { margin-top: 10px; }
    .issue-label { font-size: 10px; color: #c41e3a; font-weight: bold; }
    .issue-value { font-size: 14px; color: #333; }
    .nin-section { margin-top: 25px; text-align: center; position: relative; z-index: 1; }
    .nin-label { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .nin-value { font-size: 42px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    @media print { body { background: white; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="watermark">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
        <ellipse cx="50" cy="60" rx="35" ry="45" fill="#228b22"/>
        <circle cx="50" cy="35" r="12" fill="#c41e3a"/>
        <path d="M25 60 L50 90 L75 60" fill="#333"/>
      </svg>
    </div>
    
    <div class="coat-of-arms"></div>
    
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
        <div class="qr-code"></div>
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

function generatePremiumSlip(data: NINData, reference: string, generatedAt: string): string {
  const issueDate = formatDateShort(new Date().toISOString());
  const gender = data.gender?.charAt(0).toUpperCase() || 'M';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Premium Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #1a472a; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 600px; height: 380px; background: linear-gradient(135deg, #2d5a27 0%, #3d7a37 30%, #4a8f44 50%, #3d7a37 70%, #2d5a27 100%); border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); overflow: hidden; position: relative; padding: 20px 25px; }
    .pattern-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><text x="5" y="30" fill="rgba(255,255,255,0.03)" font-size="8">00000000000</text></svg>'); pointer-events: none; }
    .header { position: relative; z-index: 1; }
    .header-top { background: linear-gradient(90deg, #1a472a 0%, #2d5a27 50%, #1a472a 100%); margin: -20px -25px 15px; padding: 12px 25px; }
    .header-title { color: #fff; font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 3px; }
    .sub-header { background: #1a472a; color: #fff; font-size: 12px; text-align: center; padding: 5px; margin: -15px -25px 15px; letter-spacing: 1px; }
    .content { display: flex; gap: 20px; position: relative; z-index: 1; }
    .left-section { flex-shrink: 0; }
    .photo { width: 110px; height: 130px; border: 3px solid rgba(255,255,255,0.3); object-fit: cover; background: #ccc; }
    .center-section { flex: 1; color: #fff; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .field-row { display: flex; gap: 20px; }
    .field-row .field { flex: 1; }
    .right-section { text-align: right; color: #fff; }
    .nga-code { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
    .qr-code { width: 90px; height: 90px; margin-left: auto; border: 2px solid rgba(255,255,255,0.3); background: #fff url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23fff" width="100" height="100"/><rect fill="%23000" x="10" y="10" width="25" height="25"/><rect fill="%23fff" x="15" y="15" width="15" height="15"/><rect fill="%23000" x="18" y="18" width="9" height="9"/><rect fill="%23000" x="65" y="10" width="25" height="25"/><rect fill="%23fff" x="70" y="15" width="15" height="15"/><rect fill="%23000" x="73" y="18" width="9" height="9"/><rect fill="%23000" x="10" y="65" width="25" height="25"/><rect fill="%23fff" x="15" y="70" width="15" height="15"/><rect fill="%23000" x="18" y="73" width="9" height="9"/><rect fill="%23000" x="40" y="40" width="5" height="5"/><rect fill="%23000" x="50" y="40" width="5" height="5"/><rect fill="%23000" x="45" y="50" width="5" height="5"/><rect fill="%23000" x="55" y="55" width="5" height="5"/><rect fill="%23000" x="65" y="45" width="5" height="5"/><rect fill="%23000" x="70" y="55" width="5" height="5"/></svg>'); background-size: contain; }
    .issue-date { margin-top: 8px; }
    .issue-label { font-size: 9px; color: rgba(255,255,255,0.7); }
    .issue-value { font-size: 12px; font-weight: bold; }
    .nin-section { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%); padding: 15px 25px; text-align: center; }
    .nin-label { font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 5px; }
    .nin-value { font-size: 36px; font-weight: bold; color: #fff; letter-spacing: 10px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    @media print { body { background: white; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="pattern-overlay"></div>
    
    <div class="header">
      <div class="header-top">
        <div class="header-title">FEDERAL REPUBLIC OF NIGERIA</div>
      </div>
      <div class="sub-header">DIGITAL NIN SLIP</div>
    </div>
    
    <div class="content">
      <div class="left-section">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #666; font-size: 11px;">Photo</div>'}
      </div>
      
      <div class="center-section">
        <div class="field">
          <div class="field-label">Surname/Nom</div>
          <div class="field-value">${escapeHtml(data.lastName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Given Names/Prénoms</div>
          <div class="field-value">${escapeHtml(data.firstName)}${data.middleName ? ', ' + escapeHtml(data.middleName) : ''}</div>
        </div>
        <div class="field-row">
          <div class="field">
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${formatDateShort(data.dateOfBirth)}</div>
          </div>
          <div class="field">
            <div class="field-label">Sex/Sexe</div>
            <div class="field-value">${gender}</div>
          </div>
        </div>
      </div>
      
      <div class="right-section">
        <div class="nga-code">NGA</div>
        <div class="qr-code"></div>
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
  <title>BVN Standard Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #f0f0f0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 420px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #ddd; }
    .header { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); padding: 15px 20px; text-align: center; }
    .header h1 { font-size: 14px; color: #fff; letter-spacing: 1px; margin-bottom: 3px; }
    .header h2 { font-size: 11px; color: rgba(255,255,255,0.9); font-weight: normal; }
    .content { padding: 25px 20px; display: flex; gap: 20px; }
    .photo { width: 100px; height: 120px; border: 2px solid #1565c0; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .info { flex: 1; }
    .name-section { margin-bottom: 15px; }
    .surname { font-size: 22px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; line-height: 1.2; }
    .firstname { font-size: 18px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 9px; color: #666; text-transform: uppercase; }
    .field-value { font-size: 13px; font-weight: bold; color: #1a1a1a; }
    .bvn-section { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); padding: 15px; text-align: center; }
    .bvn-label { font-size: 10px; color: rgba(255,255,255,0.9); margin-bottom: 5px; }
    .bvn-value { font-size: 26px; font-weight: bold; color: #fff; letter-spacing: 3px; font-family: 'Courier New', monospace; }
    .footer { background: #f5f5f5; padding: 10px 20px; text-align: center; font-size: 9px; color: #666; }
    @media print { body { background: white; } .slip { box-shadow: none; } }
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
          <div class="field-value">${formatDate(data.dateOfBirth)}</div>
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
    
    <div class="footer">
      ${reference} | ${new Date(generatedAt).toLocaleDateString('en-NG')}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateBVNPremiumSlip(data: BVNData, reference: string, generatedAt: string): string {
  const issueDate = formatDate(new Date().toISOString());
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BVN Premium Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #0d47a1; padding: 20px; min-height: 100vh; }
    .slip { width: 100%; max-width: 600px; min-height: 800px; margin: 0 auto; background: linear-gradient(180deg, #0d47a1 0%, #1565c0 30%, #1976d2 60%, #1565c0 100%); position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
    .decorative-border { position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 2px solid rgba(255,255,255,0.2); border-radius: 6px; pointer-events: none; }
    .inner-content { padding: 35px 30px; position: relative; z-index: 1; }
    .header { text-align: center; margin-bottom: 25px; }
    .cbn-logo { width: 80px; height: 80px; margin: 0 auto 15px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700" stroke="%23fff" stroke-width="2"/><text x="50" y="55" text-anchor="middle" fill="%230d47a1" font-size="20" font-weight="bold">CBN</text></svg>'); background-size: contain; background-repeat: no-repeat; }
    .header h1 { font-size: 20px; color: #ffd700; margin-bottom: 5px; letter-spacing: 2px; }
    .header h2 { font-size: 12px; color: rgba(255,255,255,0.9); font-weight: normal; }
    .header h3 { font-size: 14px; color: #fff; margin-top: 8px; font-weight: bold; }
    .main-content { display: flex; gap: 25px; margin-bottom: 25px; }
    .photo-section { flex-shrink: 0; text-align: center; }
    .photo { width: 140px; height: 170px; border: 3px solid #ffd700; object-fit: cover; background: #f5f5f5; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .info-section { flex: 1; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .field-value { font-size: 15px; font-weight: bold; color: #fff; text-transform: uppercase; }
    .field-row { display: flex; gap: 15px; }
    .field-row .field { flex: 1; }
    .bvn-section { background: rgba(255,215,0,0.15); border: 2px solid #ffd700; padding: 18px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .bvn-label { font-size: 10px; color: rgba(255,255,255,0.9); margin-bottom: 6px; letter-spacing: 1px; }
    .bvn-value { font-size: 36px; font-weight: bold; color: #ffd700; letter-spacing: 5px; font-family: 'Courier New', monospace; }
    .enrollment-section { background: rgba(255,255,255,0.1); padding: 12px; margin-bottom: 15px; border-radius: 6px; }
    .footer-section { margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); }
    .footer-notes { font-size: 9px; color: rgba(255,255,255,0.8); line-height: 1.5; }
    .footer-notes p { margin-bottom: 5px; }
    .reference-footer { text-align: center; margin-top: 15px; font-size: 9px; color: rgba(255,255,255,0.6); }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 150px; color: rgba(255,255,255,0.03); font-weight: bold; pointer-events: none; }
    @media print { body { background: white; padding: 0; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="decorative-border"></div>
    <div class="watermark">BVN</div>
    
    <div class="inner-content">
      <div class="header">
        <div class="cbn-logo"></div>
        <h1>CENTRAL BANK OF NIGERIA</h1>
        <h2>Bank Verification Number System</h2>
        <h3>Premium BVN Slip</h3>
      </div>
      
      <div class="main-content">
        <div class="photo-section">
          ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">Photo</div>'}
        </div>
        
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
              <div class="field-value">${formatDate(data.dateOfBirth)}</div>
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
      
      <div class="enrollment-section">
        <div class="field-row">
          <div class="field">
            <div class="field-label">Enrollment Bank</div>
            <div class="field-value" style="font-size: 12px;">${escapeHtml(data.enrollmentInstitution) || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Registration Date</div>
            <div class="field-value" style="font-size: 12px;">${formatDate(data.registrationDate || '')}</div>
          </div>
        </div>
      </div>
      
      <div class="footer-section">
        <div class="footer-notes">
          <p>This BVN slip is issued by the Central Bank of Nigeria through an authorized financial institution.</p>
          <p>The BVN is a unique identifier for banking transactions in Nigeria.</p>
        </div>
        
        <div class="reference-footer">
          Issue Date: ${issueDate} | Reference: ${reference} | Generated: ${new Date(generatedAt).toLocaleString('en-NG')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
