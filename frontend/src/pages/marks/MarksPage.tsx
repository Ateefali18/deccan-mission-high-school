import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileSpreadsheet,
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  Download,
  Filter,
  Save,
  RefreshCw,
  BookOpen,
  Layers,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { SchoolClass } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";

interface ExamItem {
  id: number | string;
  name: string;
  is_published: boolean;
}

interface SubjectItem {
  id: number | string;
  name: string;
  code: string;
  department?: string;
}

interface StudentMarksRow {
  student_id: number | string;
  admission_number: string;
  roll_number?: string;
  full_name: string;
  marks_obtained: string | number; // String during typing
  is_absent: boolean;
  remarks: string;
  is_saved?: boolean;
}

interface ClassResultRow {
  student_id: number | string;
  admission_number: string;
  full_name: string;
  total_max: number;
  total_obtained: number;
  percentage: number;
  grade: string;
  status: string;
  rank: number;
  subjects_recorded: number;
  total_subjects: number;
}

export const MarksPage: React.FC = () => {
  const { session } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"entry" | "results">("entry");

  // Selection state
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedExamId, setSelectedExamId] = useState<string | number>("");
  const [selectedClassId, setSelectedClassId] = useState<string | number>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | number>("");
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

  // Exam Paper Config
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(35);

  // Student Marks Rows
  const [rows, setRows] = useState<StudentMarksRow[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab 2: Results
  const [results, setResults] = useState<ClassResultRow[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Sections for selected class
  const availableSections = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find((c) => String(c.id) === String(selectedClassId));
    return cls?.sections?.filter((s) => s.is_active) || [];
  }, [classes, selectedClassId]);

  // Load Initial Metadata (Exams, Classes, Subjects)
  useEffect(() => {
    const init = async () => {
      try {
        const [examsRes, classesRes, subjectsRes] = await Promise.all([
          api.exams.list(),
          api.classes.list(),
          api.subjects.list(),
        ]);
        setExams(examsRes);
        setClasses(classesRes);
        setSubjects(subjectsRes);

        if (examsRes.length > 0) setSelectedExamId(examsRes[0].id);
        if (classesRes.length > 0) {
          const firstCls = classesRes[0];
          setSelectedClassId(firstCls.id);
          const firstSec = firstCls.sections?.find((s) => s.is_active) || firstCls.sections?.[0];
          if (firstSec) setSelectedSectionId(firstSec.id);
        }
        if (subjectsRes.length > 0) setSelectedSubjectName(subjectsRes[0].name);
      } catch (err: any) {
        toast.error("Failed to load academic metadata: " + (err.message || "Error"));
      }
    };
    init();
  }, []);

  // Handle Class change
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => String(c.id) === String(newClassId));
    const firstSec = cls?.sections?.find((s) => s.is_active) || cls?.sections?.[0];
    if (firstSec) setSelectedSectionId(firstSec.id);
    else setSelectedSectionId("");
  };

  // Load Marks Entry Sheet
  const loadSheet = useCallback(async () => {
    if (!selectedExamId || !selectedClassId || !selectedSectionId || !selectedSubjectName) {
      setRows([]);
      return;
    }

    setIsLoadingSheet(true);
    try {
      const sheet = await api.marks.getEntrySheet({
        exam_id: selectedExamId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        subject_name: selectedSubjectName,
      });

      setMaxMarks(sheet.max_marks || 100);
      setPassingMarks(sheet.passing_marks || 35);

      const anySaved = sheet.students.some((s: any) => s.is_saved);
      setHasExistingMarks(anySaved);

      setRows(
        sheet.students.map((s: any) => ({
          student_id: s.student_id,
          admission_number: s.admission_number,
          roll_number: s.roll_number,
          full_name: s.full_name,
          marks_obtained: s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : "",
          is_absent: Boolean(s.is_absent),
          remarks: s.remarks || "",
          is_saved: s.is_saved,
        }))
      );
    } catch (err: any) {
      toast.error("Failed to load marks entry sheet: " + (err.message || "Error"));
    } finally {
      setIsLoadingSheet(false);
    }
  }, [selectedExamId, selectedClassId, selectedSectionId, selectedSubjectName]);

  useEffect(() => {
    if (selectedExamId && selectedClassId && selectedSectionId && selectedSubjectName) {
      loadSheet();
    }
  }, [loadSheet]);

  // Handle Marks change with validation against max marks
  const handleMarkChange = (studentId: string | number, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (String(r.student_id) === String(studentId)) {
          return { ...r, marks_obtained: value, is_absent: false };
        }
        return r;
      })
    );
  };

  // Handle Absent checkbox
  const handleAbsentToggle = (studentId: string | number, isAbsent: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (String(r.student_id) === String(studentId)) {
          return {
            ...r,
            is_absent: isAbsent,
            marks_obtained: isAbsent ? "" : r.marks_obtained,
          };
        }
        return r;
      })
    );
  };

  // Handle Remarks change
  const handleRemarksChange = (studentId: string | number, remarks: string) => {
    setRows((prev) =>
      prev.map((r) =>
        String(r.student_id) === String(studentId) ? { ...r, remarks } : r
      )
    );
  };

  // Compute SSC Grade
  const getGradeForMark = (markStr: string | number, isAbsent: boolean) => {
    if (isAbsent) return { grade: "ABS", variant: "neutral" as const };
    if (markStr === "" || markStr === null || markStr === undefined) return { grade: "—", variant: "neutral" as const };
    const num = Number(markStr);
    if (isNaN(num)) return { grade: "ERR", variant: "danger" as const };
    if (num > maxMarks) return { grade: "INVALID", variant: "danger" as const };

    const pct = (num / maxMarks) * 100;
    if (pct >= 91) return { grade: "A1", variant: "success" as const };
    if (pct >= 81) return { grade: "A2", variant: "success" as const };
    if (pct >= 71) return { grade: "B1", variant: "gold" as const };
    if (pct >= 61) return { grade: "B2", variant: "gold" as const };
    if (pct >= 51) return { grade: "C1", variant: "neutral" as const };
    if (pct >= 41) return { grade: "C2", variant: "neutral" as const };
    if (pct >= 33) return { grade: "D", variant: "neutral" as const };
    return { grade: "E", variant: "danger" as const };
  };

  // Check for any validation errors
  const validationError = useMemo(() => {
    for (const r of rows) {
      if (!r.is_absent && r.marks_obtained !== "") {
        const num = Number(r.marks_obtained);
        if (isNaN(num) || num < 0) {
          return `Invalid marks entry for ${r.full_name}: Marks must be a positive number.`;
        }
        if (num > maxMarks) {
          return `Validation Error: Marks for ${r.full_name} (${num}) exceed maximum marks (${maxMarks}).`;
        }
      }
    }
    return null;
  }, [rows, maxMarks]);

  // Save Marks
  const handleSaveMarks = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (rows.length === 0) {
      toast.error("No student entries to save.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        exam_id: selectedExamId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        subject_name: selectedSubjectName,
        max_marks: Number(maxMarks),
        passing_marks: Number(passingMarks),
        entries: rows.map((r) => ({
          student_id: r.student_id,
          marks_obtained: r.is_absent || r.marks_obtained === "" ? null : Number(r.marks_obtained),
          is_absent: r.is_absent,
          remarks: r.remarks || undefined,
        })),
      };

      const res = await api.marks.save(payload);
      toast.success(res.message || "Marks recorded successfully!");
      setHasExistingMarks(true);
      loadSheet();
    } catch (err: any) {
      toast.error("Failed to save marks: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Load Results Tab
  const loadResults = useCallback(async () => {
    if (!selectedExamId || !selectedClassId) return;
    setIsLoadingResults(true);
    try {
      const res = await api.marks.getClassResults({
        exam_id: selectedExamId,
        class_id: selectedClassId,
        section_id: selectedSectionId || undefined,
      });
      setResults(res);
    } catch (err: any) {
      toast.error("Failed to load class marksheet: " + (err.message || "Error"));
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedExamId, selectedClassId, selectedSectionId]);

  useEffect(() => {
    if (activeTab === "results") {
      loadResults();
    }
  }, [activeTab, loadResults]);

  // Export Results CSV
  const handleExportResultsCSV = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }
    const headers = "Rank,Admission No,Student Name,Total Obtained,Max Marks,Percentage,SSC Grade,Status\n";
    const body = results
      .map(
        (r) =>
          `${r.rank},"${r.admission_number}","${r.full_name}",${r.total_obtained},${r.total_max},${r.percentage}%,${r.grade},${r.status}`
      )
      .join("\n");

    const blob = new Blob([headers + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DMHS_Results_Class_${selectedClassId}_Exam_${selectedExamId}.csv`;
    link.click();
    toast.success("Results exported to CSV successfully");
  };

  // Filtered rows for Search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        (r.roll_number && r.roll_number.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = rows.length;
    const filled = rows.filter((r) => r.is_absent || (r.marks_obtained !== "" && r.marks_obtained !== null)).length;
    const validMarks = rows
      .filter((r) => !r.is_absent && r.marks_obtained !== "" && !isNaN(Number(r.marks_obtained)))
      .map((r) => Number(r.marks_obtained));

    const avg = validMarks.length > 0 ? (validMarks.reduce((a, b) => a + b, 0) / validMarks.length).toFixed(1) : "—";
    const highest = validMarks.length > 0 ? Math.max(...validMarks) : "—";
    const lowest = validMarks.length > 0 ? Math.min(...validMarks) : "—";
    const passCount = validMarks.filter((m) => m >= passingMarks).length;

    return { total, filled, avg, highest, lowest, passCount };
  }, [rows, passingMarks]);

  // Results Columns
  const resultColumns: Column<ClassResultRow>[] = [
    {
      key: "rank",
      header: "Rank",
      render: (row) => (
        <span className="font-mono font-bold text-xs text-brand-gold">
          #{row.rank}
        </span>
      ),
    },
    {
      key: "admission_number",
      header: "Admission No",
      render: (row) => <span className="font-mono text-xs">{row.admission_number}</span>,
    },
    {
      key: "full_name",
      header: "Student Name",
      render: (row) => (
        <span className="font-bold text-light-primary dark:text-dark-primary text-xs">
          {row.full_name}
        </span>
      ),
    },
    {
      key: "total_obtained",
      header: "Marks Obtained",
      render: (row) => (
        <span className="font-mono font-bold text-xs">
          {row.total_obtained} / {row.total_max}
        </span>
      ),
    },
    {
      key: "percentage",
      header: "Turnout %",
      render: (row) => (
        <span className="font-mono font-bold text-xs">{row.percentage}%</span>
      ),
    },
    {
      key: "grade",
      header: "SSC Grade",
      render: (row) => (
        <Badge
          variant={
            row.grade.startsWith("A")
              ? "success"
              : row.grade.startsWith("B")
              ? "gold"
              : row.grade.startsWith("E")
              ? "danger"
              : "neutral"
          }
          size="sm"
        >
          {row.grade}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "Passed" ? "success" : "danger"} size="sm">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Marks & Results Ledger"
        subtitle="Telangana SSC grading, multi-subject marks ledger, validation against maximum marks, and class rankings"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "entry" ? "primary" : "outline"}
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => setActiveTab("entry")}
            >
              Enter Marks
            </Button>
            <Button
              variant={activeTab === "results" ? "primary" : "outline"}
              size="sm"
              leftIcon={<Award className="w-4 h-4" />}
              onClick={() => setActiveTab("results")}
            >
              View Results & Rankings
            </Button>
          </div>
        }
      />

      {/* Filter / Selector Bar */}
      <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

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
                    Section {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              Subject
            </label>
            <select
              value={selectedSubjectName}
              onChange={(e) => setSelectedSubjectName(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Paper settings & Status Mode */}
        {activeTab === "entry" && (
          <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              {hasExistingMarks ? (
                <Badge variant="gold" size="sm">
                  ● Saved Marks Loaded (Editing Mode)
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  ○ Fresh Entry Sheet
                </Badge>
              )}
              <span className="text-light-secondary dark:text-dark-secondary">
                {rows.length} students enrolled
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-light-secondary dark:text-dark-secondary">Max Marks:</span>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  min={10}
                  max={500}
                  className="w-16 px-2 py-1 rounded bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border font-mono text-center focus:border-brand-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-light-secondary dark:text-dark-secondary">Passing Marks:</span>
                <input
                  type="number"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                  min={0}
                  max={maxMarks}
                  className="w-16 px-2 py-1 rounded bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border font-mono text-center focus:border-brand-gold focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* TAB 1: MARKS ENTRY SHEET */}
      {activeTab === "entry" && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
              <p className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
                Total Enrolled
              </p>
              <p className="text-lg font-bold text-light-primary dark:text-dark-primary font-mono">
                {summaryMetrics.total}
              </p>
            </Card>

            <Card className="p-3 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
              <p className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
                Marks Recorded
              </p>
              <p className="text-lg font-bold text-light-primary dark:text-dark-primary font-mono">
                {summaryMetrics.filled} / {summaryMetrics.total}
              </p>
            </Card>

            <Card className="p-3 text-center bg-brand-gold/10 border border-brand-gold/30">
              <p className="text-[10px] uppercase font-bold text-brand-gold">Class Average</p>
              <p className="text-lg font-bold text-brand-gold font-mono">
                {summaryMetrics.avg} / {maxMarks}
              </p>
            </Card>

            <Card className="p-3 text-center bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                Highest Score
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {summaryMetrics.highest}
              </p>
            </Card>

            <Card className="p-3 text-center bg-sky-500/5 border border-sky-500/20">
              <p className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">
                Passing Rate
              </p>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">
                {summaryMetrics.total > 0
                  ? `${Math.round((summaryMetrics.passCount / summaryMetrics.total) * 100)}%`
                  : "—"}
              </p>
            </Card>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          {/* Search Table Filter */}
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
              Grades auto-calculated according to Telangana SSC 9-point scale
            </p>
          </div>

          {/* Marks Entry Table */}
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
            {isLoadingSheet ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-light-secondary dark:text-dark-secondary">
                  Loading class student marks from persistent database...
                </p>
              </div>
            ) : filteredRows.length === 0 ? (
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
                      <th className="py-3 px-4 text-center">Marks Obtained (Max: {maxMarks})</th>
                      <th className="py-3 px-4 text-center">Absent</th>
                      <th className="py-3 px-4 text-center">SSC Grade</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredRows.map((row) => {
                      const gradeInfo = getGradeForMark(row.marks_obtained, row.is_absent);
                      const isOverMax = !row.is_absent && row.marks_obtained !== "" && Number(row.marks_obtained) > maxMarks;

                      return (
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
                          <td className="py-3 px-4 font-semibold text-light-primary dark:text-dark-primary">
                            {row.full_name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              disabled={row.is_absent}
                              value={row.marks_obtained}
                              onChange={(e) => handleMarkChange(row.student_id, e.target.value)}
                              placeholder={`0 - ${maxMarks}`}
                              min={0}
                              max={maxMarks}
                              className={`w-28 text-center text-xs font-mono font-bold py-1.5 px-2 rounded-lg border focus:outline-none transition-colors ${
                                isOverMax
                                  ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 focus:border-red-600"
                                  : row.is_absent
                                  ? "bg-gray-100 dark:bg-dark-elevated opacity-50 cursor-not-allowed"
                                  : "bg-gray-50 dark:bg-dark-elevated border-light-border dark:border-dark-border focus:border-brand-gold text-light-primary dark:text-dark-primary"
                              }`}
                            />
                            {isOverMax && (
                              <p className="text-[10px] text-red-500 mt-0.5">Exceeds {maxMarks}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.is_absent}
                              onChange={(e) => handleAbsentToggle(row.student_id, e.target.checked)}
                              className="rounded border-light-border dark:border-dark-border text-brand-gold focus:ring-brand-gold cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={gradeInfo.variant} size="sm">
                              {gradeInfo.grade}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(e) => handleRemarksChange(row.student_id, e.target.value)}
                              placeholder="Feedback / remarks..."
                              className="w-full text-xs px-2.5 py-1 rounded bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="p-4 bg-gray-50 dark:bg-dark-elevated/40 border-t border-light-border dark:border-dark-border flex items-center justify-between">
              <div className="text-xs text-light-secondary dark:text-dark-secondary">
                <span>Subject: </span>
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  {selectedSubjectName} (Max: {maxMarks}, Pass: {passingMarks})
                </span>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveMarks}
                isLoading={isSaving}
                disabled={rows.length === 0 || Boolean(validationError)}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {hasExistingMarks ? "Update Subject Marks" : "Save Subject Marks"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASS RESULTS & RANKINGS */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                Tabulated Class Results & SSC Standing
              </h4>
              <p className="text-xs text-light-secondary dark:text-dark-secondary">
                Computed live across all examination subjects with Telangana SSC 9-point grades
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportResultsCSV}
              disabled={results.length === 0}
            >
              Export Results CSV
            </Button>
          </div>

          <Table
            columns={resultColumns}
            data={results}
            keyExtractor={(row) => String(row.student_id)}
            isLoading={isLoadingResults}
          />
        </div>
      )}
    </div>
  );
};
