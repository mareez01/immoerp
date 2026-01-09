import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

// Get environment variables
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Price per system for AMC - used for validation
const AMC_PRICE_PER_SYSTEM = 999;
// AMC validity period in days
const AMC_VALIDITY_DAYS = 365;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amc_form_id: string;
}

// HMAC SHA256 signature verification
async function verifySignature(
  orderId: string, 
  paymentId: string, 
  signature: string, 
  secret: string
): Promise<boolean> {
  const body = `${orderId}|${paymentId}`;
  
  // Create HMAC SHA256 hash
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
  
  // Convert to hex
  const expectedSignature = Array.from(signatureArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

// Validate amount is correct (must be multiple of 999)
function validateAmount(amount: number, systemCount: number): boolean {
  const expectedAmount = systemCount * AMC_PRICE_PER_SYSTEM;
  return amount === expectedAmount && amount % AMC_PRICE_PER_SYSTEM === 0;
}

// Generate unique invoice number: INV-YYYYMMDD-XXXX
function generateInvoiceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${dateStr}-${random}`;
}

// Calculate subscription dates (1 year validity)
function calculateSubscriptionDates(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + AMC_VALIDITY_DAYS);
  
  return {
    start: now.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay secret key");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VerifyPaymentRequest = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amc_form_id } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amc_form_id) {
      return new Response(
        JSON.stringify({ error: "Missing required payment verification fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying payment for AMC: ${amc_form_id}, Order: ${razorpay_order_id}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============================================
    // IDEMPOTENCY CHECK - Prevent double processing
    // ============================================
    const { data: existingPayment } = await supabase
      .from("amc_payments")
      .select("razorpay_payment_id, status")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment && existingPayment.status === "captured") {
      console.log(`Payment ${razorpay_payment_id} already processed - idempotency check passed`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true, 
          message: "Payment already processed",
          amcFormId: amc_form_id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature
    const isValid = await verifySignature(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      console.error("Payment signature verification failed");
      return new Response(
        JSON.stringify({ error: "Payment verification failed", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signature verified successfully");

    // Fetch payment record to get amount and system count
    const { data: paymentRecord, error: fetchError } = await supabase
      .from("amc_payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (fetchError || !paymentRecord) {
      console.error("Payment record not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Payment record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount is correct
    if (!validateAmount(paymentRecord.amount, paymentRecord.system_count)) {
      console.error("Amount validation failed:", paymentRecord);
      return new Response(
        JSON.stringify({ error: "Amount validation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // CALCULATE SUBSCRIPTION DATES
    // ============================================
    const subscriptionDates = calculateSubscriptionDates();

    // ============================================
    // TRANSACTION: Update payment, AMC order, and create invoice
    // ============================================

    // 1. Update payment record
    const { error: updatePaymentError } = await supabase
      .from("amc_payments")
      .update({
        razorpay_payment_id,
        status: "captured",
        verified_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id);

    if (updatePaymentError) {
      console.error("Failed to update payment record:", updatePaymentError);
      throw new Error("Failed to update payment record");
    }

    // 2. Update AMC form with payment status, subscription dates, and activate
    const { error: updateFormError } = await supabase
      .from("amc_responses")
      .update({
        payment_status: "Paid",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: paymentRecord.amount.toString(),
        status: "active", // ACTIVATE the subscription on payment
        subscription_start_date: subscriptionDates.start,
        subscription_end_date: subscriptionDates.end,
        updated_at: new Date().toISOString(),
      })
      .eq("amc_form_id", amc_form_id);

    if (updateFormError) {
      console.error("Failed to update AMC form:", updateFormError);
      throw new Error("Failed to update AMC form");
    }

    // 3. Generate and create invoice record
    const invoiceNumber = generateInvoiceNumber();
    
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        amc_order_id: amc_form_id,
        invoice_number: invoiceNumber,
        amount: paymentRecord.amount,
        status: "paid", // Payment already confirmed
        validity_start: subscriptionDates.start,
        validity_end: subscriptionDates.end,
        due_date: new Date().toISOString().slice(0, 10), // Due date is today for prepaid
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Failed to create invoice:", invoiceError);
      // Don't fail the whole transaction for invoice error
      // The payment is still valid
    } else {
      console.log(`Invoice created: ${invoiceNumber}`);
    }

    // 4. Log the payment event for audit trail
    try {
      await supabase.from("payment_audit_log").insert({
        amc_form_id,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: paymentRecord.amount,
        action: "payment_captured",
        actor: "system",
        details: JSON.stringify({
          signature_verified: true,
          invoice_number: invoice?.invoice_number,
          subscription_start: subscriptionDates.start,
          subscription_end: subscriptionDates.end,
        }),
      });
    } catch (auditError) {
      console.warn("Audit log insert failed (non-critical):", auditError);
    }

    // 5. Generate invoice/contract documents and send email (non-blocking)
    // This is called asynchronously so it doesn't delay the payment response
    try {
      const generateUrl = `${SUPABASE_URL}/functions/v1/generate-invoice-contract`;
      fetch(generateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ amc_form_id }),
      }).then(res => {
        if (!res.ok) {
          console.warn("Invoice document generation may have failed (non-critical)");
        } else {
          console.log("Invoice document generation triggered successfully");
        }
      }).catch(e => {
        console.warn("Invoice document generation failed (non-critical):", e);
      });
    } catch (docError) {
      console.warn("Failed to trigger document generation (non-critical):", docError);
    }

    console.log(`Payment verified and recorded for AMC: ${amc_form_id}`);
    console.log(`Subscription active: ${subscriptionDates.start} to ${subscriptionDates.end}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        amcFormId: amc_form_id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paymentRecord.amount,
        systemCount: paymentRecord.system_count,
        subscriptionStart: subscriptionDates.start,
        subscriptionEnd: subscriptionDates.end,
        invoiceNumber: invoice?.invoice_number,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
