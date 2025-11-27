# Dashboard & Candidates Authentication Flow

## Overview
The dashboard and candidates system is automatically scoped to the logged-in partner's account. No manual partner_id needs to be provided - it's extracted from the JWT token.

## Authentication Flow

### 1. JWT Token Structure
```json
{
  "user_id": "partner_mongodb_id",
  "email": "partner@example.com",
  "account_type": "partner",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 2. Middleware Chain
```
Request → authMiddleware → requireOnboardingComplete → Controller
```

#### Auth Middleware (`src/middlewares/auth.middleware.ts`)
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies token signature
- Fetches partner/admin from database based on `account_type`
- Attaches to request:
  - `req.curr_user` - Full partner/admin object
  - `req.account_type` - Either 'admin' or 'partner'

### 3. Controller Implementation

All controllers automatically use the logged-in partner's ID:

```typescript
const partner_id = req.curr_user?._id?.toString() as string;
```

## Scoped Endpoints

### Dashboard Endpoints
All dashboard data is automatically filtered by the logged-in partner:

**GET /dashboard**
- Returns metrics for `req.curr_user._id`
- Key metrics include candidate stats, payment stats, invite stats
- Practice session stats from partner's candidates only

**GET /dashboard/activities**
- Returns recent activities for `req.curr_user._id`
- Only shows practice sessions from partner's candidates

### Candidates Endpoints
All candidate operations are scoped to the logged-in partner:

**GET /candidates**
- Returns candidates for `req.curr_user._id`
- Query: `{ partner_id: req.curr_user._id }` in PartnerCandidate table
- Pagination supported via `?page=1&limit=20`

**POST /candidates/batches**
- Creates batch for `req.curr_user._id`
- Batch is automatically linked to the partner

**POST /candidates**
- Creates candidate relationship for `req.curr_user._id`
- If user exists, creates new PartnerCandidate record
- If user doesn't exist, creates User + PartnerCandidate

**POST /candidates/upload-csv**
- Uploads candidates for `req.curr_user._id`
- All candidates linked to the partner's batch

**GET /candidates/batches**
- Returns batches for `req.curr_user._id`
- Sorted by most recent first

**PATCH /candidates/:candidate_id/mark-paid**
- Updates payment status for `req.curr_user._id`
- Validates candidate belongs to the partner
- Updates `PartnerCandidate.is_paid_for = true`

**POST /candidates/:partner_candidate_id/accept-invite**
- Accepts invite for specific partner-candidate relationship
- No authentication required (public endpoint via unique link)
- Updates `PartnerCandidate.invite_status = 'accepted'`

## Data Isolation

### Partner Isolation
Each partner can only access their own data:
- ✅ Can see candidates they onboarded
- ✅ Can see batches they created
- ✅ Can see practice sessions of their candidates
- ❌ Cannot see other partners' data
- ❌ Cannot modify other partners' records

### Candidate Sharing
Candidates can be shared across partners:
- Same email can be onboarded by multiple partners
- Each partner-candidate relationship is independent
- Payment status is per-partner
- Invite status is per-partner
- Candidate sees aggregated data from all partners

## Database Queries

### Old Structure (Direct User Query)
```typescript
// ❌ Old way - queried users directly
const candidates = await UserModel.find({ 
    partner_id: partner_id 
});
```

### New Structure (PartnerCandidate Junction)
```typescript
// ✅ New way - queries through PartnerCandidate
const partnerCandidates = await PartnerCandidateModel.find({
    partner_id: partner_id
}).populate('candidate_id');

// For dashboard metrics
const candidateIds = partnerCandidates.map(pc => pc.candidate_id);
const sessions = await PracticeModel.find({
    userId: { $in: candidateIds }
});
```

## Security Considerations

### Token Validation
- JWT signature verified on every request
- Token expiration checked
- User existence validated in database
- Account type validated (must be 'partner' for most endpoints)

### Data Access Control
- Partner ID extracted from authenticated token (not request body/params)
- Prevents partner from accessing another partner's data
- All database queries filtered by authenticated partner_id

### Public Endpoints
Only one endpoint doesn't require authentication:
- `POST /candidates/:partner_candidate_id/accept-invite`
- Used when candidates click email invite link
- Uses unique `partner_candidate_id` as identifier
- Validates relationship exists before updating

## Dashboard Metrics Breakdown

### Key Metrics (Scoped to Partner)
```typescript
{
    total_candidates_enrolled: number,      // Count in PartnerCandidate table
    completed_sessions_this_month: number,  // Sessions by partner's candidates
    completed_sessions_all_time: number,    // All sessions by partner's candidates
    average_candidate_score: number,        // Average score across all sessions
    average_candidate_performance: string,  // "Excellent" | "Good" | "Fair" | "Needs Improvement"
    candidates_paid: number,                // Where is_paid_for = true
    candidates_pending_payment: number,     // Where is_paid_for = false
    invites_accepted: number,               // Where invite_status = 'accepted'
    invites_pending: number                 // Where invite_status = 'pending'
}
```

### Finance Metrics (Scoped to Partner)
```typescript
{
    revenue_and_payouts: {
        total_revenue_generated: number,    // Sum of practice costs
        total_payouts: number,              // TODO: Implement
        pending_payout: number,             // Revenue - payouts
        currency: string                    // Partner's currency
    },
    practice_sessions: {
        purchased: number,                   // Total sessions created
        utilized: number,                    // Sessions with status='finished'
        utilization_rate: number            // (utilized/purchased) * 100
    }
}
```

### Practice Metrics (Scoped to Partner)
```typescript
{
    practice_sessions_taken: {
        total: number,                      // All time
        this_month: number,                 // Current month
        this_week: number                   // Current week
    },
    feedback_trends: {
        positive: number,                   // Rating >= 4
        neutral: number,                    // Rating 2.5-3.9
        negative: number,                   // Rating < 2.5
        average_rating: number              // Mean rating
    },
    popular_exam_types: [
        {
            exam_type: string,
            session_count: number
        }
    ]
}
```

## Example API Calls

### Login (Get Token)
```bash
POST /auth/login
Content-Type: application/json

{
    "email": "partner@example.com",
    "password": "password123"
}

# Response
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "account_type": "partner",
    "user": { ... }
}
```

### Get Dashboard (Authenticated)
```bash
GET /dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Response - All data automatically scoped to the partner from token
{
    "key_metrics": {
        "total_candidates_enrolled": 50,
        "candidates_paid": 30,
        "candidates_pending_payment": 20,
        "invites_accepted": 40,
        "invites_pending": 10,
        ...
    },
    "finance_metrics": { ... },
    "practice_metrics": { ... }
}
```

### Get Candidates (Authenticated)
```bash
GET /candidates?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Response - Only candidates for the authenticated partner
{
    "candidates": [
        {
            "_id": "user_id",
            "email": "candidate@example.com",
            "batch_name": "Batch A",
            "is_paid_for": true,
            "invite_status": "accepted",
            "partner_candidate_id": "pc_id",
            ...
        }
    ],
    "pagination": { ... }
}
```

### Create Candidate (Authenticated)
```bash
POST /candidates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "batch_id": "batch_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com"
}

# Candidate automatically linked to partner from token
# No need to specify partner_id in request body
```

## Benefits of Auto-Scoping

✅ **Security**: Impossible for partner to access other partners' data  
✅ **Simplicity**: Frontend doesn't need to manage partner_id  
✅ **Consistency**: All endpoints follow same authentication pattern  
✅ **Scalability**: Works for multi-tenant architecture  
✅ **Auditability**: All actions tied to authenticated user  
✅ **DRY**: Authentication logic centralized in middleware  

## Error Scenarios

### No Token
```bash
GET /candidates
# No Authorization header

Response: 401 Unauthorized
{
    "status": "error",
    "message": "Authentication required"
}
```

### Invalid Token
```bash
GET /candidates
Authorization: Bearer invalid_token

Response: 401 Unauthorized
{
    "status": "error",
    "message": "Invalid token"
}
```

### Expired Token
```bash
GET /candidates
Authorization: Bearer expired_token

Response: 401 Unauthorized
{
    "status": "error",
    "message": "Session expired"
}
```

### Wrong Account Type
```bash
GET /candidates
Authorization: Bearer admin_token

Response: 400 Bad Request
{
    "status": "error",
    "message": "Dashboard is only available for partner accounts"
}
```
