-- ====================================================================
-- DECCAN MISSION HIGH SCHOOL ERP (DMHS)
-- Migration: 20261105000001_fix_academic_years_management.sql
-- Description: Academic Year RLS Policies, Single Active Year Constraint, & Triggers
-- ====================================================================

-- 1. Ensure table structure is sound with updated_at trigger
CREATE OR REPLACE FUNCTION public.update_academic_years_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_academic_years_updated_at ON public.academic_years;
CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW
  EXECUTE FUNCTION public.update_academic_years_timestamp();

-- 2. Trigger to ensure only one academic year is marked as is_current = true at a time
CREATE OR REPLACE FUNCTION public.sync_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.academic_years
    SET is_current = false
    WHERE id <> NEW.id AND (school_id = NEW.school_id OR school_id IS NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_current_academic_year ON public.academic_years;
CREATE TRIGGER trg_sync_current_academic_year
  BEFORE INSERT OR UPDATE OF is_current ON public.academic_years
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.sync_current_academic_year();

-- 3. Update Row Level Security Policies for Academic Years
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Read policy: Open to all users (public & authenticated)
DROP POLICY IF EXISTS "Academic years readable by all" ON public.academic_years;
DROP POLICY IF EXISTS "Academic years readable by authenticated" ON public.academic_years;
DROP POLICY IF EXISTS "Allow public read access to academic_years" ON public.academic_years;
CREATE POLICY "Academic years readable by all" ON public.academic_years
  FOR SELECT TO public
  USING (true);

-- Manage policy: Authorized Administrators can INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Academic years managed by admin" ON public.academic_years;
CREATE POLICY "Academic years managed by admin" ON public.academic_years
  FOR ALL TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.academic_years IS 'Deccan Mission High School academic years and session management';
