import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to encode string to base64
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface AMCOrderData {
  amc_form_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  city: string;
  state: string;
  district: string;
  amount: string;
  system_usage_purpose: string;
  validity_start?: string;
  validity_end?: string;
}

function generateInvoiceHTML(order: AMCOrderData, invoiceNumber: string, validityStart: string, validityEnd: string): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
    .invoice-title { font-size: 32px; color: #1e40af; text-align: right; }
    .invoice-number { color: #64748b; font-size: 14px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 14px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
    .customer-info { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .total-amount { font-size: 24px; color: #2563eb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
    .validity { background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AMC Services</div>
      <div style="color: #64748b; margin-top: 5px;">Annual Maintenance Contract</div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${invoiceNumber}</div>
      <div style="margin-top: 10px; color: #64748b;">Date: ${today}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="customer-info">
      <strong>${order.full_name}</strong><br>
      ${order.company_name ? `${order.company_name}<br>` : ''}
      ${order.city}, ${order.district}<br>
      ${order.state}<br>
      Phone: ${order.phone}<br>
      Email: ${order.email}
    </div>
  </div>

  <div class="validity">
    <strong>AMC Validity Period:</strong> ${validityStart} to ${validityEnd}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Details</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Annual Maintenance Contract</td>
        <td>${order.system_usage_purpose}</td>
        <td style="text-align: right;">₹${order.amount}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2"><strong>Total Amount</strong></td>
        <td style="text-align: right;" class="total-amount">₹${order.amount}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; background: #fef3c7; padding: 15px; border-radius: 8px;">
    <strong>Payment Due Date:</strong> ${dueDate}
  </div>

  <div class="footer">
    <p>Thank you for choosing our AMC services. For any queries, please contact our support team.</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>
  `;
}

function generateContractHTML(order: AMCOrderData, contractId: string, validityStart: string, validityEnd: string): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AMC Contract - ${contractId}</title>
  <style>
    body { font-family: 'Georgia', serif; margin: 0; padding: 40px; color: #333; line-height: 1.8; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 30px; margin-bottom: 30px; }
    .title { font-size: 28px; color: #1e40af; font-weight: bold; }
    .subtitle { color: #64748b; margin-top: 10px; }
    .contract-id { background: #f1f5f9; padding: 10px 20px; display: inline-block; border-radius: 4px; margin-top: 15px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 15px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; background: #f8fafc; padding: 20px; border-radius: 8px; }
    .party-title { font-weight: bold; color: #1e40af; margin-bottom: 10px; }
    .terms { background: #f8fafc; padding: 25px; border-radius: 8px; }
    .terms ol { margin: 0; padding-left: 20px; }
    .terms li { margin-bottom: 15px; }
    .validity-box { background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
    .signature-box { width: 40%; text-align: center; }
    .signature-line { border-top: 1px solid #333; padding-top: 10px; margin-top: 60px; }
    .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">ANNUAL MAINTENANCE CONTRACT</div>
    <div class="subtitle">Service Agreement</div>
    <div class="contract-id">Contract ID: ${contractId}</div>
  </div>

  <p style="text-align: center; margin-bottom: 30px;">
    This Annual Maintenance Contract ("Agreement") is entered into on <strong>${today}</strong>
  </p>

  <div class="parties">
    <div class="party">
      <div class="party-title">SERVICE PROVIDER</div>
      <strong>AMC Services</strong><br>
      Computer Maintenance Division<br>
      Professional IT Support Services
    </div>
    <div class="party">
      <div class="party-title">CLIENT</div>
      <strong>${order.full_name}</strong><br>
      ${order.company_name ? `${order.company_name}<br>` : ''}
      ${order.city}, ${order.district}, ${order.state}<br>
      Phone: ${order.phone}<br>
      Email: ${order.email}
    </div>
  </div>

  <div class="validity-box">
    <strong style="font-size: 18px;">CONTRACT VALIDITY PERIOD</strong><br>
    <span style="font-size: 20px; color: #1e40af;">${validityStart} — ${validityEnd}</span>
  </div>

  <div class="section">
    <div class="section-title">SCOPE OF SERVICES</div>
    <p>The Service Provider agrees to provide maintenance services for: <strong>${order.system_usage_purpose}</strong></p>
  </div>

  <div class="section">
    <div class="section-title">TERMS AND CONDITIONS</div>
    <div class="terms">
      <ol>
        <li><strong>Service Coverage:</strong> This contract covers preventive maintenance, troubleshooting, software updates, and hardware diagnostics for systems registered under this agreement.</li>
        <li><strong>Response Time:</strong> The Service Provider will respond to service requests within 24-48 business hours.</li>
        <li><strong>On-Site Visits:</strong> The contract includes scheduled preventive maintenance visits and emergency support as needed.</li>
        <li><strong>Exclusions:</strong> This contract does not cover hardware replacement costs, damage due to negligence, natural disasters, or unauthorized modifications.</li>
        <li><strong>Contract Value:</strong> The total contract value is <strong>₹${order.amount}</strong> for the validity period mentioned above.</li>
        <li><strong>Payment Terms:</strong> Payment is due within 15 days of invoice generation.</li>
        <li><strong>Renewal:</strong> This contract will be reviewed for renewal 30 days before expiry.</li>
        <li><strong>Termination:</strong> Either party may terminate this agreement with 30 days written notice.</li>
      </ol>
    </div>
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line">
        <strong>Service Provider</strong><br>
        Authorized Signatory
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <strong>Client</strong><br>
        ${order.full_name}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This contract is legally binding upon acceptance by both parties.</p>
    <p>Generated on ${today} | Contract ID: ${contractId}</p>
  </div>
</body>
</html>
  `;
}

function generateEmailHTML(order: AMCOrderData, invoiceNumber: string, validityStart: string, validityEnd: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #1e40af; margin-bottom: 20px; }
    .info-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { color: #64748b; }
    .value { font-weight: bold; color: #1e40af; }
    .cta { text-align: center; margin: 30px 0; }
    .button { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; }
    .attachments { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 AMC Order Confirmed!</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Your Annual Maintenance Contract is ready</p>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${order.full_name},</div>
      
      <p>Thank you for choosing our AMC services! We're excited to have you on board. Your order has been successfully processed and your contract is now active.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Invoice Number:</span>
          <span class="value">${invoiceNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">Contract Amount:</span>
          <span class="value">₹${order.amount}</span>
        </div>
        <div class="info-row">
          <span class="label">Validity Period:</span>
          <span class="value">${validityStart} to ${validityEnd}</span>
        </div>
      </div>

      <div class="attachments">
        <strong>📎 Attached Documents:</strong>
        <ul style="margin: 10px 0 0; padding-left: 20px;">
          <li>Invoice (${invoiceNumber})</li>
          <li>AMC Contract Agreement</li>
        </ul>
      </div>

      <p>Please review the attached invoice and contract documents. If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>AMC Services Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated email. Please do not reply directly.</p>
      <p>© 2025 AMC Services. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amc_form_id } = await req.json();

    if (!amc_form_id) {
      throw new Error("AMC form ID is required");
    }

    console.log(`Processing invoice/contract for AMC order: ${amc_form_id}`);

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the AMC order details
    const { data: order, error: orderError } = await supabase
      .from("amc_responses")
      .select("*")
      .eq("amc_form_id", amc_form_id)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      throw new Error("Order not found");
    }

    console.log(`Order found: ${order.full_name}, ${order.email}`);

    // Generate invoice number
    const { data: invoiceNumberData, error: invoiceNumError } = await supabase
      .rpc("generate_invoice_number");

    if (invoiceNumError) {
      console.error("Error generating invoice number:", invoiceNumError);
      throw new Error("Failed to generate invoice number");
    }

    const invoiceNumber = invoiceNumberData as string;
    console.log(`Generated invoice number: ${invoiceNumber}`);

    // Calculate validity period (1 year from now)
    const validityStart = new Date();
    const validityEnd = new Date();
    validityEnd.setFullYear(validityEnd.getFullYear() + 1);

    const validityStartStr = validityStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const validityEndStr = validityEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Create invoice record in database
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        amc_order_id: amc_form_id,
        invoice_number: invoiceNumber,
        amount: parseFloat(order.amount || "0"),
        status: "sent",
        due_date: dueDate.toISOString().split("T")[0],
        validity_start: validityStart.toISOString().split("T")[0],
        validity_end: validityEnd.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      throw new Error("Failed to create invoice record");
    }

    console.log(`Invoice created with ID: ${invoice.id}`);

    // Generate HTML documents
    const invoiceHTML = generateInvoiceHTML(order, invoiceNumber, validityStartStr, validityEndStr);
    const contractHTML = generateContractHTML(order, `AMC-${amc_form_id.slice(0, 8).toUpperCase()}`, validityStartStr, validityEndStr);
    const emailHTML = generateEmailHTML(order, invoiceNumber, validityStartStr, validityEndStr);

    // Send email with Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AMC Services <onboarding@resend.dev>",
        to: [order.email],
        subject: `Your AMC Invoice ${invoiceNumber} & Contract - Welcome!`,
        html: emailHTML,
        attachments: [
          {
            filename: `Invoice-${invoiceNumber}.html`,
            content: encodeBase64(invoiceHTML),
          },
          {
            filename: `AMC-Contract-${amc_form_id.slice(0, 8).toUpperCase()}.html`,
            content: encodeBase64(contractHTML),
          },
        ],
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    // Update the AMC order status
    const { error: updateError } = await supabase
      .from("amc_responses")
      .update({ 
        amc_started: true,
        status: "pending"
      })
      .eq("amc_form_id", amc_form_id);

    if (updateError) {
      console.error("Error updating order status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        email_sent: true,
        validity_start: validityStart.toISOString().split("T")[0],
        validity_end: validityEnd.toISOString().split("T")[0],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-invoice-contract function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
