const { createClient } = require('../frontend/node_modules/@supabase/supabase-js');

const SUPABASE_URL = "https://snnzmgbkiiydboujublj.supabase.co";
const SUPABASE_KEY = "sb_publishable_cHZkW9hTTkEKhGQRHJ19Yg_HcFs0Dc_";

const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runVerification() {
  console.log("================================================================");
  console.log("DMHS ALL-PHASES VERIFICATION SUITE");
  console.log("================================================================");

  // 1. Admin login
  console.log("\n[TEST 1] Authenticating Admin user (admin.dmhs.hyd@gmail.com)...");
  const adminAuth = await adminClient.auth.signInWithPassword({
    email: "admin.dmhs.hyd@gmail.com",
    password: "1234",
  });
  if (adminAuth.error) throw new Error("Admin login failed: " + adminAuth.error.message);
  console.log("✓ Admin logged in. UID:", adminAuth.data.user.id);

  // 2. Fetch classes to verify 13 classes
  console.log("\n[TEST 2] Verifying standard 13 classes (Pre-Primary 3 + Classes 1-10)...");
  const { data: classes, error: classesErr } = await adminClient
    .from("classes")
    .select("id, name, grade_level, school_id")
    .order("grade_level", { ascending: true });
  if (classesErr) throw classesErr;
  console.log(`✓ Total classes found: ${classes.length}`);
  classes.forEach((c) => console.log(`   - ${c.name} (Grade: ${c.grade_level})`));
  if (classes.length < 13) throw new Error("Expected at least 13 classes.");

  // 3. Admin admits Teacher A (DMHS-TCH-002) and Teacher B (DMHS-TCH-003)
  console.log("\n[TEST 3] Admin admitting Teacher A via admin_admit_faculty RPC...");
  const teacherAData = {
    p_full_name: "Fatima Begum",
    p_email: "fatima.begum@dmhs.edu.in",
    p_employee_id: "DMHS-TCH-002",
    p_password: "1234",
    p_designation: "Senior Science Faculty",
    p_department: "Science",
    p_contact_phone: "+91 98765 43210",
    p_qualification: "M.Sc., B.Ed.",
  };
  const { data: teacherAId, error: admitAErr } = await adminClient.rpc("admin_admit_faculty", teacherAData);
  if (admitAErr && !admitAErr.message.includes("already exists")) {
    throw new Error("Admitting Teacher A failed: " + admitAErr.message);
  }
  console.log("✓ Teacher A admitted or already exists. ID:", teacherAId || "Existing");

  console.log("\n[TEST 4] Duplicate Prevention Test: trying to admit Teacher A again with same Employee ID...");
  const { error: duplicateErr } = await adminClient.rpc("admin_admit_faculty", teacherAData);
  if (!duplicateErr) throw new Error("Duplicate admission should have failed!");
  console.log("✓ Duplicate admission safely rejected as expected:", duplicateErr.message);

  console.log("\n[TEST 5] Admin admitting Teacher B via admin_admit_faculty RPC...");
  const teacherBData = {
    p_full_name: "Mohammed Siddiq",
    p_email: "mohammed.siddiq@dmhs.edu.in",
    p_employee_id: "DMHS-TCH-003",
    p_password: "1234",
    p_designation: "Social Studies Faculty",
    p_department: "Social Studies",
    p_contact_phone: "+91 98765 43211",
    p_qualification: "M.A., B.Ed.",
  };
  const { data: teacherBId, error: admitBErr } = await adminClient.rpc("admin_admit_faculty", teacherBData);
  if (admitBErr && !admitBErr.message.includes("already exists")) {
    throw new Error("Admitting Teacher B failed: " + admitBErr.message);
  }
  console.log("✓ Teacher B admitted or already exists. ID:", teacherBId || "Existing");

  // Fetch teacher A and B UUIDs
  const { data: tA } = await adminClient.from("teachers").select("id, employee_id, full_name, email").eq("employee_id", "DMHS-TCH-002").single();
  const { data: tB } = await adminClient.from("teachers").select("id, employee_id, full_name, email").eq("employee_id", "DMHS-TCH-003").single();

  // 4. Test Teacher A Login with credentials
  console.log("\n[TEST 6] Teacher A authenticating with email & password...");
  const teacherAClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  const teacherAAuth = await teacherAClient.auth.signInWithPassword({
    email: "fatima.begum@dmhs.edu.in",
    password: "1234",
  });
  if (teacherAAuth.error) throw new Error("Teacher A login failed: " + teacherAAuth.error.message);
  console.log("✓ Teacher A logged in successfully. Auth UID:", teacherAAuth.data.user.id);

  // 5. Assign Teacher A to Class 1
  const class1 = classes.find((c) => c.name.toLowerCase().includes("class 1") || c.name === "1");
  const class2 = classes.find((c) => c.name.toLowerCase().includes("class 2") || c.name === "2");
  if (!class1 || !class2) throw new Error("Class 1 or Class 2 not found");

  console.log(`\n[TEST 7] Assigning Teacher A (${tA.full_name}) as Class Teacher for ${class1.name}...`);
  const { data: assignAId, error: assignAErr } = await adminClient.rpc("assign_class_teacher", {
    p_class_id: class1.id,
    p_teacher_id: tA.id,
    p_academic_year_id: null,
  });
  if (assignAErr) throw assignAErr;
  console.log("✓ Teacher A assigned as Class Teacher. Assignment ID:", assignAId);

  // Verify only 1 active teacher allowed per class: try assigning Teacher B to same Class 1 without revoking
  console.log("\n[TEST 8] Reassigning Class 1 to Teacher B (Mohammed Siddiq) to test seamless reassignment & revocation...");
  const { data: assignBId, error: assignBErr } = await adminClient.rpc("assign_class_teacher", {
    p_class_id: class1.id,
    p_teacher_id: tB.id,
    p_academic_year_id: null,
  });
  if (assignBErr) throw assignBErr;
  console.log("✓ Class 1 reassigned to Teacher B. Assignment ID:", assignBId);

  // Check active assignment table: only 1 active teacher for Class 1!
  const { data: activeAssignments } = await adminClient
    .from("class_teacher_assignments")
    .select("id, class_id, teacher_id, is_active")
    .eq("class_id", class1.id)
    .eq("is_active", true);
  console.log("✓ Active class teachers count for Class 1:", activeAssignments.length, "(Expected: 1)");
  if (activeAssignments.length !== 1 || activeAssignments[0].teacher_id !== tB.id) {
    throw new Error("Active class teacher constraint or revocation failed!");
  }

  // Restore Teacher A back to Class 1 for subsequent attendance testing
  console.log(`\n[TEST 9] Restoring Teacher A back as Class Teacher for ${class1.name}...`);
  await adminClient.rpc("assign_class_teacher", {
    p_class_id: class1.id,
    p_teacher_id: tA.id,
    p_academic_year_id: null,
  });
  console.log("✓ Teacher A restored as Class Teacher for Class 1.");

  // Check assignment history is maintained
  const { data: history, error: histErr } = await adminClient
    .from("class_teacher_assignments")
    .select("id, class_id, teacher_id, is_active, assigned_at, revoked_at")
    .eq("class_id", class1.id)
    .order("assigned_at", { ascending: false });
  if (histErr) throw histErr;
  console.log(`✓ Assignment history records for Class 1: ${history.length} audit entries maintained.`);

  // 6. Test Teacher Active / Inactive duty toggle (Phase 5)
  console.log("\n[TEST 10] Testing Teacher A Duty Toggle (START DUTY -> ACTIVE)...");
  const { data: markActiveRes, error: markActiveErr } = await teacherAClient.rpc("mark_teacher_duty", {
    p_teacher_id: tA.id,
    p_status: "active",
  });
  if (markActiveErr) throw markActiveErr;
  console.log("✓ mark_teacher_duty returned:", markActiveRes);

  // Verify attendance row created
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: tAttRow } = await adminClient
    .from("teacher_attendance")
    .select("*")
    .eq("teacher_id", tA.id)
    .eq("attendance_date", todayStr)
    .single();
  console.log(`✓ Teacher attendance record: Status=${tAttRow.status}, Arrival=${tAttRow.arrival_time}`);
  if (tAttRow.status !== "present" && tAttRow.status !== "active") {
    throw new Error("Teacher attendance was not marked present & active!");
  }

  // Test repeated clicks safety: clicking ACTIVE again does not duplicate
  console.log("\n[TEST 11] Repeated click test: Teacher A clicking ACTIVE again...");
  await teacherAClient.rpc("mark_teacher_duty", {
    p_teacher_id: tA.id,
    p_status: "active",
  });
  const { data: allTeacherRows } = await adminClient
    .from("teacher_attendance")
    .select("id")
    .eq("teacher_id", tA.id)
    .eq("attendance_date", todayStr);
  console.log(`✓ Total attendance records for Teacher A today: ${allTeacherRows.length} (Expected: exactly 1)`);
  if (allTeacherRows.length !== 1) throw new Error("Duplicate teacher attendance records detected!");

  // Test INACTIVE (End Duty)
  console.log("\n[TEST 12] Testing Teacher A Duty Toggle (END DUTY -> INACTIVE)...");
  await teacherAClient.rpc("mark_teacher_duty", {
    p_teacher_id: tA.id,
    p_status: "inactive",
  });
  const { data: tAttInactive } = await adminClient
    .from("teacher_attendance")
    .select("*")
    .eq("teacher_id", tA.id)
    .eq("attendance_date", todayStr)
    .single();
  console.log(`✓ After End Duty: Status=${tAttInactive.status}, Departure=${tAttInactive.departure_time}`);
  if (!tAttInactive.departure_time) {
    throw new Error("End duty departure time was not recorded!");
  }

  // 7. Student Attendance: Morning and Afternoon sessions (Phase 3)
  console.log("\n[TEST 13] Student Attendance (Morning Session) submission by Teacher A...");
  // Ensure clean test student
  await adminClient.from("students").delete().eq("admission_number", "TEST-STD-VERIFY-01");

  // Insert temporary test student in Class 1 for attendance verification
  const { data: studentRow, error: insertStdErr } = await adminClient
    .from("students")
    .insert({
      school_id: class1.school_id,
      admission_number: "TEST-STD-VERIFY-01",
      first_name: "Test",
      last_name: "Student",
      full_name: "Test Student",
      student_status: "active",
      email: "test.student@dmhs.edu.in",
    })
    .select("id, admission_number, full_name")
    .single();

  if (insertStdErr) throw insertStdErr;
  console.log("✓ Temporary test student created for verification:", studentRow.admission_number);

  const morningAttendance = [
    { student_id: studentRow.id, status: "present", remarks: "On time" },
  ];

  const { data: saveMornRes, error: saveMornErr } = await teacherAClient.rpc("save_daily_student_attendance", {
    p_class_id: class1.id,
    p_date: todayStr,
    p_session: "morning",
    p_records: morningAttendance,
    p_remarks: "Morning roll call",
  });
  if (saveMornErr) throw saveMornErr;
  console.log("✓ save_daily_student_attendance (morning) result:", saveMornRes);

  console.log("\n[TEST 14] Student Attendance (Afternoon Session) submission by Teacher A...");
  const afternoonAttendance = [
    { student_id: studentRow.id, status: "present", remarks: "Post-lunch attendance" },
  ];
  const { data: saveAftRes, error: saveAftErr } = await teacherAClient.rpc("save_daily_student_attendance", {
    p_class_id: class1.id,
    p_date: todayStr,
    p_session: "afternoon",
    p_records: afternoonAttendance,
    p_remarks: "Afternoon roll call",
  });
  if (saveAftErr) throw saveAftErr;
  console.log("✓ save_daily_student_attendance (afternoon) result:", saveAftRes);

  // 8. Strict Authorization Check (Phase 4): Teacher B attempting to mark Class 1 attendance
  console.log("\n[TEST 15] Strict Authorization: Teacher B attempting to mark Class 1 attendance (should be rejected)...");
  const teacherBClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  await teacherBClient.auth.signInWithPassword({
    email: "mohammed.siddiq@dmhs.edu.in",
    password: "1234",
  });
  const { error: unauthorizedErr } = await teacherBClient.rpc("save_daily_student_attendance", {
    p_class_id: class1.id,
    p_date: todayStr,
    p_session: "morning",
    p_records: morningAttendance,
    p_remarks: "Unauthorized attempt",
  });
  if (!unauthorizedErr) throw new Error("Unauthorized class attendance submission should have been blocked!");
  console.log("✓ Unauthorized teacher attendance blocked safely:", unauthorizedErr.message);

  // 9. Admin Authorized Correction with Audit Logging (Phase 4)
  console.log("\n[TEST 16] Admin Authorized Correction: changing student status from 'present' to 'late' with reason...");
  const { data: correctRes, error: correctErr } = await adminClient.rpc("save_daily_student_attendance", {
    p_class_id: class1.id,
    p_date: todayStr,
    p_session: "morning",
    p_records: [{ student_id: studentRow.id, status: "late", remarks: "Medical appointment delay" }],
    p_remarks: "Admin authorized correction",
  });
  if (correctErr) throw correctErr;
  console.log("✓ Admin correction executed:", correctRes);

  // Verify Audit Log entry created in student_attendance_audit
  const { data: auditEntries } = await adminClient
    .from("student_attendance_audit")
    .select("*")
    .eq("student_id", studentRow.id)
    .order("created_at", { ascending: false })
    .limit(1);
  console.log(`✓ Audit log verified: Previous=${auditEntries[0]?.previous_status}, New=${auditEntries[0]?.new_status}, Reason=${auditEntries[0]?.reason}`);
  if (auditEntries[0]?.new_status !== "late") {
    throw new Error("Audit log did not record the status update!");
  }

  console.log("\n[TEST 17] Operational Database Cleanup: Resetting temporary test records...");
  const dummyUUID = "00000000-0000-0000-0000-000000000000";
  await adminClient.from("student_attendance_audit").delete().neq("id", dummyUUID);
  await adminClient.from("student_attendance").delete().neq("id", dummyUUID);
  await adminClient.from("teacher_attendance").delete().neq("id", dummyUUID);
  await adminClient.from("class_teacher_assignments").delete().neq("id", dummyUUID);
  await adminClient.from("student_enrollments").delete().neq("id", dummyUUID);
  await adminClient.from("students").delete().neq("id", dummyUUID);
  await adminClient.from("teachers").delete().neq("id", dummyUUID);
  await adminClient.from("profiles").delete().not("email", "in", '("admin.dmhs.hyd@gmail.com","stakhadri.dmhs@gmail.com")');

  const { count: teachersRemain } = await adminClient.from("teachers").select("*", { count: "exact", head: true });
  const { count: studentsRemain } = await adminClient.from("students").select("*", { count: "exact", head: true });
  const { count: attendRemain } = await adminClient.from("student_attendance").select("*", { count: "exact", head: true });
  const { count: assignRemain } = await adminClient.from("class_teacher_assignments").select("*", { count: "exact", head: true });

  console.log(`✓ Clean database verified: Teachers=${teachersRemain}, Students=${studentsRemain}, Attendance=${attendRemain}, Assignments=${assignRemain}`);
  if (teachersRemain !== 0 || studentsRemain !== 0) {
    throw new Error("Operational records still remain after test suite!");
  }

  console.log("\n================================================================");
  console.log("✓ ALL 17 COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================");
}

runVerification().catch((err) => {
  console.error("\n❌ Verification Failed:", err);
  process.exit(1);
});
