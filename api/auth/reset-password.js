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
    const { resetToken, newPassword } = req.body || {};

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required." });
    }

    const cleanToken = String(resetToken).trim();
    const cleanPass = String(newPassword).trim();

    if (cleanPass.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters long." });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://snnzmgbkiiydboujublj.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

    // Call Supabase password reset RPC
    const resetRes = await fetch(`${supabaseUrl}/rest/v1/rpc/complete_password_reset_with_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_reset_token: cleanToken,
        p_new_password: cleanPass,
      }),
    });

    if (!resetRes.ok) {
      const errText = await resetRes.text();
      console.error("[Password Reset RPC Error]:", errText);
      return res.status(500).json({ error: "Failed to update password. Please try again." });
    }

    const result = await resetRes.json();

    if (!result.success) {
      return res.status(400).json({
        error: result.error || "Password update failed. Token may be invalid or expired.",
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || "Your password has been successfully updated. You may now sign in.",
    });
  } catch (err) {
    console.error("[Password Reset Handler Error]:", err);
    return res.status(500).json({ error: "Internal server error completing password reset." });
  }
}
