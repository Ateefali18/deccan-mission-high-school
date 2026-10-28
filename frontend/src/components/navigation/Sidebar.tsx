import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  Calendar,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  Award,
  Clock,
  CreditCard,
  FolderLock,
  FileText,
  Bell,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  School,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Badge } from "../ui/Badge";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  phase?: "active" | "Phase 2" | "Phase 3";
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { session } = useAuth();
  const role = session?.role || "STUDENT";

  const getNavItems = (): NavItem[] => {
    if (role === "ADMIN") {
      return [
        { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, phase: "active" },
        { label: "Students", path: "/admin/students", icon: <GraduationCap className="w-4 h-4" />, phase: "active" },
        { label: "Teachers & Staff", path: "/admin/teachers", icon: <Users className="w-4 h-4" />, phase: "active" },
        { label: "Classes & Sections", path: "/admin/classes", icon: <Layers className="w-4 h-4" />, phase: "active" },
        { label: "Academic Years", path: "/admin/academic-years", icon: <Calendar className="w-4 h-4" />, phase: "active" },
        { label: "Subjects", path: "/coming-soon?module=Subjects&phase=2", icon: <BookOpen className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Attendance", path: "/coming-soon?module=Attendance&phase=2", icon: <CalendarCheck className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Examinations", path: "/coming-soon?module=Examinations&phase=2", icon: <Award className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Marks & Results", path: "/coming-soon?module=Marks+%26+Results&phase=2", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Timetable", path: "/coming-soon?module=Timetable&phase=2", icon: <Clock className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Fees & Payments", path: "/coming-soon?module=Fees+%26+Payments&phase=2", icon: <CreditCard className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Student Documents", path: "/coming-soon?module=Student+Documents&phase=2", icon: <FolderLock className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Assignments", path: "/coming-soon?module=Assignments&phase=2", icon: <FileText className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Notices & Circulars", path: "/coming-soon?module=Notices+%26+Circulars&phase=2", icon: <Bell className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Reports & Analytics", path: "/coming-soon?module=Reports+%26+Analytics&phase=2", icon: <BarChart3 className="w-4 h-4" />, phase: "Phase 2" },
        { label: "AI Assistant", path: "/coming-soon?module=AI+School+Assistant&phase=3", icon: <Sparkles className="w-4 h-4" />, phase: "Phase 3" },
        { label: "Settings", path: "/coming-soon?module=System+Settings&phase=2", icon: <Settings className="w-4 h-4" />, phase: "Phase 2" },
      ];
    }

    if (role === "TEACHER") {
      return [
        { label: "Faculty Dashboard", path: "/teacher/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, phase: "active" },
        { label: "My Students", path: "/teacher/my-students", icon: <GraduationCap className="w-4 h-4" />, phase: "active" },
        { label: "My Profile", path: "/teacher/profile", icon: <Users className="w-4 h-4" />, phase: "active" },
        { label: "Mark Attendance", path: "/coming-soon?module=Mark+Attendance&phase=2", icon: <CalendarCheck className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Enter Marks", path: "/coming-soon?module=Enter+Marks&phase=2", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Assignments", path: "/coming-soon?module=Teacher+Assignments&phase=2", icon: <FileText className="w-4 h-4" />, phase: "Phase 2" },
        { label: "My Schedule", path: "/coming-soon?module=My+Schedule&phase=2", icon: <Clock className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Examinations", path: "/coming-soon?module=Examinations&phase=2", icon: <Award className="w-4 h-4" />, phase: "Phase 2" },
        { label: "Notices", path: "/coming-soon?module=Notices&phase=2", icon: <Bell className="w-4 h-4" />, phase: "Phase 2" },
        { label: "AI Assistant", path: "/coming-soon?module=AI+Faculty+Assistant&phase=3", icon: <Sparkles className="w-4 h-4" />, phase: "Phase 3" },
      ];
    }

    // STUDENT
    return [
      { label: "Student Dashboard", path: "/student/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, phase: "active" },
      { label: "My Profile", path: "/student/profile", icon: <GraduationCap className="w-4 h-4" />, phase: "active" },
      { label: "My Attendance", path: "/coming-soon?module=My+Attendance&phase=2", icon: <CalendarCheck className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Marks & Results", path: "/coming-soon?module=My+Marks+%26+Results&phase=2", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Timetable", path: "/coming-soon?module=My+Timetable&phase=2", icon: <Clock className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Examinations", path: "/coming-soon?module=My+Examinations&phase=2", icon: <Award className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Assignments", path: "/coming-soon?module=My+Assignments&phase=2", icon: <FileText className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Fees", path: "/coming-soon?module=My+Fees&phase=2", icon: <CreditCard className="w-4 h-4" />, phase: "Phase 2" },
      { label: "My Documents", path: "/coming-soon?module=My+Documents&phase=2", icon: <FolderLock className="w-4 h-4" />, phase: "Phase 2" },
      { label: "Notices", path: "/coming-soon?module=Student+Notices&phase=2", icon: <Bell className="w-4 h-4" />, phase: "Phase 2" },
      { label: "AI Assistant", path: "/coming-soon?module=Student+AI+Tutor&phase=3", icon: <Sparkles className="w-4 h-4" />, phase: "Phase 3" },
    ];
  };

  const navItems = getNavItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-midnight text-dark-primary border-r border-dark-border select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold font-bold shrink-0">
            <School className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-black tracking-widest text-brand-gold uppercase truncate">
                DECCAN MISSION
              </h1>
              <p className="text-[10px] text-dark-secondary font-medium tracking-wider truncate">
                HIGH SCHOOL • HYD
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-dark-secondary hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isPhaseActive = item.phase === "active";
          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => onCloseMobile()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive && isPhaseActive
                    ? "bg-brand-gold text-brand-midnight font-bold shadow-md shadow-brand-gold/10"
                    : "text-dark-secondary hover:text-dark-primary hover:bg-brand-elevated"
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.phase && item.phase !== "active" && (
                <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-dark-elevated text-dark-secondary border border-dark-border/80">
                  {item.phase}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Desktop Collapse Toggle */}
      <div className="hidden md:flex items-center justify-between p-3 border-t border-dark-border/80">
        {!isCollapsed && (
          <div className="text-[11px] text-dark-secondary truncate font-mono">
            ERP Phase 1 Foundation
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-dark-secondary hover:text-white hover:bg-brand-elevated transition-colors ml-auto"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 h-screen sticky top-0 z-30 shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
