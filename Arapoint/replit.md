# Arapoint - Nigerian Identity Verification Platform

## Overview
Arapoint is a production-ready Nigerian Identity Verification and Management Platform with comprehensive backend APIs, database schema, and RPA automation layer.

## Features
- Identity verification (NIN, BVN)
- Education verification (JAMB, WAEC, NECO)
- VTU services (airtime, data)
- Subscription services (electricity, cable)
- Email OTP verification for user registration
- Wallet management with payment integrations

## Tech Stack
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM
- **Authentication**: JWT with refresh tokens
- **Email**: SendGrid (for OTP delivery)
- **Identity Verification**: YouVerify API (NIN/BVN)

## Recent Updates (March 2026 — Session 4)
- **Admin Profile Settings page**: New `AdminProfile.tsx` at `/admin/profile` — view avatar/role badge, update display name, change password (with current-password verification). API endpoints `GET /api/admin/me`, `PUT /api/admin/me`, `PUT /api/admin/me/password` added to admin.ts.
- **Admin Notifications page**: New `AdminNotifications.tsx` at `/admin/notifications` — shows all notifications (read + unread), per-item "Mark read" button, bulk "Mark all read". New `GET /api/admin/notifications/all` endpoint returns last 100 notifications.
- **Admin Activity Log page**: New `AdminActivityLog.tsx` at `/admin/logs` — searchable event history using the notifications feed, with type badge coloring (error/warning/success/info) and relative + absolute timestamps.
- **AdminCRUDLayout wired up**: Bell icon navigates to `/admin/notifications`; "Profile Settings" dropdown item navigates to `/admin/profile`; "Activity Log" dropdown item navigates to `/admin/logs`.
- **AdminSettings Support tab**: New dedicated "Support" tab (headset icon) groups support email, support phone, WhatsApp channel link, WhatsApp group link all in one place. "Support Contact Links" card removed from General tab; email/phone removed from General's Site Information (now only siteName + siteAddress in General). `handleSaveSupport` saves all 4 support-facing contact fields.
- **FileStorage redesigned**: Tabs removed entirely; all documents in one unified vertical list sorted by date. Agent-delivered files show a colored service badge (CAC Registration, Education Result, NIN / Identity, JAMB Service) and a Download button. User uploads show "My Upload" label + full dropdown menu (download, share, delete). Upload zone stays at top; search bar appears once files exist.

## Recent Updates (March 2026 — Session 3)
- **DOB date parsing fixed (all templates)**: Both `pdfSlipGenerator.ts` and `slipGenerator.ts` now correctly parse Prembly's DD-MM-YYYY format using regex + UTC construction (e.g. "10-11-2001" → "10 NOV 2001" instead of "11 OCT 2001"). ISO YYYY-MM-DD is also handled via UTC to avoid timezone-shift off-by-one errors. A shared `parseDateSafe()` helper was added to `slipGenerator.ts` used by both `formatDateShort` and `formatDateSlash`.
- **`trackingId` added to NINData**: Interface now includes `trackingId?: string`. All 4 NINData instantiations in `premblyService.ts` (verifyNIN, verifyVNIN, verifyNINWithPhone, retrieveNINByPhone) now map `rawData.trackingId || rawData.tracking_id || rawData.centralID`.
- **Compression middleware wired**: `compression` package now loaded in `server/index.ts` before all other middleware. Level 6 deflate/gzip on all API and HTML responses.
- **Keep-alive endpoint added**: `GET /api/ping` returns `{ok:true, ts:<ms>}` — use a cron job or frontend interval to prevent Replit container from sleeping.
- **JAMB file uploads migrated to object storage**: Both `education.ts` and `jambAgent.ts` now use `multer.memoryStorage()` and try to upload via `objectStorageService.uploadBuffer()`. If object storage is not configured (`PRIVATE_OBJECT_DIR` not set), files fall back to local disk `uploads/jamb-docs/`. Download routes detect whether `fileKey` starts with `/objects/` and serve from object storage or local disk accordingly — fully backward-compatible with existing disk-stored files.
- **`objectStorageService.uploadBuffer()`**: New server-side method added to `objectStorage.ts` — accepts a `Buffer`, MIME type, prefix, and extension; signs a PUT URL via sidecar, uploads, and returns the `/objects/…` path (or `null` on failure/unconfigured).

## Recent Updates (March 2026 — Session 2)
- **Transaction lookup fixed (G)**: Support agent lookup was querying non-existent `transactions.reference` field — corrected to `transactions.referenceId`. Search now spans reference ID, description, user email, phone, and name (was reference-only).
- **NIN slip templates redesigned (R/S)**: All 4 templates (standard, premium, long, full_info) fully rewritten as self-contained HTML/CSS — no longer depend on background PNG images. Professional government-style design with green NIMC header, gold ribbon, photo frame, NIN band, QR code, and Arapoint footer branding. Template image load failure now returns empty string instead of throwing.
- **PaymentPoint gateway added (I/J)**: New `paymentpointService.ts` with createVirtualAccount, webhook signature verification, and payload parsing. Added as primary virtual account provider (PaymentPoint → PalmPay → PayVessel fallback chain). Webhook endpoint `POST /api/webhooks/paymentpoint` added. Credentials: `PAYMENTPOINT_API_KEY`, `PAYMENTPOINT_SECRET_KEY`, `PAYMENTPOINT_MERCHANT_ID` (configurable in admin Gateways settings or via env vars / adminSettings DB).

## Recent Updates (March 2026)
- **Fraud detection system**: `fraudService.ts` with velocity checks (15+ tx/hour), large-amount detection (₦500k+), daily volume caps (₦2M+), failed-tx pattern detection (5+ failed/day), and 6-hour dedup window. Hooks into `walletService.deductBalance` (fire-and-forget). `fraud_alerts` table in DB with severity levels (low/medium/high/critical).
- **Cross-department lookup**: Support agents can search all departments (A2C, Identity, Education, CAC, Transactions, Tickets, Users) by tracking ID, phone, email, or business name via `GET /admin/support/lookup?q=`.
- **Department tagging on support tickets**: `departmentTag`, `linkedOrderId`, `linkedOrderType` columns added to `support_tickets` (DB migrated). `PUT /admin/support/tickets/:id/department` endpoint.
- **Internal messaging (cross-dept)**: New `agent_internal_messages` table. Support agents can send internal messages to any department with `POST /admin/support/tickets/:id/internal-messages`.
- **SupportAgentDashboard rebuilt**: Three top-level tabs — My Tickets, Cross-Dept Lookup, Fraud Alerts. Ticket view has three inner tabs — Messages, Notes, Internal Messages. Department tagging controls in ticket header. Internal message composer with department selector.
- **AI support improvements**: Both ticket-creation and message-handling prompts rewritten with full Arapoint service knowledge (NIN/BVN/JAMB/VTU/A2C/CAC/Wallet). Client-side keyword escalation detection (refund, deducted, fraud, etc.) and agent request detection before sending to AI.
- **JWT token expiry aligned**: `userService.ts` access token now uses `8h` (was `1h`), fixing JAMB download failures after 30 minutes
- **A2C Agent Dashboard**: Added "Receiving #" column to agent request table, showing the customer airtime number per request
- **Account suspension system**: `isSuspended`, `suspendedAt`, `suspendReason` fields added to users table (DB migrated); auth middleware now blocks suspended users with 403; admin endpoints `PUT /admin/users/:id/suspend` and `/unsuspend` added; Suspend/Unsuspend buttons with reason modal added to AdminUserManagement
- **Admin refund on transactions**: `POST /admin/transactions/:id/refund` endpoint added; refund buttons added to AdminTransactions row hover actions and transaction detail dialog
- **Suspended user page**: `/suspended` route added with a clean suspension notice page; API client redirects there on 403 with `suspended: true`
- **Maintenance mode banner**: DashboardLayout now fetches public settings and shows an amber banner when `maintenanceMode` is enabled by admin
- **Payment**: PayStack and Direct Debit removed; Payvessel (palmpay backend) is now the sole payment method
- **PDF slip fix**: `PUPPETEER_EXECUTABLE_PATH` env var used for Chromium in pdfSlipGenerator

## Recent Updates (December 2025)
- Integrated YouVerify API for real-time NIN and BVN verification
- Created comprehensive slip generator with 4 official formats (Information, Regular, Standard, Premium)
- Added slip type selection from frontend to backend
- Dashboard Overview now fetches real stats, transactions, and verifications from database
- All verification records now properly link to users via userId

## Project Structure
```
Arapoint/
├── server/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── validators/  # Zod validation schemas
│   │   │   └── middleware/  # Auth, rate limiting
│   │   ├── services/        # Business logic
│   │   ├── db/             # Database schema
│   │   ├── config/         # Environment config
│   │   └── utils/          # Helper functions
│   ├── routes.ts           # Route registration
│   └── index.ts            # Server entry point
├── shared/                 # Shared schema (for migrations)
├── client/                 # Frontend (React + Vite)
└── migrations/             # Drizzle migrations
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### OTP Verification (Email)
- `POST /api/otp/send` - Send OTP to email
- `POST /api/otp/verify` - Verify OTP code
- `POST /api/otp/register` - Register with OTP verification

### Identity Verification
- `POST /api/bvn/*` - BVN verification services
- `POST /api/identity/*` - NIN verification services
- `POST /api/birth/*` - Birth certificate attestation

### Education Verification
- `POST /api/education/jamb` - JAMB result verification
- `POST /api/education/waec` - WAEC result verification
- `POST /api/education/neco` - NECO result verification

### VTU Services
- `POST /api/airtime/*` - Airtime purchase
- `POST /api/data/*` - Data bundle purchase
- `POST /api/electricity/*` - Electricity bill payment
- `POST /api/cable/*` - Cable TV subscription

### Wallet & Payments
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/fund` - Fund wallet
- `GET /api/wallet/transactions` - Transaction history

## Database Tables (14)
1. users - User accounts with wallet balance
2. otp_verifications - Email OTP storage
3. rpa_jobs - RPA job queue
4. bot_credentials - Service credentials
5. bvn_services - BVN verification records
6. education_services - Education verification records
7. identity_verifications - Identity verification records
8. birth_attestations - Birth certificate records
9. airtime_services - Airtime purchase records
10. data_services - Data purchase records
11. electricity_services - Electricity payment records
12. cable_services - Cable subscription records
13. transactions - All financial transactions
14. admin_settings - System configuration

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `SMTP_USER` - Gmail address for sending emails (optional, OTPs logged in dev mode)
- `SMTP_PASS` - Gmail App Password for SMTP authentication
- `SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)

## Running the Project
```bash
cd Arapoint
npm run dev
```

## Deploying to Railway

### Prerequisites
- Railway account (https://railway.app)
- GitHub account with this repo pushed
- PostgreSQL database (Railway provides one)

### Step 1: Connect GitHub
1. Go to Railway dashboard → New Project
2. Select "Deploy from GitHub repo"
3. Choose your Arapoint repository

### Step 2: Add PostgreSQL Database
1. In Railway project, click "+ New" → "Database" → "PostgreSQL"
2. Railway auto-creates DATABASE_URL environment variable

### Step 3: Configure Environment Variables
In Railway dashboard, add these variables:
- `NODE_ENV=production`
- `PORT=5000`
- `JWT_SECRET=your-secret-key`
- `REFRESH_TOKEN_SECRET=your-refresh-secret`
- `SESSION_SECRET=your-session-secret`
- `ENCRYPTION_KEY=your-32-char-encryption-key`
- `PREMBLY_API_KEY=your-key`
- `PREMBLY_APP_ID=your-app-id`
- `VTPASS_API_KEY=your-key`
- `VTPASS_SECRET_KEY=your-secret`
- `VTPASS_PUBLIC_KEY=your-public-key`
- `VTPASS_SANDBOX=false`
- `SENDGRID_API_KEY=your-sendgrid-key`
- Add other payment/service API keys as needed

### Step 4: Deploy
Railway auto-deploys on push. Check logs for any issues.

### Step 5: Connect Custom Domain
1. In Railway project settings → Domains
2. Add your domain (e.g., arapoint.com)
3. Update DNS at your registrar (Truehost):
   - Add CNAME record pointing to Railway domain
   - Or A record with Railway IP

### Files Created for Railway
- `Dockerfile` - Docker configuration with Chrome for Puppeteer
- `railway.toml` - Railway-specific configuration
- `.dockerignore` - Excludes unnecessary files from build
- `.env.example` - Template for environment variables

## PayVessel Webhook Configuration

### Webhook Endpoint
**URL:** `https://your-arapoint-domain.com/webhooks/payvessel`

### How It Works
1. User transfers funds to their PayVessel virtual account
2. PayVessel receives the payment and sends a webhook notification to Arapoint
3. Arapoint verifies the webhook signature for security
4. User's wallet is automatically credited with the received amount
5. Transaction record is created for audit trail

### Setting Up in PayVessel
1. Log in to your PayVessel dashboard
2. Navigate to Webhooks/Notifications settings
3. Add the webhook URL: `https://your-arapoint-domain.com/webhooks/payvessel`
4. Set the event type: "Payment Received" or "Transaction Completed"
5. Ensure the webhook is enabled
6. Test the webhook configuration from PayVessel dashboard

### Webhook Payload Structure (from PayVessel)
```json
{
  "transactionReference": "TRX123456",
  "settlementId": "SETTLE123",
  "paymentReference": "PAY123",
  "amount": 50000,
  "transactionDate": "2025-12-20T10:00:00Z",
  "transactionDescription": "Bank transfer to account",
  "destinationAccountNumber": "0123456789",
  "destinationAccountName": "User Name",
  "destinationBankCode": "120001",
  "destinationBankName": "9Payment Service Bank",
  "sourceAccountNumber": "1234567890",
  "sourceAccountName": "Sender Name",
  "sourceBankCode": "050001",
  "sourceBankName": "FCMB",
  "status": "completed",
  "fee": 100,
  "vat": 15,
  "currency": "NGN"
}
```

### Security
- All webhooks are signed with HMAC-SHA512
- Signature is sent in the `X-PayVessel-Signature` header
- The signature is verified using your PayVessel secret key
- Only successfully verified webhooks are processed

## Development Notes
- OTPs are logged to console when SendGrid is not configured
- Rate limiting is applied to all public routes
- All authenticated routes require Bearer token
- Maximum 20 concurrent RPA jobs with exponential backoff retry

## Recent Changes
- 2026-02-07: Replaced SendGrid email service with Nodemailer Gmail SMTP for OTP delivery
  - Email service now reads SMTP config from both environment variables and admin settings database
  - When SMTP is not configured, OTPs are logged to console in development mode
  - Admin can configure SMTP settings (host, port, Gmail address, app password) from admin dashboard
  - Added test email functionality in admin settings to verify SMTP configuration
- 2026-02-07: Enhanced user Settings page with working functionality
  - Profile editing (name, phone) with API calls
  - Password change with validation
  - Dark mode toggle using theme provider
  - Notification preferences (local state)
- 2026-02-07: Enhanced admin Settings page with Email/SMTP configuration tab
  - SMTP host, port, Gmail address, app password configuration
  - Sender name and email configuration
  - Test email sending functionality
- 2026-02-07: Added change password API route (POST /api/auth/change-password)
- 2025-12-20: Added Identity Agent Services system for manual identity processing (NIN Validation, IPE Clearance, NIN Personalization)
  - New tables: identityAgents, identityServiceRequests, identityRequestActivity
  - Agent dashboard at `/agent/identity` for request pickup and completion
  - User request flow at `/dashboard/identity/agent-services` for submitting manual service requests
  - API endpoints: `/api/identity-agent/*` for user requests and agent workflows
- 2025-12-20: Fixed CAC service type CRUD endpoints to handle UUID string IDs correctly (removed incorrect parseInt conversion)
- 2025-12-20: Added CAC agent price management UI with tabbed interface for managing service pricing
- 2025-12-20: Added searchable business nature dropdown with 120+ CAC approved categories
- 2025-12-20: Added document upload UI for CAC registration (passport photo, signature, NIN slip) using base64 encoding
- 2025-12-20: Added price management API endpoints for CAC agents (GET/PUT/POST /cac-agent/service-types)
- 2025-12-16: Added PDF file upload for CAC agent document completion using object storage
- 2025-12-16: Added sample NIN slip downloads for all 4 tiers (Information, Regular, Standard, Premium)
- 2025-12-16: Connected admin pricing UI to real database API with numeric validation
- 2025-12-16: Secured upload endpoint with authMiddleware and rate limiting
- 2024-12-04: Added email OTP verification system for registration
- 2024-12-04: Created production database schema with 14 tables
- 2024-12-04: Implemented complete backend service layer
