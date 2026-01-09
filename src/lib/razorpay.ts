/**
 * Razorpay Payment Integration Utilities
 * 
 * This file contains helper functions for Razorpay integration.
 * You need to implement the corresponding backend API endpoints.
 */

interface CreateOrderPayload {
  amount: number; // Amount in paise (e.g., 99900 for Rs. 999)
  amcFormId: string;
  userId: string;
  email: string;
  phone?: string;
}

interface VerifyPaymentPayload {
  orderId: string;
  paymentId: string;
  signature: string;
  amcFormId: string;
}

/**
 * Create a Razorpay order
 * 
 * Backend should implement POST /api/razorpay/create-order
 * This endpoint should:
 * 1. Create an order using Razorpay API
 * 2. Store order details in database
 * 3. Return order ID and other details
 */
export async function createRazorpayOrder(payload: CreateOrderPayload) {
  const response = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create order');
  }

  return response.json();
}

/**
 * Verify Razorpay payment signature
 * 
 * Backend should implement POST /api/razorpay/verify-payment
 * This endpoint should:
 * 1. Verify the payment signature using Razorpay API
 * 2. Mark the payment as verified in database
 * 3. Update AMC response status
 * 4. Generate invoice if payment is successful
 */
export async function verifyRazorpayPayment(payload: VerifyPaymentPayload) {
  const response = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Payment verification failed');
  }

  return response.json();
}

/**
 * Get payment status
 * 
 * Backend should implement GET /api/razorpay/payment-status/:paymentId
 */
export async function getPaymentStatus(paymentId: string) {
  const response = await fetch(`/api/razorpay/payment-status/${paymentId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment status');
  }

  return response.json();
}

/**
 * Refund a payment
 * 
 * Backend should implement POST /api/razorpay/refund
 */
export async function refundPayment(paymentId: string, amount?: number) {
  const response = await fetch('/api/razorpay/refund', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentId, amount }),
  });

  if (!response.ok) {
    throw new Error('Failed to refund payment');
  }

  return response.json();
}
