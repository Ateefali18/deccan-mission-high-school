const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function verifySettingsLifecycle() {
  console.log("==================================================================");
  console.log("DMHS ERP — INSTITUTION SETTINGS REFRESH & PERSISTENCE VERIFICATION");
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

  try {
    // 1. Fetch current settings directly from Supabase
    const { data: initialSettings, error: fetchErr } = await supabase
      .from("schools")
      .select("*")
      .eq("code", "DMHS-HYD")
      .single();

    assert(!fetchErr && initialSettings, "1. Successfully fetched latest institution record directly from Supabase");
    assert(initialSettings.name === "Deccan Mission High School", `2. Verified legal name: "${initialSettings?.name}"`);
    assert(initialSettings.affiliation_number === "TS-SSC-500002", `3. Verified SSC affiliation: "${initialSettings?.affiliation_number}"`);
    assert(initialSettings.principal_name === "STA Khadri", `4. Verified principal name: "${initialSettings?.principal_name}"`);
    assert(initialSettings.principal_email === "sta.khadri@dmhs.edu.in", `5. Verified principal email: "${initialSettings?.principal_email}"`);
    assert(initialSettings.principal_phone === "+91 9949083181", `6. Verified principal phone: "${initialSettings?.principal_phone}"`);

    // 2. Test saving updated details via RPC save_institution_settings
    const updatedPayload = {
      ...initialSettings,
      contact_phone: "+91 40 2456 7890",
      website: "https://dmhs-nwgj.vercel.app",
      board: "Telangana State Board of Secondary Education (SSC)",
    };

    const { data: savedRpc, error: saveErr } = await supabase.rpc("save_institution_settings", {
      p_payload: updatedPayload,
    });

    assert(!saveErr && savedRpc, "7. save_institution_settings RPC executed successfully");
    assert(savedRpc.website === "https://dmhs-nwgj.vercel.app", "8. Saved website persisted in response");

    // 3. Verify with a fresh independent client (simulating another browser / device)
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: refreshedSettings, error: refErr } = await clientB
      .from("schools")
      .select("*")
      .eq("code", "DMHS-HYD")
      .single();

    assert(!refErr && refreshedSettings, "9. Fresh client retrieved saved settings without cache reliance");
    assert(refreshedSettings.affiliation_number === "TS-SSC-500002", "10. Affiliation number verified across independent client");
    assert(refreshedSettings.website === "https://dmhs-nwgj.vercel.app", "11. Website verified across independent client");

    // 4. Test empty query behavior (querying non-existent school code)
    const { data: emptyCheck, error: emptyErr } = await supabase
      .from("schools")
      .select("*")
      .eq("code", "NON_EXISTENT_CODE")
      .maybeSingle();

    assert(!emptyErr && emptyCheck === null, "12. Non-existent school gracefully returns null (triggers clear empty state in UI)");

  } catch (err) {
    assert(false, `Test failed with exception: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`SETTINGS VERIFICATION RESULT: ${passed} PASSED | ${failed} FAILED (Total: ${passed + failed})`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

verifySettingsLifecycle();
