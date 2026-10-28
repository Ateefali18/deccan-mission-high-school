export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export type ThemeMode = "light" | "dark" | "system";

export interface User {
  id: number | string;
  school_id: number | string;
  username: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  is_active: boolean;
  roles: UserRole[];
  last_login_at?: string | null;
}

export interface CurrentUserSession {
  user: User;
  role: UserRole;
  school_name: string;
  school_code: string;
  profile_id?: number | string | null;
  identifier?: string | null;
}

export interface AcademicYear {
  id: number | string;
  school_id: number | string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
}

export interface Section {
  id: number | string;
  class_id: number | string;
  name: string;
  room_number?: string | null;
  capacity: number;
  is_active: boolean;
}

export interface SchoolClass {
  id: number | string;
  school_id: number | string;
  name: string;
  grade_level: number;
  stream?: string | null;
  is_active: boolean;
  sections: Section[];
}

export interface StudentListItem {
  id: number | string;
  admission_number: string;
  full_name: string;
  email: string;
  class_name?: string | null;
  section_name?: string | null;
  roll_number?: string | null;
  student_status: string;
  photo_url?: string | null;
}

export interface StudentProfile {
  id: number | string;
  user_id?: number | string;
  admission_number: string;
  full_name: string;
  email: string;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  student_status: string;
  is_active: boolean;
  photo_url?: string | null;
  current_enrollment?: {
    id: number | string;
    academic_year_name: string;
    class_name: string;
    section_name: string;
    roll_number?: string | null;
    enrollment_status: string;
  } | null;
}

export interface TeacherListItem {
  id: number | string;
  employee_id: string;
  full_name: string;
  email: string;
  designation: string;
  department?: string | null;
  qualification?: string | null;
  contact_phone?: string | null;
  employment_status: string;
  assigned_classes_count: number;
  is_active?: boolean;
}

export interface TeacherAssignment {
  id: number | string;
  academic_year_name: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  role_type: string;
}

export interface TeacherProfile {
  id: number | string;
  user_id?: number | string;
  employee_id: string;
  full_name: string;
  email: string;
  designation: string;
  department?: string | null;
  qualification?: string | null;
  joining_date?: string | null;
  employment_status: string;
  is_active: boolean;
  photo_url?: string | null;
  contact_phone?: string | null;
  assignments: TeacherAssignment[];
}

export interface AdminDashboardStats {
  total_active_students: number;
  total_active_teachers: number;
  total_classes: number;
  total_sections: number;
  current_academic_year?: string | null;
  current_academic_year_id?: number | string | null;
  recent_activity: {
    id: number | string;
    action: string;
    resource_type?: string | null;
    details?: string | null;
    created_at: string;
    user_name?: string | null;
  }[];
  upcoming_features: string[];
}

export interface TeacherDashboardStats {
  teacher_name: string;
  employee_id: string;
  designation: string;
  department?: string | null;
  current_academic_year?: string | null;
  total_assigned_classes: number;
  total_authorized_students: number;
  assigned_subjects: string[];
  assignments: {
    id: number | string;
    class_name: string;
    section_name: string;
    subject: string;
    role_type: string;
  }[];
  today_schedule_placeholder: string;
}

export interface StudentDashboardStats {
  student_name: string;
  admission_number: string;
  roll_number?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  current_academic_year?: string | null;
  status: string;
  guardian_name?: string | null;
  today_schedule_placeholder: string;
}

export interface SearchResultItem {
  id: number | string;
  type: "student" | "teacher";
  identifier: string;
  title: string;
  subtitle: string;
  metadata?: Record<string, any>;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  priority: string;
  publish_date: string;
  is_published: boolean;
}

export interface DocumentItem {
  id: string;
  student_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  created_at: string;
}
