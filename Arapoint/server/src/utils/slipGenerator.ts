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

const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const escapeHtml = (str: string): string => {
  if (!str) return 'N/A';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatNIN = (nin: string): string => {
  if (!nin) return 'N/A';
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
    .coat-of-arms { width: 60px; height: 60px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23008751"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="20">🇳🇬</text></svg>'); background-size: contain; }
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
        <div class="info-row"><span class="info-label">Date of birth:</span><span class="info-value">${formatDateLong(data.dateOfBirth)}</span></div>
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
        <div style="text-align: center; font-size: 11px; color: #666;">
          This is a property of National Identity Management Commission (NIMC), Nigeria.<br>
          If found, please return to the nearest NIMC's office or contact +234 815 769 1214
        </div>
      </div>
    </div>
    
    <div class="notice">
      <p>1. This NIN slip remains the property of the Federal Republic of Nigeria, and MUST be surrendered on demand;</p>
      <p>2. This NIN slip does not imply nor confer citizenship of the Federal Republic of Nigeria on the individual the document is issued to;</p>
      <p>3. This NIN slip is valid for the lifetime of the holder and <span class="highlight">DOES NOT EXPIRE</span>.</p>
    </div>
    
    <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #666;">
      Reference: ${reference} | Generated: ${new Date(generatedAt).toLocaleString('en-NG')} | Powered by Arapoint
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateRegularSlip(data: NINData, reference: string, generatedAt: string): string {
  const trackingId = reference.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Long Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 8.5in 14in; margin: 0; }
    body { font-family: 'Arial', sans-serif; background: #fff; margin: 0; padding: 0; }
    .slip { width: 100%; max-width: 612px; min-height: 1008px; margin: 0 auto; background: #fff; position: relative; padding: 40px 30px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #008751; }
    .coat-of-arms { width: 80px; height: 80px; margin: 0 auto 15px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23008751"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="30" font-weight="bold">NG</text></svg>'); background-size: contain; background-repeat: no-repeat; }
    .header h1 { font-size: 22px; color: #008751; margin-bottom: 5px; letter-spacing: 2px; }
    .header h2 { font-size: 16px; color: #333; font-weight: normal; }
    .header h3 { font-size: 14px; color: #666; margin-top: 5px; }
    .content { display: flex; gap: 30px; margin-bottom: 30px; }
    .photo-section { flex-shrink: 0; text-align: center; }
    .photo { width: 150px; height: 180px; border: 3px solid #008751; object-fit: cover; background: #f5f5f5; }
    .photo-label { font-size: 10px; color: #666; margin-top: 5px; }
    .info-section { flex: 1; }
    .tracking-row { background: #f0f0f0; padding: 10px 15px; margin-bottom: 15px; border-left: 4px solid #008751; }
    .tracking-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .tracking-value { font-size: 16px; font-weight: bold; color: #1a1a1a; font-family: 'Courier New', monospace; letter-spacing: 2px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .field { margin-bottom: 12px; }
    .field-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
    .field-value { font-size: 14px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .full-width { grid-column: span 2; }
    .nin-section { background: linear-gradient(135deg, #008751 0%, #006341 100%); padding: 20px; text-align: center; margin: 30px 0; }
    .nin-label { font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 8px; }
    .nin-value { font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .address-section { background: #f9f9f9; padding: 15px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
    .address-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .address-value { font-size: 13px; color: #333; line-height: 1.5; }
    .footer-notes { font-size: 10px; color: #666; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    .footer-notes p { margin-bottom: 8px; }
    .footer-notes .warning { color: #c62828; font-weight: bold; }
    .qr-section { position: absolute; bottom: 40px; right: 30px; text-align: center; }
    .qr-code { width: 80px; height: 80px; border: 1px solid #ccc; background: #fff; }
    @media print { body { background: white; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="coat-of-arms"></div>
      <h1>FEDERAL REPUBLIC OF NIGERIA</h1>
      <h2>National Identity Management Commission</h2>
      <h3>National Identification Number (NIN) Slip</h3>
    </div>
    
    <div class="content">
      <div class="photo-section">
        ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Photo</div>'}
        <div class="photo-label">Passport Photograph</div>
      </div>
      
      <div class="info-section">
        <div class="tracking-row">
          <div class="tracking-label">Tracking ID</div>
          <div class="tracking-value">${trackingId}</div>
        </div>
        
        <div class="info-grid">
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
          <div class="field">
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${formatDate(data.dateOfBirth)}</div>
          </div>
          <div class="field">
            <div class="field-label">Gender</div>
            <div class="field-value">${escapeHtml(data.gender)}</div>
          </div>
          <div class="field">
            <div class="field-label">State of Origin</div>
            <div class="field-value">${escapeHtml(data.birthState)}</div>
          </div>
          <div class="field">
            <div class="field-label">LGA of Origin</div>
            <div class="field-value">${escapeHtml(data.birthLga)}</div>
          </div>
          <div class="field">
            <div class="field-label">Nationality</div>
            <div class="field-value">${escapeHtml(data.nationality || 'NIGERIA')}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="nin-section">
      <div class="nin-label">National Identification Number (NIN)</div>
      <div class="nin-value">${escapeHtml(data.id)}</div>
    </div>
    
    <div class="address-section">
      <div class="address-label">Residence Address</div>
      <div class="address-value">
        ${escapeHtml(data.address) || 'N/A'}<br>
        ${escapeHtml(data.town) || ''} ${escapeHtml(data.lga) || ''}<br>
        ${escapeHtml(data.state) || ''}, Nigeria
      </div>
    </div>
    
    <div class="info-grid" style="margin-top: 20px;">
      <div class="field">
        <div class="field-label">Phone Number</div>
        <div class="field-value">${escapeHtml(data.phone) || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Email Address</div>
        <div class="field-value" style="text-transform: lowercase;">${escapeHtml(data.email) || 'N/A'}</div>
      </div>
    </div>
    
    <div class="footer-notes">
      <p>1. This NIN slip remains the property of the Federal Republic of Nigeria, and MUST be surrendered on demand.</p>
      <p>2. This NIN slip does not imply nor confer citizenship of the Federal Republic of Nigeria on the individual the document is issued to.</p>
      <p class="warning">3. This NIN slip is valid for the lifetime of the holder and DOES NOT EXPIRE.</p>
      <p style="margin-top: 15px; text-align: center;">
        Reference: ${reference} | Generated: ${new Date(generatedAt).toLocaleString('en-NG')}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateStandardSlip(data: NINData, reference: string, generatedAt: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Standard Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #f0f0f0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .slip { width: 400px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #ddd; }
    .header { background: #fff; padding: 15px 20px; text-align: center; border-bottom: 2px solid #008751; }
    .header-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .coat-arms { width: 40px; height: 40px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23008751"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="25" font-weight="bold">NG</text></svg>'); background-size: contain; }
    .header-text h1 { font-size: 12px; color: #008751; letter-spacing: 1px; }
    .header-text h2 { font-size: 10px; color: #666; font-weight: normal; }
    .content { padding: 25px 20px; display: flex; gap: 20px; }
    .photo { width: 100px; height: 120px; border: 2px solid #008751; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .info { flex: 1; }
    .name-section { margin-bottom: 15px; }
    .surname { font-size: 24px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; line-height: 1.2; }
    .firstname { font-size: 20px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
    .dob-section { background: #f9f9f9; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
    .dob-label { font-size: 9px; color: #666; text-transform: uppercase; }
    .dob-value { font-size: 16px; font-weight: bold; color: #1a1a1a; }
    .nin-section { background: #008751; padding: 15px; text-align: center; }
    .nin-value { font-size: 28px; font-weight: bold; color: #fff; letter-spacing: 4px; font-family: 'Courier New', monospace; }
    .footer { background: #f5f5f5; padding: 10px 20px; text-align: center; font-size: 9px; color: #666; }
    @media print { body { background: white; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="header-row">
        <div class="coat-arms"></div>
        <div class="header-text">
          <h1>FEDERAL REPUBLIC OF NIGERIA</h1>
          <h2>National Identification Number Slip</h2>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px;">Photo</div>'}
      
      <div class="info">
        <div class="name-section">
          <div class="surname">${escapeHtml(data.lastName)}</div>
          <div class="firstname">${escapeHtml(data.firstName)}</div>
        </div>
        
        <div class="dob-section">
          <div class="dob-label">Date of Birth</div>
          <div class="dob-value">${formatDate(data.dateOfBirth)}</div>
        </div>
      </div>
    </div>
    
    <div class="nin-section">
      <div class="nin-value">${formatNIN(data.id)}</div>
    </div>
    
    <div class="footer">
      ${reference} | ${new Date(generatedAt).toLocaleDateString('en-NG')}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generatePremiumSlip(data: NINData, reference: string, generatedAt: string): string {
  const issueDate = formatDate(new Date().toISOString());
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIN Premium Slip - ${reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 8.5in 14in; margin: 0; }
    body { font-family: 'Arial', sans-serif; background: #2d5a27; padding: 20px; min-height: 100vh; }
    .slip { width: 100%; max-width: 612px; min-height: 950px; margin: 0 auto; background: linear-gradient(180deg, #1a472a 0%, #2d5a27 20%, #3d7a37 50%, #2d5a27 80%, #1a472a 100%); position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
    .decorative-border { position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 2px solid rgba(255,255,255,0.2); border-radius: 6px; pointer-events: none; }
    .inner-content { padding: 40px 35px; position: relative; z-index: 1; }
    .header { text-align: center; margin-bottom: 30px; }
    .coat-of-arms { width: 90px; height: 90px; margin: 0 auto 15px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700" stroke="%23fff" stroke-width="2"/><text x="50" y="60" text-anchor="middle" fill="%231a472a" font-size="30" font-weight="bold">NG</text></svg>'); background-size: contain; background-repeat: no-repeat; }
    .header h1 { font-size: 24px; color: #ffd700; margin-bottom: 5px; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
    .header h2 { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: normal; letter-spacing: 1px; }
    .header h3 { font-size: 16px; color: #fff; margin-top: 10px; font-weight: bold; }
    .main-content { display: flex; gap: 25px; margin-bottom: 25px; }
    .photo-section { flex-shrink: 0; text-align: center; }
    .photo { width: 160px; height: 190px; border: 4px solid #ffd700; object-fit: cover; background: #f5f5f5; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .photo-label { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 8px; }
    .info-section { flex: 1; }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .field-value { font-size: 16px; font-weight: bold; color: #fff; text-transform: uppercase; }
    .field-row { display: flex; gap: 20px; }
    .field-row .field { flex: 1; }
    .nin-section { background: rgba(255,215,0,0.15); border: 2px solid #ffd700; padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .nin-label { font-size: 11px; color: rgba(255,255,255,0.9); margin-bottom: 8px; letter-spacing: 1px; }
    .nin-value { font-size: 42px; font-weight: bold; color: #ffd700; letter-spacing: 6px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .address-section { background: rgba(255,255,255,0.1); padding: 15px; margin-bottom: 20px; border-radius: 6px; }
    .address-label { font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; margin-bottom: 5px; }
    .address-value { font-size: 13px; color: #fff; line-height: 1.5; }
    .contact-row { display: flex; gap: 20px; margin-bottom: 20px; }
    .contact-field { flex: 1; background: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px; }
    .footer-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); }
    .footer-notes { font-size: 10px; color: rgba(255,255,255,0.8); line-height: 1.6; }
    .footer-notes p { margin-bottom: 6px; }
    .footer-notes .warning { color: #ffd700; font-weight: bold; }
    .reference-footer { text-align: center; margin-top: 20px; font-size: 10px; color: rgba(255,255,255,0.6); }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 200px; color: rgba(255,255,255,0.03); font-weight: bold; pointer-events: none; }
    @media print { body { background: white; padding: 0; } .slip { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="decorative-border"></div>
    <div class="watermark">NIMC</div>
    
    <div class="inner-content">
      <div class="header">
        <div class="coat-of-arms"></div>
        <h1>FEDERAL REPUBLIC OF NIGERIA</h1>
        <h2>National Identity Management Commission</h2>
        <h3>Premium NIN Slip</h3>
      </div>
      
      <div class="main-content">
        <div class="photo-section">
          ${data.photo ? `<img src="data:image/jpeg;base64,${data.photo}" alt="Photo" class="photo">` : '<div class="photo" style="display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">Photo</div>'}
          <div class="photo-label">Passport Photograph</div>
        </div>
        
        <div class="info-section">
          <div class="field">
            <div class="field-label">Surname / Nom</div>
            <div class="field-value">${escapeHtml(data.lastName)}</div>
          </div>
          <div class="field">
            <div class="field-label">First Name / Prénom</div>
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
              <div class="field-label">Gender / Sexe</div>
              <div class="field-value">${escapeHtml(data.gender)}</div>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">State of Origin</div>
              <div class="field-value">${escapeHtml(data.birthState)}</div>
            </div>
            <div class="field">
              <div class="field-label">LGA of Origin</div>
              <div class="field-value">${escapeHtml(data.birthLga)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="nin-section">
        <div class="nin-label">NATIONAL IDENTIFICATION NUMBER (NIN)</div>
        <div class="nin-value">${escapeHtml(data.id)}</div>
      </div>
      
      <div class="address-section">
        <div class="address-label">Residence Address</div>
        <div class="address-value">
          ${escapeHtml(data.address) || 'N/A'}<br>
          ${escapeHtml(data.town) || ''} ${escapeHtml(data.lga) || ''}, ${escapeHtml(data.state) || ''}<br>
          Nigeria
        </div>
      </div>
      
      <div class="contact-row">
        <div class="contact-field">
          <div class="field-label">Phone Number</div>
          <div class="field-value" style="font-size: 14px;">${escapeHtml(data.phone) || 'N/A'}</div>
        </div>
        <div class="contact-field">
          <div class="field-label">Email Address</div>
          <div class="field-value" style="font-size: 12px; text-transform: lowercase;">${escapeHtml(data.email) || 'N/A'}</div>
        </div>
      </div>
      
      <div class="footer-section">
        <div class="footer-notes">
          <p>1. This NIN slip remains the property of the Federal Republic of Nigeria, and MUST be surrendered on demand.</p>
          <p>2. This NIN slip does not imply nor confer citizenship of the Federal Republic of Nigeria on the individual.</p>
          <p class="warning">3. This NIN slip is valid for the lifetime of the holder and DOES NOT EXPIRE.</p>
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
