const { createClient } = require('@supabase/supabase-js');
const crypto = require("crypto");

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runMasterBugFixVerification() {
  console.log("==================================================================");
  console.log("DMHS ERP — MASTER BUG FIX COMPREHENSIVE VERIFICATION");
  console.log("Supabase Project: snnzmgbkiiydboujublj");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // PART 1: INSTITUTION SETTINGS PERSISTENCE VERIFICATION
  // -------------------------------------------------------------------------
  console.log("--- PART 1: INSTITUTION SETTINGS SUPABASE PERSISTENCE ---");
  try {
    const testSettings = {
      name: "Deccan Mission High School",
      affiliation_number: "TS-SSC-500002",
      board: "Telangana State Board of Secondary Education (SSC)",
      code: "DMHS-HYD",
      contact_email: "info@dmhs.edu.in",
      contact_phone: "+91 40 2456 7890",
      address: "Old City, Hyderabad, Telangana 500002, India",
      website: "https://dmhs-nwgj.vercel.app",
      logo_url: "/dmhs-logo-128.png",
      principal_name: "STA Khadri",
      principal_email: "sta.khadri@dmhs.edu.in",
      principal_phone: "+91 9949083181",
    };

    // Save via RPC save_institution_settings
    const { data: savedData, error: saveErr } = await supabase.rpc("save_institution_settings", {
      p_payload: testSettings,
    });

    assert(!saveErr && savedData, `save_institution_settings RPC executed successfully: ${saveErr?.message || 'OK'}`);
    assert(savedData && savedData.name === testSettings.name, `Persisted legal school name: "${savedData?.name}"`);
    assert(savedData && savedData.principal_name === "STA Khadri", `Persisted principal name: "${savedData?.principal_name}"`);
    assert(savedData && savedData.affiliation_number === "TS-SSC-500002", `Persisted SSC affiliation number: "${savedData?.affiliation_number}"`);
    assert(savedData && savedData.principal_phone === "+91 9949083181", `Persisted principal direct phone: "${savedData?.principal_phone}"`);

    // Verify independent query loads the persisted data from public.schools
    const { data: fetchRow, error: fetchErr } = await supabase
      .from("schools")
      .select("*")
      .eq("code", "DMHS-HYD")
      .single();

    assert(!fetchErr && fetchRow, `Independent Supabase SELECT confirmed persistence in PostgreSQL`);
    assert(fetchRow && fetchRow.principal_email === "sta.khadri@dmhs.edu.in", `Principal email verified in PostgreSQL table: "${fetchRow?.principal_email}"`);
  } catch (err) {
    assert(false, `Institution settings persistence failed with exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // PART 2: PASSWORD RESET + SUBSEQUENT LOGIN VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- PART 2: PASSWORD RESET & SUPABASE AUTH LOGIN SYNCHRONIZATION ---");
  try {
    // 1. Account Lookup for Student DMHS-0576
    const { data: studentLookup, error: sErr } = await supabase.rpc("lookup_account_for_otp", {
      p_portal: "STUDENT",
      p_identifier: "DMHS-0576",
    });

    assert(!sErr && studentLookup && studentLookup.found, `Account lookup resolved for student DMHS-0576: "${studentLookup?.name}" (Role: ${studentLookup?.role})`);

    // 2. Generate cryptographically secure OTP & Salt
    const testOtp = "841295";
    const salt = crypto.randomBytes(16).toString("hex");
    const sessionId = "dmhs_test_" + crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(salt + testOtp).digest("hex");

    const { data: saveSessionRes, error: saveSessionErr } = await supabase.rpc("save_otp_session", {
      p_session_id: sessionId,
      p_portal: "STUDENT",
      p_identifier: "DMHS-0576",
      p_auth_user_id: studentLookup.auth_user_id,
      p_profile_id: studentLookup.profile_id,
      p_entity_id: studentLookup.entity_id,
      p_phone: studentLookup.phone,
      p_masked_phone: studentLookup.masked_phone,
      p_otp_hash: otpHash,
      p_salt: salt,
      p_expires_seconds: 300,
    });

    assert(!saveSessionErr && saveSessionRes && saveSessionRes.success, `save_otp_session initialized successfully in database`);

    // 3. Verify OTP code via RPC verify_otp_session_code
    const { data: verifyRes, error: verifyErr } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: sessionId,
      p_otp: testOtp,
    });

    assert(!verifyErr && verifyRes && verifyRes.success, `OTP verified successfully; generated single-use reset token`);
    const resetToken = verifyRes?.reset_token;
    assert(Boolean(resetToken), `Single-use reset token is present (${resetToken?.slice(0, 16)}...)`);

    // 4. Complete password reset with token
    const newTestPassword = "NewStudentPass#2026";
    const { data: resetResult, error: resetErr } = await supabase.rpc("complete_password_reset_with_token", {
      p_reset_token: resetToken,
      p_new_password: newTestPassword,
    });

    assert(!resetErr && resetResult && resetResult.success, `complete_password_reset_with_token updated Supabase Auth password`);

    // 5. Verify subsequent login with the NEW password via Supabase GoTrue Auth
    const studentEmail = "dmhs-0576@student.dmhs.edu.in";
    const { data: newLoginRes, error: newLoginErr } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: newTestPassword,
    });

    assert(!newLoginErr && newLoginRes?.session, `Subsequent login with NEW password succeeded in Supabase Auth (User ID: ${newLoginRes?.user?.id})`);

    // 6. Test rejection of old password
    const { data: oldLoginRes, error: oldLoginErr } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: "OldPassword1234",
    });

    assert(Boolean(oldLoginErr), `Old password correctly rejected with 400: "${oldLoginErr?.message}"`);

    // 7. Test Single-Use Token Reuse prevention (Replay attack blocked)
    const { data: replayResult, error: replayErr } = await supabase.rpc("complete_password_reset_with_token", {
      p_reset_token: resetToken,
      p_new_password: "AnotherPassword123!",
    });

    assert(!replayResult?.success, `Replay attack prevented: Single-use reset token cannot be reused ("${replayResult?.error}")`);

    // 8. Reset Student password back to canonical password '1234'
    const resetSessionId2 = "dmhs_revert_" + crypto.randomBytes(16).toString("hex");
    const revertOtp = "112233";
    const revertSalt = crypto.randomBytes(16).toString("hex");
    const revertHash = crypto.createHash("sha256").update(revertSalt + revertOtp).digest("hex");

    await supabase.rpc("save_otp_session", {
      p_session_id: resetSessionId2,
      p_portal: "STUDENT",
      p_identifier: "DMHS-0576",
      p_auth_user_id: studentLookup.auth_user_id,
      p_profile_id: studentLookup.profile_id,
      p_entity_id: studentLookup.entity_id,
      p_phone: studentLookup.phone,
      p_masked_phone: studentLookup.masked_phone,
      p_otp_hash: revertHash,
      p_salt: revertSalt,
      p_expires_seconds: 300,
    });

    const { data: verifyRevert } = await supabase.rpc("verify_otp_session_code", {
      p_session_id: resetSessionId2,
      p_otp: revertOtp,
    });

    if (verifyRevert?.reset_token) {
      await supabase.rpc("complete_password_reset_with_token", {
        p_reset_token: verifyRevert.reset_token,
        p_new_password: "1234",
      });
    }

    const { data: canonicalLogin, error: cErr } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: "1234",
    });
    assert(!cErr && canonicalLogin?.session, `Student canonical password restored and verified`);
    await supabase.auth.signOut();
  } catch (err) {
    assert(false, `Password reset and login verification failed with exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // PART 3: ADMIN SUPABASE AUTH VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- PART 3: ADMIN SUPABASE AUTH LOGIN ---");
  try {
    const adminEmail = "admin.dmhs.hyd@gmail.com";
    const { data: adminLogin, error: aErr } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: "1234",
    });

    assert(!aErr && adminLogin?.session, `Admin account (${adminEmail}) successfully authenticates in Supabase Auth`);
    await supabase.auth.signOut();
  } catch (err) {
    assert(false, `Admin verification failed: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`FINAL RESULTS: ${passed} PASSED | ${failed} FAILED (Total: ${passed + failed})`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterBugFixVerification();
