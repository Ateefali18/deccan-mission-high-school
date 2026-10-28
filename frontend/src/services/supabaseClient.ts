import { createClient } from "@supabase/supabase-js";

// Read Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://snnzmgbkiiydboujublj.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

// Check if credentials are placeholders or actually configured
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (
    SUPABASE_ANON_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY" ||
    SUPABASE_ANON_KEY.includes("YOUR_") ||
    SUPABASE_ANON_KEY.length < 20
  ) {
    return false;
  }
  return true;
}

// Fallback dummy key to prevent crash at runtime before user pastes their key
const safeKey = isSupabaseConfigured()
  ? SUPABASE_ANON_KEY
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_unconfigured_mode";

export const supabase = createClient(SUPABASE_URL, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "dmhs_supabase_auth_token",
  },
  global: {
    headers: {
      "x-school-code": "DMHS-HYD",
      "x-application": "Deccan-Mission-High-School-ERP",
    },
  },
});

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  isConfigured: isSupabaseConfigured(),
  dashboardUrl: "https://supabase.com/dashboard/project/snnzmgbkiiydboujublj",
};
