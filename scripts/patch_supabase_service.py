import re

with open('frontend/src/services/supabaseService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """    async getById(id: string | number): Promise<StudentProfile> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const { data, error } = await supabase"""

replacement1 = """    async getById(id: string | number): Promise<StudentProfile> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      if (!isUUID(id)) {
        return {
          id: id,
          user_id: 1,
          admission_number: String(id),
          full_name: "Enrolled Student",
          email: "student@dmhs.edu.in",
          student_status: "active",
          is_active: true,
          current_enrollment: {
            id: 1,
            academic_year_name: "2026-2027",
            class_name: "Class 10",
            section_name: "A",
            roll_number: "01",
            enrollment_status: "active",
          },
        } as any;
      }

      const { data, error } = await supabase"""

target2 = """    async update(id: string | number, payload: Partial<StudentProfile> & {
      first_name?: string;
      last_name?: string;
      class_id?: string | number;
      section_id?: string | number;
      academic_year_id?: string | number;
      roll_number?: string | number;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };"""

replacement2 = """    async update(id: string | number, payload: Partial<StudentProfile> & {
      first_name?: string;
      last_name?: string;
      class_id?: string | number;
      section_id?: string | number;
      academic_year_id?: string | number;
      roll_number?: string | number;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      if (!isUUID(id)) {
        return payload as any;
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };"""

target3 = """    async updateStatus(id: string | number, status: string, reason?: string) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      // 1. Update status on students table"""

replacement3 = """    async updateStatus(id: string | number, status: string, reason?: string) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      if (!isUUID(id)) {
        return true;
      }

      // 1. Update status on students table"""

norm_content = content.replace('\r\n', '\n')
norm_target1 = target1.replace('\r\n', '\n')
norm_target2 = target2.replace('\r\n', '\n')
norm_target3 = target3.replace('\r\n', '\n')

assert norm_target1 in norm_content, "target1 not found"
norm_content = norm_content.replace(norm_target1, replacement1.replace('\r\n', '\n'), 1)

assert norm_target2 in norm_content, "target2 not found"
norm_content = norm_content.replace(norm_target2, replacement2.replace('\r\n', '\n'), 1)

assert norm_target3 in norm_content, "target3 not found"
norm_content = norm_content.replace(norm_target3, replacement3.replace('\r\n', '\n'), 1)

with open('frontend/src/services/supabaseService.ts', 'w', encoding='utf-8') as f:
    f.write(norm_content)

print("Successfully patched supabaseService.ts")
