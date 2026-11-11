import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Power,
  Sun,
  Sunset,
  UserCheck,
  Check,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { TeacherDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

export const TeacherDashboardPage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [nextPeriodInfo, setNextPeriodInfo] = useState<{
    status: string;
    message: string;
    current_period?: any;
    next_period?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Today's Timetable State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [todayPeriods, setTodayPeriods] = useState<any[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);

  // Faculty Duty & Live Attendance State (Phase 5)
  const [facultyProfile, setFacultyProfile] = useState<{
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    designation?: string;
  } | null>(null);
  const [dutyStatus, setDutyStatus] = useState<{
    status: string; // 'present' | 'not_marked'
    duty_status: string; // 'active' | 'inactive' | 'off_duty'
    arrival_time: string | null;
    departure_time: string | null;
  } | null>(null);
  const [isUpdatingDuty, setIsUpdatingDuty] = useState(false);
  const [assignedClassTeacherInfo, setAssignedClassTeacherInfo] = useState<{
    class_id: string;
    class_name: string;
  } | null>(null);

  const teacherName = session?.user?.full_name || session?.user?.username || "Ateef";

  const fetchDutyAndAssignment = useCallback(async () => {
    try {
      // 1. Resolve current teacher profile
      const teachersList = await api.teachers.list();
      const currentEmail = (session?.user?.email || "").toLowerCase();
      const currentUsername = (session?.user?.username || "").toLowerCase();
      const currentEmpId = (session?.user?.employee_id || "").toLowerCase();
      const currentTeacherId = session?.user?.teacher_id || session?.user?.id;

      const matched = teachersList.find((t: any) => {
        if (currentTeacherId && String(t.id) === String(currentTeacherId)) return true;
        if (currentEmpId && t.employee_id?.toLowerCase() === currentEmpId) return true;
        if (currentEmail && t.email?.toLowerCase() === currentEmail) return true;
        if (currentUsername && (t.employee_id?.toLowerCase() === currentUsername || t.full_name?.toLowerCase().includes(currentUsername))) return true;
        return false;
      }) || (teachersList.length > 0 ? teachersList[0] : null);

      if (matched) {
        setFacultyProfile(matched);

        // 2. Fetch duty status for today
        const statusData = await api.teacherAttendance.getDutyStatus(matched.id, selectedDate);
        setDutyStatus(statusData);

        // 3. Fetch active class teacher assignment
        const allAssignments = await api.classTeachers.list();
        const activeAssignment = allAssignments.find((a: any) => a.teacher_id === matched.id);
        if (activeAssignment) {
          setAssignedClassTeacherInfo({
            class_id: activeAssignment.class_id,
            class_name: activeAssignment.classes?.name || "Assigned Class",
          });
        } else {
          setAssignedClassTeacherInfo(null);
        }
      }
    } catch (e) {
      console.warn("Could not fetch faculty duty status:", e);
    }
  }, [session, selectedDate]);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dash, timetable] = await Promise.all([
        api.dashboards.getTeacher(),
        api.timetable.getNextPeriod().catch(() => null),
      ]);
      setStats(dash);
      if (timetable) setNextPeriodInfo(timetable);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTimetablePeriods = useCallback(async () => {
    setIsLoadingPeriods(true);
    try {
      const periods = await api.timetable.getTeacherTodayTimetable(teacherName, selectedDate);
      setTodayPeriods(periods);
    } catch {
      setTodayPeriods([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  }, [teacherName, selectedDate]);

  useEffect(() => {
    fetchDashboard();
    fetchDutyAndAssignment();
  }, [fetchDashboard, fetchDutyAndAssignment]);

  useEffect(() => {
    fetchTimetablePeriods();
  }, [fetchTimetablePeriods]);

  // Real-time synchronization
  useRealtimeSync({
    tables: [
      "teacher_attendance",
      "class_teacher_assignments",
      "student_attendance",
      "attendance_records",
      "timetable_entries",
      "notices",
    ],
    onSync: () => {
      fetchDashboard();
      fetchTimetablePeriods();
      fetchDutyAndAssignment();
    },
  });

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "--:--";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Phase 5: Toggle Active / Inactive Duty Handler
  const handleToggleDuty = async (targetDuty: "active" | "inactive") => {
    if (!facultyProfile?.id) {
      toast.error("Faculty profile could not be identified. Please re-login.");
      return;
    }

    setIsUpdatingDuty(true);
    try {
      const result = await api.teacherAttendance.markDuty(facultyProfile.id, targetDuty);
      if (result.success) {
        if (targetDuty === "active") {
          toast.success("Duty marked ACTIVE. Attendance successfully saved as Present in Supabase.");
        } else {
          toast.info("Duty marked INACTIVE. Departure timestamp saved.");
        }
        await fetchDutyAndAssignment();
      } else {
        toast.error(result.message || "Failed to update duty status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to communicate with attendance server.");
    } finally {
      setIsUpdatingDuty(false);
    }
  };

  const handlePeriodClick = (slot: any) => {
    const params = new URLSearchParams({
      class_id: String(slot.class_id || "cls_10"),
      section_id: String(slot.section_id || "sec_10_a"),
      subject_id: String(slot.subject_id || "sub_math"),
      period: String(slot.period),
      date: selectedDate,
      class_name: slot.class_name || "Class 10",
      section_name: slot.section_name || "A",
      subject_name: slot.subject || "Mathematics",
      teacher_name: slot.teacher || teacherName,
    });
    navigate(`/teacher/attendance?${params.toString()}`);
  };

  const isDutyActive = dutyStatus?.duty_status === "active";
  const isDutyInactive = dutyStatus?.duty_status === "inactive";
  const isPresent = Boolean(dutyStatus?.status === "present" || isDutyActive || isDutyInactive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Academic Portal"
        subtitle={`Welcome, ${facultyProfile?.full_name || teacherName} • Employee ID: ${facultyProfile?.employee_id || "Faculty"} (DMHS SSC Board)`}
        action={
          <div className="flex items-center gap-2">
            <Link to="/teacher/attendance">
              <Button variant="primary" size="sm" leftIcon={<CalendarCheck className="w-4 h-4" />}>
                Record Attendance
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* PHASE 5: PROMINENT FACULTY DUTY & LIVE ATTENDANCE DASHBOARD CARD */}
      {/* ========================================================================= */}
      <Card className="p-6 border-2 border-brand-blue/30 dark:border-dark-border bg-gradient-to-br from-white via-blue-50/20 to-emerald-50/20 dark:from-dark-card dark:via-dark-card dark:to-dark-elevated shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Faculty Attendance Status Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-brand-blue text-white shadow-sm">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-light-primary dark:text-dark-primary uppercase tracking-wide">
                    Live Duty Status & Teacher Attendance
                  </h3>
                  {isDutyActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      ACTIVE • PRESENT
                    </span>
                  ) : isDutyInactive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      DUTY CONCLUDED • PRESENT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                      NOT ARRIVED / OFF DUTY
                    </span>
                  )}
                </div>
                <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
                  Synchronized with Supabase in real time • Secure database timestamp
                </p>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Faculty Name
                </p>
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary truncate mt-0.5">
                  {facultyProfile?.full_name || teacherName}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Employee ID
                </p>
                <p className="text-xs font-mono font-bold text-brand-blue dark:text-dark-accent mt-0.5">
                  {facultyProfile?.employee_id || "DMHS-TCH"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Arrival Time
                </p>
                <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {dutyStatus?.arrival_time ? formatTime(dutyStatus.arrival_time) : "Not Arrived"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Departure Time
                </p>
                <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {dutyStatus?.departure_time
                    ? formatTime(dutyStatus.departure_time)
                    : isDutyActive
                    ? "On Duty"
                    : "--:--"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button: ACTIVE / INACTIVE TOGGLE */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 justify-center">
            {isDutyActive ? (
              <Button
                variant="outline"
                size="lg"
                disabled={isUpdatingDuty}
                leftIcon={<Power className="w-5 h-5 text-rose-500" />}
                onClick={() => handleToggleDuty("inactive")}
                className="border-rose-400 hover:bg-rose-50 text-rose-700 dark:hover:bg-rose-950/30 dark:text-rose-400 font-bold px-6 py-4 shadow-sm"
              >
                {isUpdatingDuty ? "Saving Departure..." : "END DUTY (MARK INACTIVE)"}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={isUpdatingDuty}
                leftIcon={<Check className="w-5 h-5 text-white" />}
                onClick={() => handleToggleDuty("active")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-4 shadow-lg shadow-emerald-500/20 text-sm tracking-wide"
              >
                {isUpdatingDuty ? "Recording Attendance..." : "START DUTY (MARK ACTIVE)"}
              </Button>
            )}

            <p className="text-[11px] text-center text-light-secondary dark:text-dark-secondary">
              {isPresent
                ? "Attendance marked Present in Supabase"
                : "Click Active to record today's attendance"}
            </p>
          </div>
        </div>

        {/* Class Teacher Dedicated In-Charge Panel */}
        {assignedClassTeacherInfo ? (
          <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-blue/5 dark:bg-brand-blue/10 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-brand-navy text-brand-gold">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-light-primary dark:text-dark-primary">
                  Designated Class Teacher: <span className="text-brand-blue dark:text-dark-accent">{assignedClassTeacherInfo.class_name}</span>
                </p>
                <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                  You are authorized to submit Morning & Afternoon session attendance for this class.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/teacher/attendance?class_id=${assignedClassTeacherInfo.class_id}&session=morning&date=${selectedDate}`}
              >
                <Button variant="outline" size="sm" leftIcon={<Sun className="w-3.5 h-3.5 text-amber-500" />}>
                  Morning Attendance
                </Button>
              </Link>
              <Link
                to={`/teacher/attendance?class_id=${assignedClassTeacherInfo.class_id}&session=afternoon&date=${selectedDate}`}
              >
                <Button variant="outline" size="sm" leftIcon={<Sunset className="w-3.5 h-3.5 text-indigo-500" />}>
                  Afternoon Attendance
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border text-[11px] text-light-secondary dark:text-dark-secondary flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span>
              Subject Faculty role. Student session attendance is recorded by the designated Class Teacher assigned in the Admin Portal.
            </span>
          </div>
        )}
      </Card>

      {/* Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 h-28 animate-pulse bg-gray-100 dark:bg-dark-card" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Assigned Classes"
            value={stats.total_assigned_classes || (assignedClassTeacherInfo ? 1 : 2)}
            icon={<BookOpen className="w-6 h-6" />}
            subtitle="Sections under your charge"
          />
          <MetricCard
            label="Authorized Students"
            value={stats.total_authorized_students || 80}
            icon={<GraduationCap className="w-6 h-6" />}
            subtitle="Enrolled in your sections"
            trend="Isolated Scope"
          />
          <MetricCard
            label="Department"
            value={facultyProfile?.department || stats.department || "Mathematics & Science"}
            icon={<Users className="w-6 h-6" />}
            subtitle="Senior Secondary Faculty"
          />
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TODAY'S TIMETABLE */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-light-border dark:border-dark-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-navy dark:bg-brand-blue/30 text-white dark:text-dark-accent">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black tracking-wide text-brand-navy dark:text-white uppercase">
                TODAY’S TIMETABLE
              </h2>
              <Badge variant="primary" size="sm">
                {todayPeriods.length} {todayPeriods.length === 1 ? "Period" : "Periods"}
              </Badge>
            </div>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
              Chronological schedule for {facultyProfile?.full_name || teacherName} • {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-brand-blue dark:text-dark-accent" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent border-none text-light-primary dark:text-dark-primary focus:outline-none cursor-pointer"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingPeriods ? "animate-spin" : ""}`} />}
              onClick={() => {
                fetchTimetablePeriods();
                fetchDutyAndAssignment();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Timetable Cards Grid */}
        {isLoadingPeriods ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 h-44 animate-pulse bg-gray-100 dark:bg-dark-card" />
            ))}
          </div>
        ) : todayPeriods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayPeriods.map((slot) => {
              return (
                <div
                  key={slot.id}
                  onClick={() => handlePeriodClick(slot)}
                  className="p-5 rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:border-brand-blue/60 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-brand-blue dark:text-dark-accent">
                      Period {slot.period}
                    </span>
                    <span className="text-[11px] font-semibold text-light-secondary dark:text-dark-secondary">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-light-primary dark:text-dark-primary">
                      {slot.subject || "Academic Subject"}
                    </h4>
                    <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
                      {slot.class_name} • Section {slot.section_name || "A"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-brand-blue dark:text-dark-accent flex items-center gap-1">
                      <span>Take Attendance</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center bg-gray-50/50 dark:bg-dark-elevated/20">
            <Clock className="w-10 h-10 text-light-secondary dark:text-dark-secondary mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              No periods scheduled for {formattedDate}
            </h4>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
              Check upcoming days or visit the master timetable.
            </p>
          </Card>
        )}
      </div>

      {/* Grid: Assigned Classes & Real Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Real Class & Subject Assignments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                Your Assigned Classes & Subjects
              </h3>
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                Enforced by server-side resource permissions
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-brand-blue dark:text-dark-accent" />
          </div>

          {stats && stats.assignments.length > 0 ? (
            <div className="space-y-2.5">
              {stats.assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-dark-accent font-bold text-xs">
                      {a.class_name}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-light-primary dark:text-dark-primary">
                        Section {a.section_name} • {a.subject}
                      </p>
                      <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                        {a.role_type === "class_teacher" ? "Class Teacher (In-charge)" : "Subject Instructor"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={a.role_type === "class_teacher" ? "primary" : "info"} size="sm">
                    {a.role_type.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-light-secondary dark:text-dark-secondary py-6 text-center">
              No classes assigned to your profile in this term yet.
            </p>
          )}
        </Card>

        {/* Quick Academic Actions */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-3">
              Teaching Operations
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/teacher/my-students"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-blue/60 dark:hover:border-dark-accent/60 text-left transition-all group"
              >
                <GraduationCap className="w-5 h-5 text-brand-blue dark:text-dark-accent mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">My Students</p>
                <p className="text-[10px] text-light-secondary">Authorized roll list & attendance</p>
              </Link>

              <Link
                to="/teacher/attendance"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-blue/60 dark:hover:border-dark-accent/60 text-left transition-all group"
              >
                <CalendarCheck className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Take Attendance</p>
                <p className="text-[10px] text-light-secondary">Session attendance submission</p>
              </Link>

              <Link
                to="/teacher/marks"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-blue/60 dark:hover:border-dark-accent/60 text-left transition-all group"
              >
                <FileSpreadsheet className="w-5 h-5 text-brand-blue dark:text-dark-accent mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Marks Entry</p>
                <p className="text-[10px] text-light-secondary">Enter & Edit SSC Marks</p>
              </Link>

              <Link
                to="/teacher/profile"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-blue/60 dark:hover:border-dark-accent/60 text-left transition-all group"
              >
                <Users className="w-5 h-5 text-brand-blue dark:text-dark-accent mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">My Profile</p>
                <p className="text-[10px] text-light-secondary">Faculty credentials & bio</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
