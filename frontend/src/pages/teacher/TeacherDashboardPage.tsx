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

export const TeacherDashboardPage: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

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

  const teacherName = session?.user?.full_name || session?.user?.username || "Ateef";

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
  }, [fetchDashboard]);

  useEffect(() => {
    fetchTimetablePeriods();
  }, [fetchTimetablePeriods]);

  // Real-time synchronization
  useRealtimeSync({
    tables: ["attendance_records", "attendance_sessions", "timetable_entries", "notices"],
    onSync: () => {
      fetchDashboard();
      fetchTimetablePeriods();
    },
  });

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Academic Portal"
        subtitle={`Welcome, ${teacherName} • Senior Mathematics Faculty (DMHS SSC Board)`}
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
            value={stats.total_assigned_classes || 2}
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
            value={stats.department || "Mathematics & Science"}
            icon={<Users className="w-6 h-6" />}
            subtitle="Senior Secondary Faculty"
          />
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 1. TODAY'S TIMETABLE (Prominent Chronological Period Cards) */}
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
              Chronological schedule for {teacherName} • {formattedDate}
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
              onClick={() => fetchTimetablePeriods()}
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
              const isCompleted = slot.attendance_status === "Completed";

              return (
                <div
                  key={slot.id || `period-${slot.period}`}
                  onClick={() => handlePeriodClick(slot)}
                  className={`group relative rounded-2xl border p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    isCompleted
                      ? "bg-white dark:bg-dark-card border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400"
                      : "bg-white dark:bg-dark-card border-amber-200 dark:border-amber-900/50 hover:border-brand-blue"
                  }`}
                >
                  {/* Top Bar: Period Number & Attendance Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wider bg-brand-navy text-white dark:bg-brand-blue dark:text-white uppercase shadow-sm">
                      Period {slot.period}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Period Time Range */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-2">
                    <Clock className="w-3.5 h-3.5 text-brand-blue dark:text-dark-accent" />
                    <span>{slot.time || `${slot.start_time || "09:00"} - ${slot.end_time || "09:45"}`}</span>
                  </div>

                  {/* Subject Name */}
                  <h3 className="text-base font-extrabold text-light-primary dark:text-dark-primary group-hover:text-brand-blue dark:group-hover:text-dark-accent transition-colors line-clamp-1">
                    {slot.subject}
                  </h3>

                  {/* Class & Section */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-brand-paleBlue dark:bg-brand-blue/20 text-brand-blue dark:text-dark-accent border border-brand-blue/20">
                      {slot.class_name} • Section {slot.section_name}
                    </span>
                    <span className="text-xs text-light-secondary dark:text-dark-secondary">
                      {slot.room || "Room 301"}
                    </span>
                  </div>

                  {/* Teacher Name & Action Hint */}
                  <div className="mt-4 pt-3 border-t border-light-border/70 dark:border-dark-border/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-light-secondary dark:text-dark-secondary">
                      Teacher: <strong className="text-light-primary dark:text-dark-primary">{slot.teacher || teacherName}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue dark:text-dark-accent group-hover:translate-x-0.5 transition-transform">
                      {isCompleted ? "Review" : "Take Attendance"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Informative Empty State */
          <Card className="p-8 text-center bg-gray-50/50 dark:bg-dark-card/50 border border-dashed border-light-border dark:border-dark-border">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue dark:text-dark-accent mx-auto flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              No Timetable Periods Scheduled For {formattedDate}
            </h3>
            <p className="text-xs text-light-secondary dark:text-dark-secondary max-w-md mx-auto mt-1 mb-4">
              There are no teaching slots assigned to your faculty profile ({teacherName}) on this date.
              DMHS operates Monday through Saturday.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Switch to current Monday
                  const d = new Date();
                  const currentDay = d.getDay();
                  const distanceToMonday = currentDay === 0 ? 1 : currentDay === 6 ? 2 : 0;
                  d.setDate(d.getDate() + distanceToMonday);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
              >
                View Upcoming Weekday Schedule
              </Button>
              <Link to="/teacher/timetable">
                <Button variant="primary" size="sm" leftIcon={<Clock className="w-3.5 h-3.5" />}>
                  Master Timetable
                </Button>
              </Link>
            </div>
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
                <p className="text-[10px] text-light-secondary">Period roll call submission</p>
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
