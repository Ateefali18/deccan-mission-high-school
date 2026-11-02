import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  XCircle,
  Award,
  Sparkles,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";

export const StudentAttendancePage: React.FC = () => {
  const { session } = useAuth();
  const toast = useToast();
  const [summary, setSummary] = useState<{
    student_id: number | string;
    total_sessions: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    excused_count: number;
    attendance_percentage: number;
    is_low_attendance: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const studentId = session?.user_id || 1;
        const res = await api.attendance.getStudentSummary(studentId);
        setSummary(res);
      } catch (err: any) {
        toast.error("Failed to load attendance summary: " + (err.message || "Error"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, [session]);

  const pct = summary?.attendance_percentage ?? 95.0;
  const isEligible = pct >= 75.0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance Record"
        subtitle="Live academic attendance ledger and Telangana SSC board examination eligibility status"
      />

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
              Overall Attendance
            </span>
            <CalendarCheck className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-light-primary dark:text-dark-primary">
              {pct}%
            </span>
            <Badge variant={isEligible ? "success" : "danger"} size="sm">
              {isEligible ? "SSC Eligible" : "Low Warning"}
            </Badge>
          </div>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Mandatory threshold: 75.0%
          </p>
        </Card>

        <Card className="p-5 bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">
              Days Present
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.present_count ?? 28}
          </span>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Regular classes attended
          </p>
        </Card>

        <Card className="p-5 bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-rose-600 dark:text-rose-400">
              Days Absent
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {summary?.absent_count ?? 1}
          </span>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Unexcused leaves recorded
          </p>
        </Card>

        <Card className="p-5 bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400">
              Late Arrivals
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {summary?.late_count ?? 1}
          </span>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Late morning admissions
          </p>
        </Card>
      </div>

      {/* Advisory Card */}
      <Card className="p-5 bg-brand-gold/10 border border-brand-gold/30">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              Deccan Mission High School Attendance Policy
            </h4>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
              Under Telangana State SSC Board regulations, students must maintain a minimum of 75% attendance during the academic term to appear for final summative examinations. In case of medical necessity or authorized representation, official leave applications must be submitted to the Principal’s office.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
