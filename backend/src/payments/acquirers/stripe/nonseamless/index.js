/**
 * Stripe Payment Gateway Integration - REST API Only (No SDK)
 * API Documentation: https://docs.stripe.com/api
 * 
 * Implements:
 * 1. Create Payment Intent (Order)
 * 2. Status Check
 * 3. Refund
 */

const crypto = require('crypto');
const axios = require('axios');
const IAcquirerClient = require('../../IAcquirerClient');
const logger = require('../../../../config/winstonLogger');
const { PaymentStatus } = require('../../../../core/PaymentStatusCodes');

class StripeNonSeamlessClient extends IAcquirerClient {
  constructor() {
    super();
    this.name = 'STRIPE';
    this.baseUrl = 'https://api.stripe.com/v1';
  }

  getName() {
    return this.name;
  }

  /**
   * Get HTTP client with Bearer token auth
   */
  getHttpClient(credentials) {
    const { secret_key } = credentials;
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * Convert object to URL-encoded form data (Stripe requirement)
   * Stripe API requires application/x-www-form-urlencoded format
   */
  objectToFormData(obj, prefix = '') {
    const formData = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null) {
        const value = obj[key];
        const formKey = prefix ? `${prefix}[${key}]` : key;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          formData.push(this.objectToFormData(value, formKey));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              formData.push(this.objectToFormData(item, `${formKey}[${index}]`));
            } else {
              formData.push(`${formKey}[]=${encodeURIComponent(item)}`);
            }
          });
        } else {
          formData.push(`${formKey}=${encodeURIComponent(value)}`);
        }
      }
    }
    
    return formData.join('&');
  }

  /**
   * 1. CREATE PAYMENT INTENT (Order)
   * API: POST /v1/payment_intents
   * Docs: https://docs.stripe.com/api/payment_intents/create
   * 
   * @param {object} paymentData - Payment information
   * @param {object} credentials - Stripe secret_key and publishable_key
   */
  async createOrder(paymentData, credentials) {
    try {
      const {
        amount,
        currency,
        paymentReference,
        description,
        customerEmail,
        customerName,
        customerPhone,
        successUrl,
        failureUrl,
        bookingId,
        metadata = {}
      } = paymentData;

      const httpClient = this.getHttpClient(credentials);

      // Stripe expects amount in smallest currency unit (cents/paise)
      const amountInSmallestUnit = Math.round(amount * 100);

      logger.info(`[Stripe] Creating payment intent for: ${paymentReference}`);

      // Step 1: Create Payment Intent
      const intentPayload = {
        amount: amountInSmallestUnit,
        currency: (currency || 'inr').toLowerCase(),
        description: description || 'Flight Booking Payment',
        receipt_email: customerEmail,
        'metadata[payment_reference]': paymentReference,
        'metadata[booking_id]': bookingId,
        'metadata[customer_name]': customerName,
        'metadata[customer_phone]': customerPhone,
        ...Object.keys(metadata).reduce((acc, key) => {
          acc[`metadata[${key}]`] = metadata[key];
          return acc;
        }, {}),
        'automatic_payment_methods[enabled]': 'true'
      };

      const intentResponse = await httpClient.post(
        '/payment_intents',
        this.objectToFormData(intentPayload)
      );

      const paymentIntent = intentResponse.data;

      logger.info(`[Stripe] Payment intent created: ${paymentIntent.id}`);

      // Step 2: Create Checkout Session
      const sessionPayload = {
        mode: 'payment',
        'payment_intent_data[metadata][payment_reference]': paymentReference,
        'line_items[0][price_data][currency]': (currency || 'inr').toLowerCase(),
        'line_items[0][price_data][product_data][name]': 'Flight Booking',
        'line_items[0][price_data][product_data][description]': description || 'Flight Booking Payment',
        'line_items[0][price_data][unit_amount]': amountInSmallestUnit,
        'line_items[0][quantity]': 1,
        customer_email: customerEmail,
        client_reference_id: paymentReference,
        success_url: successUrl || `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: failureUrl || `${process.env.APP_URL}/payment/failure`,
        'metadata[payment_reference]': paymentReference,
        'metadata[booking_id]': bookingId,
        'metadata[customer_name]': customerName
      };

      const sessionResponse = await httpClient.post(
        '/checkout/sessions',
        this.objectToFormData(sessionPayload)
      );

      const session = sessionResponse.data;

      logger.info(`[Stripe] Checkout session created: ${session.id}`);

      return {
        success: true,
        acquirerOrderId: session.id,
        paymentIntentId: paymentIntent.id,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        status: PaymentStatus.CREATED,
        checkoutUrl: session.url,
        checkoutData: {
          sessionId: session.id,
          publishableKey: credentials.publishable_key,
          clientSecret: paymentIntent.client_secret
        },
        rawResponse: {
          session: session,
          paymentIntent: paymentIntent
        }
      };
    } catch (error) {
      logger.error('[Stripe] Payment intent creation failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code || 'STRIPE_API_ERROR'
      };
    }
  }

  /**
   * Verify Payment
   * Retrieves session or payment intent to verify payment status
   * 
   * @param {object} callbackData - Contains session_id or payment_intent_id
   * @param {object} credentials - Stripe credentials
   */
  async verifyPayment(callbackData, credentials) {
    try {
      const { session_id, payment_intent_id } = callbackData;
      const httpClient = this.getHttpClient(credentials);

      let paymentIntent;
      let sessionId = session_id;

      if (session_id) {
        // Retrieve checkout session
        const sessionResponse = await httpClient.get(`/checkout/sessions/${session_id}`);
        const session = sessionResponse.data;

        sessionId = session.id;

        // Get payment intent from session
        if (session.payment_intent) {
          const intentResponse = await httpClient.get(`/payment_intents/${session.payment_intent}`);
          paymentIntent = intentResponse.data;
        }
      } else if (payment_intent_id) {
        // Directly retrieve payment intent
        const intentResponse = await httpClient.get(`/payment_intents/${payment_intent_id}`);
        paymentIntent = intentResponse.data;
      } else {
        return {
          success: false,
          verified: false,
          error: 'Missing session_id or payment_intent_id'
        };
      }

      if (!paymentIntent) {
        return {
          success: false,
          verified: false,
          error: 'Payment intent not found'
        };
      }

      const status = this.mapStripeIntentStatus(paymentIntent.status);
      const verified = paymentIntent.status === 'succeeded';

      logger.info(`[Stripe] Payment verified: ${paymentIntent.id}, Status: ${status}`);

      return {
        success: true,
        verified: verified,
        status: status,
        acquirerOrderId: sessionId,
        acquirerPaymentId: paymentIntent.id,
        acquirerTransactionId: paymentIntent.charges?.data?.[0]?.id,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        paymentDetails: paymentIntent
      };
    } catch (error) {
      logger.error('[Stripe] Payment verification failed:', error.response?.data || error.message);
      return {
        success: false,
        verified: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 2. CHECK STATUS
   * API: GET /v1/payment_intents/:id OR GET /v1/checkout/sessions/:id
   * Docs: https://docs.stripe.com/api/payment_intents/retrieve
   * 
   * @param {string} acquirerOrderId - Session ID (cs_*) or Payment Intent ID (pi_*)
   * @param {object} credentials - Stripe credentials
   */
  async checkStatus(acquirerOrderId, credentials) {
    try {
      const httpClient = this.getHttpClient(credentials);

      logger.info(`[Stripe] Checking status for: ${acquirerOrderId}`);

      let paymentIntent;
      let sessionStatus;

      // Check if it's a session ID (cs_) or payment intent ID (pi_)
      if (acquirerOrderId.startsWith('cs_')) {
        // It's a checkout session
        const sessionResponse = await httpClient.get(`/checkout/sessions/${acquirerOrderId}`);
        const session = sessionResponse.data;

        sessionStatus = session.payment_status;

        if (session.payment_intent) {
          const intentResponse = await httpClient.get(`/payment_intents/${session.payment_intent}`);
          paymentIntent = intentResponse.data;
        } else {
          // No payment intent yet, return session status
          const status = this.mapStripeSessionStatus(sessionStatus);
          logger.info(`[Stripe] Session status: ${sessionStatus}, Mapped to: ${status}`);

          return {
            success: true,
            status: status,
            paymentDetails: session
          };
        }
      } else if (acquirerOrderId.startsWith('pi_')) {
        // It's a payment intent
        const intentResponse = await httpClient.get(`/payment_intents/${acquirerOrderId}`);
        paymentIntent = intentResponse.data;
      } else {
        return {
          success: false,
          error: 'Invalid acquirer order ID format'
        };
      }

      const status = this.mapStripeIntentStatus(paymentIntent.status);

      logger.info(`[Stripe] Payment intent status: ${paymentIntent.status}, Mapped to: ${status}`);

      return {
        success: true,
        status: status,
        paymentDetails: paymentIntent
      };
    } catch (error) {
      logger.error('[Stripe] Status check failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code || 'STRIPE_API_ERROR'
      };
    }
  }

  /**
   * 3. PROCESS REFUND
   * API: POST /v1/refunds
   * Docs: https://docs.stripe.com/api/refunds/create
   * 
   * @param {object} refundData - Contains acquirerPaymentId (payment intent or charge ID), amount
   * @param {object} credentials - Stripe credentials
   */
  async processRefund(refundData, credentials) {
    try {
      const { acquirerPaymentId, amount, reason, notes = {} } = refundData;
      const httpClient = this.getHttpClient(credentials);

      logger.info(`[Stripe] Processing refund for: ${acquirerPaymentId}, Amount: ${amount}`);

      // Prepare refund payload
      const refundPayload = {
        amount: Math.round(amount * 100), // Convert to smallest unit
        reason: reason || 'requested_by_customer'
      };

      // Add metadata
      Object.keys(notes).forEach(key => {
        refundPayload[`metadata[${key}]`] = notes[key];
      });

      // Determine if it's a payment intent or charge ID
      if (acquirerPaymentId.startsWith('pi_')) {
        refundPayload.payment_intent = acquirerPaymentId;
      } else if (acquirerPaymentId.startsWith('ch_')) {
        refundPayload.charge = acquirerPaymentId;
      } else {
        // Try to fetch payment intent and get charge
        const intentResponse = await httpClient.get(`/payment_intents/${acquirerPaymentId}`);
        const chargeId = intentResponse.data.charges?.data?.[0]?.id;
        
        if (chargeId) {
          refundPayload.charge = chargeId;
        } else {
          throw new Error('Could not find charge ID for refund');
        }
      }

      const response = await httpClient.post(
        '/refunds',
        this.objectToFormData(refundPayload)
      );

      const refund = response.data;

      logger.info(`[Stripe] Refund processed successfully: ${refund.id}`);

      return {
        success: true,
        refundId: refund.id,
        status: this.mapStripeRefundStatus(refund.status),
        refundDetails: refund
      };
    } catch (error) {
      logger.error('[Stripe] Refund failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code || 'STRIPE_REFUND_ERROR'
      };
    }
  }

  /**
   * Handle Stripe Webhook
   * Verifies webhook signature and processes event
   * Docs: https://docs.stripe.com/webhooks/signatures
   * 
   * @param {object} webhookData - Contains rawBody and signature header
   * @param {object} credentials - Contains webhook_secret
   */
  async handleWebhook(webhookData, credentials) {
    try {
      const { rawBody, signature } = webhookData;
      const { webhook_secret } = credentials;

      if (!signature) {
        throw new Error('No Stripe signature found in webhook');
      }

      // Parse signature header: "t=timestamp,v1=signature"
      const signatures = signature.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});

      const timestamp = signatures.t;
      const expectedSignature = signatures.v1;

      // Create signed payload: "timestamp.payload"
      const signedPayload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;

      // Compute signature using HMAC SHA256
      const computedSignature = crypto
        .createHmac('sha256', webhook_secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Verify signature
      if (computedSignature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      // Parse event
      const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

      logger.info(`[Stripe] Webhook received: ${event.type}`);

      let status = PaymentStatus.PROCESSING;
      let acquirerOrderId = null;
      let acquirerPaymentId = null;

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          acquirerOrderId = session.id;
          acquirerPaymentId = session.payment_intent;
          status = session.payment_status === 'paid' ? PaymentStatus.SUCCESS : PaymentStatus.PROCESSING;
          break;

        case 'payment_intent.succeeded':
          const intent = event.data.object;
          acquirerPaymentId = intent.id;
          status = PaymentStatus.SUCCESS;
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object;
          acquirerPaymentId = failedIntent.id;
          status = PaymentStatus.FAILED;
          break;

        case 'charge.refunded':
          const charge = event.data.object;
          acquirerPaymentId = charge.payment_intent;
          status = charge.refunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND;
          break;

        default:
          logger.warn(`[Stripe] Unhandled webhook event: ${event.type}`);
      }

      return {
        success: true,
        verified: true,
        event: event.type,
        status: status,
        acquirerOrderId: acquirerOrderId,
        acquirerPaymentId: acquirerPaymentId,
        webhookData: event
      };
    } catch (error) {
      logger.error('[Stripe] Webhook verification failed:', error.message);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Capture Payment Intent (for manual capture mode)
   * API: POST /v1/payment_intents/:id/capture
   * Docs: https://docs.stripe.com/api/payment_intents/capture
   */
  async capturePayment(paymentIntentId, credentials) {
    try {
      const httpClient = this.getHttpClient(credentials);

      logger.info(`[Stripe] Capturing payment intent: ${paymentIntentId}`);

      const response = await httpClient.post(
        `/payment_intents/${paymentIntentId}/capture`,
        ''
      );

      const paymentIntent = response.data;

      logger.info(`[Stripe] Payment intent captured: ${paymentIntent.id}`);

      return {
        success: true,
        status: this.mapStripeIntentStatus(paymentIntent.status),
        paymentDetails: paymentIntent
      };
    } catch (error) {
      logger.error('[Stripe] Capture failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Map Stripe session status to internal status
   */
  mapStripeSessionStatus(sessionStatus) {
    const statusMap = {
      'paid': PaymentStatus.SUCCESS,
      'unpaid': PaymentStatus.PENDING,
      'no_payment_required': PaymentStatus.SUCCESS
    };
    return statusMap[sessionStatus] || PaymentStatus.PROCESSING;
  }

  /**
   * Map Stripe payment intent status to internal status
   */
  mapStripeIntentStatus(intentStatus) {
    const statusMap = {
      'requires_payment_method': PaymentStatus.PENDING,
      'requires_confirmation': PaymentStatus.PENDING,
      'requires_action': PaymentStatus.PROCESSING,
      'processing': PaymentStatus.PROCESSING,
      'requires_capture': PaymentStatus.PROCESSING,
      'canceled': PaymentStatus.CANCELLED,
      'succeeded': PaymentStatus.SUCCESS
    };
    return statusMap[intentStatus] || PaymentStatus.FAILED;
  }

  /**
   * Map Stripe refund status to internal status
   */
  mapStripeRefundStatus(refundStatus) {
    const statusMap = {
      'pending': PaymentStatus.PROCESSING,
      'succeeded': PaymentStatus.REFUNDED,
      'failed': PaymentStatus.FAILED,
      'canceled': PaymentStatus.CANCELLED
    };
    return statusMap[refundStatus] || PaymentStatus.PROCESSING;
  }
}

module.exports = StripeNonSeamlessClient;
