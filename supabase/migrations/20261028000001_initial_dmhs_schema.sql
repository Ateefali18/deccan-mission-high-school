-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - SUPABASE FOUNDATIONAL SCHEMA MIGRATION
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- Version: 2.0.0
-- Location: Hyderabad, Telangana, India (CBSE TS-HYD-CBSE-41092)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. SCHOOLS
create table if not exists public.schools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  affiliation_number text default 'TS-HYD-CBSE-41092',
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
  school_id uuid not null references public.schools(id) on delete cascade,
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
  school_id uuid not null references public.schools(id) on delete cascade,
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
  class_id uuid not null references public.classes(id) on delete cascade,
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
  school_id uuid not null references public.schools(id) on delete cascade,
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
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  is_elective boolean default false not null,
  created_at timestamptz default now() not null,
  unique(class_id, subject_id)
);

-- 7. TIMETABLE ENTRIES
create table if not exists public.timetable_entries (
  id uuid default gen_random_uuid() primary key,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid, -- links to teachers(id)
  day_of_week integer not null check (day_of_week between 1 and 6), -- 1=Monday ... 6=Saturday
  period_number integer not null check (period_number between 1 and 10),
  start_time time not null,
  end_time time not null,
  room_number text,
  created_at timestamptz default now() not null
);

-- 8. SCHOOL SETTINGS
create table if not exists public.school_settings (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade unique,
  attendance_mode text default 'daily' not null check (attendance_mode in ('daily', 'period_wise')),
  grading_system text default 'cbse_cce' not null,
  current_academic_year_id uuid references public.academic_years(id),
  allow_teacher_student_creation boolean default true not null,
  allow_teacher_mark_entry boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 9. USER PROFILES (Connected to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone_number text,
  avatar_url text,
  role text not null check (role in ('ADMIN', 'TEACHER', 'STUDENT')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 10. USER ROLES (Explicit multi-role audit)
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'TEACHER', 'STUDENT')),
  granted_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  unique(user_id, role)
);

-- 11. TEACHERS (Faculty)
create table if not exists public.teachers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid unique references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  employee_id text not null,
  full_name text not null,
  email text,
  phone_number text,
  designation text default 'Teacher' not null,
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

-- Alias view for teacher_profiles to ensure dual compatibility
create or replace view public.teacher_profiles as
  select * from public.teachers;

-- 12. TEACHER ASSIGNMENTS
create table if not exists public.teacher_assignments (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  role_type text default 'subject_teacher' not null check (role_type in ('class_teacher', 'subject_teacher', 'assistant_teacher')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  unique(teacher_id, academic_year_id, class_id, section_id, subject_name)
);

-- 13. STUDENTS
create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  user_id uuid unique references public.profiles(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_number text not null,
  full_name text not null,
  email text,
  gender text check (gender in ('Male', 'Female', 'Other')),
  date_of_birth date,
  blood_group text,
  profile_photo_url text,
  guardian_name text,
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

-- Alias view for student_profiles
create or replace view public.student_profiles as
  select * from public.students;

-- 14. STUDENT GUARDIANS
create table if not exists public.student_guardians (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  relationship text not null, -- Father, Mother, Legal Guardian
  phone_number text not null,
  email text,
  occupation text,
  address text,
  is_primary boolean default true not null,
  created_at timestamptz default now() not null
);

-- 15. STUDENT ENROLLMENTS
create table if not exists public.student_enrollments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  roll_number text,
  enrollment_status text default 'enrolled' not null check (enrollment_status in ('enrolled', 'promoted', 'retained', 'transferred', 'withdrawn')),
  enrolled_at date default current_date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(student_id, academic_year_id)
);

-- 16. DOCUMENT REQUIREMENTS
create table if not exists public.document_requirements (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  document_name text not null, -- Birth Certificate, Transfer Certificate, Aadhar Card
  description text,
  is_mandatory boolean default true not null,
  applicable_class_id uuid references public.classes(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- 17. STUDENT DOCUMENTS
create table if not exists public.student_documents (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  requirement_id uuid references public.document_requirements(id) on delete set null,
  document_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  verification_status text default 'submitted' not null check (verification_status in ('required', 'submitted', 'verified', 'rejected')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  remarks text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 18. STUDENT STATUS HISTORY
create table if not exists public.student_status_history (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz default now() not null
);

-- 19. ATTENDANCE SESSIONS
create table if not exists public.attendance_sessions (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  session_date date not null,
  period_number integer default 1 not null,
  recorded_by uuid references public.profiles(id),
  remarks text,
  created_at timestamptz default now() not null,
  unique(section_id, session_date, period_number)
);

-- 20. ATTENDANCE RECORDS
create table if not exists public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  remarks text,
  created_at timestamptz default now() not null,
  unique(session_id, student_id)
);

-- 21. GRADING SCALES
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

-- 22. EXAMS
create table if not exists public.exams (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  exam_type text default 'formative' not null check (exam_type in ('formative', 'summative', 'unit_test', 'annual')),
  start_date date,
  end_date date,
  is_published boolean default false not null,
  created_at timestamptz default now() not null
);

-- 23. EXAM SUBJECTS
create table if not exists public.exam_subjects (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid not null references public.exams(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  exam_date date,
  max_marks numeric(5,2) default 100.00 not null,
  passing_marks numeric(5,2) default 35.00 not null,
  created_at timestamptz default now() not null,
  unique(exam_id, class_id, subject_id)
);

-- 24. MARKS
create table if not exists public.marks (
  id uuid default gen_random_uuid() primary key,
  exam_subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  marks_obtained numeric(5,2),
  is_absent boolean default false not null,
  remarks text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(exam_subject_id, student_id),
  check (is_absent = true or (marks_obtained is not null and marks_obtained >= 0))
);

-- 25. REPORT CARDS
create table if not exists public.report_cards (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  total_marks numeric(7,2) not null,
  obtained_marks numeric(7,2) not null,
  percentage numeric(5,2) not null,
  rank integer,
  remarks text,
  is_published boolean default false not null,
  generated_at timestamptz default now() not null,
  unique(student_id, exam_id)
);

-- 26. FEE STRUCTURES
create table if not exists public.fee_structures (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null, -- Tuition Fee, Computer Lab, Annual Sports
  amount numeric(10,2) not null check (amount >= 0),
  due_date date not null,
  frequency text default 'annual' not null check (frequency in ('monthly', 'quarterly', 'term', 'annual', 'one_time')),
  created_at timestamptz default now() not null
);

-- 27. STUDENT FEE ASSIGNMENTS
create table if not exists public.student_fee_assignments (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  fee_structure_id uuid not null references public.fee_structures(id) on delete cascade,
  custom_discount numeric(10,2) default 0.00 not null,
  discount_reason text,
  final_amount numeric(10,2) not null,
  status text default 'pending' not null check (status in ('pending', 'partial', 'paid', 'waived')),
  created_at timestamptz default now() not null,
  unique(student_id, fee_structure_id)
);

-- 28. INVOICES
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text unique not null,
  student_id uuid not null references public.students(id) on delete cascade,
  total_amount numeric(10,2) not null,
  paid_amount numeric(10,2) default 0.00 not null,
  balance_amount numeric(10,2) not null,
  due_date date not null,
  status text default 'unpaid' not null check (status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  created_at timestamptz default now() not null
);

-- 29. PAYMENTS
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  receipt_number text unique not null,
  student_id uuid not null references public.students(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  payment_date date default current_date not null,
  payment_method text default 'cash' not null check (payment_method in ('cash', 'upi', 'bank_transfer', 'cheque', 'online')),
  transaction_reference text,
  collected_by uuid references public.profiles(id),
  remarks text,
  created_at timestamptz default now() not null
);

-- 30. PAYMENT ALLOCATIONS
create table if not exists public.payment_allocations (
  id uuid default gen_random_uuid() primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  student_fee_assignment_id uuid not null references public.student_fee_assignments(id) on delete cascade,
  allocated_amount numeric(10,2) not null check (allocated_amount > 0),
  created_at timestamptz default now() not null
);

-- 31. NOTICES
create table if not exists public.notices (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  content text not null,
  target_audience text default 'all' not null check (target_audience in ('all', 'teachers', 'students', 'class_specific')),
  target_class_id uuid references public.classes(id) on delete set null,
  is_published boolean default true not null,
  published_by uuid references public.profiles(id),
  published_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- 32. NOTICE RECIPIENTS
create table if not exists public.notice_recipients (
  id uuid default gen_random_uuid() primary key,
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz default now() not null,
  unique(notice_id, user_id)
);

-- 33. ASSIGNMENTS
create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  max_score numeric(5,2) default 100.00 not null,
  attachment_url text,
  created_at timestamptz default now() not null
);

-- 34. ASSIGNMENT SUBMISSIONS
create table if not exists public.assignment_submissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  submission_text text,
  attachment_url text,
  score numeric(5,2),
  feedback text,
  submitted_at timestamptz default now() not null,
  graded_by uuid references public.profiles(id),
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

-- 35. LEAVE REQUESTS
create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now() not null
);

-- 36. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false not null,
  link_url text,
  created_at timestamptz default now() not null
);

-- 37. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now() not null
);

-- 38. AI ASSISTANT CONVERSATIONS
create table if not exists public.ai_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text default 'New Conversation' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 39. AI MESSAGES
create table if not exists public.ai_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_count integer,
  created_at timestamptz default now() not null
);

-- 40. AI FEEDBACK
create table if not exists public.ai_feedback (
  id uuid default gen_random_uuid() primary key,
  message_id uuid not null references public.ai_messages(id) on delete cascade,
  rating integer check (rating in (1, -1)),
  feedback_text text,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE (1,500+ Students Target)
-- ==============================================================================
create index if not exists idx_students_admission_number on public.students(admission_number);
create index if not exists idx_students_school on public.students(school_id);
create index if not exists idx_students_status on public.students(student_status);
create index if not exists idx_teachers_employee_id on public.teachers(employee_id);
create index if not exists idx_teachers_school on public.teachers(school_id);
create index if not exists idx_enrollments_student on public.student_enrollments(student_id);
create index if not exists idx_enrollments_class_sec on public.student_enrollments(class_id, section_id);
create index if not exists idx_enrollments_academic_year on public.student_enrollments(academic_year_id);
create index if not exists idx_attendance_records_session on public.attendance_records(session_id);
create index if not exists idx_attendance_records_student on public.attendance_records(student_id);
create index if not exists idx_attendance_sessions_date on public.attendance_sessions(session_date, section_id);
create index if not exists idx_marks_student on public.marks(student_id);
create index if not exists idx_marks_exam_subject on public.marks(exam_subject_id);
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_invoices_student on public.invoices(student_id);
create index if not exists idx_notices_school on public.notices(school_id, is_published);
create index if not exists idx_audit_logs_school_date on public.audit_logs(school_id, created_at desc);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id);
