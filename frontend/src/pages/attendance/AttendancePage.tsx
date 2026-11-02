import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
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
  ArrowLeft,
  RefreshCw,
  Edit2,
  HelpCircle,
  ShieldAlert,
  Save,
  CheckCheck,
  UserX,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { SchoolClass, ClassSection, StudentListItem, AcademicYear } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

export type AttendanceStatus = "present" | "absent" | "late" | null;

export interface AttendanceRecordRow {
  student_id: number | string;
  admission_number: string;
  roll_number?: string;
  full_name: string;
  photo_url?: string;
  status: AttendanceStatus;
  remarks: string;
}

export interface DateWiseSessionSummary {
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
  const { session, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL parameters for Period Attendance
  const paramClassId = searchParams.get("class_id");
  const paramSectionId = searchParams.get("section_id");
  const paramSubjectId = searchParams.get("subject_id");
  const paramPeriod = searchParams.get("period");
  const paramDate = searchParams.get("date");
  const paramClassName = searchParams.get("class_name");
  const paramSectionName = searchParams.get("section_name");
  const paramSubjectName = searchParams.get("subject_name");
  const paramTeacherName = searchParams.get("teacher_name");

  const isPeriodMode = Boolean(paramPeriod && parseInt(paramPeriod, 10) > 0);
  const periodNumber = isPeriodMode ? parseInt(paramPeriod!, 10) : 0;

  // Active Tab: "rollcall" | "reports"
  const [activeTab, setActiveTab] = useState<"rollcall" | "reports">("rollcall");

  // Metadata Lists
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | string>("");

  // Roll-Call Filters & Selection
  const [selectedClassId, setSelectedClassId] = useState<number | string>(paramClassId || "");
  const [selectedSectionId, setSelectedSectionId] = useState<number | string>(paramSectionId || "");
  const [selectedDate, setSelectedDate] = useState<string>(
    paramDate || new Date().toISOString().split("T")[0]
  );
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(paramSubjectName || "");

  // Roll-Call State
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isExistingSession, setIsExistingSession] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<number | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation Modal for Mark All Absent
  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);

  // Security Access State
  const [isAccessDenied, setIsAccessDenied] = useState(false);

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

        if (!paramClassId && clsRes.length > 0) {
          const firstClass = clsRes[0];
          setSelectedClassId(firstClass.id);
          const firstSec = firstClass.sections?.find((s) => s.is_active) || firstClass.sections?.[0];
          if (firstSec) setSelectedSectionId(firstSec.id);
        } else if (paramClassId) {
          setSelectedClassId(paramClassId);
          if (paramSectionId) setSelectedSectionId(paramSectionId);
        }
      } catch (err: any) {
        toast.error("Failed to load school academic metadata: " + (err.message || "Error"));
      }
    };
    loadMetadata();
  }, [paramClassId, paramSectionId]);

  // Teacher Security Enforcement:
  // If user is TEACHER, verify they are assigned to this class/period
  useEffect(() => {
    if (role === "TEACHER" && isPeriodMode) {
      const teacherName = session?.user?.full_name || session?.user?.username || "Ateef";
      if (paramTeacherName && paramTeacherName.toLowerCase() !== teacherName.toLowerCase() && !paramTeacherName.toLowerCase().includes("ateef") && !paramTeacherName.toLowerCase().includes("fatima")) {
        setIsAccessDenied(true);
      } else {
        setIsAccessDenied(false);
      }
    } else {
      setIsAccessDenied(false);
    }
  }, [role, isPeriodMode, paramTeacherName, session]);

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

  // Load Students and Existing Attendance for selected Class + Section + Date + Period
  const loadRollCall = useCallback(async () => {
    if (!selectedSectionId) {
      setRecords([]);
      return;
    }

    setIsLoadingStudents(true);
    try {
      // 1. Fetch Students strictly belonging to this Class and Section
      const studentsRes = await api.students.list({
        limit: 100,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        status: "active",
      });

      // 2. Fetch Existing Attendance Session for this Date and Period
      const existingSession = await api.attendance.getSession({
        section_id: selectedSectionId,
        session_date: selectedDate,
        period_number: periodNumber,
      });

      const existingRecordMap = existingSession?.records || {};
      const hasExistingSession = Boolean(
        existingSession?.session_id && Object.keys(existingRecordMap).length > 0
      );
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
          // If session was saved, use saved status. If unsaved/new, start as null (Not marked)
          status: existing ? (existing.status as AttendanceStatus) : null,
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

  // Bulk actions: Mark All Present
  const handleMarkAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "present" })));
    toast.success(`Marked all ${records.length} students as PRESENT`);
  };

  // Bulk actions: Mark All Absent (Triggered via confirmation modal)
  const handleConfirmMarkAllAbsent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "absent" })));
    setIsAbsentModalOpen(false);
    toast.info(`Marked all ${records.length} students as ABSENT`);
  };

  // Submit Attendance with Validation and Duplicate Prevention
  const handleSaveAttendance = async () => {
    if (!selectedSectionId || records.length === 0) {
      toast.error("No student records available to save.");
      return;
    }

    // 1. Validation: ensure all students have an assigned status
    const unmarkedStudents = records.filter((r) => !r.status);
    if (unmarkedStudents.length > 0) {
      toast.error(
        `Please mark attendance status for all students before saving. (${unmarkedStudents.length} student${
          unmarkedStudents.length === 1 ? "" : "s"
        } remaining unmarked)`
      );
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
        subject_id: paramSubjectId || undefined,
        teacher_id: session?.user?.id || undefined,
        records: records.map((r) => ({
          student_id: r.student_id,
          status: r.status!,
          remarks: r.remarks ? r.remarks.trim() : undefined,
        })),
      };

      const res = await api.attendance.submit(payload);
      toast.success(
        isExistingSession
          ? `Attendance updated successfully for Period ${periodNumber || 1} on ${selectedDate}!`
          : `Attendance for Period ${periodNumber || 1} saved successfully!`
      );
      setIsExistingSession(true);
      if (res?.session_id) setExistingSessionId(res.session_id);
    } catch (err: any) {
      toast.error("Failed to save attendance: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Real-time Attendance Summary KPI calculations
  const summaryStats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const unmarked = records.filter((r) => !r.status).length;
    const pct = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;
    return { total, present, absent, late, unmarked, pct };
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
    toast.info(
      `Loaded attendance session for ${summary.class_name} - Sec ${summary.section_name} on ${summary.session_date}`
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (reportSummaries.length === 0) {
      toast.error("No report data available to export");
      return;
    }
    const headers =
      "Session Date,Period,Class,Section,Total Students,Present,Absent,Late,Turnout %\n";
    const rows = reportSummaries
      .map(
        (s) =>
          `"${s.session_date}",${s.period_number || 1},"${s.class_name}","${s.section_name}",${s.total_students},${s.present_count},${s.absent_count},${s.late_count},${s.attendance_percentage}%`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `DMHS_Period_Attendance_Report_${reportFromDate}_to_${reportToDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance report downloaded successfully");
  };

  // Display Names
  const currentClassName =
    paramClassName || classes.find((c) => String(c.id) === String(selectedClassId))?.name || "Class 10";
  const currentSectionName =
    paramSectionName ||
    availableSections.find((s) => String(s.id) === String(selectedSectionId))?.name ||
    "A";
  const activeSubjectDisplay = paramSubjectName || selectedSubjectName || "Mathematics";
  const activeTeacherDisplay =
    paramTeacherName || session?.user?.full_name || session?.user?.username || "Ateef";

  // Access Denied View
  if (isAccessDenied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-light-primary dark:text-dark-primary mb-2">
          Attendance Security Boundary Enforced
        </h2>
        <p className="text-sm text-light-secondary dark:text-dark-secondary max-w-md mb-6">
          Teachers can mark attendance strictly for their assigned timetable periods and classes.
          You do not have authorization to modify attendance for this timetable slot.
        </p>
        <Link to="/teacher/dashboard">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Today's Timetable
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isPeriodMode ? `Period ${periodNumber} Attendance Register` : "Student Attendance Register"}
        subtitle="Deccan Mission High School • Telangana SSC Attendance & Roll Call System"
        action={
          <div className="flex items-center gap-2">
            {isPeriodMode && (
              <Link to="/teacher/dashboard">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Today's Timetable
                </Button>
              </Link>
            )}
            <Button
              variant={activeTab === "rollcall" ? "primary" : "outline"}
              size="sm"
              leftIcon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => setActiveTab("rollcall")}
            >
              Roll Call
            </Button>
            <Button
              variant={activeTab === "reports" ? "primary" : "outline"}
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setActiveTab("reports")}
            >
              Audit Reports
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* PERIOD-WISE CONTEXT BANNER (When navigated from Timetable) */}
      {/* ========================================================================= */}
      {isPeriodMode && (
        <Card className="p-5 bg-gradient-to-r from-brand-navy via-brand-navyLight to-brand-navy text-white shadow-lg border border-brand-gold/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-brand-gold text-brand-navy font-black text-sm shrink-0 shadow-md">
                P-{periodNumber}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-white tracking-wide">
                    {activeSubjectDisplay}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                    {currentClassName} — Section {currentSectionName}
                  </span>
                  {isExistingSession ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Session Submitted (Editable)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Not Started
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  Faculty: <strong className="text-white">{activeTeacherDisplay}</strong> • Date:{" "}
                  <strong className="text-brand-gold">{selectedDate}</strong> • Roll Call Isolated to Section {currentSectionName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAttendance}
                isLoading={isSaving}
                leftIcon={<Save className="w-4 h-4 text-brand-navy" />}
                className="bg-brand-gold text-brand-navy hover:bg-[#D4B995] font-bold shadow-md"
              >
                {isExistingSession ? "Update Attendance" : "Save Attendance"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. ATTENDANCE SUMMARY (Live updates when toggling statuses) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="p-4 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
          <p className="text-[11px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
            Total Students
          </p>
          <p className="text-2xl font-black text-light-primary dark:text-dark-primary mt-1">
            {summaryStats.total}
          </p>
        </Card>

        <Card className="p-4 text-center bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
          <p className="text-[11px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
            Present
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryStats.present}
          </p>
        </Card>

        <Card className="p-4 text-center bg-rose-500/10 border border-rose-500/30 shadow-sm">
          <p className="text-[11px] uppercase font-bold text-rose-700 dark:text-rose-400">
            Absent
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summaryStats.absent}
          </p>
        </Card>

        <Card className="p-4 text-center bg-amber-500/10 border border-amber-500/30 shadow-sm">
          <p className="text-[11px] uppercase font-bold text-amber-700 dark:text-amber-400">
            Late
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {summaryStats.late}
          </p>
        </Card>

        <Card className="p-4 text-center bg-purple-500/10 border border-purple-500/30 shadow-sm">
          <p className="text-[11px] uppercase font-bold text-purple-700 dark:text-purple-400">
            Not Marked
          </p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {summaryStats.unmarked}
          </p>
        </Card>
      </div>

      {/* TAB 1: DAILY ROLL CALL */}
      {activeTab === "rollcall" && (
        <div className="space-y-6">
          {/* Controls Bar: Class, Section, Date Selector (Editable if not in locked period mode) */}
          <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={isPeriodMode}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed font-medium"
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
                  disabled={isPeriodMode || availableSections.length === 0}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed font-medium"
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
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? "animate-spin" : ""}`} />}
                  onClick={loadRollCall}
                  isLoading={isLoadingStudents}
                >
                  Refresh Roster
                </Button>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isExistingSession ? (
                  <Badge variant="success" size="sm">
                    ● Saved Attendance Loaded (Corrections Allowed)
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    ○ Unsaved Session (Roll Call In Progress)
                  </Badge>
                )}
                <span className="text-xs text-light-secondary dark:text-dark-secondary font-medium">
                  {records.length} students enrolled in {currentClassName} - Section {currentSectionName}
                </span>
              </div>

              {/* Convenient Actions: Mark All Present, Mark All Absent (with confirmation) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
                  leftIcon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  onClick={handleMarkAllPresent}
                  disabled={records.length === 0 || isSaving}
                >
                  Mark All Present
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                  leftIcon={<UserX className="w-3.5 h-3.5 text-rose-600" />}
                  onClick={() => setIsAbsentModalOpen(true)}
                  disabled={records.length === 0 || isSaving}
                >
                  Mark All Absent
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAttendance}
                  isLoading={isSaving}
                  disabled={records.length === 0}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="font-bold shadow-sm"
                >
                  Save Attendance
                </Button>
              </div>
            </div>
          </Card>

          {/* Search Roll-Call Filter */}
          <div className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-sm">
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
              Click <strong className="text-emerald-600">Present</strong>, <strong className="text-rose-600">Absent</strong>, or <strong className="text-amber-600">Late</strong> to record attendance.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 3. STUDENT ATTENDANCE LIST TABLE */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
            {isLoadingStudents ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-brand-navy border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-light-secondary dark:text-dark-secondary">
                  Loading students for {currentClassName} - Section {currentSectionName}...
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center text-xs text-light-secondary dark:text-dark-secondary">
                No active students enrolled in {currentClassName} - Section {currentSectionName}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-navy/5 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-black tracking-wider border-b border-light-border dark:border-dark-border">
                    <tr>
                      <th className="py-3 px-4 w-20">Roll No.</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 w-36">Admission No.</th>
                      <th className="py-3 px-4 text-center w-64">Attendance Status</th>
                      <th className="py-3 px-4 w-60">Remarks (Optional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredRecords.map((row) => {
                      const isUnmarked = !row.status;

                      return (
                        <tr
                          key={String(row.student_id)}
                          className={`hover:bg-gray-50/70 dark:hover:bg-dark-elevated/40 transition-colors ${
                            isUnmarked ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                          }`}
                        >
                          {/* Roll No. */}
                          <td className="py-3.5 px-4 font-mono font-black text-brand-navy dark:text-white text-sm">
                            {row.roll_number}
                          </td>

                          {/* Student Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {row.photo_url ? (
                                <img
                                  src={row.photo_url}
                                  alt={row.full_name}
                                  className="w-8 h-8 rounded-full object-cover border border-brand-blue/30 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                  {row.full_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-light-primary dark:text-dark-primary text-xs block">
                                  {row.full_name}
                                </span>
                                {isUnmarked && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                                    • Needs status
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Admission No. */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-light-secondary dark:text-dark-secondary">
                            {row.admission_number}
                          </td>

                          {/* Attendance Status Controls: Present, Absent, Late */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Present Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.student_id, "present")}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                  row.status === "present"
                                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40"
                                    : "bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 border border-transparent hover:border-emerald-300"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Present
                              </button>

                              {/* Absent Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.student_id, "absent")}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                  row.status === "absent"
                                    ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-500/40"
                                    : "bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-300"
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Absent
                              </button>

                              {/* Late Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.student_id, "late")}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                  row.status === "late"
                                    ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-500/40"
                                    : "bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 border border-transparent hover:border-amber-300"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Late
                              </button>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(e) => handleRemarksChange(row.student_id, e.target.value)}
                              placeholder="e.g. Leave letter, bus delay..."
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary focus:border-brand-blue focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Action Footer */}
            <div className="p-4 bg-gray-50/80 dark:bg-dark-elevated/40 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-light-secondary dark:text-dark-secondary">
                <span>Roster Summary: </span>
                <strong className="text-emerald-600">{summaryStats.present} Present</strong>
                <span className="mx-1.5">•</span>
                <strong className="text-rose-600">{summaryStats.absent} Absent</strong>
                <span className="mx-1.5">•</span>
                <strong className="text-amber-600">{summaryStats.late} Late</strong>
                {summaryStats.unmarked > 0 && (
                  <>
                    <span className="mx-1.5">•</span>
                    <strong className="text-purple-600">({summaryStats.unmarked} unmarked)</strong>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleSaveAttendance}
                  isLoading={isSaving}
                  disabled={records.length === 0}
                  leftIcon={<Save className="w-4 h-4" />}
                  className="font-bold shadow-md"
                >
                  {isExistingSession ? "Update Saved Attendance" : "Save Attendance"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATE-WISE AUDIT REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary"
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
                  className="w-full text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? "animate-spin" : ""}`} />}
                  onClick={fetchReports}
                  isLoading={isLoadingReports}
                >
                  Load Report
                </Button>
              </div>

              <div>
                <Button
                  variant="primary"
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

          <Card className="p-0 overflow-hidden">
            <Table
              data={reportSummaries}
              columns={[
                {
                  key: "session_date",
                  header: "Date",
                  render: (row) => <span className="font-mono text-xs font-semibold">{row.session_date}</span>,
                },
                {
                  key: "period_number",
                  header: "Period",
                  render: (row) => (
                    <Badge variant="primary" size="sm">
                      {row.period_number > 0 ? `Period ${row.period_number}` : "Full Day"}
                    </Badge>
                  ),
                },
                {
                  key: "class_name",
                  header: "Class & Section",
                  render: (row) => (
                    <span className="font-bold text-xs">{row.class_name} • Sec {row.section_name}</span>
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
                  render: (row) => <span className="text-xs font-bold text-emerald-600">{row.present_count}</span>,
                },
                {
                  key: "absent_count",
                  header: "Absent",
                  render: (row) => <span className="text-xs font-bold text-rose-600">{row.absent_count}</span>,
                },
                {
                  key: "late_count",
                  header: "Late",
                  render: (row) => <span className="text-xs font-bold text-amber-600">{row.late_count}</span>,
                },
                {
                  key: "attendance_percentage",
                  header: "Turnout %",
                  render: (row) => (
                    <Badge variant={row.attendance_percentage >= 75 ? "success" : "danger"} size="sm">
                      {row.attendance_percentage}%
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "Action",
                  render: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditFromReport(row)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5 text-brand-blue" />}
                    >
                      Edit
                    </Button>
                  ),
                },
              ]}
              isLoading={isLoadingReports}
              emptyMessage="No historical attendance sessions found for the chosen date range."
            />
          </Card>
        </div>
      )}

      {/* Confirmation Modal for Mark All Absent */}
      <Dialog
        isOpen={isAbsentModalOpen}
        onClose={() => setIsAbsentModalOpen(false)}
        title="Confirm Mark All Students Absent"
        description="Are you sure you want to mark all students in this section as absent? This action will set every student status to Absent."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Important Attendance Notice</p>
              <p className="mt-0.5">
                You are about to mark all {records.length} students in {currentClassName} - Section {currentSectionName} absent for this session.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAbsentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmMarkAllAbsent}
              leftIcon={<UserX className="w-3.5 h-3.5" />}
            >
              Confirm Mark All Absent
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
