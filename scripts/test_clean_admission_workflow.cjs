const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runAdmissionWorkflowTest() {
  console.log("==================================================================");
  console.log("DMHS ERP — PHASE 9: CONTROLLED ADMISSION & FEE WORKFLOW TEST");
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
    // 1. Sign in as Admin
    const { data: authData, error: aErr } = await adminClient.auth.signInWithPassword({
      email: "admin.dmhs.hyd@gmail.com",
      password: "1234",
    });
    assert(!aErr && authData?.session, "1. Admin authenticated via Supabase Auth");

    // Retrieve master class, section, academic year, and school
    const { data: school } = await adminClient.from("schools").select("id").eq("code", "DMHS-HYD").single();
    const { data: cls } = await adminClient.from("classes").select("id, name").order("grade_level", { ascending: false }).limit(1).single();
    const { data: sec } = await adminClient.from("sections").select("id, name").eq("class_id", cls.id).limit(1).single();
    const { data: ay } = await adminClient.from("academic_years").select("id, name").eq("is_current", true).single();

    assert(school && cls && sec && ay, "Master metadata (school, class, section, academic year) resolved");

    // 2. Admin creates a new student
    const tempAdmissionNum = "TEMP-TEST-001";
    const { data: newStudent, error: stdErr } = await adminClient
      .from("students")
      .insert({
        school_id: school.id,
        admission_number: tempAdmissionNum,
        first_name: "Test",
        last_name: "Student",
        full_name: "Test Student",
        email: "temp.test.001@student.dmhs.edu.in",
        student_status: "active",
        is_active: true,
        gender: "Male",
        admission_date: "2026-06-01",
      })
      .select()
      .single();

    assert(!stdErr && newStudent, `2. Student record saved in Supabase (ID: ${newStudent?.id})`);

    // 3. Map enrollment to Class and Section
    const { data: enrollment, error: enrErr } = await adminClient
      .from("student_enrollments")
      .insert({
        student_id: newStudent.id,
        class_id: cls.id,
        section_id: sec.id,
        academic_year_id: ay.id,
        roll_number: "101",
        status: "active",
        enrollment_status: "enrolled",
        is_current: true,
      })
      .select()
      .single();

    assert(!enrErr && enrollment, `3. Student enrollment mapped to ${cls.name} Sec ${sec.name}`);

    // 4. Admin creates a faculty record
    const tempEmpId = "TEMP-TCH-001";
    const { data: newFaculty, error: tchErr } = await adminClient
      .from("teachers")
      .insert({
        school_id: school.id,
        employee_id: tempEmpId,
        full_name: "Test Faculty One",
        email: "temp.faculty.001@dmhs.edu.in",
        department: "Science",
        designation: "Science Faculty",
        employment_status: "active",
        is_active: true,
      })
      .select()
      .single();

    assert(!tchErr && newFaculty, `4. Faculty record saved in Supabase (ID: ${newFaculty?.id})`);

    // 5. Admin creates a fee invoice for test student
    const tempInvNum = "INV-TEMP-TEST-001";
    const { data: newInvoice, error: invErr } = await adminClient
      .from("invoices")
      .insert({
        school_id: school.id,
        student_id: newStudent.id,
        academic_year_id: ay.id,
        invoice_number: tempInvNum,
        total_amount: 25000,
        paid_amount: 0,
        balance_amount: 25000,
        due_date: "2026-12-31",
        status: "pending",
      })
      .select()
      .single();

    assert(!invErr && newInvoice, `5. Fee invoice created for test student (Amount: Rs. ${newInvoice?.total_amount})`);

    // 6. Record a test payment against the invoice
    const tempReceiptNum = "RCP-TEMP-001";
    const { data: newPayment, error: payErr } = await adminClient
      .from("payments")
      .insert({
        receipt_number: tempReceiptNum,
        student_id: newStudent.id,
        invoice_id: newInvoice.id,
        amount: 10000,
        payment_mode: "cash",
        payment_date: new Date().toISOString(),
        remarks: "Controlled test receipt",
      })
      .select()
      .single();

    assert(!payErr && newPayment, `6. Payment of Rs. 10,000 recorded in Supabase (Receipt: ${newPayment?.receipt_number})`);

    // Update invoice paid and balance amounts
    const { data: updatedInv, error: upInvErr } = await adminClient
      .from("invoices")
      .update({
        paid_amount: 10000,
        balance_amount: 15000,
        status: "partial",
      })
      .eq("id", newInvoice.id)
      .select()
      .single();

    assert(!upInvErr && updatedInv && updatedInv.balance_amount === 15000, `7. Invoice balance updated to Rs. ${updatedInv?.balance_amount} (Status: partial)`);

    // 7. Verify round-trip persistence using an independent client
    const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    await verifyClient.auth.signInWithPassword({
      email: "admin.dmhs.hyd@gmail.com",
      password: "1234",
    });

    const { data: fetchedStudent } = await verifyClient.from("students").select("admission_number, full_name").eq("id", newStudent.id).single();
    const { data: fetchedTeacher } = await verifyClient.from("teachers").select("employee_id, full_name").eq("id", newFaculty.id).single();
    const { data: fetchedInvoice } = await verifyClient.from("invoices").select("invoice_number, balance_amount").eq("id", newInvoice.id).single();
    const { data: fetchedPayment } = await verifyClient.from("payments").select("receipt_number, amount").eq("id", newPayment.id).single();

    assert(fetchedStudent?.admission_number === tempAdmissionNum, "8. Independent client verified student in Supabase");
    assert(fetchedTeacher?.employee_id === tempEmpId, "9. Independent client verified faculty in Supabase");
    assert(fetchedInvoice?.invoice_number === tempInvNum, "10. Independent client verified invoice in Supabase");
    assert(fetchedPayment?.receipt_number === tempReceiptNum, "11. Independent client verified payment receipt in Supabase");

    // 8. Controlled Cleanup of temporary test records
    console.log("\n--- Cleaning up temporary test records ---");
    await adminClient.from("payments").delete().eq("id", newPayment.id);
    await adminClient.from("invoices").delete().eq("id", newInvoice.id);
    await adminClient.from("student_enrollments").delete().eq("id", enrollment.id);
    await adminClient.from("students").delete().eq("id", newStudent.id);
    await adminClient.from("teachers").delete().eq("id", newFaculty.id);

    // Verify operational table counts returned to 0
    const { count: finalStdCount } = await adminClient.from("students").select("*", { count: "exact", head: true });
    const { count: finalTchCount } = await adminClient.from("teachers").select("*", { count: "exact", head: true });
    const { count: finalInvCount } = await adminClient.from("invoices").select("*", { count: "exact", head: true });
    const { count: finalPayCount } = await adminClient.from("payments").select("*", { count: "exact", head: true });

    assert(finalStdCount === 0, `12. Temporary student cleaned up (Student count: ${finalStdCount})`);
    assert(finalTchCount === 0, `13. Temporary faculty cleaned up (Faculty count: ${finalTchCount})`);
    assert(finalInvCount === 0, `14. Temporary invoice cleaned up (Invoice count: ${finalInvCount})`);
    assert(finalPayCount === 0, `15. Temporary payment cleaned up (Payment count: ${finalPayCount})`);

    await adminClient.auth.signOut();
  } catch (err) {
    assert(false, `Test encountered exception: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`WORKFLOW TEST RESULT: ${passed} PASSED | ${failed} FAILED (Total: ${passed + failed})`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

runAdmissionWorkflowTest();
