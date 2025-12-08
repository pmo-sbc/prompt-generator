/**
 * Payment Service
 * Handles payment processing via Stripe and PayPal
 */

const stripe = require('stripe');
const paypal = require('@paypal/paypal-server-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    // Initialize Stripe with secret key (use test key if in test mode)
    if (config.stripe.secretKey) {
      this.stripe = stripe(config.stripe.secretKey);
      this.stripeTestMode = config.stripe.secretKey.startsWith('sk_test_');
      logger.info('Stripe payment service initialized', {
        testMode: this.stripeTestMode,
        hasKey: !!config.stripe.secretKey
      });
    } else {
      this.stripe = null;
      this.stripeTestMode = true;
      logger.warn('Stripe secret key not configured - Stripe payment processing disabled');
    }

    // Initialize PayPal
    if (config.paypal.clientId && config.paypal.clientSecret) {
      this.paypalEnvironment = config.paypal.environment === 'live'
        ? paypal.core.LiveEnvironment
        : paypal.core.SandboxEnvironment;
      
      this.paypalClient = new paypal.core.PayPalHttpClient(
        new this.paypalEnvironment(config.paypal.clientId, config.paypal.clientSecret)
      );
      this.paypalSandboxMode = config.paypal.environment === 'sandbox';
      
      logger.info('PayPal payment service initialized', {
        sandboxMode: this.paypalSandboxMode,
        hasKeys: !!(config.paypal.clientId && config.paypal.clientSecret)
      });
    } else {
      this.paypalClient = null;
      this.paypalSandboxMode = true;
      logger.warn('PayPal credentials not configured - PayPal payment processing disabled');
    }
  }

  /**
   * Process a payment using Stripe
   * @param {Object} paymentData - Payment information
   * @param {number} amount - Amount in dollars
   * @param {string} currency - Currency code (default: 'usd')
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData, amount, currency = 'usd') {
    if (!this.stripe) {
      // In test mode without Stripe key, simulate successful payment for testing
      if (config.stripe.testMode) {
        logger.warn('Stripe not configured - simulating payment in test mode', {
          amount,
          testMode: true
        });
        return {
          success: true,
          paymentIntentId: 'test_pi_' + Date.now(),
          amount: Math.round(amount * 100),
          currency,
          status: 'succeeded',
          testMode: true
        };
      }
      return {
        success: false,
        error: 'Payment processing is not configured. Please contact support.'
      };
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    try {
      // Check if payment method ID is provided (from Stripe Elements)
      let paymentMethodId = paymentData.paymentMethodId;
      
      if (!paymentMethodId) {
        // Fallback to raw card data (for backwards compatibility, but not recommended)
        // This requires raw card data APIs to be enabled
        logger.warn('No payment method ID provided, attempting to use raw card data (not recommended)');
        
        const expiryParts = paymentData.expiryDate?.split('/');
        if (!expiryParts || expiryParts.length !== 2) {
          return {
            success: false,
            error: 'Invalid expiry date format. Please use MM/YY format.'
          };
        }

        const expMonth = parseInt(expiryParts[0], 10);
        const expYear = parseInt('20' + expiryParts[1], 10);
        
        if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
          return {
            success: false,
            error: 'Invalid expiry month. Please use MM/YY format (e.g., 12/25).'
          };
        }
        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          return {
            success: false,
            error: 'Card has expired. Please use a future expiry date.'
          };
        }
        
        const cardNumber = paymentData.cardNumber?.replace(/\s+/g, '');
        if (!cardNumber || cardNumber.length < 13) {
          return {
            success: false,
            error: 'Invalid card number. Please check your card details.'
          };
        }

        // Create payment method from raw card data
        const paymentMethod = await this.stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: expMonth,
            exp_year: expYear,
            cvc: paymentData.cvv
          },
          billing_details: {
            name: paymentData.cardName
          }
        });
        
        paymentMethodId = paymentMethod.id;
      }

      // Create and confirm a PaymentIntent using the payment method
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency,
        payment_method: paymentMethodId,
        confirm: true,
        description: `Order payment - ${paymentData.cardName || 'Customer'}`,
        metadata: {
          payment_method: paymentData.method || 'card'
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' // Prevent redirect-based payment methods (like 3D Secure redirects)
        }
      });

      if (paymentIntent.status === 'succeeded') {
        logger.info('Payment processed successfully', {
          paymentIntentId: paymentIntent.id,
          amount: amountInCents,
          currency,
          testMode: this.stripeTestMode
        });

        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: amountInCents,
          currency,
          status: paymentIntent.status
        };
      } else {
        logger.warn('Payment not succeeded', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        });

        return {
          success: false,
          error: `Payment status: ${paymentIntent.status}`,
          paymentIntentId: paymentIntent.id
        };
      }
    } catch (error) {
      logger.error('Error processing payment', {
        error: error.message,
        type: error.type,
        code: error.code,
        testMode: this.stripeTestMode,
        rawError: error.raw ? error.raw.message : null,
        details: error.raw || null
      });

      // Return user-friendly error messages
      let errorMessage = 'Payment processing failed. Please try again.';
      
      if (error.type === 'StripeCardError') {
        errorMessage = error.message || 'Your card was declined. Please check your card details.';
      } else if (error.type === 'StripeRateLimitError') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.type === 'StripeInvalidRequestError') {
        // Check for specific error codes
        if (error.code === 'parameter_invalid_empty' || error.message?.includes('card')) {
          errorMessage = 'Invalid card information. Please check your card number, expiry date, and CVV.';
        } else if (error.message?.includes('exp_month') || error.message?.includes('exp_year')) {
          errorMessage = 'Invalid expiry date. Please use MM/YY format (e.g., 12/25) with a future date.';
        } else if (error.message?.includes('raw card data') || error.message?.includes('test tokens')) {
          errorMessage = 'Card processing requires account configuration. Please contact support or use Stripe test tokens.';
        } else {
          errorMessage = error.message || 'Invalid payment information. Please check your card details.';
        }
      } else if (error.type === 'StripeAPIError') {
        errorMessage = 'Payment service error. Please try again later.';
      } else if (error.type === 'StripeConnectionError') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.type === 'StripeAuthenticationError') {
        errorMessage = 'Payment service authentication error. Please contact support.';
      }

      return {
        success: false,
        error: errorMessage,
        stripeError: error.message,
        stripeCode: error.code,
        stripeType: error.type
      };
    }
  }

  /**
   * Process PayPal payment
   * @param {Object} paymentData - Payment information (should contain orderId from PayPal)
   * @param {number} amount - Amount in dollars
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {Promise<Object>} Payment result
   */
  async processPayPalPayment(paymentData, amount, currency = 'USD') {
    if (!this.paypalClient) {
      // In test mode without PayPal credentials, simulate successful payment
      if (config.paypal.sandboxMode) {
        logger.warn('PayPal not configured - simulating payment in sandbox mode', {
          amount,
          sandboxMode: true
        });
        return {
          success: true,
          orderId: 'test_paypal_' + Date.now(),
          amount: Math.round(amount * 100),
          currency,
          status: 'COMPLETED',
          testMode: true
        };
      }
      return {
        success: false,
        error: 'PayPal payment processing is not configured. Please contact support.'
      };
    }

    // PayPal order ID should be provided from the frontend after PayPal approval
    const paypalOrderId = paymentData.orderId || paymentData.paypalOrderId;

    if (!paypalOrderId) {
      return {
        success: false,
        error: 'PayPal order ID is required. Please complete PayPal checkout first.'
      };
    }

    try {
      // Capture the PayPal order
      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.requestBody({});

      const capture = await this.paypalClient.execute(request);

      if (capture.result && capture.result.status === 'COMPLETED') {
        const captureId = capture.result.id;
        const capturedAmount = capture.result.purchase_units[0]?.payments?.captures?.[0];

        logger.info('PayPal payment processed successfully', {
          orderId: paypalOrderId,
          captureId,
          amount: capturedAmount?.amount?.value,
          currency: capturedAmount?.amount?.currency_code,
          sandboxMode: this.paypalSandboxMode
        });

        return {
          success: true,
          orderId: paypalOrderId,
          captureId,
          amount: Math.round(parseFloat(capturedAmount?.amount?.value || amount) * 100),
          currency: capturedAmount?.amount?.currency_code || currency,
          status: 'COMPLETED'
        };
      } else {
        logger.warn('PayPal payment not completed', {
          orderId: paypalOrderId,
          status: capture.result?.status
        });

        return {
          success: false,
          error: `PayPal payment status: ${capture.result?.status || 'unknown'}`,
          orderId: paypalOrderId
        };
      }
    } catch (error) {
      logger.error('Error processing PayPal payment', {
        error: error.message,
        orderId: paypalOrderId,
        sandboxMode: this.paypalSandboxMode
      });

      let errorMessage = 'PayPal payment processing failed. Please try again.';
      
      if (error.statusCode === 422) {
        errorMessage = 'This PayPal order has already been processed or is invalid.';
      } else if (error.statusCode === 404) {
        errorMessage = 'PayPal order not found. Please try again.';
      }

      return {
        success: false,
        error: errorMessage,
        paypalError: error.message
      };
    }
  }

  /**
   * Create a PayPal order (for frontend integration)
   * @param {number} amount - Amount in dollars
   * @param {string} currency - Currency code (default: 'USD')
   * @returns {Promise<Object>} PayPal order creation result
   */
  async createPayPalOrder(amount, currency = 'USD') {
    if (!this.paypalClient) {
      return {
        success: false,
        error: 'PayPal is not configured'
      };
    }

    const amountInCents = Math.round(amount * 100);
    const amountString = (amountInCents / 100).toFixed(2);

    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amountString
          }
        }]
      });

      const order = await this.paypalClient.execute(request);

      if (order.result && order.result.id) {
        logger.info('PayPal order created', {
          orderId: order.result.id,
          amount: amountString,
          currency,
          sandboxMode: this.paypalSandboxMode
        });

        return {
          success: true,
          orderId: order.result.id,
          // Return the approval URL for redirect (if using redirect flow)
          // For client-side SDK, the frontend will handle the approval
        };
      } else {
        return {
          success: false,
          error: 'Failed to create PayPal order'
        };
      }
    } catch (error) {
      logger.error('Error creating PayPal order', {
        error: error.message,
        sandboxMode: this.paypalSandboxMode
      });

      return {
        success: false,
        error: 'Failed to create PayPal order. Please try again.'
      };
    }
  }

  /**
   * Get test card numbers for testing (Stripe test mode)
   * @returns {Object} Test card information
   */
  getTestCards() {
    return {
      success: {
        number: '4242 4242 4242 4242',
        description: 'Visa - Always succeeds'
      },
      decline: {
        number: '4000 0000 0000 0002',
        description: 'Visa - Always declined'
      },
      insufficientFunds: {
        number: '4000 0000 0000 9995',
        description: 'Visa - Insufficient funds'
      },
      expiredCard: {
        number: '4000 0000 0000 0069',
        description: 'Visa - Expired card'
      },
      incorrectCvc: {
        number: '4000 0000 0000 0127',
        description: 'Visa - Incorrect CVC'
      },
      processingError: {
        number: '4000 0000 0000 0119',
        description: 'Visa - Processing error'
      }
    };
  }
}

module.exports = new PaymentService();

