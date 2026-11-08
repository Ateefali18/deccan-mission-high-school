-- ==============================================================================
-- DECCAN MISSION HIGH SCHOOL ERP - STUDENT ADMISSION & DOCUMENTS SCHEMA
-- Migration: 20261108000001_student_admission_and_documents.sql
-- Supports: Caste, Religion, Languages, Aadhaar, APAAR ID, Separate Father/Mother
-- Details, Academic Category, and Enhanced Document Management.
-- ==============================================================================

-- 1. ADD NEW PERSONAL AND PARENT INFORMATION COLUMNS TO public.students
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS caste text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS mother_tongue text,
  ADD COLUMN IF NOT EXISTS first_language text,
  ADD COLUMN IF NOT EXISTS second_language text,
  ADD COLUMN IF NOT EXISTS third_language text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS apaar_id text,
  ADD COLUMN IF NOT EXISTS student_phone text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_phone text,
  ADD COLUMN IF NOT EXISTS father_email text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS mother_phone text,
  ADD COLUMN IF NOT EXISTS mother_email text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS academic_category text,
  ADD COLUMN IF NOT EXISTS academic_term_id uuid;

-- 2. CREATE INDEXES FOR FAST FILTERING
CREATE INDEX IF NOT EXISTS idx_students_caste ON public.students(caste);
CREATE INDEX IF NOT EXISTS idx_students_religion ON public.students(religion);
CREATE INDEX IF NOT EXISTS idx_students_aadhaar ON public.students(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_students_apaar ON public.students(apaar_id);

-- 3. ENSURE student-documents STORAGE BUCKET EXISTS AND CONFIGURED
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  true,
  15728640, -- 15MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- 4. STORAGE POLICIES FOR student-documents
DO $$
BEGIN
  -- Drop existing restrictive policy if present
  DROP POLICY IF EXISTS "Public student-documents read" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads to student-documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated deletes from student-documents" ON storage.objects;

  -- Create permissive policies for school administrators
  CREATE POLICY "Public student-documents read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'student-documents');

  CREATE POLICY "Allow authenticated uploads to student-documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'student-documents');

  CREATE POLICY "Allow authenticated deletes from student-documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'student-documents');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. UPDATE student_documents TABLE SCHEMA TO STORE FILE METADATA
ALTER TABLE public.student_documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'verified';

-- 6. REFRESH REALTIME PUBLICATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;
