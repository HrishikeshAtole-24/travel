/**
 * Razorpay Payment Gateway Integration - REST API Only (No SDK)
 * API Documentation: https://razorpay.com/docs/api/
 * 
 * Implements:
 * 1. Create Order (Payment Intent)
 * 2. Status Check
 * 3. Refund
 */

const crypto = require('crypto');
const axios = require('axios');
const IAcquirerClient = require('../../IAcquirerClient');
const logger = require('../../../../config/winstonLogger');
const { PaymentStatus } = require('../../../../core/PaymentStatusCodes');

class RazorpayNonSeamlessClient extends IAcquirerClient {
  constructor() {
    super();
    this.name = 'RAZORPAY';
    this.baseUrl = 'https://api.razorpay.com/v1';
  }

  getName() {
    return this.name;
  }

  /**
   * Get HTTP client with Basic Auth
   */
  getHttpClient(credentials) {
    const { key_id, key_secret } = credentials;
    return axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: key_id,
        password: key_secret
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 1. CREATE ORDER (Payment Intent)
   * API: POST /orders
   * Docs: https://razorpay.com/docs/api/orders/create
   * 
   * @param {object} paymentData - Payment information
   * @param {object} credentials - Razorpay key_id and key_secret
   */
  async createOrder(paymentData, credentials) {
    try {
      const {
        amount,
        currency,
        paymentReference,
        description,
        customerEmail,
        customerPhone,
        customerName,
        bookingId,
        metadata = {}
      } = paymentData;

      const httpClient = this.getHttpClient(credentials);

      // Razorpay expects amount in smallest currency unit (paise for INR)
      const amountInPaise = Math.round(amount * 100);

      const orderPayload = {
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: paymentReference,
        notes: {
          payment_reference: paymentReference,
          booking_id: bookingId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_name: customerName,
          description: description || 'Flight Booking Payment',
          ...metadata
        }
      };

      logger.info(`[Razorpay] Creating order for: ${paymentReference}`);

      const response = await httpClient.post('/orders', orderPayload);
      const order = response.data;

      logger.info(`[Razorpay] Order created successfully: ${order.id}`);

      return {
        success: true,
        acquirerOrderId: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: PaymentStatus.CREATED,
        checkoutUrl: 'https://checkout.razorpay.com/v1/checkout.js',
        checkoutData: {
          key: credentials.key_id,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          name: 'Travel Booking',
          description: description || 'Flight Booking Payment',
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone
          },
          notes: orderPayload.notes
        },
        rawResponse: order
      };
    } catch (error) {
      logger.error('[Razorpay] Order creation failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
        errorCode: error.response?.data?.error?.code || 'RAZORPAY_API_ERROR'
      };
    }
  }

  /**
   * Verify Payment Signature (after customer payment)
   * Uses HMAC SHA256 signature verification
   * 
   * @param {object} callbackData - razorpay_order_id, razorpay_payment_id, razorpay_signature
   * @param {object} credentials - Razorpay credentials
   */
  async verifyPayment(callbackData, credentials) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = callbackData;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return {
          success: false,
          verified: false,
          error: 'Missing required callback parameters'
        };
      }

      // Create signature verification string
      const signatureVerification = `${razorpay_order_id}|${razorpay_payment_id}`;
      
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', credentials.key_secret)
        .update(signatureVerification)
        .digest('hex');

      // Verify signature
      const verified = expectedSignature === razorpay_signature;

      if (!verified) {
        logger.warn(`[Razorpay] Signature verification failed for payment: ${razorpay_payment_id}`);
        return {
          success: false,
          verified: false,
          error: 'Invalid signature'
        };
      }

      // Fetch payment details to get status
      const httpClient = this.getHttpClient(credentials);
      const paymentResponse = await httpClient.get(`/payments/${razorpay_payment_id}`);
      const payment = paymentResponse.data;

      const status = this.mapRazorpayStatus(payment.status);

      logger.info(`[Razorpay] Payment verified: ${razorpay_payment_id}, Status: ${status}`);

      return {
        success: true,
        verified: true,
        status: status,
        acquirerOrderId: razorpay_order_id,
        acquirerPaymentId: razorpay_payment_id,
        acquirerTransactionId: payment.acquirer_data?.bank_transaction_id || razorpay_payment_id,
        paymentMethod: payment.method || 'card',
        paymentDetails: payment
      };
    } catch (error) {
      logger.error('[Razorpay] Payment verification failed:', error.response?.data || error.message);
      return {
        success: false,
        verified: false,
        error: error.response?.data?.error?.description || error.message
      };
    }
  }

  /**
   * 2. CHECK STATUS
   * API: GET /orders/:id & GET /orders/:id/payments
   * Docs: https://razorpay.com/docs/api/orders/fetch
   * 
   * @param {string} acquirerOrderId - Razorpay order ID
   * @param {object} credentials - Razorpay credentials
   */
  async checkStatus(acquirerOrderId, credentials) {
    try {
      const httpClient = this.getHttpClient(credentials);

      logger.info(`[Razorpay] Checking status for order: ${acquirerOrderId}`);

      // Fetch order details
      const orderResponse = await httpClient.get(`/orders/${acquirerOrderId}`);
      const order = orderResponse.data;

      // Fetch payments for this order
      const paymentsResponse = await httpClient.get(`/orders/${acquirerOrderId}/payments`);
      const payments = paymentsResponse.data;

      let status = PaymentStatus.PENDING;
      let paymentDetails = null;

      // Check if any payment exists
      if (payments.items && payments.items.length > 0) {
        // Get the latest payment
        const latestPayment = payments.items[0];
        status = this.mapRazorpayStatus(latestPayment.status);
        paymentDetails = latestPayment;

        logger.info(`[Razorpay] Status: ${status}, Payment ID: ${latestPayment.id}`);
      } else {
        // No payments yet, check order status
        if (order.status === 'paid') {
          status = PaymentStatus.SUCCESS;
        } else if (order.status === 'attempted') {
          status = PaymentStatus.PROCESSING;
        } else if (order.status === 'created') {
          status = PaymentStatus.PENDING;
        }

        logger.info(`[Razorpay] Order status: ${order.status}, Mapped to: ${status}`);
      }

      return {
        success: true,
        status: status,
        paymentDetails: {
          order: order,
          payment: paymentDetails
        }
      };
    } catch (error) {
      logger.error('[Razorpay] Status check failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
        errorCode: error.response?.data?.error?.code || 'RAZORPAY_API_ERROR'
      };
    }
  }

  /**
   * 3. PROCESS REFUND
   * API: POST /payments/:id/refund
   * Docs: https://razorpay.com/docs/api/refunds/create
   * 
   * @param {object} refundData - Contains acquirerPaymentId, amount, reason
   * @param {object} credentials - Razorpay credentials
   */
  async processRefund(refundData, credentials) {
    try {
      const { acquirerPaymentId, amount, reason, notes = {} } = refundData;
      const httpClient = this.getHttpClient(credentials);

      const refundPayload = {
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal', // Options: 'normal' or 'optimum'
        notes: {
          reason: reason,
          ...notes
        },
        receipt: `refund_${Date.now()}`
      };

      logger.info(`[Razorpay] Processing refund for payment: ${acquirerPaymentId}, Amount: ${amount}`);

      const response = await httpClient.post(
        `/payments/${acquirerPaymentId}/refund`,
        refundPayload
      );

      const refund = response.data;

      logger.info(`[Razorpay] Refund processed successfully: ${refund.id}`);

      return {
        success: true,
        refundId: refund.id,
        status: this.mapRazorpayRefundStatus(refund.status),
        refundDetails: refund
      };
    } catch (error) {
      logger.error('[Razorpay] Refund failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
        errorCode: error.response?.data?.error?.code || 'RAZORPAY_REFUND_ERROR'
      };
    }
  }

  /**
   * Handle Webhook
   * Verifies webhook signature and processes event
   * 
   * @param {object} webhookData - Webhook payload and headers
   * @param {object} credentials - Contains webhook_secret
   */
  async handleWebhook(webhookData, credentials) {
    try {
      const { body, signature } = webhookData;
      const { webhook_secret } = credentials;

      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', webhook_secret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== signature) {
        logger.warn('[Razorpay] Webhook signature verification failed');
        return {
          success: false,
          verified: false,
          error: 'Invalid webhook signature'
        };
      }

      const event = body.event;
      const payload = body.payload.payment?.entity || body.payload.refund?.entity;

      logger.info(`[Razorpay] Webhook received: ${event}`);

      let status = PaymentStatus.PROCESSING;
      let acquirerOrderId = payload.order_id;
      let acquirerPaymentId = payload.id;

      switch (event) {
        case 'payment.authorized':
          status = PaymentStatus.PROCESSING;
          break;

        case 'payment.captured':
          status = PaymentStatus.SUCCESS;
          break;

        case 'payment.failed':
          status = PaymentStatus.FAILED;
          break;

        case 'refund.created':
          status = PaymentStatus.PROCESSING;
          break;

        case 'refund.processed':
          status = PaymentStatus.REFUNDED;
          break;

        default:
          logger.warn(`[Razorpay] Unhandled webhook event: ${event}`);
      }

      return {
        success: true,
        verified: true,
        event: event,
        status: status,
        acquirerOrderId: acquirerOrderId,
        acquirerPaymentId: acquirerPaymentId,
        webhookData: body
      };
    } catch (error) {
      logger.error('[Razorpay] Webhook processing failed:', error.message);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Capture Payment (for two-step payment flow)
   * API: POST /payments/:id/capture
   * Docs: https://razorpay.com/docs/api/payments/capture
   */
  async capturePayment(paymentId, amount, credentials) {
    try {
      const httpClient = this.getHttpClient(credentials);

      const capturePayload = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR'
      };

      logger.info(`[Razorpay] Capturing payment: ${paymentId}`);

      const response = await httpClient.post(
        `/payments/${paymentId}/capture`,
        capturePayload
      );

      const payment = response.data;

      logger.info(`[Razorpay] Payment captured: ${payment.id}`);

      return {
        success: true,
        status: this.mapRazorpayStatus(payment.status),
        paymentDetails: payment
      };
    } catch (error) {
      logger.error('[Razorpay] Payment capture failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message
      };
    }
  }

  /**
   * Map Razorpay payment status to internal status
   */
  mapRazorpayStatus(razorpayStatus) {
    const statusMap = {
      'created': PaymentStatus.CREATED,
      'authorized': PaymentStatus.PROCESSING,
      'captured': PaymentStatus.SUCCESS,
      'refunded': PaymentStatus.REFUNDED,
      'failed': PaymentStatus.FAILED
    };
    return statusMap[razorpayStatus] || PaymentStatus.PROCESSING;
  }

  /**
   * Map Razorpay refund status to internal status
   */
  mapRazorpayRefundStatus(refundStatus) {
    const statusMap = {
      'pending': PaymentStatus.PROCESSING,
      'processed': PaymentStatus.REFUNDED,
      'failed': PaymentStatus.FAILED
    };
    return statusMap[refundStatus] || PaymentStatus.PROCESSING;
  }
}

module.exports = RazorpayNonSeamlessClient;
