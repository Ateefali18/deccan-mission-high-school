import type {
  CurrentUserSession,
  AcademicYear,
  SchoolClass,
  Section,
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
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { supabaseService } from "./supabaseService";

const API_BASE_URL = "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: string[];

  constructor(message: string, status: number, code?: string, errors?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("dmhs_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.detail?.message || data.detail || "An unexpected error occurred.";
    const code = data.code || data.detail?.code;
    const errors = data.errors;
    throw new ApiError(message, response.status, code, errors);
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (username_or_email: string, password: string) => {
      // 1. If Supabase is configured, attempt Supabase Auth first
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: username_or_email,
            password: password,
          });

          if (!error && data.session) {
            localStorage.setItem("dmhs_token", data.session.access_token);
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("role, first_name, last_name, email")
              .eq("auth_user_id", data.user.id)
              .maybeSingle();

            const role = (profile?.role || "admin").toUpperCase();
            const fullName = profile ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "ERP User";

            return {
              access_token: data.session.access_token,
              token_type: "bearer",
              role,
              full_name: fullName,
              username: data.user.email || username_or_email,
            };
          }
        } catch {
          // If Supabase auth doesn't match, fall back to backend/demo API below
        }
      }

      // 2. Fall back to local REST / demo backend
      const res = await request<{
        access_token: string;
        token_type: string;
        role: string;
        full_name: string;
        username: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username_or_email, password }),
      });
      localStorage.setItem("dmhs_token", res.access_token);
      return res;
    },

    logout: async () => {
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }
      try {
        await request("/auth/logout", { method: "POST" });
      } finally {
        localStorage.removeItem("dmhs_token");
      }
    },

    getMe: async (): Promise<CurrentUserSession> => {
      if (isSupabaseConfigured()) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*, schools(name, code)")
            .eq("auth_user_id", authData.user.id)
            .maybeSingle();

          const roleStr = (profile?.role || "ADMIN").toUpperCase();
          const role = (roleStr === "SUPERADMIN" || roleStr === "PRINCIPAL" ? "ADMIN" : roleStr) as any;

          return {
            user: {
              id: profile?.id || authData.user.id,
              school_id: profile?.school_id || 1,
              username: authData.user.email || "user",
              email: authData.user.email || "",
              full_name: profile ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "School Member",
              phone_number: profile?.phone_number,
              is_active: true,
              roles: [role],
            },
            role: role,
            school_name: profile?.schools?.name || "Deccan Mission High School",
            school_code: profile?.schools?.code || "DMHS-HYD",
            profile_id: profile?.id,
          };
        }
      }

      return request<CurrentUserSession>("/auth/me");
    },
  },

  schools: {
    getCurrent: async () => {
      if (isSupabaseConfigured()) {
        return supabaseService.schools.getCurrent();
      }
      return request<any>("/schools/current");
    },
  },

  academicYears: {
    list: async (): Promise<AcademicYear[]> => {
      if (isSupabaseConfigured()) {
        return supabaseService.academicYears.list();
      }
      return request<AcademicYear[]>("/academic-years/");
    },
    create: async (data: { name: string; start_date: string; end_date: string; is_current: boolean; status: string }) => {
      if (isSupabaseConfigured()) {
        return supabaseService.academicYears.create(data);
      }
      return request<AcademicYear>("/academic-years/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  classes: {
    list: async (): Promise<SchoolClass[]> => {
      if (isSupabaseConfigured()) {
        return supabaseService.classes.list();
      }
      return request<SchoolClass[]>("/classes/");
    },
    create: async (data: { name: string; grade_level: number; stream?: string }) => {
      if (isSupabaseConfigured()) {
        return supabaseService.classes.create(data);
      }
      return request<SchoolClass>("/classes/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    createSection: async (classId: number | string, data: { name: string; room_number?: string; capacity: number }) => {
      if (isSupabaseConfigured()) {
        return supabaseService.classes.createSection(classId, data);
      }
      return request<Section>(`/classes/${classId}/sections`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  students: {
    list: async (params: {
      page?: number;
      limit?: number;
      class_id?: number | string;
      section_id?: number | string;
      status?: string;
      search?: string;
    } = {}) => {
      if (isSupabaseConfigured()) {
        return supabaseService.students.list({
          page: params.page,
          limit: params.limit,
          classId: params.class_id,
          sectionId: params.section_id,
          status: params.status,
          search: params.search,
        });
      }

      const query = new URLSearchParams();
      if (params.page) query.append("page", params.page.toString());
      if (params.limit) query.append("limit", params.limit.toString());
      if (params.class_id) query.append("class_id", params.class_id.toString());
      if (params.section_id) query.append("section_id", params.section_id.toString());
      return request<{ items: StudentListItem[]; total: number; page: number; limit: number }>(
        `/students/?${query.toString()}`
      );
    },

    getById: async (id: number | string): Promise<StudentProfile> => {
      if (isSupabaseConfigured()) {
        return supabaseService.students.getById(id);
      }
      return request<StudentProfile>(`/students/${id}`);
    },

    getMyProfile: async (): Promise<StudentProfile> => {
      return request<StudentProfile>("/students/me/profile");
    },

    create: async (data: any): Promise<any> => {
      if (isSupabaseConfigured()) {
        return supabaseService.students.create(data);
      }
      return request<StudentProfile>("/students/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update: async (id: number | string, data: Partial<StudentProfile>) => {
      if (isSupabaseConfigured()) {
        return supabaseService.students.update(id, data);
      }
      return request<StudentProfile>(`/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    updateStatus: async (id: number | string, status: string, reason?: string) => {
      if (isSupabaseConfigured()) {
        return supabaseService.students.updateStatus(id, status, reason);
      }
      return true;
    },

    uploadPhoto: async (studentId: number | string, file: File): Promise<string> => {
      return supabaseService.students.uploadPhoto(studentId, file);
    },

    uploadDocument: async (
      studentId: number | string,
      file: File,
      docType: string,
      title: string
    ): Promise<DocumentItem> => {
      return supabaseService.students.uploadDocument(studentId, file, docType, title);
    },

    getDocuments: async (studentId: number | string): Promise<DocumentItem[]> => {
      return supabaseService.students.getDocuments(studentId);
    },
  },

  teachers: {
    list: async (params: { page?: number; limit?: number; search?: string } = {}) => {
      if (isSupabaseConfigured()) {
        return supabaseService.teachers.list(params);
      }

      const query = new URLSearchParams();
      if (params.page) query.append("page", params.page.toString());
      if (params.limit) query.append("limit", params.limit.toString());
      return request<{ items: TeacherListItem[]; total: number; page: number; limit: number }>(
        `/teachers/?${query.toString()}`
      );
    },

    getById: async (id: number | string): Promise<TeacherProfile> => {
      if (isSupabaseConfigured()) {
        return supabaseService.teachers.getById(id);
      }
      return request<TeacherProfile>(`/teachers/${id}`);
    },

    getMyProfile: async (): Promise<TeacherProfile> => {
      return request<TeacherProfile>("/teachers/me/profile");
    },

    create: async (data: any): Promise<any> => {
      if (isSupabaseConfigured()) {
        return supabaseService.teachers.create(data);
      }
      return request<TeacherProfile>("/teachers/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update: async (id: number | string, data: any) => {
      if (isSupabaseConfigured()) {
        return supabaseService.teachers.update(id, data);
      }
      return request<TeacherProfile>(`/teachers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    toggleStatus: async (id: number | string, isActive: boolean) => {
      if (isSupabaseConfigured()) {
        return supabaseService.teachers.toggleStatus(id, isActive);
      }
      return true;
    },
  },

  dashboards: {
    getAdmin: async (): Promise<AdminDashboardStats> => {
      if (isSupabaseConfigured()) {
        return supabaseService.dashboards.getAdmin();
      }
      return request<AdminDashboardStats>("/dashboards/admin");
    },

    getTeacher: async (): Promise<TeacherDashboardStats> => {
      if (isSupabaseConfigured()) {
        return supabaseService.dashboards.getTeacher();
      }
      return request<TeacherDashboardStats>("/dashboards/teacher");
    },

    getStudent: async (): Promise<StudentDashboardStats> => {
      if (isSupabaseConfigured()) {
        return supabaseService.dashboards.getStudent();
      }
      return request<StudentDashboardStats>("/dashboards/student");
    },
  },

  search: {
    query: async (q: string, limit: number = 15): Promise<{ query: string; total: number; results: SearchResultItem[] }> => {
      if (isSupabaseConfigured()) {
        const results = await supabaseService.search.query(q, limit);
        return { query: q, total: results.length, results };
      }
      return request<{ query: string; total: number; results: SearchResultItem[] }>(
        `/search/?q=${encodeURIComponent(q)}&limit=${limit}`
      );
    },
  },

  notices: {
    list: async (audience: string = "all"): Promise<NoticeItem[]> => {
      return supabaseService.notices.list(audience);
    },
    create: async (payload: { title: string; content: string; target_audience?: string; priority?: string }) => {
      return supabaseService.notices.create(payload);
    },
  },

  ai: {
    query: async (question: string, conversation_id?: number) => {
      return request<{
        answer: string;
        data?: any;
        source: string;
        route?: string;
        filters?: Record<string, any>;
        conversation_id?: number;
      }>("/ai/query", {
        method: "POST",
        body: JSON.stringify({ question, conversation_id }),
      });
    },
    getConversations: async () => {
      return request<Array<{ id: number; title: string; created_at: string }>>("/ai/conversations");
    },
  },

  attendance: {
    submit: async (data: {
      academic_year_id: number;
      class_id: number;
      section_id: number;
      session_date: string;
      period_number?: number;
      records: Array<{ student_id: number; status: string; remarks?: string }>;
    }) => {
      return request<any>("/attendance/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    getStudentSummary: async (studentId: number | string, academicYearId?: number | string) => {
      const q = academicYearId ? `?academic_year_id=${academicYearId}` : "";
      return request<{
        student_id: number;
        total_sessions: number;
        present_count: number;
        late_count: number;
        absent_count: number;
        excused_count: number;
        attendance_percentage: number;
        is_low_attendance: boolean;
      }>(`/attendance/students/${studentId}/summary${q}`);
    },
    getLowAttendance: async (threshold: number = 75.0, classId?: number) => {
      const q = new URLSearchParams({ threshold: threshold.toString() });
      if (classId) q.append("class_id", classId.toString());
      return request<Array<{
        student_id: number;
        admission_number: string;
        full_name: string;
        attendance_percentage: number;
        absent_count: number;
        total_sessions: number;
      }>>(`/attendance/low-attendance?${q.toString()}`);
    },
  },

  timetable: {
    getNextPeriod: async () => {
      return request<{
        status: string;
        message: string;
        current_period?: {
          period_number: number;
          subject: string;
          room: string;
          start_time: string;
          end_time: string;
        };
        next_period?: {
          period_number: number;
          subject: string;
          room: string;
          start_time: string;
          end_time: string;
        };
        reporting_time: string;
      }>("/timetable/next-period");
    },
    getSchedule: async (params: { class_id?: number; section_id?: number; teacher_id?: number; day_of_week?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.class_id) q.append("class_id", params.class_id.toString());
      if (params.section_id) q.append("section_id", params.section_id.toString());
      if (params.teacher_id) q.append("teacher_id", params.teacher_id.toString());
      if (params.day_of_week) q.append("day_of_week", params.day_of_week.toString());
      return request<Array<{
        id: number;
        period_number: number;
        subject: string;
        room?: string;
        start_time: string;
        end_time: string;
        day_of_week: number;
      }>>(`/timetable/schedule?${q.toString()}`);
    },
  },
};
