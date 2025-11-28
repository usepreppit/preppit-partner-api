# Partner Payment API Migration Guide

## Summary of Changes

The partner payment system has been updated to use simplified, RESTful endpoints with a monthly subscription pricing model instead of session-based pricing.

---

## Endpoint Changes

### Old Endpoints (Deprecated)
```
POST /payments/partner/calculate_price
GET  /payments/partner/payment_options
POST /payments/partner/process_payment
```

### New Endpoints (Current)
```
GET  /payments/payment-methods
GET  /payments/pricing
POST /payments/process
```

---

## API Comparison

### 1. Get Payment Methods

**OLD:** `GET /payments/partner/payment_options`
**NEW:** `GET /payments/payment-methods`

Both return the same response structure:
```json
{
  "cards": [...],
  "auto_renew": boolean
}
```

---

### 2. Calculate Pricing

**OLD:** `POST /payments/partner/calculate_price`
```json
{
  "candidates": 50,
  "sessions_per_day": 5
}
```

**NEW:** `GET /payments/pricing?candidate_count=50&months=6`

The new endpoint:
- Uses query parameters instead of request body
- Changed from session-based to month-based pricing
- Returns detailed breakdown of pricing

**Old Response:**
```json
{
  "perCandidate": 260,
  "total": 13000
}
```

**New Response:**
```json
{
  "per_candidate": 51,
  "total": 2550,
  "breakdown": {
    "candidate_count": 50,
    "months": 6,
    "base_price_per_candidate": 60,
    "volume_discount": 15,
    "final_price_per_candidate": 51
  }
}
```

---

### 3. Process Payment

**OLD:** `POST /payments/partner/process_payment`
```json
{
  "candidates": 50,
  "sessions_per_day": 5,
  "payment_method_id": "pm_xxx",
  "auto_renew": true
}
```

**NEW:** `POST /payments/process`
```json
{
  "candidate_count": 50,
  "months": 6,
  "payment_method_id": "pm_xxx",
  "auto_renew": true
}
```

Parameter changes:
- `candidates` → `candidate_count`
- `sessions_per_day` → `months`

---

## Pricing Model Changes

### Old Model (Session-Based)
```typescript
sessionsPerDay = plan === "unlimited" ? 15 : Number(plan)
monthlySessions = sessionsPerDay * 30
cost = monthlySessions * 1.4
basePrice = cost * 1.45
perCandidate = Math.round(basePrice * multiplier)
```

**Issues:**
- Complex calculation based on sessions
- Hard to understand for partners
- Unlimited plan ambiguity

### New Model (Monthly Subscription)
```typescript
basePricePerMonth = $10
basePrice = basePricePerMonth * months
perCandidate = Math.round(basePrice * volumeMultiplier)
```

**Benefits:**
- Simple, predictable pricing
- Clear monthly cost: $10/candidate/month
- Easy to calculate and understand

---

## Migration Checklist

If you're migrating from the old API:

### Frontend Changes Required

1. **Update endpoint URLs:**
   - Change all `/payments/partner/*` to `/payments/*`

2. **Update pricing request:**
   ```javascript
   // OLD
   POST /payments/partner/calculate_price
   body: { candidates: 50, sessions_per_day: 5 }
   
   // NEW
   GET /payments/pricing?candidate_count=50&months=6
   ```

3. **Update payment request:**
   ```javascript
   // OLD
   body: { 
     candidates: 50, 
     sessions_per_day: 5,
     payment_method_id,
     auto_renew 
   }
   
   // NEW
   body: { 
     candidate_count: 50, 
     months: 6,
     payment_method_id,
     auto_renew 
   }
   ```

4. **Update response handling:**
   - Old: `perCandidate` → New: `per_candidate`
   - New response includes `breakdown` object

5. **UI Updates:**
   - Replace "sessions per day" selector with "months" selector
   - Update pricing display to show monthly cost
   - Add pricing breakdown display (optional but recommended)

---

## Code Examples

### Old Implementation (Deprecated)
```javascript
// Calculate price
const response = await fetch('/payments/partner/calculate_price', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    candidates: 50,
    sessions_per_day: 5
  })
});
const { perCandidate, total } = await response.json();
```

### New Implementation (Current)
```javascript
// Calculate price
const response = await fetch(
  '/payments/pricing?candidate_count=50&months=6',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const { per_candidate, total, breakdown } = await response.json();

// Display breakdown
console.log(`Base price: $${breakdown.base_price_per_candidate}`);
console.log(`Discount: ${breakdown.volume_discount}%`);
console.log(`Final price: $${breakdown.final_price_per_candidate}/candidate`);
console.log(`Total: $${total}`);
```

---

## Backward Compatibility

**Legacy endpoints are maintained for backward compatibility:**
- `/payments/get_cards`
- `/payments/stripe/get_secret`
- `/payments/plans`
- etc.

However, the old partner-specific endpoints have been removed:
- ❌ `/payments/partner/calculate_price`
- ❌ `/payments/partner/payment_options`
- ❌ `/payments/partner/process_payment`

**Recommendation:** Migrate to new endpoints as soon as possible.

---

## Testing the New API

### 1. Get Payment Methods
```bash
curl -X GET http://localhost:3000/payments/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Calculate Pricing
```bash
curl -X GET "http://localhost:3000/payments/pricing?candidate_count=50&months=6" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Process Payment
```bash
curl -X POST http://localhost:3000/payments/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_count": 50,
    "months": 6,
    "payment_method_id": "pm_xxxxxxxxxx",
    "auto_renew": true
  }'
```

---

## Breaking Changes

### Parameter Names
- `candidates` → `candidate_count`
- `sessions_per_day` → `months`

### Response Format
- `perCandidate` → `per_candidate`
- Added `breakdown` object with detailed pricing info

### Pricing Calculation
- Changed from session-based to monthly subscription
- New base price: $10/candidate/month
- Volume discounts remain the same (10%, 15%, 20%)

---

## Support

For questions or issues with the migration:
1. Check the updated documentation in `PARTNER_PAYMENT_SYSTEM.md`
2. Review pricing examples in the documentation
3. Test with the provided curl commands
4. Contact the backend team for assistance
