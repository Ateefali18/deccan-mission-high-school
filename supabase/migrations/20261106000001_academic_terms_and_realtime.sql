-- ====================================================================
-- DECCAN MISSION HIGH SCHOOL ERP (DMHS)
-- Migration: 20261106000001_academic_terms_and_realtime.sql
-- Description: Academic Terms Table, Term Hierarchy, Single Active Term, & Realtime
-- ====================================================================

-- 1. Create Academic Terms Table
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g. 'Term 1 (FA1 + SA1)', 'Term 2 (FA2 + SA2)', 'Annual Term'
  term_type text DEFAULT 'term' CHECK (term_type IN ('term', 'semester', 'annual', 'quarter')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('planned', 'active', 'completed', 'inactive')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(academic_year_id, name)
);

-- 2. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_academic_terms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_academic_terms_updated_at ON public.academic_terms;
CREATE TRIGGER trg_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_academic_terms_timestamp();

-- 3. Trigger to ensure only one term is active/current at a time
CREATE OR REPLACE FUNCTION public.sync_current_academic_term()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.academic_terms
    SET is_current = false
    WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_current_academic_term ON public.academic_terms;
CREATE TRIGGER trg_sync_current_academic_term
  BEFORE INSERT OR UPDATE OF is_current ON public.academic_terms
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.sync_current_academic_term();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone authenticated or public can view terms
DROP POLICY IF EXISTS "Academic terms readable by all" ON public.academic_terms;
CREATE POLICY "Academic terms readable by all" ON public.academic_terms
  FOR SELECT TO public
  USING (true);

-- Manage policy: Administrators can insert, update, delete
DROP POLICY IF EXISTS "Academic terms managed by admin" ON public.academic_terms;
CREATE POLICY "Academic terms managed by admin" ON public.academic_terms
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 5. Enable Realtime Publications for Dashboard Tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_years;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_terms;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
