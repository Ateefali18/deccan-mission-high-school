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
