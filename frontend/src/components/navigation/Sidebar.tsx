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
  Receipt,
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
        { label: "Attendance Register", path: "/admin/attendance", icon: <CalendarCheck className="w-4 h-4" />, phase: "active" },
        { label: "Examinations", path: "/admin/marks", icon: <Award className="w-4 h-4" />, phase: "active" },
        { label: "Marks & Results", path: "/admin/marks", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "active" },
        { label: "Timetable", path: "/admin/timetable", icon: <Clock className="w-4 h-4" />, phase: "active" },
        { label: "Student Documents", path: "/admin/students", icon: <FolderLock className="w-4 h-4" />, phase: "active" },
        { label: "Notices & Circulars", path: "/admin/notices", icon: <Bell className="w-4 h-4" />, phase: "active" },
        { label: "AI Assistant", path: "/admin/ai-assistant", icon: <Sparkles className="w-4 h-4" />, phase: "active" },
        { label: "Subjects", path: "/admin/subjects", icon: <BookOpen className="w-4 h-4" />, phase: "active" },
        { label: "Fees & Payments", path: "/admin/fees", icon: <CreditCard className="w-4 h-4" />, phase: "active" },
        { label: "Expenses", path: "/admin/expenses", icon: <Receipt className="w-4 h-4" />, phase: "active" },
        { label: "Assignments", path: "/admin/assignments", icon: <FileText className="w-4 h-4" />, phase: "active" },
        { label: "Reports & Analytics", path: "/admin/reports", icon: <BarChart3 className="w-4 h-4" />, phase: "active" },
        { label: "Settings", path: "/admin/settings", icon: <Settings className="w-4 h-4" />, phase: "active" },
      ];
    }

    if (role === "TEACHER") {
      return [
        { label: "Faculty Dashboard", path: "/teacher/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, phase: "active" },
        { label: "My Students", path: "/teacher/my-students", icon: <GraduationCap className="w-4 h-4" />, phase: "active" },
        { label: "My Profile", path: "/teacher/profile", icon: <Users className="w-4 h-4" />, phase: "active" },
        { label: "Daily Attendance", path: "/teacher/attendance", icon: <CalendarCheck className="w-4 h-4" />, phase: "active" },
        { label: "Enter Marks", path: "/teacher/marks", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "active" },
        { label: "My Schedule", path: "/teacher/timetable", icon: <Clock className="w-4 h-4" />, phase: "active" },
        { label: "Examinations", path: "/teacher/marks", icon: <Award className="w-4 h-4" />, phase: "active" },
        { label: "Notices", path: "/teacher/notices", icon: <Bell className="w-4 h-4" />, phase: "active" },
        { label: "AI Assistant", path: "/teacher/ai-assistant", icon: <Sparkles className="w-4 h-4" />, phase: "active" },
        { label: "Assignments", path: "/teacher/assignments", icon: <FileText className="w-4 h-4" />, phase: "active" },
      ];
    }

    // STUDENT
    return [
      { label: "Student Dashboard", path: "/student/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, phase: "active" },
      { label: "My Profile", path: "/student/profile", icon: <GraduationCap className="w-4 h-4" />, phase: "active" },
      { label: "My Attendance", path: "/student/attendance", icon: <CalendarCheck className="w-4 h-4" />, phase: "active" },
      { label: "My Marks & Results", path: "/student/marks", icon: <FileSpreadsheet className="w-4 h-4" />, phase: "active" },
      { label: "My Timetable", path: "/student/timetable", icon: <Clock className="w-4 h-4" />, phase: "active" },
      { label: "My Examinations", path: "/student/marks", icon: <Award className="w-4 h-4" />, phase: "active" },
      { label: "Notices", path: "/student/notices", icon: <Bell className="w-4 h-4" />, phase: "active" },
      { label: "AI Assistant", path: "/student/ai-assistant", icon: <Sparkles className="w-4 h-4" />, phase: "active" },
      { label: "My Documents", path: "/student/profile", icon: <FolderLock className="w-4 h-4" />, phase: "active" },
      { label: "My Fees", path: "/student/fees", icon: <CreditCard className="w-4 h-4" />, phase: "active" },
      { label: "My Assignments", path: "/student/assignments", icon: <FileText className="w-4 h-4" />, phase: "active" },
    ];
  };

  const navItems = getNavItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#142B4A] dark:bg-[#0B1730] text-white border-r border-[#1E3A5F] dark:border-dark-border select-none transition-colors">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F] dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white p-0.5 border border-brand-blue/30 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img src="/dmhs-logo-128.png" alt="DMHS Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold tracking-wider text-white uppercase truncate">
                DECCAN MISSION
              </h1>
              <p className="text-[10px] text-blue-200/80 font-medium tracking-wider truncate">
                HIGH SCHOOL • HYD
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close sidebar"
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
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                  isActive && isPhaseActive
                    ? "bg-brand-blue text-white font-semibold shadow-sm"
                    : "text-slate-200 hover:text-white hover:bg-[#1E3A5F] dark:hover:bg-[#17243A]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 ${isActive && isPhaseActive ? "text-white" : "text-blue-200/70"}`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.phase && item.phase !== "active" && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-black/20 text-slate-300 border border-white/10">
                      {item.phase}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Desktop Collapse Toggle */}
      <div className="hidden md:flex items-center justify-between p-3 border-t border-[#1E3A5F] dark:border-dark-border">
        {!isCollapsed && (
          <div className="text-[11px] text-blue-200/80 truncate font-mono">
            TS-HYD-SSC-41092
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors ml-auto"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
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
