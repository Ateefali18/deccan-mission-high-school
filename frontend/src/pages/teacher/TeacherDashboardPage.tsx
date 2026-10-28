import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { api } from "../../services/api";
import type { TeacherDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const TeacherDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.dashboards
      .getTeacher()
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
        title="Faculty Dashboard"
        subtitle={`Welcome, ${stats?.teacher_name || "Faculty Member"} • Employee ID: ${stats?.employee_id || "..."}`}
        action={
          <Link to="/teacher/my-students">
            <Button variant="primary" size="sm" leftIcon={<GraduationCap className="w-4 h-4" />}>
              View My Students
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
            label="Assigned Classes"
            value={stats.total_assigned_classes}
            icon={<BookOpen className="w-6 h-6" />}
            subtitle="Sections in charge"
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
            value={stats.department || "Faculty"}
            icon={<Users className="w-6 h-6" />}
            subtitle={stats.designation}
          />
        </div>
      ) : null}

      {/* Grid: Assigned Classes & Real Today Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Class & Subject Assignments from Database */}
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

        {/* Schedule & Quick Actions */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-1">
              Today's Schedule & Period Bell
            </h3>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mb-4">
              Timetable and period bells are scheduled for Phase 2
            </p>
            <div className="p-4 rounded-xl border border-dashed border-light-border dark:border-dark-border bg-gray-50/60 dark:bg-dark-elevated/20 flex items-center gap-3">
              <Clock className="w-5 h-5 text-brand-gold shrink-0" />
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                {stats?.today_schedule_placeholder || "Automated class timetable will be activated in Phase 2."}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-3">
              Quick Operations
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/teacher/my-students"
                className="p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all"
              >
                <GraduationCap className="w-4 h-4 text-brand-gold mb-1.5" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">My Students</p>
                <p className="text-[10px] text-light-secondary">Authorized roll list</p>
              </Link>
              <Link
                to="/coming-soon?module=Mark+Attendance&phase=2"
                className="p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all"
              >
                <CalendarCheck className="w-4 h-4 text-brand-gold mb-1.5" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Attendance</p>
                <p className="text-[10px] text-light-secondary">Phase 2 Module</p>
              </Link>
              <Link
                to="/coming-soon?module=Enter+Marks&phase=2"
                className="p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-gold mb-1.5" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Enter Marks</p>
                <p className="text-[10px] text-light-secondary">Phase 2 Module</p>
              </Link>
              <Link
                to="/teacher/profile"
                className="p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 text-left transition-all"
              >
                <Users className="w-4 h-4 text-brand-gold mb-1.5" />
                <p className="text-xs font-bold text-light-primary dark:text-dark-primary">My Profile</p>
                <p className="text-[10px] text-light-secondary">Official Faculty Card</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
