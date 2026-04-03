# Arapoint API Tester

An interactive test dashboard for the [Arapoint](https://arapoint.com.ng) Identity Verification API.

## Features

- **Environment toggle** — switch between Sandbox (mock data) and Live (real verifications) with one click
- **All major endpoints** covered with pre-filled request bodies
- **Built-in proxy** — avoids browser CORS restrictions; all requests route through the local server
- **JSON syntax highlighting** — colour-coded response viewer
- **Auto-saves tokens** — JWT token auto-populated after Login; API key auto-saved after Create Key
- **Request history** — last 8 requests in the bottom bar; click to replay
- **Keyboard shortcut** — `Ctrl+Enter` (or `Cmd+Enter`) to send the current request

## Endpoints Covered

| Category        | Endpoint                                |
| --------------- | --------------------------------------- |
| Authentication  | Register, Login                         |
| Verification    | NIN, BVN, Education, Unified            |
| Employment      | Submit, Poll Result                     |
| Risk            | Fraud Score                             |
| Account         | Dashboard, KYC Status, API Keys, Wallet |

## Quick Start (new Replit)

1. Create a new **Node.js** Replit project
2. Copy all files from this folder into the new project
3. Click **Run** — the dashboard opens on port 3000
4. Click **⚙ Configure** and enter:
   - **Base URL (Sandbox):** Your deployed Arapoint URL (e.g. `https://arapoint.replit.app`)
   - **Base URL (Live):** `https://arapoint.com.ng`
5. Use **Login** to get a JWT token (auto-saved)
6. Create or paste an **API Key** for verification endpoints
7. Pick any endpoint from the sidebar and click **Send Request**

## No Dependencies

The server uses only Node.js built-ins (`http`, `https`, `fs`, `path`, `url`). No `npm install` needed.

## Scoring Reference (Employment Verification)

| Checkpoint           | Weight |
| -------------------- | ------ |
| NIN verified         | 20 pts |
| BVN verified         | 20 pts |
| Name match (fuzzy)   | 20 pts |
| DOB consistency      | 15 pts |
| Timeline validity    | 10 pts |
| SSCE / Education     | 15 pts |
| **Total**            | **100 pts** |

**Decision thresholds:** ≥ 85 → PASS | 60–84 → REVIEW | < 60 → FAIL
