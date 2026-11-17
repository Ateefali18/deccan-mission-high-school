const ALLOWED_ORIGINS = [
  "https://dmhs-nwgj.vercel.app",
  "https://dmhs.vercel.app",
  "https://dmhs.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

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
    const { sessionId, otp } = req.body || {};

    if (!sessionId || !otp) {
      return res.status(400).json({ error: "Session ID and 6-digit OTP code are required." });
    }

    const cleanSess = String(sessionId).trim();
    const cleanOtp = String(otp).trim();

    if (cleanOtp.length < 4 || cleanOtp.length > 8) {
      return res.status(400).json({ error: "Invalid OTP format. Please enter the 6-digit code received via SMS." });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://snnzmgbkiiydboujublj.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

    // Call Supabase verification RPC
    const verifyRes = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_otp_session_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_session_id: cleanSess,
        p_otp: cleanOtp,
      }),
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error("[OTP Verify RPC Error]:", errText);
      return res.status(500).json({ error: "Verification failed. Please try again." });
    }

    const result = await verifyRes.json();

    if (!result.success) {
      return res.status(400).json({
        error: result.error || "Invalid verification code. Please check your SMS and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      resetToken: result.reset_token,
      message: result.message || "OTP verified successfully. You may now enter your new password.",
    });
  } catch (err) {
    console.error("[OTP Verify Handler Error]:", err);
    return res.status(500).json({ error: "Internal server error during OTP verification." });
  }
}
