import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletService } from '../../services/walletService';
import { youverifyService } from '../../services/youverifyService';
import { premblyService } from '../../services/premblyService';
import { techhubService } from '../../services/techhubService';
import { virtualAccountService } from '../../services/virtualAccountService';
import { generateNINSlip } from '../../utils/slipGenerator';
import { generatePdfSlip, SlipData } from '../../services/pdfSlipGenerator';
import { ninLookupSchema, ninPhoneSchema, lostNinSchema } from '../validators/identity';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse, generateReferenceId } from '../../utils/helpers';
import { db } from '../../config/database';
import { identityVerifications, identityServiceRequests, servicePricing } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const getConfiguredProviders = (): ('techhub' | 'prembly' | 'youverify')[] => {
  const providers: ('techhub' | 'prembly' | 'youverify')[] = [];
  if (premblyService.isConfigured()) providers.push('prembly');
  if (techhubService.isConfigured()) providers.push('techhub');
  if (youverifyService.isConfigured()) providers.push('youverify');
  if (providers.length === 0) throw new Error('No identity verification provider configured');
  return providers;
};

const isRealValue = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim().toLowerCase();
  return v.length > 0 && v !== 'n/a' && v !== 'unknown' && v !== 'null' && v !== 'undefined' && v !== 'none';
};

const hasValidVerificationData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  const hasFirstName = isRealValue(data.firstName) || isRealValue(data.firstname) || isRealValue(data.first_name);
  const hasLastName = isRealValue(data.lastName) || isRealValue(data.surname) || isRealValue(data.last_name);
  const hasName = hasFirstName || hasLastName;
  if (!hasName) return false;
  const hasDob = isRealValue(data.dateOfBirth) || isRealValue(data.dob) || isRealValue(data.birthdate) || isRealValue(data.date_of_birth);
  const hasId = isRealValue(data.id) || isRealValue(data.nin) || isRealValue(data.NIN);
  return hasDob || hasId;
};

const verifyNINWithFallback = async (nin: string): Promise<{ success: boolean; data?: any; error?: string; reference: string; provider: string; techhubSlipHtml?: string; rawResponse?: any; slipHtml?: string }> => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  let techhubSlipHtml: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting NIN verification', { provider, nin: nin.substring(0, 4) + '***' });
      let result;
      
      if (provider === 'techhub') {
        result = await techhubService.verifyNIN(nin);
        if (result.slipHtml) {
          techhubSlipHtml = result.slipHtml;
        }
      } else if (provider === 'prembly') {
        result = await premblyService.verifyNIN(nin);
      } else {
        result = await youverifyService.verifyNIN(nin);
      }
      
      if (result.success && result.data && hasValidVerificationData(result.data)) {
        return { ...result, provider, techhubSlipHtml };
      }
      if (result.success && result.data && !hasValidVerificationData(result.data)) {
        lastError = 'No record found for the provided NIN. Please double-check and try again.';
        logger.warn('Provider returned empty data', { provider });
      } else {
        lastError = result.error;
      }
      logger.warn('Provider verification failed, trying next', { provider, error: lastError });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const verifyVNINWithFallback = async (vnin: string, validationData?: { firstName?: string; lastName?: string; dateOfBirth?: string }): Promise<{ success: boolean; data?: any; error?: string; reference: string; provider: string }> => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting vNIN verification', { provider });
      let result;
      
      if (provider === 'techhub') {
        result = await techhubService.verifyVNIN(vnin, validationData);
      } else if (provider === 'prembly') {
        result = await premblyService.verifyVNIN(vnin, validationData);
      } else {
        result = await youverifyService.verifyVNIN(vnin, validationData);
      }
      
      if (result.success && result.data && hasValidVerificationData(result.data)) {
        return { ...result, provider };
      }
      if (result.success && result.data && !hasValidVerificationData(result.data)) {
        lastError = 'No record found for the provided vNIN. Please double-check and try again.';
        logger.warn('Provider returned empty data', { provider });
      } else {
        lastError = result.error;
      }
      logger.warn('Provider verification failed, trying next', { provider, error: lastError });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'All verification providers failed', reference: '', provider: providers[0] };
};

const retrieveNINByPhone = async (phone: string): Promise<{ success: boolean; data?: any; error?: string; reference: string; provider: string }> => {
  const providers = getConfiguredProviders();
  let lastError: string | undefined;
  
  for (const provider of providers) {
    try {
      logger.info('Attempting phone-to-NIN retrieval', { provider, phone: phone.substring(0, 4) + '***' });
      let result;
      
      if (provider === 'prembly') {
        result = await premblyService.retrieveNINByPhone(phone);
      } else {
        continue;
      }
      
      if (result.success && result.data && hasValidVerificationData(result.data)) {
        return { ...result, provider };
      }
      if (result.success && result.data && !hasValidVerificationData(result.data)) {
        lastError = 'No record found for the provided phone number. Please double-check and try again.';
        logger.warn('Provider returned empty data', { provider });
      } else {
        lastError = result.error;
      }
      logger.warn('Phone-to-NIN retrieval failed, trying next', { provider, error: lastError });
    } catch (error: any) {
      lastError = error.message;
      logger.warn('Provider threw error, trying next', { provider, error: error.message });
    }
  }
  
  return { success: false, error: lastError || 'Phone-to-NIN retrieval failed. This service requires Prembly provider.', reference: '', provider: providers[0] };
};

const router = Router();

router.get('/template-image', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const type = (req.query.type as string) || 'premium';
    
    let templatePath = path.join(process.cwd(), 'server/src/templates/premium_slip_template.jpg');
    let contentType = 'image/jpeg';
    
    if (type === 'standard') {
      templatePath = path.join(process.cwd(), 'server/src/templates/standard_slip_template.jpg');
    } else if (type === 'regular') {
      templatePath = path.join(process.cwd(), 'server/src/templates/regular_slip_template.jpg');
    } else if (type === 'full_info' || type === 'information') {
      templatePath = path.join(process.cwd(), 'server/src/templates/full_info_template.png');
      contentType = 'image/png';
    }
    
    logger.info('Serving template image', { templatePath, exists: fs.existsSync(templatePath) });
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template image not found', path: templatePath });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(templatePath).pipe(res);
  } catch (error: any) {
    logger.error('Error serving template image', { error: error.message });
    res.status(500).json({ error: 'Failed to serve template', details: error.message });
  }
});

// Slip Position Analyzer - public endpoint for calibration
router.get('/slip-analyzer', async (req: Request, res: Response) => {
  try {
    const slipType = (req.query.type as string) || 'premium';
    
    const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slip Position Analyzer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #333; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: white; margin-bottom: 20px; text-align: center; }
    .controls { background: #444; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white; }
    .controls h3 { margin-bottom: 10px; }
    .control-group { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px; }
    .control-item { display: flex; flex-direction: column; }
    .control-item label { font-size: 12px; margin-bottom: 3px; }
    .control-item input { width: 80px; padding: 5px; }
    .slip-wrapper { position: relative; width: 100%; background: white; margin-bottom: 20px; }
    .template-bg { width: 100%; height: auto; display: block; }
    .overlay-marker { position: absolute; border: 2px dashed red; background: rgba(255,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; color: red; font-weight: bold; }
    .position-info { background: #222; color: #0f0; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }
    .update-btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Slip Position Analyzer - ${slipType.toUpperCase()}</h1>
    
    <div class="controls">
      <h3>Adjust Positions</h3>
      <div class="control-group">
        <div class="control-item"><label>Photo Top %</label><input type="number" id="photo-top" value="26" step="0.5"></div>
        <div class="control-item"><label>Photo Left %</label><input type="number" id="photo-left" value="7" step="0.5"></div>
        <div class="control-item"><label>Photo Width %</label><input type="number" id="photo-width" value="15" step="0.5"></div>
        <div class="control-item"><label>Photo Height %</label><input type="number" id="photo-height" value="17" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>Surname Top %</label><input type="number" id="surname-top" value="27" step="0.5"></div>
        <div class="control-item"><label>Surname Left %</label><input type="number" id="surname-left" value="27" step="0.5"></div>
        <div class="control-item"><label>Given Names Top %</label><input type="number" id="given-top" value="32" step="0.5"></div>
        <div class="control-item"><label>Given Names Left %</label><input type="number" id="given-left" value="27" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>DOB Top %</label><input type="number" id="dob-top" value="38" step="0.5"></div>
        <div class="control-item"><label>DOB Left %</label><input type="number" id="dob-left" value="27" step="0.5"></div>
        <div class="control-item"><label>Sex Top %</label><input type="number" id="sex-top" value="38" step="0.5"></div>
        <div class="control-item"><label>Sex Left %</label><input type="number" id="sex-left" value="42" step="0.5"></div>
      </div>
      <div class="control-group">
        <div class="control-item"><label>NIN Top %</label><input type="number" id="nin-top" value="45" step="0.5"></div>
        <div class="control-item"><label>QR Top %</label><input type="number" id="qr-top" value="25" step="0.5"></div>
        <div class="control-item"><label>QR Right %</label><input type="number" id="qr-right" value="18" step="0.5"></div>
        <div class="control-item"><label>Issue Date Top %</label><input type="number" id="issue-top" value="40" step="0.5"></div>
      </div>
      <button class="update-btn" onclick="updatePositions()">Update Positions</button>
    </div>
    
    <div class="slip-wrapper">
      <img src="/api/identity/template-image?type=${slipType}" alt="Template" class="template-bg" id="template-img">
      <div class="overlay-marker" id="photo-marker" style="top:26%;left:7%;width:15%;height:17%;">PHOTO</div>
      <div class="overlay-marker" id="surname-marker" style="top:27%;left:27%;width:25%;height:4%;">SURNAME</div>
      <div class="overlay-marker" id="given-marker" style="top:32%;left:27%;width:30%;height:4%;">GIVEN NAMES</div>
      <div class="overlay-marker" id="dob-marker" style="top:38%;left:27%;width:12%;height:3%;">DOB</div>
      <div class="overlay-marker" id="sex-marker" style="top:38%;left:42%;width:5%;height:3%;">SEX</div>
      <div class="overlay-marker" id="nin-marker" style="top:45%;left:30%;width:40%;height:5%;">NIN NUMBER</div>
      <div class="overlay-marker" id="qr-marker" style="top:25%;right:18%;width:12%;height:14%;">QR CODE</div>
      <div class="overlay-marker" id="issue-marker" style="top:40%;right:6%;width:10%;height:4%;">ISSUE DATE</div>
    </div>
    
    <div class="position-info" id="position-output">
Adjust the inputs above and click "Update Positions" to see changes.
Copy these values to update slipGenerator.ts
    </div>
  </div>
  
  <script>
    function updatePositions() {
      document.getElementById('photo-marker').style.top = document.getElementById('photo-top').value + '%';
      document.getElementById('photo-marker').style.left = document.getElementById('photo-left').value + '%';
      document.getElementById('photo-marker').style.width = document.getElementById('photo-width').value + '%';
      document.getElementById('photo-marker').style.height = document.getElementById('photo-height').value + '%';
      document.getElementById('surname-marker').style.top = document.getElementById('surname-top').value + '%';
      document.getElementById('surname-marker').style.left = document.getElementById('surname-left').value + '%';
      document.getElementById('given-marker').style.top = document.getElementById('given-top').value + '%';
      document.getElementById('given-marker').style.left = document.getElementById('given-left').value + '%';
      document.getElementById('dob-marker').style.top = document.getElementById('dob-top').value + '%';
      document.getElementById('dob-marker').style.left = document.getElementById('dob-left').value + '%';
      document.getElementById('sex-marker').style.top = document.getElementById('sex-top').value + '%';
      document.getElementById('sex-marker').style.left = document.getElementById('sex-left').value + '%';
      document.getElementById('nin-marker').style.top = document.getElementById('nin-top').value + '%';
      document.getElementById('qr-marker').style.top = document.getElementById('qr-top').value + '%';
      document.getElementById('qr-marker').style.right = document.getElementById('qr-right').value + '%';
      document.getElementById('issue-marker').style.top = document.getElementById('issue-top').value + '%';
      
      document.getElementById('position-output').textContent = 
        'UPDATED POSITIONS:\\n' +
        'photo: { top: ' + document.getElementById('photo-top').value + '%, left: ' + document.getElementById('photo-left').value + '%, width: ' + document.getElementById('photo-width').value + '%, height: ' + document.getElementById('photo-height').value + '% }\\n' +
        'surname: { top: ' + document.getElementById('surname-top').value + '%, left: ' + document.getElementById('surname-left').value + '% }\\n' +
        'givenNames: { top: ' + document.getElementById('given-top').value + '%, left: ' + document.getElementById('given-left').value + '% }\\n' +
        'dob: { top: ' + document.getElementById('dob-top').value + '%, left: ' + document.getElementById('dob-left').value + '% }\\n' +
        'sex: { top: ' + document.getElementById('sex-top').value + '%, left: ' + document.getElementById('sex-left').value + '% }\\n' +
        'nin: { top: ' + document.getElementById('nin-top').value + '% }\\n' +
        'qrCode: { top: ' + document.getElementById('qr-top').value + '%, right: ' + document.getElementById('qr-right').value + '% }\\n' +
        'issueDate: { top: ' + document.getElementById('issue-top').value + '% }';
    }
  </script>
</body>
</html>
    `.trim();

    res.setHeader('Content-Type', 'text/html');
    res.send(testHtml);
  } catch (error: any) {
    logger.error('Slip analyzer error', { error: error.message });
    res.status(500).json({ error: 'Failed to analyze slip' });
  }
});

// Full Info Slip Position Analyzer - for the information slip with all fields
router.get('/full-info-analyzer', async (req: Request, res: Response) => {
  try {
    const fullInfoHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Full Info Slip Position Analyzer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #1a1a2e; padding: 20px; }
    h1 { color: #eee; margin-bottom: 20px; text-align: center; }
    .main-layout { display: flex; gap: 20px; max-width: 1600px; margin: 0 auto; }
    .left-panel { flex: 0 0 400px; max-height: calc(100vh - 100px); overflow-y: auto; }
    .right-panel { flex: 1; position: sticky; top: 20px; }
    .controls { background: #16213e; padding: 15px; border-radius: 8px; color: white; }
    .controls h3 { margin-bottom: 10px; color: #00d9ff; font-size: 14px; }
    .control-section { margin-bottom: 15px; padding: 12px; background: #0f3460; border-radius: 5px; }
    .control-section h4 { margin-bottom: 8px; color: #e94560; font-size: 12px; }
    .control-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .control-item { display: flex; flex-direction: column; }
    .control-item label { font-size: 10px; margin-bottom: 2px; color: #ccc; }
    .control-item input { width: 60px; padding: 4px; border: 1px solid #444; background: #1a1a2e; color: white; border-radius: 3px; font-size: 12px; }
    .slip-wrapper { position: relative; background: white; border-radius: 8px; overflow: hidden; }
    .template-bg { width: 100%; height: auto; display: block; }
    .overlay-marker { position: absolute; border: 2px dashed; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; }
    .marker-photo { border-color: #ff6b6b; color: #ff6b6b; }
    .marker-text { border-color: #4ecdc4; color: #4ecdc4; }
    .marker-qr { border-color: #ffe66d; color: #ffe66d; }
    .marker-extra { border-color: #a8e6cf; color: #a8e6cf; }
    .position-info { background: #0f3460; color: #00ff88; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin-top: 15px; }
    .btn-group { display: flex; gap: 10px; margin-top: 12px; }
    .update-btn { background: #e94560; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; flex: 1; }
    .update-btn:hover { background: #ff6b81; }
    .copy-btn { background: #4ecdc4; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; flex: 1; }
  </style>
</head>
<body>
  <h1>Full Info Slip Position Analyzer</h1>
  
  <div class="main-layout">
    <div class="left-panel">
      <div class="controls">
        <div class="control-section">
          <h4>Photo & QR Code</h4>
          <div class="control-group">
            <div class="control-item"><label>Photo Top %</label><input type="number" id="photo-top" value="25" step="0.5"></div>
            <div class="control-item"><label>Photo Left %</label><input type="number" id="photo-left" value="10" step="0.5"></div>
            <div class="control-item"><label>Photo Width %</label><input type="number" id="photo-width" value="18" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>QR Top %</label><input type="number" id="qr-top" value="18" step="0.5"></div>
            <div class="control-item"><label>QR Right %</label><input type="number" id="qr-right" value="8" step="0.5"></div>
            <div class="control-item"><label>QR Width %</label><input type="number" id="qr-width" value="15" step="0.5"></div>
          </div>
        </div>
        
        <div class="control-section">
          <h4>Basic Info</h4>
          <div class="control-group">
            <div class="control-item"><label>Surname Top</label><input type="number" id="surname-top" value="19" step="0.5"></div>
            <div class="control-item"><label>Surname Left</label><input type="number" id="surname-left" value="32" step="0.5"></div>
            <div class="control-item"><label>Names Top</label><input type="number" id="names-top" value="23" step="0.5"></div>
            <div class="control-item"><label>Names Left</label><input type="number" id="names-left" value="32" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>DOB Top</label><input type="number" id="dob-top" value="27" step="0.5"></div>
            <div class="control-item"><label>DOB Left</label><input type="number" id="dob-left" value="32" step="0.5"></div>
            <div class="control-item"><label>Gender Top</label><input type="number" id="sex-top" value="31" step="0.5"></div>
            <div class="control-item"><label>Gender Left</label><input type="number" id="sex-left" value="32" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>NIN Top</label><input type="number" id="nin-top" value="35" step="0.5"></div>
            <div class="control-item"><label>NIN Left</label><input type="number" id="nin-left" value="32" step="0.5"></div>
            <div class="control-item"><label>NIN Size px</label><input type="number" id="nin-size" value="16" step="1"></div>
          </div>
        </div>
        
        <div class="control-section">
          <h4>Additional Info</h4>
          <div class="control-group">
            <div class="control-item"><label>Issue Top</label><input type="number" id="issue-top" value="39" step="0.5"></div>
            <div class="control-item"><label>Issue Left</label><input type="number" id="issue-left" value="32" step="0.5"></div>
            <div class="control-item"><label>Tracking Top</label><input type="number" id="tracking-top" value="43" step="0.5"></div>
            <div class="control-item"><label>Tracking Left</label><input type="number" id="tracking-left" value="32" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>Address Top</label><input type="number" id="address-top" value="51" step="0.5"></div>
            <div class="control-item"><label>Address Left</label><input type="number" id="address-left" value="32" step="0.5"></div>
            <div class="control-item"><label>Phone Top</label><input type="number" id="phone-top" value="55" step="0.5"></div>
            <div class="control-item"><label>Phone Left</label><input type="number" id="phone-left" value="32" step="0.5"></div>
          </div>
        </div>
        
        <div class="control-section">
          <h4>Location Info</h4>
          <div class="control-group">
            <div class="control-item"><label>State Top</label><input type="number" id="state-top" value="59" step="0.5"></div>
            <div class="control-item"><label>State Left</label><input type="number" id="state-left" value="32" step="0.5"></div>
            <div class="control-item"><label>LGA Top</label><input type="number" id="lga-top" value="63" step="0.5"></div>
            <div class="control-item"><label>LGA Left</label><input type="number" id="lga-left" value="32" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>Birth State Top</label><input type="number" id="birth-state-top" value="67" step="0.5"></div>
            <div class="control-item"><label>Birth State Left</label><input type="number" id="birth-state-left" value="32" step="0.5"></div>
            <div class="control-item"><label>Birth LGA Top</label><input type="number" id="birth-lga-top" value="71" step="0.5"></div>
            <div class="control-item"><label>Birth LGA Left</label><input type="number" id="birth-lga-left" value="32" step="0.5"></div>
          </div>
          <div class="control-group">
            <div class="control-item"><label>Nationality Top</label><input type="number" id="nationality-top" value="75" step="0.5"></div>
            <div class="control-item"><label>Nationality Left</label><input type="number" id="nationality-left" value="32" step="0.5"></div>
          </div>
        </div>
        
        <div class="btn-group">
          <button class="update-btn" onclick="updatePositions()">Update</button>
          <button class="copy-btn" onclick="copyToClipboard()">Copy JSON</button>
        </div>
        
        <div class="position-info" id="position-output">Adjust values and click "Update" to see changes.</div>
      </div>
    </div>
    
    <div class="right-panel">
      <div class="slip-wrapper">
        <img src="/api/identity/template-image?type=full_info" alt="Template" class="template-bg" id="template-img">
        <div class="overlay-marker marker-photo" id="photo-marker" style="top:25%;left:10%;width:18%;height:20%;">PHOTO</div>
        <div class="overlay-marker marker-qr" id="qr-marker" style="top:18%;right:8%;width:15%;height:18%;">QR</div>
        <div class="overlay-marker marker-text" id="surname-marker" style="top:19%;left:32%;width:25%;height:3%;">SURNAME</div>
        <div class="overlay-marker marker-text" id="names-marker" style="top:23%;left:32%;width:30%;height:3%;">NAMES</div>
        <div class="overlay-marker marker-text" id="dob-marker" style="top:27%;left:32%;width:15%;height:3%;">DOB</div>
        <div class="overlay-marker marker-text" id="sex-marker" style="top:31%;left:32%;width:10%;height:3%;">GENDER</div>
        <div class="overlay-marker marker-text" id="nin-marker" style="top:35%;left:32%;width:25%;height:3%;">NIN</div>
        <div class="overlay-marker marker-extra" id="issue-marker" style="top:39%;left:32%;width:20%;height:3%;">ISSUE DATE</div>
        <div class="overlay-marker marker-extra" id="tracking-marker" style="top:43%;left:32%;width:25%;height:3%;">TRACKING</div>
        <div class="overlay-marker marker-extra" id="address-marker" style="top:51%;left:32%;width:40%;height:3%;">ADDRESS</div>
        <div class="overlay-marker marker-extra" id="phone-marker" style="top:55%;left:32%;width:20%;height:3%;">PHONE</div>
        <div class="overlay-marker marker-extra" id="state-marker" style="top:59%;left:32%;width:20%;height:3%;">STATE</div>
        <div class="overlay-marker marker-extra" id="lga-marker" style="top:63%;left:32%;width:20%;height:3%;">LGA</div>
        <div class="overlay-marker marker-extra" id="birth-state-marker" style="top:67%;left:32%;width:20%;height:3%;">BIRTH STATE</div>
        <div class="overlay-marker marker-extra" id="birth-lga-marker" style="top:71%;left:32%;width:20%;height:3%;">BIRTH LGA</div>
        <div class="overlay-marker marker-extra" id="nationality-marker" style="top:75%;left:32%;width:15%;height:3%;">NATIONALITY</div>
      </div>
    </div>
  </div>
  
  <script>
    function updatePositions() {
      document.getElementById('photo-marker').style.top = document.getElementById('photo-top').value + '%';
      document.getElementById('photo-marker').style.left = document.getElementById('photo-left').value + '%';
      document.getElementById('photo-marker').style.width = document.getElementById('photo-width').value + '%';
      document.getElementById('qr-marker').style.top = document.getElementById('qr-top').value + '%';
      document.getElementById('qr-marker').style.right = document.getElementById('qr-right').value + '%';
      document.getElementById('qr-marker').style.width = document.getElementById('qr-width').value + '%';
      document.getElementById('surname-marker').style.top = document.getElementById('surname-top').value + '%';
      document.getElementById('surname-marker').style.left = document.getElementById('surname-left').value + '%';
      document.getElementById('names-marker').style.top = document.getElementById('names-top').value + '%';
      document.getElementById('names-marker').style.left = document.getElementById('names-left').value + '%';
      document.getElementById('dob-marker').style.top = document.getElementById('dob-top').value + '%';
      document.getElementById('dob-marker').style.left = document.getElementById('dob-left').value + '%';
      document.getElementById('sex-marker').style.top = document.getElementById('sex-top').value + '%';
      document.getElementById('sex-marker').style.left = document.getElementById('sex-left').value + '%';
      document.getElementById('nin-marker').style.top = document.getElementById('nin-top').value + '%';
      document.getElementById('nin-marker').style.left = document.getElementById('nin-left').value + '%';
      document.getElementById('issue-marker').style.top = document.getElementById('issue-top').value + '%';
      document.getElementById('issue-marker').style.left = document.getElementById('issue-left').value + '%';
      document.getElementById('tracking-marker').style.top = document.getElementById('tracking-top').value + '%';
      document.getElementById('tracking-marker').style.left = document.getElementById('tracking-left').value + '%';
      document.getElementById('phone-marker').style.top = document.getElementById('phone-top').value + '%';
      document.getElementById('phone-marker').style.left = document.getElementById('phone-left').value + '%';
      document.getElementById('address-marker').style.top = document.getElementById('address-top').value + '%';
      document.getElementById('address-marker').style.left = document.getElementById('address-left').value + '%';
      document.getElementById('state-marker').style.top = document.getElementById('state-top').value + '%';
      document.getElementById('state-marker').style.left = document.getElementById('state-left').value + '%';
      document.getElementById('lga-marker').style.top = document.getElementById('lga-top').value + '%';
      document.getElementById('lga-marker').style.left = document.getElementById('lga-left').value + '%';
      document.getElementById('birth-state-marker').style.top = document.getElementById('birth-state-top').value + '%';
      document.getElementById('birth-state-marker').style.left = document.getElementById('birth-state-left').value + '%';
      document.getElementById('birth-lga-marker').style.top = document.getElementById('birth-lga-top').value + '%';
      document.getElementById('birth-lga-marker').style.left = document.getElementById('birth-lga-left').value + '%';
      document.getElementById('nationality-marker').style.top = document.getElementById('nationality-top').value + '%';
      document.getElementById('nationality-marker').style.left = document.getElementById('nationality-left').value + '%';
      
      const output = generateOutput();
      document.getElementById('position-output').textContent = output;
    }
    
    function generateOutput() {
      return JSON.stringify({
        "photo_top": document.getElementById('photo-top').value + "%",
        "photo_left": document.getElementById('photo-left').value + "%",
        "photo_width": document.getElementById('photo-width').value + "%",
        "surname_top": document.getElementById('surname-top').value + "%",
        "surname_left": document.getElementById('surname-left').value + "%",
        "surname_size": "14px",
        "names_top": document.getElementById('names-top').value + "%",
        "names_left": document.getElementById('names-left').value + "%",
        "names_size": "14px",
        "dob_top": document.getElementById('dob-top').value + "%",
        "dob_left": document.getElementById('dob-left').value + "%",
        "dob_size": "14px",
        "nin_top": document.getElementById('nin-top').value + "%",
        "nin_left": document.getElementById('nin-left').value + "%",
        "nin_size": document.getElementById('nin-size').value + "px",
        "qr_top": document.getElementById('qr-top').value + "%",
        "qr_right": document.getElementById('qr-right').value + "%",
        "qr_width": document.getElementById('qr-width').value + "%",
        "sex_top": document.getElementById('sex-top').value + "%",
        "sex_left": document.getElementById('sex-left').value + "%",
        "sex_size": "14px",
        "issue_top": document.getElementById('issue-top').value + "%",
        "issue_left": document.getElementById('issue-left').value + "%",
        "issue_size": "14px",
        "tracking_top": document.getElementById('tracking-top').value + "%",
        "tracking_left": document.getElementById('tracking-left').value + "%",
        "tracking_size": "14px",
        "address_top": document.getElementById('address-top').value + "%",
        "address_left": document.getElementById('address-left').value + "%",
        "address_size": "13px",
        "phone_top": document.getElementById('phone-top').value + "%",
        "phone_left": document.getElementById('phone-left').value + "%",
        "phone_size": "14px",
        "state_top": document.getElementById('state-top').value + "%",
        "state_left": document.getElementById('state-left').value + "%",
        "state_size": "14px",
        "lga_top": document.getElementById('lga-top').value + "%",
        "lga_left": document.getElementById('lga-left').value + "%",
        "lga_size": "14px",
        "birth_state_top": document.getElementById('birth-state-top').value + "%",
        "birth_state_left": document.getElementById('birth-state-left').value + "%",
        "birth_state_size": "14px",
        "birth_lga_top": document.getElementById('birth-lga-top').value + "%",
        "birth_lga_left": document.getElementById('birth-lga-left').value + "%",
        "birth_lga_size": "14px",
        "nationality_top": document.getElementById('nationality-top').value + "%",
        "nationality_left": document.getElementById('nationality-left').value + "%",
        "nationality_size": "14px"
      }, null, 2);
    }
    
    function copyToClipboard() {
      const output = generateOutput();
      navigator.clipboard.writeText(output).then(() => {
        alert('JSON copied to clipboard!');
      });
    }
  </script>
</body>
</html>
    `.trim();

    res.setHeader('Content-Type', 'text/html');
    res.send(fullInfoHtml);
  } catch (error: any) {
    logger.error('Full info analyzer error', { error: error.message });
    res.status(500).json({ error: 'Failed to load analyzer' });
  }
});

router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const { pricingService } = await import('../../services/pricingService');
    
    const [ninLookup, ninPhone] = await Promise.all([
      pricingService.getPricing('nin_lookup'),
      pricingService.getPricing('nin_phone'),
    ]);
    
    const slipPricing = {
      information: ninLookup.price,
      regular: ninLookup.price + 50,
      standard: ninLookup.price + 100,
      premium: ninLookup.price + 100,
      nin_phone: ninPhone.price,
    };
    
    res.json(formatResponse('success', 200, 'NIN pricing retrieved', { pricing: slipPricing }));
  } catch (error: any) {
    logger.error('Failed to fetch NIN pricing', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to fetch pricing'));
  }
});

router.use(authMiddleware);

const getServicePrice = async (serviceType: string, defaultPrice: number): Promise<number> => {
  try {
    const { pricingService } = await import('../../services/pricingService');
    return await pricingService.getPrice(serviceType);
  } catch {
    return defaultPrice;
  }
};

router.post('/nin', async (req: Request, res: Response) => {
  try {
    const validation = ninLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('nin_lookup', 150);
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('NIN lookup started', { userId: req.userId, nin: validation.data.nin.substring(0, 4) + '***' });

    const result = await verifyNINWithFallback(validation.data.nin);

    if (!result.success || !result.data) {
      logger.warn('NIN verification failed - no charge', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'NIN verification failed. No charge applied.'));
    }

    await walletService.deductBalance(req.userId!, price, 'NIN Lookup', 'nin_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const ninData = result.data as any;
    const slip = generateNINSlip(ninData, result.reference, slipType);

    const pdfSlipTypeMap: Record<string, 'standard' | 'premium' | 'long' | 'full_info'> = {
      'information': 'full_info',
      'regular': 'long',
      'standard': 'standard',
      'premium': 'premium',
    };
    const pdfSlipType = pdfSlipTypeMap[slipType] || 'standard';

    let pdfSlipResult = null;
    try {
      const slipData: SlipData = {
        nin: validation.data.nin,
        surname: ninData.lastName || ninData.surname || '',
        firstname: ninData.firstName || ninData.firstname || '',
        middlename: ninData.middleName || ninData.middlename || '',
        date_of_birth: ninData.dateOfBirth || ninData.dob || '',
        gender: ninData.gender || '',
        photo: ninData.photo || '',
        tracking_id: ninData.trackingId || '',
        verification_reference: result.reference,
        address: ninData.address || '',
        phone: ninData.phone || '',
        state: ninData.state || ninData.stateOfResidence || '',
        lga: ninData.lga || ninData.lgaOfResidence || '',
        birthState: ninData.birthState || ninData.stateOfOrigin || '',
        birthLga: ninData.birthLga || ninData.lgaOfOrigin || '',
        nationality: ninData.nationality || 'Nigerian',
      };

      pdfSlipResult = await generatePdfSlip({
        userId: req.userId,
        slipType: pdfSlipType,
        data: slipData,
      });

      logger.info('PDF slip generated', { slipReference: pdfSlipResult.slipReference, userId: req.userId });
    } catch (pdfError: any) {
      logger.error('Failed to generate PDF slip', { error: pdfError.message, userId: req.userId });
    }

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'nin',
      nin: validation.data.nin,
      status: 'completed',
      verificationData: result.data,
      slipHtml: slip.html,
      slipType: slipType,
      slipReference: pdfSlipResult?.slipReference || null,
      reference: result.reference,
    });

    // Capture TechHub slip design for RPA analysis
    if (result.provider === 'techhub' && (result as any).techhubSlipHtml) {
      const { captureSlipDesign } = await import('../../services/slipCaptureService');
      await captureSlipDesign({
        provider: 'techhub',
        slipHtml: (result as any).techhubSlipHtml,
        rawResponse: (result as any).rawResponse,
        nin: validation.data.nin,
        reference: result.reference,
      });
      logger.info('TechHub slip design captured for RPA analysis', { reference: result.reference });
    }

    // Auto-generate PayVessel virtual account after successful NIN verification
    let virtualAccount = null;
    try {
      const accountResult = await virtualAccountService.generateVirtualAccountForUser(
        req.userId!,
        validation.data.nin
      );
      if (accountResult.success && accountResult.account) {
        virtualAccount = accountResult.account;
        logger.info('Virtual account auto-generated after NIN verification', { 
          userId: req.userId, 
          accountNumber: virtualAccount.accountNumber 
        });
      }
    } catch (error: any) {
      logger.error('Failed to auto-generate virtual account after NIN verification', { 
        userId: req.userId, 
        error: error.message 
      });
    }

    logger.info('NIN lookup successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'NIN verification successful', {
      reference: result.reference,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        email: ninData.email,
        address: ninData.address || ninData.residence_address || '',
        state: ninData.state || ninData.residence_state || '',
        lga: ninData.lga || ninData.residence_lga || '',
        photo: ninData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
        slipReference: pdfSlipResult?.slipReference || null,
        downloadUrl: pdfSlipResult ? `/api/slips/download/${pdfSlipResult.slipReference}` : null,
      },
      virtualAccount: virtualAccount ? {
        bankName: virtualAccount.bankName,
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        message: 'Your PayVessel virtual account has been automatically generated!'
      } : null,
      price,
    }));
  } catch (error: any) {
    logger.error('NIN lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    if (error.message === 'YOUVERIFY_API_KEY is not configured') {
      return res.status(503).json(formatErrorResponse(503, 'Identity verification service is not configured'));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process NIN request'));
  }
});

router.post('/vnin', async (req: Request, res: Response) => {
  try {
    const { vnin, firstName, lastName, dateOfBirth } = req.body;
    
    if (!vnin || typeof vnin !== 'string' || vnin.length < 10) {
      return res.status(400).json(formatErrorResponse(400, 'Valid vNIN is required'));
    }

    const price = await getServicePrice('vnin', 200);
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('vNIN lookup started', { userId: req.userId });

    const validationData = firstName || lastName || dateOfBirth 
      ? { firstName, lastName, dateOfBirth } 
      : undefined;

    const result = await verifyVNINWithFallback(vnin, validationData);

    if (!result.success || !result.data) {
      logger.warn('vNIN verification failed', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'vNIN verification failed'));
    }

    await walletService.deductBalance(req.userId!, price, 'vNIN Verification', 'vnin_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const ninData = result.data as any;
    const slip = generateNINSlip(ninData, result.reference, slipType);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'vnin',
      status: 'completed',
      verificationData: result.data,
    });

    logger.info('vNIN lookup successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'vNIN verification successful', {
      reference: result.reference,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        email: ninData.email,
        address: ninData.address || ninData.residence_address || '',
        state: ninData.state || ninData.residence_state || '',
        lga: ninData.lga || ninData.residence_lga || '',
        photo: ninData.photo,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('vNIN lookup error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process vNIN request'));
  }
});

router.post('/nin-phone', async (req: Request, res: Response) => {
  try {
    const validation = ninPhoneSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('nin_phone', 200);
    
    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    logger.info('Phone-to-NIN retrieval started', { userId: req.userId });

    const result = await retrieveNINByPhone(validation.data.phone);

    if (!result.success || !result.data) {
      logger.warn('Phone-to-NIN retrieval failed - no charge', { userId: req.userId, error: result.error, provider: result.provider });
      return res.status(400).json(formatErrorResponse(400, result.error || 'NIN retrieval failed. No charge applied.'));
    }

    const ninData = result.data as any;

    await walletService.deductBalance(req.userId!, price, 'NIN Retrieval (Phone)', 'nin_phone_verification');

    const slipType = (req.body.slipType as 'information' | 'regular' | 'standard' | 'premium') || 'standard';
    const slip = generateNINSlip(ninData, result.reference, slipType);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'nin_phone',
      phone: validation.data.phone,
      status: 'completed',
      verificationData: result.data,
    });

    logger.info('Phone-to-NIN retrieval successful', { userId: req.userId, reference: result.reference });

    res.json(formatResponse('success', 200, 'NIN retrieved successfully', {
      reference: result.reference,
      data: {
        firstName: ninData.firstName,
        middleName: ninData.middleName,
        lastName: ninData.lastName,
        dateOfBirth: ninData.dateOfBirth,
        gender: ninData.gender,
        phone: ninData.phone,
        nin: ninData.id,
      },
      slip: {
        html: slip.html,
        generatedAt: slip.generatedAt,
      },
      price,
    }));
  } catch (error: any) {
    logger.error('Phone-to-NIN retrieval error', { error: error.message, userId: req.userId });
    
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/lost-nin', async (req: Request, res: Response) => {
  try {
    const validation = lostNinSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const price = await getServicePrice('lost_nin', 500);

    await db.insert(identityVerifications).values({
      userId: req.userId!,
      verificationType: 'lost_nin',
      phone: validation.data.phone,
      secondEnrollmentId: validation.data.enrollmentId,
      status: 'pending',
    });

    logger.info('Lost NIN recovery request', { userId: req.userId });

    res.status(202).json(formatResponse('success', 202, 'Lost NIN recovery request submitted. This service requires manual processing and may take 24-48 hours.', {
      message: 'Our team will process your request and contact you via the provided phone number.',
      estimatedTime: '24-48 hours',
      price,
    }));
  } catch (error: any) {
    logger.error('Lost NIN recovery error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

const generateTrackingId = (): string => {
  const prefix = 'ARP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 15);
};


router.post('/ipe-clearance', async (req: Request, res: Response) => {
  try {
    const { trackingId, statusType, slipType, customerNotes } = req.body;
    
    if (!trackingId || !statusType) {
      return res.status(400).json(formatErrorResponse(400, 'Tracking ID and status type are required'));
    }

    const basePrice = await getServicePrice('ipe_clearance', 1000);
    const slipPrice = slipType === 'premium' ? 150 : 0;
    const totalPrice = basePrice + slipPrice;

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < totalPrice) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, totalPrice, 'IPE Clearance Request', 'ipe_clearance');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'ipe_clearance',
      newTrackingId: trackingId,
      updateFields: { statusType, slipType },
      status: 'pending',
      fee: totalPrice.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('IPE Clearance request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'IPE Clearance request submitted successfully', {
      trackingId: requestTrackingId,
      statusType,
      slipType,
      price: totalPrice,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('IPE Clearance error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit IPE Clearance request'));
  }
});

router.post('/validation', async (req: Request, res: Response) => {
  try {
    const { nin, validationType, slipType, customerNotes } = req.body;
    
    if (!nin || !validationType) {
      return res.status(400).json(formatErrorResponse(400, 'NIN and validation type are required'));
    }

    if (nin.length !== 11 || !/^\d+$/.test(nin)) {
      return res.status(400).json(formatErrorResponse(400, 'NIN must be exactly 11 digits'));
    }

    const basePrice = await getServicePrice('validation_nin', 1000);
    const slipPrice = slipType === 'regular' ? 150 : 0;
    const totalPrice = basePrice + slipPrice;

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < totalPrice) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, totalPrice, 'NIN Validation Request', 'nin_validation');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'nin_validation',
      nin,
      updateFields: { validationType, slipType },
      status: 'pending',
      fee: totalPrice.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('NIN Validation request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'NIN Validation request submitted successfully', {
      trackingId: requestTrackingId,
      validationType,
      slipType,
      price: totalPrice,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('NIN Validation error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit NIN Validation request'));
  }
});

router.post('/birth-attestation', async (req: Request, res: Response) => {
  try {
    const { fullName, dateOfBirth, placeOfBirth, customerNotes } = req.body;
    
    if (!fullName || !dateOfBirth || !placeOfBirth) {
      return res.status(400).json(formatErrorResponse(400, 'Full name, date of birth, and place of birth are required'));
    }

    const price = await getServicePrice('birth_attestation', 2000);

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, price, 'Birth Attestation Request', 'birth_attestation');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'birth_attestation',
      updateFields: { fullName, dateOfBirth, placeOfBirth },
      status: 'pending',
      fee: price.toFixed(2),
      isPaid: true,
      customerNotes,
    });

    logger.info('Birth Attestation request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'Birth Attestation request submitted successfully', {
      trackingId: requestTrackingId,
      price,
      message: 'Your request has been submitted and will be processed within 24-48 hours.',
    }));
  } catch (error: any) {
    logger.error('Birth Attestation error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit Birth Attestation request'));
  }
});

router.post('/nin-tracking', async (req: Request, res: Response) => {
  try {
    const { trackingId, slipType } = req.body;
    
    if (!trackingId) {
      return res.status(400).json(formatErrorResponse(400, 'Tracking ID is required'));
    }

    const price = await getServicePrice('nin_tracking', 250);

    const balance = await walletService.getBalance(req.userId!);
    if (balance.balance < price) {
      return res.status(402).json(formatErrorResponse(402, 'Insufficient wallet balance'));
    }

    const requestTrackingId = generateTrackingId();

    await walletService.deductBalance(req.userId!, price, 'NIN With Tracking ID', 'nin_tracking');

    await db.insert(identityServiceRequests).values({
      userId: req.userId!,
      trackingId: requestTrackingId,
      serviceType: 'nin_tracking',
      newTrackingId: trackingId,
      updateFields: { slipType: slipType || 'standard' },
      status: 'pending',
      fee: price.toFixed(2),
      isPaid: true,
    });

    logger.info('NIN Tracking request submitted', { userId: req.userId, trackingId: requestTrackingId });

    res.status(202).json(formatResponse('success', 202, 'NIN With Tracking ID request submitted successfully', {
      trackingId: requestTrackingId,
      price,
      message: 'Your request has been submitted and will be processed within 1-30 minutes.',
    }));
  } catch (error: any) {
    logger.error('NIN Tracking error', { error: error.message, userId: req.userId });
    if (error.message === 'Insufficient wallet balance') {
      return res.status(402).json(formatErrorResponse(402, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to submit NIN Tracking request'));
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [history, countResult] = await Promise.all([
      db.select()
        .from(identityVerifications)
        .where(eq(identityVerifications.userId, req.userId!))
        .orderBy(desc(identityVerifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(identityVerifications)
        .where(eq(identityVerifications.userId, req.userId!))
    ]);

    const total = countResult[0]?.count || 0;

    const historyWithDownloadUrls = history.map(record => ({
      ...record,
      downloadUrl: record.slipReference ? `/api/slips/download/${record.slipReference}` : null,
    }));

    res.json(formatResponse('success', 200, 'Identity verification history retrieved', {
      history: historyWithDownloadUrls,
      pagination: { 
        page, 
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Identity history error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get history'));
  }
});

router.get('/service-requests', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const requests = await db.select()
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.userId, req.userId!))
      .orderBy(desc(identityServiceRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const allRecords = await db.select()
      .from(identityServiceRequests)
      .where(eq(identityServiceRequests.userId, req.userId!));

    res.json(formatResponse('success', 200, 'Identity service requests retrieved', {
      requests,
      pagination: { 
        page, 
        limit,
        total: allRecords.length,
        totalPages: Math.ceil(allRecords.length / limit),
      },
    }));
  } catch (error: any) {
    logger.error('Identity service requests error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get service requests'));
  }
});

router.get('/slip/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [record] = await db.select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json(formatErrorResponse(404, 'Verification record not found'));
    }

    if (record.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    if (!record.verificationData || record.status !== 'completed') {
      return res.status(400).json(formatErrorResponse(400, 'No slip available for this verification'));
    }

    const slipType = (req.query.slipType as 'information' | 'regular' | 'standard' | 'premium') || (record.slipType as any) || 'standard';
    
    let slipHtml = record.slipHtml;
    if (!slipHtml) {
      const slip = generateNINSlip(record.verificationData as any, record.reference || `NIN-${record.id}`, slipType);
      slipHtml = slip.html;
    }

    res.json(formatResponse('success', 200, 'Slip retrieved', {
      slip: {
        html: slipHtml,
        generatedAt: record.createdAt,
        type: record.verificationType,
        slipType: record.slipType || slipType,
        reference: record.reference,
      },
    }));
  } catch (error: any) {
    logger.error('Get slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get slip'));
  }
});

router.get('/slip/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [record] = await db.select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json(formatErrorResponse(404, 'Verification record not found'));
    }

    if (record.userId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    if (!record.verificationData || record.status !== 'completed') {
      return res.status(400).json(formatErrorResponse(400, 'No slip available for this verification'));
    }

    const slipType = (req.query.slipType as 'information' | 'regular' | 'standard' | 'premium') || (record.slipType as any) || 'standard';
    
    let slipHtml = record.slipHtml;
    if (!slipHtml) {
      const slip = generateNINSlip(record.verificationData as any, record.reference || `NIN-${record.id}`, slipType);
      slipHtml = slip.html;
    }

    const filename = `NIN_Slip_${record.nin || record.id}_${slipType}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(slipHtml);
  } catch (error: any) {
    logger.error('Download slip error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to download slip'));
  }
});

router.get('/sample-slip/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const validTypes = ['information', 'regular', 'standard', 'premium'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid slip type'));
    }

    const sampleData = {
      nin: '12345678901',
      firstName: 'JOHN',
      lastName: 'DOE',
      middleName: 'SAMPLE',
      dateOfBirth: '1990-01-15',
      gender: 'Male',
      phone: '08012345678',
      email: 'sample@example.com',
      stateOfOrigin: 'Lagos',
      lgaOfOrigin: 'Ikeja',
      residentialAddress: '123 Sample Street, Victoria Island',
      residentialState: 'Lagos',
      residentialLga: 'Eti-Osa',
      maritalStatus: 'Single',
      educationLevel: 'BSc',
      nationality: 'Nigerian',
      photo: '',
      signature: '',
      trackingId: 'TRK-SAMPLE-001',
      centralId: 'CID-SAMPLE-001',
      birthCountry: 'Nigeria',
      birthState: 'Lagos',
      birthLga: 'Lagos Island',
      employmentStatus: 'Employed',
      profession: 'Software Engineer',
      nokFirstName: 'JANE',
      nokLastName: 'DOE',
      nokPhone: '08098765432',
      nokAddress: '456 Sample Avenue, Lekki',
    };

    const slip = generateNINSlip(sampleData as any, `SAMPLE-${type.toUpperCase()}`, type as any);

    res.setHeader('Content-Type', 'text/html');
    res.send(slip.html);
  } catch (error: any) {
    logger.error('Get sample slip error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get sample slip'));
  }
});

export default router;

