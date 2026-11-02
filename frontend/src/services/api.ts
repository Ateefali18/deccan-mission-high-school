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
import { isSupabaseConfigured, supabase, setSupabaseAdminHeader } from "./supabaseClient";
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
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_token") : null;

  // In test environment or static hosting without API server, fast-fail to client/Supabase layer
  if (typeof window === "undefined" || (typeof process !== "undefined" && process.env?.NODE_ENV === "test")) {
    throw new ApiError("API server not running in test environment", 404);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (netErr: any) {
    throw new ApiError(netErr?.message || "API server unreachable", 503);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new ApiError("API endpoint unavailable on static hosting.", 404);
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

export const apiClient = {
  get: async <T = any>(endpoint: string) => {
    const data = await request<T>(endpoint);
    return { data };
  },
  post: async <T = any>(endpoint: string, body: any) => {
    const data = await request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { data };
  },
  put: async <T = any>(endpoint: string, body: any) => {
    const data = await request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { data };
  },
  delete: async <T = any>(endpoint: string) => {
    const data = await request<T>(endpoint, {
      method: "DELETE",
    });
    return { data };
  },
};

const USE_MOCK_FALLBACK = false;

// ============================================================================
// DYNAMIC CREDENTIALS & PERSISTENT BROWSER STORAGE FOR TEACHERS & STUDENTS
// ============================================================================
export interface CustomUserAccount {
  id: string | number;
  username: string;
  email: string;
  password?: string;
  full_name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  employee_id?: string;
  admission_number?: string;
  designation?: string;
  department?: string;
  class_id?: string | number;
  section_id?: string | number;
}

export const getStoredCustomUsers = (): CustomUserAccount[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_users");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomUser = (user: CustomUserAccount) => {
  const users = getStoredCustomUsers().filter(
    (u) =>
      u.username.toLowerCase() !== user.username.toLowerCase() &&
      u.email.toLowerCase() !== user.email.toLowerCase() &&
      (!user.employee_id || u.employee_id?.toLowerCase() !== user.employee_id.toLowerCase()) &&
      (!user.admission_number || u.admission_number?.toLowerCase() !== user.admission_number.toLowerCase())
  );
  users.push(user);
  localStorage.setItem("dmhs_custom_users", JSON.stringify(users));
};

export const getStoredCustomTeachers = (): TeacherListItem[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_teachers");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomTeacher = (teacher: TeacherListItem) => {
  const teachers = getStoredCustomTeachers().filter((t) => String(t.id) !== String(teacher.id) && t.employee_id !== teacher.employee_id);
  teachers.unshift(teacher);
  localStorage.setItem("dmhs_custom_teachers", JSON.stringify(teachers));
};

export const getStoredCustomStudents = (): StudentListItem[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_students");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomStudent = (student: StudentListItem) => {
  const students = getStoredCustomStudents().filter((s) => String(s.id) !== String(student.id) && s.admission_number !== student.admission_number);
  students.unshift(student);
  localStorage.setItem("dmhs_custom_students", JSON.stringify(students));
};

export const getStoredCustomTimetable = (): Record<number, any[]> => {
  try {
    const raw = localStorage.getItem("dmhs_custom_timetable");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveCustomTimetableSlot = (slot: {
  day: number;
  period: number;
  time: string;
  subject: string;
  teacher: string;
  teacher_id?: string | number;
  room: string;
  class_id?: string | number;
  class_name?: string;
  section_id?: string | number;
  section_name?: string;
}) => {
  const schedule = getStoredCustomTimetable();
  const daySlots = schedule[slot.day] || [];
  const updatedDaySlots = daySlots.filter((s) => s.period !== slot.period);
  updatedDaySlots.push(slot);
  updatedDaySlots.sort((a, b) => a.period - b.period);
  schedule[slot.day] = updatedDaySlots;
  localStorage.setItem("dmhs_custom_timetable", JSON.stringify(schedule));
};

const BASELINE_TEACHERS: TeacherListItem[] = [
  {
    id: "tch_ateef",
    employee_id: "EMP-ATEEF",
    full_name: "Ateef",
    email: "ateef@dmhs.edu.in",
    designation: "Senior Mathematics Faculty",
    department: "Mathematics",
    employment_status: "active",
    assigned_classes_count: 2,
  },
  {
    id: "tch_fatima",
    employee_id: "EMP-1001",
    full_name: "Mrs. Fatima Zahra",
    email: "fatima.zahra@dmhs.edu.in",
    designation: "Senior Mathematics Teacher",
    department: "Mathematics",
    employment_status: "active",
    assigned_classes_count: 2,
  },
  {
    id: "tch_tariq",
    employee_id: "EMP-1002",
    full_name: "Dr. Mohammed Tariq",
    email: "tariq.mohammed@dmhs.edu.in",
    designation: "Science Faculty",
    department: "Science",
    employment_status: "active",
    assigned_classes_count: 1,
  },
];

const BASELINE_STUDENTS: StudentListItem[] = [
  {
    id: "std_ali",
    admission_number: "ADM-ALI",
    full_name: "Ali",
    email: "ali@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "01",
    student_status: "active",
  },
  {
    id: "std_ali_khan",
    admission_number: "ADM-2025-0101",
    full_name: "Mohammed Ali Khan",
    email: "mohammed.ali@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "10A01",
    student_status: "active",
  },
  {
    id: "std_ayesha",
    admission_number: "ADM-2025-0102",
    full_name: "Ayesha Siddiqua",
    email: "ayesha.siddiqua@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "10A02",
    student_status: "active",
  },
];




export const isUUID = (str: string | number): boolean => {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getStoredCustomClasses = (): SchoolClass[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_classes");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomClass = (cls: SchoolClass) => {
  const list = getStoredCustomClasses().filter(
    (c) => String(c.id) !== String(cls.id) && c.name.toLowerCase() !== cls.name.toLowerCase()
  );
  list.push(cls);
  localStorage.setItem("dmhs_custom_classes", JSON.stringify(list));
};

export const getStoredCustomSubjects = (): any[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_subjects");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomSubject = (sub: any) => {
  const list = getStoredCustomSubjects().filter(
    (s) => String(s.id) !== String(sub.id) && s.code.toUpperCase() !== sub.code.toUpperCase()
  );
  list.push(sub);
  localStorage.setItem("dmhs_custom_subjects", JSON.stringify(list));
};

export const getStoredClassSubjectAssignments = (): { class_id: string | number; subject_id: string | number; is_elective: boolean }[] => {
  try {
    const raw = localStorage.getItem("dmhs_custom_class_subjects");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveClassSubjectAssignment = (classId: string | number, subjectId: string | number, isElective: boolean = false) => {
  const list = getStoredClassSubjectAssignments().filter(
    (a) => !(String(a.class_id) === String(classId) && String(a.subject_id) === String(subjectId))
  );
  list.push({ class_id: classId, subject_id: subjectId, is_elective: isElective });
  localStorage.setItem("dmhs_custom_class_subjects", JSON.stringify(list));
};

export const removeClassSubjectAssignment = (classId: string | number, subjectId: string | number) => {
  const list = getStoredClassSubjectAssignments().filter(
    (a) => !(String(a.class_id) === String(classId) && String(a.subject_id) === String(subjectId))
  );
  localStorage.setItem("dmhs_custom_class_subjects", JSON.stringify(list));
};

export const BASELINE_CLASSES: SchoolClass[] = [
  {
    id: "cls_10",
    name: "Class 10",
    grade_level: 10,
    stream: "General",
    is_active: true,
    sections: [
      { id: "sec_10a", class_id: "cls_10", name: "A", room_number: "Room 101", capacity: 40, is_active: true },
      { id: "sec_10b", class_id: "cls_10", name: "B", room_number: "Room 102", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_9",
    name: "Class 9",
    grade_level: 9,
    stream: "General",
    is_active: true,
    sections: [
      { id: "sec_9a", class_id: "cls_9", name: "A", room_number: "Room 201", capacity: 40, is_active: true },
      { id: "sec_9b", class_id: "cls_9", name: "B", room_number: "Room 202", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_8",
    name: "Class 8",
    grade_level: 8,
    stream: "General",
    is_active: true,
    sections: [
      { id: "sec_8a", class_id: "cls_8", name: "A", room_number: "Room 203", capacity: 40, is_active: true },
      { id: "sec_8b", class_id: "cls_8", name: "B", room_number: "Room 204", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_7",
    name: "Class 7",
    grade_level: 7,
    stream: "General",
    is_active: true,
    sections: [
      { id: "sec_7a", class_id: "cls_7", name: "A", room_number: "Room 301", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_6",
    name: "Class 6",
    grade_level: 6,
    stream: "General",
    is_active: true,
    sections: [
      { id: "sec_6a", class_id: "cls_6", name: "A", room_number: "Room 302", capacity: 40, is_active: true },
    ],
  },
];

export const BASELINE_SUBJECTS = [
  { id: "sub_1", name: "First Language: Telugu", code: "TEL-101", department: "Languages", is_active: true },
  { id: "sub_2", name: "Second Language: Hindi", code: "HIN-102", department: "Languages", is_active: true },
  { id: "sub_3", name: "Third Language: English", code: "ENG-103", department: "Languages", is_active: true },
  { id: "sub_4", name: "Mathematics", code: "MAT-201", department: "Mathematics", is_active: true },
  { id: "sub_5", name: "General Science (Physical & Bio)", code: "SCI-301", department: "Science", is_active: true },
  { id: "sub_6", name: "Social Studies", code: "SOC-401", department: "Humanities", is_active: true },
  { id: "sub_7", name: "Information Technology", code: "IT-501", department: "Computer Science", is_active: true },
  { id: "sub_8", name: "First Language: Urdu", code: "URD-101", department: "Languages", is_active: true },
];

function assertAdminRole() {
  const currentRole = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_demo_role") : null;
  if (currentRole && currentRole !== "ADMIN") {
    throw new ApiError("Forbidden: Unauthorized users cannot perform administrator-only operations.", 403);
  }
}

export const api = {
  auth: {
    login: async (username_or_email: string, password: string) => {
      const cleanUser = (username_or_email || "").trim().toLowerCase();
      const cleanPass = (password || "").trim();

      // 1. Pre-configured Administrator: STA khadri / 1234
      if (
        cleanUser === "sta khadri" ||
        cleanUser === "stakhadri" ||
        cleanUser === "sta.khadri" ||
        cleanUser === "sta_khadri" ||
        cleanUser === "admin" ||
        cleanUser === "admin@dmhs.edu.in"
      ) {
        const demoAdmin = {
          access_token: "demo_admin_token_" + Date.now(),
          token_type: "bearer",
          role: "ADMIN",
          full_name: "STA Khadri",
          username: "STA khadri",
          email: "sta.khadri@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoAdmin.access_token);
        localStorage.setItem("dmhs_demo_role", "ADMIN");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoAdmin));
        setSupabaseAdminHeader(true);
        if (isSupabaseConfigured()) {
          supabase.auth.signInWithPassword({ email: "sta.khadri@dmhs.edu.in", password: cleanPass || "1234" }).catch(() => {});
        }
        return demoAdmin;
      }

      // 2. Pre-configured Teacher: Ateef / 1234
      if (
        cleanUser === "ateef" ||
        cleanUser === "syed ateef" ||
        cleanUser === "syed_ateef_ali" ||
        cleanUser === "ateef ali" ||
        cleanUser === "teacher1" ||
        cleanUser === "teacher" ||
        cleanUser === "fatima.zahra@dmhs.edu.in" ||
        cleanUser.startsWith("emp-")
      ) {
        const demoTeacher = {
          access_token: "demo_teacher_token_" + Date.now(),
          token_type: "bearer",
          role: "TEACHER",
          full_name: cleanUser.includes("teacher1") || cleanUser.includes("fatima") ? "Mrs. Fatima Zahra" : "Ateef",
          username: cleanUser.includes("teacher1") ? "teacher1" : "Ateef",
          email: cleanUser.includes("teacher1") ? "fatima.zahra@dmhs.edu.in" : "ateef@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoTeacher.access_token);
        localStorage.setItem("dmhs_demo_role", "TEACHER");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoTeacher));
        setSupabaseAdminHeader(false);
        return demoTeacher;
      }

      // 3. Pre-configured Student: Ali / 1234
      if (
        cleanUser === "ali" ||
        cleanUser === "student1" ||
        cleanUser === "student" ||
        cleanUser === "mohammed.ali@dmhs.edu.in" ||
        cleanUser.startsWith("adm-")
      ) {
        const demoStudent = {
          access_token: "demo_student_token_" + Date.now(),
          token_type: "bearer",
          role: "STUDENT",
          full_name: cleanUser === "student1" ? "Mohammed Ali Khan" : "Ali",
          username: cleanUser === "student1" ? "student1" : "Ali",
          email: cleanUser === "student1" ? "mohammed.ali@dmhs.edu.in" : "ali@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoStudent.access_token);
        localStorage.setItem("dmhs_demo_role", "STUDENT");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoStudent));
        setSupabaseAdminHeader(false);
        return demoStudent;
      }

      // 4. Check Dynamically Created Teachers & Students in Persistent Storage
      const customUsers = getStoredCustomUsers();
      const matchedUser = customUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUser ||
          u.email.toLowerCase() === cleanUser ||
          (u.employee_id && u.employee_id.toLowerCase() === cleanUser) ||
          (u.admission_number && u.admission_number.toLowerCase() === cleanUser)
      );

      if (matchedUser) {
        if (matchedUser.password && cleanPass && matchedUser.password !== cleanPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for this user account.", 401);
        }
        const dynamicSession = {
          access_token: "custom_token_" + Date.now(),
          token_type: "bearer",
          role: matchedUser.role,
          full_name: matchedUser.full_name,
          username: matchedUser.username,
          email: matchedUser.email,
        };
        localStorage.setItem("dmhs_token", dynamicSession.access_token);
        localStorage.setItem("dmhs_demo_role", matchedUser.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(dynamicSession));
        return dynamicSession;
      }

      // 5. Attempt REST backend login if running locally
      try {
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
        localStorage.setItem("dmhs_demo_role", res.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(res));
        return res;
      } catch (err: any) {
        // Fallback for demo on static hosting
        const fallbackRole = cleanUser.includes("teach") ? "TEACHER" : cleanUser.includes("stud") ? "STUDENT" : "ADMIN";
        const fallbackRes = {
          access_token: "demo_token_" + Date.now(),
          token_type: "bearer",
          role: fallbackRole,
          full_name: cleanUser.includes("teach") ? "Faculty Member" : cleanUser.includes("stud") ? "Enrolled Student" : "STA Khadri",
          username: username_or_email,
        };
        localStorage.setItem("dmhs_token", fallbackRes.access_token);
        localStorage.setItem("dmhs_demo_role", fallbackRole);
        localStorage.setItem("dmhs_session_user", JSON.stringify(fallbackRes));
        return fallbackRes;
      }
    },

    logout: async () => {
      localStorage.removeItem("dmhs_demo_role");
      localStorage.removeItem("dmhs_session_user");
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }
      try {
        await request("/auth/logout", { method: "POST" });
      } catch {}
      localStorage.removeItem("dmhs_token");
    },

    getMe: async (): Promise<CurrentUserSession> => {
      const sessionUserRaw = localStorage.getItem("dmhs_session_user");
      const demoRole = localStorage.getItem("dmhs_demo_role") || "ADMIN";

      if (sessionUserRaw) {
        try {
          const su = JSON.parse(sessionUserRaw);
          return {
            user: {
              id: su.role === "ADMIN" ? 1 : su.role === "TEACHER" ? 2 : 3,
              school_id: 1,
              username: su.username || (su.role === "ADMIN" ? "STA khadri" : su.role === "TEACHER" ? "Ateef" : "Ali"),
              email: su.email || (su.role === "ADMIN" ? "sta.khadri@dmhs.edu.in" : su.role === "TEACHER" ? "ateef@dmhs.edu.in" : "ali@dmhs.edu.in"),
              full_name: su.full_name || (su.role === "ADMIN" ? "STA Khadri" : su.role === "TEACHER" ? "Ateef" : "Ali"),
              phone_number: "+91 40 2456 7890",
              is_active: true,
              roles: [su.role || demoRole],
            },
            role: su.role || (demoRole as any),
            school_name: "Deccan Mission High School",
            school_code: "DMHS-HYD",
            profile_id: su.role === "ADMIN" ? null : 1,
          };
        } catch {}
      }

      if (demoRole) {
        const role = demoRole as any;
        return {
          user: {
            id: role === "ADMIN" ? 1 : role === "TEACHER" ? 2 : 3,
            school_id: 1,
            username: role === "ADMIN" ? "STA khadri" : role === "TEACHER" ? "Ateef" : "Ali",
            email: role === "ADMIN" ? "sta.khadri@dmhs.edu.in" : role === "TEACHER" ? "ateef@dmhs.edu.in" : "ali@dmhs.edu.in",
            full_name: role === "ADMIN" ? "STA Khadri" : role === "TEACHER" ? "Ateef" : "Ali",
            phone_number: "+91 40 2456 7890",
            is_active: true,
            roles: [role],
          },
          role: role,
          school_name: "Deccan Mission High School",
          school_code: "DMHS-HYD",
          profile_id: role === "ADMIN" ? null : 1,
        };
      }

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
      try {
        return await request<any>("/schools/current");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.schools.getCurrent();
        }
        throw err;
      }
    },
    updateCurrent: async (data: any) => {
      return request<any>("/schools/current", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  academicYears: {
    list: async (): Promise<AcademicYear[]> => {
      try {
        return await request<AcademicYear[]>("/academic-years/");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.academicYears.list();
        }
        throw err;
      }
    },
    create: async (data: { name: string; start_date: string; end_date: string; is_current: boolean; status: string }) => {
      try {
        return await request<AcademicYear>("/academic-years/", {
          method: "POST",
          body: JSON.stringify(data),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.academicYears.create(data);
        }
        throw err;
      }
    },
  },


  classes: {
    list: async (): Promise<SchoolClass[]> => {
      let remoteClasses: SchoolClass[] = [];
      try {
        remoteClasses = await request<SchoolClass[]>("/classes/");
      } catch {
        if (isSupabaseConfigured()) {
          try {
            remoteClasses = await supabaseService.classes.list();
          } catch (e) {
            console.warn("Could not load classes from Supabase:", e);
          }
        }
      }

      // Merge remote classes with baseline and local custom classes
      const customClasses = getStoredCustomClasses();
      const baseMap = new Map<string, SchoolClass>();

      // Populate baselines
      BASELINE_CLASSES.forEach((c) => baseMap.set(c.name.toLowerCase(), { ...c, sections: [...(c.sections || [])] }));

      // Override with remote classes if present
      remoteClasses.forEach((c) => baseMap.set(c.name.toLowerCase(), c));

      // Override / append with locally persisted custom classes
      customClasses.forEach((c) => {
        const existing = baseMap.get(c.name.toLowerCase());
        if (existing) {
          baseMap.set(c.name.toLowerCase(), {
            ...existing,
            ...c,
            sections: c.sections && c.sections.length > 0 ? c.sections : existing.sections,
          });
        } else {
          baseMap.set(c.name.toLowerCase(), c);
        }
      });

      return Array.from(baseMap.values()).sort((a, b) => a.grade_level - b.grade_level);
    },

    create: async (data: { name: string; grade_level: number; stream?: string }): Promise<SchoolClass> => {
      assertAdminRole();

      // Duplicate prevention check across all existing classes
      const all = await api.classes.list();
      const existing = all.find((c) => c.name.trim().toLowerCase() === data.name.trim().toLowerCase());
      if (existing) {
        throw new ApiError(`Class "${data.name}" already exists in the academic directory.`, 400);
      }

      let createdClass: SchoolClass | null = null;
      if (isSupabaseConfigured()) {
        try {
          createdClass = await supabaseService.classes.create(data);
        } catch (e: any) {
          console.warn("Supabase class creation fallback:", e);
        }
      }

      if (!createdClass) {
        createdClass = {
          id: generateUUID(),
          name: data.name.trim(),
          grade_level: data.grade_level,
          stream: data.stream || "General",
          is_active: true,
          sections: [],
        };
      }

      saveCustomClass(createdClass);
      return createdClass;
    },

    createSection: async (
      classId: number | string,
      data: { name: string; room_number?: string; capacity: number }
    ): Promise<Section> => {
      assertAdminRole();

      // Duplicate prevention check for section within this class
      const all = await api.classes.list();
      const targetClass = all.find((c) => String(c.id) === String(classId));
      if (targetClass && targetClass.sections) {
        const dupSec = targetClass.sections.find(
          (s) => s.name.trim().toLowerCase() === data.name.trim().toLowerCase()
        );
        if (dupSec) {
          throw new ApiError(`Section "${data.name}" already exists in ${targetClass.name}.`, 400);
        }
      }

      let createdSec: Section | null = null;
      if (isSupabaseConfigured()) {
        try {
          createdSec = await supabaseService.classes.createSection(classId, data);
        } catch (e: any) {
          console.warn("Supabase section creation fallback:", e);
        }
      }

      if (!createdSec) {
        createdSec = {
          id: generateUUID(),
          class_id: classId,
          name: data.name.trim().toUpperCase(),
          room_number: data.room_number || "Room 101",
          capacity: data.capacity || 40,
          is_active: true,
        };
      }

      // Update in local persistent storage
      const customClasses = getStoredCustomClasses();
      const cIdx = customClasses.findIndex((c) => String(c.id) === String(classId));
      if (cIdx >= 0) {
        customClasses[cIdx].sections = customClasses[cIdx].sections || [];
        customClasses[cIdx].sections.push(createdSec);
        localStorage.setItem("dmhs_custom_classes", JSON.stringify(customClasses));
      } else if (targetClass) {
        const updated = {
          ...targetClass,
          sections: [...(targetClass.sections || []), createdSec],
        };
        saveCustomClass(updated);
      }

      return createdSec;
    },

    update: async (
      classId: number | string,
      data: { name?: string; grade_level?: number; stream?: string; is_active?: boolean }
    ): Promise<SchoolClass> => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.classes.update(classId, data);
        } catch (e) {
          console.warn("Supabase class update fallback:", e);
        }
      }

      const all = await api.classes.list();
      const target = all.find((c) => String(c.id) === String(classId));
      const updated: SchoolClass = {
        ...(target || {
          id: classId,
          name: data.name || "Class",
          grade_level: data.grade_level || 1,
          sections: [],
        }),
        ...data,
      };
      saveCustomClass(updated);
      return updated;
    },

    deactivate: async (classId: number | string): Promise<SchoolClass> => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.classes.deactivate(classId);
        } catch (e) {
          console.warn("Supabase class deactivate fallback:", e);
        }
      }

      const all = await api.classes.list();
      const target = all.find((c) => String(c.id) === String(classId));
      const updated: SchoolClass = {
        ...(target || { id: classId, name: "Class", grade_level: 1, sections: [] }),
        is_active: false,
      };
      saveCustomClass(updated);
      return updated;
    },

    updateSection: async (
      sectionId: number | string,
      data: { name?: string; room_number?: string; capacity?: number; is_active?: boolean }
    ): Promise<Section> => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.classes.updateSection(sectionId, data);
        } catch (e) {
          console.warn("Supabase section update fallback:", e);
        }
      }

      const all = await api.classes.list();
      let updatedSec: Section | null = null;
      for (const cls of all) {
        const sec = (cls.sections || []).find((s) => String(s.id) === String(sectionId));
        if (sec) {
          updatedSec = { ...sec, ...data };
          const updatedSections = (cls.sections || []).map((s) =>
            String(s.id) === String(sectionId) ? updatedSec! : s
          );
          saveCustomClass({ ...cls, sections: updatedSections });
          break;
        }
      }

      return updatedSec || { id: sectionId, class_id: 1, name: data.name || "A", capacity: data.capacity || 40 };
    },

    deactivateSection: async (sectionId: number | string): Promise<Section> => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.classes.deactivateSection(sectionId);
        } catch (e) {
          console.warn("Supabase section deactivate fallback:", e);
        }
      }

      const all = await api.classes.list();
      let updatedSec: Section | null = null;
      for (const cls of all) {
        const sec = (cls.sections || []).find((s) => String(s.id) === String(sectionId));
        if (sec) {
          updatedSec = { ...sec, is_active: false };
          const updatedSections = (cls.sections || []).map((s) =>
            String(s.id) === String(sectionId) ? updatedSec! : s
          );
          saveCustomClass({ ...cls, sections: updatedSections });
          break;
        }
      }

      return updatedSec || { id: sectionId, class_id: 1, name: "A", capacity: 40, is_active: false };
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
      const customStudents = getStoredCustomStudents();
      const allStudents = [...customStudents, ...BASELINE_STUDENTS];

      try {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page.toString());
        if (params.limit) query.append("limit", params.limit.toString());
        if (params.class_id) query.append("class_id", params.class_id.toString());
        if (params.section_id) query.append("section_id", params.section_id.toString());
        if (params.status) query.append("status", params.status);
        if (params.search) query.append("search", params.search);
        const remote = await request<{ items: StudentListItem[]; total: number; page: number; limit: number }>(
          `/students/?${query.toString()}`
        );
        const merged = [...customStudents];
        for (const item of remote.items) {
          if (!merged.some((m) => m.admission_number === item.admission_number)) {
            merged.push(item);
          }
        }
        return { items: merged, total: merged.length, page: params.page || 1, limit: params.limit || 10 };
      } catch (err) {
        let filtered = allStudents;
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.full_name.toLowerCase().includes(s) ||
              item.admission_number.toLowerCase().includes(s) ||
              item.email.toLowerCase().includes(s)
          );
        }
        return {
          items: filtered,
          total: filtered.length,
          page: params.page || 1,
          limit: params.limit || 10,
        };
      }
    },

    getById: async (id: number | string): Promise<StudentProfile> => {
      const customStudents = getStoredCustomStudents();
      const foundCustom = customStudents.find((s) => String(s.id) === String(id));
      if (foundCustom) {
        return {
          id: foundCustom.id,
          admission_number: foundCustom.admission_number,
          full_name: foundCustom.full_name,
          email: foundCustom.email,
          class_name: foundCustom.class_name,
          section_name: foundCustom.section_name,
          roll_number: foundCustom.roll_number,
          student_status: foundCustom.student_status,
          gender: "Not specified",
        } as any;
      }
      try {
        return await request<StudentProfile>(`/students/${id}`);
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.students.getById(id);
        }
        return {
          id: id,
          admission_number: "ADM-ALI",
          full_name: "Ali",
          email: "ali@dmhs.edu.in",
          class_name: "Class 10",
          section_name: "A",
          roll_number: "01",
          student_status: "active",
        } as any;
      }
    },

    getMyProfile: async (): Promise<StudentProfile> => {
      return request<StudentProfile>("/students/me/profile").catch(() => ({
        id: "std_ali",
        admission_number: "ADM-ALI",
        full_name: "Ali",
        email: "ali@dmhs.edu.in",
        class_name: "Class 10",
        section_name: "A",
        roll_number: "01",
        student_status: "active",
      } as any));
    },

    create: async (data: any): Promise<any> => {
      const username = data.username || data.email?.split("@")[0] || data.admission_number?.toLowerCase() || "student";
      const password = data.password || "1234";

      const newStudentItem: StudentListItem = {
        id: "std_" + Date.now(),
        admission_number: data.admission_number,
        full_name: data.full_name,
        email: data.email,
        class_name: data.class_name || "Class 10",
        section_name: data.section_name || "A",
        roll_number: data.roll_number || "01",
        student_status: "active",
      };

      // 1. Save in local persistent custom storage
      saveCustomStudent(newStudentItem);

      // 2. Save credentials in custom user registry so student can log in immediately
      saveCustomUser({
        id: newStudentItem.id,
        username: username,
        email: data.email,
        password: password,
        full_name: data.full_name,
        role: "STUDENT",
        admission_number: data.admission_number,
      });

      // 3. Attempt REST backend or Supabase if available
      try {
        await request<StudentProfile>("/students/", {
          method: "POST",
          body: JSON.stringify({ ...data, username, password }),
        });
      } catch {
        if (isSupabaseConfigured()) {
          try {
            await supabaseService.students.create({ ...data, username, password });
          } catch {}
        }
      }

      return newStudentItem;
    },

    update: async (id: number | string, data: any) => {
      const payload: any = { ...data };
      if (payload.date_of_birth === "") delete payload.date_of_birth;
      if (payload.roll_number === "") delete payload.roll_number;

      try {
        return await request<StudentProfile>(`/students/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.students.update(id, payload);
        }
        return payload;
      }
    },

    deactivate: async (id: number | string) => {
      try {
        return await request<StudentProfile>(`/students/${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.students.deactivate(id);
        }
        return { message: "Deactivated" };
      }
    },

    updateStatus: async (id: number | string, status: string, reason?: string) => {
      try {
        return await request<StudentProfile>(`/students/${id}`, {
          method: "PUT",
          body: JSON.stringify({ student_status: status }),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.students.updateStatus(id, status, reason);
        }
        return { id, student_status: status };
      }
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
    list: async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
      const customTeachers = getStoredCustomTeachers();
      const allTeachers = [...customTeachers, ...BASELINE_TEACHERS];

      try {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page.toString());
        if (params.limit) query.append("limit", params.limit.toString());
        if (params.search) query.append("search", params.search);
        if (params.status) query.append("status", params.status);
        const remote = await request<{ items: TeacherListItem[]; total: number; page: number; limit: number }>(
          `/teachers/?${query.toString()}`
        );
        const merged = [...customTeachers];
        for (const item of remote.items) {
          if (!merged.some((m) => m.employee_id === item.employee_id)) {
            merged.push(item);
          }
        }
        return { items: merged, total: merged.length, page: params.page || 1, limit: params.limit || 10 };
      } catch (err) {
        let filtered = allTeachers;
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.full_name.toLowerCase().includes(s) ||
              item.employee_id.toLowerCase().includes(s) ||
              item.email.toLowerCase().includes(s)
          );
        }
        return {
          items: filtered,
          total: filtered.length,
          page: params.page || 1,
          limit: params.limit || 10,
        };
      }
    },

    getById: async (id: number | string): Promise<TeacherProfile> => {
      const customTeachers = getStoredCustomTeachers();
      const foundCustom = customTeachers.find((t) => String(t.id) === String(id));
      if (foundCustom) {
        return {
          id: foundCustom.id,
          employee_id: foundCustom.employee_id,
          full_name: foundCustom.full_name,
          email: foundCustom.email,
          designation: foundCustom.designation,
          department: foundCustom.department,
          employment_status: "active",
          is_active: true,
          assignments: (foundCustom as any).assignments || [
            {
              id: 1,
              academic_year_name: "2025-2026",
              class_name: "Class 10",
              section_name: "A",
              subject_name: "Mathematics",
              role_type: "Class Teacher",
            },
          ],
        };
      }
      try {
        return await request<TeacherProfile>(`/teachers/${id}`);
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.teachers.getById(id);
        }
        return {
          id: id,
          employee_id: "EMP-ATEEF",
          full_name: "Ateef",
          email: "ateef@dmhs.edu.in",
          designation: "Senior Mathematics Faculty",
          department: "Mathematics",
          employment_status: "active",
          is_active: true,
          assignments: [
            {
              id: 1,
              academic_year_name: "2025-2026",
              class_name: "Class 10",
              section_name: "A",
              subject_name: "Mathematics",
              role_type: "Class Teacher",
            },
          ],
        };
      }
    },

    getMyProfile: async (): Promise<TeacherProfile> => {
      return request<TeacherProfile>("/teachers/me/profile").catch(() => ({
        id: "tch_ateef",
        employee_id: "EMP-ATEEF",
        full_name: "Ateef",
        email: "ateef@dmhs.edu.in",
        designation: "Senior Mathematics Faculty",
        department: "Mathematics",
        employment_status: "active",
        is_active: true,
        assignments: [
          {
            id: 1,
            academic_year_name: "2025-2026",
            class_name: "Class 10",
            section_name: "A",
            subject_name: "Mathematics",
            role_type: "Class Teacher",
          },
        ],
      }));
    },

    create: async (data: any): Promise<any> => {
      const username = data.username || data.email?.split("@")[0] || data.employee_id?.toLowerCase() || "teacher";
      const password = data.password || "1234";

      const newTeacherItem: TeacherListItem = {
        id: "tch_" + Date.now(),
        employee_id: data.employee_id,
        full_name: data.full_name,
        email: data.email,
        designation: data.designation || "Faculty Member",
        department: data.department || "General",
        employment_status: "active",
        assigned_classes_count: 0,
      };

      // 1. Save in local persistent custom storage
      saveCustomTeacher(newTeacherItem);

      // 2. Save credentials in custom user registry so teacher can log in immediately
      saveCustomUser({
        id: newTeacherItem.id,
        username: username,
        email: data.email,
        password: password,
        full_name: data.full_name,
        role: "TEACHER",
        employee_id: data.employee_id,
        department: data.department,
        designation: data.designation,
      });

      // 3. Attempt REST backend or Supabase if available
      try {
        await request<TeacherProfile>("/teachers/", {
          method: "POST",
          body: JSON.stringify({ ...data, username, password }),
        });
      } catch {
        if (isSupabaseConfigured()) {
          try {
            await supabaseService.teachers.create({ ...data, username, password });
          } catch {}
        }
      }

      return newTeacherItem;
    },

    assignClass: async (
      teacherId: number | string,
      assignment: {
        class_name: string;
        section_name: string;
        subject_name: string;
        role_type: string;
        academic_year_name?: string;
      }
    ) => {
      const customTeachers = getStoredCustomTeachers();
      let teacher = customTeachers.find((t) => String(t.id) === String(teacherId) || t.employee_id === String(teacherId));
      if (!teacher) {
        const base = BASELINE_TEACHERS.find((t) => String(t.id) === String(teacherId) || t.employee_id === String(teacherId));
        if (base) {
          teacher = { ...base };
        }
      }
      if (teacher) {
        teacher.assigned_classes_count = (teacher.assigned_classes_count || 0) + 1;
        const assignments = (teacher as any).assignments || [];
        assignments.push({
          id: Date.now(),
          academic_year_name: assignment.academic_year_name || "2025-2026",
          class_name: assignment.class_name,
          section_name: assignment.section_name,
          subject_name: assignment.subject_name,
          role_type: assignment.role_type,
        });
        (teacher as any).assignments = assignments;
        saveCustomTeacher(teacher);
      }
      return { success: true, message: "Class assigned successfully" };
    },

    update: async (id: number | string, data: any) => {
      const payload: any = { ...data };
      if (payload.joining_date === "") delete payload.joining_date;

      try {
        return await request<TeacherProfile>(`/teachers/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.teachers.update(id, payload);
        }
        return payload;
      }
    },

    toggleStatus: async (id: number | string, isActive: boolean) => {
      try {
        return await request<TeacherProfile>(`/teachers/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.teachers.toggleStatus(id, isActive);
        }
        return { is_active: isActive };
      }
    },

    deactivate: async (id: number | string) => {
      try {
        return await request<TeacherProfile>(`/teachers/${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.teachers.deactivate(id);
        }
        return { message: "Deactivated" };
      }
    },
  },

  dashboards: {
    getAdmin: async (): Promise<AdminDashboardStats> => {
      try {
        return await request<AdminDashboardStats>("/dashboards/admin");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.dashboards.getAdmin();
        }
        throw err;
      }
    },

    getTeacher: async (): Promise<TeacherDashboardStats> => {
      try {
        return await request<TeacherDashboardStats>("/dashboards/teacher");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.dashboards.getTeacher();
        }
        throw err;
      }
    },

    getStudent: async (): Promise<StudentDashboardStats> => {
      try {
        return await request<StudentDashboardStats>("/dashboards/student");
      } catch (err) {
        if (isSupabaseConfigured()) {
          return supabaseService.dashboards.getStudent();
        }
        throw err;
      }
    },
  },

  search: {
    query: async (q: string, limit: number = 15): Promise<{ query: string; total: number; results: SearchResultItem[] }> => {
      try {
        return await request<{ query: string; total: number; results: SearchResultItem[] }>(
          `/search/?q=${encodeURIComponent(q)}&limit=${limit}`
        );
      } catch (err) {
        if (isSupabaseConfigured()) {
          const results = await supabaseService.search.query(q, limit);
          return { query: q, total: results.length, results };
        }
        return { query: q, total: 0, results: [] };
      }
    },
  },

  notices: {
    list: async (audience: string = "all"): Promise<NoticeItem[]> => {
      try {
        return await request<NoticeItem[]>(`/notices/?audience=${audience}`);
      } catch {
        return supabaseService.notices.list(audience);
      }
    },
    create: async (payload: { title: string; content: string; target_audience?: string; priority?: string }) => {
      try {
        return await request<NoticeItem>("/notices/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        return supabaseService.notices.create(payload);
      }
    },
  },

  ai: {
    getStatus: async () => {
      return request<{
        provider: string;
        model: string;
        is_api_key_configured: boolean;
        server_side_key_enforced: boolean;
        pii_safeguards_active: boolean;
        grounded_queries_supported: string[];
      }>("/ai/status");
    },
    query: async (question: string, conversation_id?: number) => {
      return request<{
        answer: string;
        data?: any;
        source: string;
        route?: string;
        filters?: Record<string, any>;
        conversation_id?: number;
        provider?: string;
        is_grounded?: boolean;
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
    getSession: async (params: {
      section_id: number | string;
      session_date: string;
      period_number?: number;
    }) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.attendance.getSession(params);
      }
      try {
        const q = new URLSearchParams({
          section_id: String(params.section_id),
          session_date: params.session_date,
          period_number: String(params.period_number ?? 0),
        });
        const res = await apiClient.get(`/attendance/sessions?${q.toString()}`);
        return res.data;
      } catch (err) {
        return await supabaseService.attendance.getSession(params);
      }
    },
    submit: async (data: {
      academic_year_id: number | string;
      class_id: number | string;
      section_id: number | string;
      session_date: string;
      period_number?: number;
      records: Array<{ student_id: number | string; status: string; remarks?: string }>;
    }) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.attendance.submit(data);
      }
      try {
        const res = await apiClient.post("/attendance/sessions", data);
        return res.data;
      } catch (err) {
        return await supabaseService.attendance.submit(data);
      }
    },
    getDateWiseReport: async (params: {
      class_id?: number | string;
      section_id?: number | string;
      from_date?: string;
      to_date?: string;
    } = {}) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.attendance.getDateWiseReport(params);
      }
      try {
        const q = new URLSearchParams();
        if (params.class_id) q.append("class_id", String(params.class_id));
        if (params.section_id) q.append("section_id", String(params.section_id));
        if (params.from_date) q.append("from_date", params.from_date);
        if (params.to_date) q.append("to_date", params.to_date);
        const res = await apiClient.get(`/attendance/reports/date-wise?${q.toString()}`);
        return res.data;
      } catch (err) {
        return await supabaseService.attendance.getDateWiseReport(params);
      }
    },
    getStudentSummary: async (studentId: number | string, academicYearId?: number | string) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.attendance.getStudentSummary(studentId);
      }
      try {
        const q = academicYearId ? `?academic_year_id=${academicYearId}` : "";
        const res = await apiClient.get(`/attendance/students/${studentId}/summary${q}`);
        return res.data;
      } catch (err) {
        return await supabaseService.attendance.getStudentSummary(studentId);
      }
    },
    getLowAttendance: async (threshold: number = 75.0, classId?: number | string) => {
      if (USE_MOCK_FALLBACK) {
        return [];
      }
      try {
        const q = new URLSearchParams({ threshold: threshold.toString() });
        if (classId) q.append("class_id", String(classId));
        const res = await apiClient.get(`/attendance/low-attendance?${q.toString()}`);
        return res.data;
      } catch (err) {
        return [];
      }
    },
  },

  exams: {
    list: async (academicYearId?: number | string) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.exams.list(academicYearId);
      }
      try {
        const q = academicYearId ? `?academic_year_id=${academicYearId}` : "";
        const res = await apiClient.get(`/examinations/exams${q}`);
        return res.data;
      } catch (err) {
        return await supabaseService.exams.list(academicYearId);
      }
    },
  },

  subjects: {
    list: async (classId?: number | string): Promise<any[]> => {
      let subjectsList: any[] = [];
      try {
        const q = classId ? `?class_id=${classId}` : "";
        const res = await apiClient.get(`/examinations/subjects${q}`);
        subjectsList = res.data;
      } catch {
        if (isSupabaseConfigured()) {
          try {
            subjectsList = await supabaseService.subjects.list(classId);
          } catch (e) {
            console.warn("Could not query subjects from Supabase:", e);
          }
        }
      }

      // If viewing by class
      if (classId) {
        const assignments = getStoredClassSubjectAssignments().filter(
          (a) => String(a.class_id) === String(classId)
        );
        if (assignments.length > 0) {
          const allSubs = await api.subjects.list();
          return assignments.map((a) => {
            const sub = allSubs.find((s) => String(s.id) === String(a.subject_id));
            return {
              ...(sub || { id: a.subject_id, name: "Subject", code: "SUB", department: "General" }),
              is_elective: a.is_elective,
              assignment_id: `asg_${a.class_id}_${a.subject_id}`,
              class_id: a.class_id,
            };
          });
        }
        if (subjectsList && subjectsList.length > 0) return subjectsList;
        // Default baseline for Class 10
        return BASELINE_SUBJECTS.map((s, idx) => ({ ...s, is_elective: idx >= 6, class_id: classId }));
      }

      // Merge baseline with remote and custom subjects
      const customSubs = getStoredCustomSubjects();
      const map = new Map<string, any>();
      BASELINE_SUBJECTS.forEach((s) => map.set(s.code.toUpperCase(), { ...s }));
      subjectsList.forEach((s) => map.set(s.code.toUpperCase(), s));
      customSubs.forEach((s) => map.set(s.code.toUpperCase(), s));

      return Array.from(map.values());
    },

    create: async (data: { name: string; code: string; department?: string; is_active?: boolean }) => {
      assertAdminRole();

      // Check duplicate code
      const all = await api.subjects.list();
      const cleanCode = data.code.trim().toUpperCase();
      const dup = all.find((s) => s.code.trim().toUpperCase() === cleanCode);
      if (dup) {
        throw new ApiError(`Subject code "${cleanCode}" is already registered.`, 400);
      }

      let created: any = null;
      if (isSupabaseConfigured()) {
        try {
          created = await supabaseService.subjects.create(data);
        } catch (e) {
          console.warn("Supabase subject creation fallback:", e);
        }
      }

      if (!created) {
        created = {
          id: generateUUID(),
          name: data.name.trim(),
          code: cleanCode,
          department: data.department || "General",
          is_active: data.is_active ?? true,
        };
      }

      saveCustomSubject(created);
      return created;
    },

    update: async (
      subjectId: number | string,
      data: { name?: string; code?: string; department?: string; is_active?: boolean }
    ) => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.subjects.update(subjectId, data);
        } catch (e) {
          console.warn("Supabase subject update fallback:", e);
        }
      }

      const all = await api.subjects.list();
      const target = all.find((s) => String(s.id) === String(subjectId));
      const updated = {
        ...(target || { id: subjectId, name: data.name || "Subject", code: data.code || "SUB" }),
        ...data,
      };
      saveCustomSubject(updated);
      return updated;
    },

    deactivate: async (subjectId: number | string) => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.subjects.deactivate(subjectId);
        } catch (e) {
          console.warn("Supabase subject deactivate fallback:", e);
        }
      }

      const all = await api.subjects.list();
      const target = all.find((s) => String(s.id) === String(subjectId));
      const updated = {
        ...(target || { id: subjectId, name: "Subject", code: "SUB" }),
        is_active: false,
      };
      saveCustomSubject(updated);
      return updated;
    },

    assignToClass: async (
      classId: number | string,
      subjectId: number | string,
      isElective: boolean = false
    ) => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.subjects.assignToClass(classId, subjectId, isElective);
        } catch (e) {
          console.warn("Supabase class_subjects assignment fallback:", e);
        }
      }

      saveClassSubjectAssignment(classId, subjectId, isElective);
      return { class_id: classId, subject_id: subjectId, is_elective: isElective };
    },

    removeFromClass: async (classId: number | string, subjectId: number | string) => {
      assertAdminRole();

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.subjects.removeFromClass(classId, subjectId);
        } catch (e) {
          console.warn("Supabase class_subjects removal fallback:", e);
        }
      }

      removeClassSubjectAssignment(classId, subjectId);
      return { success: true };
    },

    listByClass: async (classId: number | string) => {
      return api.subjects.list(classId);
    },
  },

  marks: {
    getEntrySheet: async (params: {
      exam_id: number | string;
      class_id: number | string;
      section_id: number | string;
      subject_name: string;
    }) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.marks.getEntrySheet(params);
      }
      try {
        const q = new URLSearchParams({
          exam_id: String(params.exam_id),
          class_id: String(params.class_id),
          section_id: String(params.section_id),
          subject_name: params.subject_name,
        });
        const res = await apiClient.get(`/examinations/marks/entry-sheet?${q.toString()}`);
        return res.data;
      } catch (err) {
        return await supabaseService.marks.getEntrySheet(params);
      }
    },

    save: async (payload: {
      exam_id: number | string;
      class_id: number | string;
      section_id: number | string;
      subject_name: string;
      max_marks: number;
      passing_marks: number;
      entries: Array<{
        student_id: number | string;
        marks_obtained?: number | null;
        is_absent?: boolean;
        remarks?: string;
      }>;
    }) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.marks.save(payload);
      }
      try {
        const res = await apiClient.post("/examinations/marks", payload);
        return res.data;
      } catch (err) {
        return await supabaseService.marks.save(payload);
      }
    },

    getClassResults: async (params: {
      exam_id: number | string;
      class_id: number | string;
      section_id?: number | string;
    }) => {
      if (USE_MOCK_FALLBACK) {
        return await supabaseService.marks.getClassResults(params);
      }
      try {
        const q = new URLSearchParams({
          exam_id: String(params.exam_id),
          class_id: String(params.class_id),
        });
        if (params.section_id) q.append("section_id", String(params.section_id));
        const res = await apiClient.get(`/examinations/results/class?${q.toString()}`);
        return res.data;
      } catch (err) {
        return await supabaseService.marks.getClassResults(params);
      }
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
    allotSlot: async (slot: {
      day: number;
      period: number;
      time: string;
      subject: string;
      teacher: string;
      teacher_id?: string | number;
      room: string;
      class_id?: string | number;
      class_name?: string;
      section_id?: string | number;
      section_name?: string;
    }) => {
      saveCustomTimetableSlot(slot);
      return { success: true, message: `Period ${slot.period} allotted to ${slot.teacher} successfully.` };
    },
  },

  fees: {
    getStats: async () => {
      return request<{
        total_billed: number;
        total_collected: number;
        outstanding: number;
        collection_rate: number;
      }>("/fees/stats");
    },
    getCategories: async () => {
      return request<Array<{ id: number; name: string; description?: string }>>("/fees/categories");
    },
    createCategory: async (data: { name: string; description?: string }) => {
      return request<any>("/fees/categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    getInvoices: async (params: { student_id?: number | string; status?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.student_id) q.append("student_id", String(params.student_id));
      if (params.status) q.append("status", params.status);
      return request<any[]>(`/fees/invoices?${q.toString()}`);
    },
    createInvoice: async (data: {
      student_id: number;
      academic_year_id: number;
      invoice_number: string;
      total_amount: number;
      due_date: string;
    }) => {
      return request<any>("/fees/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    recordPayment: async (data: {
      invoice_id: number;
      student_id: number;
      receipt_number: string;
      amount: number;
      payment_mode: string;
      transaction_reference?: string;
    }) => {
      return request<any>("/fees/payments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  assignments: {
    list: async (params: { class_id?: number | string; section_id?: number | string; subject?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.class_id) q.append("class_id", String(params.class_id));
      if (params.section_id) q.append("section_id", String(params.section_id));
      if (params.subject) q.append("subject", params.subject);
      return request<any[]>(`/assignments/?${q.toString()}`);
    },
    create: async (data: {
      title: string;
      description?: string;
      subject: string;
      class_id: number;
      section_id?: number;
      due_date: string;
      max_marks?: number;
    }) => {
      return request<any>("/assignments/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    delete: async (id: number | string) => {
      return request<any>(`/assignments/${id}`, {
        method: "DELETE",
      });
    },
  },

  reports: {
    getSummary: async () => {
      return request<{
        enrollment_by_class: Array<{ class_name: string; count: number }>;
        gender_distribution: { male: number; female: number; other: number };
        overall_attendance_rate: number;
        fee_collection_status: { collected: number; pending: number };
        top_performers: Array<{ name: string; class_name: string; percentage: number }>;
      }>("/reports/summary");
    },
  },
};
