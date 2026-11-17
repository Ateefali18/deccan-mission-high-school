/**
 * Comprehensive Phase 3 Security & Portals Verification Test Suite
 * Deccan Mission High School ERP
 */
const path = require("path");
const crypto = require("crypto");
const { createClient } = require(path.resolve(__dirname, "../frontend/node_modules/@supabase/supabase-js"));

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnptZ2JraWl5ZGJvdWp1YmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTQ1NjIsImV4cCI6MjEwODc3MDU2Mn0.0qwUrTmzX2SUEEdcTtLzZIs6aTjPvDXfCPv-RYfHDYs";

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runSecurityTests() {
  console.log("==================================================================");
  console.log("PHASE 2 & 3: DMHS ERP SECURITY & MULTI-PORTAL VERIFICATION SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // 1. Admin Portal Account Resolution
  try {
    const { data, error } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "ADMIN",
      p_identifier: "admin@dmhs.edu.in"
    });
    if (error) {
      console.log(`[FAIL] 1. Admin lookup error:`, error.message);
      failed++;
    } else if (data?.found && data?.masked_phone === "+91 99******81") {
      console.log(`[PASS] 1. Admin Account Identified: ${data.name} -> Masked: ${data.masked_phone}`);
      passed++;
    } else {
      console.log(`[FAIL] 1. Admin lookup failed:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 1. Error:`, e.message);
    failed++;
  }

  // 2. Student Portal Account Resolution (DMHS-1382)
  try {
    const { data } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "STUDENT",
      p_identifier: "DMHS-1382"
    });
    if (data?.found && data?.masked_phone === "+91 98******42") {
      console.log(`[PASS] 2. Student Account Identified: ${data.name} (DMHS-1382) -> Masked: ${data.masked_phone}`);
      passed++;
    } else {
      console.log(`[FAIL] 2. Student lookup failed:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 2. Error:`, e.message);
    failed++;
  }

  // 3. Cross-Portal Isolation: Student ID in Admin Portal must be rejected
  try {
    const { data } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "ADMIN",
      p_identifier: "DMHS-1382"
    });
    if (!data?.found) {
      console.log(`[PASS] 3. Cross-Portal Isolation: Student admission number rejected in Admin Portal.`);
      passed++;
    } else {
      console.log(`[FAIL] 3. Cross-Portal Isolation breached:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 3. Error:`, e.message);
    failed++;
  }

  // 4. Cross-Portal Isolation: Admin email in Student Portal must be rejected
  try {
    const { data } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "STUDENT",
      p_identifier: "admin@dmhs.edu.in"
    });
    if (!data?.found) {
      console.log(`[PASS] 4. Cross-Portal Isolation: Admin email rejected in Student Portal.`);
      passed++;
    } else {
      console.log(`[FAIL] 4. Cross-Portal Isolation breached:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 4. Error:`, e.message);
    failed++;
  }

  // 5. Unregistered / Non-existent account test
  try {
    const { data } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "STUDENT",
      p_identifier: "NON-EXISTENT-XYZ-9999"
    });
    if (!data?.found) {
      console.log(`[PASS] 5. Unregistered identifier securely rejected without exposing database details.`);
      passed++;
    } else {
      console.log(`[FAIL] 5. Non-existent account returned found:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 5. Error:`, e.message);
    failed++;
  }

  // 6. Security: Incorrect OTP rejected with remaining attempt counter
  const testSession1 = "sec_test_invalid_" + Date.now();
  const salt1 = crypto.randomBytes(16).toString("hex");
  const hash1 = crypto.createHash("sha256").update(salt1 + "445566").digest("hex");

  try {
    await supabase.rpc("save_otp_session", {
      p_session_id: testSession1,
      p_portal: "STUDENT",
      p_identifier: "DMHS-1382",
      p_auth_user_id: null,
      p_profile_id: null,
      p_entity_id: null,
      p_phone: "919849346342",
      p_masked_phone: "+91 98******42",
      p_otp_hash: hash1,
      p_salt: salt1,
      p_expires_seconds: 300
    });

    const { data } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSession1,
      p_otp: "999999" // Incorrect OTP
    });

    if (!data?.success && data?.error && data.error.includes("4 attempt(s) remaining")) {
      console.log(`[PASS] 6. Incorrect OTP rejected. Counter decremented: "${data.error}"`);
      passed++;
    } else {
      console.log(`[FAIL] 6. Incorrect OTP handling unexpected:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 6. Error:`, e.message);
    failed++;
  }

  // 7. Security: Exhaust all 5 attempts -> Session locked/blocked
  try {
    for (let i = 0; i < 4; i++) {
      await supabase.rpc("verify_otp_session_code", {
        p_session_id: testSession1,
        p_otp: "000000"
      });
    }
    // 5th attempt (or subsequent attempt)
    const { data } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSession1,
      p_otp: "445566" // Even if correct OTP is provided now, it must be locked!
    });

    if (!data?.success && data?.error && data.error.includes("Maximum verification attempts exceeded")) {
      console.log(`[PASS] 7. Brute-force protection: Session locked after 5 failed attempts.`);
      passed++;
    } else {
      console.log(`[FAIL] 7. Brute-force protection failed:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 7. Error:`, e.message);
    failed++;
  }

  // 8. Security: Expired OTP rejected
  const testSessionExpired = "sec_test_expired_" + Date.now();
  const saltExp = crypto.randomBytes(16).toString("hex");
  const hashExp = crypto.createHash("sha256").update(saltExp + "123123").digest("hex");

  try {
    await supabase.rpc("save_otp_session", {
      p_session_id: testSessionExpired,
      p_portal: "ADMIN",
      p_identifier: "admin@dmhs.edu.in",
      p_auth_user_id: null,
      p_profile_id: null,
      p_entity_id: null,
      p_phone: "919949083181",
      p_masked_phone: "+91 99******81",
      p_otp_hash: hashExp,
      p_salt: saltExp,
      p_expires_seconds: -10 // expired 10 seconds ago
    });

    const { data } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionExpired,
      p_otp: "123123"
    });

    if (!data?.success && data?.error && data.error.includes("expired")) {
      console.log(`[PASS] 8. Expired OTP rejected successfully: "${data.error}"`);
      passed++;
    } else {
      console.log(`[FAIL] 8. Expired OTP accepted or unexpected response:`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 8. Error:`, e.message);
    failed++;
  }

  // 9. Security: Single-Use Token Replay Attack Prevention
  const testSessionReplay = "sec_test_replay_" + Date.now();
  const saltRep = crypto.randomBytes(16).toString("hex");
  const hashRep = crypto.createHash("sha256").update(saltRep + "654321").digest("hex");

  try {
    await supabase.rpc("save_otp_session", {
      p_session_id: testSessionReplay,
      p_portal: "ADMIN",
      p_identifier: "admin@dmhs.edu.in",
      p_auth_user_id: null,
      p_profile_id: null,
      p_entity_id: null,
      p_phone: "919949083181",
      p_masked_phone: "+91 99******81",
      p_otp_hash: hashRep,
      p_salt: saltRep,
      p_expires_seconds: 300
    });

    // 1st verification: Success
    const firstTry = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionReplay,
      p_otp: "654321"
    });

    // 2nd verification (Replay attack): Must fail
    const replayTry = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionReplay,
      p_otp: "654321"
    });

    if (firstTry.data?.success && !replayTry.data?.success) {
      console.log(`[PASS] 9. Replay attack blocked: Verified OTP session cannot be re-verified.`);
      passed++;
    } else {
      console.log(`[FAIL] 9. Replay attack allowed:`, { first: firstTry.data, replay: replayTry.data });
      failed++;
    }
  } catch (e) {
    console.log(`[FAIL] 9. Error:`, e.message);
    failed++;
  }

  // 10. Security: Direct DB Table Access Blocked (RLS)
  try {
    const { data, error } = await supabase.from("otp_verifications").select("*");
    if (error || !data || data.length === 0) {
      console.log(`[PASS] 10. Direct client SELECT on otp_verifications blocked by Row-Level Security.`);
      passed++;
    } else {
      console.log(`[FAIL] 10. Direct SELECT allowed on otp_verifications!`, data);
      failed++;
    }
  } catch (e) {
    console.log(`[PASS] 10. Direct client SELECT blocked by RLS.`);
    passed++;
  }

  console.log("\n==================================================================");
  console.log(`SECURITY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (Total 10)`);
  console.log("==================================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runSecurityTests();
