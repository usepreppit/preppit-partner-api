# Partner Exams API Documentation

## Overview
The Partner Exams module provides endpoints for partners to browse their exams, view questions, and track candidate sessions.

## Base URL
`/partner-exams`

## Authentication
All endpoints require authentication via the `authMiddleware`. The partner ID is extracted from the authenticated user.

---

## Endpoints

### 1. List Partner Exams
**GET** `/partner-exams`

Retrieves a paginated list of all exams with session statistics.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page (max: 100)
- `search` (optional) - Search by exam name or code

**Response:**
```json
{
  "success": true,
  "data": {
    "exams": [
      {
        "exam_id": "string",
        "exam_name": "string",
        "exam_code": "string",
        "description": "string",
        "duration_minutes": number,
        "passing_score": number,
        "total_scenarios": number,
        "total_questions": number,
        "total_sessions": number,
        "completed_sessions": number,
        "average_score": number,
        "is_active": boolean,
        "created_at": "date"
      }
    ],
    "total": number,
    "page": number,
    "limit": number,
    "total_pages": number
  },
  "message": "Partner exams retrieved successfully"
}
```

---

### 2. Get Exam Details
**GET** `/partner-exams/:exam_id`

Retrieves detailed information about a specific exam including scenarios and statistics.

**URL Parameters:**
- `exam_id` (required) - The exam ID

**Response:**
```json
{
  "success": true,
  "data": {
    "exam_id": "string",
    "exam_name": "string",
    "exam_code": "string",
    "description": "string",
    "duration_minutes": number,
    "passing_score": number,
    "total_scenarios": number,
    "total_questions": number,
    "scenarios": [
      {
        "scenario_id": "string",
        "scenario_title": "string",
        "question_count": number
      }
    ],
    "statistics": {
      "total_sessions": number,
      "completed_sessions": number,
      "in_progress_sessions": number,
      "average_score": number,
      "pass_rate": number,
      "total_candidates_attempted": number
    }
  },
  "message": "Exam details retrieved successfully"
}
```

---

### 3. Get Exam Questions
**GET** `/partner-exams/:exam_id/questions`

Retrieves paginated questions for an exam with optional scenario filtering.

**URL Parameters:**
- `exam_id` (required) - The exam ID

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50, max: 100) - Items per page
- `scenario_id` (optional) - Filter questions by scenario

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question_id": "string",
        "scenario_id": "string",
        "scenario_title": "string",
        "question_text": "string",
        "question_type": "string",
        "options": [],
        "correct_answer": "string",
        "points": number,
        "difficulty": "string",
        "order": number
      }
    ],
    "total": number,
    "page": number,
    "limit": number,
    "total_pages": number,
    "exam_name": "string",
    "scenario_name": "string (if filtered)"
  },
  "message": "Exam questions retrieved successfully"
}
```

---

### 4. Get Exam Sessions
**GET** `/partner-exams/:exam_id/sessions`

Retrieves paginated exam sessions with filtering options and summary statistics.

**URL Parameters:**
- `exam_id` (required) - The exam ID

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `candidate_id` (optional) - Filter by specific candidate
- `status` (optional) - Filter by status (completed, in_progress, abandoned)
- `start_date` (optional) - Filter sessions from this date (ISO format)
- `end_date` (optional) - Filter sessions until this date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "string",
        "candidate_id": "string",
        "candidate_name": "string",
        "candidate_email": "string",
        "batch_name": "string",
        "status": "string",
        "score": number | null,
        "total_questions": number,
        "answered_questions": number,
        "start_time": "date",
        "end_time": "date | null",
        "duration_minutes": number | null,
        "passed": boolean | null
      }
    ],
    "total": number,
    "page": number,
    "limit": number,
    "total_pages": number,
    "exam_name": "string",
    "summary": {
      "total_sessions": number,
      "completed": number,
      "in_progress": number,
      "abandoned": number,
      "average_score": number,
      "pass_rate": number
    }
  },
  "message": "Exam sessions retrieved successfully"
}
```

---

### 5. Get Session Details
**GET** `/partner-exams/:exam_id/sessions/:session_id`

Retrieves detailed information about a specific session including all answers.

**URL Parameters:**
- `exam_id` (required) - The exam ID
- `session_id` (required) - The session ID

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "string",
    "exam_id": "string",
    "exam_name": "string",
    "candidate": {
      "candidate_id": "string",
      "name": "string",
      "email": "string",
      "batch_name": "string"
    },
    "status": "string",
    "score": number | null,
    "passed": boolean | null,
    "start_time": "date",
    "end_time": "date | null",
    "duration_minutes": number | null,
    "total_questions": number,
    "answered_questions": number,
    "answers": [
      {
        "question_id": "string",
        "question_text": "string",
        "scenario_title": "string",
        "candidate_answer": "any",
        "correct_answer": "any",
        "is_correct": boolean,
        "points_earned": number,
        "points_possible": number
      }
    ]
  },
  "message": "Session details retrieved successfully"
}
```

---

### 6. Get Exam Scenarios
**GET** `/partner-exams/:exam_id/scenarios`

Retrieves all scenarios for a specific exam.

**URL Parameters:**
- `exam_id` (required) - The exam ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "scenario_id": "string",
      "scenario_title": "string",
      "description": "string",
      "question_count": number,
      "total_points": number,
      "order": number
    }
  ],
  "message": "Exam scenarios retrieved successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "statusCode": number,
  "message": "string",
  "details": "any (optional)"
}
```

**Common Error Codes:**
- `401` - Unauthorized (no partner ID)
- `400` - Bad Request (missing required parameters)
- `404` - Not Found (exam/session not found)
- `500` - Server Error

---

## Implementation Details

### Database Collections Used
- **Exam** - Main exam collection
- **ExamScenarios** - Scenario collection with questions
- **Practice** - Session/practice collection
- **PartnerCandidate** - Links candidates to partners
- **Users** - Candidate information
- **CandidateBatch** - Batch information

### Key Features
- **Partner Data Isolation** - All queries filter by partner_id to ensure partners only see their candidates' data
- **Pagination** - All list endpoints support pagination with configurable limits
- **Aggregation Pipelines** - Complex MongoDB aggregations for statistics and joins
- **Session Statistics** - Real-time calculation of completion rates, average scores, and pass rates
- **Filtering** - Support for search, status, date range, and candidate filters

### Repository Methods
All database operations are in `PartnerExamsRepository`:
1. `getPartnerExams()` - List with statistics
2. `getExamDetails()` - Detailed exam view
3. `getExamQuestions()` - Paginated questions
4. `getExamSessions()` - Filtered sessions with summary
5. `getSessionDetails()` - Full session with answers
6. `getExamScenarios()` - Scenario list
