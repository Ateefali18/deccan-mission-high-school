-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - FACULTY TIMETABLE & PERIOD ATTENDANCE
-- Migration: 20261102000002_faculty_timetable_attendance.sql
-- Project: https://snnzmgbkiiydboujublj.supabase.co
-- ==============================================================================

-- 1. ENHANCE TIMETABLE_ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid, -- Profile or Teacher ID
  teacher_name text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Mon ... 6=Sat
  period_number integer NOT NULL CHECK (period_number BETWEEN 1 AND 10),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_number text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure columns exist if table was already created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'teacher_name') THEN
    ALTER TABLE public.timetable_entries ADD COLUMN teacher_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'is_active') THEN
    ALTER TABLE public.timetable_entries ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_entries' AND column_name = 'updated_at') THEN
    ALTER TABLE public.timetable_entries ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Conflict-free indexes for Timetable
CREATE INDEX IF NOT EXISTS idx_timetable_lookup ON public.timetable_entries(day_of_week, period_number, is_active);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON public.timetable_entries(teacher_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_timetable_section ON public.timetable_entries(section_id, day_of_week, is_active);

-- 2. ENHANCE ATTENDANCE_SESSIONS & ATTENDANCE_RECORDS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_sessions' AND column_name = 'period_number') THEN
    ALTER TABLE public.attendance_sessions ADD COLUMN period_number integer DEFAULT 0 NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_sessions' AND column_name = 'subject_id') THEN
    ALTER TABLE public.attendance_sessions ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure unique session constraint per section, date, and period
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_session_slot'
  ) THEN
    ALTER TABLE public.attendance_sessions 
    ADD CONSTRAINT uq_attendance_session_slot UNIQUE (section_id, session_date, period_number);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    NULL;
END $$;

-- 3. RLS POLICIES FOR TIMETABLE
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Timetable readable by authenticated" ON public.timetable_entries;
DROP POLICY IF EXISTS "Timetable readable by all" ON public.timetable_entries;
CREATE POLICY "Timetable readable by all" ON public.timetable_entries
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Timetable managed by admin or teachers" ON public.timetable_entries;
CREATE POLICY "Timetable managed by admin or teachers" ON public.timetable_entries
  FOR ALL TO public
  USING (public.is_admin() OR auth.role() = 'authenticated')
  WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- 4. RLS POLICIES FOR ATTENDANCE
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance sessions viewable by authenticated" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Attendance sessions viewable by all" ON public.attendance_sessions;
CREATE POLICY "Attendance sessions viewable by all" ON public.attendance_sessions
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Attendance sessions managed by admin or teachers" ON public.attendance_sessions;
CREATE POLICY "Attendance sessions managed by admin or teachers" ON public.attendance_sessions
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Attendance records viewable by staff or individual student" ON public.attendance_records;
DROP POLICY IF EXISTS "Attendance records viewable by all" ON public.attendance_records;
CREATE POLICY "Attendance records viewable by all" ON public.attendance_records
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Attendance records managed by admin or teachers" ON public.attendance_records;
CREATE POLICY "Attendance records managed by admin or teachers" ON public.attendance_records
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 5. SEED TIMETABLE ENTRIES FOR TEACHER ATEEF (SENIOR MATHEMATICS FACULTY)
DO $$
DECLARE
  v_ay_id uuid;
  v_cls_10_id uuid;
  v_sec_10a_id uuid;
  v_sec_10b_id uuid;
  v_cls_9_id uuid;
  v_sec_9a_id uuid;
  v_sub_math_id uuid;
  v_teacher_id uuid;
BEGIN
  -- Get active Academic Year
  SELECT id INTO v_ay_id FROM public.academic_years WHERE is_current = true LIMIT 1;
  IF v_ay_id IS NULL THEN
    SELECT id INTO v_ay_id FROM public.academic_years LIMIT 1;
  END IF;

  -- Get Class 10 and Sections
  SELECT id INTO v_cls_10_id FROM public.classes WHERE name ILIKE '%Class 10%' OR grade_level = 10 LIMIT 1;
  IF v_cls_10_id IS NOT NULL THEN
    SELECT id INTO v_sec_10a_id FROM public.sections WHERE class_id = v_cls_10_id AND name ILIKE 'A%' LIMIT 1;
    SELECT id INTO v_sec_10b_id FROM public.sections WHERE class_id = v_cls_10_id AND name ILIKE 'B%' LIMIT 1;
  END IF;

  -- Get Class 9 and Section
  SELECT id INTO v_cls_9_id FROM public.classes WHERE name ILIKE '%Class 9%' OR grade_level = 9 LIMIT 1;
  IF v_cls_9_id IS NOT NULL THEN
    SELECT id INTO v_sec_9a_id FROM public.sections WHERE class_id = v_cls_9_id AND name ILIKE 'A%' LIMIT 1;
  END IF;

  -- Get Mathematics Subject
  SELECT id INTO v_sub_math_id FROM public.subjects WHERE name ILIKE '%Mathematics%' LIMIT 1;

  -- Get Ateef Teacher Profile if exists
  SELECT id INTO v_teacher_id FROM public.profiles WHERE email ILIKE '%ateef%' OR first_name ILIKE '%ateef%' LIMIT 1;
  IF v_teacher_id IS NULL THEN
    v_teacher_id := 'f0000000-0000-0000-0000-000000000002'::uuid;
  END IF;

  -- Insert standard weekday timetable entries for Ateef if valid foreign keys exist
  IF v_ay_id IS NOT NULL AND v_cls_10_id IS NOT NULL AND v_sec_10a_id IS NOT NULL AND v_sub_math_id IS NOT NULL THEN
    -- Monday
    INSERT INTO public.timetable_entries (
      academic_year_id, class_id, section_id, subject_id, teacher_id, teacher_name,
      day_of_week, period_number, start_time, end_time, room_number
    ) VALUES
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 1, 1, '09:00:00', '09:45:00', 'Room 301'),
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 1, 3, '10:30:00', '11:15:00', 'Room 302'),
      -- Tuesday
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 2, 2, '09:45:00', '10:30:00', 'Room 301'),
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 2, 4, '11:30:00', '12:15:00', 'Room 302'),
      -- Wednesday
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 3, 1, '09:00:00', '09:45:00', 'Room 302'),
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 3, 3, '10:30:00', '11:15:00', 'Room 301'),
      -- Thursday
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 4, 1, '09:00:00', '09:45:00', 'Room 301'),
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 4, 6, '13:45:00', '14:30:00', 'Lab A'),
      -- Friday
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 5, 2, '09:45:00', '10:30:00', 'Room 302'),
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 5, 5, '12:15:00', '13:00:00', 'Room 301'),
      -- Saturday
      (v_ay_id, v_cls_10_id, v_sec_10a_id, v_sub_math_id, v_teacher_id, 'Ateef', 6, 1, '09:00:00', '09:45:00', 'Room 301'),
      (v_ay_id, v_cls_10_id, COALESCE(v_sec_10b_id, v_sec_10a_id), v_sub_math_id, v_teacher_id, 'Ateef', 6, 2, '09:45:00', '10:30:00', 'Room 302')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
