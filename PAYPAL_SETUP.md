# PayPal Setup Guide

This guide will help you set up PayPal payment processing for your application.

## Prerequisites

1. A PayPal Business account
2. Access to PayPal Developer Dashboard

## Step 1: Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal Business account
3. Navigate to **My Apps & Credentials**
4. Click **Create App**
5. Fill in:
   - **App Name**: Your application name (e.g., "My Website Payments")
   - **Merchant**: Select your business account
6. Click **Create App**

## Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID** (starts with `A...`)
- **Secret** (click "Show" to reveal)

### For Testing (Sandbox):
- Use the **Sandbox** credentials
- These are for testing only - no real money

### For Production (Live):
- Switch to **Live** mode
- Use the **Live** credentials
- These process real payments

## Step 3: Configure Environment Variables

Add these to your `.env` file:

### For Sandbox (Testing):
```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
PAYPAL_SANDBOX_MODE=true
```

### For Production (Live):
```env
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret
PAYPAL_SANDBOX_MODE=false
```

## Step 4: Test PayPal Integration

### Sandbox Test Accounts

1. Go to [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)
2. Create test accounts:
   - **Personal Account**: For testing buyer experience
   - **Business Account**: For testing seller experience

### Test Payment Flow

1. Add items to cart
2. Go to checkout
3. Select **PayPal** as payment method
4. Click the PayPal button
5. Log in with a **sandbox test account**
6. Complete the payment
7. You should be redirected to the success page

## Step 5: Go Live

When ready for production:

1. Switch to **Live** credentials in `.env`
2. Set `PAYPAL_SANDBOX_MODE=false`
3. Test with a small real transaction first
4. Monitor transactions in PayPal Dashboard

## PayPal Fees

- **Online Transactions**: 2.29% - 3.49% + $0.49 per transaction
- **International**: Additional 1.5% for cross-border transactions
- **Chargebacks**: $20 per chargeback

## Troubleshooting

### PayPal Button Not Showing
- Check that `PAYPAL_CLIENT_ID` is set correctly
- Verify the client ID is for the correct environment (sandbox/live)
- Check browser console for errors

### Payment Fails
- Ensure customer information is filled out
- Check that the order total is greater than $0
- Verify PayPal credentials are correct
- Check server logs for detailed error messages

### Sandbox Mode Issues
- Make sure you're using sandbox test accounts
- Verify `PAYPAL_SANDBOX_MODE=true` in `.env`
- Clear browser cache and cookies

## Support

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Support](https://www.paypal.com/support)
- [PayPal Developer Forums](https://developer.paypal.com/discussions/)

