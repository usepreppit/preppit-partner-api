# Optional Batch for Candidate Creation

## Overview
Candidates can now be created **with or without** a batch. When created without a batch, they are automatically marked as **unpaid** (`is_paid_for: false`).

## Changes Implemented

### 1. TypeScript Interface Update
- `batch_id` is now **optional** in `CreateCandidateDTO`
- Candidates without a batch are unpaid by default

### 2. Validation Update
- `batch_id` is no longer a required field
- Still validates as a string if provided

### 3. Service Logic
- **With batch_id**: Validates batch ownership, checks seat availability
- **Without batch_id**: Creates unpaid candidate, skips batch validation

### 4. Repository Method
- Added `checkPartnerCandidateExistsAny()` to prevent duplicate candidates across batches

---

## API Usage

### Endpoint
```
POST /candidates
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

---

## Scenario 1: Create Candidate WITH Batch

### Request Body
```json
{
  "batch_id": "6748A83D6BEDDC235942EA14DD",
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com"
}
```

### Behavior
1. ✅ Validates batch exists and belongs to partner
2. ✅ Checks for duplicate email within the batch
3. ✅ Checks seat availability:
   - **Seats available**: Candidate marked as `is_paid_for: true`, assigned to batch
   - **No seats**: Candidate marked as `is_paid_for: false`, NOT assigned to batch
4. ✅ Reserves a seat if available

### Response (Success)
```json
{
  "status": "success",
  "data": {
    "candidate_id": "674abc123...",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "batch_id": "6748A83D6BEDDC235942EA14DD"
  },
  "message": "Candidate created successfully"
}
```

---

## Scenario 2: Create Candidate WITHOUT Batch (NEW)

### Request Body
```json
{
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane.smith@example.com"
}
```

### Behavior
1. ✅ Skips batch validation (no batch provided)
2. ✅ Checks if candidate already exists for this partner (any batch or no batch)
3. ✅ Creates candidate with:
   - `is_paid_for: false`
   - `batch_id: null`
   - `invite_status: 'pending'`
4. ✅ No seat reservation (candidate is unpaid)

### Response (Success)
```json
{
  "status": "success",
  "data": {
    "candidate_id": "674abc456...",
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "jane.smith@example.com",
    "batch_id": null
  },
  "message": "Candidate created successfully"
}
```

---

## Error Responses

### 1. Batch Not Found
```json
{
  "status": "error",
  "message": "Batch not found"
}
```

### 2. Batch Doesn't Belong to Partner
```json
{
  "status": "error",
  "message": "Batch does not belong to this partner"
}
```

### 3. Duplicate Candidate in Batch
```json
{
  "status": "error",
  "message": "Candidate with this email already exists in this batch"
}
```

### 4. Duplicate Candidate for Partner (No Batch)
```json
{
  "status": "error",
  "message": "Candidate with this email already exists for this partner"
}
```

### 5. Missing Required Fields
```json
{
  "status": "error",
  "message": "First name is required"
}
```

---

## Payment Status Logic

| Scenario | batch_id Provided | Seats Available | is_paid_for | batch_id Assigned |
|----------|-------------------|-----------------|-------------|-------------------|
| Batch with seats | ✅ Yes | ✅ Yes | `true` | ✅ Yes |
| Batch without seats | ✅ Yes | ❌ No | `false` | ❌ No |
| No batch provided | ❌ No | N/A | `false` | ❌ No |
| No active subscription | ✅ Yes | N/A | `false` | ❌ No |

---

## Use Cases

### 1. **Paid Candidates (With Batch & Seats)**
Partner purchases seats and adds candidates to a batch with available seats.

```json
{
  "batch_id": "674...",
  "firstname": "Alice",
  "lastname": "Johnson",
  "email": "alice@example.com"
}
```
➡️ `is_paid_for: true`, assigned to batch

---

### 2. **Unpaid Candidates (No Batch)**
Partner wants to add candidates to the system before purchasing seats.

```json
{
  "firstname": "Bob",
  "lastname": "Williams",
  "email": "bob@example.com"
}
```
➡️ `is_paid_for: false`, no batch assignment

**Later:** Partner can mark candidate as paid using:
```
PATCH /candidates/:candidate_id/mark-paid
```

---

### 3. **Trial Users / Lead Tracking**
Partner collects candidate information before batch assignment.

```json
{
  "firstname": "Carol",
  "lastname": "Davis",
  "email": "carol@example.com"
}
```
➡️ Stored as unpaid, can be assigned to batch later

---

## Database Impact

### PartnerCandidate Collection
```javascript
{
  partner_id: ObjectId("..."),
  candidate_id: ObjectId("..."),
  batch_id: null,  // ← Can be null now
  is_paid_for: false,  // ← Automatically false when no batch
  invite_status: "pending",
  invite_sent_at: ISODate("...")
}
```

---

## Migration Notes

### Existing Functionality
✅ All existing batch-based workflows continue to work
✅ Seat reservation logic unchanged for batched candidates
✅ CSV upload still requires `batch_id` (separate endpoint)

### New Functionality
✨ Partners can add candidates without assigning to a batch
✨ Unpaid candidates can be tracked and managed separately
✨ Flexible onboarding flow (collect info → purchase seats → assign batch)

---

## Technical Details

### Files Modified
1. `src/application/candidates/types/candidates.types.ts`
   - Made `batch_id` optional in `CreateCandidateDTO`

2. `src/validation/candidates.validation.ts`
   - Removed `required` validation from `batch_id`

3. `src/application/candidates/candidates.service.ts`
   - Updated `createCandidate()` to handle optional batch
   - Added conditional batch validation

4. `src/application/candidates/models/candidates.repository.ts`
   - Added `checkPartnerCandidateExistsAny()` method

### Backward Compatibility
✅ 100% backward compatible
- Existing API calls with `batch_id` work identically
- No breaking changes to response structure
- All existing validations preserved
