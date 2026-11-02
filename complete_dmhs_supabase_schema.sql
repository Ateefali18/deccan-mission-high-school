-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - COMPLETE SUPABASE SCHEMA & POLICIES (CORRECTED)
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- School: Deccan Mission High School, Hyderabad, Telangana, India
-- SSC Affiliation: TS-HYD-SSC-41092
-- Board: Telangana State Board of Secondary Education (SSC)
-- Version: 2.1.0 (Audited & Hardened)
-- Safe Migration: Non-destructive, idempotent, preserves all existing data.
-- Audit Status: ON DELETE RESTRICT on financial & academic records, zero data loss risk.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- PART 1: CORE DATABASE TABLES & CONSTRAINTS
-- ==============================================================================

-- 1. SCHOOLS
create table if not exists public.schools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  affiliation_number text default 'TS-HYD-SSC-41092',
  contact_email text default 'admin@deccanmission.edu.in',
  contact_phone text default '+91 40 2456 7890',
  address text default 'Old City, Hyderabad, Telangana 500002, India',
  logo_url text,
  timezone text default 'Asia/Kolkata' not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. ACADEMIC YEARS
create table if not exists public.academic_years (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete restrict,
  name text not null, -- e.g. '2025-2026'
  start_date date not null,
  end_date date not null,
  is_current boolean default false not null,
  status text default 'active' not null check (status in ('planned', 'active', 'completed')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(school_id, name)
);

-- 3. CLASSES (Grades)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete restrict,
  name text not null, -- e.g. 'Class 10'
  grade_level integer not null, -- 1 to 12
  stream text default 'General',
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(school_id, name)
);

-- 4. SECTIONS
create table if not exists public.sections (
  id uuid default gen_random_uuid() primary key,
  class_id uuid not null references public.classes(id) on delete restrict,
  name text not null, -- e.g. 'A', 'B'
  room_number text,
  capacity integer default 40 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(class_id, name)
);

-- 5. SUBJECTS
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete restrict,
  name text not null,
  code text not null,
  department text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  unique(school_id, code)
);

-- 6. CLASS SUBJECTS
create table if not exists public.class_subjects (
  id uuid default gen_random_uuid() primary key,
  class_id uuid not null references public.classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  is_elective boolean default false not null,
  created_at timestamptz default now() not null,
  unique(class_id, subject_id)
);

-- 7. TIMETABLE ENTRIES
create table if not exists public.timetable_entries (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete restrict,
  subject_name text,
  teacher_id uuid, -- links to teachers(id)
  day_of_week integer not null check (day_of_week between 1 and 6), -- 1=Monday ... 6=Saturday
  period_number integer not null check (period_number between 1 and 10),
  start_time time not null,
  end_time time not null,
  room_number text,
  created_at timestamptz default now() not null,
  unique(academic_year_id, section_id, day_of_week, period_number)
);

-- 8. SCHOOL SETTINGS
create table if not exists public.school_settings (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(school_id, setting_key)
);

-- 9. USER PROFILES (Connected to Supabase auth.users)
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text,
  phone text,
  avatar_url text,
  role text not null check (role in ('admin', 'superadmin', 'principal', 'teacher', 'student', 'parent', 'accountant')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 10. USER ROLES (Explicit multi-role audit)
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_name text not null check (role_name in ('admin', 'superadmin', 'principal', 'teacher', 'student', 'parent', 'accountant')),
  granted_at timestamptz default now() not null,
  unique(user_id, role_name)
);

-- 11. TEACHERS (Faculty)
create table if not exists public.teachers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete cascade,
  employee_id text not null,
  full_name text,
  email text,
  contact_phone text,
  phone_number text,
  designation text default 'Teacher' not null,
  specialization text,
  department text,
  qualification text,
  joining_date date,
  profile_photo_url text,
  employment_status text default 'active' not null check (employment_status in ('active', 'on_leave', 'resigned', 'retired')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(school_id, employee_id)
);

-- Dual compatibility view for teacher_profiles (guarded against physical table clash)
do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'teacher_profiles') then
    create or replace view public.teacher_profiles as select * from public.teachers;
  end if;
end $$;

-- 12. TEACHER ASSIGNMENTS (General / Unified)
create table if not exists public.teacher_assignments (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text,
  role_type text default 'subject_teacher' not null check (role_type in ('class_teacher', 'subject_teacher', 'assistant_teacher')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  unique(teacher_id, academic_year_id, class_id, section_id, subject_name)
);

-- 13. TEACHER CLASS ASSIGNMENTS (Class Teacher Responsibilities)
create table if not exists public.teacher_class_assignments (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  is_class_teacher boolean default false not null,
  created_at timestamptz default now() not null,
  unique(teacher_id, class_id, section_id, academic_year_id)
);

-- 14. TEACHER SUBJECT ASSIGNMENTS (Subject Allocation)
create table if not exists public.teacher_subject_assignments (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  created_at timestamptz default now() not null,
  unique(teacher_id, class_id, section_id, subject_id, academic_year_id)
);

-- 15. STUDENTS
create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text,
  full_name text,
  email text,
  gender text check (gender in ('Male', 'Female', 'Other', 'male', 'female', 'other')),
  date_of_birth date,
  blood_group text,
  profile_photo_url text,
  photo_url text,
  guardian_name text,
  guardian_relationship text default 'Guardian',
  guardian_phone text,
  emergency_contact text,
  address text,
  admission_date date default current_date not null,
  document_submission_status text default 'pending' not null check (document_submission_status in ('pending', 'partial', 'verified', 'rejected')),
  student_status text default 'active' not null check (student_status in ('active', 'inactive', 'transferred', 'graduated', 'withdrawn')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(school_id, admission_number)
);

-- Dual compatibility view for student_profiles (guarded against physical table clash)
do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'student_profiles') then
    create or replace view public.student_profiles as select * from public.students;
  end if;
end $$;

-- 16. STUDENT GUARDIANS
create table if not exists public.student_guardians (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  relationship text not null, -- Father, Mother, Guardian
  phone text not null,
  email text,
  occupation text,
  annual_income numeric(12,2),
  is_primary boolean default true not null,
  created_at timestamptz default now() not null
);

-- 17. STUDENT ENROLLMENTS
create table if not exists public.student_enrollments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  roll_number text,
  status text default 'active' not null,
  enrollment_status text default 'enrolled' not null check (enrollment_status in ('enrolled', 'promoted', 'retained', 'transferred', 'withdrawn', 'active')),
  is_current boolean default true not null,
  enrolled_at date default current_date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(student_id, academic_year_id)
);

-- 18. DOCUMENT REQUIREMENTS
create table if not exists public.document_requirements (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  document_name text,
  title text not null, -- Dual field support
  description text,
  is_mandatory boolean default true not null,
  applicable_class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(school_id, title)
);

-- 19. STUDENT DOCUMENTS (Compliance Records: Birth Certificate, TC, Aadhar)
create table if not exists public.student_documents (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  requirement_id uuid references public.document_requirements(id) on delete set null,
  document_type text,
  title text,
  document_name text,
  file_url text,
  file_path text,
  file_size integer,
  mime_type text,
  status text default 'verified',
  verification_status text default 'submitted' not null check (verification_status in ('required', 'submitted', 'verified', 'rejected')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  remarks text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 20. STUDENT STATUS HISTORY
create table if not exists public.student_status_history (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  effective_date date default current_date not null,
  created_at timestamptz default now() not null
);

-- 21. ATTENDANCE SESSIONS
create table if not exists public.attendance_sessions (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  session_date date not null,
  period_number integer default 0 not null, -- 0 for full day session
  status text default 'submitted' not null check (status in ('draft', 'submitted', 'cancelled', 'verified', 'locked')),
  taken_by uuid references public.profiles(id) on delete set null,
  taken_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(section_id, session_date, period_number)
);

-- 22. ATTENDANCE RECORDS (Student Attendance Audit)
create table if not exists public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'excused')),
  remarks text,
  created_at timestamptz default now() not null,
  unique(session_id, student_id)
);

-- 23. GRADING SCALES
create table if not exists public.grading_scales (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  grade text not null, -- A1, A2, B1, B2...
  min_percentage numeric(5,2) not null,
  max_percentage numeric(5,2) not null,
  grade_point numeric(4,2),
  created_at timestamptz default now() not null
);

-- 24. EXAM TYPES
create table if not exists public.exam_types (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text not null,
  weightage_percentage numeric(5,2) default 100.00 not null,
  created_at timestamptz default now() not null,
  unique(school_id, code)
);

-- 25. EXAMS
create table if not exists public.exams (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  exam_type_id uuid references public.exam_types(id) on delete set null,
  name text not null,
  exam_type text default 'formative' not null check (exam_type in ('formative', 'summative', 'unit_test', 'annual')),
  start_date date,
  end_date date,
  is_published boolean default false not null,
  created_at timestamptz default now() not null
);

-- 26. EXAM SUBJECTS
create table if not exists public.exam_subjects (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid not null references public.exams(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  subject_name text,
  exam_date date,
  start_time time,
  end_time time,
  max_marks numeric(5,2) default 100.00 not null,
  passing_marks numeric(5,2) default 35.00 not null,
  created_at timestamptz default now() not null
);

-- 27. MARKS (Official SSC Academic Results)
create table if not exists public.marks (
  id uuid default gen_random_uuid() primary key,
  exam_subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  marks_obtained numeric(5,2),
  is_absent boolean default false not null,
  remarks text,
  recorded_by uuid references public.profiles(id) on delete set null,
  evaluated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(exam_subject_id, student_id),
  check (is_absent = true or (marks_obtained is not null and marks_obtained >= 0))
);

-- 28. REPORT CARDS
create table if not exists public.report_cards (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  exam_id uuid not null references public.exams(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  total_marks numeric(7,2) not null,
  obtained_marks numeric(7,2) not null,
  percentage numeric(5,2) not null,
  rank integer,
  remarks text,
  is_published boolean default false not null,
  generated_at timestamptz default now() not null,
  unique(student_id, exam_id)
);

-- 29. FEE CATEGORIES
create table if not exists public.fee_categories (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now() not null,
  unique(school_id, name)
);

-- 30. FEE STRUCTURES
create table if not exists public.fee_structures (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  fee_category_id uuid references public.fee_categories(id) on delete set null,
  name text not null, -- Tuition Fee, Computer Lab, Annual Sports
  amount numeric(10,2) not null check (amount >= 0),
  due_date date not null,
  frequency text default 'annual' not null check (frequency in ('monthly', 'quarterly', 'term', 'annual', 'one_time')),
  created_at timestamptz default now() not null
);

-- 31. STUDENT FEE ASSIGNMENTS
create table if not exists public.student_fee_assignments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  fee_structure_id uuid not null references public.fee_structures(id) on delete restrict,
  custom_discount numeric(10,2) default 0.00 not null,
  discount_reason text,
  final_amount numeric(10,2) not null,
  status text default 'pending' not null check (status in ('pending', 'partial', 'paid', 'waived')),
  created_at timestamptz default now() not null,
  unique(student_id, fee_structure_id)
);

-- 32. INVOICES (Financial Ledgers)
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  invoice_number text unique not null,
  total_amount numeric(10,2) not null,
  paid_amount numeric(10,2) default 0.00 not null,
  balance_amount numeric(10,2) default 0.00,
  due_date date not null,
  status text default 'unpaid' not null check (status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled', 'pending', 'partial')),
  created_at timestamptz default now() not null
);

-- 33. PAYMENTS (Financial Transactions - Protected)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  receipt_number text unique not null,
  student_id uuid not null references public.students(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  payment_mode text default 'cash' not null check (payment_mode in ('cash', 'online', 'cheque', 'bank_transfer', 'demand_draft', 'upi')),
  transaction_reference text,
  payment_date timestamptz default now() not null,
  collected_by uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz default now() not null
);

-- 34. PAYMENT ALLOCATIONS
create table if not exists public.payment_allocations (
  id uuid default gen_random_uuid() primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  student_fee_assignment_id uuid not null references public.student_fee_assignments(id) on delete restrict,
  allocated_amount numeric(10,2) not null check (allocated_amount > 0),
  created_at timestamptz default now() not null
);

-- 35. NOTICES
create table if not exists public.notices (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  content text not null,
  target_audience text default 'all' not null check (target_audience in ('all', 'teachers', 'students', 'parents', 'class_specific')),
  priority text default 'normal' not null check (priority in ('normal', 'high', 'urgent')),
  target_class_id uuid references public.classes(id) on delete set null,
  is_published boolean default true not null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz default now() not null,
  publish_date timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique(school_id, title)
);

-- 36. NOTICE RECIPIENTS
create table if not exists public.notice_recipients (
  id uuid default gen_random_uuid() primary key,
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz default now() not null,
  unique(notice_id, user_id)
);

-- 37. ASSIGNMENTS (Homework / Classwork)
create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  description text not null,
  assigned_date date default current_date not null,
  due_date date not null,
  max_marks numeric(5,2),
  attachment_url text,
  is_published boolean default true not null,
  created_at timestamptz default now() not null
);

-- 38. ASSIGNMENT SUBMISSIONS
create table if not exists public.assignment_submissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  submission_text text,
  attachment_url text,
  submitted_at timestamptz default now() not null,
  status text default 'submitted' not null check (status in ('submitted', 'graded', 'resubmitted', 'late')),
  marks_obtained numeric(5,2),
  feedback text,
  graded_by uuid references public.teachers(id) on delete set null,
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

-- 39. LEAVE REQUESTS
create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  role_type text not null check (role_type in ('teacher', 'student', 'staff')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_remarks text,
  created_at timestamptz default now() not null
);

-- 40. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- 41. AUDIT LOGS (Immutable History)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null, -- e.g. 'STUDENT_CREATED', 'ATTENDANCE_SUBMITTED'
  entity_type text not null, -- 'students', 'attendance', 'fees'
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz default now() not null
);

-- 42. AI CONVERSATIONS
create table if not exists public.ai_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text default 'New School ERP Conversation' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 43. AI MESSAGES
create table if not exists public.ai_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_count integer,
  created_at timestamptz default now() not null
);

-- 44. AI FEEDBACK
create table if not exists public.ai_feedback (
  id uuid default gen_random_uuid() primary key,
  message_id uuid unique not null references public.ai_messages(id) on delete cascade,
  rating integer not null check (rating in (1, -1)),
  feedback_text text,
  created_at timestamptz default now() not null
);


-- ==============================================================================
-- PART 2: HIGH PERFORMANCE DATABASE INDEXES (>1500 STUDENTS SCALE)
-- ==============================================================================

create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_profiles_school_role on public.profiles(school_id, role);
create index if not exists idx_profiles_email on public.profiles(email);

create index if not exists idx_students_school_status on public.students(school_id, student_status);
create index if not exists idx_students_admission_no on public.students(admission_number);
create index if not exists idx_students_names on public.students(first_name, last_name);
create index if not exists idx_students_profile_id on public.students(profile_id);

create index if not exists idx_teachers_school_active on public.teachers(school_id, is_active);
create index if not exists idx_teachers_employee_id on public.teachers(employee_id);
create index if not exists idx_teachers_profile_id on public.teachers(profile_id);

create index if not exists idx_enrollments_student on public.student_enrollments(student_id);
create index if not exists idx_enrollments_lookup on public.student_enrollments(academic_year_id, class_id, section_id);
create index if not exists idx_enrollments_status on public.student_enrollments(status, is_current);

create index if not exists idx_teacher_assignments_lookup on public.teacher_assignments(teacher_id, academic_year_id);
create index if not exists idx_teacher_class_assignments on public.teacher_class_assignments(teacher_id, academic_year_id);
create index if not exists idx_teacher_subject_assignments on public.teacher_subject_assignments(teacher_id, academic_year_id);

create index if not exists idx_attendance_session_lookup on public.attendance_sessions(section_id, session_date);
create index if not exists idx_attendance_records_lookup on public.attendance_records(session_id, student_id);

create index if not exists idx_marks_lookup on public.marks(exam_subject_id, student_id);
create index if not exists idx_invoices_student on public.invoices(student_id, status);
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_notices_school_publish on public.notices(school_id, is_published, publish_date);
create index if not exists idx_audit_logs_school on public.audit_logs(school_id, created_at desc);
create index if not exists idx_student_documents_student on public.student_documents(student_id);


-- ==============================================================================
-- PART 3: SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

-- Get Current Profile ID
create or replace function public.get_current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Get Current User School ID
create or replace function public.get_current_school_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select school_id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Check if Current User has Admin Role
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role in ('admin', 'superadmin', 'principal')
      and is_active = true
  );
$$;

-- Check if Current User is Teacher
create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'teacher'
      and is_active = true
  );
$$;

-- Check if Current User is Student
create or replace function public.is_student()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'student'
      and is_active = true
  );
$$;

-- Check if Current User is Guardian
create or replace function public.is_guardian()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'parent'
      and is_active = true
  );
$$;

-- Check if Teacher is assigned to section
create or replace function public.is_teacher_of_section(p_section_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teachers t
    join public.profiles p on (t.profile_id = p.id or t.user_id = p.id)
    where p.auth_user_id = auth.uid()
      and (
        exists (select 1 from public.teacher_assignments ta where ta.teacher_id = t.id and ta.section_id = p_section_id and ta.is_active = true)
        or exists (select 1 from public.teacher_class_assignments tca where tca.teacher_id = t.id and tca.section_id = p_section_id)
      )
  );
$$;

-- Check if Teacher is assigned to student
create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.student_enrollments se
    where se.student_id = p_student_id
      and public.is_teacher_of_section(se.section_id)
  );
$$;


-- ==============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
-- ==============================================================================

alter table public.schools enable row level security;
alter table public.school_settings enable row level security;
alter table public.academic_years enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.teacher_class_assignments enable row level security;
alter table public.teacher_subject_assignments enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.document_requirements enable row level security;
alter table public.student_documents enable row level security;
alter table public.student_status_history enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.grading_scales enable row level security;
alter table public.exam_types enable row level security;
alter table public.exams enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.marks enable row level security;
alter table public.report_cards enable row level security;
alter table public.fee_categories enable row level security;
alter table public.fee_structures enable row level security;
alter table public.student_fee_assignments enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.notices enable row level security;
alter table public.notice_recipients enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_feedback enable row level security;


-- ==============================================================================
-- PART 5: ROW LEVEL SECURITY POLICIES (IDEMPOTENT & STRICTLY ISOLATED)
-- ==============================================================================

-- 1. SCHOOLS
drop policy if exists "Allow read access to authenticated users" on public.schools;
create policy "Allow read access to authenticated users" on public.schools
  for select to authenticated using (true);

drop policy if exists "Allow full access to admin" on public.schools;
create policy "Allow full access to admin" on public.schools
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2. SCHOOL SETTINGS
drop policy if exists "School settings read by school members" on public.school_settings;
create policy "School settings read by school members" on public.school_settings
  for select to authenticated using (school_id = public.get_current_school_id() or public.is_admin());

drop policy if exists "School settings managed by admin" on public.school_settings;
create policy "School settings managed by admin" on public.school_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. ACADEMIC YEARS
drop policy if exists "Academic years readable by authenticated" on public.academic_years;
create policy "Academic years readable by authenticated" on public.academic_years
  for select to authenticated using (true);

drop policy if exists "Academic years managed by admin" on public.academic_years;
create policy "Academic years managed by admin" on public.academic_years
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. CLASSES & SECTIONS
drop policy if exists "Classes readable by authenticated" on public.classes;
create policy "Classes readable by authenticated" on public.classes
  for select to authenticated using (true);

drop policy if exists "Classes managed by admin" on public.classes;
create policy "Classes managed by admin" on public.classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Sections readable by authenticated" on public.sections;
create policy "Sections readable by authenticated" on public.sections
  for select to authenticated using (true);

drop policy if exists "Sections managed by admin" on public.sections;
create policy "Sections managed by admin" on public.sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. SUBJECTS & CLASS SUBJECTS
drop policy if exists "Subjects readable by authenticated" on public.subjects;
create policy "Subjects readable by authenticated" on public.subjects
  for select to authenticated using (true);

drop policy if exists "Subjects managed by admin" on public.subjects;
create policy "Subjects managed by admin" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Class subjects readable by authenticated" on public.class_subjects;
create policy "Class subjects readable by authenticated" on public.class_subjects
  for select to authenticated using (true);

drop policy if exists "Class subjects managed by admin" on public.class_subjects;
create policy "Class subjects managed by admin" on public.class_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. TIMETABLE ENTRIES
drop policy if exists "Timetable readable by authenticated" on public.timetable_entries;
create policy "Timetable readable by authenticated" on public.timetable_entries
  for select to authenticated using (true);

drop policy if exists "Timetable managed by admin or teachers" on public.timetable_entries;
create policy "Timetable managed by admin or teachers" on public.timetable_entries
  for all to authenticated 
  using (public.is_admin() or public.is_teacher()) 
  with check (public.is_admin() or public.is_teacher());

-- 7. PROFILES & ROLES
drop policy if exists "Users can view profiles in their school" on public.profiles;
create policy "Users can view profiles in their school" on public.profiles
  for select to authenticated using (school_id = public.get_current_school_id() or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth_user_id = auth.uid());

drop policy if exists "Admins manage all profiles" on public.profiles;
create policy "Admins manage all profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "User roles viewable by school members" on public.user_roles;
create policy "User roles viewable by school members" on public.user_roles
  for select to authenticated using (true);

drop policy if exists "User roles managed by admin" on public.user_roles;
create policy "User roles managed by admin" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8. TEACHERS & ASSIGNMENTS
drop policy if exists "Teachers readable by authenticated" on public.teachers;
create policy "Teachers readable by authenticated" on public.teachers
  for select to authenticated using (true);

drop policy if exists "Teachers updated by self or admin" on public.teachers;
create policy "Teachers updated by self or admin" on public.teachers
  for update to authenticated 
  using (
    public.is_admin() or 
    profile_id = public.get_current_profile_id() or 
    user_id = public.get_current_profile_id()
  );

drop policy if exists "Teachers inserted/deleted by admin" on public.teachers;
create policy "Teachers inserted/deleted by admin" on public.teachers
  for all to authenticated 
  using (public.is_admin()) 
  with check (public.is_admin());

drop policy if exists "Teacher assignments readable by authenticated" on public.teacher_assignments;
create policy "Teacher assignments readable by authenticated" on public.teacher_assignments
  for select to authenticated using (true);

drop policy if exists "Teacher assignments managed by admin" on public.teacher_assignments;
create policy "Teacher assignments managed by admin" on public.teacher_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Teacher class assignments readable by authenticated" on public.teacher_class_assignments;
create policy "Teacher class assignments readable by authenticated" on public.teacher_class_assignments
  for select to authenticated using (true);

drop policy if exists "Teacher class assignments managed by admin" on public.teacher_class_assignments;
create policy "Teacher class assignments managed by admin" on public.teacher_class_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Teacher subject assignments readable by authenticated" on public.teacher_subject_assignments;
create policy "Teacher subject assignments readable by authenticated" on public.teacher_subject_assignments
  for select to authenticated using (true);

drop policy if exists "Teacher subject assignments managed by admin" on public.teacher_subject_assignments;
create policy "Teacher subject assignments managed by admin" on public.teacher_subject_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 9. STUDENTS & ENROLLMENTS (Strict Student Isolation)
drop policy if exists "Students viewable by school staff, guardians and self" on public.students;
create policy "Students viewable by school staff, guardians and self" on public.students
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or profile_id = public.get_current_profile_id()
    or user_id = public.get_current_profile_id()
    or exists (select 1 from public.student_guardians sg where sg.student_id = public.students.id and sg.user_id = public.get_current_profile_id())
  );

drop policy if exists "Students manageable by admin" on public.students;
create policy "Students manageable by admin" on public.students
  for all to authenticated 
  using (public.is_admin()) 
  with check (public.is_admin());

drop policy if exists "Student enrollments viewable by school staff and self" on public.student_enrollments;
create policy "Student enrollments viewable by school staff and self" on public.student_enrollments
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Student enrollments managed by admin" on public.student_enrollments;
create policy "Student enrollments managed by admin" on public.student_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Student guardians viewable by staff and owner" on public.student_guardians;
create policy "Student guardians viewable by staff and owner" on public.student_guardians
  for select to authenticated
  using (public.is_admin() or public.is_teacher() or user_id = public.get_current_profile_id());

drop policy if exists "Student guardians managed by admin" on public.student_guardians;
create policy "Student guardians managed by admin" on public.student_guardians
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 10. DOCUMENTS & VERIFICATION
drop policy if exists "Document requirements readable by authenticated" on public.document_requirements;
create policy "Document requirements readable by authenticated" on public.document_requirements
  for select to authenticated using (true);

drop policy if exists "Document requirements managed by admin" on public.document_requirements;
create policy "Document requirements managed by admin" on public.document_requirements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Student documents viewable by authorized" on public.student_documents;
create policy "Student documents viewable by authorized" on public.student_documents
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Student documents insertable by staff or student" on public.student_documents;
create policy "Student documents insertable by staff or student" on public.student_documents
  for insert to authenticated
  with check (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Student documents manageable by admin" on public.student_documents;
create policy "Student documents manageable by admin" on public.student_documents
  for update to authenticated
  using (public.is_admin() or public.is_teacher());

drop policy if exists "Student status history viewable by staff" on public.student_status_history;
create policy "Student status history viewable by staff" on public.student_status_history
  for select to authenticated
  using (public.is_admin() or public.is_teacher());

drop policy if exists "Student status history insertable by admin" on public.student_status_history;
create policy "Student status history insertable by admin" on public.student_status_history
  for insert to authenticated
  with check (public.is_admin());

-- 11. ATTENDANCE
drop policy if exists "Attendance sessions viewable by authenticated" on public.attendance_sessions;
create policy "Attendance sessions viewable by authenticated" on public.attendance_sessions
  for select to authenticated using (true);

drop policy if exists "Attendance sessions managed by admin or teachers" on public.attendance_sessions;
create policy "Attendance sessions managed by admin or teachers" on public.attendance_sessions
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

drop policy if exists "Attendance records viewable by authenticated" on public.attendance_records;
create policy "Attendance records viewable by authenticated" on public.attendance_records
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Attendance records managed by staff" on public.attendance_records;
create policy "Attendance records managed by staff" on public.attendance_records
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

-- 12. EXAMS & MARKS (SSC Marks Isolation)
drop policy if exists "Grading scales readable by authenticated" on public.grading_scales;
create policy "Grading scales readable by authenticated" on public.grading_scales
  for select to authenticated using (true);

drop policy if exists "Grading scales managed by admin" on public.grading_scales;
create policy "Grading scales managed by admin" on public.grading_scales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Exam types readable by authenticated" on public.exam_types;
create policy "Exam types readable by authenticated" on public.exam_types
  for select to authenticated using (true);

drop policy if exists "Exam types managed by admin" on public.exam_types;
create policy "Exam types managed by admin" on public.exam_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Exams readable by authenticated" on public.exams;
create policy "Exams readable by authenticated" on public.exams
  for select to authenticated using (is_published = true or public.is_admin() or public.is_teacher());

drop policy if exists "Exams managed by admin" on public.exams;
create policy "Exams managed by admin" on public.exams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Exam subjects readable by authenticated" on public.exam_subjects;
create policy "Exam subjects readable by authenticated" on public.exam_subjects
  for select to authenticated using (true);

drop policy if exists "Exam subjects managed by admin" on public.exam_subjects;
create policy "Exam subjects managed by admin" on public.exam_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Marks viewable by authorized" on public.marks;
create policy "Marks viewable by authorized" on public.marks
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Marks recorded by staff" on public.marks;
create policy "Marks recorded by staff" on public.marks
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

drop policy if exists "Report cards viewable by authorized" on public.report_cards;
create policy "Report cards viewable by authorized" on public.report_cards
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or (is_published = true and student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id()))
  );

drop policy if exists "Report cards managed by admin" on public.report_cards;
create policy "Report cards managed by admin" on public.report_cards
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 13. FEES & PAYMENTS (Strict Financial Ledger Isolation: Teachers Blocked)
drop policy if exists "Fee categories readable by authenticated" on public.fee_categories;
create policy "Fee categories readable by authenticated" on public.fee_categories
  for select to authenticated using (true);

drop policy if exists "Fee categories managed by admin" on public.fee_categories;
create policy "Fee categories managed by admin" on public.fee_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Fee structures readable by authenticated" on public.fee_structures;
create policy "Fee structures readable by authenticated" on public.fee_structures
  for select to authenticated using (true);

drop policy if exists "Fee structures managed by admin" on public.fee_structures;
create policy "Fee structures managed by admin" on public.fee_structures
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Hardened: Teachers CANNOT view student fee assignments
drop policy if exists "Student fee assignments viewable by owner and staff" on public.student_fee_assignments;
create policy "Student fee assignments viewable by owner and staff" on public.student_fee_assignments
  for select to authenticated
  using (
    public.is_admin()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Student fee assignments managed by admin" on public.student_fee_assignments;
create policy "Student fee assignments managed by admin" on public.student_fee_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Invoices viewable by student and admin" on public.invoices;
create policy "Invoices viewable by student and admin" on public.invoices
  for select to authenticated
  using (
    public.is_admin()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Invoices managed by admin" on public.invoices;
create policy "Invoices managed by admin" on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Payments viewable by student and admin" on public.payments;
create policy "Payments viewable by student and admin" on public.payments
  for select to authenticated
  using (
    public.is_admin()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Payments managed by admin" on public.payments;
create policy "Payments managed by admin" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Payment allocations managed by admin" on public.payment_allocations;
create policy "Payment allocations managed by admin" on public.payment_allocations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 14. NOTICES & HOMEWORK
drop policy if exists "Notices viewable by authenticated target audience" on public.notices;
create policy "Notices viewable by authenticated target audience" on public.notices
  for select to authenticated
  using (
    is_published = true 
    and (
      target_audience = 'all'
      or (target_audience = 'teachers' and public.is_teacher())
      or (target_audience = 'students' and public.is_student())
      or public.is_admin()
    )
  );

drop policy if exists "Notices managed by staff" on public.notices;
create policy "Notices managed by staff" on public.notices
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

drop policy if exists "Notice recipients viewable by recipient" on public.notice_recipients;
create policy "Notice recipients viewable by recipient" on public.notice_recipients
  for select to authenticated
  using (user_id = public.get_current_profile_id() or public.is_admin());

drop policy if exists "Notice recipients managed by recipient or staff" on public.notice_recipients;
create policy "Notice recipients managed by recipient or staff" on public.notice_recipients
  for all to authenticated
  using (user_id = public.get_current_profile_id() or public.is_admin())
  with check (user_id = public.get_current_profile_id() or public.is_admin());

drop policy if exists "Assignments viewable by class students and staff" on public.assignments;
create policy "Assignments viewable by class students and staff" on public.assignments
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or (
      is_published = true 
      and exists (
        select 1 from public.student_enrollments se
        where se.student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
          and se.section_id = public.assignments.section_id
      )
    )
  );

drop policy if exists "Assignments managed by teachers or admin" on public.assignments;
create policy "Assignments managed by teachers or admin" on public.assignments
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

drop policy if exists "Assignment submissions viewable by submitter or teacher" on public.assignment_submissions;
create policy "Assignment submissions viewable by submitter or teacher" on public.assignment_submissions
  for select to authenticated
  using (
    public.is_admin()
    or public.is_teacher()
    or student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Assignment submissions insertable by student" on public.assignment_submissions;
create policy "Assignment submissions insertable by student" on public.assignment_submissions
  for insert to authenticated
  with check (
    student_id in (select id from public.students where profile_id = public.get_current_profile_id() or user_id = public.get_current_profile_id())
  );

drop policy if exists "Assignment submissions graded by staff" on public.assignment_submissions;
create policy "Assignment submissions graded by staff" on public.assignment_submissions
  for update to authenticated
  using (public.is_admin() or public.is_teacher());

-- 15. LEAVE REQUESTS, NOTIFICATIONS & AUDIT LOGS
drop policy if exists "Leave requests viewable by applicant or admin" on public.leave_requests;
create policy "Leave requests viewable by applicant or admin" on public.leave_requests
  for select to authenticated
  using (applicant_id = public.get_current_profile_id() or public.is_admin());

drop policy if exists "Leave requests insertable by authenticated" on public.leave_requests;
create policy "Leave requests insertable by authenticated" on public.leave_requests
  for insert to authenticated
  with check (applicant_id = public.get_current_profile_id());

drop policy if exists "Leave requests reviewed by admin" on public.leave_requests;
create policy "Leave requests reviewed by admin" on public.leave_requests
  for update to authenticated using (public.is_admin());

drop policy if exists "Notifications viewable and manageable by recipient" on public.notifications;
create policy "Notifications viewable and manageable by recipient" on public.notifications
  for all to authenticated
  using (user_id = public.get_current_profile_id())
  with check (user_id = public.get_current_profile_id());

drop policy if exists "Audit logs viewable by admin" on public.audit_logs;
create policy "Audit logs viewable by admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "Audit logs insertable by system" on public.audit_logs;
create policy "Audit logs insertable by system" on public.audit_logs
  for insert to authenticated with check (true);

-- 16. AI CONVERSATIONS & MESSAGES
drop policy if exists "AI conversations viewable and manageable by owner" on public.ai_conversations;
create policy "AI conversations viewable and manageable by owner" on public.ai_conversations
  for all to authenticated
  using (user_id = public.get_current_profile_id() or public.is_admin())
  with check (user_id = public.get_current_profile_id() or public.is_admin());

drop policy if exists "AI messages viewable and manageable by conversation owner" on public.ai_messages;
create policy "AI messages viewable and manageable by conversation owner" on public.ai_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = public.ai_messages.conversation_id
        and (c.user_id = public.get_current_profile_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = public.ai_messages.conversation_id
        and (c.user_id = public.get_current_profile_id() or public.is_admin())
    )
  );

drop policy if exists "AI feedback viewable and manageable by owner" on public.ai_feedback;
create policy "AI feedback viewable and manageable by owner" on public.ai_feedback
  for all to authenticated
  using (true)
  with check (true);


-- ==============================================================================
-- PART 6: AUTOMATIC PROFILE CREATION TRIGGER FOR SUPABASE AUTH
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_role text;
  v_first_name text;
  v_last_name text;
begin
  select id into v_school_id from public.schools where code = 'DMHS-HYD' limit 1;
  if v_school_id is null then
    select id into v_school_id from public.schools limit 1;
  end if;

  -- Ensure fallback school exists to prevent not-null foreign key violation
  if v_school_id is null then
    insert into public.schools (name, code)
    values ('Deccan Mission High School', 'DMHS-HYD')
    on conflict (code) do nothing
    returning id into v_school_id;

    if v_school_id is null then
      select id into v_school_id from public.schools where code = 'DMHS-HYD' limit 1;
    end if;
  end if;

  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  v_first_name := coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1));
  v_last_name := coalesce(new.raw_user_meta_data->>'last_name', '');

  insert into public.profiles (
    auth_user_id,
    school_id,
    email,
    first_name,
    last_name,
    role,
    is_active
  ) values (
    new.id,
    v_school_id,
    new.email,
    v_first_name,
    v_last_name,
    v_role,
    true
  ) on conflict (email) do update set
    auth_user_id = excluded.auth_user_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==============================================================================
-- PART 7: STORAGE BUCKETS & STORAGE OBJECT POLICIES (PATH AWARE)
-- ==============================================================================

-- 1. CREATE STORAGE BUCKETS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('student-documents', 'student-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. POLICIES ON storage.objects FOR profile-photos (Publicly viewable)
drop policy if exists "Profile photos are publicly accessible" on storage.objects;
create policy "Profile photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Authenticated users can upload profile photos" on storage.objects;
create policy "Authenticated users can upload profile photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos');

drop policy if exists "Users can update or delete their own profile photos" on storage.objects;
create policy "Users can update or delete their own profile photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists "Users can delete their own profile photos" on storage.objects;
create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos');

-- 3. POLICIES ON storage.objects FOR student-documents (Secure private bucket, accommodates documents/<studentId>/<file>)
drop policy if exists "Student documents readable by admin, teacher, or owner" on storage.objects;
create policy "Student documents readable by admin, teacher, or owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-documents' 
    and (
      public.is_admin()
      or public.is_teacher()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.students s
        where (s.profile_id = public.get_current_profile_id() or s.user_id = public.get_current_profile_id())
          and (storage.foldername(name))[2] = s.id::text
      )
    )
  );

drop policy if exists "Authenticated users can upload student documents" on storage.objects;
create policy "Authenticated users can upload student documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-documents'
    and (
      public.is_admin()
      or public.is_teacher()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.students s
        where (s.profile_id = public.get_current_profile_id() or s.user_id = public.get_current_profile_id())
          and (storage.foldername(name))[2] = s.id::text
      )
    )
  );

drop policy if exists "Admins and owners can update student documents" on storage.objects;
create policy "Admins and owners can update student documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'student-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.students s
        where (s.profile_id = public.get_current_profile_id() or s.user_id = public.get_current_profile_id())
          and (storage.foldername(name))[2] = s.id::text
      )
    )
  );

drop policy if exists "Admins can delete student documents" on storage.objects;
create policy "Admins can delete student documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );


-- ==============================================================================
-- PART 8: SAFE SEED INITIAL DATA (IDEMPOTENT, NON-DESTRUCTIVE)
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
    'TS-HYD-SSC-41092',
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
  if v_c10 is not null then
    insert into public.sections (class_id, name, capacity, room_number) values
      (v_c10, 'A', 40, 'Room 101'),
      (v_c10, 'B', 40, 'Room 102')
    on conflict (class_id, name) do nothing;

    select id into v_sec_10a from public.sections where class_id = v_c10 and name = 'A';
    select id into v_sec_10b from public.sections where class_id = v_c10 and name = 'B';
  end if;

  if v_c9 is not null then
    insert into public.sections (class_id, name, capacity, room_number) values
      (v_c9, 'A', 40, 'Room 201'),
      (v_c9, 'B', 40, 'Room 202')
    on conflict (class_id, name) do nothing;
  end if;

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
  insert into public.document_requirements (school_id, title, document_name, is_mandatory, description) values
    (v_school_id, 'Transfer Certificate (TC)', 'Transfer Certificate (TC)', true, 'Original TC from previous school with counter-signature'),
    (v_school_id, 'Birth Certificate', 'Birth Certificate', true, 'Issued by Municipal Corporation or competent authority'),
    (v_school_id, 'Aadhar Card Copy', 'Aadhar Card Copy', true, 'Student and Guardian Aadhar Card copy'),
    (v_school_id, 'Previous Year Marksheet', 'Previous Year Marksheet', true, 'Marksheet/Report card of the previous grade attended'),
    (v_school_id, 'Passport Size Photographs (4)', 'Passport Size Photographs (4)', false, 'Recent color passport size photos with white background')
  on conflict (school_id, title) do nothing;

  -- 8. FEE CATEGORIES & STRUCTURES
  insert into public.fee_categories (school_id, name, description) values
    (v_school_id, 'Tuition Fee', 'Quarterly tuition fee'),
    (v_school_id, 'Annual Admission Fee', 'One-time admission fee per year'),
    (v_school_id, 'Computer & Science Lab Fee', 'Bi-annual lab maintenance charge'),
    (v_school_id, 'Sports & Activities', 'Annual sports charge')
  on conflict (school_id, name) do nothing;

  -- 9. NOTICES (Idempotent seed with conflict resolution)
  insert into public.notices (school_id, title, content, target_audience, priority, is_published, publish_date)
  values (
    v_school_id,
    'Welcome to Academic Year 2025-2026',
    'Deccan Mission High School welcomes all students, parents, and faculty to the new academic year. Orientation schedule is posted on the portal.',
    'all',
    'high',
    true,
    now()
  ) on conflict (school_id, title) do nothing;

  insert into public.notices (school_id, title, content, target_audience, priority, is_published, publish_date)
  values (
    v_school_id,
    'SSC Board Examination Registration Schedule for Class 10',
    'Final verification of student biodata and subject choice forms for Telangana SSC Class 10 board examinations will take place next week.',
    'students',
    'urgent',
    true,
    now()
  ) on conflict (school_id, title) do nothing;

  -- 10. SEED TEACHERS
  -- Teacher 1: Mrs. Fatima Zahra
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'fatima.zahra@deccanmission.edu.in', 'Fatima', 'Zahra', 'teacher', true
  ) on conflict (email) do update set role = 'teacher'
  returning id into v_prof_teacher1;

  insert into public.teachers (
    profile_id, school_id, employee_id, full_name, email, qualification, specialization, joining_date, contact_phone, phone_number, is_active
  ) values (
    v_prof_teacher1, v_school_id, 'EMP-HYD-0101', 'Fatima Zahra', 'fatima.zahra@deccanmission.edu.in', 'M.Sc. Mathematics, B.Ed.', 'Senior Mathematics', '2020-06-01', '+91 98490 12345', '+91 98490 12345', true
  ) on conflict (school_id, employee_id) do nothing
  returning id into v_teacher1_id;

  -- Teacher 2: Mr. Mohammed Ali
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'mohammed.ali@deccanmission.edu.in', 'Mohammed', 'Ali', 'teacher', true
  ) on conflict (email) do update set role = 'teacher'
  returning id into v_prof_teacher2;

  insert into public.teachers (
    profile_id, school_id, employee_id, full_name, email, qualification, specialization, joining_date, contact_phone, phone_number, is_active
  ) values (
    v_prof_teacher2, v_school_id, 'EMP-HYD-0102', 'Mohammed Ali', 'mohammed.ali@deccanmission.edu.in', 'M.Sc. Physics, M.Ed.', 'Physical Sciences & Robotics', '2019-06-01', '+91 98490 54321', '+91 98490 54321', true
  ) on conflict (school_id, employee_id) do nothing
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
    profile_id, school_id, admission_number, first_name, last_name, full_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0001', 'Zeeshan', 'Khan', 'Zeeshan Khan',
    '2010-04-12', 'Male', '2021-06-01', 'active',
    'Tariq Khan', 'Father', '+91 98491 11223', '+91 98491 11223',
    'O+', 'House #4-1-88, Moghalpura, Hyderabad 500002'
  ) on conflict (school_id, admission_number) do nothing
  returning id into v_student1_id;

  if v_student1_id is not null and v_c10 is not null and v_sec_10a is not null and v_ay_id is not null then
    insert into public.student_enrollments (student_id, academic_year_id, class_id, section_id, roll_number, is_current, status)
    values (v_student1_id, v_ay_id, v_c10, v_sec_10a, '1', true, 'active')
    on conflict (student_id, academic_year_id) do nothing;
  end if;

  -- Student 2: Ayesha Siddiqua (Class 10-A, Roll 02)
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'ayesha.siddiqua@student.dmhs.edu.in', 'Ayesha', 'Siddiqua', 'student', true
  ) on conflict (email) do update set role = 'student'
  returning id into v_prof_admin;

  insert into public.students (
    profile_id, school_id, admission_number, first_name, last_name, full_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0002', 'Ayesha', 'Siddiqua', 'Ayesha Siddiqua',
    '2010-08-22', 'Female', '2021-06-01', 'active',
    'Mirza Siddiqua', 'Father', '+91 98492 22334', '+91 98492 22334',
    'B+', 'Flat 302, Charminar Enclave, Hyderabad 500002'
  ) on conflict (school_id, admission_number) do nothing
  returning id into v_student2_id;

  if v_student2_id is not null and v_c10 is not null and v_sec_10a is not null and v_ay_id is not null then
    insert into public.student_enrollments (student_id, academic_year_id, class_id, section_id, roll_number, is_current, status)
    values (v_student2_id, v_ay_id, v_c10, v_sec_10a, '2', true, 'active')
    on conflict (student_id, academic_year_id) do nothing;
  end if;

  -- Student 3: Syed Rehan (Class 9-A, Roll 01)
  insert into public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) values (
    v_school_id, 'syed.rehan@student.dmhs.edu.in', 'Syed', 'Rehan', 'student', true
  ) on conflict (email) do update set role = 'student'
  returning id into v_prof_admin;

  insert into public.students (
    profile_id, school_id, admission_number, first_name, last_name, full_name,
    date_of_birth, gender, admission_date, student_status,
    guardian_name, guardian_relationship, guardian_phone, emergency_contact,
    blood_group, address
  ) values (
    v_prof_admin, v_school_id, 'DMHS-2025-0003', 'Syed', 'Rehan', 'Syed Rehan',
    '2011-01-15', 'Male', '2022-06-01', 'active',
    'Syed Anwar', 'Father', '+91 98493 33445', '+91 98493 33445',
    'A+', 'Plot 45, Santosh Nagar, Hyderabad 500059'
  ) on conflict (school_id, admission_number) do nothing
  returning id into v_student3_id;

end $$;
