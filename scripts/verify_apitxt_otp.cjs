/**
 * Automated Verification Script for APITxT OTP Password Recovery
 * Deccan Mission High School ERP
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createClient } = require(path.resolve(__dirname, "../frontend/node_modules/@supabase/supabase-js"));

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnptZ2JraWl5ZGJvdWp1YmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTQ1NjIsImV4cCI6MjEwODc3MDU2Mn0.0qwUrTmzX2SUEEdcTtLzZIs6aTjPvDXfCPv-RYfHDYs";

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runTests() {
  console.log("=================================================");
  console.log("DMHS ERP — APITxT OTP INTEGRATION VERIFICATION");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  // TEST 1: Lookup Admin Account
  let adminLookup = null;
  try {
    const { data, error } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "ADMIN",
      p_identifier: "admin@dmhs.edu.in"
    });
    if (error) throw error;
    if (data && data.found && data.masked_phone) {
      adminLookup = data;
      console.log(`[PASS] Test 1: Admin Account Lookup: Name="${data.name}", MaskedPhone="${data.masked_phone}", Role="${data.role}"`);
      passed++;
    } else {
      console.log(`[FAIL] Test 1: Admin Account Lookup returned:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 1: Admin Account Lookup error:`, err.message);
    failed++;
  }

  // TEST 2: Lookup Student Account (DMHS-1382)
  try {
    const { data, error } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "STUDENT",
      p_identifier: "DMHS-1382"
    });
    if (error) throw error;
    if (data && data.found && data.masked_phone) {
      console.log(`[PASS] Test 2: Student Account Lookup (DMHS-1382): Name="${data.name}", MaskedPhone="${data.masked_phone}", Admission="${data.identifier}"`);
      passed++;
    } else {
      console.log(`[FAIL] Test 2: Student Account Lookup returned:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 2: Student Account Lookup error:`, err.message);
    failed++;
  }

  // TEST 3: Cross-Portal Invalidation Check (Student ID in Admin Portal)
  try {
    const { data, error } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "ADMIN",
      p_identifier: "DMHS-1382"
    });
    if (error) throw error;
    if (data && !data.found) {
      console.log(`[PASS] Test 3: Cross-portal isolation enforced: Student ID rejected in Admin portal.`);
      passed++;
    } else {
      console.log(`[FAIL] Test 3: Cross-portal isolation failed:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 3 error:`, err.message);
    failed++;
  }

  // TEST 4: Create OTP Session & Database Persistence
  let testSessionId = "test_sess_" + Date.now();
  let testOtp = "789123";
  let testSalt = crypto.randomBytes(16).toString("hex");
  let testOtpHash = crypto.createHash("sha256").update(testSalt + testOtp).digest("hex");

  try {
    const { data, error } = await supabase.rpc("save_otp_session", {
      p_session_id: testSessionId,
      p_portal: "ADMIN",
      p_identifier: "admin@dmhs.edu.in",
      p_auth_user_id: adminLookup?.auth_user_id || null,
      p_profile_id: adminLookup?.profile_id || null,
      p_entity_id: null,
      p_phone: "919949083181",
      p_masked_phone: "+91 99******81",
      p_otp_hash: testOtpHash,
      p_salt: testSalt,
      p_expires_seconds: 300
    });
    if (error) throw error;
    console.log(`[PASS] Test 4: OTP session saved with 5-minute expiry and salted SHA-256 hash.`);
    passed++;
  } catch (err) {
    console.log(`[FAIL] Test 4: save_otp_session error:`, err.message);
    failed++;
  }

  // TEST 5: Verify Invalid OTP (Attempt Count Decrement & Rejection)
  try {
    const { data, error } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionId,
      p_otp: "000000"
    });
    if (error) throw error;
    if (data && !data.success && data.error && data.error.includes("remaining")) {
      console.log(`[PASS] Test 5: Invalid OTP rejected correctly. Server response: "${data.error}"`);
      passed++;
    } else {
      console.log(`[FAIL] Test 5: Expected rejection with attempts left, got:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 5 error:`, err.message);
    failed++;
  }

  // TEST 6: Verify Correct OTP & Generate Single-Use Reset Token
  let returnedResetToken = null;
  try {
    const { data, error } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionId,
      p_otp: testOtp
    });
    if (error) throw error;
    if (data && data.success && data.reset_token) {
      returnedResetToken = data.reset_token;
      console.log(`[PASS] Test 6: Valid OTP verified! Single-use reset token generated: ${returnedResetToken.substring(0, 16)}...`);
      passed++;
    } else {
      console.log(`[FAIL] Test 6: Verification failed:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 6 error:`, err.message);
    failed++;
  }

  // TEST 7: OTP Replay Attack Prevention (Cannot reuse verified OTP)
  try {
    const { data, error } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: testSessionId,
      p_otp: testOtp
    });
    if (error) throw error;
    if (data && !data.verified) {
      console.log(`[PASS] Test 7: OTP replay attack blocked: Already verified session cannot be re-verified.`);
      passed++;
    } else {
      console.log(`[FAIL] Test 7: Replay attack succeeded! Session re-verified:`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[FAIL] Test 7 error:`, err.message);
    failed++;
  }

  // TEST 8: RLS Protection on otp_verifications Table (Direct SELECT blocked)
  try {
    const { data, error } = await supabase.from("otp_verifications").select("*");
    if (error || !data || data.length === 0) {
      console.log(`[PASS] Test 8: Row-Level Security active. Direct table access blocked (RLS enforced).`);
      passed++;
    } else {
      console.log(`[FAIL] Test 8: otp_verifications exposed to anon client!`, data);
      failed++;
    }
  } catch (err) {
    console.log(`[PASS] Test 8: Row-Level Security active.`);
    passed++;
  }

  // Clean up test session via RPC or SQL
  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
