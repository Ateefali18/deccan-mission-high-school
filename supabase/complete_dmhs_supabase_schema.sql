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
-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - ROW-LEVEL SECURITY (RLS) & ACCESS CONTROL
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- Version: 2.0.0
-- Location: Hyderabad, Telangana, India
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

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

-- Check if Current User has Role (Admin / Superadmin)
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

-- Get Teacher Record ID for current auth user
create or replace function public.get_current_teacher_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select t.id from public.teachers t
  inner join public.profiles p on p.id = t.profile_id
  where p.auth_user_id = auth.uid() limit 1;
$$;

-- Get Student Record ID for current auth user
create or replace function public.get_current_student_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select s.id from public.students s
  inner join public.profiles p on p.id = s.profile_id
  where p.auth_user_id = auth.uid() limit 1;
$$;

-- Check if Teacher can access student (assigned to same class/section)
create or replace function public.can_teacher_access_student(target_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.student_enrollments se
    join public.teacher_class_assignments tca 
      on tca.class_id = se.class_id 
      and (tca.section_id is null or tca.section_id = se.section_id)
    join public.teachers t on t.id = tca.teacher_id
    join public.profiles p on p.id = t.profile_id
    where se.student_id = target_student_id
      and p.auth_user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
-- ------------------------------------------------------------------------------
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
alter table public.teacher_profiles enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.teacher_subject_assignments enable row level security;
alter table public.teacher_class_assignments enable row level security;
alter table public.students enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_documents enable row level security;
alter table public.document_requirements enable row level security;
alter table public.student_status_history enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_summaries enable row level security;
alter table public.exam_types enable row level security;
alter table public.exams enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.marks enable row level security;
alter table public.fee_categories enable row level security;
alter table public.fee_structures enable row level security;
alter table public.fee_discounts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.notices enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.leave_applications enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_feedback enable row level security;

-- ------------------------------------------------------------------------------
-- 3. POLICIES: CORE SCHOOL CONFIGURATION & ACADEMIC DATA
-- ------------------------------------------------------------------------------

-- Schools
create policy "Allow read access to authenticated users" on public.schools
  for select to authenticated using (true);
create policy "Allow full access to admin" on public.schools
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- School Settings
create policy "School settings read by school members" on public.school_settings
  for select to authenticated using (school_id = public.get_current_school_id() or public.is_admin());
create policy "School settings managed by admin" on public.school_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Academic Years
create policy "Academic years readable by authenticated" on public.academic_years
  for select to authenticated using (true);
create policy "Academic years managed by admin" on public.academic_years
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Classes, Sections, Subjects, Class Subjects
create policy "Classes readable by authenticated" on public.classes
  for select to authenticated using (true);
create policy "Classes managed by admin" on public.classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Sections readable by authenticated" on public.sections
  for select to authenticated using (true);
create policy "Sections managed by admin" on public.sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Subjects readable by authenticated" on public.subjects
  for select to authenticated using (true);
create policy "Subjects managed by admin" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Class subjects readable by authenticated" on public.class_subjects
  for select to authenticated using (true);
create policy "Class subjects managed by admin" on public.class_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Timetable Entries
create policy "Timetable readable by authenticated" on public.timetable_entries
  for select to authenticated using (true);
create policy "Timetable managed by admin or teachers" on public.timetable_entries
  for all to authenticated 
  using (public.is_admin() or public.is_teacher()) 
  with check (public.is_admin() or public.is_teacher());

-- ------------------------------------------------------------------------------
-- 4. POLICIES: USERS & PROFILES
-- ------------------------------------------------------------------------------

create policy "Users can view profiles in their school" on public.profiles
  for select to authenticated
  using (school_id = public.get_current_school_id() or public.is_admin());

create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "Admin can insert and manage all profiles" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- User Roles
create policy "User roles readable by authenticated" on public.user_roles
  for select to authenticated using (true);
create policy "User roles managed by admin" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. POLICIES: TEACHERS & TEACHER ASSIGNMENTS
-- ------------------------------------------------------------------------------

create policy "Teachers list viewable by authenticated users" on public.teachers
  for select to authenticated using (true);

create policy "Teachers managed by admin" on public.teachers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Teachers can update their own contact info" on public.teachers
  for update to authenticated
  using (profile_id = public.get_current_profile_id())
  with check (profile_id = public.get_current_profile_id());

create policy "Teacher assignments viewable by authenticated" on public.teacher_assignments
  for select to authenticated using (true);
create policy "Teacher assignments managed by admin" on public.teacher_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Teacher class assignments viewable" on public.teacher_class_assignments
  for select to authenticated using (true);
create policy "Teacher class assignments managed by admin" on public.teacher_class_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Teacher subject assignments viewable" on public.teacher_subject_assignments
  for select to authenticated using (true);
create policy "Teacher subject assignments managed by admin" on public.teacher_subject_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. POLICIES: STUDENTS & ENROLLMENTS
-- ------------------------------------------------------------------------------

create policy "Students viewable by admin and teachers" on public.students
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or profile_id = public.get_current_profile_id()
  );

create policy "Students managed by admin" on public.students
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Students can update own limited profile" on public.students
  for update to authenticated
  using (profile_id = public.get_current_profile_id())
  with check (profile_id = public.get_current_profile_id());

create policy "Enrollments viewable by school members" on public.student_enrollments
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Enrollments managed by admin" on public.student_enrollments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Student guardians viewable by staff or student" on public.student_guardians
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Student guardians managed by admin" on public.student_guardians
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Student documents viewable by authorized users" on public.student_documents
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Student documents managed by admin or student" on public.student_documents
  for all to authenticated
  using (public.is_admin() or student_id = public.get_current_student_id())
  with check (public.is_admin() or student_id = public.get_current_student_id());

-- ------------------------------------------------------------------------------
-- 7. POLICIES: ATTENDANCE
-- ------------------------------------------------------------------------------

create policy "Attendance sessions viewable by authenticated" on public.attendance_sessions
  for select to authenticated using (true);

create policy "Attendance sessions managed by admin or teachers" on public.attendance_sessions
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

create policy "Attendance records viewable by staff or individual student" on public.attendance_records
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Attendance records managed by admin or teachers" on public.attendance_records
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

-- ------------------------------------------------------------------------------
-- 8. POLICIES: EXAMS & MARKS
-- ------------------------------------------------------------------------------

create policy "Exams viewable by authenticated users" on public.exams
  for select to authenticated using (true);
create policy "Exams managed by admin" on public.exams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Exam subjects viewable by authenticated users" on public.exam_subjects
  for select to authenticated using (true);
create policy "Exam subjects managed by admin" on public.exam_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Marks viewable by staff or student" on public.marks
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Marks managed by admin or teachers" on public.marks
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

-- ------------------------------------------------------------------------------
-- 9. POLICIES: FEES & PAYMENTS
-- ------------------------------------------------------------------------------

create policy "Fee structures viewable by authenticated" on public.fee_structures
  for select to authenticated using (true);
create policy "Fee structures managed by admin" on public.fee_structures
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Invoices viewable by admin or student" on public.invoices
  for select to authenticated
  using (public.is_admin() or student_id = public.get_current_student_id());
create policy "Invoices managed by admin" on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Payments viewable by admin or student" on public.payments
  for select to authenticated
  using (public.is_admin() or student_id = public.get_current_student_id());
create policy "Payments managed by admin" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. POLICIES: NOTICES & HOMEWORK
-- ------------------------------------------------------------------------------

create policy "Published notices viewable by target audience" on public.notices
  for select to authenticated
  using (
    is_published = true 
    or public.is_admin()
  );

create policy "Notices managed by admin" on public.notices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Assignments viewable by authenticated" on public.assignments
  for select to authenticated using (true);
create policy "Assignments managed by admin or teachers" on public.assignments
  for all to authenticated
  using (public.is_admin() or public.is_teacher())
  with check (public.is_admin() or public.is_teacher());

create policy "Submissions viewable by teacher or submitter" on public.assignment_submissions
  for select to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

create policy "Submissions managed by student or teacher" on public.assignment_submissions
  for all to authenticated
  using (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  )
  with check (
    public.is_admin() 
    or public.is_teacher() 
    or student_id = public.get_current_student_id()
  );

-- ------------------------------------------------------------------------------
-- 11. POLICIES: NOTIFICATIONS & AUDIT LOGS
-- ------------------------------------------------------------------------------

create policy "Users see only their own notifications" on public.notifications
  for select to authenticated
  using (user_id = public.get_current_profile_id());

create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (user_id = public.get_current_profile_id())
  with check (user_id = public.get_current_profile_id());

create policy "Audit logs viewable only by admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create policy "Authenticated users can insert audit logs" on public.audit_logs
  for insert to authenticated
  with check (true);

-- ------------------------------------------------------------------------------
-- 12. POLICIES: AI CONVERSATIONS & MESSAGES
-- ------------------------------------------------------------------------------

create policy "Users own their AI conversations" on public.ai_conversations
  for all to authenticated
  using (user_id = public.get_current_profile_id())
  with check (user_id = public.get_current_profile_id());

create policy "Users own their AI messages" on public.ai_messages
  for all to authenticated
  using (
    conversation_id in (
      select id from public.ai_conversations where user_id = public.get_current_profile_id()
    )
  )
  with check (
    conversation_id in (
      select id from public.ai_conversations where user_id = public.get_current_profile_id()
    )
  );

-- ------------------------------------------------------------------------------
-- 13. AUTOMATIC PROFILE CREATION TRIGGER FOR SUPABASE AUTH
-- ------------------------------------------------------------------------------

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
  -- Resolve school_id or default to the first active school
  v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;
  if v_school_id is null then
    select id into v_school_id from public.schools where code = 'DMHS-HYD' limit 1;
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
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    updated_at = now();

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - STORAGE BUCKETS & POLICIES
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- Version: 2.0.0
-- Location: Hyderabad, Telangana, India
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
create policy "Profile photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "Authenticated users can upload profile photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos');

create policy "Users can update or delete their own profile photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos');

create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos');

-- 3. POLICIES ON storage.objects FOR student-documents (Secure private bucket)
create policy "Student documents readable by admin, teacher, or owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-documents' 
    and (
      public.is_admin()
      or public.is_teacher()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "Authenticated users can upload student documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-documents'
    and (
      public.is_admin()
      or public.is_teacher()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "Admins and owners can update student documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'student-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

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
