# Partner Payment System

## Overview
The partner payment system allows partners to purchase candidate access with tiered pricing based on the number of candidates and subscription duration in months.

## Pricing Formula

```typescript
// Base price: $10 per candidate per month
basePricePerMonth = 10
basePrice = basePricePerMonth * months

// Volume Discounts
if (candidate_count >= 100) multiplier = 0.8  // 20% discount
else if (candidate_count >= 50) multiplier = 0.85  // 15% discount
else if (candidate_count >= 10) multiplier = 0.9  // 10% discount
else multiplier = 1.0  // No discount

perCandidate = Math.round(basePrice * multiplier)
total = perCandidate * candidate_count
```

## API Endpoints

### 1. Get Payment Methods
**GET** `/payments/payment-methods`

Get saved payment methods and auto-renew preference for the logged-in partner.

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "cards": [
      {
        "id": "pm_xxxxxxxxxx",
        "card": {
          "brand": "visa",
          "last4": "4242",
          "exp_month": 12,
          "exp_year": 2025
        }
      }
    ],
    "auto_renew": false
  }
}
```

---

### 2. Get Pricing
**GET** `/payments/pricing?candidate_count={count}&months={months}`

Calculate the price for a given number of candidates and subscription duration.

**Query Parameters:**
- `candidate_count` (required): Number of candidates (integer)
- `months` (required): Subscription duration in months (integer)

**Example:**
```
GET /payments/pricing?candidate_count=50&months=6
```

**Response:**
```json
{
  "status": "success",
  "data": {
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
}
```

---

### 3. Process Payment
**POST** `/payments/process`

Process a payment for candidate access.

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`

**Request Body:**
```json
{
  "candidate_count": 50,
  "months": 6,
  "payment_method_id": "pm_xxxxxxxxxx",
  "auto_renew": true
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "payment": {
      "_id": "...",
      "user_id": "partner_id",
      "transaction_type": "debit",
      "amount": 2550,
      "currency": "usd",
      "payment_status": "successful",
      "description": "Payment for 50 candidates for 6 month(s)",
      "transaction_details": {
        "candidate_count": 50,
        "months": 6,
        "pricing": {
          "candidate_count": 50,
          "months": 6,
          "base_price_per_candidate": 60,
          "volume_discount": 15,
          "final_price_per_candidate": 51
        }
      }
    },
    "pricing": {
      "per_candidate": 51,
      "total": 2550,
      "breakdown": {
        "candidate_count": 50,
        "months": 6,
        "base_price_per_candidate": 60,
        "volume_discount": 15,
        "final_price_per_candidate": 51
      }
    },
    "charge_id": "ch_xxxxxxxxxx"
  }
}
```

---

## Service Methods

### PaymentsService

#### getPaymentMethods()
```typescript
async getPaymentMethods(
  partner_id: string
): Promise<{ cards: any[]; auto_renew: boolean }>
```

Retrieves saved payment methods from Stripe and auto-renew preference from partner profile.

---

#### calculatePricing()
```typescript
async calculatePricing(
  candidate_count: number, 
  months: number
): Promise<{ 
  per_candidate: number; 
  total: number;
  breakdown: object;
}>
```

Calculates pricing based on the formula with volume discounts. Returns detailed breakdown including:
- Base price per candidate
- Volume discount percentage
- Final price per candidate
- Total amount

---

#### processPayment()
```typescript
async processPayment(
  partner_id: string,
  candidate_count: number,
  months: number,
  payment_method_id: string,
  auto_renew: boolean
): Promise<any>
```

Processes the payment through Stripe and records the transaction:
1. Calculates pricing
2. Validates partner has payment profile
3. Charges the card via Stripe
4. Records payment in database
5. Updates auto-renew preference if changed

---

## Repository Methods

### PartnerRepository

#### updateAutoRenewPreference()
```typescript
async updateAutoRenewPreference(
  partner_id: string, 
  auto_renew: boolean
): Promise<void>
```

Updates the partner's auto-renew subscription preference.

---

## Controller Methods

### PaymentsController

#### GetPaymentMethods()
Extracts partner ID from JWT token and retrieves payment methods.

#### GetPricing()
Validates query parameters (candidate_count, months) and calls service method to calculate pricing.

#### ProcessPayment()
Validates request body and processes payment through service.

---

## Authentication

All endpoints require JWT authentication via `authMiddleware`. The partner ID is extracted from:
```typescript
req.curr_user?._id?.toString()
```

---

## Volume Discounts

| Candidates | Discount | Multiplier | Example (6 months) |
|-----------|----------|------------|-------------------|
| 100+      | 20%      | 0.8        | $48/candidate     |
| 50-99     | 15%      | 0.85       | $51/candidate     |
| 10-49     | 10%      | 0.9        | $54/candidate     |
| 1-9       | 0%       | 1.0        | $60/candidate     |

*Base price: $10/candidate/month*

---

## Payment Flow

1. **Partner adds payment method** → SaveCard() → Auto-marks `payment_method_setup = true`
2. **Partner views payment methods** → GET /payment-methods
3. **Partner calculates price** → GET /pricing?candidate_count=X&months=Y
4. **Partner processes payment** → POST /process
   - Stripe charges the card
   - Payment record created in database
   - Auto-renew preference updated

---

## Database Schema

### Payment Record
```typescript
{
  user_id: partner_id,  // Partner ID stored as user_id for compatibility
  transaction_type: 'debit',
  amount: total,
  currency: 'usd',
  payment_method: payment_method_id,
  payment_processor: 'stripe',
  payment_processor_payment_id: charge.id,
  payment_status: 'successful',
  description: 'Payment for X candidates for Y month(s)',
  transaction_details: {
    candidate_count: number,
    months: number,
    pricing: {
      candidate_count: number,
      months: number,
      base_price_per_candidate: number,
      volume_discount: number,
      final_price_per_candidate: number
    },
    charge_details: Stripe.PaymentIntent
  }
}
```

---

## Stripe Integration

The system reuses the existing Stripe integration that was previously used for users:

### Key Stripe Methods Used:
- `createStripeCustomer()` - Creates a Stripe customer for the partner
- `getCustomerCards()` - Retrieves saved payment methods
- `DebitCustomerCard()` - Charges the partner's card
- `SetupStripeIntent()` - Creates setup intent for adding new cards

### Partner-Specific Modifications:
- All methods now work with `partner_id` instead of `user_id`
- Payment records use `partner_id` as `user_id` for database compatibility
- Auto-tracking of `payment_method_setup` flag on dashboard

---

## Error Handling

All methods throw `ApiError` with appropriate messages:
- 400: Validation errors, payment failures
- Errors are logged via Logger service
- Stripe errors are caught and returned with user-friendly messages

Common error scenarios:
- Missing payment profile
- Invalid payment method
- Insufficient funds
- Card declined
- Network errors

---

## Pricing Examples

### Example 1: Small Team (5 candidates, 1 month)
```
Base: $10 × 1 month = $10/candidate
No discount (< 10 candidates)
Total: $10 × 5 = $50
```

### Example 2: Medium Team (25 candidates, 3 months)
```
Base: $10 × 3 months = $30/candidate
10% discount (10-49 candidates)
Price: $30 × 0.9 = $27/candidate
Total: $27 × 25 = $675
```

### Example 3: Large Team (75 candidates, 12 months)
```
Base: $10 × 12 months = $120/candidate
15% discount (50-99 candidates)
Price: $120 × 0.85 = $102/candidate
Total: $102 × 75 = $7,650
```

### Example 4: Enterprise (150 candidates, 6 months)
```
Base: $10 × 6 months = $60/candidate
20% discount (100+ candidates)
Price: $60 × 0.8 = $48/candidate
Total: $48 × 150 = $7,200
```

---

## Next Steps

Consider implementing:
1. **Validation schemas** using Joi for request validation
2. **Webhook handler** for Stripe payment confirmations
3. **Auto-renewal cron job** to charge partners on schedule
4. **Payment history endpoint** specifically for partners
5. **Refund endpoint** for failed/cancelled subscriptions
6. **Invoice generation** for completed payments
7. **Email notifications** for successful/failed payments
8. **Usage tracking** to monitor candidate access
