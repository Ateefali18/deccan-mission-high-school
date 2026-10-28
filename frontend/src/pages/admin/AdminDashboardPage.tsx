import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Layers,
  Calendar,
  UserPlus,
  PlusCircle,
  Activity,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { api } from "../../services/api";
import type { AdminDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { MetricCard } from "../../components/shared/MetricCard";
import { ComingSoonCard } from "../../components/shared/ComingSoonCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.dashboards
      .getAdmin()
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
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
        title="Administrative Dashboard"
        subtitle="Deccan Mission High School Executive Overview & Real Database Metrics"
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin/students">
              <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                Manage Students
              </Button>
            </Link>
            <Link to="/admin/teachers">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Manage Faculty
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error text-status-error text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>Error loading real-time dashboard data: {error}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Enrolled Students"
            value={stats.total_active_students}
            icon={<GraduationCap className="w-6 h-6" />}
            subtitle="Target: >1,500 active capacity"
            trend="Active"
          />
          <MetricCard
            label="Teaching Faculty"
            value={stats.total_active_teachers}
            icon={<Users className="w-6 h-6" />}
            subtitle="Initial target: 100 staff"
            trend="Active"
          />
          <MetricCard
            label="Classes & Sections"
            value={`${stats.total_classes} / ${stats.total_sections}`}
            icon={<Layers className="w-6 h-6" />}
            subtitle="Grades 1 through 10"
          />
          <MetricCard
            label="Academic Term"
            value={stats.current_academic_year || "2025-2026"}
            icon={<Calendar className="w-6 h-6" />}
            subtitle="Active School Session"
            trend="Current"
          />
        </div>
      ) : null}

      {/* Grid: Quick Management & Recent Real Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-1">
            Foundation Operations
          </h3>
          <p className="text-xs text-light-secondary dark:text-dark-secondary mb-4">
            Direct access to core database tables configured in Phase 1
          </p>

          <div className="space-y-2">
            <Link
              to="/admin/students"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 hover:bg-brand-gold/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Student Directory</p>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    View admission numbers, class enrollments
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-light-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/admin/teachers"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 hover:bg-brand-gold/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Faculty & Staff</p>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    Employee IDs, subject assignments
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-light-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/admin/classes"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 hover:bg-brand-gold/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Classes & Sections</p>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    Capacity planning, grade levels
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-light-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/admin/academic-years"
              className="flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-brand-gold/60 hover:bg-brand-gold/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-gold/15 text-brand-gold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-light-primary dark:text-dark-primary">Academic Years</p>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    Term dates, active school year
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-light-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </Card>

        {/* Recent Real Database Activity */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                Recent Administrative Activity
              </h3>
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                Immutable security and transaction log from PostgreSQL / Relational Database
              </p>
            </div>
            <Activity className="w-4 h-4 text-brand-gold" />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : stats && stats.recent_activity.length > 0 ? (
            <div className="divide-y divide-light-border dark:divide-dark-border">
              {stats.recent_activity.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-light-primary dark:text-dark-primary">
                      {act.action} {act.resource_type ? `• ${act.resource_type}` : ""}
                    </p>
                    <p className="text-[11px] text-light-secondary dark:text-dark-secondary truncate">
                      {act.details || "Administrative event registered"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-light-secondary dark:text-dark-secondary font-mono block">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] text-brand-gold font-semibold block">
                      {act.user_name || "System"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-light-secondary dark:text-dark-secondary py-6 text-center">
              No recent administrative logs recorded yet.
            </p>
          )}
        </Card>
      </div>

      {/* Honest Roadmap Section */}
      <div className="pt-4">
        <div className="mb-4">
          <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
            Subsequent Phase Integration Plan
          </h3>
          <p className="text-xs text-light-secondary dark:text-dark-secondary">
            Modules clearly reserved for Phase 2 & Phase 3 as specified in architecture requirements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ComingSoonCard
            moduleName="Attendance & Absence Tracking"
            phase="Phase 2"
            description="Daily biometric / teacher roll-call per period, automated SMS/email triggers for absentees, and monthly aggregate reports."
          />
          <ComingSoonCard
            moduleName="Examinations, Marks & Report Cards"
            phase="Phase 2"
            description="Formative and Summative grading scales, CBSE mark entry sheets, consolidated rank lists, and printable PDF report cards."
          />
          <ComingSoonCard
            moduleName="Autonomous School AI Assistant"
            phase="Phase 3"
            description="Natural language querying of authorized school records, AI timetable generation, and conversational guidance for teachers and parents."
          />
        </div>
      </div>
    </div>
  );
};
