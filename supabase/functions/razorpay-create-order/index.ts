import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Get environment variables
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Price per system for AMC
const AMC_PRICE_PER_SYSTEM = 999;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  amcFormId: string;
  systemCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

// Helper to create base64 auth header for Razorpay
function createAuthHeader(keyId: string, keySecret: string): string {
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

// Validate that amount is correct (must be multiple of 999)
function validateAmount(systemCount: number): { valid: boolean; amount: number } {
  if (systemCount < 1 || !Number.isInteger(systemCount)) {
    return { valid: false, amount: 0 };
  }
  const amount = systemCount * AMC_PRICE_PER_SYSTEM;
  // Verify it's truly a multiple of 999
  if (amount % AMC_PRICE_PER_SYSTEM !== 0) {
    return { valid: false, amount: 0 };
  }
  return { valid: true, amount };
}

// Auth verification
async function verifySupabaseUser(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY!,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error("Auth validation failed:", errorData);
    throw new Error("Invalid or expired session");
  }

  return await res.json(); // returns user object
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const user = await verifySupabaseUser(req);
    console.log("Authenticated user:", user.id);

    // 2. Validate environment variables
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay credentials");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body: CreateOrderRequest = await req.json();
    const { amcFormId, systemCount, customerName, customerEmail, customerPhone } = body;

    // 4. Validate required fields
    if (!amcFormId || !systemCount || !customerName || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Validate and calculate amount
    const { valid, amount } = validateAmount(systemCount);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid system count" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating Razorpay order for AMC: ${amcFormId}, Systems: ${systemCount}, Amount: ₹${amount}`);

    // 6. Create Razorpay order
    const razorpayOrderData = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: amcFormId.slice(0, 40), // Razorpay has 40 char limit for receipt
      notes: {
        amc_form_id: amcFormId,
        system_count: systemCount.toString(),
        customer_name: customerName,
        customer_email: customerEmail,
        price_per_system: AMC_PRICE_PER_SYSTEM.toString(),
      },
    };

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": createAuthHeader(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayOrderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay order creation failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create payment order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("Razorpay order created:", razorpayOrder.id);

    // 7. Store order in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insert new payment record (each Razorpay order gets its own record)
    const { error: dbError } = await supabase
      .from("amc_payments")
      .insert({
        amc_form_id: amcFormId,
        razorpay_order_id: razorpayOrder.id,
        amount: amount,
        system_count: systemCount,
        status: "created",
        currency: "INR",
        metadata: {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
      });

    if (dbError) {
      console.error("Database error storing payment record:", dbError);
      // This is critical - webhook won't work without this record
      return new Response(
        JSON.stringify({ error: "Failed to store payment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment record stored successfully for order:", razorpayOrder.id);

    // 8. Return order details for frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId: razorpayOrder.id,
        amount: amount,
        amountInPaise: amount * 100,
        currency: "INR",
        systemCount: systemCount,
        pricePerSystem: AMC_PRICE_PER_SYSTEM,
        keyId: RAZORPAY_KEY_ID, // Frontend needs this to initialize Razorpay
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    if (error.message.includes("Authorization") || error.message.includes("session")) {
      console.error("Authentication error:", error.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("Error creating order:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
