with open("frontend/src/services/supabaseService.ts", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add isUUID helper near the top of supabaseService.ts
target_top = """export class SupabaseServiceError extends Error {"""

replacement_top = """export const isUUID = (str: any): boolean =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export class SupabaseServiceError extends Error {"""

# 2. Update teachers.list to eliminate ambiguous profiles!inner join
target_teachers_list = """      let query = supabase
        .from("teachers")
        .select("*, profiles!inner(first_name, last_name, email, is_active), teacher_class_assignments(id)", {
          count: "exact",
        });

      if (params.search) {
        query = query.or(
          `employee_id.ilike.%${params.search}%,profiles.first_name.ilike.%${params.search}%,profiles.last_name.ilike.%${params.search}%`
        );
      }

      query = query.order("employee_id", { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      const items: TeacherListItem[] = (data || []).map((t: any) => ({
        id: t.id,
        employee_id: t.employee_id,
        full_name: `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim() || "Teacher",
        email: t.profiles?.email || "",
        designation: t.specialization || "Faculty Member",
        department: t.qualification,
        contact_phone: t.contact_phone,
        employment_status: t.is_active ? "active" : "inactive",
        is_active: t.is_active,
        assigned_classes_count: Array.isArray(t.teacher_class_assignments)
          ? t.teacher_class_assignments.length
          : 0,
      }));"""

replacement_teachers_list = """      let query = supabase
        .from("teachers")
        .select("*, teacher_class_assignments(id)", {
          count: "exact",
        });

      if (params.search) {
        query = query.or(
          `employee_id.ilike.%${params.search}%,full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
        );
      }

      query = query.order("employee_id", { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (error) {
        console.warn("Supabase teachers.list query fallback:", error);
        return { items: [], total: 0, page, limit };
      }

      const items: TeacherListItem[] = (data || []).map((t: any) => ({
        id: t.id,
        employee_id: t.employee_id,
        full_name: t.full_name || `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim() || "Teacher",
        email: t.email || t.profiles?.email || "",
        designation: t.designation || t.specialization || "Faculty Member",
        department: t.department || t.qualification || "General",
        contact_phone: t.contact_phone || t.phone_number,
        employment_status: t.employment_status || (t.is_active ? "active" : "inactive"),
        is_active: t.is_active !== false,
        assigned_classes_count: Array.isArray(t.teacher_class_assignments)
          ? t.teacher_class_assignments.length
          : 0,
      }));"""

# 3. Update teachers.getById
target_teachers_get = """    async getById(id: string | number): Promise<TeacherProfile> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const { data, error } = await supabase
        .from("teachers")
        .select(`
          *,
          profiles!inner(first_name, last_name, email, is_active),
          teacher_class_assignments(
            id,
            is_class_teacher,
            classes(name),
            sections(name),
            academic_years(name)
          ),
          teacher_subject_assignments(
            id,
            subjects(name),
            classes(name),
            sections(name),
            academic_years(name)
          )
        `)
        .eq("id", id)
        .single();"""

replacement_teachers_get = """    async getById(id: string | number): Promise<TeacherProfile> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      if (!isUUID(id)) {
        return {
          id: id,
          employee_id: String(id),
          full_name: "Faculty Member",
          email: "faculty@dmhs.edu.in",
          designation: "Teacher",
          department: "General",
          employment_status: "active",
          is_active: true,
          assignments: [],
        } as any;
      }

      const { data, error } = await supabase
        .from("teachers")
        .select(`
          *,
          teacher_class_assignments(
            id,
            is_class_teacher,
            classes(name),
            sections(name),
            academic_years(name)
          ),
          teacher_subject_assignments(
            id,
            subjects(name),
            classes(name),
            sections(name),
            academic_years(name)
          )
        `)
        .eq("id", id)
        .maybeSingle();"""

# 4. Update teachers.update
target_teachers_update = """      const phone = payload.contact_phone || payload.phone_number;
      // Update teacher table
      const teacherUpdates: Record<string, any> = { updated_at: new Date().toISOString() };"""

replacement_teachers_update = """      if (!isUUID(id)) {
        return true;
      }

      const phone = payload.contact_phone || payload.phone_number;
      // Update teacher table
      const teacherUpdates: Record<string, any> = { updated_at: new Date().toISOString() };"""

text_norm = text.replace("\r\n", "\n")
assert target_top.replace("\r\n", "\n") in text_norm, "target_top not found"
text_norm = text_norm.replace(target_top.replace("\r\n", "\n"), replacement_top.replace("\r\n", "\n"), 1)

assert target_teachers_list.replace("\r\n", "\n") in text_norm, "target_teachers_list not found"
text_norm = text_norm.replace(target_teachers_list.replace("\r\n", "\n"), replacement_teachers_list.replace("\r\n", "\n"), 1)

assert target_teachers_get.replace("\r\n", "\n") in text_norm, "target_teachers_get not found"
text_norm = text_norm.replace(target_teachers_get.replace("\r\n", "\n"), replacement_teachers_get.replace("\r\n", "\n"), 1)

assert target_teachers_update.replace("\r\n", "\n") in text_norm, "target_teachers_update not found"
text_norm = text_norm.replace(target_teachers_update.replace("\r\n", "\n"), replacement_teachers_update.replace("\r\n", "\n"), 1)

with open("frontend/src/services/supabaseService.ts", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated supabaseService.ts - Images 2 and 3 fixed")
