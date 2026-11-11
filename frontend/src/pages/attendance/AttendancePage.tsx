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
  RefreshCw,
  Edit2,
  ShieldAlert,
  Save,
  CheckCheck,
  History,
  Sun,
  Sunset,
  Shield,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { SchoolClass } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

export type AttendanceStatus = "present" | "absent" | "late" | null;

export interface DailyStudentRow {
  student_id: string;
  admission_number: string;
  roll_number?: string;
  full_name: string;
  status: AttendanceStatus;
  remarks: string;
  is_marked: boolean;
}

export const AttendancePage: React.FC = () => {
  const { session, role } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // URL parameters if coming from dashboard shortcuts
  const initialClassId = searchParams.get("class_id") || "";
  const initialSession = (searchParams.get("session") as "morning" | "afternoon") || "morning";

  // Daily Sessions: strictly "morning" or "afternoon"
  const [selectedSession, setSelectedSession] = useState<"morning" | "afternoon">(initialSession);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Metadata Lists
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [classAssignments, setClassAssignments] = useState<any[]>([]);

  // Roster & Attendance State
  const [students, setStudents] = useState<DailyStudentRow[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Audit Log State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");

  // Teacher Specific State & Permission Enforcement
  const teacherId = session?.user?.id || (session as any)?.teacher_id;
  const teacherEmpId = (session as any)?.employee_id;
  const teacherName = session?.user?.full_name || "Faculty Member";

  // Find class assigned to currently logged-in teacher
  const teacherAssignedClass = useMemo(() => {
    if (role !== "TEACHER") return null;
    return classAssignments.find(
      (a) =>
        (a.teacher_id && String(a.teacher_id) === String(teacherId)) ||
        (a.employee_id && teacherEmpId && a.employee_id.toLowerCase() === teacherEmpId.toLowerCase()) ||
        (a.teacher_name && teacherName && a.teacher_name.toLowerCase().includes(teacherName.toLowerCase()))
    );
  }, [role, classAssignments, teacherId, teacherEmpId, teacherName]);

  // Load Classes and Class Teacher Assignments
  const loadMetadata = useCallback(async () => {
    try {
      const [clsList, assignments] = await Promise.all([
        api.classes.list().catch(() => []),
        (api as any).classTeachers.list().catch(() => []),
      ]);
      setClasses(clsList);
      setClassAssignments(assignments);

      if (!selectedClassId && clsList.length > 0) {
        if (role === "TEACHER") {
          // If teacher, default to their assigned class if found
          const assigned = assignments.find(
            (a: any) =>
              (a.teacher_id && String(a.teacher_id) === String(teacherId)) ||
              (a.employee_id && teacherEmpId && a.employee_id.toLowerCase() === teacherEmpId.toLowerCase())
          );
          if (assigned) {
            setSelectedClassId(assigned.class_id);
          } else {
            setSelectedClassId(clsList[0].id);
          }
        } else {
          setSelectedClassId(clsList[0].id);
        }
      }
    } catch (err: any) {
      console.warn("Could not load attendance metadata:", err);
    }
  }, [selectedClassId, role, teacherId, teacherEmpId]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Load Student Roster & Live Attendance for (Class, Date, Session)
  const loadDailyRoster = useCallback(async () => {
    if (!selectedClassId) return;
    setIsLoadingRoster(true);
    try {
      const data = await (api as any).studentAttendance.getRoster(
        selectedClassId,
        selectedDate,
        selectedSession
      );
      setStudents(data.students || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load class attendance roster");
      setStudents([]);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedClassId, selectedDate, selectedSession, toast]);

  useEffect(() => {
    loadDailyRoster();
  }, [loadDailyRoster]);

  // Real-time synchronization
  useRealtimeSync({
    tables: ["student_attendance", "class_teacher_assignments"],
    onSync: () => {
      loadDailyRoster();
    },
  });

  // Selected Class Metadata
  const currentClassObj = useMemo(() => {
    return classes.find((c) => String(c.id) === String(selectedClassId));
  }, [classes, selectedClassId]);

  const currentAssignment = useMemo(() => {
    return classAssignments.find((a) => String(a.class_id) === String(selectedClassId));
  }, [classAssignments, selectedClassId]);

  // Check if current user is authorized to mark attendance for this class
  const isAuthorizedToMark = useMemo(() => {
    if (role === "ADMIN") return true; // Admin can correct with audit
    if (role === "TEACHER") {
      if (!currentAssignment) return false;
      const isMatch =
        (currentAssignment.teacher_id && String(currentAssignment.teacher_id) === String(teacherId)) ||
        (currentAssignment.employee_id && teacherEmpId && currentAssignment.employee_id.toLowerCase() === teacherEmpId.toLowerCase()) ||
        (currentAssignment.teacher_name && teacherName && currentAssignment.teacher_name.toLowerCase().includes(teacherName.toLowerCase()));
      return Boolean(isMatch);
    }
    return false;
  }, [role, currentAssignment, teacherId, teacherEmpId, teacherName]);

  // Roster statistics
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const notMarkedCount = students.filter((s) => s.status === null).length;
  const totalCount = students.length;

  // Single student status change
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    if (!isAuthorizedToMark) {
      toast.error("Permission Denied: Only the assigned Class Teacher can update attendance.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  // Mark all un-marked or all students as Present
  const handleMarkAllPresent = () => {
    if (!isAuthorizedToMark) {
      toast.error("Permission Denied: Only the assigned Class Teacher can update attendance.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: "present" }))
    );
  };

  // Save Attendance to Supabase
  const handleSaveAttendance = async () => {
    if (!isAuthorizedToMark) {
      toast.error("Permission Denied: You are not the assigned Class Teacher for this class.");
      return;
    }

    if (notMarkedCount > 0) {
      toast.error(`Please mark attendance for all students. ${notMarkedCount} student(s) remain un-marked.`);
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave = students.map((s) => ({
        student_id: s.student_id,
        status: s.status as "present" | "absent" | "late",
        remarks: s.remarks || "",
      }));

      await (api as any).studentAttendance.saveDaily(
        selectedClassId,
        selectedDate,
        selectedSession,
        recordsToSave,
        correctionReason || undefined
      );

      toast.success(
        `${selectedSession === "morning" ? "Morning" : "Afternoon"} Attendance for ${currentClassObj?.name || "Class"} saved successfully!`,
        { title: "Attendance Synchronized" }
      );
      setCorrectionReason("");
      await loadDailyRoster();
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // View Audit Log
  const handleOpenAuditLog = async () => {
    setIsLoadingAudit(true);
    setIsAuditModalOpen(true);
    try {
      const logs = await (api as any).studentAttendance.getAuditLog(selectedClassId, selectedDate);
      setAuditLogs(logs);
    } catch (err: any) {
      toast.error("Failed to load audit history.");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Filtered student list by search
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q))
    );
  }, [students, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Daily Attendance"
        description="Two-session daily attendance (Morning & Afternoon) strictly marked by assigned Class Teachers with permanent Supabase synchronization and full audit logging."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<History className="w-4 h-4" />}
              onClick={handleOpenAuditLog}
            >
              Attendance Audit History
            </Button>
          </div>
        }
      />

      {/* Authority Banner */}
      {role === "TEACHER" ? (
        isAuthorizedToMark ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 block">
                  Class Teacher Authorization Verified
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-300">
                  You are the assigned Class Teacher for <strong>{currentClassObj?.name}</strong>. Attendance submission is enabled.
                </span>
              </div>
            </div>
            <Badge variant="success">Authorized</Badge>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-xs sm:text-sm text-rose-900 dark:text-rose-200 block">
                  Read-Only Mode: Class Teacher Restriction
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-300">
                  Only the appointed Class Teacher (
                  {currentAssignment?.teacher_name || "Assigned Faculty"}) is authorized to mark or update attendance for {currentClassObj?.name}.
                </span>
              </div>
            </div>
            <Badge variant="danger">Locked</Badge>
          </div>
        )
      ) : (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-navy dark:text-brand-gold shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm text-brand-navy dark:text-white block">
                Administrator Live Observation &amp; Audit Portal
              </span>
              <span className="text-xs text-light-secondary dark:text-dark-secondary">
                Daily student attendance is managed by the 13 appointed Class Teachers. Administrators can monitor submissions and perform controlled corrections with audit reasons.
              </span>
            </div>
          </div>
          <Badge variant="neutral">Admin Oversight</Badge>
        </div>
      )}

      {/* Control Card: Session Switcher, Date, Class */}
      <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Morning vs Afternoon Switcher */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              Select Attendance Session *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSession("morning")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedSession === "morning"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
                }`}
              >
                <Sun className="w-4 h-4" />
                Morning
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession("afternoon")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedSession === "afternoon"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
                }`}
              >
                <Sunset className="w-4 h-4" />
                Afternoon
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              Attendance Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Class Selector */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              School Class (13 Classes Total) *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            >
              <optgroup label="Pre-Primary (3 Classes)">
                {classes
                  .filter((c) => ["Nursery", "LKG", "UKG"].includes(c.name) || c.grade_level <= 0)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {classAssignments.find((a) => a.class_id === c.id)?.teacher_name ? `(${classAssignments.find((a) => a.class_id === c.id)?.teacher_name})` : "(No Teacher)"}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Primary & High School (Classes 1 - 10)">
                {classes
                  .filter((c) => !["Nursery", "LKG", "UKG"].includes(c.name) && c.grade_level > 0)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {classAssignments.find((a) => a.class_id === c.id)?.teacher_name ? `(${classAssignments.find((a) => a.class_id === c.id)?.teacher_name})` : "(No Teacher)"}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="pt-3 border-t border-light-border dark:border-dark-border grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-elevated">
            <div className="text-[11px] text-light-secondary dark:text-dark-secondary uppercase font-semibold">Total Students</div>
            <div className="text-lg font-bold text-light-primary dark:text-dark-primary">{totalCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
            <div className="text-[11px] uppercase font-semibold">Present</div>
            <div className="text-lg font-bold">{presentCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
            <div className="text-[11px] uppercase font-semibold">Absent</div>
            <div className="text-lg font-bold">{absentCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
            <div className="text-[11px] uppercase font-semibold">Late</div>
            <div className="text-lg font-bold">{lateCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 col-span-2 sm:col-span-1">
            <div className="text-[11px] uppercase font-semibold">Not Marked</div>
            <div className="text-lg font-bold">{notMarkedCount}</div>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
            <input
              type="text"
              placeholder="Search student or admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:outline-none"
            />
          </div>

          {isAuthorizedToMark && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                onClick={handleMarkAllPresent}
              >
                Mark All Present
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveAttendance}
                isLoading={isSaving}
              >
                Save {selectedSession === "morning" ? "Morning" : "Afternoon"} Attendance
              </Button>
            </div>
          )}
        </div>

        {/* Student Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Student Full Name</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-center">Attendance Selection (Present / Absent / Late)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoadingRoster ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-light-secondary dark:text-dark-secondary">
                    Loading student attendance roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-light-secondary dark:text-dark-secondary">
                    No enrolled students found for {currentClassObj?.name || "this class"}.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.student_id} className="hover:bg-gray-50 dark:hover:bg-dark-elevated/40">
                    <td className="py-3 px-4 font-mono font-bold text-light-secondary dark:text-dark-secondary">
                      {st.roll_number || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-brand-navy dark:text-brand-gold">
                      {st.admission_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-light-primary dark:text-dark-primary">
                      {st.full_name}
                    </td>
                    <td className="py-3 px-4">
                      {st.status === "present" ? (
                        <Badge variant="success" size="sm">Present</Badge>
                      ) : st.status === "absent" ? (
                        <Badge variant="danger" size="sm">Absent</Badge>
                      ) : st.status === "late" ? (
                        <Badge variant="gold" size="sm">Late</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Attendance Not Marked</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={!isAuthorizedToMark}
                          onClick={() => handleSetStatus(st.student_id, "present")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            st.status === "present"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-emerald-100"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          disabled={!isAuthorizedToMark}
                          onClick={() => handleSetStatus(st.student_id, "absent")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            st.status === "absent"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-rose-100"
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          disabled={!isAuthorizedToMark}
                          onClick={() => handleSetStatus(st.student_id, "late")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            st.status === "late"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-amber-100"
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Modal */}
      <Dialog
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Student Attendance Audit Log"
        description="Every attendance record change and correction is permanently audited in Supabase."
        maxWidth="2xl"
        footer={
          <Button variant="secondary" onClick={() => setIsAuditModalOpen(false)}>
            Close Audit
          </Button>
        }
      >
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
          {isLoadingAudit ? (
            <div className="p-8 text-center text-xs text-light-secondary dark:text-dark-secondary">
              Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-light-secondary dark:text-dark-secondary">
              No audit entries recorded for this date.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-light-primary dark:text-dark-primary flex items-center gap-2">
                    <span>{log.student_name}</span>
                    <span className="font-mono text-[11px] text-light-secondary dark:text-dark-secondary">
                      ({log.admission_number})
                    </span>
                    <Badge variant="blue" size="sm">{log.session}</Badge>
                  </div>
                  <div className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    Status Changed: <span className="line-through">{log.previous_status}</span> &rarr;{" "}
                    <strong className="text-brand-navy dark:text-brand-gold">{log.new_status}</strong> | Changed by: {log.changed_by}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Timestamp: {new Date(log.timestamp).toLocaleString()} | Reason: {log.reason}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>
    </div>
  );
};
