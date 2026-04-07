# Arapoint - Nigerian Identity Verification Platform

## Overview

Arapoint is a production-ready Nigerian Identity Verification and Management Platform. It provides identity verification services (NIN, BVN), education verification (JAMB, WAEC, NECO), VTU services (airtime, data), subscription services (electricity, cable), and wallet management with payment integrations. The platform includes a user-facing dashboard, admin panel, and an RPA (Robotic Process Automation) layer for automating queries to third-party services that lack public APIs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Structure**: Component-based architecture with pages, components, hooks, and lib utilities located in `Arapoint/client/src/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Entry Point**: `Arapoint/server/index.ts` registers routes and middleware
- **API Pattern**: RESTful endpoints organized by domain (auth, identity, bvn, education, wallet, payment, admin)
- **Authentication**: JWT-based with access and refresh tokens
- **Validation**: Zod schemas for request validation
- **Middleware**: Rate limiting, error handling, authentication guards

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with schema defined in `Arapoint/shared/schema.ts` and `Arapoint/server/src/db/schema.ts`
- **Migrations**: Drizzle Kit with migrations stored in `Arapoint/migrations/`
- **Key Tables**: users, otp_verifications, rpa_jobs, transactions, identity_verifications, education_services, virtual_accounts, support_tickets, support_conversations, support_messages, support_internal_notes, support_presence

### RPA (Robotic Process Automation) Layer
- **Purpose**: Automates queries to third-party Nigerian government and institutional portals that lack APIs
- **Location**: `Arapoint/server/src/rpa/` for workers and bot controller
- **Technology**: Puppeteer for browser automation with browser pool (5 concurrent browsers, 45s timeout)
- **Architecture**: 
  - **Factory Pattern**: `EducationWorkerFactory` creates provider-specific workers using provider profiles
  - **Provider Profiles**: WAEC, NECO, NABTEB, NBAIS each have custom selectors, exam type normalizers, and field requirements
  - **Unified Worker**: Single `EducationWorker` class handles all education providers with injected configuration
  - **Preflight Validation**: Jobs fail fast if portal URLs are not configured in admin settings
- **Key Files**:
  - `Arapoint/server/src/rpa/workers/educationWorker.ts` - Factory and unified worker for all exam bodies
  - `Arapoint/server/src/rpa/workers/jambWorker.ts` - JAMB-specific worker
  - `Arapoint/server/src/rpa/bot.ts` - Job controller that polls database and dispatches to workers
  - `Arapoint/server/src/rpa/browserPool.ts` - Manages Puppeteer browser instances
- **Job Queue**: Database-backed job queue in `rpa_jobs` table, processed by bot controller

### JAMB Agent System
- **Purpose**: Dedicated agent system for processing JAMB service requests (O'Level Upload, Admission Letter, Original Result, PIN Vending, Reprinting & Caps)
- **Database Tables**: `jamb_agents`, `jamb_service_requests`, `jamb_request_documents`
- **Agent Routes**: `Arapoint/server/src/api/routes/jambAgent.ts` - Login, profile, stats, request management, document upload/download
- **User Endpoints**: In `Arapoint/server/src/api/routes/education.ts` - `/education/jamb-request` for submission, `/education/jamb-requests` for history, document upload
- **Admin Routes**: In `Arapoint/server/src/api/routes/admin.ts` - CRUD for JAMB agents, request listing
- **Agent Login**: `/jamb/agent/login` - `Arapoint/client/src/pages/agent/JAMBAgentLogin.tsx`
- **Agent Dashboard**: `/jamb/agent/dashboard` - `Arapoint/client/src/pages/agent/JAMBAgentDashboard.tsx`
- **Admin Page**: `/admin/jamb-agents` - `Arapoint/client/src/pages/admin/AdminJAMBAgents.tsx`
- **Privacy**: Agent dashboard hides user phone/email, only shows name
- **Document Sharing**: Users upload documents with requests, agents upload result documents; both use Object Storage
- **Pricing**: O'Level Upload ₦2,000, Admission Letter ₦1,500, Original Result ₦1,800, Reprinting & Caps ₦3,000

### Service Layer
- **Location**: `Arapoint/server/src/services/`
- **Pattern**: Service modules encapsulate business logic for wallet operations, payments, OTP, email, and third-party API integrations
- **Third-party Integrations**: YouVerify API for identity verification, VTPass for VTU services, SendGrid for email, Paystack/PalmPay for payments

## External Dependencies

### Payment Gateways
- **Paystack**: Primary payment processing for wallet funding
- **PalmPay**: Alternative payment gateway
- **PayVessel**: Virtual account generation for bank transfers

### Identity Verification APIs
- **YouVerify**: Real-time NIN and BVN verification
- **Prembly/IdentityPass**: Alternative identity verification provider

### Communication
- **SendGrid**: Email delivery for OTP and notifications

### VTU Services
- **VTPass**: Airtime, data, electricity, and cable TV subscriptions

### Database
- **Neon**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Database queries and migrations

### Support Ticket System
- **Architecture**: Production-quality support with ticket lifecycle management
- **Ticket Lifecycle**: open -> escalated -> assigned -> in_progress -> resolved -> closed
- **Reference IDs**: ARP-XXXXXX format for ticket tracking
- **AI First Response**: OpenAI (gpt-4o-mini) handles initial user queries; AI detects complex issues via [ESCALATE] tag and auto-escalates
- **Auto-assign**: On escalation, system finds available support agent (least active tickets) and auto-assigns. If no agent available, ticket stays in escalated queue.
- **Auto-close**: Tickets auto-close after 30 minutes of inactivity (checked on message poll)
- **Presence/Typing**: Polling-based (4s messages, 10s heartbeat) for online status and typing indicators via `support_presence` table
- **AI Reply Suggestions**: POST `/admin/support/tickets/:id/suggestions` generates 3 contextual reply suggestions for agents
- **User Routes**: `Arapoint/server/src/api/routes/support.ts` - create ticket, active tickets, message polling, escalation, presence
- **Admin Routes**: In `Arapoint/server/src/api/routes/admin.ts` - ticket list with filters, assign/reply/resolve/close, internal notes, agent management, stats, AI suggestions
- **User Component**: `Arapoint/client/src/components/SupportChat.tsx` - full chat UI with quick issue selection, ticket creation, tracking, polling, error display
- **Admin Component**: `Arapoint/client/src/pages/admin/SupportDashboard.tsx` - admin dashboard with ticket list, detail panel, message thread, notes, AI reply suggestions
- **Agent Login**: `Arapoint/client/src/pages/support/SupportAgentLogin.tsx` - Dedicated support agent login at `/support/agent/login`
- **Agent Dashboard**: `Arapoint/client/src/pages/support/SupportAgentDashboard.tsx` - Agent-specific dashboard at `/support/agent/dashboard` with ticket management, reply suggestions, notes

### Developer Portal Security & Infrastructure
- **Logging**: Pino-based structured JSON logging (`server/src/utils/logger.ts`) with backward-compatible API
- **Rate Limiting**: PostgreSQL-backed persistent rate limiter (`server/src/api/middleware/rateLimit.ts`) using upsert pattern — survives server restarts
- **Security Headers**: Helmet middleware, restricted CORS (production), X-Request-Id per request
- **Health Check**: Enhanced `/api/health` returns DB status, uptime, memory usage
- **Database Indexes**: On rpa_jobs, transactions, identity_verifications, support_tickets, education_services
- **OpenAPI Spec**: `Arapoint/openapi.yaml` documents all developer-facing API endpoints
- **Developer Portal CSS**: Dark theme uses CSS custom properties (`--dev-bg`, `--dev-card`, `--dev-border`, etc.) defined in `index.css`
- **Changelog**: API changelog section in DevDocs with versioned release notes (v2.0.0, v2.1.0)
- **Webhook System**: Full webhook delivery with HMAC-SHA256 signing, retry schedule (1m/5m/15m/1h), delivery log viewer

### Developer Routes (Modular Split)
- **Location**: `Arapoint/server/src/api/routes/developer/` (13 files, split from monolithic 3548-line developer.ts)
- **Entry**: `index.ts` — mounts all sub-routers, runs DB migration IIFE for developer tables
- **Shared**: `shared.ts` — all shared imports, Drizzle table definitions, middleware (apiKeyAuth, devJwtAuth, adminAuth), helpers (balance deduction, caching, sandbox mocks, rate limiting, API key generation)
- **Modules**:
  - `auth.ts` — OTP send, register, login
  - `profile.ts` — profile CRUD, dashboard stats, environment mode switch
  - `apikeys.ts` — API key CRUD (create, list, revoke)
  - `billing.ts` — transactions, wallet fund, Paystack initiate/webhook/verify, gateway status, pricing
  - `verification.ts` — NIN, BVN, education, unified verification, fraud score (exports `nameSimilarityScore`, `toDecision`, `validateTimeline`)
  - `employment.ts` — employment verification with identity cross-reference, SSCE via RPA
  - `kyb.ts` — KYC/KYB status, submit, document upload/download
  - `admin.ts` — admin monitoring (developers list/detail, stats, logs, KYC review, queue management, audit logs, sandbox credit, promote)
  - `webhooks.ts` — webhook CRUD, delivery logs, test webhook
  - `analytics.ts` — developer logs, analytics (daily/endpoint breakdown)
  - `security.ts` — IP allowlist management
- **Route mount**: `routes.ts` imports `./src/api/routes/developer` which resolves to `developer/index.ts`

### API Tester
- **Location**: `Arapoint/client/src/pages/developer/DevApiTester.tsx`
- **Route**: `/developer/api-tester`
- **Purpose**: Standalone interactive API testing tool within the developer portal
- **Features**: Covers all 35+ developer API endpoints (verification, auth, billing, webhooks, analytics, security, KYB), grouped by category with search, request history, cURL generation, auto-JWT capture on login, and response visualization with headers/timing
- **Auth**: Supports API Key (X-API-Key), JWT (Bearer), and public endpoint modes
- **Credentials**: Stored in sessionStorage (cleared on tab close) for security

### Frontend UI
- **shadcn/ui**: Component library built on Radix UI primitives
- **Lucide React**: Icon library
- **TanStack React Query**: Data fetching and caching