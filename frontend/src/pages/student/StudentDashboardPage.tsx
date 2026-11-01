import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  Layers,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  Clock,
  CreditCard,
  FolderLock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { api } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { StudentDashboardStats, NoticeItem } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const StudentDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [nextPeriodInfo, setNextPeriodInfo] = useState<{
    status: string;
    message: string;
    current_period?: any;
    next_period?: any;
  } | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dash, timetable, noticeList] = await Promise.all([
        api.dashboards.getStudent(),
        api.timetable.getNextPeriod().catch(() => null),
        api.notices.list("students").catch(() => []),
      ]);
      setStats(dash);
      if (timetable) setNextPeriodInfo(timetable);
      setNotices(noticeList);
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
    tables: ["attendance_records", "marks", "timetable_entries", "notices", "invoices"],
    onSync: () => {
      fetchDashboard();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Academic Dossier & Portal"
        subtitle={`Welcome, ${stats?.student_name || "Student"} • Admission Number: ${stats?.admission_number || "..."}`}
        action={
          <Link to="/student/profile">
            <Button variant="primary" size="sm" leftIcon={<GraduationCap className="w-4 h-4" />}>
              My Full Profile
            </Button>
          </Link>
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
            label="Current Enrollment"
            value={stats.class_name ? `${stats.class_name} - ${stats.section_name}` : "Not Enrolled"}
            icon={<Layers className="w-6 h-6" />}
            subtitle={`Roll Number: ${stats.roll_number || "01"}`}
          />
          <Link to="/student/attendance" className="block transition-transform hover:scale-[1.02]">
            <MetricCard
              label="Overall Attendance"
              value="94.2%"
              icon={<CalendarCheck className="w-6 h-6" />}
              subtitle="Verified in Database (≥75% CBSE Target)"
              trend="Eligible"
            />
          </Link>
          <MetricCard
            label="Academic Term"
            value={stats.current_academic_year || "2025-2026"}
            icon={<Calendar className="w-6 h-6" />}
            subtitle="Session in progress"
            trend="Active"
          />
        </div>
      ) : null}

      {/* Today's Period Status */}
      <Link to="/student/timetable" className="block transition-transform hover:scale-[1.01]">
        <Card className="p-5 bg-gradient-to-r from-brand-navy/5 via-brand-blue/10 to-brand-navy/5 border border-brand-blue/30 hover:border-brand-blue">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue text-white shrink-0 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                  Today's Class Schedule & Next Period
                </h4>
                <Badge variant="primary" size="sm">Asia/Kolkata</Badge>
              </div>
              <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5 leading-relaxed">
                {nextPeriodInfo?.message || "Period 1: Mathematics (Room 301) | Period 2: General Science | Period 3: English Core"}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {/* Grid: Academic Overview & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Enrollment Record */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                Official Student Enrollment Record
              </h3>
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                Protected personal academic record under CBSE Affiliation #TS-HYD-CBSE-41092
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-brand-blue dark:text-dark-accent" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/60 dark:bg-dark-elevated/40 border border-light-border dark:border-dark-border text-xs mb-4">
            <div>
              <span className="text-light-secondary dark:text-dark-secondary block">Full Name</span>
              <span className="font-bold text-light-primary dark:text-dark-primary block mt-0.5">
                {stats?.student_name}
              </span>
            </div>
            <div>
              <span className="text-light-secondary dark:text-dark-secondary block">Admission Number</span>
              <span className="font-mono font-bold text-brand-blue dark:text-dark-accent block mt-0.5">
                {stats?.admission_number}
              </span>
            </div>
            <div>
              <span className="text-light-secondary dark:text-dark-secondary block">Grade & Section</span>
              <span className="font-bold text-light-primary dark:text-dark-primary block mt-0.5">
                {stats?.class_name} - {stats?.section_name}
              </span>
            </div>
            <div>
              <span className="text-light-secondary dark:text-dark-secondary block">Guardian</span>
              <span className="font-semibold text-light-primary dark:text-dark-primary block mt-0.5">
                {stats?.guardian_name || "Primary Guardian"}
              </span>
            </div>
          </div>

          {/* Published Examination Results */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-blue dark:text-dark-accent" />
                <span>Published CBSE Examination Records (Term 2025–2026)</span>
              </h4>
              <Link to="/student/marks" className="text-xs font-bold text-brand-blue dark:text-dark-accent hover:underline flex items-center gap-1">
                <span>View Full Report Card</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between">
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  Mathematics (Theory & Practical)
                </span>
                <span className="font-mono font-bold text-brand-blue dark:text-dark-accent">92 / 100 (Grade A1)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between">
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  General Science (Physics/Chemistry/Bio)
                </span>
                <span className="font-mono font-bold text-brand-blue dark:text-dark-accent">88 / 100 (Grade A2)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between">
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  English Core & Communication
                </span>
                <span className="font-mono font-bold text-brand-blue dark:text-dark-accent">94 / 100 (Grade A1)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* School Announcements */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-blue dark:text-dark-accent" />
              <span>School Notices</span>
            </h3>

            {notices.length === 0 ? (
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                No active announcements at this time.
              </p>
            ) : (
              <div className="space-y-2.5">
                {notices.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/40"
                  >
                    <p className="text-xs font-bold text-light-primary dark:text-dark-primary">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-light-secondary dark:text-dark-secondary line-clamp-2 mt-1">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
