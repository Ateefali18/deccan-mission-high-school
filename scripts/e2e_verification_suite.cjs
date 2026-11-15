const { createClient } = require('../frontend/node_modules/@supabase/supabase-js');

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const ANON_KEY = "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

async function runTests() {
  console.log("=== DMHS ERP COMPREHENSIVE E2E VERIFICATION SUITE ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Helper to create independent clients
  function makeClient() {
    return createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  // ----------------------------------------------------
  // TEST SUITE 1: Student Login Tests (Phase 4)
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Student Login Authentication & RLS Isolation ---");
  
  // Test 1.1: DMHS-0576 Login
  const client0576 = makeClient();
  const authRes0576 = await client0576.auth.signInWithPassword({
    email: "dmhs-0576@student.dmhs.edu.in",
    password: "1234"
  });
  assert(!authRes0576.error && authRes0576.data?.session, "DMHS-0576 authenticated successfully with password '1234'");

  // Verify Student 0576 isolation
  const { data: stdData0576 } = await client0576.from('students').select('id, admission_number, full_name');
  assert(stdData0576 && stdData0576.length === 1 && stdData0576[0].admission_number === 'DMHS-0576', 
    `DMHS-0576 RLS policy restricts students view strictly to self (returned ${stdData0576?.length || 0} rows)`);

  const { data: invData0576 } = await client0576.from('invoices').select('id, student_id');
  assert(invData0576 && invData0576.length === 1 && invData0576[0].student_id === stdData0576[0].id, 
    `DMHS-0576 RLS policy restricts invoices strictly to self (returned ${invData0576?.length || 0} invoice)`);

  // Test 1.2: DMHS-1382 Login
  const client1382 = makeClient();
  const authRes1382 = await client1382.auth.signInWithPassword({
    email: "dmhs-1382@student.dmhs.edu.in",
    password: "1234"
  });
  assert(!authRes1382.error && authRes1382.data?.session, "DMHS-1382 authenticated successfully with password '1234'");

  // Verify Student 1382 isolation
  const { data: stdData1382 } = await client1382.from('students').select('id, admission_number, full_name');
  assert(stdData1382 && stdData1382.length === 1 && stdData1382[0].admission_number === 'DMHS-1382', 
    `DMHS-1382 RLS policy restricts students view strictly to self (returned ${stdData1382?.length || 0} rows)`);

  const { data: invData1382 } = await client1382.from('invoices').select('id, student_id');
  assert(invData1382 && invData1382.length === 1 && invData1382[0].student_id === stdData1382[0].id, 
    `DMHS-1382 RLS policy restricts invoices strictly to self (returned ${invData1382?.length || 0} invoice)`);

  // Test 1.3: Invalid password
  const badClient = makeClient();
  const badAuth = await badClient.auth.signInWithPassword({
    email: "dmhs-0576@student.dmhs.edu.in",
    password: "wrong_password_xyz"
  });
  assert(badAuth.error !== null, "Invalid password rejected as expected");

  // Test 1.4: Non-existent student
  const nonExistent = await badClient.auth.signInWithPassword({
    email: "dmhs-9999@student.dmhs.edu.in",
    password: "1234"
  });
  assert(nonExistent.error !== null, "Non-existent student login rejected as expected");

  // ----------------------------------------------------
  // TEST SUITE 2: Admin Authentication & Global Visibility
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Admin Authentication & Cross-Module Queries ---");
  const adminClient = makeClient();
  const adminAuth = await adminClient.auth.signInWithPassword({
    email: "admin.dmhs.hyd@gmail.com",
    password: "1234"
  });
  assert(!adminAuth.error && adminAuth.data?.session, "Admin authenticated successfully with password '1234'");

  // Admin sees both students
  const { data: allStudents, error: allStdErr } = await adminClient
    .from('students')
    .select('id, admission_number, full_name, is_active')
    .eq('is_active', true);
  assert(!allStdErr && allStudents && allStudents.length === 2, `Admin sees exactly 2 active students (found: ${allStudents?.length})`);

  // Admin sees invoices for all students without duplicates
  const { data: allInvoices, error: allInvErr } = await adminClient
    .from('invoices')
    .select(`
      id, invoice_number, student_id, total_amount, paid_amount, balance_amount, status,
      students (id, admission_number, full_name)
    `)
    .order('created_at', { ascending: false });

  assert(!allInvErr && allInvoices && allInvoices.length === 2, `Admin sees exactly 2 canonical invoices (found: ${allInvoices?.length})`);
  
  const studentIds = (allInvoices || []).map(i => i.student_id);
  const uniqueStudentIds = new Set(studentIds);
  assert(studentIds.length === uniqueStudentIds.size, 
    `No duplicate student invoices in database (${studentIds.length} invoices, ${uniqueStudentIds.size} unique students)`);

  // ----------------------------------------------------
  // TEST SUITE 3: Class Management Counts (Phase 5)
  // ----------------------------------------------------
  console.log("\n--- TEST 3: Class Management Synchronization & Counts ---");
  const { data: classes, error: classErr } = await adminClient
    .from('classes')
    .select('id, name, grade_level')
    .order('grade_level', { ascending: true });

  assert(!classErr && classes && classes.length === 13, `All 13 standard classes retrieved from Supabase (found: ${classes?.length || 0})`);

  const { data: enrollments, error: enrErr } = await adminClient
    .from('student_enrollments')
    .select('id, student_id, class_id, status, classes(name)')
    .eq('status', 'active');

  assert(!enrErr && enrollments, "Fetched active enrollments");
  const class10Enrollments = (enrollments || []).filter(e => e.classes?.name === 'Class 10');
  assert(class10Enrollments.length === 2, `Class 10 active student count is exactly 2 in database (found: ${class10Enrollments.length})`);

  const otherClassEnrollments = (enrollments || []).filter(e => e.classes?.name !== 'Class 10');
  assert(otherClassEnrollments.length === 0, `All other 12 classes have 0 active enrollments as expected (found: ${otherClassEnrollments.length})`);

  // ----------------------------------------------------
  // TEST SUITE 4: Attendance Isolation (Phase 6)
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Attendance Roster Isolation ---");
  const nurseryClass = (classes || []).find(c => c.name.toLowerCase() === 'nursery');
  if (nurseryClass) {
    const { data: nurseryStudents } = await adminClient
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', nurseryClass.id)
      .eq('status', 'active');
    assert((nurseryStudents || []).length === 0, "Nursery class returns exactly 0 students (eliminated whole-school fallback)");
  }

  const class10 = (classes || []).find(c => c.name === 'Class 10');
  if (class10) {
    const { data: class10Roster } = await adminClient
      .from('student_enrollments')
      .select('student_id, students(admission_number, full_name)')
      .eq('class_id', class10.id)
      .eq('status', 'active');
    assert((class10Roster || []).length === 2, `Class 10 roster returns exactly 2 enrolled students: DMHS-1382 and DMHS-0576`);
  }

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
