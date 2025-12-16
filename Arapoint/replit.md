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
- `SENDGRID_API_KEY` - SendGrid API key (optional, OTPs logged in dev mode)

## Running the Project
```bash
cd Arapoint
npm run dev
```

## Development Notes
- OTPs are logged to console when SendGrid is not configured
- Rate limiting is applied to all public routes
- All authenticated routes require Bearer token
- Maximum 20 concurrent RPA jobs with exponential backoff retry

## Recent Changes
- 2025-12-16: Added PDF file upload for CAC agent document completion using object storage
- 2025-12-16: Added sample NIN slip downloads for all 4 tiers (Information, Regular, Standard, Premium)
- 2025-12-16: Connected admin pricing UI to real database API with numeric validation
- 2025-12-16: Secured upload endpoint with authMiddleware and rate limiting
- 2024-12-04: Added email OTP verification system for registration
- 2024-12-04: Created production database schema with 14 tables
- 2024-12-04: Implemented complete backend service layer
