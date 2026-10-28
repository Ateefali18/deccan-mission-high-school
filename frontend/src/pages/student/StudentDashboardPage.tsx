import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { api } from "../../services/api";
import type { StudentDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const StudentDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.dashboards
      .getStudent()
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Academic Portal"
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
            subtitle={`Roll Number: ${stats.roll_number || "Pending"}`}
          />
          <MetricCard
            label="Admission Identity"
            value={stats.admission_number}
            icon={<GraduationCap className="w-6 h-6" />}
            subtitle="Verified Enrollment"
            trend="Active"
          />
          <MetricCard
            label="Academic Term"
            value={stats.current_academic_year || "2025-2026"}
            icon={<Calendar className="w-6 h-6" />}
            subtitle="Session in progress"
          />
        </div>
      ) : null}

      {/* Grid: Academic Overview & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile Overview */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                Official Student Enrollment Record
              </h3>
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                Verified database profile registered at Deccan Mission High School, Hyderabad
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-brand-gold" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated space-y-1">
              <span className="text-light-secondary dark:text-dark-secondary block">Full Name</span>
              <span className="text-sm font-bold text-light-primary dark:text-dark-primary block">
                {stats?.student_name}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated space-y-1">
              <span className="text-light-secondary dark:text-dark-secondary block">Admission Number</span>
              <span className="text-sm font-bold font-mono text-brand-gold block">
                {stats?.admission_number}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated space-y-1">
              <span className="text-light-secondary dark:text-dark-secondary block">Class & Section</span>
              <span className="text-sm font-bold text-light-primary dark:text-dark-primary block">
                {stats?.class_name} - {stats?.section_name}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated space-y-1">
              <span className="text-light-secondary dark:text-dark-secondary block">Enrollment Status</span>
              <Badge variant={stats?.status === "active" ? "success" : "neutral"} size="sm">
                {stats?.status}
              </Badge>
            </div>
          </div>

          {/* Timetable / Period schedule placeholder */}
          <div className="mt-5 p-4 rounded-xl border border-dashed border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/20 flex items-center gap-3">
            <Clock className="w-5 h-5 text-brand-gold shrink-0" />
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              {stats?.today_schedule_placeholder || "Your classroom timetable and period bells will be available in Phase 2."}
            </p>
          </div>
        </Card>

        {/* Quick Links to Modules */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-3">
            Student Academic Modules
          </h3>
          <div className="space-y-2">
            <Link
              to="/student/profile"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold text-light-primary dark:text-dark-primary">My Profile</span>
              </div>
              <ArrowRight className="w-4 h-4 text-light-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/coming-soon?module=My+Attendance&phase=2"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold text-light-primary dark:text-dark-primary">My Attendance</span>
              </div>
              <Badge variant="gold" size="sm">Phase 2</Badge>
            </Link>

            <Link
              to="/coming-soon?module=My+Marks+%26+Results&phase=2"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold text-light-primary dark:text-dark-primary">Marks & Report Card</span>
              </div>
              <Badge variant="gold" size="sm">Phase 2</Badge>
            </Link>

            <Link
              to="/coming-soon?module=My+Timetable&phase=2"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold text-light-primary dark:text-dark-primary">Timetable & Schedule</span>
              </div>
              <Badge variant="gold" size="sm">Phase 2</Badge>
            </Link>

            <Link
              to="/coming-soon?module=My+Fees&phase=2"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold text-light-primary dark:text-dark-primary">Fee Receipts</span>
              </div>
              <Badge variant="gold" size="sm">Phase 2</Badge>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
