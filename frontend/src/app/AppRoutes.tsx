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
import { ComingSoonPage } from "../pages/common/ComingSoonPage";
import { AccessDeniedPage } from "../pages/common/AccessDeniedPage";
import { NotFoundPage } from "../pages/common/NotFoundPage";

const RootRedirect: React.FC = () => {
  const { session, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="w-10 h-10 border-3 border-brand-gold border-t-transparent rounded-full animate-spin" />
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
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={["TEACHER", "ADMIN"]}>
              <TeacherProfilePage />
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
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StudentProfilePage />
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
