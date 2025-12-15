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
- **Key Tables**: users, otp_verifications, rpa_jobs, transactions, identity_verifications, education_services, virtual_accounts

### RPA (Robotic Process Automation) Layer
- **Purpose**: Automates queries to third-party Nigerian government and institutional portals that lack APIs
- **Location**: `Arapoint/rpa/` as a separate module with its own package.json
- **Technology**: Puppeteer for browser automation, Bull Queue for job processing
- **Architecture**: Provider-based system with pluggable providers for different services (NIN, BVN, JAMB, WAEC, etc.)
- **Job Queue**: Database-backed job queue in `rpa_jobs` table, processed by bot controller in `Arapoint/server/src/rpa/bot.ts`

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

### Frontend UI
- **shadcn/ui**: Component library built on Radix UI primitives
- **Lucide React**: Icon library
- **TanStack React Query**: Data fetching and caching