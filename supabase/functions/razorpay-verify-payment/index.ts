import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

// Get environment variables
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Price per system for AMC - used for validation
const AMC_PRICE_PER_SYSTEM = 999;

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

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Update payment record
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
    }

    // Update AMC form with payment status
    const { error: updateFormError } = await supabase
      .from("amc_responses")
      .update({
        payment_status: "completed",
        amount: paymentRecord.amount.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("amc_form_id", amc_form_id);

    if (updateFormError) {
      console.error("Failed to update AMC form:", updateFormError);
    }

    console.log(`Payment verified and recorded for AMC: ${amc_form_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        amcFormId: amc_form_id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paymentRecord.amount,
        systemCount: paymentRecord.system_count,
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
