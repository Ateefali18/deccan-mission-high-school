import React, { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Table, type Column } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

interface StudentSubjectMark {
  subject_name: string;
  code: string;
  max_marks: number;
  marks_obtained: number;
  grade: string;
  grade_point: number;
  remarks: string;
}

export const StudentResultsPage: React.FC = () => {
  const { session } = useAuth();
  const toast = useToast();
  const [examName, setExamName] = useState("Mid-Term Examination 2025-26");
  const [subjects, setSubjects] = useState<StudentSubjectMark[]>([
    { subject_name: "English Core", code: "ENG-101", max_marks: 100, marks_obtained: 88, grade: "A2", grade_point: 9.0, remarks: "Very good" },
    { subject_name: "Mathematics", code: "MATH-201", max_marks: 100, marks_obtained: 94, grade: "A1", grade_point: 10.0, remarks: "Outstanding performance" },
    { subject_name: "General Science", code: "SCI-301", max_marks: 100, marks_obtained: 91, grade: "A1", grade_point: 10.0, remarks: "Excellent in concepts" },
    { subject_name: "Social Science", code: "SOC-401", max_marks: 100, marks_obtained: 84, grade: "A2", grade_point: 9.0, remarks: "Good analytical writing" },
    { subject_name: "Computer Applications", code: "CA-501", max_marks: 100, marks_obtained: 96, grade: "A1", grade_point: 10.0, remarks: "Exceptional coding skills" },
  ]);

  const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
  const totalObtained = subjects.reduce((sum, s) => sum + s.marks_obtained, 0);
  const percentage = (totalObtained / totalMax) * 100;
  const gpa = (subjects.reduce((sum, s) => sum + s.grade_point, 0) / subjects.length).toFixed(1);

  const columns: Column<StudentSubjectMark>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="font-mono text-xs text-brand-gold font-bold">{row.code}</span>,
    },
    {
      key: "subject_name",
      header: "Subject",
      render: (row) => <span className="font-semibold text-xs text-light-primary dark:text-dark-primary">{row.subject_name}</span>,
    },
    {
      key: "max_marks",
      header: "Max",
      render: (row) => <span className="font-mono text-xs">{row.max_marks}</span>,
    },
    {
      key: "marks_obtained",
      header: "Obtained",
      render: (row) => <span className="font-mono font-bold text-xs">{row.marks_obtained}</span>,
    },
    {
      key: "grade",
      header: "CBSE Grade",
      render: (row) => (
        <Badge variant={row.grade.startsWith("A") ? "success" : "gold"} size="sm">
          {row.grade} ({row.grade_point})
        </Badge>
      ),
    },
    {
      key: "remarks",
      header: "Teacher Remarks",
      render: (row) => <span className="text-xs text-light-secondary dark:text-dark-secondary">{row.remarks}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Examination Results & Report Card"
        subtitle="Central Board of Secondary Education (CBSE) 9-Point Scale Marksheet"
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => toast.info("Report Card PDF download requested")}
          >
            Download PDF Report Card
          </Button>
        }
      />

      {/* Aggregate Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-brand-gold/10 border border-brand-gold/30">
          <span className="text-[10px] uppercase font-bold text-brand-gold">Overall Aggregate</span>
          <p className="text-2xl font-bold font-mono text-light-primary dark:text-dark-primary mt-1">
            {totalObtained} / {totalMax}
          </p>
          <span className="text-xs font-semibold text-brand-gold mt-1 block">
            {percentage.toFixed(1)}% (Grade A1)
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
            Cumulative GPA (CGPA)
          </span>
          <p className="text-2xl font-bold font-mono text-light-primary dark:text-dark-primary mt-1">
            {gpa} / 10.0
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
            ● Distinction Standing
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
          <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
            Class Standing
          </span>
          <p className="text-2xl font-bold font-mono text-light-primary dark:text-dark-primary mt-1">
            Rank #2
          </p>
          <span className="text-xs text-light-secondary dark:text-dark-secondary mt-1 block">
            In Section 10-A
          </span>
        </Card>

        <Card className="p-4 bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
            CBSE Examination Status
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            QUALIFIED
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
            Passed in all 5 subjects
          </span>
        </Card>
      </div>

      {/* Subject-Wise Marksheet */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl overflow-hidden p-4">
        <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary mb-3">
          Subject-wise Performance • {examName}
        </h3>
        <Table
          columns={columns}
          data={subjects}
          keyExtractor={(row) => row.code}
        />
      </div>
    </div>
  );
};
