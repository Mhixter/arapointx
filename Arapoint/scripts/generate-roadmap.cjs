const PDFDocument = require('../node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../exports/Arapoint_Technical_Roadmap.pdf');
const doc = new PDFDocument({ margin: 55, size: 'A4', info: { Title: 'Arapoint Technical Roadmap', Author: 'Arapoint' } });
doc.pipe(fs.createWriteStream(outputPath));

// ── Palette ──────────────────────────────────────────────────────────────────
const TEAL   = '#0D9488';
const DARK   = '#111827';
const GRAY   = '#6B7280';
const LGRAY  = '#F3F4F6';
const WHITE  = '#FFFFFF';
const INDIGO = '#4F46E5';
const AMBER  = '#D97706';
const GREEN  = '#059669';

const W = doc.page.width - 110; // usable content width

// ── Helpers ──────────────────────────────────────────────────────────────────
function cover() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0F172A');
  doc.rect(0, 0, doc.page.width, 6).fill(TEAL);

  doc.moveDown(6);
  doc.fontSize(11).fillColor('#64748B').font('Helvetica')
    .text('TECHNICAL DOCUMENTATION', { align: 'center', characterSpacing: 2 });

  doc.moveDown(0.8);
  doc.fontSize(42).fillColor(WHITE).font('Helvetica-Bold')
    .text('Arapoint', { align: 'center' });

  doc.fontSize(20).fillColor(TEAL).font('Helvetica')
    .text('Nigerian Identity & Utility Verification Platform', { align: 'center' });

  doc.moveDown(1.5);
  doc.fontSize(13).fillColor('#94A3B8').font('Helvetica')
    .text('System Architecture · API Reference · Developer Roadmap', { align: 'center' });

  doc.moveDown(3);
  // Draw a subtle separator
  doc.moveTo(110, doc.y).lineTo(doc.page.width - 110, doc.y).strokeColor(TEAL).lineWidth(1).stroke();
  doc.moveDown(1.5);

  const today = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fontSize(10).fillColor('#475569').font('Helvetica')
    .text(`Version 1.0  ·  ${today}  ·  Confidential`, { align: 'center' });

  doc.addPage();
}

function header(title) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  const y = doc.y;
  doc.rect(55, y, 4, 22).fill(TEAL);
  doc.fontSize(16).fillColor(DARK).font('Helvetica-Bold')
    .text(title, 68, y + 3);
  doc.moveDown(0.8);
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function subHeader(title) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor(INDIGO).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

function body(text, indent = 0) {
  doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
    .text(text, { indent, lineGap: 2 });
  doc.moveDown(0.25);
}

function bullet(text, level = 0) {
  const indent = 14 + level * 14;
  const bullet = level === 0 ? '•' : '–';
  doc.fontSize(9.5).fillColor(DARK).font('Helvetica')
    .text(`${bullet}  ${text}`, 55, doc.y, { indent, lineGap: 2, width: W - indent });
  doc.moveDown(0.15);
}

function tableHeader(cols) {
  if (doc.y > doc.page.height - 60) doc.addPage();
  const y = doc.y;
  const colW = W / cols.length;
  doc.rect(55, y, W, 18).fill(TEAL);
  cols.forEach((c, i) => {
    doc.fontSize(8.5).fillColor(WHITE).font('Helvetica-Bold')
      .text(c, 60 + i * colW, y + 4, { width: colW - 8 });
  });
  doc.moveDown(0.1);
  doc.y = y + 18;
}

function tableRow(cells, shade) {
  if (doc.y > doc.page.height - 40) doc.addPage();
  const y = doc.y;
  const colW = W / cells.length;
  const h = 16;
  if (shade) doc.rect(55, y, W, h).fill(LGRAY);
  else doc.rect(55, y, W, h).fill(WHITE);
  doc.rect(55, y, W, h).strokeColor('#E5E7EB').lineWidth(0.3).stroke();
  cells.forEach((c, i) => {
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica')
      .text(c, 60 + i * colW, y + 3.5, { width: colW - 8, lineBreak: false });
  });
  doc.y = y + h;
  doc.moveDown(0.05);
}

function badge(label, color, textColor = WHITE) {
  const bw = doc.widthOfString(label) + 14;
  const bh = 13;
  const x = 55;
  const y = doc.y;
  doc.roundedRect(x, y, bw, bh, 3).fill(color);
  doc.fontSize(7.5).fillColor(textColor).font('Helvetica-Bold').text(label, x + 7, y + 2.5);
  doc.moveDown(0.5);
}

function infoBox(text, color = LGRAY, textColor = DARK) {
  if (doc.y > doc.page.height - 60) doc.addPage();
  const y = doc.y;
  const h = doc.heightOfString(text, { width: W - 20 }) + 14;
  doc.rect(55, y, W, h).fill(color);
  doc.rect(55, y, 3, h).fill(TEAL);
  doc.fontSize(9).fillColor(textColor).font('Helvetica')
    .text(text, 72, y + 7, { width: W - 20 });
  doc.y = y + h + 6;
  doc.moveDown(0.3);
}

function codeBlock(text) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const y = doc.y;
  const h = doc.heightOfString(text, { width: W - 20, lineGap: 2 }) + 16;
  doc.rect(55, y, W, h).fill('#1E293B');
  doc.fontSize(8).fillColor('#7DD3FC').font('Courier')
    .text(text, 65, y + 8, { width: W - 20, lineGap: 2 });
  doc.y = y + h + 6;
  doc.moveDown(0.3);
}

function pageBreak() { doc.addPage(); }

function toc() {
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold').text('Table of Contents');
  doc.moveDown(0.8);
  const items = [
    ['1.', 'Tech Stack & Architecture', '3'],
    ['2.', 'Database Schema', '4'],
    ['3.', 'Module 1 — Public Marketing Site', '5'],
    ['4.', 'Module 2 — Main Platform Dashboard', '5'],
    ['5.', 'Module 3 — Developer API Portal', '6'],
    ['6.', 'Employment Verification Endpoint', '8'],
    ['7.', 'Module 4 — Admin Control Panel', '9'],
    ['8.', 'RPA Worker System', '10'],
    ['9.', 'Security Model', '10'],
    ['10.', 'Suggested Improvements & Roadmap', '11'],
  ];
  items.forEach(([num, title, pg]) => {
    const y = doc.y;
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(num, 55, y, { continued: true, width: 25 });
    doc.font('Helvetica').fillColor(DARK).text(title, { continued: true, width: W - 55 });
    doc.fillColor(TEAL).text(pg, { align: 'right', width: W - 25 });
    doc.moveTo(55, doc.y - 1).lineTo(55 + W, doc.y - 1).strokeColor('#E5E7EB').lineWidth(0.3).stroke();
    doc.moveDown(0.35);
  });
  pageBreak();
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD DOCUMENT
// ──────────────────────────────────────────────────────────────────────────────
cover();
toc();

// ── 1. Tech Stack & Architecture ─────────────────────────────────────────────
header('1. Tech Stack & Architecture');

subHeader('Frontend');
tableHeader(['Technology', 'Role', 'Notes']);
[
  ['React 18 + TypeScript', 'UI framework', 'Component-based SPA'],
  ['Vite', 'Build tool', 'Hot module replacement, fast builds'],
  ['TailwindCSS', 'Styling', 'Utility-first CSS framework'],
  ['shadcn/ui', 'Component library', 'Radix UI primitives + Tailwind'],
  ['Wouter', 'Client routing', 'Lightweight React router'],
].forEach(([t, r, n], i) => tableRow([t, r, n], i % 2 === 0));

doc.moveDown(0.6);
subHeader('Backend');
tableHeader(['Technology', 'Role', 'Notes']);
[
  ['Node.js + Express', 'HTTP server', 'REST API, port 5000'],
  ['TypeScript (tsx)', 'Runtime', 'No compile step — direct execution'],
  ['Drizzle ORM', 'Database layer', 'Type-safe PostgreSQL queries'],
  ['PostgreSQL', 'Database', 'Replit-managed hosted instance'],
  ['bcrypt', 'Security', 'Password + secret key hashing'],
  ['jsonwebtoken', 'Auth', 'JWT for developer portal sessions'],
].forEach(([t, r, n], i) => tableRow([t, r, n], i % 2 === 0));

doc.moveDown(0.6);
subHeader('External Integrations');
tableHeader(['Service', 'Purpose', 'Auth Method']);
[
  ['Prembly (IdentityPass)', 'NIN + BVN verification', 'PREMBLY_SECRET_KEY env var'],
  ['Replit Object Storage', 'File/document storage', 'Managed integration'],
  ['OpenAI', 'AI features (available)', 'Managed integration'],
].forEach(([s, p, a], i) => tableRow([s, p, a], i % 2 === 0));

doc.moveDown(0.6);
subHeader('Two Concurrent Workflows');
body('The platform runs two Node.js processes simultaneously:');
bullet('Server Backend — Express API server on port 5000, handles all HTTP traffic');
bullet('RPA Worker — Standalone job processor that polls the database queue and executes browser automation for async verification tasks (WAEC, NECO, IPE, etc.)');

doc.moveDown(0.5);
subHeader('Repository Structure');
codeBlock(
`Arapoint/
├── client/                  React SPA (all frontend code)
│   └── src/pages/
│       ├── (public)         Marketing site pages
│       ├── dashboard/       Main platform UI
│       ├── developer/       B2B Developer portal (dark theme)
│       └── admin/           Admin control panel
├── server/
│   ├── src/
│   │   ├── api/routes/      Express route handlers
│   │   ├── services/        External API integrations (Prembly, etc.)
│   │   └── db/              Drizzle ORM schema & DB connection
│   └── rpa-worker.ts        Standalone RPA job processor
└── exports/                 Generated files (PDFs, reports)`
);

pageBreak();

// ── 2. Database Schema ────────────────────────────────────────────────────────
header('2. Database Schema');
subHeader('Core Developer Tables');
tableHeader(['Table', 'Purpose', 'Key Columns']);
[
  ['developer_users', 'Developer accounts', 'id, email, password_hash, wallet_balance, kyc_status, environment_mode'],
  ['developer_api_keys', 'API credential pairs', 'api_key, secret_key_hash, secret_key_last_four, environment'],
  ['developer_api_logs', 'API call audit trail', 'developer_id, endpoint, status_code, cost, duration_ms'],
  ['developer_transactions', 'Wallet history', 'developer_id, transaction_type, amount, description'],
].forEach(([t, p, k], i) => tableRow([t, p, k], i % 2 === 0));

doc.moveDown(0.5);
subHeader('RPA & Service Tables (shared with main platform)');
tableHeader(['Table', 'Purpose', 'Key Columns']);
[
  ['rpa_jobs', 'Async verification queue', 'service_type, query_data, status, result, error_message'],
  ['kyc_documents (column)', 'KYB structured data', 'JSONB on developer_users — companyInfo, directors, apiUseCase, compliance'],
].forEach(([t, p, k], i) => tableRow([t, p, k], i % 2 === 0));

doc.moveDown(0.5);
infoBox('All developer tables use inline Drizzle ORM definitions in developer.ts. An idempotent migration (ALTER TABLE ... ADD COLUMN IF NOT EXISTS) runs on server startup to ensure new columns exist without downtime.');

pageBreak();

// ── 3. Public Marketing Site ──────────────────────────────────────────────────
header('3. Module 1 — Public Marketing Site');
body('Fully built React pages with teal/green brand theme. No authentication required.');
tableHeader(['Route', 'Page', 'Notes']);
[
  ['/', 'Home', 'Hero, features overview, CTA'],
  ['/features', 'Features', 'Platform capability showcase'],
  ['/services', 'Services', 'NIN, BVN, Employment Verification, CAC'],
  ['/pricing', 'Pricing', 'Tiered plans — no NGN amounts shown publicly'],
  ['/about', 'About', 'Company information'],
  ['/careers', 'Careers', 'Job listings'],
  ['/contact', 'Contact', 'Enquiry form'],
  ['/privacy', 'Privacy Policy', 'NDPR-aligned privacy policy'],
  ['/terms', 'Terms of Service', 'Legal terms'],
  ['/developers', 'Developer Hub', 'API overview landing page'],
].forEach(([r, p, n], i) => tableRow([r, p, n], i % 2 === 0));

doc.moveDown(0.6);
header('4. Module 2 — Main Platform Dashboard');
body('Internal/enterprise verification dashboard. Requires staff login. Services available:');
tableHeader(['Service', 'Provider', 'Mode']);
[
  ['NIN Lookup', 'Prembly', 'Synchronous'],
  ['BVN Verification', 'Prembly', 'Synchronous (basic + premium face match)'],
  ['WAEC/SSCE Result', 'RPA Worker', 'Asynchronous — queued job'],
  ['NECO Result', 'RPA Worker', 'Asynchronous — queued job'],
  ['NABTEB Result', 'RPA Worker', 'Asynchronous — queued job'],
  ['CAC Business Lookup', 'External API', 'Synchronous'],
  ['IPE / IPPIS Clearance', 'RPA Worker', 'Asynchronous — queued job'],
  ['NIN Personalization', 'RPA Worker', 'Asynchronous — queued job'],
].forEach(([s, p, m], i) => tableRow([s, p, m], i % 2 === 0));

pageBreak();

// ── 5. Developer API Portal ───────────────────────────────────────────────────
header('5. Module 3 — Developer API Portal (B2B)');

subHeader('Developer Onboarding Flow');
codeBlock(
`1. Developer visits /developer/login → clicks "Create Account"
2. Enters email → receives OTP (via otpService)
3. Submits OTP + name + password → account created
4. Server auto-creates Sandbox keypair → credentials returned ONCE
5. Developer logs in → receives 7-day JWT for portal session
6. Developer uses API Key (X-API-Key header) for all API calls`
);

subHeader('Three Developer Credentials');
tableHeader(['Credential', 'Format Example', 'Purpose']);
[
  ['Account ID', 'a3f2c1d0-...UUID...', 'Unique account identifier — for support & billing'],
  ['API Key', 'ara_sand_48f3a...  /  ara_live_c9d2b...', 'Authenticates API calls via X-API-Key header'],
  ['Secret Key', 'ara_sk_sand_...  /  ara_sk_live_...', 'Signs webhook payloads from Arapoint to developer'],
].forEach(([c, f, p], i) => tableRow([c, f, p], i % 2 === 0));

doc.moveDown(0.4);
infoBox('Security: Secret keys are hashed with bcrypt (cost factor 10) before storage. Only the last 4 characters are stored in plain text. The raw secret key is revealed exactly once — immediately after creation — and cannot be recovered.');

doc.moveDown(0.4);
subHeader('Sandbox → Live Mode Progression');
codeBlock(
`Register → Sandbox Mode (auto sandbox keypair created)
    ↓
Developer tests API with sandbox keys (ara_sand_xxx)
    ↓
Developer submits KYB (5-step business verification form)
    ↓
Admin reviews KYB → Approve / Conditional / Reject
    ↓
On Approval → Admin promotes developer to Live Mode
    ↓
Developer can now create Live keys (ara_live_xxx)
Live keys → process real identity data`
);

doc.moveDown(0.4);
subHeader('Developer Portal Pages');
tableHeader(['Page', 'URL', 'Function']);
[
  ['Login / Register', '/developer/login', 'OTP-verified account creation'],
  ['Dashboard', '/developer/dashboard', 'Stats, recent calls, wallet balance'],
  ['API Credentials', '/developer/api-keys', 'Account ID, sandbox/live keys + secret keys'],
  ['API Logs', '/developer/logs', 'All call history with cost and status'],
  ['Billing', '/developer/billing', 'Wallet balance, transactions, top-up'],
  ['Documentation', '/developer/docs', 'API reference with code examples'],
  ['Business Verification', '/developer/kyb', '5-step KYB form (KYC for businesses)'],
  ['Account Settings', '/developer/account', 'Profile, password change, KYB status'],
].forEach(([p, u, f], i) => tableRow([p, u, f], i % 2 === 0));

doc.moveDown(0.4);
subHeader('API Endpoints (all require X-API-Key header)');
tableHeader(['Endpoint', 'Method', 'Cost (₦)', 'Description']);
[
  ['/verify/nin', 'POST', '130', 'NIN lookup via Prembly — name, DOB, photo, address'],
  ['/verify/bvn', 'POST', '80', 'BVN lookup via Prembly — name, DOB, phone, bank'],
  ['/verify/education', 'POST', '250', 'SSCE/WAEC/NECO/NABTEB — queued via RPA worker'],
  ['/verify/education/result', 'GET', 'Free', 'Poll RPA job status by jobId'],
  ['/verify/unified', 'POST', '400', 'Combined NIN + BVN + Education in one call'],
  ['/verify/employment', 'POST', '350–450', 'Full employment check — see Section 6'],
].forEach(([e, m, c, d], i) => tableRow([e, m, c, d], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Example API Request');
codeBlock(
`curl -X POST https://arapoint.com.ng/api/v1/developer/verify/nin \\
  -H "X-API-Key: ara_sand_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "12345678901"}'

Response:
{
  "status": "success",
  "code": 200,
  "message": "NIN verification completed",
  "data": {
    "verification": {
      "success": true,
      "data": {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-01-15",
        "gender": "Male",
        "phone": "080XXXXXXXX",
        "address": "12 Sample Street, Lagos"
      }
    }
  }
}`
);

pageBreak();

// ── 6. Employment Verification ────────────────────────────────────────────────
header('6. Employment Verification Endpoint');

subHeader('How It Works — System Flow');
codeBlock(
`POST /api/v1/developer/verify/employment
Body: { nin, bvn, ssce: { provider, examYear, registrationNumber }, level }

Step 1: Validate inputs (NIN 11 digits, BVN 11 digits, SSCE provider valid)
Step 2: Deduct developer wallet (₦350 standard / ₦450 higher)
Step 3: Call Prembly API for NIN  ──────────────────────┐
Step 4: Call Prembly API for BVN  ──────────────────────┤ parallel
Step 5: Queue RPA job for SSCE   ──────────────────────┘
Step 6: Cross-reference — name match + DOB match (NIN ↔ BVN)
Step 7: Compute weighted confidence score
Step 8: Return full checkpoint result immediately
         (SSCE result arrives later — caller polls jobId)`
);

subHeader('Confidence Scoring System');
tableHeader(['Checkpoint', 'Weight', 'Notes']);
[
  ['NIN Verified', '35 pts', 'Full name, DOB, address confirmed via NIMC'],
  ['BVN Verified', '30 pts', 'Financial identity confirmed via CBN/bank record'],
  ['Name Cross-Match (NIN ↔ BVN)', '10 pts', 'Fuzzy match — handles order differences'],
  ['DOB Cross-Match (NIN ↔ BVN)', '10 pts', 'Date of birth consistency check'],
  ['SSCE Qualification Verified', '15 pts', 'Async — added when RPA job completes'],
  ['TOTAL', '100 pts', 'If SSCE not provided, max scales to 85 pts'],
].forEach(([c, w, n], i) => tableRow([c, w, n], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Confidence Grade Thresholds');
tableHeader(['Grade', 'Score Range', 'Label']);
[
  ['A', '90 – 100%', 'Very High Confidence'],
  ['B', '75 – 89%', 'High Confidence'],
  ['C', '55 – 74%', 'Moderate Confidence'],
  ['D', '35 – 54%', 'Low Confidence'],
  ['F', '0 – 34%', 'Very Low Confidence'],
].forEach(([g, s, l], i) => tableRow([g, s, l], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Example Response Structure');
codeBlock(
`{
  "status": "success",
  "data": {
    "requestId": "EMP-A3F2C1D0B4E5...",
    "level": "standard",
    "confidence": {
      "score": 85,
      "label": "High Confidence",
      "grade": "B",
      "earned": 85,
      "maxPossible": 100
    },
    "checkpoints": {
      "nin":  { "status": "verified", "earned": 35, "data": { ... } },
      "bvn":  { "status": "verified", "earned": 30, "data": { ... } },
      "crossMatch": {
        "nameMatch": { "result": true,  "earned": 10 },
        "dobMatch":  { "result": true,  "earned": 10 }
      },
      "ssce": {
        "status": "processing",
        "jobId": "uuid-of-rpa-job",
        "pollUrl": "GET /verify/education/result?jobId=...",
        "maxScore": 15, "earnedScore": 0
      }
    }
  }
}`
);

pageBreak();

// ── 7. Admin Control Panel ────────────────────────────────────────────────────
header('7. Module 4 — Admin Control Panel');

body('Separate authentication layer (admin session). Full-access management interface.');

subHeader('Admin Sections');
tableHeader(['Section', 'Capability']);
[
  ['Platform Stats', 'Total developers, active count, total API calls, platform revenue, pending KYB'],
  ['Developer List', 'Searchable table — all developers with mode, KYB status, wallet, active/inactive status'],
  ['Developer Detail Panel', 'Slide-in panel: full profile, API keys, usage summary, recent logs, action buttons'],
  ['API Logs', 'All platform calls — developer name, endpoint, method, status, cost, duration'],
  ['KYB Review Queue', 'Structured KYB data view — 3-way decision (Approve / Conditional / Reject)'],
].forEach(([s, c], i) => tableRow([s, c], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Admin API Endpoints');
tableHeader(['Endpoint', 'Method', 'Function']);
[
  ['/admin/developers', 'GET', 'Paginated developer list'],
  ['/admin/developers/:id', 'GET', 'Full detail: profile + keys + logs + usage summary'],
  ['/admin/developers/:id/status', 'PATCH', 'Activate or deactivate account'],
  ['/admin/developers/:id/promote', 'PATCH', 'Promote to Live mode (requires approved KYB) or move to Sandbox'],
  ['/admin/stats', 'GET', 'Platform-wide statistics'],
  ['/admin/logs/all', 'GET', 'All API logs with developer name/email (joined query)'],
  ['/admin/kyc', 'GET', 'KYB queue filtered by status'],
  ['/admin/kyc/:id', 'PATCH', 'Submit KYB decision (approve/conditional/reject)'],
].forEach(([e, m, f], i) => tableRow([e, m, f], i % 2 === 0));

doc.moveDown(0.4);
subHeader('KYB (Business Verification) Form — 5 Steps');
tableHeader(['Step', 'Data Collected']);
[
  ['1 — Company Info', 'Legal name, CAC number, business type, date of incorporation, address, state, TIN, phone, website'],
  ['2 — Directors / UBO', 'All directors: full name, DOB, nationality, ID type + number, ownership percentage'],
  ['3 — API Use Case', 'Purpose, expected monthly volume, target customers, revenue model, specific APIs needed'],
  ['4 — Compliance', 'PEP declaration, AML declaration, data usage agreement, developer terms acceptance'],
  ['5 — Review & Submit', 'Collapsible summary of all sections before final submission'],
].forEach(([s, d], i) => tableRow([s, d], i % 2 === 0));

pageBreak();

// ── 8. RPA Worker ─────────────────────────────────────────────────────────────
header('8. RPA Worker System');
body('A separate Node.js process (rpa-worker.ts) that runs continuously alongside the API server.');

codeBlock(
`RPA Worker lifecycle:

1. Polls rpa_jobs table WHERE status = 'pending' (interval: ~30s)
2. Claims job → sets status = 'processing'
3. Executes automation against target portal (WAEC, NECO, IPPIS, etc.)
4. Parses response → stores result JSON in rpa_jobs.result
5. Sets status = 'completed' (or 'failed' with error_message)
6. If developer has webhook_url → sends signed POST with result payload`
);

subHeader('Supported Job Types');
tableHeader(['Service Type', 'Target Source', 'Output']);
[
  ['waec_result', 'WAEC portal', 'Subject results, grades, year, registration number'],
  ['neco_result', 'NECO portal', 'Subject results, grades, year'],
  ['nabteb_result', 'NABTEB portal', 'Technical qualification results'],
  ['nbais_result', 'NBAIS portal', 'Islamic education board results'],
  ['jamb_score', 'JAMB portal', 'UTME scores, subject breakdown'],
  ['ipe_clearance', 'IPPIS portal', 'Payroll/civil service clearance status'],
  ['nin_personalization', 'NIMC portal', 'NIN slip generation and retrieval'],
].forEach(([s, t, o], i) => tableRow([s, t, o], i % 2 === 0));

doc.moveDown(0.6);
header('9. Security Model');

subHeader('Authentication Layers');
tableHeader(['Layer', 'Mechanism', 'Scope']);
[
  ['Developer portal session', 'JWT (HS256, 7-day expiry)', 'Portal UI routes (profile, keys, logs, billing)'],
  ['API calls', 'API Key in X-API-Key header', 'All /verify/* endpoints'],
  ['Admin panel', 'Admin JWT + adminAuth middleware', 'All /admin/* endpoints'],
  ['Webhook verification', 'HMAC-SHA256 using Secret Key', 'Incoming webhook to developer server'],
].forEach(([l, m, s], i) => tableRow([l, m, s], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Data Protection');
bullet('Passwords hashed with bcrypt (cost factor 10)');
bullet('Secret keys hashed with bcrypt — only last 4 characters stored in plain text');
bullet('API keys stored in plain text (needed for lookup) — rotatable on demand');
bullet('NIN and BVN numbers masked in API logs (first 4 + *** stored)');
bullet('KYB documents stored as encrypted JSONB — never returned in list endpoints');
bullet('Admin endpoints require separate credential — completely isolated from developer auth');

pageBreak();

// ── 10. Roadmap & Improvements ────────────────────────────────────────────────
header('10. Suggested Improvements & Roadmap');

subHeader('High Priority');
tableHeader(['Feature', 'Description', 'Complexity']);
[
  ['Webhook Delivery System', 'Send signed POSTs to developer webhook URLs when async jobs complete; HMAC-SHA256 signature using developer secret key', 'Medium'],
  ['Real Payment Integration', 'Replace mock wallet funding with Paystack or Flutterwave for actual NGN deposits and reconciliation', 'Medium'],
  ['Email Notification System', 'KYB status changes, low wallet balance alerts, job completion emails via Sendgrid/Mailgun', 'Low'],
  ['Rate Limiting', 'Per-API-key request limits: sandbox (100/day), live (based on plan); return 429 with Retry-After', 'Medium'],
].forEach(([f, d, c], i) => tableRow([f, d, c], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Medium Priority');
tableHeader(['Feature', 'Description', 'Complexity']);
[
  ['NYSC Verification', 'Complete Employment Higher tier — add NYSC check via RPA to the /verify/employment level: "higher" path', 'Medium'],
  ['Sandbox Mock Responses', 'Return realistic simulated data in sandbox mode so developers can build and test without real credits', 'Low'],
  ['Developer SDK', 'Official Node.js and Python client libraries with full TypeScript types and async support', 'Medium'],
  ['API Versioning', 'Move to /api/v2/ with structured deprecation policy and breaking-change management', 'Medium'],
  ['Team Access', 'Allow developers to invite team members with role-based permissions (admin/read-only)', 'High'],
].forEach(([f, d, c], i) => tableRow([f, d, c], i % 2 === 0));

doc.moveDown(0.4);
subHeader('Lower Priority');
tableHeader(['Feature', 'Description', 'Complexity']);
[
  ['Admin Audit Log', 'Track every admin action: who approved which KYB, who promoted to live, who deactivated', 'Low'],
  ['Usage Alerts', 'Developer wallet low-balance alerts via webhook/email at configurable thresholds', 'Low'],
  ['Analytics Dashboard', 'Developer-facing charts: calls per day, endpoint breakdown, success rate, spend trends', 'Medium'],
  ['IP Allowlisting', 'Restrict API key usage to specific IP ranges (per key configuration)', 'Low'],
  ['Batch Verification API', 'Accept arrays of records for bulk NIN/BVN/employment checks with async result delivery', 'High'],
].forEach(([f, d, c], i) => tableRow([f, d, c], i % 2 === 0));

doc.moveDown(0.6);
infoBox('The platform foundation is solid. The most impactful next steps are: (1) webhook delivery so developers get real-time async results, (2) Paystack payment integration to enable real wallet funding, and (3) sandbox mock responses to dramatically improve developer onboarding experience.');

// ── Footer on last page ───────────────────────────────────────────────────────
doc.moveDown(2);
doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor(TEAL).lineWidth(1).stroke();
doc.moveDown(0.5);
const today = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
doc.fontSize(8).fillColor(GRAY).font('Helvetica')
  .text(`Arapoint Technical Roadmap  ·  ${today}  ·  Confidential — For Internal Distribution Only`, { align: 'center' });

doc.end();

doc.on('end', () => {
  console.log('PDF generated: ' + outputPath);
});
