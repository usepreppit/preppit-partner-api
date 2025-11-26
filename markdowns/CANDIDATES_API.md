# Candidates Management API

## Overview
Complete candidate management system for partners to organize candidates into batches and upload via CSV.

## Models Created

### CandidateBatch Model
- `batch_name`: String (unique per partner)
- `partner_id`: ObjectId (reference to Partner)
- `created_at`: Date
- `updated_at`: Date

### User Model Updates
Added fields:
- `partner_id`: ObjectId (links candidate to partner)
- `batch_id`: ObjectId (links candidate to batch)
- `is_paid_for`: Boolean (indicates if partner has paid for this candidate's subscription)
- `invite_status`: Enum ['pending', 'accepted', 'expired'] (candidate invite acceptance status)
- `invite_sent_at`: Date (when invite was sent to candidate)
- `invite_accepted_at`: Date (when candidate accepted the invite)

## API Endpoints

### 1. Get All Batches
```
GET /api/v1/candidates/batches
```
**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Batches retrieved successfully",
  "data": [
    {
      "_id": "674651a1b2c3d4e5f6789000",
      "batch_name": "January 2025 Cohort",
      "partner_id": "674651a1b2c3d4e5f6788999",
      "created_at": "2025-11-20T09:00:00.000Z",
      "updated_at": "2025-11-26T11:15:00.000Z"
    },
    {
      "_id": "674651a1b2c3d4e5f6789001",
      "batch_name": "February 2025 Cohort",
      "partner_id": "674651a1b2c3d4e5f6788999",
      "created_at": "2025-11-21T14:30:00.000Z",
      "updated_at": "2025-11-26T12:00:00.000Z"
    }
  ]
}
```

**Features:**
- Returns all batches for the authenticated partner
- Sorted by most recently created (newest first)
- No candidate count included (use GET /candidates for that)

### 2. Get All Candidates
```
GET /api/v1/candidates?page=1&limit=20
```
**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page (1-100), default: 20

**Response:**
```json
{
  "success": true,
  "message": "Candidates retrieved successfully",
  "data": {
    "candidates": [
      {
        "_id": "...",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com",
        "batch_id": "...",
        "batch_name": "Batch A",
        "is_active": true,
        "createdAt": "2025-11-26T...",
        "updatedAt": "2025-11-26T..."
      }
    ],
    "batches": [
      {
        "_id": "...",
        "batch_name": "Batch A",
        "partner_id": "...",
        "candidate_count": 5,
        "created_at": "2025-11-26T...",
        "updated_at": "2025-11-26T..."
      }
    ],
    "total_candidates": 100,
    "total_batches": 5,
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 5,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

**Pagination Details:**
- Candidates are sorted by creation date (newest first)
- Maximum 100 items per page
- Returns batches list on every request (not paginated)
- `has_next`: true if there are more pages
- `has_previous`: true if not on first page

### 3. Create Candidate Batch
```
POST /api/v1/candidates/batches
```
**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "batch_name": "January 2025 Cohort"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "_id": "...",
    "batch_name": "January 2025 Cohort",
    "partner_id": "...",
    "created_at": "2025-11-26T...",
    "updated_at": "2025-11-26T..."
  }
}
```

**Validation:**
- `batch_name`: Required, 3-100 characters
- Batch name must be unique per partner

### 4. Add Individual Candidate
```
POST /api/v1/candidates
```
**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "batch_id": "507f1f77bcf86cd799439011",
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Candidate created successfully",
  "data": {
    "_id": "...",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "batch_id": "...",
    "partner_id": "...",
    "is_active": true,
    "createdAt": "2025-11-26T...",
    "updatedAt": "2025-11-26T..."
  }
}
```

**Validation:**
- `batch_id`: Required, valid ObjectId
- `firstname`: Required, 2-50 characters
- `lastname`: Required, 2-50 characters
- `email`: Required, valid email format
- Email must be unique per partner
- Batch must belong to the partner

### 5. Upload Candidates via CSV
```
POST /api/v1/candidates/upload-csv
```
**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `batch_id`: String (required)
- `file`: CSV file (required)

**CSV Format:**
```csv
firstname,lastname,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
```

**CSV Requirements:**
- Must contain header row with columns: `firstname`, `lastname`, `email`
- All three fields are required for each row
- Email must be valid format
- Email must be unique (not already exist for this partner)

**Response:**
```json
{
  "success": true,
  "message": "CSV upload completed",
  "data": {
    "total_rows": 10,
    "successful": 8,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "email": "invalid-email",
        "error": "Invalid email format"
      },
      {
        "row": 5,
        "email": "duplicate@example.com",
        "error": "Email already exists"
      }
    ],
    "candidates": [
      {
        "_id": "...",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com",
        "batch_id": "...",
        "batch_name": "January 2025 Cohort",
        "is_active": true,
        "createdAt": "2025-11-26T...",
        "updatedAt": "2025-11-26T..."
      }
    ]
  }
}
```

**Features:**
- CSV file is automatically uploaded to Cloudflare R2 bucket at `candidates/csv-uploads/{partner_id}/{filename}`
- Validates each row individually
- Provides detailed error reporting for failed rows
- Successfully created candidates are returned
- Duplicate emails within the CSV are caught and reported

## Error Responses

### Validation Error (412)
```json
{
  "success": false,
  "statusCode": 412,
  "message": "Validation failed",
  "details": {
    "batch_name": "batch_name is required"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Batch not found"
}
```

### Duplicate Error
```json
{
  "success": false,
  "statusCode": 412,
  "message": "Validation failed",
  "details": "Batch name already exists for this partner"
}
```

## Middleware
All endpoints require:
- `authMiddleware`: Valid JWT token
- `requireOnboardingComplete`: Partner must have completed onboarding

## Database Indexes
- `CandidateBatch`: Compound index on `(partner_id, batch_name)` - ensures unique batch names per partner
- `User`: Index on `partner_id` and `batch_id` for efficient queries

## S3 Integration
- CSV files are uploaded to Cloudflare R2 bucket
- Path: `candidates/csv-uploads/{partner_id}/{unique-filename}.csv`
- Files are stored as private (not publicly accessible)
- Original filename and upload metadata are preserved
