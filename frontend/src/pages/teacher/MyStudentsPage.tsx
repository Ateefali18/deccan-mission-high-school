import React, { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, Eye } from "lucide-react";
import { api } from "../../services/api";
import type { StudentListItem, StudentProfile, TeacherDashboardStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

export const MyStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    api.dashboards
      .getTeacher()
      .then(async (dash) => {
        if (!isMounted) return;
        // Collect section IDs assigned to this teacher
        const assignedSectionIds = dash.assignments.map((a: any) => a.id);
        // Query students
        const res = await api.students.list({ limit: 50 });
        if (isMounted) {
          setStudents(res.items);
        }
      })
      .catch((err) => {
        if (isMounted) toast.error(err.message || "Failed to load students");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewDetails = async (id: number) => {
    try {
      const profile = await api.students.getById(id);
      setSelectedStudent(profile);
      setIsDetailOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Access denied: Student is outside your assigned sections.");
    }
  };

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
        <div>
          <p className="font-bold text-light-primary dark:text-dark-primary">{row.full_name}</p>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.email}</p>
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
        title="My Assigned Students"
        subtitle="Students enrolled within your authorized classes and instructional sections"
      />

      <div className="p-3.5 rounded-xl bg-brand-gold/10 border border-brand-gold/25 flex items-center gap-3 text-xs text-brand-gold">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>
          Server-side authorization ensures you can only inspect records of students assigned to your sections.
        </span>
      </div>

      <Table
        columns={columns}
        data={students}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No students found in your assigned sections."
      />

      {/* Detail Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Student Profile"
        description="Authorized student academic details"
        maxWidth="md"
        footer={
          <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
              <div className="w-12 h-12 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold text-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-light-primary dark:text-dark-primary">
                  {selectedStudent.full_name}
                </h4>
                <p className="text-xs font-mono font-bold text-brand-gold">
                  Admission: {selectedStudent.admission_number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Class & Section</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.current_enrollment
                    ? `${selectedStudent.current_enrollment.class_name} - ${selectedStudent.current_enrollment.section_name}`
                    : "Unenrolled"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Roll Number</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.current_enrollment?.roll_number || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Guardian</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.guardian_name || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Status</span>
                <Badge variant={selectedStudent.student_status === "active" ? "success" : "neutral"} size="sm">
                  {selectedStudent.student_status}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
