# Candidate Onboarding System - Refactored Architecture

## Overview
The candidate onboarding system has been refactored to support a many-to-many relationship between partners and candidates, allowing:
- **One candidate** can be onboarded by **multiple partners**
- **One user account** per candidate (based on email)
- **Same candidate cannot be in the same batch twice** (enforced by unique constraint)

## Key Changes

### 1. New PartnerCandidate Model (Junction Table)
**File**: `/src/databases/mongodb/model/partner_candidate.model.ts`

This model creates a many-to-many relationship between partners and candidates:

```typescript
interface IPartnerCandidate {
    _id?: string | number;
    partner_id: string | number;      // Reference to partner
    candidate_id: string | number;    // Reference to user (candidate)
    batch_id: string | number;        // Reference to batch
    is_paid_for: boolean;             // Payment status per partner
    invite_status: 'pending' | 'accepted' | 'expired';
    invite_sent_at?: Date;
    invite_accepted_at?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
```

**Unique Constraints**:
- `(candidate_id, batch_id)` - Prevents same candidate in same batch twice
- Indexes on `partner_id`, `candidate_id`, and `batch_id` for performance

### 2. User Model Simplification
**File**: `/src/application/users/types/user.types.ts`

The User model now focuses on core user information:
- Removed `partner_id`, `batch_id` (moved to PartnerCandidate)
- Removed `is_paid_for`, `invite_status`, etc. (moved to PartnerCandidate)
- Users are now truly independent entities that can practice on the platform

### 3. Repository Methods Updated

#### New Methods:
- `checkPartnerCandidateExists()` - Check if candidate exists in specific batch
- `checkMultiplePartnerCandidatesExist()` - Batch check for CSV uploads
- `createCandidatesBulk()` - Bulk create with user reuse logic
- `getPartnerCandidateById()` - Get specific partner-candidate relationship
- `getPartnerCandidateByIds()` - Get relationship by partner + candidate IDs

#### Updated Methods:
- `createCandidate()` - Now returns `{ user, partnerCandidate }`
  - Checks if user exists, creates only if new
  - Always creates new PartnerCandidate record
  
- `getCandidatesByPartnerId()` - Joins through PartnerCandidate table
  - Returns candidates with their relationship-specific data
  
- `updateCandidatePaymentStatus()` - Updates PartnerCandidate record
  - Takes `partner_id` to identify the relationship
  
- `updateCandidateInviteStatus()` - Updates PartnerCandidate record
  - Takes `partner_candidate_id` for the relationship

### 4. CSV Upload Optimization
**File**: `/src/application/candidates/candidates.service.ts`

**Before**: Made 2N database calls (check + create for each row)

**After**: Makes only 2 database calls total:
1. Check which emails already exist in this partner-batch combination
2. Bulk create users (if new) + PartnerCandidate relationships

**Logic**:
- Parses and validates all rows first
- Checks for existing relationships in one query
- Creates missing users in bulk
- Creates PartnerCandidate relationships in bulk
- Handles duplicate emails gracefully (reuses existing user)

### 5. API Changes

#### Updated Endpoints:

**POST /candidates**
- Still checks if candidate exists in the batch
- Returns error: "Candidate with this email already exists in this batch"
- If email exists but in different batch → creates new relationship

**POST /candidates/upload-csv**
- Checks for batch-specific duplicates
- Allows same email across different batches
- Error message: "Candidate already exists in this batch"

**PATCH /candidates/:candidate_id/mark-paid**
- Updates the PartnerCandidate relationship
- Requires candidate to belong to the partner

**POST /candidates/:partner_candidate_id/accept-invite**
- Changed from `:candidate_id` to `:partner_candidate_id`
- Updates specific partner-candidate relationship
- Returns combined user + relationship data

#### Response Structure:

```typescript
{
    _id: "user_id",                          // User ID
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com",
    batch_id: "batch_id",
    batch_name: "Batch A",
    is_active: true,
    is_paid_for: false,                      // From PartnerCandidate
    invite_status: "pending",                // From PartnerCandidate
    invite_sent_at: "2025-11-27T...",       // From PartnerCandidate
    invite_accepted_at: null,                // From PartnerCandidate
    partner_candidate_id: "pc_id",          // PartnerCandidate record ID
    createdAt: "2025-11-27T...",
    updatedAt: "2025-11-27T..."
}
```

## Business Rules Enforced

1. **One User Account Per Email**
   - Email uniqueness enforced at User model level
   - Same person can be invited by multiple partners
   - User can practice on platform regardless of partner

2. **No Duplicate in Same Batch**
   - Unique constraint: `(candidate_id, batch_id)`
   - MongoDB will reject duplicate entries
   - Error handling in application layer

3. **Partner-Specific Payment Tracking**
   - Each partner tracks payment separately
   - Partner A can mark as paid, doesn't affect Partner B
   - Allows flexible payment models

4. **Relationship-Specific Invites**
   - Each partner-candidate relationship has its own invite status
   - Candidate can be "pending" for Partner A, "accepted" for Partner B
   - Invite acceptance updates specific relationship only

## Migration Considerations

### Data Migration (if needed)
If you have existing data with `partner_id` and `batch_id` in the User model:

```javascript
// Pseudo-code for migration
const users = await UserModel.find({ partner_id: { $exists: true } });

for (const user of users) {
    await PartnerCandidateModel.create({
        partner_id: user.partner_id,
        candidate_id: user._id,
        batch_id: user.batch_id,
        is_paid_for: user.is_paid_for,
        invite_status: user.invite_status,
        invite_sent_at: user.invite_sent_at,
        invite_accepted_at: user.invite_accepted_at
    });
    
    // Optionally clean up old fields
    await UserModel.updateOne(
        { _id: user._id },
        { 
            $unset: { 
                partner_id: 1, 
                batch_id: 1, 
                is_paid_for: 1,
                invite_status: 1,
                invite_sent_at: 1,
                invite_accepted_at: 1
            }
        }
    );
}
```

## Testing Scenarios

### Scenario 1: Same email, different batches
```
1. Partner A uploads john@example.com to Batch 1
   → Creates User + PartnerCandidate(Partner A, John, Batch 1)
   
2. Partner A uploads john@example.com to Batch 2
   → Reuses User, creates PartnerCandidate(Partner A, John, Batch 2)
   
3. Partner B uploads john@example.com to Batch 3
   → Reuses User, creates PartnerCandidate(Partner B, John, Batch 3)

Result: 1 User, 3 PartnerCandidate records
```

### Scenario 2: Same email, same batch (should fail)
```
1. Partner A uploads john@example.com to Batch 1
   → Success
   
2. Partner A uploads john@example.com to Batch 1 again
   → Error: "Candidate already exists in this batch"

Result: Maintains data integrity
```

### Scenario 3: CSV with duplicates
```
CSV contains:
- john@example.com (row 1)
- jane@example.com (row 2)
- john@example.com (row 3) - duplicate

Result:
- Row 1: Success
- Row 2: Success
- Row 3: Error (duplicate in same batch)
```

## Performance Improvements

1. **Bulk Operations**: CSV upload now uses `insertMany` instead of individual inserts
2. **Reduced DB Calls**: From O(2N) to O(2) for CSV uploads
3. **Indexed Queries**: All lookups use indexed fields
4. **Efficient Joins**: Aggregation pipeline optimized for relationship queries

## Benefits

✅ **Flexible Onboarding**: Partners can independently onboard candidates  
✅ **Data Integrity**: No duplicate candidates in same batch  
✅ **User Independence**: Candidates can practice regardless of partner relationship  
✅ **Scalable**: Supports complex multi-partner scenarios  
✅ **Audit Trail**: Complete history of partner-candidate relationships  
✅ **Performance**: Optimized bulk operations for CSV uploads
