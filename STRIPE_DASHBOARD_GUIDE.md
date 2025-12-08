# Viewing Test Payments in Stripe Dashboard

## Where to Find Your Payments

### 1. **Payments Section** (Main Location)
- Go to: https://dashboard.stripe.com/test/payments
- Or: Dashboard → **Payments** (left sidebar)
- This shows all payment intents and charges

### 2. **What You'll See**
Each payment will show:
- **Payment Intent ID** (starts with `pi_`)
- **Amount** (in cents, e.g., $10.00 shows as 1000)
- **Status** (succeeded, failed, etc.)
- **Customer** (if provided)
- **Description** (e.g., "Order payment - John Doe")
- **Created** timestamp

### 3. **Payment Intent Details**
Click on any payment to see:
- Full Payment Intent ID
- Payment Method used
- Amount and currency
- Status and timeline
- Metadata (includes payment method type)

## Finding Your Test Payment

### Method 1: By Payment Intent ID
1. Check your server logs after making a payment
2. Look for: `Payment processed successfully` with `paymentIntentId`
3. Copy the Payment Intent ID (starts with `pi_`)
4. Search for it in Stripe Dashboard → Payments

### Method 2: By Date/Time
1. Go to Payments section
2. Filter by date (today)
3. Look for recent test payments

### Method 3: By Amount
1. Go to Payments section
2. Sort by amount
3. Find payments matching your test order total

## What to Look For

✅ **Successful Payment:**
- Status: `succeeded`
- Amount: Matches your order total (in cents)
- Description: "Order payment - [Customer Name]"

❌ **Failed Payment:**
- Status: `requires_payment_method`, `canceled`, or `failed`
- Error message will explain why

## Test Mode Indicator

Make sure you're in **Test Mode**:
- Look for "Test mode" toggle in top right of Stripe Dashboard
- Should be **ON** (blue/green) for test payments
- Test payments have a 🧪 test mode badge

## If You Don't See Payments

### Check 1: Test Mode
- Ensure you're viewing **Test mode** data (not Live)
- Toggle in top right corner

### Check 2: Server Logs
- Check your server console/logs
- Look for `Payment processed successfully` message
- Verify `paymentIntentId` is logged

### Check 3: Payment Actually Processed
- Verify the payment went through (check order success page)
- Check if payment was simulated (test mode without keys)
- Look for errors in server logs

### Check 4: Account Permissions
- Ensure your Stripe account has proper permissions
- Check if "Charges enabled" is true (from test script)

## Quick Test

To verify payments are being created:

1. Make a test purchase on your site
2. Check server logs for: `paymentIntentId: pi_xxxxx`
3. Go to: https://dashboard.stripe.com/test/payments
4. Search for that Payment Intent ID
5. You should see the payment details

## Payment Intent ID Format

- Test mode: `pi_test_xxxxxxxxxxxxx`
- Live mode: `pi_xxxxxxxxxxxxx`

The Payment Intent ID is also stored in your database in the `orders` table (if you added that column).

