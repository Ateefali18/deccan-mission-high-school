import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { api } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { TeacherDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const TeacherDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [nextPeriodInfo, setNextPeriodInfo] = useState<{
    status: string;
    message: string;
    current_period?: any;
    next_period?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time synchronization
  useRealtimeSync({
    tables: ["attendance_records", "marks", "timetable_entries", "notices"],
    onSync: () => {
      fetchDashboard();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Academic Portal"
        subtitle={`Welcome, ${stats?.teacher_name || "Faculty Member"} • Employee ID: ${stats?.employee_id || "..."}`}
        action={
          <div className="flex items-center gap-2">
            <Link to="/teacher/my-students">
              <Button variant="primary" size="sm" leftIcon={<GraduationCap className="w-4 h-4" />}>
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
            value={stats.total_assigned_classes}
            icon={<BookOpen className="w-6 h-6" />}
            subtitle="Sections under your charge"
          />
          <MetricCard
            label="Authorized Students"
            value={stats.total_authorized_students}
            icon={<GraduationCap className="w-6 h-6" />}
            subtitle="Enrolled in your sections"
            trend="Isolated Scope"
          />
          <MetricCard
            label="Department"
            value={stats.department || "Mathematics & Science"}
            icon={<Users className="w-6 h-6" />}
            subtitle={stats.designation}
          />
        </div>
      ) : null}

      {/* Real Today's Bell & Period Status */}
      <Card className="p-5 bg-gradient-to-r from-brand-navy/5 via-brand-gold/10 to-brand-navy/5 border border-brand-gold/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold text-brand-navy shrink-0 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                  Today's Bell & Timetable Period Status
                </h4>
                <Badge variant="gold" size="sm">Asia/Kolkata</Badge>
              </div>
              <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
                {nextPeriodInfo?.message || "Checking current class and timetable status..."}
              </p>
            </div>
          </div>

          <Link to="/teacher/my-students">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Section Roll Call
            </Button>
          </Link>
        </div>
      </Card>

      {/* Grid: Assigned Classes & Real Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <ShieldCheck className="w-5 h-5 text-brand-gold" />
          </div>

          {stats && stats.assignments.length > 0 ? (
            <div className="space-y-2.5">
              {stats.assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold font-bold text-xs">
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
                  <Badge variant={a.role_type === "class_teacher" ? "gold" : "info"} size="sm">
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
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all group"
              >
                <GraduationCap className="w-5 h-5 text-brand-gold mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">My Students</p>
                <p className="text-[10px] text-light-secondary">Authorized roll list & attendance</p>
              </Link>

              <Link
                to="/teacher/my-students"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all group"
              >
                <CalendarCheck className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Take Attendance</p>
                <p className="text-[10px] text-light-secondary">Daily roll call submission</p>
              </Link>

              <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/30 text-left">
                <FileSpreadsheet className="w-5 h-5 text-brand-gold mb-2" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Marks Entry</p>
                <p className="text-[10px] text-light-secondary">Mid-Term Assessments</p>
              </div>

              <Link
                to="/teacher/profile"
                className="p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all group"
              >
                <Users className="w-5 h-5 text-brand-gold mb-2 group-hover:scale-110 transition-transform" />
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
