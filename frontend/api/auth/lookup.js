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
    const { portal, identifier } = req.body || {};

    if (!portal || !identifier) {
      return res.status(400).json({ error: "Portal and identifier are required." });
    }

    const cleanPortal = String(portal).trim().toUpperCase();
    const cleanId = String(identifier).trim();

    if (!["ADMIN", "TEACHER", "STUDENT"].includes(cleanPortal)) {
      return res.status(400).json({ error: "Invalid portal selection." });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://snnzmgbkiiydboujublj.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

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
      console.error("[Account Lookup RPC Error]:", errText);
      return res.status(500).json({ error: "Failed to query account database." });
    }

    const account = await lookupRes.json();

    if (!account.found) {
      return res.status(404).json({
        found: false,
        error: account.error || "No registered account found matching the provided identifier in this portal.",
      });
    }

    if (!account.has_phone) {
      return res.status(400).json({
        found: true,
        hasPhone: false,
        name: account.name,
        error: account.error || "No mobile phone number is registered for this account. Please contact the administrative office.",
      });
    }

    return res.status(200).json({
      success: true,
      found: true,
      hasPhone: true,
      name: account.name,
      portal: cleanPortal,
      maskedPhone: account.masked_phone,
    });
  } catch (err) {
    console.error("[Account Lookup Handler Error]:", err);
    return res.status(500).json({ error: "Internal server error looking up account." });
  }
}
