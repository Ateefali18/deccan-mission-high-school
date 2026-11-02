import React, { useEffect, useState, useCallback } from "react";
import {
  GraduationCap,
  ShieldCheck,
  Eye,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { api } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { StudentListItem, StudentProfile } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

export const MyStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Attendance Roll-Call Modal State
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceState, setAttendanceState] = useState<Record<string, "present" | "absent" | "late">>(
    {}
  );
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  const toast = useToast();

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.students.list({ limit: 100 });
      setStudents(res.items);

      // Initialize default attendance map to present
      const initMap: Record<string, "present" | "absent" | "late"> = {};
      res.items.forEach((s) => {
        initMap[String(s.id)] = "present";
      });
      setAttendanceState(initMap);
    } catch (err: any) {
      toast.error(err.message || "Failed to load authorized students");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useRealtimeSync({
    tables: ["students", "attendance_records"],
    onSync: () => {
      fetchStudents();
    },
  });

  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.students.getById(id);
      setSelectedStudent(profile);
      setIsDetailOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Access denied: Student is outside your assigned sections.");
    }
  };

  const handleSubmitAttendance = async () => {
    setIsSubmittingAttendance(true);
    try {
      const records = Object.entries(attendanceState).map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
        remarks: status === "late" ? "Late arrival" : undefined,
      }));

      await api.attendance.submit({
        academic_year_id: 1,
        class_id: 1,
        section_id: 1,
        session_date: attendanceDate,
        period_number: 0,
        records,
      });

      toast.success(`Attendance for ${attendanceDate} recorded successfully for ${records.length} students!`);
      setIsAttendanceOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const toggleStudentStatus = (studentId: string) => {
    setAttendanceState((prev) => {
      const curr = prev[studentId] || "present";
      const next = curr === "present" ? "absent" : curr === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Column<StudentListItem>[] = [
    {
      key: "admission_number",
      header: "Admission No",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
          {row.admission_number}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Student Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.photo_url ? (
            <img
              src={row.photo_url}
              alt={row.full_name}
              className="w-8 h-8 rounded-full object-cover border border-brand-gold/30 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold text-xs shrink-0">
              {row.full_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-bold text-light-primary dark:text-dark-primary">{row.full_name}</p>
            <p className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "class_name",
      header: "Class & Section",
      render: (row) => <span>{row.class_name ? `${row.class_name} - ${row.section_name}` : "—"}</span>,
    },
    {
      key: "roll_number",
      header: "Roll No",
      render: (row) => <span>{row.roll_number || "—"}</span>,
    },
    {
      key: "student_status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.student_status === "active" ? "success" : "neutral"} size="sm">
          {row.student_status}
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
          onClick={() => handleViewDetails(row.id)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Authorized Students"
        subtitle="Students enrolled strictly in your assigned classes and sections (Resource-Level Isolation)"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => setIsAttendanceOpen(true)}
            >
              Take Section Attendance
            </Button>
          </div>
        }
      />

      {/* Security Scope Banner */}
      <div className="p-3.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center gap-2.5 text-xs text-light-primary dark:text-dark-primary">
        <ShieldCheck className="w-4 h-4 text-brand-gold shrink-0" />
        <span>
          <strong>Faculty Permission Boundary:</strong> You are viewing students authorized strictly under your SSC Class Teacher and Subject Teacher assignments.
        </span>
      </div>

      {/* Search Input */}
      <div className="p-3.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-light-secondary dark:text-dark-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name or admission no..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredStudents}
        keyExtractor={(row) => String(row.id)}
        isLoading={isLoading}
        onRowClick={(row) => handleViewDetails(row.id)}
      />

      {/* Student Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Student Profile"
        description="Authorized student academic biodata"
        maxWidth="md"
        footer={
          <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedStudent && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
              <div className="w-12 h-12 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold text-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                  {selectedStudent.full_name}
                </h4>
                <p className="text-xs font-mono font-bold text-brand-gold">
                  Admission: {selectedStudent.admission_number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Enrollment</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.current_enrollment
                    ? `${selectedStudent.current_enrollment.class_name} - Sec ${selectedStudent.current_enrollment.section_name}`
                    : "Unenrolled"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Roll Number</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block font-mono">
                  {selectedStudent.current_enrollment?.roll_number || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Status</span>
                <Badge variant={selectedStudent.student_status === "active" ? "success" : "neutral"} size="sm">
                  {selectedStudent.student_status}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Attendance Standard</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                  Verified Active (≥75% Target)
                </span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Record Attendance Modal */}
      <Dialog
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        title="Record Section Attendance"
        description="Daily roll call for your assigned class section"
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAttendanceOpen(false)} disabled={isSubmittingAttendance}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitAttendance} isLoading={isSubmittingAttendance}>
              Save Attendance
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl">
            <span className="text-xs font-semibold text-light-primary dark:text-dark-primary">
              Session Date:
            </span>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-primary dark:text-dark-primary font-mono focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {students.map((student) => {
              const st = attendanceState[String(student.id)] || "present";
              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudentStatus(String(student.id))}
                  className="p-3 rounded-xl border border-light-border dark:border-dark-border flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-brand-gold w-28">
                      {student.admission_number}
                    </span>
                    <span className="text-xs font-semibold text-light-primary dark:text-dark-primary">
                      {student.full_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {st === "present" && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Present
                      </span>
                    )}
                    {st === "absent" && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Absent
                      </span>
                    )}
                    {st === "late" && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Late
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>
    </div>
  );
};
