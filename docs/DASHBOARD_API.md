# Partner Dashboard API Documentation

## Overview
The Partner Dashboard provides comprehensive analytics and metrics for partner accounts, including key performance indicators, financial metrics, practice session analytics, and next steps tracking.

## Prerequisites
- Partner account must be authenticated (JWT token)
- Onboarding must be completed to access dashboard
- Account type must be 'partner'

## API Endpoints

### 1. Get Partner Dashboard
**Endpoint:** `GET /api/v1/dashboard`  
**Auth:** Required (JWT)  
**Account Type:** Partner (onboarding completed)  
**Middleware:** `authMiddleware`, `requireOnboardingComplete`

**Response:**
```json
{
  "status": "success",
  "message": "Dashboard data fetched successfully",
  "data": {
    "key_metrics": {
      "total_candidates_enrolled": 45,
      "completed_sessions_this_month": 128,
      "completed_sessions_all_time": 892,
      "average_candidate_score": 85.7,
      "average_candidate_performance": "Good"
    },
    "finance_metrics": {
      "revenue_and_payouts": {
        "total_revenue_generated": 25680.50,
        "total_payouts": 0,
        "pending_payout": 25680.50,
        "currency": "USD"
      },
      "practice_sessions": {
        "purchased": 950,
        "utilized": 892,
        "utilization_rate": 94
      }
    },
    "practice_metrics": {
      "practice_sessions_taken": {
        "total": 892,
        "this_month": 128,
        "this_week": 32
      },
      "feedback_trends": {
        "positive": 720,
        "neutral": 150,
        "negative": 22,
        "average_rating": 4.3
      },
      "popular_exam_types": [
        {
          "exam_type": "PEBC_OSCE",
          "session_count": 450
        },
        {
          "exam_type": "IELTS",
          "session_count": 320
        },
        {
          "exam_type": "PLAB",
          "session_count": 122
        }
      ]
    },
    "next_steps": {
      "items": [
        {
          "id": "add_candidates",
          "title": "Add Candidates / Users",
          "description": "Start adding candidates to your platform to begin managing their exam preparation",
          "status": "pending",
          "action_url": "/candidates/add"
        },
        {
          "id": "setup_payment",
          "title": "Set Up Payment Method",
          "description": "Configure your payment method to receive payouts from the platform",
          "status": "pending",
          "action_url": "/settings/payment"
        }
      ],
      "completion_percentage": 0
    }
  }
}
```

**Performance Level Indicators:**
- **Excellent**: Average score >= 90
- **Good**: Average score >= 75
- **Fair**: Average score >= 60
- **Needs Improvement**: Average score < 60

### 2. Get Recent Activities
**Endpoint:** `GET /api/v1/dashboard/activities?limit=10`  
**Auth:** Required (JWT)  
**Account Type:** Partner (onboarding completed)  
**Middleware:** `authMiddleware`, `requireOnboardingComplete`

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 10)

**Response:**
```json
{
  "status": "success",
  "message": "Recent activities fetched successfully",
  "data": [
    {
      "id": "activity_123",
      "type": "session_completed",
      "description": "John Doe completed a practice session",
      "timestamp": "2025-11-26T10:30:00.000Z",
      "metadata": {
        "exam": {
          "_id": "exam_456",
          "exam_name": "PEBC OSCE Practice",
          "exam_type": "PEBC_OSCE"
        },
        "score": "85",
        "duration": "45"
      }
    },
    {
      "id": "activity_124",
      "type": "session_completed",
      "description": "Jane Smith completed a practice session",
      "timestamp": "2025-11-26T09:15:00.000Z",
      "metadata": {
        "exam": {
          "_id": "exam_789",
          "exam_name": "IELTS Speaking Mock",
          "exam_type": "IELTS"
        },
        "score": "92",
        "duration": "30"
      }
    }
  ]
}
```

### 3. Mark Candidate Added
**Endpoint:** `POST /api/v1/dashboard/next-steps/candidate-added`  
**Auth:** Required (JWT)  
**Account Type:** Partner (onboarding completed)  
**Middleware:** `authMiddleware`, `requireOnboardingComplete`

**Description:** Mark the "Add Candidates" next step as complete. This is automatically called when a partner adds their first candidate.

**Response:**
```json
{
  "status": "success",
  "message": "Candidate added step marked as complete",
  "data": {
    "message": "Candidate added step marked as complete"
  }
}
```

### 4. Mark Payment Method Setup
**Endpoint:** `POST /api/v1/dashboard/next-steps/payment-setup`  
**Auth:** Required (JWT)  
**Account Type:** Partner (onboarding completed)  
**Middleware:** `authMiddleware`, `requireOnboardingComplete`

**Description:** Mark the "Set Up Payment Method" next step as complete. This is called when a partner configures their payment method.

**Response:**
```json
{
  "status": "success",
  "message": "Payment method setup step marked as complete",
  "data": {
    "message": "Payment method setup step marked as complete"
  }
}
```

## Data Models

### Key Metrics Structure
```typescript
{
  total_candidates_enrolled: number;        // Total candidates under this partner
  completed_sessions_this_month: number;    // Sessions completed in current month
  completed_sessions_all_time: number;      // Total sessions ever completed
  average_candidate_score: number;          // Average score across all candidates
  average_candidate_performance: string;    // Performance rating text
}
```

### Finance Metrics Structure
```typescript
{
  revenue_and_payouts: {
    total_revenue_generated: number;  // Total revenue from all sessions
    total_payouts: number;            // Amount already paid out
    pending_payout: number;           // Amount waiting to be paid
    currency: string;                 // Currency code (USD, CAD, etc.)
  };
  practice_sessions: {
    purchased: number;                // Total sessions created/purchased
    utilized: number;                 // Sessions actually completed
    utilization_rate: number;         // Percentage (0-100)
  };
}
```

### Practice Metrics Structure
```typescript
{
  practice_sessions_taken: {
    total: number;         // All-time completed sessions
    this_month: number;    // Sessions this month
    this_week: number;     // Sessions this week
  };
  feedback_trends: {
    positive: number;      // Count of positive feedback (rating >= 4)
    neutral: number;       // Count of neutral feedback (2.5 <= rating < 4)
    negative: number;      // Count of negative feedback (rating < 2.5)
    average_rating: number; // Average rating out of 5
  };
  popular_exam_types: Array<{
    exam_type: string;     // Exam type name
    session_count: number; // Number of sessions for this type
  }>;
}
```

### Next Steps Structure
```typescript
{
  items: Array<{
    id: string;              // Unique identifier
    title: string;           // Display title
    description: string;     // Helper text
    status: 'completed' | 'pending';
    action_url?: string;     // Where to navigate when clicked
    completed_at?: Date;     // When it was completed
  }>;
  completion_percentage: number; // Overall completion (0-100)
}
```

## Next Steps Behavior

### Display Logic
- If **all** next steps are completed → `items` array will be **empty** (card disappears on frontend)
- If **any** step is pending → `items` array contains all steps
- Each item shows status icon:
  - ✓ for `status: 'completed'`
  - ❗ for `status: 'pending'`

### Automatic Completion
The following actions automatically mark next steps as complete:

1. **Add Candidates**
   - Triggered when: First candidate/user is added to partner account
   - Updates: `has_added_candidates: true`, `first_candidate_added_at: Date`

2. **Setup Payment**
   - Triggered when: Partner configures payment method
   - Updates: `payment_method_setup: true`, `payment_method_setup_at: Date`

## Error Responses

### Onboarding Not Completed
```json
{
  "status": "error",
  "message": "Please complete your onboarding before accessing this resource",
  "statusCode": 403
}
```

### Invalid Account Type
```json
{
  "status": "error",
  "message": "Dashboard is only available for partner accounts",
  "statusCode": 400
}
```

### Authentication Required
```json
{
  "status": "error",
  "message": "Unauthorized",
  "statusCode": 401
}
```

## Implementation Notes

### Database Assumptions
The dashboard assumes the following data structure:
- `users` collection has a `partner_id` field linking candidates to partners
- `practices` collection tracks practice sessions with status, scores, and completion dates
- Partners can have candidates/users associated with them via `partner_id`

### Performance Optimization
- All metrics are calculated on-demand (no caching currently)
- Consider implementing caching for large partner accounts
- Popular exam types limited to top 5
- Recent activities default limit of 10 (configurable)

### Future Enhancements
- [ ] Add date range filters for all metrics
- [ ] Implement caching layer (Redis) for dashboard data
- [ ] Add export functionality (CSV/PDF)
- [ ] Implement real-time updates via WebSocket
- [ ] Add comparison metrics (month-over-month, year-over-year)
- [ ] Add candidate performance breakdown by exam type
- [ ] Implement payout tracking and history

## Frontend Integration Example

```javascript
// Fetch dashboard on mount
useEffect(() => {
  async function fetchDashboard() {
    const response = await fetch('/api/v1/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setDashboardData(data.data);
    
    // Check if next steps should be shown
    if (data.data.next_steps.items.length > 0) {
      setShowNextSteps(true);
    }
  }
  
  fetchDashboard();
}, []);

// Mark payment setup complete
async function handlePaymentSetup() {
  await fetch('/api/v1/dashboard/next-steps/payment-setup', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // Refresh dashboard
  fetchDashboard();
}
```
