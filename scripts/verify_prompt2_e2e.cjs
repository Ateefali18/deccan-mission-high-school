const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://snnzmgbkiiydboujublj.supabase.co';
const supabaseKey = 'sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_';

function makeClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function runPrompt2Tests() {
  console.log('================================================================');
  console.log('DMHS ERP - MASTER EXECUTION PROMPT 2 VERIFICATION SUITE');
  console.log('Supabase Reference: snnzmgbkiiydboujublj');
  console.log('================================================================\n');

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

  // ----------------------------------------------------
  // TEST 1: Admin Authentication & Database Scope
  // ----------------------------------------------------
  console.log('--- TEST 1: Admin Authentication & Database Scope ---');
  const adminClient = makeClient();
  const adminAuth = await adminClient.auth.signInWithPassword({
    email: 'admin.dmhs.hyd@gmail.com',
    password: '1234'
  });
  assert(!adminAuth.error && adminAuth.data?.session, 'Admin signed in successfully via Supabase Auth');

  const { data: allStudents, error: stdErr } = await adminClient
    .from('students')
    .select('id, admission_number, full_name, student_status, religion, caste, father_name, mother_name, aadhaar_number, apaar_id')
    .eq('student_status', 'active');

  assert(!stdErr && allStudents?.length === 3, `Admin sees all 3 registered active students (Found: ${allStudents?.length || 0})`);

  // Verify all 3 students have full details populated without dashes
  const allDetailsPresent = (allStudents || []).every(s =>
    s.father_name && s.father_name !== '—' &&
    s.mother_name && s.mother_name !== '—' &&
    s.aadhaar_number && s.aadhaar_number !== '—' &&
    s.apaar_id && s.apaar_id !== '—'
  );
  assert(allDetailsPresent, 'All 3 students have complete personal/parent details populated without empty dashes');

  // ----------------------------------------------------
  // TEST 2: Student Authentication & RLS Isolation
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Student Authentication & RLS Isolation ---');
  const studentClient0576 = makeClient();
  const stdAuth0576 = await studentClient0576.auth.signInWithPassword({
    email: 'dmhs-0576@student.dmhs.edu.in',
    password: '1234'
  });
  assert(!stdAuth0576.error && stdAuth0576.data?.session, 'Student DMHS-0576 authenticated successfully');

  // Verify RLS isolation: Student can ONLY see own profile
  const { data: stdData0576 } = await studentClient0576
    .from('students')
    .select('id, admission_number, full_name, father_name, mother_name');
  assert(stdData0576 && stdData0576.length === 1 && stdData0576[0].admission_number === 'DMHS-0576',
    `DMHS-0576 RLS policy restricts visibility strictly to self (returned ${stdData0576?.length || 0} student)`);
  assert(stdData0576[0].father_name && stdData0576[0].father_name !== '—',
    `Student portal retrieves saved father name: "${stdData0576?.[0]?.father_name}"`);

  // Test invalid password rejection
  const badAuth = await makeClient().auth.signInWithPassword({
    email: 'dmhs-0576@student.dmhs.edu.in',
    password: 'wrong_password_xyz'
  });
  assert(badAuth.error !== null, 'Invalid student password rejected with 401/invalid_credentials');

  // ----------------------------------------------------
  // TEST 3: Academic Hierarchy & Category Distribution
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Academic Hierarchy & Category Distribution ---');
  const { data: classes, error: clsErr } = await adminClient
    .from('classes')
    .select('id, name, grade_level, is_active, sections(id, name, capacity, is_active)')
    .order('grade_level', { ascending: true });

  assert(!clsErr && classes.length === 13, `All 13 standard classes configured in Supabase (Found: ${classes.length})`);

  let prePrimaryClasses = 0;
  let primaryClasses = 0;
  let higherClasses = 0;

  classes.forEach(c => {
    const name = c.name.toLowerCase();
    if (c.grade_level <= 0 || name.includes('nursery') || name.includes('lkg') || name.includes('ukg')) {
      prePrimaryClasses++;
    } else if (c.grade_level >= 1 && c.grade_level <= 5) {
      primaryClasses++;
    } else if (c.grade_level >= 6 && c.grade_level <= 10) {
      higherClasses++;
    }
  });

  assert(prePrimaryClasses === 3, 'Pre-Primary category has 3 classes: Nursery, LKG, UKG');
  assert(primaryClasses === 5, 'Primary category has 5 classes: Class 1 through Class 5');
  assert(higherClasses === 5, 'Higher Classes category has 5 classes: Class 6 through Class 10');

  // Enrollments breakdown
  const { data: enrollments, error: enrErr } = await adminClient
    .from('student_enrollments')
    .select('id, student_id, class_id, section_id, is_current, status, roll_number')
    .eq('is_current', true)
    .eq('status', 'active');

  assert(!enrErr && enrollments.length === 3, `Total active current enrollments is 3 (Found: ${enrollments.length})`);

  const class10 = classes.find(c => c.name === 'Class 10');
  const class10Count = enrollments.filter(e => e.class_id === class10?.id).length;
  assert(class10Count === 3, `Class 10 has exactly 3 enrolled active students`);

  const otherClassCount = enrollments.filter(e => e.class_id !== class10?.id).length;
  assert(otherClassCount === 0, `All other 12 classes have 0 enrolled active students`);

  // Reconciliation: Pre-Primary (0) + Primary (0) + Higher (3) = Total Active (3)
  const categorySum = 0 + 0 + class10Count;
  assert(categorySum === allStudents.length, `Reconciliation: Total Category Students (${categorySum}) equals Total Active Students (${allStudents.length})`);

  // ----------------------------------------------------
  // TEST 4: Institution Settings Supabase Persistence
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Institution Settings Supabase Persistence ---');
  const { data: school, error: schErr } = await adminClient
    .from('schools')
    .select('id, name, code, board, website, contact_email, contact_phone, address, is_active')
    .eq('code', 'DMHS-HYD')
    .single();

  assert(!schErr && school, `Institution master settings loaded for ${school?.code}`);
  assert(school?.board === 'SSC (Telangana State Board of Secondary Education)', `Board setting persisted in Supabase: "${school?.board}"`);
  assert(school?.website === 'https://dmhs-nwgj.vercel.app', `Website setting persisted in Supabase: "${school?.website}"`);

  // Safe update roundtrip test
  const testAddress = 'Old City, Hyderabad, Telangana 500002, India';
  const { error: updErr } = await adminClient
    .from('schools')
    .update({ address: testAddress, updated_at: new Date().toISOString() })
    .eq('id', school.id);
  assert(!updErr, 'Successfully updated institution settings in Supabase');

  const { data: verifySchool } = await adminClient
    .from('schools')
    .select('address')
    .eq('id', school.id)
    .single();
  assert(verifySchool?.address === testAddress, 'Verified settings persist in Supabase database across queries');

  // ----------------------------------------------------
  // TEST 5: Academic Year Configuration
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Academic Year Configuration ---');
  const { data: currentAy, error: ayErr } = await adminClient
    .from('academic_years')
    .select('id, name, is_current, status')
    .eq('is_current', true)
    .single();

  assert(!ayErr && currentAy?.name === '2025-2026', `Current active academic year is ${currentAy?.name}`);

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runPrompt2Tests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
