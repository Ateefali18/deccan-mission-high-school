import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Filter,
  Search,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Edit2,
  HelpCircle,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { SchoolClass, ClassSection, StudentListItem, AcademicYear } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRecordRow {
  student_id: number | string;
  admission_number: string;
  roll_number?: string;
  full_name: string;
  photo_url?: string;
  status: AttendanceStatus;
  remarks: string;
}

interface DateWiseSessionSummary {
  session_id: number | string;
  session_date: string;
  period_number: number;
  class_id: number | string;
  class_name: string;
  section_id: number | string;
  section_name: string;
  total_students: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  attendance_percentage: number;
  status: string;
}

export const AttendancePage: React.FC = () => {
  const { session } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: "rollcall" | "reports"
  const [activeTab, setActiveTab] = useState<"rollcall" | "reports">("rollcall");

  // Metadata Lists
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | string>("");

  // Roll-Call Filters & Selection
  const [selectedClassId, setSelectedClassId] = useState<number | string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [periodNumber] = useState<number>(0); // 0 = Full Day

  // Roll-Call State
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isExistingSession, setIsExistingSession] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<number | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reports Tab State
  const [reportFromDate, setReportFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [reportToDate, setReportToDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [reportClassId, setReportClassId] = useState<string>("");
  const [reportSectionId, setReportSectionId] = useState<string>("");
  const [reportSummaries, setReportSummaries] = useState<DateWiseSessionSummary[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Available sections for chosen class
  const availableSections = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find((c) => String(c.id) === String(selectedClassId));
    return cls?.sections?.filter((s) => s.is_active) || [];
  }, [classes, selectedClassId]);

  // Load Classes and Academic Years
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [clsRes, ayRes] = await Promise.all([
          api.classes.list(),
          api.academicYears.list(),
        ]);
        setClasses(clsRes);
        setAcademicYears(ayRes);

        const activeAy = ayRes.find((y) => y.is_current) || ayRes[0];
        if (activeAy) setSelectedAcademicYearId(activeAy.id);

        if (clsRes.length > 0) {
          const firstClass = clsRes[0];
          setSelectedClassId(firstClass.id);
          const firstSec = firstClass.sections?.find((s) => s.is_active) || firstClass.sections?.[0];
          if (firstSec) setSelectedSectionId(firstSec.id);
        }
      } catch (err: any) {
        toast.error("Failed to load school academic metadata: " + (err.message || "Error"));
      }
    };
    loadMetadata();
  }, []);

  // When class changes, auto-select first section
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => String(c.id) === String(newClassId));
    const firstSec = cls?.sections?.find((s) => s.is_active) || cls?.sections?.[0];
    if (firstSec) {
      setSelectedSectionId(firstSec.id);
    } else {
      setSelectedSectionId("");
    }
  };

  // Load Students and Existing Attendance for selected Class + Section + Date
  const loadRollCall = useCallback(async () => {
    if (!selectedSectionId) {
      setRecords([]);
      return;
    }

    setIsLoadingStudents(true);
    try {
      // 1. Fetch Students in Section
      const studentsRes = await api.students.list({
        limit: 100,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        status: "active",
      });

      // 2. Fetch Existing Attendance Session for this Date
      const existingSession = await api.attendance.getSession({
        section_id: selectedSectionId,
        session_date: selectedDate,
        period_number: periodNumber,
      });

      const existingRecordMap = existingSession?.records || {};
      const hasExistingSession = Boolean(existingSession?.session_id);
      setIsExistingSession(hasExistingSession);
      setExistingSessionId(existingSession?.session_id || null);

      // 3. Map students to rows
      const mappedRows: AttendanceRecordRow[] = studentsRes.items.map((s) => {
        const studentIdStr = String(s.id);
        const existing = existingRecordMap[studentIdStr];

        return {
          student_id: s.id,
          admission_number: s.admission_number,
          roll_number: s.roll_number || "-",
          full_name: s.full_name,
          photo_url: s.photo_url,
          status: (existing?.status as AttendanceStatus) || "present",
          remarks: existing?.remarks || "",
        };
      });

      setRecords(mappedRows);
    } catch (err: any) {
      toast.error(err.message || "Failed to load class attendance roster");
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassId, selectedSectionId, selectedDate, periodNumber]);

  useEffect(() => {
    if (selectedSectionId && selectedDate) {
      loadRollCall();
    }
  }, [loadRollCall]);

  // Handle individual status change
  const handleStatusChange = (studentId: string | number, newStatus: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) =>
        String(r.student_id) === String(studentId) ? { ...r, status: newStatus } : r
      )
    );
  };

  // Handle remarks change
  const handleRemarksChange = (studentId: string | number, remarks: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        String(r.student_id) === String(studentId) ? { ...r, remarks } : r
      )
    );
  };

  // Bulk actions
  const markAllAs = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    toast.info(`Marked all students as ${status.toUpperCase()}`);
  };

  // Submit Attendance
  const handleSaveAttendance = async () => {
    if (!selectedSectionId || records.length === 0) {
      toast.error("No student records to save");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        academic_year_id: selectedAcademicYearId || 1,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        session_date: selectedDate,
        period_number: periodNumber,
        records: records.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          remarks: r.remarks ? r.remarks.trim() : undefined,
        })),
      };

      const res = await api.attendance.submit(payload);
      toast.success(
        isExistingSession
          ? `Updated attendance for ${records.length} students on ${selectedDate}!`
          : `Saved attendance for ${records.length} students on ${selectedDate}!`
      );
      setIsExistingSession(true);
      if (res?.session_id) setExistingSessionId(res.session_id);
    } catch (err: any) {
      toast.error("Failed to save attendance: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const summaries = await api.attendance.getDateWiseReport({
        class_id: reportClassId || undefined,
        section_id: reportSectionId || undefined,
        from_date: reportFromDate || undefined,
        to_date: reportToDate || undefined,
      });
      setReportSummaries(summaries);
    } catch (err: any) {
      toast.error("Failed to load attendance report: " + (err.message || "Error"));
    } finally {
      setIsLoadingReports(false);
    }
  }, [reportClassId, reportSectionId, reportFromDate, reportToDate]);

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, fetchReports]);

  // Load an existing session into Roll Call tab from Report Table
  const handleEditFromReport = (summary: DateWiseSessionSummary) => {
    setSelectedClassId(summary.class_id);
    setSelectedSectionId(summary.section_id);
    setSelectedDate(summary.session_date);
    setActiveTab("rollcall");
    toast.info(`Loaded attendance session for ${summary.class_name} - Sec ${summary.section_name} on ${summary.session_date}`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (reportSummaries.length === 0) {
      toast.error("No report data available to export");
      return;
    }
    const headers = "Session Date,Class,Section,Total Students,Present,Absent,Late,Excused,Attendance %\n";
    const rows = reportSummaries
      .map(
        (s) =>
          `"${s.session_date}","${s.class_name}","${s.section_name}",${s.total_students},${s.present_count},${s.absent_count},${s.late_count},${s.excused_count},${s.attendance_percentage}%`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DMHS_Attendance_Report_${reportFromDate}_to_${reportToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance report downloaded successfully");
  };

  // Roll-call statistics
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const pct = total > 0 ? Math.round(((present + late * 0.5) / total) * 10000) / 100 : 100;
    return { total, present, absent, late, excused, pct };
  }, [records]);

  // Filtered student list for search
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        (r.roll_number && r.roll_number.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  // Report Columns
  const reportColumns: Column<DateWiseSessionSummary>[] = [
    {
      key: "session_date",
      header: "Date",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-light-primary dark:text-dark-primary">
          {row.session_date}
        </span>
      ),
    },
    {
      key: "class_name",
      header: "Class & Section",
      render: (row) => (
        <span className="font-bold text-light-primary dark:text-dark-primary text-xs">
          {row.class_name} • Sec {row.section_name}
        </span>
      ),
    },
    {
      key: "total_students",
      header: "Enrolled",
      render: (row) => <span className="text-xs font-semibold">{row.total_students}</span>,
    },
    {
      key: "present_count",
      header: "Present",
      render: (row) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {row.present_count}
        </span>
      ),
    },
    {
      key: "absent_count",
      header: "Absent",
      render: (row) => (
        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
          {row.absent_count}
        </span>
      ),
    },
    {
      key: "late_count",
      header: "Late",
      render: (row) => (
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          {row.late_count}
        </span>
      ),
    },
    {
      key: "attendance_percentage",
      header: "Turnout %",
      render: (row) => (
        <Badge
          variant={row.attendance_percentage >= 75 ? "success" : "danger"}
          size="sm"
        >
          {row.attendance_percentage}%
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditFromReport(row)}
          leftIcon={<Edit2 className="w-3.5 h-3.5 text-brand-gold" />}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Register & Daily Roll Call"
        subtitle="Telangana SSC compliant roll-call register, live database synchronization, and date-wise audit reports"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "rollcall" ? "primary" : "outline"}
              size="sm"
              leftIcon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => setActiveTab("rollcall")}
            >
              Daily Roll Call
            </Button>
            <Button
              variant={activeTab === "reports" ? "primary" : "outline"}
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setActiveTab("reports")}
            >
              Date-Wise Reports
            </Button>
          </div>
        }
      />

      {/* TAB 1: DAILY ROLL CALL */}
      {activeTab === "rollcall" && (
        <div className="space-y-6">
          {/* Controls Bar: Class, Section, Date */}
          <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={availableSections.length === 0}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none disabled:opacity-50"
                >
                  {availableSections.length === 0 ? (
                    <option value="">No active sections</option>
                  ) : (
                    availableSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name} {s.room_number ? `(Room ${s.room_number})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={loadRollCall}
                  isLoading={isLoadingStudents}
                >
                  Refresh List
                </Button>
              </div>
            </div>

            {/* Session Mode Indicator & Batch Actions */}
            <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isExistingSession ? (
                  <Badge variant="gold" size="sm">
                    ● Saved Attendance Loaded (Editing Mode)
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    ○ New Session (Unsaved)
                  </Badge>
                )}
                <span className="text-xs text-light-secondary dark:text-dark-secondary">
                  {records.length} students enrolled in this section
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                  onClick={() => markAllAs("present")}
                  disabled={records.length === 0 || isSaving}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  onClick={() => markAllAs("absent")}
                  disabled={records.length === 0 || isSaving}
                >
                  Mark All Absent
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
              <p className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
                Total Students
              </p>
              <p className="text-lg font-bold text-light-primary dark:text-dark-primary">
                {stats.total}
              </p>
            </Card>

            <Card className="p-3 text-center bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                Present
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.present}
              </p>
            </Card>

            <Card className="p-3 text-center bg-rose-500/5 border border-rose-500/20">
              <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">
                Absent
              </p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {stats.absent}
              </p>
            </Card>

            <Card className="p-3 text-center bg-amber-500/5 border border-amber-500/20">
              <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                Late Arrival
              </p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {stats.late}
              </p>
            </Card>

            <Card className="p-3 text-center bg-brand-gold/10 border border-brand-gold/30">
              <p className="text-[10px] uppercase font-bold text-brand-gold">Turnout</p>
              <p className="text-lg font-bold text-brand-gold">{stats.pct}%</p>
            </Card>
          </div>

          {/* Search Roll-Call Filter */}
          <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student roll, name, or admission..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
            <p className="text-xs text-light-secondary dark:text-dark-secondary hidden sm:block">
              Click status pills to change student attendance
            </p>
          </div>

          {/* Student Roll Call Table */}
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
            {isLoadingStudents ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-light-secondary dark:text-dark-secondary">
                  Loading section students from persistent database...
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-light-secondary dark:text-dark-secondary">
                No active students found in this class & section.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-dark-elevated/50 text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-bold tracking-wider border-b border-light-border dark:border-dark-border">
                    <tr>
                      <th className="py-3 px-4">Roll</th>
                      <th className="py-3 px-4">Admission No</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-center">Attendance Status</th>
                      <th className="py-3 px-4">Remarks (Optional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredRecords.map((row) => (
                      <tr
                        key={String(row.student_id)}
                        className="hover:bg-gray-50/60 dark:hover:bg-dark-elevated/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-light-primary dark:text-dark-primary">
                          {row.roll_number}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-brand-gold">
                          {row.admission_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {row.photo_url ? (
                              <img
                                src={row.photo_url}
                                alt={row.full_name}
                                className="w-7 h-7 rounded-full object-cover border border-brand-gold/30 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold text-xs shrink-0">
                                {row.full_name.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-light-primary dark:text-dark-primary">
                              {row.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.student_id, "present")}
                              className={`px-2.5 py-1 rounded font-bold text-[11px] transition-all ${
                                row.status === "present"
                                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              }`}
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.student_id, "absent")}
                              className={`px-2.5 py-1 rounded font-bold text-[11px] transition-all ${
                                row.status === "absent"
                                  ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30"
                                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              }`}
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.student_id, "late")}
                              className={`px-2.5 py-1 rounded font-bold text-[11px] transition-all ${
                                row.status === "late"
                                  ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30"
                                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              }`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.student_id, "excused")}
                              className={`px-2.5 py-1 rounded font-bold text-[11px] transition-all ${
                                row.status === "excused"
                                  ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30"
                                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-sky-50 dark:hover:bg-sky-950/20"
                              }`}
                            >
                              E
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => handleRemarksChange(row.student_id, e.target.value)}
                            placeholder="e.g. Bus delay, leave letter..."
                            className="w-full text-xs px-2.5 py-1 rounded bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="p-4 bg-gray-50 dark:bg-dark-elevated/40 border-t border-light-border dark:border-dark-border flex items-center justify-between">
              <div className="text-xs text-light-secondary dark:text-dark-secondary">
                <span>Turnout: </span>
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  {stats.present} / {stats.total} Present ({stats.pct}%)
                </span>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveAttendance}
                isLoading={isSaving}
                disabled={records.length === 0}
                leftIcon={<CalendarCheck className="w-4 h-4" />}
              >
                {isExistingSession ? "Update Attendance Session" : "Save Daily Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATE-WISE REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Filter Class
                </label>
                <select
                  value={reportClassId}
                  onChange={(e) => {
                    setReportClassId(e.target.value);
                    setReportSectionId("");
                  }}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  onClick={fetchReports}
                  isLoading={isLoadingReports}
                >
                  Apply Filter
                </Button>
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportCSV}
                  disabled={reportSummaries.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Summaries Table */}
          <Table
            columns={reportColumns}
            data={reportSummaries}
            keyExtractor={(row) => String(row.session_id)}
            isLoading={isLoadingReports}
          />
        </div>
      )}
    </div>
  );
};
