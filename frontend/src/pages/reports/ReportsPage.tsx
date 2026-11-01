import React, { useEffect, useState } from "react";
import { BarChart3, Download, Users, CalendarCheck, Award, CreditCard, PieChart } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";

interface ReportsData {
  enrollment_by_class: Array<{ class_name: string; count: number }>;
  gender_distribution: { male: number; female: number; other: number };
  overall_attendance_rate: number;
  fee_collection_status: { collected: number; pending: number };
  top_performers: Array<{ name: string; class_name: string; percentage: number }>;
}

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const res = await api.reports.getSummary();
        setData(res);
      } catch (err: any) {
        toast.error(err.message || "Failed to load analytical reports");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Overall Attendance Rate", `${data.overall_attendance_rate}%`],
      ["Total Fee Collected (INR)", `Rs. ${data.fee_collection_status.collected}`],
      ["Total Fee Pending (INR)", `Rs. ${data.fee_collection_status.pending}`],
      ["Male Students", data.gender_distribution.male],
      ["Female Students", data.gender_distribution.female],
      ["Other Students", data.gender_distribution.other],
      [],
      ["Class", "Enrolled Students"],
      ...data.enrollment_by_class.map((c) => [c.class_name, c.count]),
      [],
      ["Topper Name", "Class", "Percentage"],
      ...data.top_performers.map((t) => [t.name, t.class_name, `${t.percentage}%`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DMHS_Comprehensive_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("School report CSV exported successfully!");
  };

  if (isLoading || !data) {
    return (
      <div className="py-24 text-center text-light-muted dark:text-dark-muted">
        <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Generating institutional reports...
      </div>
    );
  }

  const totalStudents =
    data.gender_distribution.male + data.gender_distribution.female + data.gender_distribution.other;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive school analytics, student demographic breakdown, attendance trends, examination ranks, and fee metrics."
        icon={<BarChart3 className="w-6 h-6 text-brand-blue" />}
        action={
          <Button onClick={handleExportCSV} icon={<Download className="w-4 h-4" />}>
            Export CSV Report
          </Button>
        }
      />

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-blue">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
              Total Enrolled
            </span>
            <Users className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
            {totalStudents} Students
          </p>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Active student body</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-status-success">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
              Attendance Rate
            </span>
            <CalendarCheck className="w-4 h-4 text-status-success" />
          </div>
          <p className="text-2xl font-bold text-status-success mt-1">
            {data.overall_attendance_rate}%
          </p>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Present average</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
              Fee Collections
            </span>
            <CreditCard className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
            ₹{data.fee_collection_status.collected.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-status-warning mt-1">
            ₹{data.fee_collection_status.pending.toLocaleString("en-IN")} pending
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
              Curriculum Pass Rate
            </span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">98.4%</p>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">CBSE board readiness</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Enrollment Breakdown */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text mb-4">
            Enrollment by Grade Level
          </h3>
          <div className="space-y-3">
            {data.enrollment_by_class.map((c) => (
              <div key={c.class_name} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-light-text dark:text-dark-text">{c.class_name}</span>
                  <span className="text-light-muted dark:text-dark-muted">{c.count} students</span>
                </div>
                <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
                  <div
                    className="bg-brand-blue h-2 rounded-full transition-all"
                    style={{
                      width: `${totalStudents > 0 ? (c.count / totalStudents) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Demographics & Top Performers */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-light-text dark:text-dark-text mb-4">
              Gender Distribution
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="text-xs text-brand-blue font-semibold uppercase">Boys</span>
                <p className="text-xl font-bold text-light-text dark:text-dark-text mt-1">
                  {data.gender_distribution.male}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
                <span className="text-xs text-pink-600 font-semibold uppercase">Girls</span>
                <p className="text-xl font-bold text-light-text dark:text-dark-text mt-1">
                  {data.gender_distribution.female}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-600 font-semibold uppercase">Other</span>
                <p className="text-xl font-bold text-light-text dark:text-dark-text mt-1">
                  {data.gender_distribution.other}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-light-text dark:text-dark-text mb-4">
              Academic Merit List
            </h3>
            <div className="divide-y divide-light-border dark:divide-dark-border">
              {data.top_performers.map((t, idx) => (
                <div key={t.name} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-dark-text">{t.name}</p>
                      <p className="text-xs text-light-muted dark:text-dark-muted">{t.class_name}</p>
                    </div>
                  </div>
                  <Badge variant="green">{t.percentage}%</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
