-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - FEES, FACULTY DOCUMENTS & SETTINGS MIGRATION
-- Migration: 20261108000002_fees_faculty_and_settings.sql
-- ==============================================================================

-- 1. INSTITUTION SETTINGS & SCHOOL PROFILE ENHANCEMENTS
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS website text DEFAULT 'https://dmhs.edu.in';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '/dmhs-logo-128.png';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS board text DEFAULT 'Telangana State Board of Secondary Education (SSC)';

-- Allow authenticated users / admins to update school settings
DROP POLICY IF EXISTS "Allow authenticated admin update to schools" ON public.schools;
CREATE POLICY "Allow authenticated admin update to schools" ON public.schools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure public read remains intact
DROP POLICY IF EXISTS "Allow public read access to schools" ON public.schools;
CREATE POLICY "Allow public read access to schools" ON public.schools
  FOR SELECT TO public USING (true);


-- 2. TEACHERS ENHANCEMENTS (PERSONAL & PROFESSIONAL DETAILS)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS aadhaar_number text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS specialization text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS emergency_contact text;


-- 3. FACULTY DOCUMENTS TABLE & STORAGE
CREATE TABLE IF NOT EXISTS public.faculty_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id text NOT NULL,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'Certificate',
  file_url text NOT NULL,
  file_size bigint,
  mime_type text DEFAULT 'application/pdf',
  status text NOT NULL DEFAULT 'verified',
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faculty_documents_teacher_id ON public.faculty_documents(teacher_id);

ALTER TABLE public.faculty_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to faculty_documents" ON public.faculty_documents;
CREATE POLICY "Allow public read access to faculty_documents" ON public.faculty_documents
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage faculty_documents" ON public.faculty_documents;
CREATE POLICY "Allow authenticated manage faculty_documents" ON public.faculty_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create faculty-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'faculty-documents',
  'faculty-documents',
  true,
  15728640, -- 15MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public access to faculty documents" ON storage.objects;
CREATE POLICY "Public access to faculty documents" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'faculty-documents');

DROP POLICY IF EXISTS "Allow upload to faculty documents" ON storage.objects;
CREATE POLICY "Allow upload to faculty documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'faculty-documents');


-- 4. FEE STRUCTURES & COMPONENTS TABLE
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year_id text NOT NULL,
  academic_term_id text,
  category text NOT NULL, -- 'Pre-Primary', 'Primary', 'Higher Classes', 'Higher Secondary'
  class_name text NOT NULL, -- 'Nursery', 'Class 1', etc. or 'All in Category'
  class_id text,
  tuition_fee numeric(10,2) NOT NULL DEFAULT 0,
  admission_fee numeric(10,2) NOT NULL DEFAULT 0,
  exam_fee numeric(10,2) NOT NULL DEFAULT 0,
  library_fee numeric(10,2) NOT NULL DEFAULT 0,
  laboratory_fee numeric(10,2) NOT NULL DEFAULT 0,
  transport_fee numeric(10,2) NOT NULL DEFAULT 0,
  activity_fee numeric(10,2) NOT NULL DEFAULT 0,
  other_charges numeric(10,2) NOT NULL DEFAULT 0,
  custom_components jsonb DEFAULT '[]'::jsonb,
  total_applicable_fee numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to fee_structures" ON public.fee_structures;
CREATE POLICY "Allow public read access to fee_structures" ON public.fee_structures
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage fee_structures" ON public.fee_structures;
CREATE POLICY "Allow authenticated manage fee_structures" ON public.fee_structures
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime publication updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'faculty_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_documents;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fee_structures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
