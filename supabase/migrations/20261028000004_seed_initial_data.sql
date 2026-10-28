-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - SEED INITIAL DATA
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- Version: 2.0.0
-- Location: Hyderabad, Telangana, India
-- ==============================================================================

do $$
declare
  v_school_id uuid;
  v_ay_id uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid;
  v_c6 uuid; v_c7 uuid; v_c8 uuid; v_c9 uuid; v_c10 uuid;
  v_sec_10a uuid; v_sec_10b uuid;
  v_sub_eng uuid; v_sub_math uuid; v_sub_sci uuid; v_sub_soc uuid; v_sub_cs uuid;
  v_prof_admin uuid; v_prof_teacher1 uuid; v_prof_teacher2 uuid;
  v_teacher1_id uuid; v_teacher2_id uuid;
  v_student1_id uuid; v_student2_id uuid; v_student3_id uuid;
begin

  -- 1. INSERT SCHOOL
  insert into public.schools (
    name,
    code,
    affiliation_number,
    contact_email,
    contact_phone,
    address,
    timezone,
    is_active
  ) values (
    'Deccan Mission High School',
    'DMHS-HYD',
    'TS-HYD-CBSE-41092',
    'admin@deccanmission.edu.in',
    '+91 40 2456 7890',
    'Old City, Hyderabad, Telangana 500002, India',
    'Asia/Kolkata',
    true
  ) on conflict (code) do update set
    name = excluded.name,
    affiliation_number = excluded.affiliation_number
  returning id into v_school_id;

  -- 2. INSERT ACADEMIC YEARS
  insert into public.academic_years (school_id, name, start_date, end_date, is_current, status)
  values 
    (v_school_id, '2024-2025', '2024-06-01', '2025-04-30', false, 'completed'),
    (v_school_id, '2025-2026', '2025-06-01', '2026-04-30', true, 'active'),
    (v_school_id, '2026-2027', '2026-06-01', '2027-04-30', false, 'planned')
  on conflict (school_id, name) do update set is_current = excluded.is_current;

  select id into v_ay_id from public.academic_years where school_id = v_school_id and name = '2025-2026';

  -- 3. INSERT CLASSES (Grades 1 to 10)
  insert into public.classes (school_id, name, grade_level, stream) values
    (v_school_id, 'Class 1', 1, 'Primary'),
    (v_school_id, 'Class 2', 2, 'Primary'),
    (v_school_id, 'Class 3', 3, 'Primary'),
    (v_school_id, 'Class 4', 4, 'Primary'),
    (v_school_id, 'Class 5', 5, 'Primary'),
    (v_school_id, 'Class 6', 6, 'Middle'),
    (v_school_id, 'Class 7', 7, 'Middle'),
    (v_school_id, 'Class 8', 8, 'Middle'),
    (v_school_id, 'Class 9', 9, 'Secondary'),
    (v_school_id, 'Class 10', 10, 'Secondary')
  on conflict (school_id, name) do nothing;

  select id into v_c10 from public.classes where school_id = v_school_id and name = 'Class 10';
  select id into v_c9 from public.classes where school_id = v_school_id and name = 'Class 9';

  -- 4. INSERT SECTIONS
  insert into public.sections (class_id, name, room_number, capacity) values
    (v_c10, 'A', 'Room 301', 40),
    (v_c10, 'B', 'Room 302', 40),
    (v_c9, 'A', 'Room 201', 40),
    (v_c9, 'B', 'Room 202', 40)
  on conflict (class_id, name) do nothing;

  select id into v_sec_10a from public.sections where class_id = v_c10 and name = 'A';
  select id into v_sec_10b from public.sections where class_id = v_c10 and name = 'B';

  -- 5. INSERT SUBJECTS
  insert into public.subjects (school_id, name, code, department) values
    (v_school_id, 'English Core', 'ENG-101', 'Languages'),
    (v_school_id, 'Mathematics', 'MATH-201', 'Mathematics'),
    (v_school_id, 'General Science', 'SCI-301', 'Science'),
    (v_school_id, 'Social Science', 'SOC-401', 'Humanities'),
    (v_school_id, 'Computer Applications', 'CA-501', 'Computer Science'),
    (v_school_id, 'Hindi', 'HIN-102', 'Languages'),
    (v_school_id, 'Telugu', 'TEL-103', 'Languages')
  on conflict (school_id, code) do nothing;

  select id into v_sub_eng from public.subjects where school_id = v_school_id and code = 'ENG-101';
  select id into v_sub_math from public.subjects where school_id = v_school_id and code = 'MATH-201';
  select id into v_sub_sci from public.subjects where school_id = v_school_id and code = 'SCI-301';
  select id into v_sub_cs from public.subjects where school_id = v_school_id and code = 'CA-501';

  -- 6. LINK CLASS SUBJECTS
  if v_c10 is not null and v_sub_eng is not null then
    insert into public.class_subjects (class_id, subject_id, is_elective) values
      (v_c10, v_sub_eng, false),
      (v_c10, v_sub_math, false),
      (v_c10, v_sub_sci, false),
      (v_c10, v_sub_cs, false)
    on conflict (class_id, subject_id) do nothing;
  end if;

  -- 7. DOCUMENT REQUIREMENTS
  insert into public.document_requirements (school_id, title, is_mandatory, description) values
    (v_school_id, 'Transfer Certificate (TC)', true, 'Original TC from previous school with counter-signature'),
    (v_school_id, 'Birth Certificate', true, 'Issued by Municipal Corporation or competent authority'),
    (v_school_id, 'Aadhar Card Copy', true, 'Student and Guardian Aadhar Card copy'),
    (v_school_id, 'Previous Year Marksheet', true, 'Marksheet/Report card of the previous grade attended'),
    (v_school_id, 'Passport Size Photographs (4)', false, 'Recent color passport size photos with white background')
  on conflict do nothing;

  -- 8. FEE CATEGORIES & STRUCTURES
  insert into public.fee_categories (school_id, name, description) values
    (v_school_id, 'Tuition Fee', 'Quarterly tuition fee'),
    (v_school_id, 'Annual Admission Fee', 'One-time admission fee per year'),
    (v_school_id, 'Computer & Science Lab Fee', 'Bi-annual lab maintenance charge'),
    (v_school_id, 'Sports & Activities', 'Annual sports charge')
  on conflict do nothing;

  -- 9. NOTICES
  insert into public.notices (school_id, title, content, target_audience, priority, is_published, publish_date)
  values (
    v_school_id,
    'Welcome to Academic Year 2025-2026',
    'Deccan Mission High School welcomes all students, parents, and faculty to the new academic year. Orientation schedule is posted on the portal.',
    'all',
    'high',
    true,
    now()
  );

  insert into public.notices (school_id, title, content, target_audience, priority, is_published, publish_date)
  values (
    v_school_id,
    'CBSE Board Examination Registration Schedule for Class 10',
    'Final verification of student biodata and subject choice forms for CBSE Class 10 board examinations will take place next week.',
    'students',
    'urgent',
    true,
    now()
  );

  -- 10. SEED TEACHERS
  -- Teacher 1: Mrs. Fatima Zahra
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'fatima.zahra@deccanmission.edu.in', 'Fatima', 'Zahra', 'teacher', true
  ) on conflict (email) do update set role = 'teacher'
  returning id into v_prof_teacher1;

  insert into public.teachers (
    profile_id, school_id, employee_id, qualification, specialization, joining_date, contact_phone, is_active
  ) values (
    v_prof_teacher1, v_school_id, 'EMP-HYD-0101', 'M.Sc. Mathematics, B.Ed.', 'Senior Mathematics', '2020-06-01', '+91 98490 12345', true
  ) on conflict (employee_id) do nothing
  returning id into v_teacher1_id;

  -- Teacher 2: Mr. Mohammed Ali
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'mohammed.ali@deccanmission.edu.in', 'Mohammed', 'Ali', 'teacher', true
  ) on conflict (email) do update set role = 'teacher'
  returning id into v_prof_teacher2;

  insert into public.teachers (
    profile_id, school_id, employee_id, qualification, specialization, joining_date, contact_phone, is_active
  ) values (
    v_prof_teacher2, v_school_id, 'EMP-HYD-0102', 'M.Sc. Physics, M.Ed.', 'Physical Sciences & Robotics', '2019-06-01', '+91 98490 54321', true
  ) on conflict (employee_id) do nothing
  returning id into v_teacher2_id;

  -- Assign Teacher 1 to Class 10-A Mathematics
  if v_teacher1_id is not null and v_c10 is not null and v_sec_10a is not null then
    insert into public.teacher_class_assignments (teacher_id, class_id, section_id, is_class_teacher, academic_year_id)
    values (v_teacher1_id, v_c10, v_sec_10a, true, v_ay_id)
    on conflict do nothing;

    if v_sub_math is not null then
      insert into public.teacher_subject_assignments (teacher_id, class_id, section_id, subject_id, academic_year_id)
      values (v_teacher1_id, v_c10, v_sec_10a, v_sub_math, v_ay_id)
      on conflict do nothing;
    end if;
  end if;

  -- 11. SEED STUDENTS
  -- Student 1: Zeeshan Khan (Class 10-A, Roll 01)
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'zeeshan.khan@student.dmhs.edu.in', 'Zeeshan', 'Khan', 'student', true
  ) on conflict (email) do update set role = 'student'
  returning id into v_prof_admin; -- reused variable for student 1 profile

  insert into public.students (
    profile_id, school_id, admission_number, first_name, last_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0001', 'Zeeshan', 'Khan',
    '2010-04-12', 'Male', '2021-06-01', 'active',
    'Tariq Khan', 'Father', '+91 98491 11223', '+91 98491 11223',
    'O+', 'House #4-1-88, Moghalpura, Hyderabad 500002'
  ) on conflict (admission_number) do nothing
  returning id into v_student1_id;

  if v_student1_id is not null and v_c10 is not null and v_sec_10a is not null and v_ay_id is not null then
    insert into public.student_enrollments (student_id, academic_year_id, class_id, section_id, roll_number, is_current, status)
    values (v_student1_id, v_ay_id, v_c10, v_sec_10a, 1, true, 'active')
    on conflict (student_id, academic_year_id) do nothing;
  end if;

  -- Student 2: Ayesha Siddiqa (Class 10-A, Roll 02)
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'ayesha.siddiqa@student.dmhs.edu.in', 'Ayesha', 'Siddiqa', 'student', true
  ) on conflict (email) do update set role = 'student'
  returning id into v_prof_admin;

  insert into public.students (
    profile_id, school_id, admission_number, first_name, last_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0002', 'Ayesha', 'Siddiqa',
    '2010-08-25', 'Female', '2021-06-01', 'active',
    'Mirza Siddiq Baig', 'Father', '+91 98492 33445', '+91 98492 33445',
    'B+', 'Banjara Hills Rd #12, Hyderabad 500034'
  ) on conflict (admission_number) do nothing
  returning id into v_student2_id;

  if v_student2_id is not null and v_c10 is not null and v_sec_10a is not null and v_ay_id is not null then
    insert into public.student_enrollments (student_id, academic_year_id, class_id, section_id, roll_number, is_current, status)
    values (v_student2_id, v_ay_id, v_c10, v_sec_10a, 2, true, 'active')
    on conflict (student_id, academic_year_id) do nothing;
  end if;

  -- Student 3: Syed Ibrahim (Class 10-B, Roll 01)
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'syed.ibrahim@student.dmhs.edu.in', 'Syed', 'Ibrahim', 'student', true
  ) on conflict (email) do update set role = 'student'
  returning id into v_prof_admin;

  insert into public.students (
    profile_id, school_id, admission_number, first_name, last_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0003', 'Syed', 'Ibrahim',
    '2010-02-18', 'Male', '2022-06-01', 'active',
    'Syed Anwar', 'Father', '+91 98493 55667', '+91 98493 55667',
    'A+', 'Charminar East Gate, Hyderabad 500002'
  ) on conflict (admission_number) do nothing
  returning id into v_student3_id;

  if v_student3_id is not null and v_c10 is not null and v_sec_10b is not null and v_ay_id is not null then
    insert into public.student_enrollments (student_id, academic_year_id, class_id, section_id, roll_number, is_current, status)
    values (v_student3_id, v_ay_id, v_c10, v_sec_10b, 1, true, 'active')
    on conflict (student_id, academic_year_id) do nothing;
  end if;

end $$;
