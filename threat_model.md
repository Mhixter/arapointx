# Threat Model

## Project Overview

Arapoint is a production Express + TypeScript backend with a React frontend for Nigerian identity checks, education verification, CAC workflows, wallet funding, support messaging, and a developer API. The highest-value assets are identity records, user and admin accounts, uploaded documents, payment state, developer API credentials, and webhook/API integrations with third parties such as Paystack, PalmPay, VTPass, Prembly, and object storage.

Production scope for this scan is the `Arapoint/` application. Root-level experimental or duplicate frontend files outside `Arapoint/` should be treated as dev-only unless a production route or build path proves they are reachable. TLS is platform-managed in production. `NODE_ENV=production` can be assumed.

## Assets

- **User identity data** — NIN, BVN, DOB, phone numbers, addresses, exam records, support conversations, and uploaded KYC/CAC/JAMB documents. Exposure would directly harm users and create regulatory risk.
- **Authentication material** — user JWTs, admin JWTs, agent JWTs, developer portal JWTs, developer API keys, webhook secrets, OTP/reset flows. Compromise enables impersonation and downstream fraud.
- **Wallet and payment state** — balances, funding references, virtual accounts, webhook-driven transaction status, pricing, and refunds. Tampering can lead to direct financial loss.
- **Admin and agent operations** — privileged dashboards, queue assignment, ticket handling, verification job processing, and KYC review. Weak authorization here can expose all customer records or let attackers alter business workflows.
- **Developer API data** — live verification requests/results, customer-submitted identifiers, analytics, logs, KYB documents, and billing history. These are especially sensitive because they may contain third-party customer data at scale.
- **Application secrets and integration keys** — JWT secrets, database credentials, email keys, verification-provider credentials, payment/webhook secrets, and object storage configuration.

## Trust Boundaries

- **Browser / mobile client to Express API** — all request data is untrusted and must be authenticated, authorized, and validated server-side.
- **Express API to PostgreSQL** — the server has broad read/write access to business-critical tables; injection or broken authorization here exposes the full dataset.
- **Express API to object storage / local uploads** — uploaded files and generated documents cross from user-controlled input into durable storage and later download paths.
- **Express API to third-party providers** — identity vendors, payment gateways, email, and webhook destinations are external trust boundaries. Inputs to outbound calls must be constrained and secrets must remain server-only.
- **Public / authenticated / admin / agent / developer boundaries** — the application has multiple privilege tiers with overlapping data domains. Server-side checks must prevent cross-tier access.
- **Production / dev-only boundary** — fallback local upload routes, Vite/dev tooling, and duplicate root-level app code are lower priority unless proven production-reachable.

## Scan Anchors

- **Production entry points:** `Arapoint/server/index.ts`, `Arapoint/server/routes.ts`, `Arapoint/server/src/api/routes/**`, `Arapoint/server/src/services/**`, `Arapoint/server/src/rpa/**`.
- **Highest-risk areas:** auth middleware and login routes; admin/agent/developer route trees; file/document upload and download paths; webhook/payment handling; logging/analytics; support conversations; identity/BVN/NIN verification services.
- **Public surfaces:** `/api/auth/*`, `/api/otp/*`, `/api/pricing/*`, `/api/chat/*`, webhook endpoints, health endpoints, some sample slip/pricing endpoints, developer registration/login.
- **Authenticated user surfaces:** `/api/identity`, `/api/bvn`, `/api/education`, `/api/cac`, `/api/wallet`, `/api/payment`, `/api/support`, `/api/files`.
- **Privileged surfaces:** `/api/admin/*`, agent route families under `/api/*-agent`, and `/api/v1/developer/*`.
- **Usually ignore unless production reachability is shown:** root-level non-`Arapoint/` frontend files, Vite development setup, mock/sandbox-only behavior.

## Threat Categories

### Spoofing

Arapoint relies on JWTs across user, admin, agent, and developer flows, plus API keys for developer verification APIs. The system must only accept tokens created for the intended principal type, must enforce account-active checks before granting access, and must verify third-party callbacks with shared secrets or signatures. Any weaker path could let a normal user, agent, or developer impersonate a more privileged role.

### Tampering

Users can submit identity requests, funding actions, service purchases, support messages, and document metadata. Developers can submit verification payloads and webhook endpoints. The backend must treat all client-controlled fields as untrusted, compute billing and authorization decisions server-side, and prevent users or agents from modifying records they do not own. Payment and job state transitions must stay atomic so concurrent requests cannot double-claim or double-spend.

### Information Disclosure

This project handles large volumes of highly sensitive PII and generated documents. API responses, logs, analytics, support tooling, shared files, and object storage routes must not disclose tokens, identity data, documents, or internal state beyond the authorized actor. Any route that lists, downloads, shares, or logs verification results is high-risk by default.

### Denial of Service

Public auth, OTP, chat, webhook, and verification-triggering endpoints can be abused to exhaust database, email, third-party API, or browser-automation capacity. Rate limits, payload limits, queueing, and timeouts are required so unauthenticated or low-privilege actors cannot starve paid verification or support operations.

### Elevation of Privilege

The app has many privilege levels: user, admin, support agent, domain-specific agent, developer, and developer-admin. Every route serving cross-user data, admin actions, ticket operations, logs, document downloads, or job inventory must check ownership or role server-side. The main guarantees are that non-admin JWTs cannot satisfy admin checks, one user cannot fetch another user’s files or tickets, and agent/document flows cannot be widened by ID guessing or overly broad default access rules.
