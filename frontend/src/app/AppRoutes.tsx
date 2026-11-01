import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { AppShell } from "../layouts/AppShell";
import { ProtectedRoute } from "../components/shared/ProtectedRoute";

// Pages
import { LoginPage } from "../pages/auth/LoginPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { StudentsPage } from "../pages/admin/StudentsPage";
import { TeachersPage } from "../pages/admin/TeachersPage";
import { ClassesPage } from "../pages/admin/ClassesPage";
import { AcademicYearsPage } from "../pages/admin/AcademicYearsPage";
import { TeacherDashboardPage } from "../pages/teacher/TeacherDashboardPage";
import { MyStudentsPage } from "../pages/teacher/MyStudentsPage";
import { TeacherProfilePage } from "../pages/teacher/TeacherProfilePage";
import { StudentDashboardPage } from "../pages/student/StudentDashboardPage";
import { StudentProfilePage } from "../pages/student/StudentProfilePage";
import { AttendancePage } from "../pages/attendance/AttendancePage";
import { StudentAttendancePage } from "../pages/student/StudentAttendancePage";
import { MarksPage } from "../pages/marks/MarksPage";
import { StudentResultsPage } from "../pages/student/StudentResultsPage";
import { AIAssistantPage } from "../pages/ai/AIAssistantPage";
import { NoticesPage } from "../pages/notices/NoticesPage";
import { TimetablePage } from "../pages/timetable/TimetablePage";
import { SubjectsPage } from "../pages/admin/SubjectsPage";
import { FeesPage } from "../pages/fees/FeesPage";
import { AssignmentsPage } from "../pages/assignments/AssignmentsPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { ComingSoonPage } from "../pages/common/ComingSoonPage";
import { AccessDeniedPage } from "../pages/common/AccessDeniedPage";
import { NotFoundPage } from "../pages/common/NotFoundPage";

const RootRedirect: React.FC = () => {
  const { session, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (session.role === "TEACHER") {
    return <Navigate to="/teacher/dashboard" replace />;
  } else {
    return <Navigate to="/student/dashboard" replace />;
  }
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirector */}
      <Route path="/" element={<RootRedirect />} />

      {/* Main Authenticated Application Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Admin Portal */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <TeachersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/academic-years"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AcademicYearsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/marks"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MarksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notices"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <NoticesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/timetable"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <TimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <SubjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fees"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <FeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Teacher Portal */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/my-students"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <MyStudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/marks"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <MarksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <TeacherProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/notices"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <NoticesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/timetable"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <TimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/assignments"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Portal */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/marks"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StudentResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notices"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <NoticesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/timetable"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <TimetablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/fees"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <FeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />

        {/* Common Modules */}
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
