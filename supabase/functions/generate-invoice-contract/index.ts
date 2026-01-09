import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Color palette for PDFs
const colors = {
  primary: rgb(0.145, 0.388, 0.922),      // #2563eb - Blue
  primaryDark: rgb(0.118, 0.251, 0.686),   // #1e40af - Dark Blue
  gray: rgb(0.392, 0.455, 0.545),          // #64748b - Gray
  lightGray: rgb(0.886, 0.910, 0.941),     // #e2e8f0 - Light Gray
  bgLight: rgb(0.973, 0.980, 0.988),       // #f8fafc - Background
  bgBlue: rgb(0.859, 0.914, 0.976),        // #dbeafe - Light Blue BG
  bgYellow: rgb(0.996, 0.953, 0.780),      // #fef3c7 - Yellow BG
  black: rgb(0.2, 0.2, 0.2),
  white: rgb(1, 1, 1),
  success: rgb(0.133, 0.545, 0.133),       // Green
};

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

// Helper function to draw a rectangle
function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color,
    borderColor,
    borderWidth: borderColor ? 1 : 0,
  });
}

// Helper to draw text with word wrap
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number = 1.4
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const testWidth = font.widthOfTextAtSize(testLine, size);
    
    if (testWidth > maxWidth && line !== '') {
      page.drawText(line.trim(), { x, y: currentY, size, font, color });
      line = word + ' ';
      currentY -= size * lineHeight;
    } else {
      line = testLine;
    }
  }
  
  if (line.trim()) {
    page.drawText(line.trim(), { x, y: currentY, size, font, color });
    currentY -= size * lineHeight;
  }

  return currentY;
}

// Helper to encode Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateInvoicePDF(
  order: AMCOrderData,
  invoiceNumber: string,
  validityStart: string,
  validityEnd: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const margin = 50;
  let y = height - margin;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // === HEADER SECTION ===
  drawRect(page, 0, height - 120, width, 120, colors.primary);
  
  page.drawText('AMC SERVICES', {
    x: margin,
    y: height - 50,
    size: 28,
    font: fontBold,
    color: colors.white,
  });
  
  page.drawText('Annual Maintenance Contract', {
    x: margin,
    y: height - 75,
    size: 12,
    font: fontRegular,
    color: rgb(0.8, 0.9, 1),
  });

  page.drawText('INVOICE', {
    x: width - margin - 100,
    y: height - 50,
    size: 24,
    font: fontBold,
    color: colors.white,
  });
  
  page.drawText(invoiceNumber, {
    x: width - margin - 100,
    y: height - 72,
    size: 11,
    font: fontRegular,
    color: rgb(0.8, 0.9, 1),
  });

  y = height - 150;

  // === DATE SECTION ===
  page.drawText(`Invoice Date: ${today}`, {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: colors.gray,
  });

  page.drawText(`Due Date: ${dueDate}`, {
    x: width - margin - 150,
    y,
    size: 10,
    font: fontRegular,
    color: colors.gray,
  });

  y -= 40;

  // === BILL TO SECTION ===
  drawRect(page, margin, y - 110, 240, 110, colors.bgLight, colors.lightGray);
  
  page.drawText('BILL TO', {
    x: margin + 15,
    y: y - 20,
    size: 10,
    font: fontBold,
    color: colors.primary,
  });

  page.drawText(order.full_name, {
    x: margin + 15,
    y: y - 40,
    size: 12,
    font: fontBold,
    color: colors.black,
  });

  let billY = y - 58;
  if (order.company_name) {
    page.drawText(order.company_name, { x: margin + 15, y: billY, size: 10, font: fontRegular, color: colors.gray });
    billY -= 14;
  }
  page.drawText(`${order.city}, ${order.district}`, { x: margin + 15, y: billY, size: 10, font: fontRegular, color: colors.gray });
  billY -= 14;
  page.drawText(order.state, { x: margin + 15, y: billY, size: 10, font: fontRegular, color: colors.gray });
  billY -= 14;
  page.drawText(`Phone: ${order.phone}`, { x: margin + 15, y: billY, size: 10, font: fontRegular, color: colors.gray });

  // === INVOICE DETAILS BOX ===
  drawRect(page, width - margin - 200, y - 110, 200, 110, colors.bgBlue, colors.primary);
  
  page.drawText('INVOICE DETAILS', {
    x: width - margin - 185,
    y: y - 20,
    size: 10,
    font: fontBold,
    color: colors.primary,
  });

  page.drawText(`Invoice #: ${invoiceNumber}`, {
    x: width - margin - 185,
    y: y - 45,
    size: 10,
    font: fontRegular,
    color: colors.black,
  });

  page.drawText(`Email: ${order.email}`, {
    x: width - margin - 185,
    y: y - 62,
    size: 9,
    font: fontRegular,
    color: colors.gray,
  });

  y -= 140;

  // === VALIDITY PERIOD ===
  drawRect(page, margin, y - 45, width - 2 * margin, 45, colors.bgBlue);
  
  page.drawText('AMC VALIDITY PERIOD', {
    x: margin + 15,
    y: y - 20,
    size: 10,
    font: fontBold,
    color: colors.primary,
  });

  page.drawText(`${validityStart}  to  ${validityEnd}`, {
    x: margin + 15,
    y: y - 38,
    size: 11,
    font: fontBold,
    color: colors.primaryDark,
  });

  y -= 70;

  // === ITEMS TABLE ===
  const tableWidth = width - 2 * margin;
  const col1 = margin;
  const col2 = margin + 250;
  const col3 = width - margin - 100;

  drawRect(page, margin, y - 30, tableWidth, 30, colors.primary);
  
  page.drawText('Description', { x: col1 + 15, y: y - 20, size: 11, font: fontBold, color: colors.white });
  page.drawText('Details', { x: col2, y: y - 20, size: 11, font: fontBold, color: colors.white });
  page.drawText('Amount', { x: col3, y: y - 20, size: 11, font: fontBold, color: colors.white });

  y -= 30;

  drawRect(page, margin, y - 40, tableWidth, 40, colors.white, colors.lightGray);
  
  page.drawText('Annual Maintenance Contract', { x: col1 + 15, y: y - 25, size: 10, font: fontRegular, color: colors.black });
  
  const purposeText = order.system_usage_purpose.length > 30 
    ? order.system_usage_purpose.substring(0, 30) + '...'
    : order.system_usage_purpose;
  page.drawText(purposeText, { x: col2, y: y - 25, size: 10, font: fontRegular, color: colors.gray });
  page.drawText(`Rs. ${order.amount}`, { x: col3, y: y - 25, size: 10, font: fontBold, color: colors.black });

  y -= 40;

  // Total row
  drawRect(page, margin, y - 50, tableWidth, 50, colors.bgLight);
  
  page.drawText('TOTAL AMOUNT', { x: col1 + 15, y: y - 32, size: 12, font: fontBold, color: colors.black });
  page.drawText(`Rs. ${order.amount}`, { x: col3 - 20, y: y - 32, size: 16, font: fontBold, color: colors.primary });

  y -= 80;

  // === PAYMENT DUE NOTICE ===
  drawRect(page, margin, y - 40, tableWidth, 40, colors.bgYellow);
  
  page.drawText(`Payment Due Date: ${dueDate}`, {
    x: margin + 15,
    y: y - 27,
    size: 11,
    font: fontBold,
    color: rgb(0.6, 0.4, 0),
  });

  y -= 70;

  // === PAYMENT STATUS ===
  drawRect(page, margin, y - 40, 150, 40, colors.success);
  
  page.drawText('PAID', {
    x: margin + 55,
    y: y - 28,
    size: 16,
    font: fontBold,
    color: colors.white,
  });

  // === FOOTER ===
  y = 80;
  
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: colors.lightGray,
  });

  page.drawText('Thank you for choosing our AMC services!', {
    x: margin,
    y: y - 25,
    size: 10,
    font: fontRegular,
    color: colors.gray,
  });

  page.drawText('For any queries, please contact our support team.', {
    x: margin,
    y: y - 40,
    size: 9,
    font: fontRegular,
    color: colors.gray,
  });

  page.drawText('This is a computer-generated invoice and does not require a signature.', {
    x: margin,
    y: y - 55,
    size: 8,
    font: fontRegular,
    color: colors.gray,
  });

  return pdfDoc.save();
}

async function generateContractPDF(
  order: AMCOrderData,
  contractId: string,
  validityStart: string,
  validityEnd: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
  const margin = 50;
  let y = height - margin;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // === DECORATIVE TOP BORDER ===
  drawRect(page, 0, height - 8, width, 8, colors.primary);

  y = height - 50;

  // === HEADER ===
  page.drawText('ANNUAL MAINTENANCE CONTRACT', {
    x: (width - fontBold.widthOfTextAtSize('ANNUAL MAINTENANCE CONTRACT', 24)) / 2,
    y,
    size: 24,
    font: fontBold,
    color: colors.primaryDark,
  });

  y -= 25;

  page.drawText('Service Agreement', {
    x: (width - fontRegular.widthOfTextAtSize('Service Agreement', 14)) / 2,
    y,
    size: 14,
    font: fontItalic,
    color: colors.gray,
  });

  y -= 35;

  // Contract ID box
  const contractIdText = `Contract ID: ${contractId}`;
  const contractIdWidth = fontRegular.widthOfTextAtSize(contractIdText, 11) + 30;
  drawRect(page, (width - contractIdWidth) / 2, y - 25, contractIdWidth, 25, colors.bgLight, colors.lightGray);
  
  page.drawText(contractIdText, {
    x: (width - fontRegular.widthOfTextAtSize(contractIdText, 11)) / 2,
    y: y - 17,
    size: 11,
    font: fontRegular,
    color: colors.primaryDark,
  });

  y -= 50;

  // === AGREEMENT INTRO ===
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 2,
    color: colors.primary,
  });

  y -= 30;

  const introText = `This Annual Maintenance Contract ("Agreement") is entered into on ${today}`;
  page.drawText(introText, {
    x: (width - fontRegular.widthOfTextAtSize(introText, 11)) / 2,
    y,
    size: 11,
    font: fontRegular,
    color: colors.black,
  });

  y -= 40;

  // === PARTIES SECTION ===
  const partyBoxWidth = (width - 2 * margin - 20) / 2;
  
  drawRect(page, margin, y - 100, partyBoxWidth, 100, colors.bgLight, colors.lightGray);
  
  page.drawText('SERVICE PROVIDER', {
    x: margin + 15,
    y: y - 20,
    size: 10,
    font: fontBold,
    color: colors.primary,
  });

  page.drawText('AMC Services', {
    x: margin + 15,
    y: y - 42,
    size: 12,
    font: fontBold,
    color: colors.black,
  });

  page.drawText('Computer Maintenance Division', {
    x: margin + 15,
    y: y - 58,
    size: 10,
    font: fontRegular,
    color: colors.gray,
  });

  page.drawText('Professional IT Support Services', {
    x: margin + 15,
    y: y - 72,
    size: 10,
    font: fontRegular,
    color: colors.gray,
  });

  // Client Box
  const clientBoxX = margin + partyBoxWidth + 20;
  drawRect(page, clientBoxX, y - 100, partyBoxWidth, 100, colors.bgLight, colors.lightGray);
  
  page.drawText('CLIENT', {
    x: clientBoxX + 15,
    y: y - 20,
    size: 10,
    font: fontBold,
    color: colors.primary,
  });

  page.drawText(order.full_name, {
    x: clientBoxX + 15,
    y: y - 42,
    size: 12,
    font: fontBold,
    color: colors.black,
  });

  let clientY = y - 58;
  if (order.company_name) {
    page.drawText(order.company_name, { x: clientBoxX + 15, y: clientY, size: 10, font: fontRegular, color: colors.gray });
    clientY -= 14;
  }
  page.drawText(`${order.city}, ${order.state}`, { x: clientBoxX + 15, y: clientY, size: 10, font: fontRegular, color: colors.gray });
  clientY -= 14;
  page.drawText(`Email: ${order.email}`, { x: clientBoxX + 15, y: clientY, size: 9, font: fontRegular, color: colors.gray });

  y -= 130;

  // === VALIDITY PERIOD BOX ===
  drawRect(page, margin, y - 60, width - 2 * margin, 60, colors.bgBlue, colors.primary);
  
  page.drawText('CONTRACT VALIDITY PERIOD', {
    x: (width - fontBold.widthOfTextAtSize('CONTRACT VALIDITY PERIOD', 12)) / 2,
    y: y - 22,
    size: 12,
    font: fontBold,
    color: colors.primary,
  });

  const validityText = `${validityStart}  -  ${validityEnd}`;
  page.drawText(validityText, {
    x: (width - fontBold.widthOfTextAtSize(validityText, 14)) / 2,
    y: y - 45,
    size: 14,
    font: fontBold,
    color: colors.primaryDark,
  });

  y -= 85;

  // === SCOPE OF SERVICES ===
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: 4,
    height: 20,
    color: colors.primary,
  });

  page.drawText('SCOPE OF SERVICES', {
    x: margin + 15,
    y,
    size: 12,
    font: fontBold,
    color: colors.primaryDark,
  });

  y -= 25;

  page.drawText(`The Service Provider agrees to provide maintenance services for: ${order.system_usage_purpose}`, {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: colors.black,
  });

  y -= 35;

  // === TERMS AND CONDITIONS ===
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: 4,
    height: 20,
    color: colors.primary,
  });

  page.drawText('TERMS AND CONDITIONS', {
    x: margin + 15,
    y,
    size: 12,
    font: fontBold,
    color: colors.primaryDark,
  });

  y -= 25;

  drawRect(page, margin, y - 180, width - 2 * margin, 180, colors.bgLight);

  const terms = [
    '1. Service Coverage: This contract covers preventive maintenance, troubleshooting, software updates, and hardware diagnostics.',
    '2. Response Time: The Service Provider will respond to service requests within 24-48 business hours.',
    '3. On-Site Visits: The contract includes scheduled preventive maintenance visits and emergency support as needed.',
    '4. Exclusions: This contract does not cover hardware replacement costs, damage due to negligence, or unauthorized modifications.',
    `5. Contract Value: The total contract value is Rs. ${order.amount} for the validity period mentioned above.`,
    '6. Payment Terms: Payment is due within 15 days of invoice generation.',
    '7. Renewal: This contract will be reviewed for renewal 30 days before expiry.',
    '8. Termination: Either party may terminate this agreement with 30 days written notice.',
  ];

  let termY = y - 18;
  for (const term of terms) {
    const wrappedY = drawWrappedText(page, term, margin + 15, termY, width - 2 * margin - 30, fontRegular, 9, colors.black, 1.3);
    termY = wrappedY - 5;
  }

  y -= 210;

  // === SIGNATURES ===
  const sigBoxWidth = (width - 2 * margin - 60) / 2;
  
  page.drawLine({
    start: { x: margin, y: y - 60 },
    end: { x: margin + sigBoxWidth, y: y - 60 },
    thickness: 1,
    color: colors.black,
  });

  page.drawText('Service Provider', {
    x: margin + (sigBoxWidth - fontBold.widthOfTextAtSize('Service Provider', 10)) / 2,
    y: y - 75,
    size: 10,
    font: fontBold,
    color: colors.black,
  });

  page.drawText('Authorized Signatory', {
    x: margin + (sigBoxWidth - fontRegular.widthOfTextAtSize('Authorized Signatory', 9)) / 2,
    y: y - 88,
    size: 9,
    font: fontRegular,
    color: colors.gray,
  });

  const clientSigX = width - margin - sigBoxWidth;
  page.drawLine({
    start: { x: clientSigX, y: y - 60 },
    end: { x: clientSigX + sigBoxWidth, y: y - 60 },
    thickness: 1,
    color: colors.black,
  });

  page.drawText('Client', {
    x: clientSigX + (sigBoxWidth - fontBold.widthOfTextAtSize('Client', 10)) / 2,
    y: y - 75,
    size: 10,
    font: fontBold,
    color: colors.black,
  });

  page.drawText(order.full_name, {
    x: clientSigX + (sigBoxWidth - fontRegular.widthOfTextAtSize(order.full_name, 9)) / 2,
    y: y - 88,
    size: 9,
    font: fontRegular,
    color: colors.gray,
  });

  // === FOOTER ===
  y = 50;

  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: width - margin, y: y + 20 },
    thickness: 1,
    color: colors.lightGray,
  });

  const footerText1 = 'This contract is legally binding upon acceptance by both parties.';
  page.drawText(footerText1, {
    x: (width - fontRegular.widthOfTextAtSize(footerText1, 9)) / 2,
    y,
    size: 9,
    font: fontRegular,
    color: colors.gray,
  });

  const footerText2 = `Generated on ${today} | Contract ID: ${contractId}`;
  page.drawText(footerText2, {
    x: (width - fontRegular.widthOfTextAtSize(footerText2, 8)) / 2,
    y: y - 15,
    size: 8,
    font: fontRegular,
    color: colors.gray,
  });

  return pdfDoc.save();
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
    .attachments { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AMC Order Confirmed!</h1>
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
          <span class="value">Rs. ${order.amount}</span>
        </div>
        <div class="info-row">
          <span class="label">Validity Period:</span>
          <span class="value">${validityStart} to ${validityEnd}</span>
        </div>
      </div>

      <div class="attachments">
        <strong>Attached Documents (PDF):</strong>
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
      <p>2026 AMC Services. All rights reserved.</p>
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

    // Check if invoice already exists for this order (created by razorpay-verify-payment)
    const { data: existingInvoice, error: existingInvoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("amc_order_id", amc_form_id)
      .maybeSingle();

    let invoiceNumber: string;

    if (existingInvoice) {
      // Use existing invoice number
      invoiceNumber = existingInvoice.invoice_number;
      console.log(`Found existing invoice: ${invoiceNumber}`);
    } else {
      // Generate new invoice number (fallback)
      const { data: invoiceNumberData, error: invoiceNumError } = await supabase
        .rpc("generate_invoice_number");

      if (invoiceNumError) {
        console.error("Error generating invoice number:", invoiceNumError);
        throw new Error("Failed to generate invoice number");
      }
      invoiceNumber = invoiceNumberData as string;
      console.log(`Generated new invoice number: ${invoiceNumber}`);
    }
    const contractId = `AMC-${amc_form_id.slice(0, 8).toUpperCase()}`;
    console.log(`Generated invoice number: ${invoiceNumber}`);

    // Calculate validity period (1 year from now)
    const validityStart = new Date();
    const validityEnd = new Date();
    validityEnd.setFullYear(validityEnd.getFullYear() + 1);

    const validityStartStr = validityStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const validityEndStr = validityEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Generate PDF documents
    console.log("Generating PDF documents...");
    const [invoicePdfBytes, contractPdfBytes] = await Promise.all([
      generateInvoicePDF(order, invoiceNumber, validityStartStr, validityEndStr),
      generateContractPDF(order, contractId, validityStartStr, validityEndStr),
    ]);

    console.log(`Invoice PDF size: ${invoicePdfBytes.length} bytes`);
    console.log(`Contract PDF size: ${contractPdfBytes.length} bytes`);

    // Generate email HTML
    const emailHTML = generateEmailHTML(order, invoiceNumber, validityStartStr, validityEndStr);

    // Upload invoice PDF to storage
    const invoiceFileName = `${amc_form_id}/invoice-${invoiceNumber}.pdf`;
    const { error: invoiceUploadError } = await supabase.storage
      .from('documents')
      .upload(invoiceFileName, invoicePdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (invoiceUploadError) {
      console.error("Error uploading invoice PDF:", invoiceUploadError);
      throw new Error(`Failed to upload invoice: ${invoiceUploadError.message}`);
    }

    // Upload contract PDF to storage
    const contractFileName = `${amc_form_id}/contract-${contractId}.pdf`;
    const { error: contractUploadError } = await supabase.storage
      .from('documents')
      .upload(contractFileName, contractPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (contractUploadError) {
      console.error("Error uploading contract PDF:", contractUploadError);
      throw new Error(`Failed to upload contract: ${contractUploadError.message}`);
    }

    // Get signed URLs for the documents (valid for 1 year)
    const { data: invoiceUrlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(invoiceFileName, 31536000); // 1 year

    const { data: contractUrlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(contractFileName, 31536000);

    const invoiceUrl = invoiceUrlData?.signedUrl || null;
    const contractUrl = contractUrlData?.signedUrl || null;

    console.log("Documents uploaded to storage");

    // Update or create invoice record in database
    let invoice;
    let invoiceError;

    if (existingInvoice) {
      // Update existing invoice with document URLs
      const { data, error } = await supabase
        .from("invoices")
        .update({
          invoice_url: invoiceUrl,
          contract_url: contractUrl,
        })
        .eq("id", existingInvoice.id)
        .select()
        .single();
      
      invoice = data;
      invoiceError = error;
      
      if (!invoiceError) {
        console.log(`Invoice updated with document URLs: ${invoiceNumber}`);
      }
    } else {
      // Create new invoice record (fallback)
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          amc_order_id: amc_form_id,
          invoice_number: invoiceNumber,
          amount: parseFloat(order.amount || "0"),
          status: "sent",
          due_date: dueDate.toISOString().split("T")[0],
          validity_start: validityStart.toISOString().split("T")[0],
          validity_end: validityEnd.toISOString().split("T")[0],
          invoice_url: invoiceUrl,
          contract_url: contractUrl,
        })
        .select()
        .single();
      
      invoice = data;
      invoiceError = error;
      
      if (!invoiceError) {
        console.log(`Invoice created with ID: ${invoice.id}`);
      }
    }

    if (invoiceError) {
      console.error("Error with invoice:", invoiceError);
      throw new Error("Failed to update/create invoice record");
    }

    // Send email with PDF attachments using Resend API
    if (RESEND_API_KEY) {
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
              filename: `Invoice-${invoiceNumber}.pdf`,
              content: uint8ArrayToBase64(invoicePdfBytes),
            },
            {
              filename: `AMC-Contract-${contractId}.pdf`,
              content: uint8ArrayToBase64(contractPdfBytes),
            },
          ],
        }),
      });

      const emailResult = await emailResponse.json();
      console.log("Email sent:", emailResult);
    } else {
      console.warn("RESEND_API_KEY not set, skipping email");
    }

    // Update the AMC order to mark documents as generated
    // Note: Do NOT change status here as it's already set by razorpay-verify-payment
    const { error: updateError } = await supabase
      .from("amc_responses")
      .update({ 
        amc_started: true,
        // documents_generated: true, // Consider adding this field if needed
      })
      .eq("amc_form_id", amc_form_id);

    if (updateError) {
      console.error("Error updating order status:", updateError);
    }

    // Log the action
    await supabase.from("payment_audit_log").insert({
      amc_form_id,
      action: "invoice_contract_pdf_generated",
      actor: "system",
      details: {
        invoice_number: invoiceNumber,
        contract_id: contractId,
        invoice_url: invoiceUrl,
        contract_url: contractUrl,
        format: "pdf"
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        contract_id: contractId,
        invoice_url: invoiceUrl,
        contract_url: contractUrl,
        email_sent: !!RESEND_API_KEY,
        validity_start: validityStart.toISOString().split("T")[0],
        validity_end: validityEnd.toISOString().split("T")[0],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-invoice-contract function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
