/**
 * Quick script to test Stripe payment and see exact error
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testPayment() {
  try {
    console.log('Testing Stripe payment with test card...\n');
    
    // Try to create a payment method with test card
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242 4242 4242 4242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123',
      },
    });
    
    console.log('✅ Payment method created successfully!');
    console.log('Payment Method ID:', paymentMethod.id);
    
    // Try to create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      payment_method: paymentMethod.id,
      confirm: true,
    });
    
    console.log('✅ Payment intent created and confirmed!');
    console.log('Payment Intent ID:', paymentIntent.id);
    console.log('Status:', paymentIntent.status);
    
  } catch (error) {
    console.error('\n❌ ERROR DETAILS:');
    console.error('Type:', error.type);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('\nFull error:', JSON.stringify(error, null, 2));
    
    if (error.message?.includes('raw card data') || error.message?.includes('test tokens')) {
      console.error('\n⚠️  This error suggests you need to enable raw card data APIs.');
      console.error('Go to: https://dashboard.stripe.com/test/settings/integration');
      console.error('Look for: "Enable card data collection with a publishable key..."');
    }
  }
}

testPayment();

