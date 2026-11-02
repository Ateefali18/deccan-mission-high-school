
const isUUID = (str: string | number): boolean => {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

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
  ExpenseItem,
  ExpenseStats,
  FeeFinancialSummary,
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
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("code", "DMHS-HYD")
          .maybeSingle();

        if (data) return data;

        // Fallback: fetch any active school or create baseline reference
        const { data: anySchool } = await supabase.from("schools").select("*").limit(1).maybeSingle();
        if (anySchool) return anySchool;
      } catch (e) {
        console.warn("Could not retrieve school from Supabase:", e);
      }

      // Safe fallback object aligned with 20261102000001_fix_admin_permissions_and_ssc.sql
      return {
        id: "e0000000-0000-0000-0000-000000000001",
        code: "DMHS-HYD",
        name: "Deccan Mission High School",
        affiliation_number: "TS-HYD-SSC-41092",
        board: "Telangana State Board of Secondary Education (SSC)",
        address: "Moghulpura, Charminar Zone, Hyderabad, Telangana 500002",
        contact_email: "contact@dmhs.edu.in",
        contact_phone: "+91 40 2456 7890",
      };
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

      // Prevent duplicate class name
      try {
        const { data: existing } = await supabase
          .from("classes")
          .select("id, name")
          .eq("name", payload.name.trim())
          .maybeSingle();

        if (existing) {
          throw new SupabaseServiceError(`Class "${payload.name}" already exists.`);
        }
      } catch (checkErr: any) {
        if (checkErr instanceof SupabaseServiceError) throw checkErr;
      }

      const { data, error } = await supabase
        .from("classes")
        .insert({
          school_id: schoolId,
          name: payload.name.trim(),
          grade_level: payload.grade_level,
          stream: payload.stream || "General",
          is_active: true,
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

      // Prevent duplicate section in same class
      if (isUUID(classId)) {
        try {
          const { data: existing } = await supabase
            .from("sections")
            .select("id, name")
            .eq("class_id", classId)
            .eq("name", payload.name.trim())
            .maybeSingle();

          if (existing) {
            throw new SupabaseServiceError(`Section "${payload.name}" already exists in this class.`);
          }
        } catch (checkErr: any) {
          if (checkErr instanceof SupabaseServiceError) throw checkErr;
        }
      } else {
        return {
          id: "sec_" + Date.now(),
          class_id: classId,
          name: payload.name.trim(),
          room_number: payload.room_number || null,
          capacity: payload.capacity || 40,
          is_active: true,
        };
      }

      const { data, error } = await supabase
        .from("sections")
        .insert({
          class_id: classId,
          name: payload.name.trim(),
          room_number: payload.room_number || null,
          capacity: payload.capacity || 40,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async update(
      classId: string | number,
      payload: { name?: string; grade_level?: number; stream?: string; is_active?: boolean }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.grade_level !== undefined) updates.grade_level = payload.grade_level;
      if (payload.stream !== undefined) updates.stream = payload.stream;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { data, error } = await supabase
        .from("classes")
        .update(updates)
        .eq("id", classId)
        .select("*, sections(*)")
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async deactivate(classId: string | number) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("classes")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", classId)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async updateSection(
      sectionId: string | number,
      payload: { name?: string; room_number?: string; capacity?: number; is_active?: boolean }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.room_number !== undefined) updates.room_number = payload.room_number;
      if (payload.capacity !== undefined) updates.capacity = payload.capacity;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { data, error } = await supabase
        .from("sections")
        .update(updates)
        .eq("id", sectionId)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async deactivateSection(sectionId: string | number) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("sections")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", sectionId)
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
      first_name?: string;
      last_name?: string;
      full_name?: string;
      email: string;
      employee_id: string;
      qualification?: string;
      specialization?: string;
      designation?: string;
      department?: string;
      contact_phone?: string;
      phone_number?: string;
      joining_date?: string;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      // Duplicate check for Employee ID
      const { data: existingEmp } = await supabase
        .from("teachers")
        .select("id")
        .eq("employee_id", payload.employee_id)
        .maybeSingle();

      if (existingEmp) {
        throw new SupabaseServiceError(`Faculty member with Employee ID "${payload.employee_id}" already exists.`);
      }

      const rawName = (payload.full_name || `${payload.first_name || ""} ${payload.last_name || ""}`).trim();
      const parts = rawName.split(" ");
      const firstName = payload.first_name || parts[0] || "Faculty";
      const lastName = payload.last_name || parts.slice(1).join(" ") || "";
      const phone = payload.contact_phone || payload.phone_number || null;
      const desig = payload.designation || payload.specialization || "Teacher";

      // 1. Create or get profile
      let profileId: string | undefined;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", payload.email)
        .maybeSingle();

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const { data: profile, error: pError } = await supabase
          .from("profiles")
          .insert({
            school_id: schoolId,
            email: payload.email,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: "teacher",
            is_active: true,
          })
          .select()
          .single();

        if (pError) throw new SupabaseServiceError(pError.message, pError.code, pError.details);
        profileId = profile.id;
      }

      // 2. Create teacher record
      const { data: teacher, error: tError } = await supabase
        .from("teachers")
        .insert({
          profile_id: profileId,
          school_id: schoolId,
          employee_id: payload.employee_id,
          full_name: rawName,
          email: payload.email,
          qualification: payload.qualification || null,
          specialization: desig,
          designation: desig,
          department: payload.department || null,
          contact_phone: phone,
          phone_number: phone,
          joining_date: payload.joining_date || new Date().toISOString().split("T")[0],
          employment_status: "active",
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
        full_name?: string;
        email?: string;
        qualification?: string;
        specialization?: string;
        designation?: string;
        department?: string;
        contact_phone?: string;
        phone_number?: string;
        is_active?: boolean;
        employment_status?: string;
      }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const phone = payload.contact_phone || payload.phone_number;
      // Update teacher table
      const teacherUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.full_name !== undefined) teacherUpdates.full_name = payload.full_name;
      if (payload.email !== undefined) teacherUpdates.email = payload.email;
      if (payload.qualification !== undefined) teacherUpdates.qualification = payload.qualification;
      if (payload.specialization !== undefined) teacherUpdates.specialization = payload.specialization;
      if (payload.designation !== undefined) {
        teacherUpdates.designation = payload.designation;
        if (!payload.specialization) teacherUpdates.specialization = payload.designation;
      }
      if (payload.department !== undefined) teacherUpdates.department = payload.department;
      if (phone !== undefined) {
        teacherUpdates.contact_phone = phone;
        teacherUpdates.phone_number = phone;
      }
      if (payload.is_active !== undefined) {
        teacherUpdates.is_active = payload.is_active;
        teacherUpdates.employment_status = payload.is_active ? "active" : "inactive";
      }
      if (payload.employment_status !== undefined) {
        teacherUpdates.employment_status = payload.employment_status;
        if (["resigned", "retired", "inactive"].includes(payload.employment_status)) {
          teacherUpdates.is_active = false;
        }
      }

      const { data: teacher, error: tError } = await supabase
        .from("teachers")
        .update(teacherUpdates)
        .eq("id", id)
        .select("profile_id")
        .single();

      if (tError) throw new SupabaseServiceError(tError.message, tError.code, tError.details);

      // Update profile table
      if (teacher?.profile_id) {
        const profileUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.full_name) {
          const parts = payload.full_name.trim().split(" ");
          profileUpdates.first_name = parts[0];
          profileUpdates.last_name = parts.slice(1).join(" ") || "";
        }
        if (payload.first_name !== undefined) profileUpdates.first_name = payload.first_name;
        if (payload.last_name !== undefined) profileUpdates.last_name = payload.last_name;
        if (payload.email !== undefined) profileUpdates.email = payload.email;
        if (phone !== undefined) profileUpdates.phone = phone;
        if (payload.is_active !== undefined) profileUpdates.is_active = payload.is_active;

        if (Object.keys(profileUpdates).length > 1) {
          await supabase.from("profiles").update(profileUpdates).eq("id", teacher.profile_id);
        }
      }

      return true;
    },

    async toggleStatus(id: string | number, isActive: boolean) {
      return this.update(id, { is_active: isActive });
    },

    async deactivate(id: string | number) {
      return this.update(id, { is_active: false, employment_status: "inactive" });
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
      first_name?: string;
      last_name?: string;
      full_name?: string;
      email?: string;
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
      roll_number?: string | number;
      academic_year_id?: string | number;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      // Duplicate check for Admission Number
      const { data: existingAdm } = await supabase
        .from("students")
        .select("id")
        .eq("admission_number", payload.admission_number)
        .maybeSingle();

      if (existingAdm) {
        throw new SupabaseServiceError(`Student with Admission Number "${payload.admission_number}" already exists.`);
      }

      const rawName = (payload.full_name || `${payload.first_name || ""} ${payload.last_name || ""}`).trim();
      const parts = rawName.split(" ");
      const firstName = payload.first_name || parts[0] || "Student";
      const lastName = payload.last_name || parts.slice(1).join(" ") || "";

      // 1. Insert Student
      const { data: student, error: sError } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          admission_number: payload.admission_number,
          first_name: firstName,
          last_name: lastName,
          full_name: rawName,
          email: payload.email || `${payload.admission_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.dmhs.edu.in`,
          date_of_birth: payload.date_of_birth || null,
          gender: payload.gender || null,
          blood_group: payload.blood_group || null,
          guardian_name: payload.guardian_name || null,
          guardian_relationship: payload.guardian_relationship || "Guardian",
          guardian_phone: payload.guardian_phone || null,
          emergency_contact: payload.emergency_contact || payload.guardian_phone || null,
          address: payload.address || null,
          student_status: "active",
          is_active: true,
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
            roll_number: payload.roll_number ? String(payload.roll_number) : null,
            is_current: true,
            status: "active",
            enrollment_status: "enrolled",
          });
        }
      }

      return student;
    },

    async update(id: string | number, payload: Partial<StudentProfile> & {
      first_name?: string;
      last_name?: string;
      class_id?: string | number;
      section_id?: string | number;
      academic_year_id?: string | number;
      roll_number?: string | number;
    }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.full_name) {
        updates.full_name = payload.full_name;
        const parts = payload.full_name.trim().split(" ");
        updates.first_name = parts[0];
        updates.last_name = parts.slice(1).join(" ") || "";
      }
      if (payload.first_name) updates.first_name = payload.first_name;
      if (payload.last_name) updates.last_name = payload.last_name;
      if (payload.email) updates.email = payload.email;
      if (payload.gender !== undefined) updates.gender = payload.gender;
      if (payload.date_of_birth !== undefined) updates.date_of_birth = payload.date_of_birth;
      if (payload.blood_group !== undefined) updates.blood_group = payload.blood_group;
      if (payload.guardian_name !== undefined) updates.guardian_name = payload.guardian_name;
      if (payload.guardian_phone !== undefined) updates.guardian_phone = payload.guardian_phone;
      if (payload.emergency_contact !== undefined) updates.emergency_contact = payload.emergency_contact;
      if (payload.address !== undefined) updates.address = payload.address;
      if (payload.student_status !== undefined) updates.student_status = payload.student_status;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { data: student, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      // Update or create enrollment if class_id and section_id are provided
      if (payload.class_id && payload.section_id) {
        let ayId = payload.academic_year_id;
        if (!ayId) {
          const currentAy = await supabaseService.academicYears.getCurrent();
          ayId = currentAy?.id;
        }

        if (ayId) {
          const { data: existingEnr } = await supabase
            .from("student_enrollments")
            .select("id")
            .eq("student_id", id)
            .eq("academic_year_id", ayId)
            .maybeSingle();

          if (existingEnr) {
            await supabase
              .from("student_enrollments")
              .update({
                class_id: payload.class_id,
                section_id: payload.section_id,
                roll_number: payload.roll_number ? String(payload.roll_number) : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingEnr.id);
          } else {
            await supabase.from("student_enrollments").insert({
              student_id: id,
              academic_year_id: ayId,
              class_id: payload.class_id,
              section_id: payload.section_id,
              roll_number: payload.roll_number ? String(payload.roll_number) : null,
              is_current: true,
              status: "active",
            });
          }
        }
      }

      return student;
    },

    async deactivate(id: string | number) {
      return this.updateStatus(id, "inactive", "Deactivated by administrator");
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
          "SSC Examination Marks Ledger",
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
  // ATTENDANCE
  // --------------------------------------------------------------------------
  attendance: {
    async getSession(params: {
      section_id: string | number;
      session_date: string;
      period_number?: number;
    }) {
      if (!isSupabaseConfigured()) {
        return { session_id: null, records: {} };
      }

      const periodNumber = params.period_number ?? 0;
      const { data: session, error: sessionErr } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("section_id", params.section_id)
        .eq("session_date", params.session_date)
        .eq("period_number", periodNumber)
        .maybeSingle();

      if (sessionErr) throw new SupabaseServiceError(sessionErr.message, sessionErr.code, sessionErr.details);
      if (!session) return { session_id: null, records: {} };

      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("session_id", session.id);

      if (recErr) throw new SupabaseServiceError(recErr.message, recErr.code, recErr.details);

      const recordMap: Record<string, { id: string | number; status: string; remarks?: string }> = {};
      (records || []).forEach((r: any) => {
        recordMap[String(r.student_id)] = {
          id: r.id,
          status: r.status,
          remarks: r.remarks,
        };
      });

      return {
        session_id: session.id,
        session_date: session.session_date,
        period_number: session.period_number,
        academic_year_id: session.academic_year_id,
        class_id: session.class_id,
        section_id: session.section_id,
        status: session.status,
        records: recordMap,
      };
    },

    async submit(data: {
      academic_year_id: string | number;
      class_id: string | number;
      section_id: string | number;
      session_date: string;
      period_number?: number;
      records: Array<{ student_id: string | number; status: string; remarks?: string }>;
    }) {
      if (!isSupabaseConfigured()) {
        return { session_id: "mock-session", message: "Attendance saved (local)" };
      }

      const schoolId = await supabaseService.schools.getCurrent();
      const periodNumber = data.period_number ?? 0;

      // 1. Check if session already exists
      const { data: existingSession, error: findErr } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("section_id", data.section_id)
        .eq("session_date", data.session_date)
        .eq("period_number", periodNumber)
        .maybeSingle();

      if (findErr) throw new SupabaseServiceError(findErr.message, findErr.code, findErr.details);

      let sessionId: string;
      if (existingSession) {
        sessionId = existingSession.id;
        await supabase
          .from("attendance_sessions")
          .update({
            status: "submitted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      } else {
        const { data: newSession, error: createErr } = await supabase
          .from("attendance_sessions")
          .insert({
            school_id: schoolId,
            academic_year_id: data.academic_year_id,
            class_id: data.class_id,
            section_id: data.section_id,
            session_date: data.session_date,
            period_number: periodNumber,
            status: "submitted",
          })
          .select("id")
          .single();

        if (createErr) throw new SupabaseServiceError(createErr.message, createErr.code, createErr.details);
        sessionId = newSession.id;
      }

      // 2. Upsert attendance records
      const recordInserts = data.records.map((r) => ({
        session_id: sessionId,
        student_id: r.student_id,
        status: r.status,
        remarks: r.remarks || null,
      }));

      const { error: upsertErr } = await supabase
        .from("attendance_records")
        .upsert(recordInserts, { onConflict: "session_id,student_id" });

      if (upsertErr) throw new SupabaseServiceError(upsertErr.message, upsertErr.code, upsertErr.details);

      return { session_id: sessionId, total_records: data.records.length, message: "Attendance records saved successfully." };
    },

    async getDateWiseReport(params: {
      class_id?: string | number;
      section_id?: string | number;
      from_date?: string;
      to_date?: string;
    } = {}) {
      if (!isSupabaseConfigured()) {
        return [];
      }

      let query = supabase
        .from("attendance_sessions")
        .select(`
          id,
          session_date,
          period_number,
          status,
          class_id,
          section_id,
          classes(name),
          sections(name),
          attendance_records(id, status, student_id)
        `)
        .order("session_date", { ascending: false });

      if (params.class_id) query = query.eq("class_id", params.class_id);
      if (params.section_id) query = query.eq("section_id", params.section_id);
      if (params.from_date) query = query.gte("session_date", params.from_date);
      if (params.to_date) query = query.lte("session_date", params.to_date);

      const { data, error } = await query;
      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      return (data || []).map((s: any) => {
        const records = s.attendance_records || [];
        const present = records.filter((r: any) => r.status === "present").length;
        const late = records.filter((r: any) => r.status === "late").length;
        const absent = records.filter((r: any) => r.status === "absent").length;
        const excused = records.filter((r: any) => r.status === "excused").length;
        const total = records.length;
        const pct = total > 0 ? Math.round(((present + late * 0.5) / total) * 10000) / 100 : 100.0;

        return {
          session_id: s.id,
          session_date: s.session_date,
          period_number: s.period_number,
          class_id: s.class_id,
          class_name: s.classes?.name || `Class ${s.class_id}`,
          section_id: s.section_id,
          section_name: s.sections?.name || `Sec ${s.section_id}`,
          total_students: total,
          present_count: present,
          late_count: late,
          absent_count: absent,
          excused_count: excused,
          attendance_percentage: pct,
          status: s.status,
        };
      });
    },

    async getStudentSummary(studentId: string | number) {
      if (!isSupabaseConfigured()) {
        return {
          student_id: studentId,
          total_sessions: 30,
          present_count: 28,
          late_count: 1,
          absent_count: 1,
          excused_count: 0,
          attendance_percentage: 95.0,
          is_low_attendance: false,
        };
      }

      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, status")
        .eq("student_id", studentId);

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      const records = data || [];
      const present = records.filter((r) => r.status === "present").length;
      const late = records.filter((r) => r.status === "late").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const excused = records.filter((r) => r.status === "excused").length;
      const total = records.length;
      const pct = total > 0 ? Math.round(((present + late * 0.5) / total) * 10000) / 100 : 100.0;

      return {
        student_id: studentId,
        total_sessions: total,
        present_count: present,
        late_count: late,
        absent_count: absent,
        excused_count: excused,
        attendance_percentage: pct,
        is_low_attendance: pct < 75.0,
      };
    },
  },

  // --------------------------------------------------------------------------
  // EXAMINATIONS, SUBJECTS & MARKS
  // --------------------------------------------------------------------------
  exams: {
    async list(academicYearId?: string | number) {
      if (!isSupabaseConfigured()) {
        return [
          { id: 1, name: "Mid-Term Examination 2025-26", academic_year_id: 1, is_published: true, start_date: "2026-10-01", end_date: "2026-10-15" },
          { id: 2, name: "SSC Summative Assessment I (SA-1)", academic_year_id: 1, is_published: true, start_date: "2026-12-01", end_date: "2026-12-15" },
          { id: 3, name: "Annual Summative Assessment", academic_year_id: 1, is_published: false, start_date: "2027-03-01", end_date: "2027-03-20" },
        ];
      }

      let query = supabase.from("exams").select("*").order("start_date", { ascending: false });
      if (academicYearId) query = query.eq("academic_year_id", academicYearId);
      const { data, error } = await query;
      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      if (!data || data.length === 0) {
        // Fallback default exam if table is unseeded
        return [
          { id: 1, name: "Mid-Term Examination 2025-26", academic_year_id: 1, is_published: true, start_date: "2026-10-01", end_date: "2026-10-15" },
          { id: 2, name: "SSC Summative Assessment I (SA-1)", academic_year_id: 1, is_published: true, start_date: "2026-12-01", end_date: "2026-12-15" },
        ];
      }
      return data;
    },
  },

  subjects: {
    async list(classId?: string | number) {
      if (!isSupabaseConfigured()) {
        return [
          { id: "sub_1", name: "First Language: Telugu", code: "TEL-101", department: "Languages", is_active: true },
          { id: "sub_2", name: "Second Language: Hindi", code: "HIN-102", department: "Languages", is_active: true },
          { id: "sub_3", name: "Third Language: English", code: "ENG-103", department: "Languages", is_active: true },
          { id: "sub_4", name: "Mathematics", code: "MAT-201", department: "Mathematics", is_active: true },
          { id: "sub_5", name: "General Science (Physical & Bio)", code: "SCI-301", department: "Science", is_active: true },
          { id: "sub_6", name: "Social Studies", code: "SOC-401", department: "Humanities", is_active: true },
          { id: "sub_7", name: "Information Technology", code: "IT-501", department: "Computer Science", is_active: true },
          { id: "sub_8", name: "First Language: Urdu", code: "URD-101", department: "Languages", is_active: true },
        ];
      }

      if (classId) {
        try {
          const { data: assignments, error: aErr } = await supabase
            .from("class_subjects")
            .select("id, class_id, subject_id, is_elective, subjects(*)")
            .eq("class_id", classId);

          if (!aErr && assignments && assignments.length > 0) {
            return assignments.map((a: any) => ({
              id: a.subjects?.id || a.subject_id,
              name: a.subjects?.name || "Subject",
              code: a.subjects?.code || "SUB",
              department: a.subjects?.department || "General",
              is_elective: a.is_elective ?? false,
              is_active: a.subjects?.is_active ?? true,
              assignment_id: a.id,
              class_id: a.class_id,
            }));
          }
        } catch (e) {
          console.warn("Could not query class_subjects:", e);
        }
      }

      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      if (!data || data.length === 0) {
        return [
          { id: "sub_1", name: "First Language: Telugu", code: "TEL-101", department: "Languages", is_active: true },
          { id: "sub_2", name: "Second Language: Hindi", code: "HIN-102", department: "Languages", is_active: true },
          { id: "sub_3", name: "Third Language: English", code: "ENG-103", department: "Languages", is_active: true },
          { id: "sub_4", name: "Mathematics", code: "MAT-201", department: "Mathematics", is_active: true },
          { id: "sub_5", name: "General Science (Physical & Bio)", code: "SCI-301", department: "Science", is_active: true },
          { id: "sub_6", name: "Social Studies", code: "SOC-401", department: "Humanities", is_active: true },
          { id: "sub_7", name: "Information Technology", code: "IT-501", department: "Computer Science", is_active: true },
          { id: "sub_8", name: "First Language: Urdu", code: "URD-101", department: "Languages", is_active: true },
        ];
      }
      return data;
    },

    async create(payload: { name: string; code: string; department?: string; is_active?: boolean }) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;

      // Check duplicate code
      try {
        const { data: existing } = await supabase
          .from("subjects")
          .select("id, code")
          .eq("code", payload.code.trim().toUpperCase())
          .maybeSingle();

        if (existing) {
          throw new SupabaseServiceError(`Subject code "${payload.code}" already exists.`);
        }
      } catch (checkErr: any) {
        if (checkErr instanceof SupabaseServiceError) throw checkErr;
      }

      const { data, error } = await supabase
        .from("subjects")
        .insert({
          school_id: schoolId,
          name: payload.name.trim(),
          code: payload.code.trim().toUpperCase(),
          department: payload.department || "General",
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async update(
      subjectId: string | number,
      payload: { name?: string; code?: string; department?: string; is_active?: boolean }
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const updates: Record<string, any> = {};
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.code !== undefined) updates.code = payload.code.trim().toUpperCase();
      if (payload.department !== undefined) updates.department = payload.department;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { data, error } = await supabase
        .from("subjects")
        .update(updates)
        .eq("id", subjectId)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async deactivate(subjectId: string | number) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("subjects")
        .update({ is_active: false })
        .eq("id", subjectId)
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async assignToClass(
      classId: string | number,
      subjectId: string | number,
      is_elective: boolean = false
    ) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("class_subjects")
        .upsert(
          {
            class_id: classId,
            subject_id: subjectId,
            is_elective: is_elective,
          },
          { onConflict: "class_id,subject_id" }
        )
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return data;
    },

    async removeFromClass(classId: string | number, subjectId: string | number) {
      if (!isSupabaseConfigured()) throw new SupabaseServiceError("Supabase not configured");
      const { data, error } = await supabase
        .from("class_subjects")
        .delete()
        .eq("class_id", classId)
        .eq("subject_id", subjectId);

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return true;
    },

    async listByClass(classId: string | number) {
      return this.list(classId);
    },
  },

  marks: {
    async getEntrySheet(params: {
      exam_id: string | number;
      class_id: string | number;
      section_id: string | number;
      subject_name: string;
    }) {
      if (!isSupabaseConfigured()) {
        const studentsRes = await supabaseService.students.list({
          classId: params.class_id,
          sectionId: params.section_id,
          limit: 100,
        });

        return {
          exam_id: params.exam_id,
          exam_name: "Mid-Term Examination 2025-26",
          class_id: params.class_id,
          section_id: params.section_id,
          subject_name: params.subject_name,
          exam_subject_id: 1,
          max_marks: 100.0,
          passing_marks: 35.0,
          students: studentsRes.items.map((s) => ({
            student_id: s.id,
            admission_number: s.admission_number,
            full_name: s.full_name,
            roll_number: s.roll_number || "-",
            marks_obtained: null,
            is_absent: false,
            remarks: "",
            is_saved: false,
          })),
        };
      }

      // 1. Get or create exam_subjects
      let { data: examSub } = await supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", params.exam_id)
        .eq("class_id", params.class_id)
        .eq("subject_name", params.subject_name)
        .maybeSingle();

      if (!examSub) {
        const { data: newSub, error: createErr } = await supabase
          .from("exam_subjects")
          .insert({
            exam_id: params.exam_id,
            class_id: params.class_id,
            subject_name: params.subject_name,
            max_marks: 100.0,
            passing_marks: 35.0,
          })
          .select("*")
          .single();

        if (createErr) throw new SupabaseServiceError(createErr.message, createErr.code, createErr.details);
        examSub = newSub;
      }

      // 2. Get students enrolled
      const studentsRes = await supabaseService.students.list({
        classId: params.class_id,
        sectionId: params.section_id,
        limit: 100,
      });

      // 3. Get existing marks
      const { data: existingMarks } = await supabase
        .from("marks")
        .select("*")
        .eq("exam_subject_id", examSub.id);

      const markMap = new Map((existingMarks || []).map((m: any) => [String(m.student_id), m]));

      const students = studentsRes.items.map((s) => {
        const m = markMap.get(String(s.id));
        return {
          student_id: s.id,
          admission_number: s.admission_number,
          full_name: s.full_name,
          roll_number: s.roll_number || "-",
          marks_obtained: m ? (m.is_absent ? null : m.marks_obtained) : null,
          is_absent: m ? Boolean(m.is_absent) : false,
          remarks: m?.remarks || "",
          is_saved: Boolean(m),
        };
      });

      return {
        exam_id: params.exam_id,
        class_id: params.class_id,
        section_id: params.section_id,
        subject_name: params.subject_name,
        exam_subject_id: examSub.id,
        max_marks: Number(examSub.max_marks || 100.0),
        passing_marks: Number(examSub.passing_marks || 35.0),
        students,
      };
    },

    async save(payload: {
      exam_id: string | number;
      class_id: string | number;
      section_id: string | number;
      subject_name: string;
      max_marks: number;
      passing_marks: number;
      entries: Array<{
        student_id: string | number;
        marks_obtained?: number | null;
        is_absent?: boolean;
        remarks?: string;
      }>;
    }) {
      if (!isSupabaseConfigured()) {
        return { status: "success", saved_count: payload.entries.length, message: "Marks recorded successfully (local)" };
      }

      // 1. Get or create exam_subjects
      let { data: examSub } = await supabase
        .from("exam_subjects")
        .select("id, max_marks")
        .eq("exam_id", payload.exam_id)
        .eq("class_id", payload.class_id)
        .eq("subject_name", payload.subject_name)
        .maybeSingle();

      const maxMarks = Number(examSub?.max_marks || payload.max_marks || 100.0);

      // Validate maximum marks
      for (const entry of payload.entries) {
        if (!entry.is_absent && entry.marks_obtained !== null && entry.marks_obtained !== undefined) {
          if (entry.marks_obtained < 0) {
            throw new SupabaseServiceError(`Marks cannot be negative for student ID ${entry.student_id}`, "INVALID_MARKS");
          }
          if (entry.marks_obtained > maxMarks) {
            throw new SupabaseServiceError(
              `Marks obtained (${entry.marks_obtained}) cannot exceed maximum marks (${maxMarks}) for student ID ${entry.student_id}`,
              "MAX_MARKS_EXCEEDED"
            );
          }
        }
      }

      let examSubjectId = examSub?.id;
      if (!examSubjectId) {
        const { data: newSub, error: subErr } = await supabase
          .from("exam_subjects")
          .insert({
            exam_id: payload.exam_id,
            class_id: payload.class_id,
            subject_name: payload.subject_name,
            max_marks: payload.max_marks,
            passing_marks: payload.passing_marks,
          })
          .select("id")
          .single();

        if (subErr) throw new SupabaseServiceError(subErr.message, subErr.code, subErr.details);
        examSubjectId = newSub.id;
      }

      // Upsert marks
      const marksInserts = payload.entries.map((e) => ({
        exam_subject_id: examSubjectId,
        student_id: e.student_id,
        marks_obtained: e.is_absent ? null : e.marks_obtained,
        is_absent: Boolean(e.is_absent),
        remarks: e.remarks ? e.remarks.trim() : null,
      }));

      const { error: upsertErr } = await supabase
        .from("marks")
        .upsert(marksInserts, { onConflict: "exam_subject_id,student_id" });

      if (upsertErr) throw new SupabaseServiceError(upsertErr.message, upsertErr.code, upsertErr.details);

      return {
        status: "success",
        exam_subject_id: examSubjectId,
        saved_count: payload.entries.length,
        message: `Marks successfully recorded for ${payload.entries.length} students.`,
      };
    },

    async getClassResults(params: {
      exam_id: string | number;
      class_id: string | number;
      section_id?: string | number;
    }) {
      if (!isSupabaseConfigured()) {
        return [
          { student_id: 1, admission_number: "DMHS-2025-0001", full_name: "Zeeshan Khan", total_max: 500, total_obtained: 472, percentage: 94.4, grade: "A1", status: "Passed", rank: 1, total_subjects: 5, subjects_recorded: 5 },
          { student_id: 2, admission_number: "DMHS-2025-0002", full_name: "Ayesha Siddiqa", total_max: 500, total_obtained: 456, percentage: 91.2, grade: "A1", status: "Passed", rank: 2, total_subjects: 5, subjects_recorded: 5 },
        ];
      }

      const { data: examSubs } = await supabase
        .from("exam_subjects")
        .select("id, subject_name, max_marks, passing_marks")
        .eq("exam_id", params.exam_id)
        .eq("class_id", params.class_id);

      const esList = examSubs || [];
      const esIds = esList.map((e: any) => e.id);

      const studentsRes = await supabaseService.students.list({
        classId: params.class_id,
        sectionId: params.section_id,
        limit: 100,
      });

      if (esIds.length === 0) return [];

      const { data: allMarks } = await supabase
        .from("marks")
        .select("*")
        .in("exam_subject_id", esIds);

      const marksByStudent = new Map<string, any[]>();
      (allMarks || []).forEach((m: any) => {
        const sid = String(m.student_id);
        if (!marksByStudent.has(sid)) marksByStudent.set(sid, []);
        marksByStudent.get(sid)!.push(m);
      });

      const results = studentsRes.items.map((s) => {
        const studentMarks = marksByStudent.get(String(s.id)) || [];
        const totalMax = esList.reduce((acc: number, es: any) => acc + Number(es.max_marks || 100), 0);
        let totalObtained = 0;
        let anyFailed = false;

        studentMarks.forEach((m) => {
          if (!m.is_absent && m.marks_obtained !== null) {
            totalObtained += Number(m.marks_obtained);
            const es = esList.find((e: any) => e.id === m.exam_subject_id);
            if (es && Number(m.marks_obtained) < Number(es.passing_marks || 35)) {
              anyFailed = true;
            }
          }
        });

        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
        let grade = "E2";
        if (pct >= 91) grade = "A1";
        else if (pct >= 81) grade = "A2";
        else if (pct >= 71) grade = "B1";
        else if (pct >= 61) grade = "B2";
        else if (pct >= 51) grade = "C1";
        else if (pct >= 41) grade = "C2";
        else if (pct >= 33) grade = "D";
        else if (pct >= 21) grade = "E1";

        return {
          student_id: s.id,
          admission_number: s.admission_number,
          full_name: s.full_name,
          total_max: totalMax,
          total_obtained: totalObtained,
          percentage: pct,
          grade,
          status: anyFailed ? "Failed" : "Passed",
          subjects_recorded: studentMarks.length,
          total_subjects: esList.length,
          rank: 1,
        };
      });

      results.sort((a, b) => b.percentage - a.percentage);
      results.forEach((r, idx) => {
        r.rank = idx + 1;
      });

      return results;
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

  // --------------------------------------------------------------------------
  // TIMETABLE
  // --------------------------------------------------------------------------
  timetable: {
    async getSchedule(filters: {
      class_id?: string | number;
      section_id?: string | number;
      teacher_id?: string | number;
      day_of_week?: number;
    } = {}) {
      if (!isSupabaseConfigured()) return [];
      let query = supabase
        .from("timetable_entries")
        .select("*, classes(name), sections(name), subjects(name)")
        .eq("is_active", true)
        .order("period_number", { ascending: true });

      if (filters.day_of_week) query = query.eq("day_of_week", filters.day_of_week);
      if (filters.class_id) query = query.eq("class_id", filters.class_id);
      if (filters.section_id) query = query.eq("section_id", filters.section_id);
      if (filters.teacher_id) query = query.eq("teacher_id", filters.teacher_id);

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase timetable error:", error.message);
        return [];
      }
      return data || [];
    },

    async createSlot(slot: {
      day: number;
      period: number;
      time: string;
      subject: string;
      teacher: string;
      teacher_id?: string | number;
      room: string;
      class_id?: string | number;
      section_id?: string | number;
      academic_year_id?: string | number;
    }) {
      if (!isSupabaseConfigured()) return { id: `slot_${Date.now()}` };

      const timeParts = (slot.time || "09:00 - 09:45").split("-");
      const startTime = (timeParts[0] || "09:00").trim();
      const endTime = (timeParts[1] || "09:45").trim();

      const { data, error } = await supabase
        .from("timetable_entries")
        .insert({
          day_of_week: slot.day,
          period_number: slot.period,
          start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
          end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
          room_number: slot.room,
          teacher_name: slot.teacher,
          teacher_id: slot.teacher_id && String(slot.teacher_id).length === 36 ? slot.teacher_id : null,
          class_id: slot.class_id && String(slot.class_id).length === 36 ? slot.class_id : null,
          section_id: slot.section_id && String(slot.section_id).length === 36 ? slot.section_id : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.warn("Supabase timetable insert warning:", error.message);
      }
      return data || { id: `slot_${Date.now()}` };
    },

    async deleteSlot(id: string | number) {
      if (!isSupabaseConfigured()) return { success: true };
      const { error } = await supabase
        .from("timetable_entries")
        .update({ is_active: false })
        .eq("id", id);
      if (error) console.warn("Supabase timetable delete error:", error.message);
      return { success: !error };
    },
  },

  // --------------------------------------------------------------------------
  // EXPENSES MANAGEMENT
  // --------------------------------------------------------------------------
  expenses: {
    async list(filters: {
      category?: string;
      from_date?: string;
      to_date?: string;
      search?: string;
    } = {}): Promise<ExpenseItem[]> {
      if (!isSupabaseConfigured()) return [];
      let query = supabase
        .from("expenses")
        .select("*, profiles(first_name, last_name)")
        .eq("is_active", true)
        .order("expense_date", { ascending: false });

      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.from_date) {
        query = query.gte("expense_date", filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte("expense_date", filters.to_date);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase expenses list error:", error.message);
        return [];
      }

      return (data || []).map((e: any) => ({
        id: e.id,
        school_id: e.school_id,
        academic_year_id: e.academic_year_id,
        expense_date: e.expense_date,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        payment_method: e.payment_method,
        reference_number: e.reference_number,
        notes: e.notes,
        recorded_by: e.recorded_by,
        recorded_by_name: e.profiles ? `${e.profiles.first_name} ${e.profiles.last_name || ""}`.trim() : "Administrator",
        is_active: e.is_active,
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));
    },

    async create(payload: {
      expense_date: string;
      category: string;
      description: string;
      amount: number;
      payment_method?: string;
      reference_number?: string;
      notes?: string;
    }): Promise<ExpenseItem> {
      if (!isSupabaseConfigured()) {
        throw new SupabaseServiceError("Supabase is not configured");
      }
      const school = await supabaseService.schools.getCurrent();
      const schoolId = school?.id;
      const { data: userRes } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          school_id: schoolId || null,
          expense_date: payload.expense_date,
          category: payload.category,
          description: payload.description,
          amount: payload.amount,
          payment_method: payload.payment_method || "Cash",
          reference_number: payload.reference_number || null,
          notes: payload.notes || null,
          recorded_by: userRes?.user?.id || null,
          is_active: true,
        })
        .select("*, profiles(first_name, last_name)")
        .single();

      if (error) {
        throw new SupabaseServiceError(error.message, error.code, error.details);
      }

      return {
        id: data.id,
        school_id: data.school_id,
        academic_year_id: data.academic_year_id,
        expense_date: data.expense_date,
        category: data.category,
        description: data.description,
        amount: Number(data.amount),
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        notes: data.notes,
        recorded_by: data.recorded_by,
        recorded_by_name: data.profiles ? `${data.profiles.first_name} ${data.profiles.last_name || ""}`.trim() : "Administrator",
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },

    async update(id: string, payload: Partial<ExpenseItem>): Promise<ExpenseItem> {
      if (!isSupabaseConfigured()) {
        throw new SupabaseServiceError("Supabase is not configured");
      }

      const updates: any = {};
      if (payload.expense_date !== undefined) updates.expense_date = payload.expense_date;
      if (payload.category !== undefined) updates.category = payload.category;
      if (payload.description !== undefined) updates.description = payload.description;
      if (payload.amount !== undefined) updates.amount = payload.amount;
      if (payload.payment_method !== undefined) updates.payment_method = payload.payment_method;
      if (payload.reference_number !== undefined) updates.reference_number = payload.reference_number;
      if (payload.notes !== undefined) updates.notes = payload.notes;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select("*, profiles(first_name, last_name)")
        .single();

      if (error) {
        throw new SupabaseServiceError(error.message, error.code, error.details);
      }

      return {
        id: data.id,
        school_id: data.school_id,
        academic_year_id: data.academic_year_id,
        expense_date: data.expense_date,
        category: data.category,
        description: data.description,
        amount: Number(data.amount),
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        notes: data.notes,
        recorded_by: data.recorded_by,
        recorded_by_name: data.profiles ? `${data.profiles.first_name} ${data.profiles.last_name || ""}`.trim() : "Administrator",
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },

    async delete(id: string): Promise<boolean> {
      if (!isSupabaseConfigured()) return true;
      const { error } = await supabase
        .from("expenses")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);
      return true;
    },

    async getStats(filters: { from_date?: string; to_date?: string } = {}): Promise<ExpenseStats> {
      if (!isSupabaseConfigured()) {
        return {
          total_expenses: 0,
          current_month_expenses: 0,
          category_breakdown: {},
          total_count: 0,
        };
      }

      let query = supabase
        .from("expenses")
        .select("amount, category, expense_date")
        .eq("is_active", true);

      if (filters.from_date) query = query.gte("expense_date", filters.from_date);
      if (filters.to_date) query = query.lte("expense_date", filters.to_date);

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase expense stats warning:", error.message);
        return {
          total_expenses: 0,
          current_month_expenses: 0,
          category_breakdown: {},
          total_count: 0,
        };
      }

      const rows = data || [];
      const currentMonthPrefix = new Date().toISOString().slice(0, 7);

      let total_expenses = 0;
      let current_month_expenses = 0;
      const category_breakdown: Record<string, number> = {};

      rows.forEach((r: any) => {
        const amt = Number(r.amount) || 0;
        total_expenses += amt;
        if (r.expense_date && r.expense_date.startsWith(currentMonthPrefix)) {
          current_month_expenses += amt;
        }
        category_breakdown[r.category] = (category_breakdown[r.category] || 0) + amt;
      });

      return {
        total_expenses,
        current_month_expenses,
        category_breakdown,
        total_count: rows.length,
      };
    },
  },

  // --------------------------------------------------------------------------
  // FEES & PAYMENTS MANAGEMENT
  // --------------------------------------------------------------------------
  fees: {
    async getFinancialSummary(): Promise<FeeFinancialSummary> {
      if (!isSupabaseConfigured()) {
        return {
          total_applicable_fees: 1850000,
          total_collected_fees: 1420000,
          total_remaining_fees: 430000,
          collection_rate: 76.76,
          completed_payments_count: 42,
        };
      }

      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("total_amount, status")
          .neq("status", "cancelled"),
        supabase
          .from("payments")
          .select("amount")
      ]);

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];

      const total_applicable_fees = invoices.reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
        0
      );

      const total_collected_fees = payments.reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 0),
        0
      );

      const total_remaining_fees = Math.max(0, total_applicable_fees - total_collected_fees);
      const collection_rate = total_applicable_fees > 0
        ? Math.round((total_collected_fees / total_applicable_fees) * 10000) / 100
        : 0;

      return {
        total_applicable_fees,
        total_collected_fees,
        total_remaining_fees,
        collection_rate,
        completed_payments_count: payments.length,
      };
    },

    async getInvoices(params: { student_id?: string | number; status?: string } = {}) {
      if (!isSupabaseConfigured()) return [];
      let query = supabase
        .from("invoices")
        .select("*, students(first_name, last_name, admission_number)")
        .order("created_at", { ascending: false });

      if (params.student_id) query = query.eq("student_id", params.student_id);
      if (params.status && params.status !== "all") query = query.eq("status", params.status);

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase invoices error:", error.message);
        return [];
      }

      return (data || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        student_id: inv.student_id,
        student_name: inv.students ? `${inv.students.first_name} ${inv.students.last_name || ""}`.trim() : "Student",
        admission_number: inv.students?.admission_number || "—",
        total_amount: Number(inv.total_amount),
        paid_amount: Number(inv.paid_amount || 0),
        balance: Number(inv.balance_amount || 0),
        status: inv.status,
        due_date: inv.due_date,
        created_at: inv.created_at,
      }));
    },

    async recordPayment(payload: {
      invoice_id?: string | number;
      student_id: string | number;
      receipt_number: string;
      amount: number;
      payment_mode: string;
      transaction_reference?: string;
      remarks?: string;
    }) {
      if (!isSupabaseConfigured()) {
        return { success: true, receipt_number: payload.receipt_number };
      }

      const { data: userRes } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("payments")
        .insert({
          invoice_id: payload.invoice_id && String(payload.invoice_id).length === 36 ? payload.invoice_id : null,
          student_id: payload.student_id,
          receipt_number: payload.receipt_number,
          amount: payload.amount,
          payment_method: payload.payment_mode ? payload.payment_mode.toLowerCase() : "cash",
          transaction_reference: payload.transaction_reference || null,
          collected_by: userRes?.user?.id || null,
          remarks: payload.remarks || null,
        })
        .select()
        .single();

      if (error) throw new SupabaseServiceError(error.message, error.code, error.details);

      if (payload.invoice_id && String(payload.invoice_id).length === 36) {
        const { data: currentInv } = await supabase
          .from("invoices")
          .select("total_amount, paid_amount")
          .eq("id", payload.invoice_id)
          .single();

        if (currentInv) {
          const newPaid = Number(currentInv.paid_amount || 0) + Number(payload.amount);
          const newBalance = Math.max(0, Number(currentInv.total_amount) - newPaid);
          const newStatus = newBalance <= 0 ? "paid" : "partially_paid";
          await supabase
            .from("invoices")
            .update({
              paid_amount: newPaid,
              balance_amount: newBalance,
              status: newStatus,
            })
            .eq("id", payload.invoice_id);
        }
      }

      return data;
    },
  },
};
