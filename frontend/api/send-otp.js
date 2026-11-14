import nodemailer from "nodemailer";

const ALLOWED_ORIGINS = [
  "https://dmhs-nwgj.vercel.app",
  "https://dmhs.vercel.app",
  "https://dmhs.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const emailRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MIN_COOLDOWN_MS = 50 * 1000;

function checkRateLimit(email) {
  const now = Date.now();
  const timestamps = emailRateLimitMap.get(email) || [];
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

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  let allowedOrigin = "https://dmhs-nwgj.vercel.app";
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")) {
    allowedOrigin = origin;
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const payload = req.body || {};
    const { email, otp, name, role } = payload;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rateCheck = checkRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.error });
    }

    const gmailUser = process.env.GMAIL_USER || process.env.VITE_GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      return res.status(200).json({
        success: false,
        code: "SMTP_CREDENTIALS_MISSING",
        message: "Email credentials not yet configured in hosting environment variables.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `"Deccan Mission High School" <${gmailUser}>`,
      to: cleanEmail,
      subject: `DMHS Security Verification Code: ${otp}`,
      text: `Your DMHS ERP verification code is: ${otp}. Valid for 10 minutes.`,
      html: `<div style="font-family:sans-serif;padding:20px;"><h2>DMHS ERP Verification</h2><p>Your verification code is: <strong>${otp}</strong></p></div>`,
    });

    return res.status(200).json({ success: true, message: `OTP sent to ${cleanEmail}` });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to send email." });
  }
}
