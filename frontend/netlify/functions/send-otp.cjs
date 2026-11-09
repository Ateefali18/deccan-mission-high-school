const nodemailer = require("nodemailer");

// Allowed origins whitelist for CORS
const ALLOWED_ORIGINS = [
  "https://dmhs.netlify.app",
  "https://dhms.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

// In-memory sliding window rate-limiting for the Netlify Function container lifecycle
// Key: normalized email -> Array of request timestamps
const emailRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 3;
const MIN_COOLDOWN_MS = 50 * 1000; // 50 seconds cooldown between consecutive dispatches

function checkRateLimit(email) {
  const now = Date.now();
  const timestamps = emailRateLimitMap.get(email) || [];
  // Filter out timestamps older than window
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length > 0) {
    const lastDispatch = activeTimestamps[activeTimestamps.length - 1];
    if (now - lastDispatch < MIN_COOLDOWN_MS) {
      const waitSec = Math.ceil((MIN_COOLDOWN_MS - (now - lastDispatch)) / 1000);
      return { allowed: false, error: `Please wait ${waitSec} seconds before requesting another verification code.` };
    }
  }

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: "Too many password recovery attempts. Please try again after 5 minutes or contact administration.",
    };
  }

  activeTimestamps.push(now);
  emailRateLimitMap.set(email, activeTimestamps);
  return { allowed: true };
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCorsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  let allowedOrigin = "https://dmhs.netlify.app";

  if (ALLOWED_ORIGINS.includes(origin) || (origin.endsWith(".netlify.app") && origin.startsWith("https://"))) {
    allowedOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

exports.handler = async function (event, context) {
  const corsHeaders = getCorsHeaders(event);

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  try {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON body format." }),
      };
    }

    const { email, otp, name, role, identifier } = payload;

    // Strict validation: Email RFC 5322 pattern and 6-digit OTP
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    const otpRegex = /^\d{6}$/;

    if (!email || !emailRegex.test(String(email).trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid or malformed recipient email address." }),
      };
    }

    if (!otp || !otpRegex.test(String(otp).trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid verification code format. Must be exactly 6 digits." }),
      };
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const safeName = escapeHtml(String(name || "Student/Faculty").substring(0, 60));
    const safeRole = escapeHtml(String(role || "Member").substring(0, 30));
    const safeIdentifier = escapeHtml(String(identifier || "").substring(0, 60));

    // Server-side rate limiting check
    const rateCheck = checkRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: rateCheck.error }),
      };
    }

    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const gmailAppPassword = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);

    // If server environment variables are not yet configured
    if (!gmailUser || !gmailAppPassword) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          delivered: false,
          code: "SMTP_CREDENTIALS_MISSING",
          message:
            "Real email dispatch requires Gmail SMTP credentials. Please configure GMAIL_USER and GMAIL_APP_PASSWORD in Netlify environment variables.",
          setup_instructions: {
            step_1: "Go to your Google Account > Security > 2-Step Verification.",
            step_2: "Under '2-Step Verification', select 'App Passwords'.",
            step_3: "Create a new app password named 'DMHS ERP' and copy the 16-character code.",
            step_4: "In your Netlify Dashboard (or .env), set: GMAIL_USER=<your-school-email@gmail.com> and GMAIL_APP_PASSWORD=<16-char-code>.",
          },
        }),
      };
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Verification code email HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #142B4A; padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin: 0; text-transform: uppercase; }
    .header p { color: #facc15; font-size: 11px; font-weight: 600; margin: 6px 0 0; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .lead { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-card { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .otp-label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #142B4A; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; line-height: 1.5; margin-bottom: 24px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Deccan Mission High School</h1>
      <p>School ERP • Password Recovery Authentication</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${safeName},</div>
      <div class="lead">
        We received a request to reset the login credentials for your DMHS authorized school portal account
        ${safeIdentifier ? `(<strong>${safeIdentifier}</strong>)` : ""}. Use the verification code below to complete the recovery process:
      </div>
      <div class="otp-card">
        <div class="otp-label">Six-Digit Verification Code (OTP)</div>
        <div class="otp-code">${cleanOtp}</div>
      </div>
      <div class="warning">
        <strong>Security Notice:</strong> This OTP is single-use and will expire in <strong>5 minutes</strong>. Never share this code with anyone, including school staff. If you did not initiate this request, contact the administrative office immediately.
      </div>
    </div>
    <div class="footer">
      Deccan Mission High School • Hyderabad, Telangana 500002<br/>
      Telangana State SSC Board Affiliation #TS-HYD-SSC-41092
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"Deccan Mission High School" <${gmailUser}>`,
      to: cleanEmail,
      subject: `[DMHS ERP] Your Verification OTP: ${cleanOtp}`,
      text: `Your Deccan Mission High School password recovery code is: ${cleanOtp}. It will expire in 5 minutes. Do not share this code.`,
      html: htmlContent,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        delivered: true,
        messageId: info.messageId,
        message: `OTP email successfully dispatched to ${cleanEmail}.`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        delivered: false,
        error: "Failed to dispatch email via SMTP service.",
      }),
    };
  }
};
