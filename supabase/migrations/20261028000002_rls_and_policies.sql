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
