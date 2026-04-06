# Arapoint Infrastructure Roadmap

> Full audit completed April 6, 2026.  
> Status: **Pending Approval** — no changes will be made until you approve specific items.

---

## PRIORITY 1 — Security Hardening (Critical)

### S1. Add Helmet HTTP Security Headers
**Current:** No `helmet` middleware. The server sends no HSTS, Content-Security-Policy, X-Frame-Options, or X-Content-Type-Options headers. Browsers get zero security directives.  
**Fix:** Install `helmet` and add it as the first middleware in `server/index.ts`. This adds 11 security headers in one line.  
**Impact:** Prevents clickjacking, MIME-type sniffing, and cross-site scripting vectors.  
**Effort:** Small (15 minutes)

### S2. Restrict CORS to Known Domains
**Current:** `Access-Control-Allow-Origin: *` — any website can make requests to your API.  
**Fix:** Allow only your own domains: `arapoint.com.ng`, `developer.arapoint.com.ng`, the Replit dev domain, and `localhost` for development.  
**Impact:** Prevents unauthorized websites from calling your API using a user's browser session.  
**Effort:** Small (15 minutes)

### S3. Add Request Body Size Limits
**Current:** `express.json()` has no size limit — an attacker could send a 100MB JSON payload and crash the server.  
**Fix:** Set `express.json({ limit: '1mb' })` and `express.urlencoded({ limit: '1mb' })`.  
**Impact:** Prevents denial-of-service via oversized payloads.  
**Effort:** Tiny (5 minutes)

### S4. Add Missing CORS Headers for Developer API
**Current:** The CORS middleware only allows `Content-Type` and `Authorization` headers. Developer API uses `X-API-Key` which is not listed — browser-based clients will get CORS errors.  
**Fix:** Add `X-API-Key` to `Access-Control-Allow-Headers`.  
**Impact:** Developer API calls from browser frontends will work correctly.  
**Effort:** Tiny (2 minutes)

### S5. Enable Trust Proxy
**Current:** No `app.set('trust proxy', 1)`. Behind Replit's proxy, `req.ip` always returns the proxy's IP, not the real client IP. This breaks IP-based rate limiting and IP allowlists.  
**Fix:** Add `app.set('trust proxy', 1)` before middleware registration.  
**Impact:** Correct client IP for rate limiting, logging, and security features.  
**Effort:** Tiny (2 minutes)

---

## PRIORITY 2 — Infrastructure & Scaling

### I1. Move Rate Limiter and Cache to Persistent Store
**Current:** Both the rate limiter and NIN/BVN verification cache use in-memory `Map` objects. They reset on every server restart and don't work if you scale to multiple instances.  
**Fix:** Use the PostgreSQL database for rate limit tracking (simple counter table) or a lightweight in-process store with periodic DB sync. For caching, store verification results in the existing DB with a TTL column.  
**Impact:** Rate limits survive restarts; cache doesn't disappear on deploy.  
**Effort:** Medium (2-3 hours)

### I2. Add Database Indexes
**Current:** Only unique constraints create indexes. Frequently queried columns like `rpa_jobs.status`, `developer_api_logs.created_at`, `transactions.user_id`, and `developer_employment_requests.queue_status` have no indexes.  
**Fix:** Add explicit indexes on the 8-10 most queried non-unique columns in `schema.ts` and run a migration.  
**Impact:** Significant query speedup as the database grows past 10,000+ rows.  
**Effort:** Small (30 minutes)

### I3. Split developer.ts Into Modules
**Current:** `developer.ts` is **3,522 lines** — one of the largest single files in the codebase. Contains auth, wallet, verification, employment, fraud scoring, webhooks, KYB, analytics, IP allowlist, and more all in one file.  
**Fix:** Split into focused modules:  
- `developer/auth.ts` (registration, login, OTP)
- `developer/wallet.ts` (balance, transactions, Paystack)
- `developer/verification.ts` (NIN, BVN, unified, education)
- `developer/employment.ts` (background checks)
- `developer/security.ts` (webhooks, IP allowlist)
- `developer/analytics.ts` (logs, analytics, profile)

**Impact:** Much easier to maintain, debug, and extend. Reduces merge conflicts.  
**Effort:** Medium (2-3 hours)

### I4. Structured Logging with Rotation
**Current:** Custom logger writes to console + a single `app.log` file. No log rotation, no structured JSON format, no log levels filtering.  
**Fix:** Replace with `pino` (fast structured JSON logger) with `pino-roll` for automatic log rotation. Include request IDs in every log entry for traceability.  
**Impact:** Easier debugging, better production monitoring, prevents disk from filling up.  
**Effort:** Medium (1-2 hours)

### I5. Enhanced Health Check
**Current:** `/health` just returns `{ status: "ok" }`. No database connectivity check, no RPA queue status.  
**Fix:** Add DB ping, check RPA worker status, report memory usage and uptime.  
**Impact:** Better deployment monitoring — you'll know immediately if the DB is down.  
**Effort:** Small (30 minutes)

---

## PRIORITY 3 — UI/UX Improvements

### U1. Optimize Font Loading (Performance)
**Current:** Google Fonts (Inter + Plus Jakarta Sans) are loaded from Google's CDN via `<link>` tags in `index.html`. This creates render-blocking requests and a visible "flash of unstyled text" (FOUT).  
**Fix:** Add `font-display: swap` to the Google Fonts URL, add `preconnect` hints, and consider self-hosting the font files for faster loading.  
**Impact:** Faster initial page load, no text flash, better scores on Lighthouse/PageSpeed.  
**Effort:** Small (20 minutes)

### U2. Add Loading Skeletons Throughout Dashboard
**Current:** Some pages show blank content or a spinner while data loads. Users see empty screens for 1-2 seconds.  
**Fix:** Add Shadcn skeleton components to the Dashboard, Billing, API Logs, and Analytics pages. Show realistic placeholder shapes that match the final content layout.  
**Impact:** Feels faster and more polished — removes the "blank screen" gap.  
**Effort:** Medium (1-2 hours)

### U3. Add Error Boundaries
**Current:** If any React component crashes, the entire app shows a white screen. No error boundary catches the failure.  
**Fix:** Add a global `ErrorBoundary` component in `App.tsx` that catches crashes and shows a friendly "Something went wrong — reload" message with a retry button.  
**Impact:** Prevents full-page crashes from one broken component. Users can recover gracefully.  
**Effort:** Small (30 minutes)

### U4. Consistent Dark Theme Across Developer Portal
**Current:** The developer portal pages use a mix of inline styles (`style={{ background: "#0A0A0A" }}`) and Tailwind classes. Some pages have slightly different background shades and border colors.  
**Fix:** Define CSS variables for the developer portal dark theme (`--dev-bg`, `--dev-border`, `--dev-card`, `--dev-text`) and use them consistently across all pages.  
**Impact:** Visual consistency; easier to adjust the theme in one place.  
**Effort:** Small (1 hour)

### U5. Mobile Responsiveness Audit
**Current:** Most pages are responsive, but some dashboard tables and the developer docs sidebar have layout issues on smaller screens (<768px).  
**Fix:** Audit all pages at 375px and 768px widths. Fix overflow issues, add horizontal scrolling for wide tables, and ensure touch-friendly tap targets (min 44px).  
**Impact:** Better experience on phones — important for Nigerian market where mobile usage is dominant.  
**Effort:** Medium (2-3 hours)

---

## PRIORITY 4 — API Standards & Developer Experience

### A1. Add OpenAPI (Swagger) Specification
**Current:** API documentation exists only in the React DevDocs page. There is no machine-readable API spec.  
**Fix:** Create an `openapi.yaml` file covering all developer API endpoints with proper schemas, examples, and error codes. Optionally serve it via Swagger UI at `/api/docs`.  
**Impact:** Developers can import your API into Postman, generate SDKs, and test endpoints interactively.  
**Effort:** Medium-Large (3-4 hours)

### A2. Add API Request ID to Every Response
**Current:** Some endpoints return `requestId` but most don't. There's no way to trace a specific API call through logs.  
**Fix:** Add middleware that generates a unique `X-Request-Id` header for every request. Include this ID in all log entries and in all error responses.  
**Impact:** Developers can reference a specific request when filing support tickets. You can find any request in your logs instantly.  
**Effort:** Small (30 minutes)

### A3. Add Webhook Delivery Logs for Developers
**Current:** Developers can configure webhooks but can't see delivery history — no way to know if a webhook was received, failed, or retried.  
**Fix:** Add a `/webhook-logs` page in the developer portal showing: event type, delivery status (success/failed), HTTP status code, response body, timestamp, and retry count.  
**Impact:** Self-service debugging. Developers won't need to contact support when webhooks aren't working.  
**Effort:** Medium (2-3 hours)

### A4. Add API Changelog
**Current:** No versioned changelog. Developers don't know when new endpoints were added or behavior changed.  
**Fix:** Add a "Changelog" section to the Documentation page listing changes by date: new endpoints, pricing changes, and deprecations.  
**Impact:** Builds trust. Developers can track changes without guessing.  
**Effort:** Small (30 minutes)

---

## PRIORITY 5 — Future-Proofing

### F1. Add NYSC Verification Endpoint
**Status:** Not yet implemented. The unified endpoint architecture now supports it.  
**Action:** Add a new RPA provider for NYSC certificate lookup. Integrate it as a new check type in the unified verification flow.  
**Effort:** Large (depends on NYSC portal access)

### F2. Add Driver's License Verification
**Status:** Not yet implemented.  
**Action:** Similar to NIN/BVN — integrate with FRSC API or build an RPA provider.  
**Effort:** Large

### F3. Add International Passport Verification
**Status:** Not yet implemented.  
**Action:** Integration with NIS systems for passport validity checks.  
**Effort:** Large

---

## Summary

| # | Item | Category | Priority | Effort | Impact |
|---|------|----------|----------|--------|--------|
| S1 | Helmet security headers | Security | Critical | 15 min | High |
| S2 | Restrict CORS | Security | Critical | 15 min | High |
| S3 | Body size limits | Security | Critical | 5 min | High |
| S4 | CORS X-API-Key header | Security | Critical | 2 min | Medium |
| S5 | Trust proxy | Security | Critical | 2 min | High |
| I1 | Persistent rate limiter | Infrastructure | High | 2-3 hrs | High |
| I2 | Database indexes | Infrastructure | High | 30 min | High |
| I3 | Split developer.ts | Infrastructure | High | 2-3 hrs | Medium |
| I4 | Structured logging | Infrastructure | High | 1-2 hrs | Medium |
| I5 | Enhanced health check | Infrastructure | Medium | 30 min | Low |
| U1 | Font loading optimization | UI/UX | Medium | 20 min | Medium |
| U2 | Loading skeletons | UI/UX | Medium | 1-2 hrs | Medium |
| U3 | Error boundaries | UI/UX | Medium | 30 min | Medium |
| U4 | Consistent dark theme | UI/UX | Low | 1 hr | Low |
| U5 | Mobile responsiveness | UI/UX | Medium | 2-3 hrs | High |
| A1 | OpenAPI/Swagger spec | Standards | Medium | 3-4 hrs | High |
| A2 | Request ID middleware | Standards | High | 30 min | Medium |
| A3 | Webhook delivery logs | Standards | Medium | 2-3 hrs | High |
| A4 | API changelog | Standards | Low | 30 min | Medium |
| F1 | NYSC verification | Future | Later | Large | High |
| F2 | Driver's license | Future | Later | Large | Medium |
| F3 | Passport verification | Future | Later | Large | Medium |
