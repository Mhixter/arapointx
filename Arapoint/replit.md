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
