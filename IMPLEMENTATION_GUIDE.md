# Employment Screening Platform - OTP & Admin Management Implementation

## Overview
Complete implementation of email OTP verification for employment screening registration and super admin management dashboard for monitoring organizations, screenings, and handling failed education provider checks.

---

## 🔐 Part 1: OTP Verification Layer

### Frontend: `RegisterWithOTP.tsx`
**Location:** `Arapoint/client/src/pages/screening/RegisterWithOTP.tsx`

**3-Step Registration Flow:**

1. **Form Step** - Organization Details
   - Organization Name
   - Work Email (email for OTP)
   - Password (min 8 characters)
   - Confirm Password
   - Phone (optional)
   - Industry selection
   - Company Size selection

2. **OTP Step** - Email Verification
   - 6-digit OTP input
   - Auto-format number-only input
   - 10-minute expiration
   - Back button to form
   - Resend option

3. **Success Step** - Account Created
   - Success confirmation
   - Auto-redirect to dashboard after 2 seconds

**Features:**
- Real-time form validation
- Password strength checking
- OTP auto-format (numbers only, max 6 digits)
- Error handling with toast notifications
- Responsive design (desktop & mobile)
- Professional branding side panel

---

### Backend: `screeningAuth.ts`
**Location:** `Arapoint/server/src/api/routes/screeningAuth.ts`

**API Endpoints:**

#### 1. `POST /auth/send-otp`
Generates and sends OTP to email
```json
Request:
{
  "email": "hr@company.com"
}

Response:
{
  "status": "success",
  "code": 200,
  "message": "OTP sent to email",
  "data": {
    "email": "hr@company.com"
  }
}
```

**Logic:**
- Check email not already registered
- Generate 6-digit OTP
- Store in `screening_registration_otps` table with 10-min expiry
- Send email with OTP
- Allow 3 attempts per OTP request

#### 2. `POST /auth/register-with-otp`
Verifies OTP and creates organization
```json
Request:
{
  "organizationName": "Acme Corp Ltd",
  "email": "hr@company.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "phone": "+234 800 000 0000",
  "industry": "Fintech",
  "size": "1-10",
  "otp": "123456"
}

Response:
{
  "status": "success",
  "code": 201,
  "message": "Organization created successfully",
  "data": {
    "token": "eyJhbGc...",
    "organization": {
      "id": "org-uuid",
      "organizationName": "Acme Corp Ltd",
      "email": "hr@company.com"
    },
    "user": {
      "id": "user-uuid",
      "email": "hr@company.com",
      "role": "admin"
    }
  }
}
```

**Validation:**
- Check OTP exists and not expired
- Verify OTP matches (max 3 attempts)
- Check email not already registered
- Password must be 8+ characters
- Create organization with admin user
- Generate JWT token valid 30 days

**Database Table:** `screening_registration_otps`
```sql
CREATE TABLE screening_registration_otps (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  otp TEXT,
  attempts INT (max 3),
  max_attempts INT,
  expires_at TIMESTAMPTZ,
  verified BOOLEAN,
  created_at TIMESTAMPTZ
)
```

---

## 📊 Part 2: Admin Screening Management Dashboard

### Frontend: `AdminScreeningManagement.tsx`
**Location:** `Arapoint/client/src/pages/admin/AdminScreeningManagement.tsx`

**Three Main Tabs:**

### Tab 1: Organizations Management
**Features:**
- View all screening organizations
- Real-time metrics:
  - Active organizations count
  - Total screenings
  - Combined wallet balance
  - Failed education checks count
- Organization details table showing:
  - Organization name
  - Email
  - Status (active/inactive)
  - Screening count
  - Wallet balance
- Quick action: "View Screenings" button
- Search by organization name or email

### Tab 2: Screenings Monitoring
**Features:**
- Select organization to view screenings
- Filter by decision status:
  - All
  - Pass
  - Fail
  - Review
  - Pending
- Search by:
  - Candidate name
  - NIN (last 4 digits)
  - BVN (last 4 digits)
- Screening table displaying:
  - Candidate name
  - NIN/BVN (masked)
  - Decision with icon
  - Score (0-100)
  - Created date
- Quick actions:
  - View details (Dialog)
  - Manual review button (for "review" status)

**Screening Details Dialog:**
- Candidate information
- Decision status with icon
- Overall score
- Individual check results (NIN, BVN, Education, Fraud)
- Check status and results

**Manual Review Dialog:**
- For screenings marked as "review"
- Decision options: Pass / Needs More Review / Fail
- Notes field for explanation
- Submit button updates screening status

### Tab 3: Failed Education Provider Checks
**Features:**
- View all failed education checks
- Details shown:
  - Candidate name
  - Exam type (WAEC, NECO, NABTEB, NBAIS)
  - Error message
  - Failed timestamp
  - Retry attempt count (e.g., 2/3)
- Actions:
  - Retry button (disabled if max retries reached)
  - Manual override (apply manual decision)

**Failed Check Retry Logic:**
- Max 3 retry attempts
- On success: Updates candidate's education verification status
- On failure: Logs error and updates message
- Can be retried by education department

---

### Backend: `adminScreening.ts`
**Location:** `Arapoint/server/src/api/routes/adminScreening.ts`

**API Endpoints:**

#### 1. `GET /organizations`
Fetch all screening organizations
```json
Response: [
  {
    "id": "org-uuid",
    "organizationName": "Acme Corp Ltd",
    "email": "hr@company.com",
    "status": "active",
    "walletBalance": "50000.00",
    "industry": "Fintech",
    "screeningCount": 45,
    "createdAt": "2026-05-29T10:00:00Z"
  }
]
```

#### 2. `GET /screenings?orgId=&status=`
Fetch screenings for organization
```json
Response: [
  {
    "id": "screening-uuid",
    "candidateName": "John Doe",
    "nin": "12345678901",
    "bvn": "22210000000",
    "decision": "pass",
    "score": 92,
    "createdAt": "2026-05-29T10:00:00Z"
  }
]
```

#### 3. `GET /screenings/:id`
Get detailed screening information
```json
Response: {
  "id": "screening-uuid",
  "candidateName": "John Doe",
  "decision": "pass",
  "score": 92,
  "ninVerified": true,
  "bvnVerified": true,
  "educationVerified": true,
  "fraudRiskScore": 15,
  "checks": [
    { "name": "NIN Verification", "status": "pass" },
    { "name": "BVN Verification", "status": "pass" },
    { "name": "Education Verification", "status": "pass" },
    { "name": "Fraud Risk Check", "status": "pass" }
  ]
}
```

#### 4. `POST /screenings/:id/manual-review`
Perform manual review for screening
```json
Request: {
  "decision": "pass",
  "notes": "All documents verified manually",
  "reviewedAt": "2026-05-29T10:30:00Z"
}

Response: {
  "status": "success",
  "id": "screening-uuid",
  "decision": "pass"
}
```

#### 5. `GET /failed-education-checks`
Fetch all failed education checks
```json
Response: [
  {
    "id": "check-uuid",
    "candidateName": "Jane Smith",
    "examType": "WAEC",
    "errorMessage": "Connection timeout to education provider",
    "failedAt": "2026-05-29T09:15:00Z",
    "retryCount": 1,
    "maxRetries": 3,
    "manualOverrideDecision": null
  }
]
```

#### 6. `POST /failed-education-checks/:id/retry`
Retry failed education check
```json
Response: {
  "status": "success",
  "message": "Retry initiated and completed",
  "data": {
    "passed": true,
    "provider": "Prembly"
  }
}
```

**Retry Logic:**
- Max 3 automatic retry attempts
- On success: Updates candidate education_verified status
- On failure: Logs error, updates error message
- Returns detailed result

#### 7. `POST /failed-education-checks/:id/override`
Admin manual override for failed check
```json
Request: {
  "decision": "pass",
  "notes": "Manually verified WAEC result with institution"
}

Response: {
  "status": "success",
  "id": "check-uuid",
  "decision": "pass"
}
```

**Override Logic:**
- Marks check as "overridden" in database
- Updates candidate record with manual decision
- Logs override for audit trail
- No more retries needed

#### 8. `GET /stats`
Admin statistics dashboard
```json
Response: {
  "totalOrganizations": 25,
  "totalScreenings": 1250,
  "passedScreenings": 950,
  "failedScreenings": 200,
  "reviewScreenings": 100,
  "failedEducationChecks": 15,
  "passRate": 76
}
```

---

## 📊 Database Schema Changes

### New Tables:

#### `screening_registration_otps`
```sql
CREATE TABLE screening_registration_otps (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  otp TEXT,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMPTZ,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

#### `screening_failed_education_checks`
```sql
CREATE TABLE screening_failed_education_checks (
  id UUID PRIMARY KEY,
  candidate_id UUID,
  org_id UUID,
  candidate_name TEXT,
  exam_type TEXT,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  status TEXT ('failed', 'resolved', 'overridden'),
  manual_override_decision TEXT,
  manual_override_notes TEXT,
  manual_override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

#### `screening_manual_reviews`
```sql
CREATE TABLE screening_manual_reviews (
  id UUID PRIMARY KEY,
  candidate_id UUID,
  decision TEXT,
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 🔄 Integration Checklist

### Frontend Routes to Add:
- [ ] Update `/employment-screening/register` to use `RegisterWithOTP` component
- [ ] Add `/admin/screening` route pointing to `AdminScreeningManagement`
- [ ] Update navigation menu for admins

### Backend Routes to Register:
- [ ] Mount screening auth routes in main API
- [ ] Mount admin screening routes with admin middleware
- [ ] Configure email service for OTP delivery
- [ ] Add authentication middleware for admin routes

### Environment Variables:
- [ ] `PAYSTACK_SECRET_KEY` - for payment processing
- [ ] `EMAIL_SERVICE_API_KEY` - for OTP emails
- [ ] `JWT_SECRET` - for token generation
- [ ] `APP_BASE_URL` - for redirect URLs

### Email Templates:
- [ ] OTP verification email
- [ ] Screening status updates
- [ ] Failed education check notifications
- [ ] Manual review notifications

---

## 🎯 Usage Workflows

### Workflow 1: New Organization Registration
1. User navigates to `/employment-screening/register`
2. Fills organization details form
3. System generates and sends OTP to email
4. User enters 6-digit OTP
5. System verifies OTP and creates organization
6. User automatically logged in and redirected to dashboard

### Workflow 2: Admin Monitors Screenings
1. Admin logs in and navigates to Admin Screening Management
2. Views organization metrics on Organizations tab
3. Clicks "View Screenings" for specific org
4. Filters screenings by status (pass/fail/review)
5. Clicks on screening to view detailed results
6. If decision is "review", performs manual review
7. Updates decision with notes

### Workflow 3: Handle Failed Education Check
1. Education provider fails for a candidate
2. Check is logged in `failed_education_checks` table
3. Admin sees it in "Failed Education Checks" tab
4. Admin can:
   - **Option A:** Click Retry (up to 3 times)
     - System attempts education check again
     - If passes: Candidate updated to verified
     - If fails: Error logged, retry available
   - **Option B:** Manual Override
     - Admin marks as pass/fail with notes
     - Candidate record updated
     - No more retries needed
     - Audit trail recorded

---

## 🔒 Security Features

1. **OTP Verification:**
   - 10-minute expiration
   - Max 3 attempts per OTP
   - Email-based verification
   - One-time use

2. **Password Security:**
   - Minimum 8 characters
   - Bcrypt hashing
   - Confirm password validation

3. **Admin Access:**
   - Authentication middleware required
   - Admin role verification
   - Audit trail for manual decisions
   - IP logging for security

4. **Data Protection:**
   - NIN/BVN masked in UI
   - Audit tables for compliance
   - Manual review tracking
   - Error logging for debugging

---

## 📈 Future Enhancements

1. **SMS OTP Option** - Allow SMS as alternative to email
2. **Bulk Operations** - Retry multiple failed checks at once
3. **Export Reports** - Download screening data as CSV/PDF
4. **Webhooks** - Notify org when check fails
5. **AI Insights** - Pattern detection for fraud
6. **Custom Workflows** - Org-specific business rules
7. **Team Collaboration** - Assign reviews to team members
8. **2FA for Admin** - Additional security layer

---

## 📝 Testing Checklist

### Frontend Tests:
- [ ] OTP form validation
- [ ] OTP input formatting
- [ ] Successful registration flow
- [ ] Error handling and display
- [ ] Mobile responsiveness
- [ ] Admin dashboard load time

### Backend Tests:
- [ ] OTP generation randomness
- [ ] OTP expiration logic
- [ ] Attempt limiting
- [ ] Database transactions
- [ ] Email delivery
- [ ] Manual review persistence
- [ ] Failed check retry logic
- [ ] Override functionality

### Integration Tests:
- [ ] Full registration flow with OTP
- [ ] Admin viewing all organizations
- [ ] Filtering and searching screenings
- [ ] Manual review and decision save
- [ ] Failed check retry and override
- [ ] Concurrent requests handling
