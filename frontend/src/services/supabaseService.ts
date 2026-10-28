import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type {
  AcademicYear,
  SchoolClass,
  StudentListItem,
  StudentProfile,
  TeacherListItem,
  TeacherProfile,
  AdminDashboardStats,
  TeacherDashboardStats,
  StudentDashboardStats,
  SearchResultItem,
  NoticeItem,
  DocumentItem,
} from "../types";

export class SupabaseServiceError extends Error {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = "SupabaseServiceError";
    this.code = code;
    this.details = details;
  }
}

export const supabaseService = {
  // --------------------------------------------------------------------------
  // SCHOOL & CONFIGURATION
  // --------------------------------------------------------------------------
  schools: {
    async getCurrent() {
      if (!isSupabaseConfigured()) return null;
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("code", "DMHS-HYD")
        .maybeSingle();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // ACADEMIC YEARS
  // --------------------------------------------------------------------------
  academicYears: {
    async list(): Promise<AcademicYear[]> {
      if (!isSupabaseConfigured()) return [];
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data || [];
    },

    async getCurrent(): Promise<AcademicYear | null> {
      if (!isSupabaseConfigured()) return null;
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async create(payload: {
      school_id?: string;
      name: string;
      start_date: string;
      end_date: string;
      is_current?: boolean;
      status?: string;
    }): Promise<AcademicYear> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      
      let schoolId = payload.school_id;
      if (!schoolId) {
        const school = await supabaseService.schools.getCurrent();
        schoolId = school?.id;
      }

      const { data, error } = await supabase
        .from("academic_years")
        .insert({
          school_id: schoolId,
          name: payload.name,
          start_date: payload.start_date,
          end_date: payload.end_date,
          is_current: payload.is_current ?? false,
          status: payload.status ?? "planned",
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // CLASSES & SECTIONS
  // --------------------------------------------------------------------------
  classes: {
    async list(): Promise<SchoolClass[]> {
      if (!isSupabaseConfigured()) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("*, sections(*)")
        .order("grade_level", { ascending: true });

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data || [];
    },

    async create(payload: {
      school_id?: string;
      name: string;
      grade_level: number;
      stream?: string;
    }): Promise<SchoolClass> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      let schoolId = payload.school_id;
      if (!schoolId) {
        const school = await supabaseService.schools.getCurrent();
        schoolId = school?.id;
      }

      const { data, error } = await supabase
        .from("classes")
        .insert({
          school_id: schoolId,
          name: payload.name,
          grade_level: payload.grade_level,
          stream: payload.stream || "General",
        })
        .select("*, sections(*)")
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async createSection(
      classId: string | number,
      payload: { name: string; room_number?: string; capacity?: number }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("sections")
        .insert({
          class_id: classId,
          name: payload.name,
          room_number: payload.room_number || null,
          capacity: payload.capacity || 40,
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // TEACHERS
  // --------------------------------------------------------------------------
  teachers: {
    async list(params: { page?: number; limit?: number; search?: string } = {}) {
      if (!isSupabaseConfigured()) return { items: [], total: 0, page: 1, limit: 15 };

      const page = params.page || 1;
      const limit = params.limit || 15;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
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
      }));

      return {
        items,
        total: count || items.length,
        page,
        limit,
      };
    },

    async getById(id: string | number): Promise<TeacherProfile> {
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
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      const assignments = [
        ...(data.teacher_class_assignments || []).map((a: any) => ({
          id: a.id,
          academic_year_name: a.academic_years?.name || "Current Year",
          class_name: a.classes?.name || "All",
          section_name: a.sections?.name || "All",
          subject_name: a.is_class_teacher ? "Class Teacher Responsibility" : "General Assignment",
          role_type: a.is_class_teacher ? "Class Teacher" : "Subject Teacher",
        })),
        ...(data.teacher_subject_assignments || []).map((s: any) => ({
          id: s.id,
          academic_year_name: s.academic_years?.name || "Current Year",
          class_name: s.classes?.name || "",
          section_name: s.sections?.name || "",
          subject_name: s.subjects?.name || "Subject",
          role_type: "Subject Teacher",
        })),
      ];

      return {
        id: data.id,
        user_id: data.profile_id,
        employee_id: data.employee_id,
        full_name: `${data.profiles?.first_name || ""} ${data.profiles?.last_name || ""}`.trim(),
        email: data.profiles?.email || "",
        designation: data.specialization || "Faculty Member",
        department: data.qualification,
        qualification: data.qualification,
        joining_date: data.joining_date,
        employment_status: data.is_active ? "active" : "inactive",
        is_active: data.is_active,
        contact_phone: data.contact_phone,
        assignments,
      };
    },

    async create(payload: {
      first_name: string;
      last_name: string;
      email: string;
      employee_id: string;
      qualification?: string;
      specialization?: string;
      contact_phone?: string;
      joining_date?: string;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      // 1. Create or get profile
      const { data: profile, error: pError } = await supabase
        .from("profiles")
        .insert({
          school_id: schoolId,
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          role: "teacher",
          is_active: true,
        })
        .select()
        .single();

      if (pError) throw new SupabaseServiceError(pError.message, pError.code, pError.details);

      // 2. Create teacher record
      const { data: teacher, error: tError } = await supabase
        .from("teachers")
        .insert({
          profile_id: profile.id,
          school_id: schoolId,
          employee_id: payload.employee_id,
          qualification: payload.qualification || null,
          specialization: payload.specialization || null,
          contact_phone: payload.contact_phone || null,
          joining_date: payload.joining_date || new Date().toISOString().split("T")[0],
          is_active: true,
        })
        .select()
        .single();

      if (tError) throw new SupabaseServiceError(tError.message, tError.code, tError.details);
      return teacher;
    },

    async update(
      id: string | number,
      payload: {
        first_name?: string;
        last_name?: string;
        qualification?: string;
        specialization?: string;
        contact_phone?: string;
        is_active?: boolean;
      }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      // Update teacher table
      const teacherUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.qualification !== undefined) teacherUpdates.qualification = payload.qualification;
      if (payload.specialization !== undefined) teacherUpdates.specialization = payload.specialization;
      if (payload.contact_phone !== undefined) teacherUpdates.contact_phone = payload.contact_phone;
      if (payload.is_active !== undefined) teacherUpdates.is_active = payload.is_active;

      const { data: teacher, error: tError } = await supabase
        .from("teachers")
        .update(teacherUpdates)
        .eq("id", id)
        .select("profile_id")
        .single();

      if (tError) throw new SupabaseServiceError(tError.message, tError.code, tError.details);

      // Update profile table
      if (teacher?.profile_id && (payload.first_name || payload.last_name || payload.is_active !== undefined)) {
        const profileUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.first_name !== undefined) profileUpdates.first_name = payload.first_name;
        if (payload.last_name !== undefined) profileUpdates.last_name = payload.last_name;
        if (payload.is_active !== undefined) profileUpdates.is_active = payload.is_active;

        await supabase.from("profiles").update(profileUpdates).eq("id", teacher.profile_id);
      }

      return true;
    },

    async toggleStatus(id: string | number, isActive: boolean) {
      return this.update(id, { is_active: isActive });
    },
  },

  // --------------------------------------------------------------------------
  // STUDENTS & ENROLLMENTS
  // --------------------------------------------------------------------------
  students: {
    async list(params: {
      page?: number;
      limit?: number;
      classId?: string | number;
      sectionId?: string | number;
      status?: string;
      search?: string;
    } = {}) {
      if (!isSupabaseConfigured()) return { items: [], total: 0, page: 1, limit: 15 };

      const page = params.page || 1;
      const limit = params.limit || 15;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("students")
        .select(
          `
          *,
          student_enrollments(
            id,
            roll_number,
            status,
            classes(id, name),
            sections(id, name),
            academic_years(name)
          )
        `,
          { count: "exact" }
        );

      if (params.search) {
        query = query.or(
          `admission_number.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`
        );
      }

      if (params.status && params.status !== "all") {
        query = query.eq("student_status", params.status);
      }

      query = query.order("admission_number", { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      const items: StudentListItem[] = (data || []).map((s: any) => {
        const currentEnrollment = Array.isArray(s.student_enrollments)
          ? s.student_enrollments.find((e: any) => e.status === "active") || s.student_enrollments[0]
          : null;

        return {
          id: s.id,
          admission_number: s.admission_number,
          full_name: `${s.first_name} ${s.last_name || ""}`.trim(),
          email: `${s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.dmhs.edu.in`,
          class_name: currentEnrollment?.classes?.name || "Unassigned",
          section_name: currentEnrollment?.sections?.name || "-",
          roll_number: currentEnrollment?.roll_number ? String(currentEnrollment.roll_number) : null,
          student_status: s.student_status,
          photo_url: s.photo_url,
        };
      });

      return {
        items,
        total: count || items.length,
        page,
        limit,
      };
    },

    async getById(id: string | number): Promise<StudentProfile> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          student_enrollments(
            id,
            roll_number,
            status,
            classes(name),
            sections(name),
            academic_years(name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      const currentEnrollment = Array.isArray(data.student_enrollments)
        ? data.student_enrollments.find((e: any) => e.status === "active") || data.student_enrollments[0]
        : null;

      return {
        id: data.id,
        user_id: data.profile_id,
        admission_number: data.admission_number,
        full_name: `${data.first_name} ${data.last_name || ""}`.trim(),
        email: `${data.admission_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.dmhs.edu.in`,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        blood_group: data.blood_group,
        guardian_name: data.guardian_name,
        guardian_phone: data.guardian_phone,
        emergency_contact: data.emergency_contact,
        address: data.address,
        student_status: data.student_status,
        is_active: data.student_status === "active",
        photo_url: data.photo_url,
        current_enrollment: currentEnrollment
          ? {
              id: currentEnrollment.id,
              academic_year_name: currentEnrollment.academic_years?.name || "2025-2026",
              class_name: currentEnrollment.classes?.name || "Class 10",
              section_name: currentEnrollment.sections?.name || "A",
              roll_number: currentEnrollment.roll_number ? String(currentEnrollment.roll_number) : null,
              enrollment_status: currentEnrollment.status,
            }
          : null,
      };
    },

    async create(payload: {
      admission_number: string;
      first_name: string;
      last_name: string;
      date_of_birth?: string;
      gender?: string;
      blood_group?: string;
      guardian_name?: string;
      guardian_relationship?: string;
      guardian_phone?: string;
      emergency_contact?: string;
      address?: string;
      class_id?: string | number;
      section_id?: string | number;
      roll_number?: number;
      academic_year_id?: string | number;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      // 1. Insert Student
      const { data: student, error: sError } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          admission_number: payload.admission_number,
          first_name: payload.first_name,
          last_name: payload.last_name,
          date_of_birth: payload.date_of_birth || null,
          gender: payload.gender || null,
          blood_group: payload.blood_group || null,
          guardian_name: payload.guardian_name || null,
          guardian_relationship: payload.guardian_relationship || "Guardian",
          guardian_phone: payload.guardian_phone || null,
          emergency_contact: payload.emergency_contact || payload.guardian_phone || null,
          address: payload.address || null,
          student_status: "active",
        })
        .select()
        .single();

      if (sError) throw new SupabaseServiceError(sError.message, sError.code, sError.details);

      // 2. Insert Enrollment if class provided
      if (payload.class_id && payload.section_id) {
        let ayId = payload.academic_year_id;
        if (!ayId) {
          const currentAy = await supabaseService.academicYears.getCurrent();
          ayId = currentAy?.id;
        }

        if (ayId) {
          await supabase.from("student_enrollments").insert({
            student_id: student.id,
            academic_year_id: ayId,
            class_id: payload.class_id,
            section_id: payload.section_id,
            roll_number: payload.roll_number || null,
            is_current: true,
            status: "active",
          });
        }
      }

      return student;
    },

    async update(id: string | number, payload: Partial<StudentProfile>) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.full_name) {
        const parts = payload.full_name.trim().split(" ");
        updates.first_name = parts[0];
        updates.last_name = parts.slice(1).join(" ") || "";
      }
      if (payload.gender !== undefined) updates.gender = payload.gender;
      if (payload.date_of_birth !== undefined) updates.date_of_birth = payload.date_of_birth;
      if (payload.blood_group !== undefined) updates.blood_group = payload.blood_group;
      if (payload.guardian_name !== undefined) updates.guardian_name = payload.guardian_name;
      if (payload.guardian_phone !== undefined) updates.guardian_phone = payload.guardian_phone;
      if (payload.emergency_contact !== undefined) updates.emergency_contact = payload.emergency_contact;
      if (payload.address !== undefined) updates.address = payload.address;
      if (payload.student_status !== undefined) updates.student_status = payload.student_status;

      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async updateStatus(id: string | number, status: string, reason?: string) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      // 1. Update status on students table
      const { error: sError } = await supabase
        .from("students")
        .update({ student_status: status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (sError) throw new SupabaseServiceError(sError.message, sError.code, sError.details);

      // 2. Insert into student_status_history
      await supabase.from("student_status_history").insert({
        student_id: id,
        new_status: status,
        reason: reason || `Status changed to ${status} via ERP Portal`,
      });

      return true;
    },

    // Upload photo to profile-photos bucket
    async uploadPhoto(studentId: string | number, file: File): Promise<string> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const ext = file.name.split(".").pop();
      const filePath = `students/${studentId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new SupabaseServiceError(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update student table with photo_url
      await supabase
        .from("students")
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", studentId);

      return publicUrl;
    },

    // Documents
    async uploadDocument(
      studentId: string | number,
      file: File,
      documentType: string,
      title: string
    ): Promise<DocumentItem> {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const ext = file.name.split(".").pop();
      const filePath = `documents/${studentId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(filePath, file);

      if (uploadError) throw new SupabaseServiceError(uploadError.message);

      // Get signed URL for download (expires in 1 year)
      const { data: signData, error: signError } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const fileUrl = signData?.signedUrl || filePath;

      const { data, error } = await supabase
        .from("student_documents")
        .insert({
          student_id: studentId,
          document_type: documentType,
          title: title || file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          status: "verified",
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async getDocuments(studentId: string | number): Promise<DocumentItem[]> {
      if (!isSupabaseConfigured()) return [];

      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data || [];
    },
  },

  // --------------------------------------------------------------------------
  // NOTICES
  // --------------------------------------------------------------------------
  notices: {
    async list(audience: string = "all"): Promise<NoticeItem[]> {
      if (!isSupabaseConfigured()) return [];

      let query = supabase
        .from("notices")
        .select("*")
        .eq("is_published", true)
        .order("publish_date", { ascending: false })
        .limit(10);

      if (audience !== "all") {
        query = query.or(`target_audience.eq.all,target_audience.eq.${audience}`);
      }

      const { data, error } = await query;
      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data || [];
    },

    async create(payload: {
      title: string;
      content: string;
      target_audience?: string;
      priority?: string;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      const { data, error } = await supabase
        .from("notices")
        .insert({
          school_id: schoolId,
          title: payload.title,
          content: payload.content,
          target_audience: payload.target_audience || "all",
          priority: payload.priority || "normal",
          is_published: true,
          publish_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },
  },

  // --------------------------------------------------------------------------
  // DASHBOARDS
  // --------------------------------------------------------------------------
  dashboards: {
    async getAdmin(): Promise<AdminDashboardStats> {
      if (!isSupabaseConfigured()) {
        return {
          total_active_students: 0,
          total_active_teachers: 0,
          total_classes: 0,
          total_sections: 0,
          current_academic_year: "2025-2026",
          recent_activity: [],
          upcoming_features: ["Attendance Tracker", "Marks Ledger", "Fee Collection", "Notices Board"],
        };
      }

      // Aggregate live counts from Supabase
      const [studentsRes, teachersRes, classesRes, sectionsRes, currentAyRes, auditRes] =
        await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }).eq("student_status", "active"),
          supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("sections").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("academic_years").select("id, name").eq("is_current", true).maybeSingle(),
          supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5),
        ]);

      const recentActivity = (auditRes.data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        resource_type: log.resource_type,
        details: typeof log.details === "object" ? JSON.stringify(log.details) : log.details,
        created_at: log.created_at,
        user_name: "Admin User",
      }));

      return {
        total_active_students: studentsRes.count || 0,
        total_active_teachers: teachersRes.count || 0,
        total_classes: classesRes.count || 0,
        total_sections: sectionsRes.count || 0,
        current_academic_year: currentAyRes.data?.name || "2025-2026",
        current_academic_year_id: currentAyRes.data?.id || null,
        recent_activity: recentActivity,
        upcoming_features: [
          "Phase 2: Live Supabase DB Persistence",
          "Biometric & Daily Attendance",
          "CBSE Examination Marks Ledger",
          "Fee Invoicing & Online Receipts",
          "AI Student Assistant (Authorized queries)",
        ],
      };
    },

    async getTeacher(): Promise<TeacherDashboardStats> {
      return {
        teacher_name: "Mrs. Fatima Zahra",
        employee_id: "EMP-HYD-0101",
        designation: "Senior Mathematics Faculty",
        department: "M.Sc. Mathematics, B.Ed.",
        current_academic_year: "2025-2026",
        total_assigned_classes: 2,
        total_authorized_students: 80,
        assigned_subjects: ["Mathematics", "Computer Applications"],
        assignments: [
          { id: 1, class_name: "Class 10", section_name: "A", subject: "Mathematics", role_type: "Class Teacher" },
          { id: 2, class_name: "Class 10", section_name: "B", subject: "Mathematics", role_type: "Subject Teacher" },
        ],
        today_schedule_placeholder: "Period 1: Class 10-A (Math) | Period 3: Class 10-B (Math) | Period 5: Lab",
      };
    },

    async getStudent(): Promise<StudentDashboardStats> {
      return {
        student_name: "Zeeshan Khan",
        admission_number: "DMHS-2025-0001",
        roll_number: "01",
        class_name: "Class 10",
        section_name: "A",
        current_academic_year: "2025-2026",
        status: "active",
        guardian_name: "Tariq Khan (Father)",
        today_schedule_placeholder: "08:30 AM - Morning Assembly | 09:00 AM - Mathematics | 10:00 AM - Science",
      };
    },
  },

  // --------------------------------------------------------------------------
  // GLOBAL SEARCH
  // --------------------------------------------------------------------------
  search: {
    async query(q: string, limit: number = 15): Promise<SearchResultItem[]> {
      if (!isSupabaseConfigured() || !q.trim()) return [];

      const cleanQuery = q.trim();

      const [studentsRes, teachersRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, admission_number, first_name, last_name, student_status")
          .or(`admission_number.ilike.%${cleanQuery}%,first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%`)
          .limit(limit),
        supabase
          .from("teachers")
          .select("id, employee_id, specialization, profiles(first_name, last_name)")
          .or(`employee_id.ilike.%${cleanQuery}%`)
          .limit(limit),
      ]);

      const results: SearchResultItem[] = [];

      (studentsRes.data || []).forEach((s: any) => {
        results.push({
          id: s.id,
          type: "student",
          identifier: s.admission_number,
          title: `${s.first_name} ${s.last_name || ""}`.trim(),
          subtitle: `Admission: ${s.admission_number} • Status: ${s.student_status}`,
        });
      });

      (teachersRes.data || []).forEach((t: any) => {
        const name = `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim() || "Teacher";
        results.push({
          id: t.id,
          type: "teacher",
          identifier: t.employee_id,
          title: name,
          subtitle: `Employee ID: ${t.employee_id} • ${t.specialization || "Faculty"}`,
        });
      });

      return results.slice(0, limit);
    },
  },

  // --------------------------------------------------------------------------
  // REALTIME SUBSCRIPTIONS
  // --------------------------------------------------------------------------
  realtime: {
    subscribe(table: string, onEvent: (payload: any) => void) {
      if (!isSupabaseConfigured()) return () => {};

      const channel = supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            onEvent(payload);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  },
};
