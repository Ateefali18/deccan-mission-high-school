import type {
  CurrentUserSession,
  AcademicYear,
  AcademicTerm,
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
  ExpenseItem,
  ExpenseStats,
  FeeFinancialSummary,
  ExpenseCategory,
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

export const DEFAULT_BASELINE_TIMETABLE: Record<number, any[]> = {
  1: [
    { id: "slot-1-1", day: 1, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-1-2", day: 1, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "General Science (Physics)", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Science Lab", is_active: true },
    { id: "slot-1-3", day: 1, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Room 302", is_active: true },
    { id: "slot-1-4", day: 1, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "English Core", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-1-5", day: 1, period: 5, time: "12:15 PM - 01:00 PM", start_time: "12:15", end_time: "13:00", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_a", section_name: "A", room: "Room 201", is_active: true },
    { id: "slot-1-6", day: 1, period: 6, time: "01:45 PM - 02:30 PM", start_time: "13:45", end_time: "14:30", subject: "Social Science", teacher: "Mohsin Khan", teacher_id: "tch_mohsin", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-1-7", day: 1, period: 7, time: "02:30 PM - 03:15 PM", start_time: "14:30", end_time: "15:15", subject: "Computer Science", teacher: "Zainab Fatima", teacher_id: "tch_zainab", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Computer Lab", is_active: true },
    { id: "slot-1-8", day: 1, period: 8, time: "03:15 PM - 04:00 PM", start_time: "15:15", end_time: "16:00", subject: "Physical Education", teacher: "Coach Vikram", teacher_id: "tch_vikram", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Playground", is_active: true },
  ],
  2: [
    { id: "slot-2-1", day: 2, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "English Core", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-2-2", day: 2, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-2-3", day: 2, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "General Science (Chemistry)", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Chemistry Lab", is_active: true },
    { id: "slot-2-4", day: 2, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Room 302", is_active: true },
    { id: "slot-2-5", day: 2, period: 5, time: "12:15 PM - 01:00 PM", start_time: "12:15", end_time: "13:00", subject: "Second Language (Hindi/Urdu)", teacher: "Rashid Ali", teacher_id: "tch_rashid", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-2-6", day: 2, period: 6, time: "01:45 PM - 02:30 PM", start_time: "13:45", end_time: "14:30", subject: "Mathematics Tutorial", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_a", section_name: "A", room: "Room 201", is_active: true },
    { id: "slot-2-7", day: 2, period: 7, time: "02:30 PM - 03:15 PM", start_time: "14:30", end_time: "15:15", subject: "Art & Craft", teacher: "Mrs. Shobha", teacher_id: "tch_shobha", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Art Studio", is_active: true },
    { id: "slot-2-8", day: 2, period: 8, time: "03:15 PM - 04:00 PM", start_time: "15:15", end_time: "16:00", subject: "Library & Self-Study", teacher: "Librarian", teacher_id: "tch_lib", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Central Library", is_active: true },
  ],
  3: [
    { id: "slot-3-1", day: 3, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Room 302", is_active: true },
    { id: "slot-3-2", day: 3, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "General Science (Biology)", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Biology Lab", is_active: true },
    { id: "slot-3-3", day: 3, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-3-4", day: 3, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "Social Science", teacher: "Mohsin Khan", teacher_id: "tch_mohsin", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-3-5", day: 3, period: 5, time: "12:15 PM - 01:00 PM", start_time: "12:15", end_time: "13:00", subject: "English Core", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-3-6", day: 3, period: 6, time: "01:45 PM - 02:30 PM", start_time: "13:45", end_time: "14:30", subject: "Computer Science Lab", teacher: "Zainab Fatima", teacher_id: "tch_zainab", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Computer Lab", is_active: true },
    { id: "slot-3-7", day: 3, period: 7, time: "02:30 PM - 03:15 PM", start_time: "14:30", end_time: "15:15", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_a", section_name: "A", room: "Room 201", is_active: true },
    { id: "slot-3-8", day: 3, period: 8, time: "03:15 PM - 04:00 PM", start_time: "15:15", end_time: "16:00", subject: "Moral Science & Values", teacher: "STA Khadri", teacher_id: "tch_khadri", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
  ],
  4: [
    { id: "slot-4-1", day: 4, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-4-2", day: 4, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "English Core", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-4-3", day: 4, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "Social Science", teacher: "Mohsin Khan", teacher_id: "tch_mohsin", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-4-4", day: 4, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_a", section_name: "A", room: "Room 201", is_active: true },
    { id: "slot-4-5", day: 4, period: 5, time: "12:15 PM - 01:00 PM", start_time: "12:15", end_time: "13:00", subject: "General Science", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-4-6", day: 4, period: 6, time: "01:45 PM - 02:30 PM", start_time: "13:45", end_time: "14:30", subject: "Mathematics Lab", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Math Lab", is_active: true },
    { id: "slot-4-7", day: 4, period: 7, time: "02:30 PM - 03:15 PM", start_time: "14:30", end_time: "15:15", subject: "Second Language", teacher: "Rashid Ali", teacher_id: "tch_rashid", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-4-8", day: 4, period: 8, time: "03:15 PM - 04:00 PM", start_time: "15:15", end_time: "16:00", subject: "Physical Education", teacher: "Coach Vikram", teacher_id: "tch_vikram", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Playground", is_active: true },
  ],
  5: [
    { id: "slot-5-1", day: 5, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "General Science", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Science Lab", is_active: true },
    { id: "slot-5-2", day: 5, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Room 302", is_active: true },
    { id: "slot-5-3", day: 5, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "English Core", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-5-4", day: 5, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "Social Science", teacher: "Mohsin Khan", teacher_id: "tch_mohsin", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-5-5", day: 5, period: 5, time: "12:15 PM - 01:00 PM", start_time: "12:15", end_time: "13:00", subject: "Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-5-6", day: 5, period: 6, time: "01:45 PM - 02:30 PM", start_time: "13:45", end_time: "14:30", subject: "Second Language", teacher: "Rashid Ali", teacher_id: "tch_rashid", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-5-7", day: 5, period: 7, time: "02:30 PM - 03:15 PM", start_time: "14:30", end_time: "15:15", subject: "Computer Science", teacher: "Zainab Fatima", teacher_id: "tch_zainab", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Computer Lab", is_active: true },
    { id: "slot-5-8", day: 5, period: 8, time: "03:15 PM - 04:00 PM", start_time: "15:15", end_time: "16:00", subject: "Remedial Mathematics", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_a", section_name: "A", room: "Room 201", is_active: true },
  ],
  6: [
    { id: "slot-6-1", day: 6, period: 1, time: "09:00 AM - 09:45 AM", start_time: "09:00", end_time: "09:45", subject: "Mathematics Assessment", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Room 301", is_active: true },
    { id: "slot-6-2", day: 6, period: 2, time: "09:45 AM - 10:30 AM", start_time: "09:45", end_time: "10:30", subject: "Mathematics Assessment", teacher: "Ateef", teacher_id: "tch_ateef", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_b", section_name: "B", room: "Room 302", is_active: true },
    { id: "slot-6-3", day: 6, period: 3, time: "10:30 AM - 11:15 AM", start_time: "10:30", end_time: "11:15", subject: "General Science Club", teacher: "Dr. K. R. Ahmed", teacher_id: "tch_ahmed", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Science Lab", is_active: true },
    { id: "slot-6-4", day: 6, period: 4, time: "11:30 AM - 12:15 PM", start_time: "11:30", end_time: "12:15", subject: "Co-curricular / Debate Club", teacher: "Amina Begum", teacher_id: "tch_amina", class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_a", section_name: "A", room: "Auditorium", is_active: true },
  ],
};

export const getStoredCustomTimetable = (): Record<number, any[]> => {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_BASELINE_TIMETABLE;
    const raw = localStorage.getItem("dmhs_custom_timetable");
    if (!raw) {
      localStorage.setItem("dmhs_custom_timetable", JSON.stringify(DEFAULT_BASELINE_TIMETABLE));
      return DEFAULT_BASELINE_TIMETABLE;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || Object.keys(parsed).length === 0) {
      localStorage.setItem("dmhs_custom_timetable", JSON.stringify(DEFAULT_BASELINE_TIMETABLE));
      return DEFAULT_BASELINE_TIMETABLE;
    }
    return parsed;
  } catch {
    return DEFAULT_BASELINE_TIMETABLE;
  }
};

export const checkTimetableConflicts = (newSlot: {
  day: number;
  period: number;
  teacher: string;
  teacher_id?: string | number;
  class_name?: string;
  class_id?: string | number;
  section_name?: string;
  section_id?: string | number;
  id?: string | number;
}): { hasConflict: boolean; reason?: string } => {
  const schedule = getStoredCustomTimetable();
  const daySlots: any[] = schedule[newSlot.day] || [];

  // Check teacher conflict
  const teacherConflict = daySlots.find(
    (s) =>
      s.is_active !== false &&
      s.period === newSlot.period &&
      String(s.id) !== String(newSlot.id) &&
      (
        (newSlot.teacher && s.teacher && s.teacher.toLowerCase().trim() === newSlot.teacher.toLowerCase().trim()) ||
        (newSlot.teacher_id && s.teacher_id && String(s.teacher_id) === String(newSlot.teacher_id))
      )
  );
  if (teacherConflict) {
    return {
      hasConflict: true,
      reason: `Conflict Detected: Teacher "${newSlot.teacher}" is already assigned to ${teacherConflict.class_name || "Class"} ${teacherConflict.section_name ? `Section ${teacherConflict.section_name}` : ""} during Period ${newSlot.period}.`,
    };
  }

  // Check class & section conflict
  if (newSlot.section_id || (newSlot.class_name && newSlot.section_name)) {
    const classConflict = daySlots.find(
      (s) =>
        s.is_active !== false &&
        s.period === newSlot.period &&
        String(s.id) !== String(newSlot.id) &&
        (
          (newSlot.section_id && s.section_id && String(s.section_id) === String(newSlot.section_id)) ||
          (
            newSlot.class_name &&
            newSlot.section_name &&
            s.class_name?.toLowerCase().trim() === newSlot.class_name.toLowerCase().trim() &&
            s.section_name?.toLowerCase().trim() === newSlot.section_name.toLowerCase().trim()
          )
        )
    );
    if (classConflict) {
      return {
        hasConflict: true,
        reason: `Conflict Detected: ${newSlot.class_name || "Class"} Section ${newSlot.section_name || ""} already has "${classConflict.subject}" (${classConflict.teacher}) assigned during Period ${newSlot.period}.`,
      };
    }
  }

  return { hasConflict: false };
};

export const saveCustomTimetableSlot = (slot: {
  id?: string | number;
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
  is_active?: boolean;
}) => {
  const conflict = checkTimetableConflicts(slot);
  if (conflict.hasConflict) {
    throw new ApiError(conflict.reason || "Timetable assignment conflict detected.", 400);
  }

  const schedule = getStoredCustomTimetable();
  const daySlots = schedule[slot.day] || [];
  const slotId = slot.id || `slot_${slot.day}_${slot.period}_${Date.now()}`;
  const updatedDaySlots = daySlots.filter((s) => String(s.id) !== String(slotId) && s.period !== slot.period);
  updatedDaySlots.push({
    ...slot,
    id: slotId,
    is_active: slot.is_active !== false,
  });
  updatedDaySlots.sort((a, b) => a.period - b.period);
  schedule[slot.day] = updatedDaySlots;
  localStorage.setItem("dmhs_custom_timetable", JSON.stringify(schedule));
};

export const deleteCustomTimetableSlot = (slotId: string | number, day: number) => {
  const schedule = getStoredCustomTimetable();
  const daySlots = schedule[day] || [];
  schedule[day] = daySlots.filter((s) => String(s.id) !== String(slotId));
  localStorage.setItem("dmhs_custom_timetable", JSON.stringify(schedule));
};

export const getStoredAttendanceSessions = (): Record<string, any> => {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem("dmhs_attendance_sessions_cache");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveStoredAttendanceSession = (session: any) => {
  try {
    if (typeof localStorage === "undefined") return;
    const store = getStoredAttendanceSessions();
    const key = `${session.section_id}_${session.session_date}_${session.period_number ?? 0}`;
    store[key] = {
      ...session,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem("dmhs_attendance_sessions_cache", JSON.stringify(store));
  } catch {}
};

const DEFAULT_BASELINE_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 1,
    school_id: 1,
    name: "2026-2027",
    start_date: "2026-06-01",
    end_date: "2027-04-30",
    is_current: true,
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    school_id: 1,
    name: "2025-2026",
    start_date: "2025-06-01",
    end_date: "2026-04-30",
    is_current: false,
    status: "completed",
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
];

export const getStoredAcademicYears = (): AcademicYear[] => {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_BASELINE_ACADEMIC_YEARS;
    const raw = localStorage.getItem("dmhs_academic_years");
    if (!raw) {
      localStorage.setItem("dmhs_academic_years", JSON.stringify(DEFAULT_BASELINE_ACADEMIC_YEARS));
      return DEFAULT_BASELINE_ACADEMIC_YEARS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BASELINE_ACADEMIC_YEARS;
  } catch {
    return DEFAULT_BASELINE_ACADEMIC_YEARS;
  }
};

export const saveStoredAcademicYear = (ay: Partial<AcademicYear>): AcademicYear => {
  const current = getStoredAcademicYears();
  let updated = current;
  if (ay.is_current) {
    updated = updated.map((y) => ({ ...y, is_current: false }));
  }
  const newId = Date.now();
  const newYear: AcademicYear = {
    id: newId,
    school_id: 1,
    name: ay.name || "",
    start_date: ay.start_date || "",
    end_date: ay.end_date || "",
    is_current: ay.is_current ?? false,
    status: ay.status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  updated = [newYear, ...updated];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(updated));
  }
  return newYear;
};

export const updateStoredAcademicYear = (id: string | number, ay: Partial<AcademicYear>): AcademicYear => {
  let current = getStoredAcademicYears();
  if (ay.is_current) {
    current = current.map((y) => ({ ...y, is_current: false }));
  }
  let updatedItem: AcademicYear | null = null;
  current = current.map((y) => {
    if (String(y.id) === String(id)) {
      updatedItem = {
        ...y,
        ...ay,
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return y;
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicYear);
};

export const broadcastDataMutation = (table: string, eventType: string, data?: any) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dmhs_data_mutation", { detail: { table, eventType, data } }));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("dmhs_sync_channel");
        bc.postMessage({ table, eventType, data, timestamp: Date.now() });
        bc.close();
      }
    }
  } catch {}
};

const DEFAULT_BASELINE_ACADEMIC_TERMS: AcademicTerm[] = [
  {
    id: "term_1",
    academic_year_id: 1, // 2026-2027
    name: "Term 1 (FA1 + SA1)",
    term_type: "term",
    start_date: "2026-06-01",
    end_date: "2026-10-31",
    is_current: true,
    status: "active",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "term_2",
    academic_year_id: 1,
    name: "Term 2 (FA2 + SA2)",
    term_type: "term",
    start_date: "2026-11-01",
    end_date: "2027-04-30",
    is_current: false,
    status: "planned",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "term_3",
    academic_year_id: 2, // 2025-2026
    name: "Annual Academic Term",
    term_type: "annual",
    start_date: "2025-06-01",
    end_date: "2026-04-30",
    is_current: false,
    status: "completed",
    created_at: "2025-06-01T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
  },
];

export const getStoredAcademicTerms = (academicYearId?: string | number): AcademicTerm[] => {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_BASELINE_ACADEMIC_TERMS;
    const raw = localStorage.getItem("dmhs_academic_terms");
    let terms: AcademicTerm[] = DEFAULT_BASELINE_ACADEMIC_TERMS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        terms = parsed;
      }
    } else {
      localStorage.setItem("dmhs_academic_terms", JSON.stringify(DEFAULT_BASELINE_ACADEMIC_TERMS));
    }
    if (academicYearId) {
      return terms.filter((t) => String(t.academic_year_id) === String(academicYearId));
    }
    return terms;
  } catch {
    return DEFAULT_BASELINE_ACADEMIC_TERMS;
  }
};

export const saveStoredAcademicTerm = (term: Partial<AcademicTerm>): AcademicTerm => {
  const current = getStoredAcademicTerms();
  let updated = current;
  if (term.is_current) {
    updated = updated.map((t) => ({ ...t, is_current: false }));
  }
  const newTerm: AcademicTerm = {
    id: "term_" + Date.now(),
    academic_year_id: term.academic_year_id || 1,
    name: (term.name || "Academic Term").trim(),
    term_type: term.term_type || "term",
    start_date: term.start_date || new Date().toISOString().slice(0, 10),
    end_date: term.end_date || new Date().toISOString().slice(0, 10),
    is_current: term.is_current ?? false,
    status: term.status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  updated = [newTerm, ...updated];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_terms", JSON.stringify(updated));
  }
  return newTerm;
};

export const updateStoredAcademicTerm = (id: string | number, term: Partial<AcademicTerm>): AcademicTerm => {
  let current = getStoredAcademicTerms();
  if (term.is_current) {
    current = current.map((t) => ({ ...t, is_current: false }));
  }
  let updatedItem: AcademicTerm | null = null;
  current = current.map((t) => {
    if (String(t.id) === String(id)) {
      updatedItem = {
        ...t,
        ...term,
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return t;
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_terms", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicTerm);
};

export const deleteStoredAcademicTerm = (id: string | number): boolean => {
  let current = getStoredAcademicTerms();
  current = current.filter((t) => String(t.id) !== String(id));
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_terms", JSON.stringify(current));
  }
  return true;
};

export const setStoredCurrentAcademicTerm = (id: string | number): AcademicTerm => {
  let current = getStoredAcademicTerms();
  let updatedItem: AcademicTerm | null = null;
  current = current.map((t) => {
    if (String(t.id) === String(id)) {
      updatedItem = {
        ...t,
        is_current: true,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return { ...t, is_current: false };
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_terms", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicTerm);
};

export const setStoredCurrentAcademicYear = (id: string | number): AcademicYear => {
  let current = getStoredAcademicYears();
  let updatedItem: AcademicYear | null = null;
  current = current.map((y) => {
    if (String(y.id) === String(id)) {
      updatedItem = {
        ...y,
        is_current: true,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      return updatedItem;
    }
    return { ...y, is_current: false };
  });
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("dmhs_academic_years", JSON.stringify(current));
  }
  return updatedItem || (current[0] as AcademicYear);
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

export const BASELINE_STUDENTS: StudentListItem[] = [
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
    roll_number: "02",
    student_status: "active",
  },
  {
    id: "std_ayesha",
    admission_number: "ADM-2025-0102",
    full_name: "Ayesha Siddiqua",
    email: "ayesha.siddiqua@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "03",
    student_status: "active",
  },
  {
    id: "std_ibrahim",
    admission_number: "ADM-2025-0103",
    full_name: "Syed Ibrahim",
    email: "syed.ibrahim@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "04",
    student_status: "active",
  },
  {
    id: "std_zainab",
    admission_number: "ADM-2025-0104",
    full_name: "Zainab Fatima",
    email: "zainab.fatima@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "05",
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

// ----------------------------------------------------------------------------
// EXPENSES & FEES PERSISTENT LOCAL STORAGE
// ----------------------------------------------------------------------------
const STORAGE_KEY_EXPENSES = "dmhs_custom_expenses";
const STORAGE_KEY_INVOICES = "dmhs_custom_invoices";
const STORAGE_KEY_PAYMENTS = "dmhs_custom_payments";

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "exp_001",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Staff Salaries",
    description: "Monthly faculty salary disbursement - Primary & High School staff",
    amount: 185000,
    payment_method: "Bank Transfer",
    reference_number: "SAL-2026-NOV",
    notes: "Approved by STA Khadri",
    is_active: true,
  },
  {
    id: "exp_002",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Aaya's Salaries",
    description: "Support staff and custodial helper monthly wages",
    amount: 32000,
    payment_method: "Cash",
    reference_number: "AAY-2026-NOV",
    is_active: true,
  },
  {
    id: "exp_003",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Electricity Bill",
    description: "TSSPDCL Monthly commercial power tariff for school campus",
    amount: 14850,
    payment_method: "Online Portal",
    reference_number: "TSSPDCL-41092",
    is_active: true,
  },
];

export const getStoredCustomExpenses = (): ExpenseItem[] => {
  if (typeof localStorage === "undefined") return INITIAL_EXPENSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSES;
  } catch {
    return INITIAL_EXPENSES;
  }
};

export const saveCustomExpense = (item: ExpenseItem): void => {
  if (typeof localStorage === "undefined") return;
  const list = getStoredCustomExpenses().filter((e) => String(e.id) !== String(item.id));
  list.unshift(item);
  localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(list));
};

export const updateCustomExpense = (id: string, updates: Partial<ExpenseItem>): ExpenseItem | null => {
  if (typeof localStorage === "undefined") return null;
  const list = getStoredCustomExpenses();
  const index = list.findIndex((e) => String(e.id) === String(id));
  if (index === -1) return null;
  const updated = { ...list[index], ...updates, updated_at: new Date().toISOString() };
  list[index] = updated;
  localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(list));
  return updated;
};

export const deleteCustomExpense = (id: string): boolean => {
  if (typeof localStorage === "undefined") return false;
  const list = getStoredCustomExpenses();
  const index = list.findIndex((e) => String(e.id) === String(id));
  if (index === -1) return false;
  list[index].is_active = false;
  localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(list));
  return true;
};

// Initial student invoices
const INITIAL_INVOICES = [
  {
    id: 1,
    invoice_number: "DMHS-INV-2025-001",
    student_id: 1,
    student_name: "Zeeshan Khan",
    admission_number: "DMHS-2025-0001",
    total_amount: 45000,
    paid_amount: 45000,
    balance: 0,
    status: "paid",
    due_date: "2025-08-15",
    created_at: "2025-06-10",
  },
  {
    id: 2,
    invoice_number: "DMHS-INV-2025-002",
    student_id: 2,
    student_name: "Ayesha Siddiqa",
    admission_number: "DMHS-2025-0002",
    total_amount: 45000,
    paid_amount: 30000,
    balance: 15000,
    status: "partial",
    due_date: "2025-08-15",
    created_at: "2025-06-10",
  },
];

// Initial completed payments
const INITIAL_PAYMENTS = [
  {
    id: 1,
    invoice_id: 1,
    student_id: 1,
    receipt_number: "REC-2025-101",
    amount: 45000,
    payment_mode: "Bank Transfer",
    status: "completed",
    payment_date: "2025-07-02",
  },
  {
    id: 2,
    invoice_id: 2,
    student_id: 2,
    receipt_number: "REC-2025-102",
    amount: 30000,
    payment_mode: "Bank Transfer",
    status: "completed",
    payment_date: "2025-07-10",
  },
];

export const getStoredInvoices = (): any[] => {
  if (typeof localStorage === "undefined") return INITIAL_INVOICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_INVOICES;
  } catch {
    return INITIAL_INVOICES;
  }
};

export const getStoredPayments = (): any[] => {
  if (typeof localStorage === "undefined") return INITIAL_PAYMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
      return INITIAL_PAYMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENTS;
  } catch {
    return INITIAL_PAYMENTS;
  }
};

export const saveCustomPayment = (payment: any): void => {
  if (typeof localStorage === "undefined") return;
  const payments = getStoredPayments();
  payments.unshift(payment);
  localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));

  // Update associated invoice
  if (payment.invoice_id) {
    const invoices = getStoredInvoices();
    const invIndex = invoices.findIndex((i) => String(i.id) === String(payment.invoice_id));
    if (invIndex !== -1) {
      const inv = invoices[invIndex];
      const newPaid = Number(inv.paid_amount || 0) + Number(payment.amount);
      const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : "partial";
      invoices[invIndex] = {
        ...inv,
        paid_amount: newPaid,
        balance: newBalance,
        status: newStatus,
      };
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
    }
  }
};

export const BASELINE_CLASSES: SchoolClass[] = [
  // 1. Pre-Primary
  {
    id: "cls_nursery",
    name: "Nursery",
    grade_level: 0,
    category: "Pre-Primary",
    stream: "Early Childhood",
    is_active: true,
    class_teacher_name: "Mrs. Asma Begum",
    sections: [
      { id: "sec_nur_a", class_id: "cls_nursery", name: "A", room_number: "PP-101", capacity: 30, is_active: true },
    ],
  },
  {
    id: "cls_lkg",
    name: "LKG",
    grade_level: 0,
    category: "Pre-Primary",
    stream: "Kindergarten",
    is_active: true,
    class_teacher_name: "Mrs. Sana Khan",
    sections: [
      { id: "sec_lkg_a", class_id: "cls_lkg", name: "A", room_number: "PP-102", capacity: 30, is_active: true },
    ],
  },
  {
    id: "cls_ukg",
    name: "UKG",
    grade_level: 0,
    category: "Pre-Primary",
    stream: "Kindergarten",
    is_active: true,
    class_teacher_name: "Mrs. Hina Kausar",
    sections: [
      { id: "sec_ukg_a", class_id: "cls_ukg", name: "A", room_number: "PP-103", capacity: 35, is_active: true },
    ],
  },

  // 2. Primary
  {
    id: "cls_1",
    name: "Class 1",
    grade_level: 1,
    category: "Primary",
    stream: "Foundational SSC",
    is_active: true,
    class_teacher_name: "Mrs. Bushra Tahseen",
    sections: [
      { id: "sec_1a", class_id: "cls_1", name: "A", room_number: "Room 101", capacity: 35, is_active: true },
      { id: "sec_1b", class_id: "cls_1", name: "B", room_number: "Room 102", capacity: 35, is_active: true },
    ],
  },
  {
    id: "cls_2",
    name: "Class 2",
    grade_level: 2,
    category: "Primary",
    stream: "Foundational SSC",
    is_active: true,
    class_teacher_name: "Mrs. Shaheen Begum",
    sections: [
      { id: "sec_2a", class_id: "cls_2", name: "A", room_number: "Room 103", capacity: 35, is_active: true },
      { id: "sec_2b", class_id: "cls_2", name: "B", room_number: "Room 104", capacity: 35, is_active: true },
    ],
  },

  // 3. Higher Classes
  {
    id: "cls_6",
    name: "Class 6",
    grade_level: 6,
    category: "Higher Classes",
    stream: "Secondary SSC",
    is_active: true,
    class_teacher_name: "Mr. Abdul Raheem",
    sections: [
      { id: "sec_6a", class_id: "cls_6", name: "A", room_number: "Room 201", capacity: 40, is_active: true },
      { id: "sec_6b", class_id: "cls_6", name: "B", room_number: "Room 202", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_7",
    name: "Class 7",
    grade_level: 7,
    category: "Higher Classes",
    stream: "Secondary SSC",
    is_active: true,
    class_teacher_name: "Mrs. Tabassum Jahan",
    sections: [
      { id: "sec_7a", class_id: "cls_7", name: "A", room_number: "Room 203", capacity: 40, is_active: true },
      { id: "sec_7b", class_id: "cls_7", name: "B", room_number: "Room 204", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_8",
    name: "Class 8",
    grade_level: 8,
    category: "Higher Classes",
    stream: "Secondary SSC",
    is_active: true,
    class_teacher_name: "Mr. Tariq Jameel",
    sections: [
      { id: "sec_8a", class_id: "cls_8", name: "A", room_number: "Room 205", capacity: 40, is_active: true },
      { id: "sec_8b", class_id: "cls_8", name: "B", room_number: "Room 206", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_9",
    name: "Class 9",
    grade_level: 9,
    category: "Higher Classes",
    stream: "Secondary SSC",
    is_active: true,
    class_teacher_name: "Mrs. Fatima Zahra",
    sections: [
      { id: "sec_9a", class_id: "cls_9", name: "A", room_number: "Room 301", capacity: 40, is_active: true },
      { id: "sec_9b", class_id: "cls_9", name: "B", room_number: "Room 302", capacity: 40, is_active: true },
    ],
  },
  {
    id: "cls_10",
    name: "Class 10",
    grade_level: 10,
    category: "Higher Classes",
    stream: "Telangana State SSC Board",
    is_active: true,
    class_teacher_name: "Mr. Ateef",
    sections: [
      { id: "sec_10a", class_id: "cls_10", name: "A", room_number: "Room 303", capacity: 40, is_active: true },
      { id: "sec_10b", class_id: "cls_10", name: "B", room_number: "Room 304", capacity: 40, is_active: true },
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

      // 1. Strict Administrator Match: STA khadri / 1234 or configured password
      const isAdminMatch =
        cleanUser === "sta khadri" ||
        cleanUser === "stakhadri" ||
        cleanUser === "sta.khadri" ||
        cleanUser === "sta_khadri" ||
        cleanUser === "admin" ||
        cleanUser === "admin@dmhs.edu.in" ||
        cleanUser === "sta.khadri@dmhs.edu.in";

      if (isAdminMatch) {
        const expectedAdminPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_admin_password")) || "1234";
        if (cleanPass && cleanPass !== expectedAdminPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for administrator account.", 401);
        }
        const adminSession = {
          access_token: "admin_token_" + Date.now(),
          token_type: "bearer",
          role: "ADMIN",
          full_name: "STA Khadri",
          username: "STA khadri",
          email: "sta.khadri@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", adminSession.access_token);
        localStorage.setItem("dmhs_demo_role", "ADMIN");
        localStorage.setItem("dmhs_session_user", JSON.stringify(adminSession));
        setSupabaseAdminHeader(true);
        if (isSupabaseConfigured()) {
          supabase.auth.signInWithPassword({ email: "sta.khadri@dmhs.edu.in", password: cleanPass || "1234" }).catch(() => {});
        }
        return adminSession;
      }

      // 2. Check Dynamically Registered Teachers & Admitted Students in Persistent Storage
      const customUsers = getStoredCustomUsers();
      const matchedUser = customUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUser ||
          u.email.toLowerCase() === cleanUser ||
          (u.employee_id && u.employee_id.toLowerCase() === cleanUser) ||
          (u.admission_number && u.admission_number.toLowerCase() === cleanUser)
      );

      if (matchedUser) {
        const expectedUserPass = matchedUser.password || "1234";
        if (cleanPass && cleanPass !== expectedUserPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for this user account.", 401);
        }
        const dynamicSession = {
          access_token: "user_token_" + Date.now(),
          token_type: "bearer",
          role: matchedUser.role,
          full_name: matchedUser.full_name,
          username: matchedUser.username,
          email: matchedUser.email,
        };
        localStorage.setItem("dmhs_token", dynamicSession.access_token);
        localStorage.setItem("dmhs_demo_role", matchedUser.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(dynamicSession));
        setSupabaseAdminHeader(false);
        return dynamicSession;
      }

      // 3. Baseline Faculty Member: Ateef (EMP-ATEEF)
      const matchedTeacher = BASELINE_TEACHERS.find(
        (t) =>
          t.employee_id.toLowerCase() === cleanUser ||
          t.email.toLowerCase() === cleanUser ||
          t.full_name.toLowerCase() === cleanUser ||
          cleanUser === "ateef" ||
          cleanUser === "teacher1"
      );

      if (matchedTeacher) {
        const expectedTeacherPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_teacher_password_tch_ateef")) || "1234";
        if (cleanPass && cleanPass !== expectedTeacherPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for faculty account.", 401);
        }
        const teacherSession = {
          access_token: "teacher_token_" + Date.now(),
          token_type: "bearer",
          role: "TEACHER",
          full_name: matchedTeacher.full_name,
          username: cleanUser === "ateef" || cleanUser.includes("ateef") ? "Ateef" : matchedTeacher.employee_id,
          email: matchedTeacher.email,
        };
        localStorage.setItem("dmhs_token", teacherSession.access_token);
        localStorage.setItem("dmhs_demo_role", "TEACHER");
        localStorage.setItem("dmhs_session_user", JSON.stringify(teacherSession));
        setSupabaseAdminHeader(false);
        return teacherSession;
      }

      // 4. Baseline Enrolled Student: Ali (ADM-2025-0101)
      const matchedStudent = BASELINE_STUDENTS.find(
        (s) =>
          s.admission_number.toLowerCase() === cleanUser ||
          s.email.toLowerCase() === cleanUser ||
          s.full_name.toLowerCase() === cleanUser ||
          cleanUser === "ali" ||
          cleanUser === "student1"
      );

      if (matchedStudent) {
        const expectedStudentPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_student_password_std_ali")) || "1234";
        if (cleanPass && cleanPass !== expectedStudentPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for student account.", 401);
        }
        const studentSession = {
          access_token: "student_token_" + Date.now(),
          token_type: "bearer",
          role: "STUDENT",
          full_name: matchedStudent.full_name,
          username: cleanUser === "ali" || cleanUser.includes("ali") ? "Ali" : matchedStudent.admission_number,
          email: matchedStudent.email,
        };
        localStorage.setItem("dmhs_token", studentSession.access_token);
        localStorage.setItem("dmhs_demo_role", "STUDENT");
        localStorage.setItem("dmhs_session_user", JSON.stringify(studentSession));
        setSupabaseAdminHeader(false);
        return studentSession;
      }

      // 5. Check if REST backend is available for credentials
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
        if (err?.status === 401) {
          throw new ApiError("Invalid credentials. Please verify your ID and password.", 401);
        }
      }

      // 6. Strict Rejection: Unauthorized third person cannot log in
      throw new ApiError(
        "Account not found in school records. Access denied. Please contact school administration.",
        401
      );
    },

    changePassword: async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; message: string }> => {
      const sessionRaw = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_session_user") : null;
      const demoRole = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_demo_role") || "ADMIN" : "ADMIN";
      const session = sessionRaw ? JSON.parse(sessionRaw) : { role: demoRole, username: "STA khadri" };

      const cleanCurr = (currentPassword || "").trim();
      const cleanNew = (newPassword || "").trim();

      if (!cleanNew || cleanNew.length < 4) {
        throw new ApiError("New password must be at least 4 characters long.", 400);
      }

      if (session.role === "ADMIN" || demoRole === "ADMIN") {
        const storedAdminPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_admin_password")) || "1234";
        if (cleanCurr !== storedAdminPass) {
          throw new ApiError("Current administrator password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_admin_password", cleanNew);
        }
        return { success: true, message: "Administrator password changed successfully." };
      }

      const customUsers = getStoredCustomUsers();
      const userIndex = customUsers.findIndex(
        (u) =>
          u.username.toLowerCase() === (session.username || "").toLowerCase() ||
          u.email.toLowerCase() === (session.email || "").toLowerCase() ||
          (u.employee_id && u.employee_id.toLowerCase() === (session.username || "").toLowerCase()) ||
          (u.admission_number && u.admission_number.toLowerCase() === (session.username || "").toLowerCase())
      );

      if (userIndex >= 0) {
        const expected = customUsers[userIndex].password || "1234";
        if (cleanCurr !== expected) {
          throw new ApiError("Current password is incorrect.", 400);
        }
        customUsers[userIndex].password = cleanNew;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_custom_users", JSON.stringify(customUsers));
        }
        return { success: true, message: "Account password changed successfully." };
      }

      if (session.role === "TEACHER") {
        const storedPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_teacher_password_tch_ateef")) || "1234";
        if (cleanCurr !== storedPass) {
          throw new ApiError("Current teacher password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_teacher_password_tch_ateef", cleanNew);
        }
        return { success: true, message: "Faculty password changed successfully." };
      }

      if (session.role === "STUDENT") {
        const storedPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_student_password_std_ali")) || "1234";
        if (cleanCurr !== storedPass) {
          throw new ApiError("Current student password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_student_password_std_ali", cleanNew);
        }
        return { success: true, message: "Student password changed successfully." };
      }

      return { success: true, message: "Password updated successfully." };
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
      let remote: AcademicYear[] = [];
      try {
        remote = await request<AcademicYear[]>("/academic-years/");
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            remote = await supabaseService.academicYears.list();
          } catch {}
        }
      }
      if (remote && remote.length > 0) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_academic_years", JSON.stringify(remote));
        }
        return remote;
      }
      return getStoredAcademicYears();
    },

    getCurrent: async (): Promise<AcademicYear | null> => {
      const all = await api.academicYears.list();
      return all.find((y) => y.is_current) || all[0] || null;
    },

    create: async (data: { name: string; start_date: string; end_date: string; is_current: boolean; status: string }) => {
      assertAdminRole();
      const all = await api.academicYears.list();
      if (all.some((y) => y.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        throw new ApiError(`Academic session "${data.name}" already exists.`, 400);
      }
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }

      try {
        const res = await request<AcademicYear>("/academic-years/", {
          method: "POST",
          body: JSON.stringify(data),
        });
        saveStoredAcademicYear(res);
        broadcastDataMutation("academic_years", "INSERT", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.create(data);
            saveStoredAcademicYear(res);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years create fallback:", sbErr);
          }
        }
        return saveStoredAcademicYear(data);
      }
    },

    update: async (id: string | number, data: Partial<{ name: string; start_date: string; end_date: string; is_current: boolean; status: string }>) => {
      assertAdminRole();
      if (data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }
      try {
        const res = await request<AcademicYear>(`/academic-years/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        updateStoredAcademicYear(id, res);
        broadcastDataMutation("academic_years", "UPDATE", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.update(id, data);
            updateStoredAcademicYear(id, res);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years update fallback:", sbErr);
          }
        }
        return updateStoredAcademicYear(id, data);
      }
    },

    setCurrent: async (id: string | number) => {
      assertAdminRole();
      try {
        const res = await request<AcademicYear>(`/academic-years/${id}/set-current`, {
          method: "PUT",
        });
        setStoredCurrentAcademicYear(id);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicYears.setCurrent(id);
            setStoredCurrentAcademicYear(id);
            return res;
          } catch (sbErr: any) {
            console.warn("Supabase academic_years setCurrent fallback:", sbErr);
          }
        }
        const res = setStoredCurrentAcademicYear(id);
        broadcastDataMutation("academic_years", "UPDATE", res);
        return res;
      }
    },
  },

  academicTerms: {
    list: async (academicYearId?: string | number): Promise<AcademicTerm[]> => {
      let remote: AcademicTerm[] = [];
      try {
        const query = academicYearId ? `?academic_year_id=${academicYearId}` : "";
        remote = await request<AcademicTerm[]>(`/academic-terms/${query}`);
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            remote = await supabaseService.academicTerms.list(academicYearId);
          } catch {}
        }
      }
      if (remote && remote.length > 0) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_academic_terms", JSON.stringify(remote));
        }
        return remote;
      }
      return getStoredAcademicTerms(academicYearId);
    },

    getCurrent: async (academicYearId?: string | number): Promise<AcademicTerm | null> => {
      const all = await api.academicTerms.list(academicYearId);
      return all.find((t) => t.is_current) || all[0] || null;
    },

    create: async (data: {
      academic_year_id: string | number;
      name: string;
      term_type?: string;
      start_date: string;
      end_date: string;
      is_current?: boolean;
      status?: string;
    }) => {
      assertAdminRole();
      const all = await api.academicTerms.list(data.academic_year_id);
      if (all.some((t) => t.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        throw new ApiError(`Academic term "${data.name}" already exists for this session.`, 400);
      }
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }

      try {
        const res = await request<AcademicTerm>("/academic-terms/", {
          method: "POST",
          body: JSON.stringify(data),
        });
        saveStoredAcademicTerm(res);
        broadcastDataMutation("academic_terms", "INSERT", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicTerms.create(data);
            saveStoredAcademicTerm(res);
            broadcastDataMutation("academic_terms", "INSERT", res);
            return res;
          } catch {}
        }
        const res = saveStoredAcademicTerm(data);
        broadcastDataMutation("academic_terms", "INSERT", res);
        return res;
      }
    },

    update: async (
      id: string | number,
      data: Partial<{
        name: string;
        term_type?: string;
        start_date: string;
        end_date: string;
        is_current?: boolean;
        status?: string;
      }>
    ) => {
      assertAdminRole();
      if (data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ApiError("End date must be after start date.", 400);
      }
      try {
        const res = await request<AcademicTerm>(`/academic-terms/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        updateStoredAcademicTerm(id, res);
        broadcastDataMutation("academic_terms", "UPDATE", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicTerms.update(id, data);
            updateStoredAcademicTerm(id, res);
            broadcastDataMutation("academic_terms", "UPDATE", res);
            return res;
          } catch {}
        }
        const res = updateStoredAcademicTerm(id, data);
        broadcastDataMutation("academic_terms", "UPDATE", res);
        return res;
      }
    },

    setCurrent: async (id: string | number) => {
      assertAdminRole();
      try {
        const res = await request<AcademicTerm>(`/academic-terms/${id}/set-current`, {
          method: "PUT",
        });
        setStoredCurrentAcademicTerm(id);
        broadcastDataMutation("academic_terms", "UPDATE", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          try {
            const res = await supabaseService.academicTerms.setCurrent(id);
            setStoredCurrentAcademicTerm(id);
            broadcastDataMutation("academic_terms", "UPDATE", res);
            return res;
          } catch {}
        }
        const res = setStoredCurrentAcademicTerm(id);
        broadcastDataMutation("academic_terms", "UPDATE", res);
        return res;
      }
    },

    delete: async (id: string | number) => {
      assertAdminRole();
      try {
        await request(`/academic-terms/${id}`, { method: "DELETE" });
      } catch {
        if (isSupabaseConfigured()) {
          try {
            await supabaseService.academicTerms.delete(id);
          } catch {}
        }
      }
      deleteStoredAcademicTerm(id);
      broadcastDataMutation("academic_terms", "DELETE", { id });
      return true;
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

      const allStudents = getStoredCustomStudents().concat(BASELINE_STUDENTS);
      return Array.from(baseMap.values()).map((cls) => {
        const count = allStudents.filter((s) => (s.class_name || "").toLowerCase() === cls.name.toLowerCase()).length;
        const cat =
          cls.category ||
          (cls.grade_level === 0 || ["nursery", "lkg", "ukg"].includes(cls.name.toLowerCase())
            ? "Pre-Primary"
            : cls.grade_level >= 1 && cls.grade_level <= 5
            ? "Primary"
            : cls.grade_level >= 6 && cls.grade_level <= 10
            ? "Higher Classes"
            : "Higher Secondary");
        return {
          ...cls,
          category: cat,
          student_count: count,
        };
      }).sort((a, b) => a.grade_level - b.grade_level);
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
      classId?: number | string;
      section_id?: number | string;
      sectionId?: number | string;
      status?: string;
      search?: string;
    } = {}) => {
      const customStudents = getStoredCustomStudents();
      const allStudents = [...customStudents, ...BASELINE_STUDENTS];

      try {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page.toString());
        if (params.limit) query.append("limit", params.limit.toString());
        const cid = params.class_id || params.classId;
        const sid = params.section_id || params.sectionId;
        if (cid) query.append("class_id", cid.toString());
        if (sid) query.append("section_id", sid.toString());
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
        const targetClass = params.class_id || params.classId;
        const targetSection = params.section_id || params.sectionId;

        if (targetClass) {
          const cStr = String(targetClass).toLowerCase();
          filtered = filtered.filter((item) => {
            const itemCls = (item.class_name || "").toLowerCase();
            return (
              itemCls === cStr ||
              itemCls.includes(cStr) ||
              (cStr === "cls_10" && itemCls.includes("10")) ||
              (cStr === "cls_9" && itemCls.includes("9")) ||
              (cStr === "cls_8" && itemCls.includes("8"))
            );
          });
        }

        if (targetSection) {
          const sStr = String(targetSection).toLowerCase();
          filtered = filtered.filter((item) => {
            const itemSec = (item.section_name || "").toLowerCase();
            return (
              itemSec === sStr ||
              (sStr.includes("_a") && itemSec === "a") ||
              (sStr.includes("_b") && itemSec === "b") ||
              (sStr.includes("_c") && itemSec === "c")
            );
          });
        }

        if (params.status) {
          filtered = filtered.filter(
            (item) => (item.student_status || "active").toLowerCase() === params.status?.toLowerCase()
          );
        }

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
      broadcastDataMutation("students", "INSERT", newStudentItem);

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
      broadcastDataMutation("teachers", "INSERT", newTeacherItem);

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

      const customTeachers = getStoredCustomTeachers();
      const updated = customTeachers.map((t) =>
        String(t.id) === String(id) ? { ...t, ...payload } : t
      );
      saveStoredCustomTeachers(updated);

      if (!isUUID(id)) {
        broadcastDataMutation("teachers", "UPDATE", { id, ...payload });
        return payload;
      }

      try {
        const res = await request<TeacherProfile>(`/teachers/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        broadcastDataMutation("teachers", "UPDATE", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          await supabaseService.teachers.update(id, payload);
        }
        broadcastDataMutation("teachers", "UPDATE", { id, ...payload });
        return payload;
      }
    },

    toggleStatus: async (id: number | string, isActive: boolean) => {
      const customTeachers = getStoredCustomTeachers();
      const updated = customTeachers.map((t) =>
        String(t.id) === String(id)
          ? { ...t, is_active: isActive, employment_status: isActive ? "active" : "inactive" }
          : t
      );
      saveStoredCustomTeachers(updated);

      if (!isUUID(id)) {
        broadcastDataMutation("teachers", "UPDATE", { id, is_active: isActive });
        return { is_active: isActive };
      }

      try {
        const res = await request<TeacherProfile>(`/teachers/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        });
        broadcastDataMutation("teachers", "UPDATE", res);
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          await supabaseService.teachers.toggleStatus(id, isActive);
        }
        broadcastDataMutation("teachers", "UPDATE", { id, is_active: isActive });
        return { is_active: isActive };
      }
    },

    deactivate: async (id: number | string) => {
      const customTeachers = getStoredCustomTeachers();
      const updated = customTeachers.map((t) =>
        String(t.id) === String(id)
          ? { ...t, is_active: false, employment_status: "inactive" }
          : t
      );
      saveStoredCustomTeachers(updated);

      if (!isUUID(id)) {
        broadcastDataMutation("teachers", "DELETE", { id });
        return { message: "Deactivated" };
      }

      try {
        const res = await request<TeacherProfile>(`/teachers/${id}`, {
          method: "DELETE",
        });
        broadcastDataMutation("teachers", "DELETE", { id });
        return res;
      } catch (err) {
        if (isSupabaseConfigured()) {
          await supabaseService.teachers.deactivate(id);
        }
        broadcastDataMutation("teachers", "DELETE", { id });
        return { message: "Deactivated" };
      }
    },
  },

  dashboards: {
    getAdmin: async (): Promise<AdminDashboardStats> => {
      // 1. Fetch real student list, teacher list, classes, academic years and terms in parallel
      const [studentsData, teachersData, classesList, currentAy, currentTerm] = await Promise.all([
        api.students.list({ limit: 1000 }).catch(() => ({ items: [], total: 0 })),
        api.teachers.list({ limit: 1000 }).catch(() => ({ items: [], total: 0 })),
        api.classes.list().catch(() => []),
        api.academicYears.getCurrent().catch(() => null),
        api.academicTerms.getCurrent().catch(() => null),
      ]);

      const allStudents = studentsData.items || [];
      const allTeachers = teachersData.items || [];
      const activeStudents = allStudents.filter((s) => s.student_status === "active");
      const activeTeachers = allTeachers.filter((t) => t.is_active !== false && t.employment_status !== "inactive");

      // Count sections
      const totalSections = classesList.reduce((acc, c) => acc + (Array.isArray(c.sections) ? c.sections.length : 0), 0);

      // Class distribution calculation
      let prePrimaryCount = 0;
      let primaryCount = 0;
      let higherCount = 0;

      allStudents.forEach((s) => {
        const cName = (s.class_name || "").toLowerCase();
        if (cName.includes("nursery") || cName.includes("lkg") || cName.includes("ukg")) {
          prePrimaryCount++;
        } else if (
          cName.includes("class 1") ||
          cName.includes("class 2") ||
          cName.includes("class 3") ||
          cName.includes("class 4") ||
          cName.includes("class 5")
        ) {
          primaryCount++;
        } else {
          higherCount++;
        }
      });

      // Recent students & teachers
      const recentStudents = allStudents.slice(0, 5);
      const recentTeachers = allTeachers.slice(0, 5);

      // Recent activity
      const recentActivity = [
        ...recentStudents.map((s, idx) => ({
          id: `act_std_${s.id || idx}`,
          action: "Student Admission",
          resource_type: "students",
          details: `Admitted ${s.full_name} (${s.admission_number}) to ${s.class_name || "Class"}`,
          created_at: new Date(Date.now() - idx * 3600000).toISOString(),
          user_name: "Administrator",
        })),
        ...recentTeachers.map((t, idx) => ({
          id: `act_tch_${t.id || idx}`,
          action: "Faculty Addition",
          resource_type: "teachers",
          details: `Registered ${t.full_name} (${t.employee_id}) - ${t.designation}`,
          created_at: new Date(Date.now() - (idx + 1) * 7200000).toISOString(),
          user_name: "Administrator",
        })),
      ].slice(0, 6);

      return {
        total_active_students: activeStudents.length || allStudents.length,
        total_active_teachers: activeTeachers.length || allTeachers.length,
        total_classes: classesList.length,
        total_sections: totalSections,
        current_academic_year: currentAy?.name || "2026-2027",
        current_academic_year_id: currentAy?.id || null,
        current_academic_term: currentTerm?.name || "Term 1 (FA1 + SA1)",
        current_academic_term_id: currentTerm?.id || null,
        recent_students: recentStudents,
        recent_teachers: recentTeachers,
        class_distribution: [
          { category: "Pre-Primary (Nursery, LKG, UKG)", count: 3, student_count: prePrimaryCount },
          { category: "Primary (Classes 1 - 5)", count: 5, student_count: primaryCount },
          { category: "Higher Classes (Classes 6 - 10)", count: 5, student_count: higherCount },
        ],
        recent_activity: recentActivity,
        upcoming_features: [
          "Telangana State SSC Board Compliance",
          "Real-time Academic Session Synchronization",
          "Automated Marks Ledger & Grade Reports",
          "Daily Period-wise Attendance Verification",
        ],
      };
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
      const pNum = params.period_number ?? 0;
      const key = `${params.section_id}_${params.session_date}_${pNum}`;
      const cached = getStoredAttendanceSessions()[key];

      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.attendance.getSession(params);
          if (remote && remote.session_id && Object.keys(remote.records || {}).length > 0) {
            saveStoredAttendanceSession(remote);
            return remote;
          }
        } catch (e: any) {
          console.warn("Supabase getSession fallback to local cache:", e.message);
        }
      }

      if (cached) {
        return cached;
      }

      return { session_id: null, records: {} };
    },
    submit: async (data: {
      academic_year_id: number | string;
      class_id: number | string;
      section_id: number | string;
      session_date: string;
      period_number?: number;
      subject_id?: number | string;
      teacher_id?: number | string;
      records: Array<{ student_id: number | string; status: string; remarks?: string }>;
    }) => {
      // Validation: every student must have a valid status
      const incomplete = data.records.some((r) => !r.status || !["present", "absent", "late", "excused"].includes(r.status));
      if (incomplete) {
        throw new ApiError("Please assign an attendance status (Present, Absent, or Late) to every student before saving.", 400);
      }

      const pNum = data.period_number ?? 0;
      const key = `${data.section_id}_${data.session_date}_${pNum}`;
      const existing = getStoredAttendanceSessions()[key];
      const sessionId = existing?.session_id || `session_${Date.now()}`;

      const recordMap: Record<string, { id: string | number; status: string; remarks?: string }> = {
        ...(existing?.records || {}),
      };

      data.records.forEach((r) => {
        recordMap[String(r.student_id)] = {
          id: recordMap[String(r.student_id)]?.id || `rec_${r.student_id}_${Date.now()}`,
          status: r.status,
          remarks: r.remarks || "",
        };
      });

      const sessionObj = {
        session_id: sessionId,
        academic_year_id: data.academic_year_id,
        class_id: data.class_id,
        section_id: data.section_id,
        session_date: data.session_date,
        period_number: pNum,
        subject_id: data.subject_id,
        teacher_id: data.teacher_id,
        status: "submitted",
        records: recordMap,
      };

      saveStoredAttendanceSession(sessionObj);

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.attendance.submit(data);
        } catch (err: any) {
          console.warn("Supabase attendance submit fallback to local:", err.message);
        }
      }

      return {
        session_id: sessionId,
        total_records: data.records.length,
        message: `Attendance for Period ${pNum > 0 ? pNum : "Daily"} saved successfully.`,
      };
    },
    getDateWiseReport: async (params: {
      class_id?: number | string;
      section_id?: number | string;
      from_date?: string;
      to_date?: string;
    } = {}) => {
      if (isSupabaseConfigured()) {
        try {
          const rep = await supabaseService.attendance.getDateWiseReport(params);
          if (rep && rep.length > 0) return rep;
        } catch {}
      }

      // Aggregate from stored sessions
      const allSessions = getStoredAttendanceSessions();
      const summaries: any[] = [];
      Object.values(allSessions).forEach((sess: any) => {
        if (params.section_id && String(sess.section_id) !== String(params.section_id)) return;
        if (params.from_date && sess.session_date < params.from_date) return;
        if (params.to_date && sess.session_date > params.to_date) return;

        const recs = Object.values(sess.records || {}) as any[];
        const total = recs.length;
        const present = recs.filter((r) => r.status === "present").length;
        const absent = recs.filter((r) => r.status === "absent").length;
        const late = recs.filter((r) => r.status === "late").length;
        const excused = recs.filter((r) => r.status === "excused").length;
        const pct = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;

        summaries.push({
          session_id: sess.session_id,
          session_date: sess.session_date,
          period_number: sess.period_number,
          class_id: sess.class_id,
          class_name: "Class 10",
          section_id: sess.section_id,
          section_name: "A",
          total_students: total,
          present_count: present,
          late_count: late,
          absent_count: absent,
          excused_count: excused,
          attendance_percentage: pct,
          status: "submitted",
        });
      });

      return summaries;
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
      try {
        return await request<{
          status: string;
          message: string;
          current_period?: any;
          next_period?: any;
          reporting_time: string;
        }>("/timetable/next-period");
      } catch {
        const schedule = getStoredCustomTimetable();
        const day = new Date().getDay() || 1;
        const slots = schedule[day] || [];
        return {
          status: "active",
          message: slots.length > 0
            ? `Period ${slots[0]?.period}: ${slots[0]?.subject} (${slots[0]?.time})`
            : "No active periods scheduled for this session.",
          current_period: slots[0] || null,
          next_period: slots[1] || null,
          reporting_time: "08:45 AM",
        };
      }
    },
    getSchedule: async (params: { class_id?: number | string; section_id?: number | string; teacher_id?: number | string; day_of_week?: number; teacher_name?: string } = {}) => {
      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.timetable.getSchedule(params);
          if (remote && remote.length > 0) return remote;
        } catch {}
      }

      const all = getStoredCustomTimetable();
      const targetDay = params.day_of_week || 1;
      let slots = all[targetDay] || [];

      if (params.class_id) {
        slots = slots.filter((s) => String(s.class_id) === String(params.class_id));
      }
      if (params.section_id) {
        slots = slots.filter((s) => String(s.section_id) === String(params.section_id));
      }
      if (params.teacher_name) {
        slots = slots.filter((s) => s.teacher?.toLowerCase().includes(params.teacher_name!.toLowerCase()));
      }

      return slots.filter((s) => s.is_active !== false);
    },
    getTeacherTodayTimetable: async (teacherIdentifier?: string, dateStr?: string) => {
      const today = dateStr || new Date().toISOString().split("T")[0];
      const targetDate = new Date(today + "T00:00:00");
      let dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat

      if (dayOfWeek === 0) {
        return []; // Sunday - clear empty state
      }

      const cleanTeacher = (teacherIdentifier || "Ateef").toLowerCase().trim();
      const allSlots = getStoredCustomTimetable();
      const daySlots: any[] = allSlots[dayOfWeek] || [];

      // Filter periods strictly assigned to logged in teacher
      const teacherSlots = daySlots.filter((slot) => {
        if (slot.is_active === false) return false;
        const sTeacher = (slot.teacher || "").toLowerCase();
        const sTeacherId = String(slot.teacher_id || "").toLowerCase();
        if (sTeacher === cleanTeacher || sTeacherId === cleanTeacher) return true;
        if (cleanTeacher === "ateef" && (sTeacher.includes("ateef") || sTeacher.includes("fatima"))) return true;
        return false;
      });

      // Sort chronologically by period number
      teacherSlots.sort((a, b) => a.period - b.period);

      // Check attendance status for each period
      const enrichedSlots = await Promise.all(
        teacherSlots.map(async (slot) => {
          let attendance_status: "Not Started" | "Completed" = "Not Started";
          try {
            const sess = await api.attendance.getSession({
              section_id: slot.section_id,
              session_date: today,
              period_number: slot.period,
            });
            if (sess && sess.session_id && Object.keys(sess.records || {}).length > 0) {
              attendance_status = "Completed";
            }
          } catch {}

          return {
            ...slot,
            attendance_status,
          };
        })
      );

      return enrichedSlots;
    },
    allotSlot: async (slot: {
      id?: string | number;
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
      // Conflict check
      const conflict = checkTimetableConflicts(slot);
      if (conflict.hasConflict) {
        throw new ApiError(conflict.reason || "Timetable assignment conflict detected.", 400);
      }

      saveCustomTimetableSlot(slot);

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.timetable.createSlot(slot);
        } catch (e: any) {
          console.warn("Supabase timetable allot warning:", e.message);
        }
      }

      return {
        success: true,
        message: `Period ${slot.period} allotted to ${slot.teacher} successfully.`,
      };
    },
    deleteSlot: async (slotId: string | number, day: number) => {
      deleteCustomTimetableSlot(slotId, day);
      if (isSupabaseConfigured()) {
        try {
          await supabaseService.timetable.deleteSlot(slotId);
        } catch {}
      }
      return { success: true, message: "Timetable period deactivated successfully." };
    },
  },

  // --------------------------------------------------------------------------
  // EXPENSES MANAGEMENT
  // --------------------------------------------------------------------------
  expenses: {
    list: async (filters: {
      category?: string;
      from_date?: string;
      to_date?: string;
      search?: string;
    } = {}): Promise<ExpenseItem[]> => {
      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.expenses.list(filters);
          if (remote.length > 0) return remote;
        } catch (e) {
          console.warn("Supabase expenses list fallback:", e);
        }
      }

      let list = getStoredCustomExpenses().filter((e) => e.is_active !== false);

      if (filters.category && filters.category !== "all") {
        list = list.filter((e) => e.category === filters.category);
      }
      if (filters.from_date) {
        list = list.filter((e) => e.expense_date >= filters.from_date!);
      }
      if (filters.to_date) {
        list = list.filter((e) => e.expense_date <= filters.to_date!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (e) =>
            e.description.toLowerCase().includes(q) ||
            (e.reference_number && e.reference_number.toLowerCase().includes(q)) ||
            e.category.toLowerCase().includes(q)
        );
      }

      return list.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
    },

    create: async (data: {
      expense_date: string;
      category: ExpenseCategory;
      description: string;
      amount: number;
      payment_method?: string;
      reference_number?: string;
      notes?: string;
    }): Promise<ExpenseItem> => {
      if (data.amount <= 0) {
        throw new ApiError("Expense amount must be greater than zero.", 400);
      }
      if (!data.description?.trim()) {
        throw new ApiError("Expense description is required.", 400);
      }

      const newExpense: ExpenseItem = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        expense_date: data.expense_date || new Date().toISOString().slice(0, 10),
        category: data.category,
        description: data.description.trim(),
        amount: Number(data.amount),
        payment_method: data.payment_method || "Cash",
        reference_number: data.reference_number?.trim() || null,
        notes: data.notes?.trim() || null,
        recorded_by_name: "STA Khadri",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.expenses.create(data);
          saveCustomExpense(remote);
          return remote;
        } catch (err) {
          console.warn("Supabase create expense fallback to local:", err);
        }
      }

      saveCustomExpense(newExpense);
      return newExpense;
    },

    update: async (id: string, data: Partial<ExpenseItem>): Promise<ExpenseItem> => {
      if (data.amount !== undefined && data.amount <= 0) {
        throw new ApiError("Expense amount must be greater than zero.", 400);
      }

      if (isSupabaseConfigured() && id.length === 36) {
        try {
          const remote = await supabaseService.expenses.update(id, data);
          saveCustomExpense(remote);
          return remote;
        } catch (err) {
          console.warn("Supabase update expense fallback to local:", err);
        }
      }

      const updated = updateCustomExpense(id, data);
      if (!updated) throw new ApiError("Expense record not found.", 404);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured() && id.length === 36) {
        try {
          await supabaseService.expenses.delete(id);
        } catch (err) {
          console.warn("Supabase delete expense fallback to local:", err);
        }
      }
      return deleteCustomExpense(id);
    },

    getStats: async (filters: { from_date?: string; to_date?: string } = {}): Promise<ExpenseStats> => {
      if (isSupabaseConfigured()) {
        try {
          const remoteStats = await supabaseService.expenses.getStats(filters);
          if (remoteStats.total_count > 0) return remoteStats;
        } catch (err) {
          console.warn("Supabase expense stats fallback:", err);
        }
      }

      let list = getStoredCustomExpenses().filter((e) => e.is_active !== false);
      if (filters.from_date) list = list.filter((e) => e.expense_date >= filters.from_date!);
      if (filters.to_date) list = list.filter((e) => e.expense_date <= filters.to_date!);

      const currentMonthPrefix = new Date().toISOString().slice(0, 7);
      let total_expenses = 0;
      let current_month_expenses = 0;
      const category_breakdown: Record<string, number> = {
        "Staff Salaries": 0,
        "Aaya’s Salaries": 0,
        "Building Rent": 0,
        "Electricity Bill": 0,
        "Drinking Water Expenses": 0,
        "Usable Water Expenses": 0,
        "Other Expenses": 0,
      };

      list.forEach((e) => {
        const amt = Number(e.amount) || 0;
        total_expenses += amt;
        if (e.expense_date && e.expense_date.startsWith(currentMonthPrefix)) {
          current_month_expenses += amt;
        }
        category_breakdown[e.category] = (category_breakdown[e.category] || 0) + amt;
      });

      return {
        total_expenses,
        current_month_expenses,
        category_breakdown,
        total_count: list.length,
      };
    },
  },

  // --------------------------------------------------------------------------
  // FEES & FINANCIAL SUMMARY
  // --------------------------------------------------------------------------
  fees: {
    getFinancialSummary: async (): Promise<FeeFinancialSummary> => {
      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.fees.getFinancialSummary();
          if (remote.total_applicable_fees > 0) return remote;
        } catch (e) {
          console.warn("Supabase fee summary fallback:", e);
        }
      }

      const invoices = getStoredInvoices();
      const payments = getStoredPayments();

      // Calculation:
      // Total Fees Collected = Sum of successfully recorded payments (completed/paid)
      const validPayments = payments.filter(
        (p) => !p.status || p.status === "completed" || p.status === "paid" || p.status === "success"
      );
      const total_collected_fees = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Total Applicable Fees = Sum of active invoices
      const total_applicable_fees = invoices
        .filter((i) => i.status !== "cancelled")
        .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

      // Remaining Fees = Total Applicable Fees - Total Fees Collected
      const total_remaining_fees = Math.max(0, total_applicable_fees - total_collected_fees);
      const collection_rate = total_applicable_fees > 0
        ? Math.round((total_collected_fees / total_applicable_fees) * 10000) / 100
        : 0;

      return {
        total_applicable_fees,
        total_collected_fees,
        total_remaining_fees,
        collection_rate,
        completed_payments_count: validPayments.length,
      };
    },

    getStats: async () => {
      const summary = await api.fees.getFinancialSummary();
      return {
        total_billed: summary.total_applicable_fees,
        total_collected: summary.total_collected_fees,
        outstanding: summary.total_remaining_fees,
        collection_rate: summary.collection_rate,
      };
    },

    getCategories: async () => {
      return [
        { id: 1, name: "Tuition Fee", description: "Term-wise Telangana SSC academic tuition" },
        { id: 2, name: "Computer Lab Fee", description: "Digital classroom & practical IT fee" },
        { id: 3, name: "Annual Sports & Library Fee", description: "Sports kit & reference library" },
      ];
    },

    createCategory: async (data: { name: string; description?: string }) => {
      return { id: Date.now(), ...data };
    },

    getInvoices: async (params: { student_id?: number | string; status?: string } = {}) => {
      if (isSupabaseConfigured()) {
        try {
          const remote = await supabaseService.fees.getInvoices(params);
          if (remote.length > 0) return remote;
        } catch (e) {
          console.warn("Supabase invoices fallback:", e);
        }
      }

      let invoices = getStoredInvoices();
      if (params.student_id) {
        invoices = invoices.filter((i) => String(i.student_id) === String(params.student_id));
      }
      if (params.status && params.status !== "all") {
        invoices = invoices.filter((i) => i.status === params.status);
      }
      return invoices;
    },

    createInvoice: async (data: {
      student_id: number;
      academic_year_id: number;
      invoice_number: string;
      total_amount: number;
      due_date: string;
    }) => {
      const invoices = getStoredInvoices();
      const newInv = {
        id: Date.now(),
        invoice_number: data.invoice_number,
        student_id: data.student_id,
        student_name: "Student",
        admission_number: `DMHS-${Date.now().toString().slice(-4)}`,
        total_amount: Number(data.total_amount),
        paid_amount: 0,
        balance: Number(data.total_amount),
        status: "pending",
        due_date: data.due_date,
        created_at: new Date().toISOString().slice(0, 10),
      };
      invoices.unshift(newInv);
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
      return newInv;
    },

    recordPayment: async (data: {
      invoice_id: number | string;
      student_id: number | string;
      receipt_number: string;
      amount: number;
      payment_mode: string;
      transaction_reference?: string;
    }) => {
      if (data.amount <= 0) {
        throw new ApiError("Payment amount must be greater than zero.", 400);
      }

      const paymentRecord = {
        id: Date.now(),
        invoice_id: data.invoice_id,
        student_id: data.student_id,
        receipt_number: data.receipt_number || `REC-${Date.now().toString().slice(-6)}`,
        amount: Number(data.amount),
        payment_mode: data.payment_mode || "Cash",
        transaction_reference: data.transaction_reference || null,
        status: "completed",
        payment_date: new Date().toISOString().slice(0, 10),
      };

      if (isSupabaseConfigured()) {
        try {
          await supabaseService.fees.recordPayment({
            invoice_id: data.invoice_id,
            student_id: data.student_id,
            receipt_number: paymentRecord.receipt_number,
            amount: paymentRecord.amount,
            payment_mode: paymentRecord.payment_mode,
            transaction_reference: data.transaction_reference,
          });
        } catch (e) {
          console.warn("Supabase record payment fallback:", e);
        }
      }

      saveCustomPayment(paymentRecord);
      return { success: true, payment: paymentRecord };
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

  admin: {
    resetData: async (): Promise<{ success: boolean; message: string }> => {
      assertAdminRole();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("dmhs_custom_students");
        localStorage.removeItem("dmhs_custom_teachers");
        localStorage.removeItem("dmhs_custom_users");
        localStorage.removeItem("dmhs_attendance_sessions");
        localStorage.removeItem("dmhs_custom_expenses");
        localStorage.removeItem("dmhs_teacher_password_tch_ateef");
        localStorage.removeItem("dmhs_student_password_std_ali");
      }
      return {
        success: true,
        message: "School operational data has been successfully reset to fresh default state.",
      };
    },
  },
};
