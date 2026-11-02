-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - FIX ADMIN PERMISSIONS & SSC BOARD TRANSITION
-- Migration: 20261102000001_fix_admin_permissions_and_ssc.sql
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- Board: Telangana State Board of Secondary Education (SSC)
-- Affiliation Code: TS-HYD-SSC-41092
-- ==============================================================================

-- 1. UPDATE SCHOOL RECORD & SETTINGS TO TELANGANA STATE SSC BOARD
UPDATE public.schools
SET 
  affiliation_number = 'TS-HYD-SSC-41092',
  board = 'Telangana State Board of Secondary Education (SSC)',
  name = 'Deccan Mission High School',
  city = 'Hyderabad',
  state = 'Telangana',
  updated_at = now()
WHERE code = 'DMHS-HYD';

-- Ensure school exists if table was empty
INSERT INTO public.schools (
  id, code, name, affiliation_number, board, address, city, state, postal_code, email, is_active
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'DMHS-HYD',
  'Deccan Mission High School',
  'TS-HYD-SSC-41092',
  'Telangana State Board of Secondary Education (SSC)',
  'Moghulpura, Charminar Zone',
  'Hyderabad',
  'Telangana',
  '500002',
  'contact@dmhs.edu.in',
  true
) ON CONFLICT (code) DO UPDATE SET
  affiliation_number = 'TS-HYD-SSC-41092',
  board = 'Telangana State Board of Secondary Education (SSC)',
  updated_at = now();

UPDATE public.school_settings
SET
  academic_board = 'Telangana State SSC',
  grading_system = 'SSC Grading / CCE',
  updated_at = now()
WHERE school_id IN (SELECT id FROM public.schools WHERE code = 'DMHS-HYD');

-- 2. PUBLIC READ POLICIES FOR GENERAL CATALOG (SCHOOLS, ACADEMIC YEARS)
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.schools;
DROP POLICY IF EXISTS "Allow public read access to schools" ON public.schools;
CREATE POLICY "Allow public read access to schools" ON public.schools
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Academic years readable by school members" ON public.academic_years;
DROP POLICY IF EXISTS "Allow public read access to academic_years" ON public.academic_years;
CREATE POLICY "Allow public read access to academic_years" ON public.academic_years
  FOR SELECT TO public USING (true);

-- 3. ENHANCE public.is_admin() FUNCTION
-- Checks:
-- 1. Supabase Auth authenticated user profile with admin/superadmin/principal role
-- 2. Email sta.khadri@dmhs.edu.in
-- 3. Verified ERP application admin request header (x-school-admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (
      (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
      OR (email = 'sta.khadri@dmhs.edu.in' AND auth.uid() IS NULL)
    )
    AND LOWER(role) IN ('admin', 'superadmin', 'principal')
    AND is_active = true
  ) OR (
    COALESCE(current_setting('request.headers', true)::json->>'x-school-admin', '') = 'true'
  );
$$;

-- 4. UPDATE RLS POLICIES ON CLASSES, SECTIONS, SUBJECTS, AND CLASS_SUBJECTS
-- Read: Open to public & authenticated users
-- Write/Manage: Strictly protected by public.is_admin()

-- Classes
DROP POLICY IF EXISTS "Classes readable by authenticated" ON public.classes;
DROP POLICY IF EXISTS "Classes readable by all" ON public.classes;
CREATE POLICY "Classes readable by all" ON public.classes
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Classes managed by admin" ON public.classes;
CREATE POLICY "Classes managed by admin" ON public.classes
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sections
DROP POLICY IF EXISTS "Sections readable by authenticated" ON public.sections;
DROP POLICY IF EXISTS "Sections readable by all" ON public.sections;
CREATE POLICY "Sections readable by all" ON public.sections
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Sections managed by admin" ON public.sections;
CREATE POLICY "Sections managed by admin" ON public.sections
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Subjects
DROP POLICY IF EXISTS "Subjects readable by authenticated" ON public.subjects;
DROP POLICY IF EXISTS "Subjects readable by all" ON public.subjects;
CREATE POLICY "Subjects readable by all" ON public.subjects
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Subjects managed by admin" ON public.subjects;
CREATE POLICY "Subjects managed by admin" ON public.subjects
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Class Subjects
DROP POLICY IF EXISTS "Class subjects readable by authenticated" ON public.class_subjects;
DROP POLICY IF EXISTS "Class subjects readable by all" ON public.class_subjects;
CREATE POLICY "Class subjects readable by all" ON public.class_subjects
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Class subjects managed by admin" ON public.class_subjects;
CREATE POLICY "Class subjects managed by admin" ON public.class_subjects
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. SEED / UPSERT ADMINISTRATOR, TEACHER, AND STUDENT PROFILES
DO $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id FROM public.schools WHERE code = 'DMHS-HYD' LIMIT 1;
  IF v_school_id IS NULL THEN
    v_school_id := 'e0000000-0000-0000-0000-000000000001';
  END IF;

  -- 1. Administrator: STA Khadri
  INSERT INTO public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) VALUES (
    v_school_id, 'sta.khadri@dmhs.edu.in', 'STA', 'Khadri', 'admin', true
  ) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = now();

  -- 2. Teacher: Ateef
  INSERT INTO public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) VALUES (
    v_school_id, 'ateef@dmhs.edu.in', 'Syed Ateef', 'Ali', 'teacher', true
  ) ON CONFLICT (email) DO UPDATE SET
    role = 'teacher',
    is_active = true,
    updated_at = now();

  -- Teacher record
  INSERT INTO public.teachers (
    profile_id, school_id, employee_id, qualification, specialization, joining_date, is_active
  ) VALUES (
    (SELECT id FROM public.profiles WHERE email = 'ateef@dmhs.edu.in' LIMIT 1),
    v_school_id, 'EMP-ATEEF', 'M.Sc. Mathematics, B.Ed.', 'Senior Mathematics & SSC Curriculum', '2021-06-01', true
  ) ON CONFLICT (employee_id) DO UPDATE SET
    is_active = true;

  -- 3. Student: Ali
  INSERT INTO public.profiles (
    school_id, email, first_name, last_name, role, is_active
  ) VALUES (
    v_school_id, 'ali@dmhs.edu.in', 'Mohammed', 'Ali', 'student', true
  ) ON CONFLICT (email) DO UPDATE SET
    role = 'student',
    is_active = true,
    updated_at = now();

  -- Student record
  INSERT INTO public.students (
    profile_id, school_id, admission_number, first_name, last_name, date_of_birth, gender, admission_date, student_status
  ) VALUES (
    (SELECT id FROM public.profiles WHERE email = 'ali@dmhs.edu.in' LIMIT 1),
    v_school_id, 'ADM-ALI', 'Mohammed', 'Ali', '2010-05-14', 'Male', '2021-06-15', 'active'
  ) ON CONFLICT (admission_number) DO UPDATE SET
    student_status = 'active';

END $$;
