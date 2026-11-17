import crypto from "crypto";

const ALLOWED_ORIGINS = [
  "https://dmhs-nwgj.vercel.app",
  "https://dmhs.vercel.app",
  "https://dmhs.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

// In-memory rate-limiting
const rateLimitMap = new Map();
const COOLDOWN_MS = 60 * 1000; // 60 seconds resend cooldown
const WINDOW_MS = 15 * 60 * 1000; // 15-minute window
const MAX_REQUESTS = 5; // max 5 per window

function checkRateLimit(key) {
  const now = Date.now();
  const history = rateLimitMap.get(key) || [];
  const activeHistory = history.filter((t) => now - t < WINDOW_MS);

  if (activeHistory.length > 0) {
    const last = activeHistory[activeHistory.length - 1];
    if (now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return {
        allowed: false,
        error: `Please wait ${waitSec} second(s) before requesting another OTP.`,
      };
    }
  }

  if (activeHistory.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      error: "Too many OTP requests. Please wait 15 minutes before trying again or contact the school office.",
    };
  }

  activeHistory.push(now);
  rateLimitMap.set(key, activeHistory);
  return { allowed: true };
}

function normalizeIndianMobile(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
  return digits.length >= 10 ? digits : null;
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
    const { portal, identifier } = req.body || {};

    if (!portal || !identifier) {
      return res.status(400).json({ error: "Portal selection and account identifier are required." });
    }

    const cleanPortal = String(portal).trim().toUpperCase();
    const cleanId = String(identifier).trim();

    if (!["ADMIN", "TEACHER", "STUDENT"].includes(cleanPortal)) {
      return res.status(400).json({ error: "Invalid portal selection." });
    }

    // Rate limit by client IP and identifier
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const rateKey = `${clientIp}_${cleanPortal}_${cleanId.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.error });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://snnzmgbkiiydboujublj.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

    // 1. Account Lookup via Supabase RPC
    const lookupRes = await fetch(`${supabaseUrl}/rest/v1/rpc/lookup_account_for_otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_portal: cleanPortal,
        p_identifier: cleanId,
      }),
    });

    if (!lookupRes.ok) {
      const errText = await lookupRes.text();
      console.error("[OTP Request] Lookup RPC error:", errText);
      return res.status(500).json({ error: "Failed to query authentication service. Please try again." });
    }

    const account = await lookupRes.json();

    if (!account.found) {
      return res.status(404).json({
        error: account.error || "No registered account found matching the provided identifier in this portal.",
      });
    }

    if (!account.has_phone || !account.phone) {
      return res.status(400).json({
        error:
          account.error ||
          "No mobile number registered for this account. Please contact the Deccan Mission High School administrative office.",
      });
    }

    const normalizedPhone = normalizeIndianMobile(account.phone);
    if (!normalizedPhone || normalizedPhone.length < 12) {
      return res.status(400).json({
        error: "The registered mobile number is not a valid 10-digit Indian phone number. Please contact administration.",
      });
    }

    // 2. Generate cryptographically secure OTP & Salt
    const otp = String(crypto.randomInt(100000, 1000000)); // 6-digit code
    const salt = crypto.randomBytes(16).toString("hex");
    const sessionId = "dmhs_otp_" + crypto.randomBytes(24).toString("hex");
    const otpHash = crypto.createHash("sha256").update(salt + otp).digest("hex");

    // 3. Store Session in PostgreSQL with 5-minute expiry
    const saveRes = await fetch(`${supabaseUrl}/rest/v1/rpc/save_otp_session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_session_id: sessionId,
        p_portal: cleanPortal,
        p_identifier: cleanId,
        p_auth_user_id: account.auth_user_id || null,
        p_profile_id: account.profile_id || null,
        p_entity_id: account.entity_id || null,
        p_phone: account.phone,
        p_masked_phone: account.masked_phone,
        p_otp_hash: otpHash,
        p_salt: salt,
        p_expires_seconds: 300,
      }),
    });

    if (!saveRes.ok) {
      const saveErr = await saveRes.text();
      console.error("[OTP Request] Save session error:", saveErr);
      return res.status(500).json({ error: "Failed to initialize verification session." });
    }

    // 4. Dispatch SMS via APITxT Gateway
    const apitxtKey = process.env.APITXT_AUTH_KEY;
    let smsDispatched = false;

    if (apitxtKey) {
      try {
        const apitxtParams = new URLSearchParams({
          authkey: apitxtKey,
          mobile: normalizedPhone,
          otp: otp,
        });

        const smsRes = await fetch("https://apitxt.com/api/sendOTP", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: apitxtParams.toString(),
        });

        const smsData = await smsRes.json().catch(() => null);
        if (smsRes.ok && smsData && (smsData.status === "success" || smsData.type === "success")) {
          smsDispatched = true;
        } else {
          console.warn("[APITxT] Dispatch response:", smsData);
        }
      } catch (smsErr) {
        console.error("[APITxT] Network error sending SMS:", smsErr.message);
      }
    } else {
      console.warn("[APITxT] Notice: APITXT_AUTH_KEY environment variable not configured. Session created in database.");
    }

    // Return generic success with masked phone (NEVER expose the OTP!)
    return res.status(200).json({
      success: true,
      sessionId,
      maskedPhone: account.masked_phone,
      name: account.name,
      portal: cleanPortal,
      expiresSeconds: 300,
      cooldownSeconds: 60,
      smsDispatched,
      message: `A 6-digit verification code has been dispatched via SMS to your registered mobile (${account.masked_phone}).`,
    });
  } catch (err) {
    console.error("[OTP Request Handler Error]:", err);
    return res.status(500).json({ error: "Internal server error processing OTP request." });
  }
}
