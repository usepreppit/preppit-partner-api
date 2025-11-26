# Partner Onboarding API Documentation

## Overview
This document describes the partner onboarding flow that ensures partners complete their profile setup before accessing essential features.

## Onboarding Flow

### 1. User Authentication
When a partner logs in, they receive a JWT token with their `account_type` set to `'partner'`.

### 2. Get Profile (Check Onboarding Status)
**Endpoint:** `GET /profile`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response for Partners:**
```json
{
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
      "contact_person_name",
      "contact_email",
      "contact_phone",
      "country",
      "timezone",
      "preferred_currency",
      "exam_types"
    ],
    "completion_percentage": 0
  }
}
```

### 3. Complete Onboarding
**Endpoint:** `POST /profile/complete_onboarding`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "organization_name": "ABC Healthcare",
  "contact_person_name": "John Doe",
  "contact_email": "contact@abchealthcare.com",
  "contact_phone": "+1234567890",
  "country": "Canada",
  "timezone": "America/Toronto",
  "organization_logo": "https://example.com/logo.png",
  "preferred_currency": "CAD",
  "exam_types": ["PEBC_OSCE", "IELTS"]
}
```

**Field Validations:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| organization_name | string | Yes | 2-100 characters |
| contact_person_name | string | Yes | 2-100 characters |
| contact_email | string | Yes | Valid email format |
| contact_phone | string | Yes | Valid phone number |
| country | string | Yes | - |
| timezone | string | Yes | Valid timezone string |
| organization_logo | string | No | URL string |
| preferred_currency | string | Yes | One of: USD, CAD, NGN, GBP, EUR |
| exam_types | array | Yes | At least one of: PEBC_OSCE, IELTS, PLAB, USMLE, NCLEX |

**Success Response:**
```json
{
  "message": "Onboarding completed successfully",
  "is_onboarding_completed": true,
  "onboarding_completed_at": "2025-11-26T10:30:00.000Z"
}
```

**Error Responses:**

*Already Completed:*
```json
{
  "error": "Onboarding has already been completed"
}
```

*Validation Error:*
```json
{
  "errors": {
    "organization_name": ["Organization name is required"],
    "exam_types": ["At least one exam type must be selected"]
  }
}
```

## Frontend Implementation Guide

### 1. Check Onboarding Status on Login
```javascript
// After successful login
const profile = await fetch('/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await profile.json();

if (data.account_type === 'partner' && !data.is_onboarding_completed) {
  // Show onboarding modal
  showOnboardingModal(data.onboarding_status);
}
```

### 2. Onboarding Modal Component
The modal should collect the following information:

**Section 1: Partner Profile Setup**
- Organization name (text input)
- Contact person full name (text input)
- Email (email input)
- Phone (phone input)
- Country (select/autocomplete)
- Timezone (select/autocomplete)
- Organization logo (file upload - optional)
- Preferred currency (select: USD/CAD/NGN/GBP/EUR)

**Section 2: Select Exam Types**
- Checkbox/multi-select for exam types:
  - PEBC OSCE
  - IELTS
  - PLAB
  - USMLE
  - NCLEX

### 3. Submit Onboarding Data
```javascript
const submitOnboarding = async (formData) => {
  const response = await fetch('/profile/complete_onboarding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  if (response.ok) {
    // Onboarding complete - refresh profile or redirect
    window.location.reload();
  } else {
    // Handle validation errors
    const errors = await response.json();
    displayErrors(errors);
  }
};
```

### 4. Progress Indicator
Use the `completion_percentage` field to show progress:
```javascript
<ProgressBar value={onboarding_status.completion_percentage} />
<p>Missing fields: {onboarding_status.missing_fields.join(', ')}</p>
```

## Middleware Protection

### Routes Protected by Onboarding
The following middleware can be applied to routes that require onboarding completion:

```typescript
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';

route.get('/protected-route', requireOnboardingComplete, controller.method);
```

This will return a 403 error if a partner tries to access the route without completing onboarding:
```json
{
  "error": "Please complete your onboarding before accessing this feature"
}
```

## Database Schema

### Partner Model Fields
```typescript
{
  // Basic fields
  email: string;
  firstname: string;
  lastname?: string;
  
  // Onboarding fields
  organization_name?: string;
  contact_person_name?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  timezone?: string;
  organization_logo?: string;
  preferred_currency?: 'USD' | 'CAD' | 'NGN' | 'GBP' | 'EUR';
  exam_types?: ('PEBC_OSCE' | 'IELTS' | 'PLAB' | 'USMLE' | 'NCLEX')[];
  
  // Status fields
  is_onboarding_completed?: boolean;
  onboarding_completed_at?: Date;
  partner_status?: 'active' | 'pending' | 'suspended';
}
```

## Notes

1. **Partner Status**: When onboarding is completed, the `partner_status` is automatically set to `'active'`
2. **One-time Process**: Onboarding can only be completed once. Attempting to complete it again will return an error
3. **Account Type**: Only partners can complete onboarding. Admins don't have an onboarding flow
4. **Currency Support**: Currently supports USD, CAD, NGN, GBP, EUR
5. **Exam Types**: Currently supports PEBC_OSCE, IELTS, PLAB, USMLE, NCLEX
