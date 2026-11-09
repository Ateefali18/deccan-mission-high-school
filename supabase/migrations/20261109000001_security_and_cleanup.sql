-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL MANAGEMENT SYSTEM (DMHS)
-- Migration: 20261109000001_security_and_cleanup.sql
-- 1. Fix Supabase Security Advisor Critical Warnings (SECURITY DEFINER on views)
-- 2. Configure Least-Privilege RLS Policies across Student/Faculty tables
-- 3. Execute Complete Operational Data Cleanup (Students, Faculty, Classes, Fees)
-- 4. Preserve Admin Accounts, School Settings, Schema Constraints & Functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PHASE 2: FIX THE TWO CRITICAL SUPABASE SECURITY ADVISOR WARNINGS
-- ------------------------------------------------------------------------------

-- 1. Recreate public.teacher_profiles with security_invoker = true
-- Enforces caller privileges and respects Row Level Security on public.teachers
DROP VIEW IF EXISTS public.teacher_profiles CASCADE;
CREATE VIEW public.teacher_profiles
WITH (security_invoker = true) AS
  SELECT * FROM public.teachers;

-- 2. Recreate public.student_profiles with security_invoker = true
-- Enforces caller privileges and respects Row Level Security on public.students
DROP VIEW IF EXISTS public.student_profiles CASCADE;
CREATE VIEW public.student_profiles
WITH (security_invoker = true) AS
  SELECT * FROM public.students;

-- ------------------------------------------------------------------------------
-- PHASE 2 & 3: LEAST-PRIVILEGE RLS POLICIES FOR STUDENTS AND TEACHERS
-- ------------------------------------------------------------------------------

-- Ensure Row Level Security is enabled on underlying tables
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Teachers RLS Policies:
-- Unauthenticated: Denied
-- Authenticated Teachers: Can view faculty list
-- Admin: Full manage (Select, Insert, Update, Delete)
DROP POLICY IF EXISTS "Teachers list viewable by authenticated users" ON public.teachers;
DROP POLICY IF EXISTS "Teachers managed by admin" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own contact info" ON public.teachers;
DROP POLICY IF EXISTS "Allow public read access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow public manage teachers" ON public.teachers;

CREATE POLICY "Teachers list viewable by authenticated users" ON public.teachers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Teachers managed by admin" ON public.teachers
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Students RLS Policies:
-- Unauthenticated: Denied (cannot view private student data)
-- Student: Can ONLY select and update their OWN profile (Student A cannot view Student B)
-- Teachers: Can view students
-- Admin: Full manage (Select, Insert, Update, Delete)
DROP POLICY IF EXISTS "Students viewable by admin and teachers" ON public.students;
DROP POLICY IF EXISTS "Students managed by admin" ON public.students;
DROP POLICY IF EXISTS "Students can update own limited profile" ON public.students;
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public manage students" ON public.students;

CREATE POLICY "Students viewable by school authorized members" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_teacher()
    OR profile_id = public.get_current_profile_id()
  );

CREATE POLICY "Students managed by admin" ON public.students
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Students can update own limited profile" ON public.students
  FOR UPDATE TO authenticated
  USING (profile_id = public.get_current_profile_id())
  WITH CHECK (profile_id = public.get_current_profile_id());

-- Student Enrollments RLS Policies:
DROP POLICY IF EXISTS "Enrollments viewable by school members" ON public.student_enrollments;
DROP POLICY IF EXISTS "Enrollments managed by admin" ON public.student_enrollments;

CREATE POLICY "Enrollments viewable by school members" ON public.student_enrollments
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_teacher()
    OR student_id = public.get_current_student_id()
  );

CREATE POLICY "Enrollments managed by admin" ON public.student_enrollments
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure Cascade Delete Constraints are configured to prevent orphan lockouts
DO $$
BEGIN
  -- Add ON DELETE CASCADE to student_enrollments if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_enrollments_student_id_fkey'
  ) THEN
    ALTER TABLE public.student_enrollments 
      DROP CONSTRAINT student_enrollments_student_id_fkey,
      ADD CONSTRAINT student_enrollments_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;

  -- Add ON DELETE CASCADE to student_guardians if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_guardians_student_id_fkey'
  ) THEN
    ALTER TABLE public.student_guardians 
      DROP CONSTRAINT student_guardians_student_id_fkey,
      ADD CONSTRAINT student_guardians_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;

  -- Add ON DELETE CASCADE to student_documents if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_documents_student_id_fkey'
  ) THEN
    ALTER TABLE public.student_documents 
      DROP CONSTRAINT student_documents_student_id_fkey,
      ADD CONSTRAINT student_documents_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- PHASE 4: COMPLETE OLD OPERATIONAL DATA CLEANUP
-- Safely clears old test/demo data while preserving institutions and admin profiles
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  -- 1. Dependent transactional and grade records
  DELETE FROM public.marks;
  DELETE FROM public.attendance_records;
  DELETE FROM public.attendance_sessions;
  DELETE FROM public.timetable_entries;

  -- 2. Documents
  DELETE FROM public.student_documents;
  DELETE FROM public.faculty_documents;

  -- 3. Student mappings and guardians
  DELETE FROM public.student_guardians;
  DELETE FROM public.student_enrollments;

  -- 4. Teacher assignments
  DELETE FROM public.teacher_subject_assignments;
  DELETE FROM public.teacher_class_assignments;
  DELETE FROM public.teacher_assignments;

  -- 5. Financial records
  DELETE FROM public.payments;
  DELETE FROM public.invoices;
  DELETE FROM public.fee_structures;
  DELETE FROM public.expenses;

  -- 6. Notices and audit logs
  DELETE FROM public.notices;
  DELETE FROM public.audit_logs;

  -- 7. Operational students and teachers
  DELETE FROM public.students;
  DELETE FROM public.teachers;

  -- 8. Classes and sections (allowing fresh configuration)
  DELETE FROM public.class_subjects;
  DELETE FROM public.sections;
  DELETE FROM public.classes;

  -- 9. Academic sessions
  DELETE FROM public.academic_terms;
  DELETE FROM public.academic_years;

  -- 10. Clean old student and teacher profiles, PRESERVING administrative profiles
  DELETE FROM public.profiles 
  WHERE LOWER(role) NOT IN ('admin', 'superadmin', 'principal')
    AND email NOT IN ('sta.khadri@dmhs.edu.in');

END $$;

-- ------------------------------------------------------------------------------
-- VERIFICATION COUNT QUERY
-- ------------------------------------------------------------------------------
SELECT 'students' AS table_name, count(*) AS remaining_count FROM public.students
UNION ALL
SELECT 'teachers', count(*) FROM public.teachers
UNION ALL
SELECT 'classes', count(*) FROM public.classes
UNION ALL
SELECT 'sections', count(*) FROM public.sections
UNION ALL
SELECT 'attendance_records', count(*) FROM public.attendance_records
UNION ALL
SELECT 'marks', count(*) FROM public.marks
UNION ALL
SELECT 'fee_structures', count(*) FROM public.fee_structures
UNION ALL
SELECT 'invoices', count(*) FROM public.invoices
UNION ALL
SELECT 'payments', count(*) FROM public.payments
UNION ALL
SELECT 'expenses', count(*) FROM public.expenses
UNION ALL
SELECT 'student_documents', count(*) FROM public.student_documents
UNION ALL
SELECT 'faculty_documents', count(*) FROM public.faculty_documents
UNION ALL
SELECT 'admin_profiles_preserved', count(*) FROM public.profiles WHERE LOWER(role) IN ('admin', 'superadmin', 'principal');
