# Stripe Payment Integration Setup

## Test Mode (Recommended for Development)

Stripe has excellent test mode features that allow you to test payments without using real credit cards.

### Getting Stripe Test Keys

1. Go to https://stripe.com and create an account (free)
2. Navigate to the **Developers** section → **API keys**
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Setting Up Environment Variables

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
STRIPE_TEST_MODE=true
```

### Test Card Numbers

Stripe provides test card numbers that work in test mode:

**Success Cards:**
- `4242 4242 4242 4242` - Visa (always succeeds)
- `5555 5555 5555 4444` - Mastercard (always succeeds)
- `3782 822463 10005` - American Express (always succeeds)

**Decline Cards:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 0069` - Expired card
- `4000 0000 0000 0127` - Incorrect CVC

**Test Details:**
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)
- Use any name

### Production Mode

When ready for production:

1. Get your **live** API keys from Stripe Dashboard
2. Update `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
   STRIPE_TEST_MODE=false
   ```

### Enabling Card Data Collection (Required for Current Implementation)

⚠️ **Important**: The current implementation sends card details directly to Stripe's API. You need to enable this feature:

1. Go to: https://dashboard.stripe.com/test/settings/integration
   - Or: Dashboard → **Settings** → **Integration**
2. Look for: **"Enable card data collection with a publishable key without using Stripe's pre-built UI elements"**
3. Toggle this setting to **ON**
4. This allows you to test with raw card numbers (like `4242 4242 4242 4242`)

**If you don't see this option:**
- Your account may need additional permissions
- Contact Stripe Support to request access
- You may need to provide PCI DSS compliance documentation

**Alternative**: Use Stripe test tokens instead of raw card numbers (requires implementing Stripe Elements).

### Important Security Notes

⚠️ **Current Implementation**: The checkout form sends card details directly to the server. For production, consider using Stripe Elements (client-side) for better security and PCI compliance.

### Testing

1. Start the server: `npm start`
2. Add products to cart
3. Go to checkout
4. Use test card numbers above
5. Complete the order
6. Check server logs for payment processing details

