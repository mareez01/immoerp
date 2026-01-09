import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

/**
 * Razorpay Webhook Handler
 * 
 * This edge function handles Razorpay webhook events for payment verification.
 * It's the SINGLE SOURCE OF TRUTH for payment status - never trust client-side callbacks.
 * 
 * Webhook Events Handled:
 * - payment.captured: Payment was successful
 * - payment.failed: Payment failed
 * - order.paid: Order was fully paid
 * 
 * Testing locally:
 * 1. Use Razorpay Test Mode with test API keys
 * 2. Use ngrok to expose local Supabase: `ngrok http 54321`
 * 3. Set webhook URL in Razorpay Dashboard: https://<ngrok-url>/functions/v1/razorpay-webhook
 * 4. Or use Razorpay CLI: `razorpay webhook trigger payment.captured`
 * 
 * Production:
 * 1. Deploy function: `supabase functions deploy razorpay-webhook`
 * 2. Set webhook URL: https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
 * 3. Ensure RAZORPAY_WEBHOOK_SECRET is set in Supabase secrets
 */

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// AMC Configuration
const AMC_PRICE_PER_SYSTEM = 999;
const AMC_VALIDITY_DAYS = 365;

// Verify Razorpay webhook signature
async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);

  const expectedSignature = Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signature;
}

// Generate unique invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `INV-${dateStr}-${random}`;
}

// Calculate subscription dates
function calculateSubscriptionDates(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + AMC_VALIDITY_DAYS);

  return {
    start: now.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  created_at: number;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity;
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate environment
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("Missing webhook signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(
      rawBody,
      signature,
      RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Webhook signature verified successfully");

    // Parse payload
    const payload: RazorpayWebhookPayload = JSON.parse(rawBody);
    const { event } = payload;

    console.log(`Processing webhook event: ${event}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle different event types
    switch (event) {
      case "payment.captured": {
        const payment = payload.payload.payment?.entity;
        if (!payment) {
          console.error("No payment entity in payload");
          break;
        }

        const razorpay_order_id = payment.order_id;
        const razorpay_payment_id = payment.id;
        const amountInRupees = payment.amount / 100; // Razorpay sends amount in paise

        console.log(`Payment captured: ${razorpay_payment_id} for order ${razorpay_order_id}`);

        // IDEMPOTENCY: Check if already processed
        const { data: existingPayment } = await supabase
          .from("amc_payments")
          .select("id, status")
          .eq("razorpay_payment_id", razorpay_payment_id)
          .single();

        if (existingPayment && existingPayment.status === "captured") {
          console.log(`Payment ${razorpay_payment_id} already processed`);
          return new Response(
            JSON.stringify({ status: "already_processed" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Fetch payment record to get amc_form_id
        const { data: paymentRecord, error: fetchError } = await supabase
          .from("amc_payments")
          .select("*")
          .eq("razorpay_order_id", razorpay_order_id)
          .single();

        if (fetchError || !paymentRecord) {
          console.error("Payment record not found:", fetchError);
          // Still return 200 to prevent Razorpay retries for unknown orders
          return new Response(
            JSON.stringify({ status: "order_not_found" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        const amc_form_id = paymentRecord.amc_form_id;

        // Validate amount
        if (amountInRupees !== paymentRecord.amount) {
          console.error(`Amount mismatch: expected ${paymentRecord.amount}, got ${amountInRupees}`);
          await logAudit(supabase, amc_form_id, razorpay_payment_id, razorpay_order_id, amountInRupees, "amount_mismatch", {
            expected: paymentRecord.amount,
            received: amountInRupees,
          });
        }

        // Calculate subscription dates
        const subscriptionDates = calculateSubscriptionDates();

        // 1. Update payment record
        await supabase
          .from("amc_payments")
          .update({
            razorpay_payment_id,
            status: "captured",
            verified_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", razorpay_order_id);

        // 2. Update AMC form - activate subscription
        await supabase
          .from("amc_responses")
          .update({
            payment_status: "Paid",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            amount: amountInRupees.toString(),
            status: "active",
            subscription_start_date: subscriptionDates.start,
            subscription_end_date: subscriptionDates.end,
            updated_at: new Date().toISOString(),
          })
          .eq("amc_form_id", amc_form_id);

        // 3. Generate invoice
        const invoiceNumber = generateInvoiceNumber();
        await supabase.from("invoices").insert({
          amc_order_id: amc_form_id,
          invoice_number: invoiceNumber,
          amount: amountInRupees,
          status: "paid",
          validity_start: subscriptionDates.start,
          validity_end: subscriptionDates.end,
          due_date: new Date().toISOString().slice(0, 10),
          paid_at: new Date().toISOString(),
        });

        // 4. Log audit trail
        await logAudit(supabase, amc_form_id, razorpay_payment_id, razorpay_order_id, amountInRupees, "payment_captured", {
          invoice_number: invoiceNumber,
          subscription_start: subscriptionDates.start,
          subscription_end: subscriptionDates.end,
          webhook_event: event,
        });

        console.log(`Payment processed: AMC ${amc_form_id} activated until ${subscriptionDates.end}`);
        break;
      }

      case "payment.failed": {
        const payment = payload.payload.payment?.entity;
        if (!payment) break;

        console.log(`Payment failed: ${payment.id} for order ${payment.order_id}`);

        // Update payment record
        await supabase
          .from("amc_payments")
          .update({
            razorpay_payment_id: payment.id,
            status: "failed",
            verified_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", payment.order_id);

        // Log audit
        const { data: paymentRecord } = await supabase
          .from("amc_payments")
          .select("amc_form_id")
          .eq("razorpay_order_id", payment.order_id)
          .single();

        if (paymentRecord) {
          await logAudit(
            supabase,
            paymentRecord.amc_form_id,
            payment.id,
            payment.order_id,
            payment.amount / 100,
            "payment_failed",
            { webhook_event: event }
          );
        }
        break;
      }

      case "order.paid": {
        // Order is fully paid - this is a confirmation event
        const order = payload.payload.order?.entity;
        if (!order) break;

        console.log(`Order paid confirmation: ${order.id}`);
        // We already handle this in payment.captured, this is just confirmation
        break;
      }

      default:
        console.log(`Unhandled event type: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ status: "received", event }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return 200 even on error to prevent Razorpay retries
    // Log the error for debugging
    return new Response(
      JSON.stringify({ status: "error", message: "Internal error logged" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Helper function for audit logging
async function logAudit(
  supabase: any,
  amc_form_id: string,
  payment_id: string,
  order_id: string,
  amount: number,
  action: string,
  details: Record<string, any>
) {
  try {
    await supabase.from("payment_audit_log").insert({
      amc_form_id,
      payment_id,
      order_id,
      amount,
      action,
      actor: "webhook",
      details: JSON.stringify(details),
    });
  } catch (error) {
    console.warn("Audit log failed (non-critical):", error);
  }
}
