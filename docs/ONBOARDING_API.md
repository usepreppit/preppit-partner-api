# Partner Onboarding API Documentation

## Overview
The onboarding system allows partners to complete their profile setup in stages, saving progress incrementally, and finally marking onboarding as complete.

## Onboarding Fields

### Required Fields (for completion)
- `organization_name` - string (2-100 characters)
- `contact_person_name` - string (2-100 characters)
- `contact_email` - valid email address
- `contact_phone` - phone number string
- `country` - country name
- `timezone` - timezone string
- `preferred_currency` - enum: `USD`, `CAD`, `NGN`, `GBP`, `EUR`
- `exam_types` - array of enums: `PEBC_OSCE`, `IELTS`, `PLAB`, `USMLE`, `NCLEX`

### Optional Field
- `organization_logo` - URL string

## API Endpoints

### 1. Get Profile with Onboarding Status
**Endpoint:** `GET /api/v1/users/me`  
**Auth:** Required (JWT)  
**Account Type:** Partner

**Response:**
```json
{
  "status": "success",
  "message": "user fetched successfully",
  "data": {
    "_id": "partner_id",
    "email": "partner@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "account_type": "partner",
    "is_onboarding_completed": false,
    "onboarding_status": {
      "is_completed": false,
      "completed_at": null,
      "missing_fields": [
        "organization_name",
        "contact_email",
        "exam_types"
      ],
      "completion_percentage": 62
    }
  }
}
```

### 2. Save Onboarding Progress
**Endpoint:** `PUT /api/v1/profile/onboarding`  
**Auth:** Required (JWT)  
**Account Type:** Partner (only if onboarding not completed)  
**Middleware:** `requireOnboardingIncomplete`

**Request Body:** (All fields optional, send only what you want to save)
```json
{
  "organization_name": "PrepIt Academy",
  "contact_person_name": "Jane Smith",
  "country": "Canada"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Onboarding progress saved successfully",
  "data": {
    "message": "Onboarding progress saved successfully",
    "fields_saved": ["organization_name", "contact_person_name", "country"],
    "onboarding_status": {
      "is_completed": false,
      "missing_fields": ["contact_email", "contact_phone", "timezone", "preferred_currency", "exam_types"],
      "completion_percentage": 37
    }
  }
}
```

### 3. Complete Onboarding
**Endpoint:** `POST /api/v1/profile/complete_onboarding`  
**Auth:** Required (JWT)  
**Account Type:** Partner (only if onboarding not completed)  
**Middleware:** `requireOnboardingIncomplete`

**Request Body:** (All required fields must be present)
```json
{
  "organization_name": "PrepIt Academy",
  "contact_person_name": "Jane Smith",
  "contact_email": "contact@prepitacademy.com",
  "contact_phone": "+1-555-0123",
  "country": "Canada",
  "timezone": "America/Toronto",
  "organization_logo": "https://example.com/logo.png",
  "preferred_currency": "CAD",
  "exam_types": ["PEBC_OSCE", "IELTS"]
}
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Onboarding completed successfully",
  "data": {
    "message": "Onboarding completed successfully",
    "is_onboarding_completed": true,
    "onboarding_completed_at": "2025-11-26T12:00:00.000Z"
  }
}
```

**Error Response (Missing Fields):**
```json
{
  "status": "error",
  "message": "Cannot complete onboarding. Missing required fields: exam_types, preferred_currency",
  "statusCode": 400
}
```

## Workflow

### Frontend Implementation Example

```javascript
// 1. On login/app load - Check onboarding status
async function checkOnboardingStatus() {
  const response = await fetch('/api/v1/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.data.account_type === 'partner' && !data.data.onboarding_status.is_completed) {
    // Show onboarding modal
    showOnboardingModal(data.data.onboarding_status);
  }
}

// 2. Save progress as user fills form
async function saveOnboardingProgress(formData) {
  const response = await fetch('/api/v1/profile/onboarding', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  // Update UI with completion_percentage
  updateProgressBar(result.data.onboarding_status.completion_percentage);
}

// 3. Complete onboarding when all fields are filled
async function completeOnboarding(completeFormData) {
  const response = await fetch('/api/v1/profile/complete_onboarding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(completeFormData)
  });
  
  if (response.ok) {
    // Redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    const error = await response.json();
    // Show missing fields error
    showError(error.message);
  }
}
```

## Validation Rules

### Save Progress (`PUT /profile/onboarding`)
- All fields are optional
- At least one field must be provided
- If `exam_types` is provided, it must be a non-empty array
- If `preferred_currency` is provided, it must be one of: USD, CAD, NGN, GBP, EUR
- Each exam type must be valid: PEBC_OSCE, IELTS, PLAB, USMLE, NCLEX

### Complete Onboarding (`POST /profile/complete_onboarding`)
- All required fields must be present
- `organization_name` and `contact_person_name` must be 2-100 characters
- `contact_email` must be a valid email
- `exam_types` must be a non-empty array
- All validation rules from save progress apply

## Error Responses

### Already Completed
```json
{
  "status": "error",
  "message": "Onboarding has already been completed. Cannot save progress.",
  "statusCode": 400
}
```

### Invalid Account Type
```json
{
  "status": "error",
  "message": "Onboarding is only available for partner accounts",
  "statusCode": 400
}
```

### Validation Error
```json
{
  "status": "error",
  "errors": {
    "contact_email": ["Please provide a valid email address"],
    "exam_types": ["At least one exam type must be selected"]
  }
}
```

## Database Updates

When onboarding is completed:
- `is_onboarding_completed` is set to `true`
- `onboarding_completed_at` is set to current timestamp
- `partner_status` is changed from `pending` to `active`
- Partner gains full access to the platform

## Middleware Protection

Routes requiring completed onboarding will use `requireOnboardingComplete` middleware which blocks access and returns:

```json
{
  "status": "error",
  "message": "Please complete your onboarding before accessing this resource",
  "statusCode": 403
}
```
