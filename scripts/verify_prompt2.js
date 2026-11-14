const { createClient } = require('../frontend/node_modules/@supabase/supabase-js');
const SUPABASE_URL = 'https://snnzmgbkiiydboujublj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_';

async function runPrompt2Verification() {
  console.log('==================================================================');
  console.log('DMHS ERP MASTER EXECUTION PROMPT 2 — COMPREHENSIVE VERIFICATION');
  console.log('==================================================================');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  const loginRes = await adminClient.auth.signInWithPassword({
    email: 'admin.dmhs.hyd@gmail.com',
    password: '1234'
  });
  if (loginRes.error) throw new Error('Admin login failed: ' + loginRes.error.message);
  console.log('PASS: Admin authenticated successfully.');

  // CHECK 1: Baseline Counts Post-Reset
  console.log('\n[CHECK 1] Verifying Operational Counts are exactly 0...');
  const { count: sCount } = await adminClient.from('students').select('*', { count: 'exact', head: true });
  const { count: tCount } = await adminClient.from('teachers').select('*', { count: 'exact', head: true });
  const { count: eCount } = await adminClient.from('student_enrollments').select('*', { count: 'exact', head: true });
  console.log('  Students: ' + sCount + ', Teachers: ' + tCount + ', Enrollments: ' + eCount);
  if (sCount !== 0 || tCount !== 0 || eCount !== 0) {
    throw new Error('FAIL: Operational records count is not 0!');
  }
  console.log('  PASS: Operational records are fresh at 0.');

  // CHECK 2: Admission of Fresh Student
  console.log('\n[CHECK 2] Creating Controlled Fresh Admission (DMHS-TEST-01)...');
  const { data: school } = await adminClient.from('schools').select('id').limit(1).single();
  const { data: classRec } = await adminClient.from('classes').select('id').limit(1).single();
  const { data: secRec } = await adminClient.from('sections').select('id').limit(1).single();
  const { data: ayRec } = await adminClient.from('academic_years').select('id').limit(1).single();

  const admitRes = await adminClient.rpc('admin_admit_student', {
    p_admission_number: 'DMHS-TEST-01',
    p_full_name: 'Zayd Khan',
    p_first_name: 'Zayd',
    p_last_name: 'Khan',
    p_email: null,
    p_date_of_birth: '2012-04-10',
    p_gender: 'Male',
    p_blood_group: 'B+',
    p_guardian_name: 'Imran Khan',
    p_guardian_relationship: 'Father',
    p_guardian_phone: '+91 98490 12345',
    p_emergency_contact: '+91 98490 12345',
    p_address: 'Mehdipatnam, Hyderabad',
    p_class_id: classRec.id,
    p_section_id: secRec.id,
    p_roll_number: '01',
    p_academic_year_id: ayRec.id,
    p_admission_date: new Date().toISOString().split('T')[0],
    p_password: '1234'
  });
  if (admitRes.error) {
    console.error('Admit error details:', admitRes.error);
    throw new Error('Admit failed: ' + admitRes.error.message);
  }
  console.log('  Admit RPC result:', admitRes.data);
  const newStudentId = admitRes.data.id || admitRes.data.student_id;
  const newProfileId = admitRes.data.profile_id;
  console.log('  PASS: Fresh student admitted. ID:', newStudentId, 'Profile:', newProfileId);

  // CHECK 3: Verify Student Can Log In With Admission Number
  console.log('\n[CHECK 3] Verifying Student Login using Admission Number DMHS-TEST-01...');
  const stdClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  const stdLogin = await stdClient.auth.signInWithPassword({
    email: 'dmhs-test-01@student.dmhs.edu.in',
    password: '1234'
  });
  if (stdLogin.error) throw new Error('Student login failed: ' + stdLogin.error.message);
  console.log('  PASS: Student authenticated successfully via admission number identity!');

  // Check student isolation RLS
  const { data: visibleStudents } = await stdClient.from('students').select('id, admission_number');
  console.log('  Students visible to student DMHS-TEST-01: ' + (visibleStudents ? visibleStudents.length : 0));
  if (!visibleStudents || visibleStudents.length !== 1 || visibleStudents[0].id !== newStudentId) {
    throw new Error('FAIL: Student RLS isolation failed!');
  }
  console.log('  PASS: Student sees strictly their own profile.');

  // CHECK 4: Creating Controlled Fresh Teacher
  console.log('\n[CHECK 4] Creating Controlled Fresh Faculty Member (EMP-TEST-99)...');
  const { data: teacherProfile, error: tpErr } = await adminClient.from('profiles').insert({
    school_id: school.id,
    role: 'teacher',
    email: 'test.faculty@dmhs-test.edu',
    first_name: 'Asadullah',
    last_name: 'Farooqui',
    phone: '+91 99887 76655',
    is_active: true
  }).select().single();
  if (tpErr) throw new Error('Create teacher profile failed: ' + tpErr.message);

  const { data: teacherRec, error: trErr } = await adminClient.from('teachers').insert({
    school_id: school.id,
    profile_id: teacherProfile.id,
    employee_id: 'EMP-TEST-99',
    full_name: 'Mr. Asadullah Farooqui',
    email: 'test.faculty@dmhs-test.edu',
    department: 'Mathematics',
    designation: 'Senior Faculty',
    contact_phone: '+91 99887 76655',
    is_active: true
  }).select().single();
  if (trErr) throw new Error('Create teacher failed: ' + trErr.message);
  console.log('  PASS: Fresh faculty created. Teacher ID:', teacherRec.id);

  // CHECK 5: Permanent Delete of Student via admin_delete_student
  console.log('\n[CHECK 5] Testing Permanent Deletion of Student DMHS-TEST-01...');
  const delStdRes = await adminClient.rpc('admin_delete_student', { p_student_id: newStudentId });
  console.log('  admin_delete_student output:', delStdRes.data);
  if (!delStdRes.data.success) throw new Error('Student permanent delete failed!');

  const { data: checkStd } = await adminClient.from('students').select('id').eq('id', newStudentId);
  const { data: checkStdProf } = await adminClient.from('profiles').select('id').eq('id', newProfileId);
  if (checkStd?.length !== 0 || checkStdProf?.length !== 0) {
    throw new Error('FAIL: Student record or profile still exists!');
  }
  console.log('  PASS: Student table record and profile completely eliminated from database.');

  // Verify student can NO LONGER log in
  const postDelLogin = await stdClient.auth.signInWithPassword({
    email: 'dmhs-test-01@student.dmhs.edu.in',
    password: '1234'
  });
  if (!postDelLogin.error) throw new Error('FAIL: Deleted student was still able to authenticate!');
  console.log('  PASS: Student authentication account successfully revoked (invalid credentials).');

  // CHECK 6: Permanent Delete of Faculty via admin_delete_faculty
  console.log('\n[CHECK 6] Testing Permanent Deletion of Faculty EMP-TEST-99...');
  const delFacRes = await adminClient.rpc('admin_delete_faculty', { p_teacher_id: teacherRec.id });
  console.log('  admin_delete_faculty output:', delFacRes.data);
  if (!delFacRes.data.success) throw new Error('Faculty permanent delete failed!');

  const { data: checkFac } = await adminClient.from('teachers').select('id').eq('id', teacherRec.id);
  const { data: checkFacProf } = await adminClient.from('profiles').select('id').eq('id', teacherProfile.id);
  if (checkFac?.length !== 0 || checkFacProf?.length !== 0) {
    throw new Error('FAIL: Teacher record or profile still exists!');
  }
  console.log('  PASS: Faculty table record and profile completely eliminated from database.');

  // CHECK 7: Final Counts Verification
  console.log('\n[CHECK 7] Verifying Final Database State...');
  const { count: finalS } = await adminClient.from('students').select('*', { count: 'exact', head: true });
  const { count: finalT } = await adminClient.from('teachers').select('*', { count: 'exact', head: true });
  const { count: finalE } = await adminClient.from('student_enrollments').select('*', { count: 'exact', head: true });
  console.log('  Final Students: ' + finalS + ', Teachers: ' + finalT + ', Enrollments: ' + finalE);
  if (finalS !== 0 || finalT !== 0 || finalE !== 0) {
    throw new Error('FAIL: Final counts are not 0!');
  }
  console.log('\n==================================================================');
  console.log('ALL MASTER PROMPT 2 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('==================================================================');
}

runPrompt2Verification().catch(e => {
  console.error('VERIFICATION ERROR:', e);
  process.exit(1);
});
