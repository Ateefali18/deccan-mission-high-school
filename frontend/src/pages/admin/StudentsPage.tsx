import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  Search,
  Filter,
  GraduationCap,
  Eye,
  Camera,
  Upload,
  FileText,
  Clock,
  Phone,
  MapPin,
} from "lucide-react";
import { api } from "../../services/api";
import type { StudentListItem, StudentProfile, SchoolClass, AcademicYear, DocumentItem } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

const studentSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  gender: z.string().optional(),
  class_id: z.coerce.number().min(1, "Please select a class"),
  section_id: z.coerce.number().min(1, "Please select a section"),
  academic_year_id: z.coerce.number().min(1, "Please select academic year"),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  roll_number: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export const StudentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const toast = useToast();

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Dialogs & Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [studentDocs, setStudentDocs] = useState<DocumentItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const watchedClassId = watch("class_id");

  useEffect(() => {
    api.classes.list().then(setClasses).catch(() => {});
    api.academicYears.list().then(setAcademicYears).catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.students.list({
        page,
        limit: pageSize,
        class_id: selectedClassId,
        status: selectedStatusFilter,
        search: searchTerm,
      });
      setStudents(data.items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedClassId, selectedStatusFilter, searchTerm]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const onRegisterStudent = async (data: StudentFormData) => {
    try {
      await api.students.create(data);
      toast.success(`Student ${data.full_name} admitted successfully!`);
      setIsRegisterOpen(false);
      reset();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to admit student");
    }
  };

  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.students.getById(id);
      setSelectedStudent(profile);
      setIsDetailOpen(true);
      // Fetch documents
      api.students.getDocuments(id).then(setStudentDocs).catch(() => setStudentDocs([]));
    } catch (err: any) {
      toast.error(err.message || "Failed to load student details");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedStudent) return;
    try {
      await api.students.updateStatus(selectedStudent.id, newStatus);
      toast.success(`Student status updated to ${newStatus}`);
      setSelectedStudent({ ...selectedStudent, student_status: newStatus });
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    setIsUploadingPhoto(true);
    try {
      const photoUrl = await api.students.uploadPhoto(selectedStudent.id, file);
      toast.success("Profile photo updated successfully!");
      setSelectedStudent({ ...selectedStudent, photo_url: photoUrl });
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    setIsUploadingDoc(true);
    try {
      const doc = await api.students.uploadDocument(
        selectedStudent.id,
        file,
        "Student Certificate",
        file.name
      );
      toast.success(`Document ${file.name} uploaded successfully!`);
      setStudentDocs((prev) => [doc, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Document upload failed");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge variant="success" size="sm">Active</Badge>;
      case "transferred":
        return <Badge variant="warning" size="sm">Transferred</Badge>;
      case "graduated":
        return <Badge variant="gold" size="sm">Graduated</Badge>;
      case "withdrawn":
        return <Badge variant="danger" size="sm">Withdrawn</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const columns: Column<StudentListItem>[] = [
    {
      key: "admission_number",
      header: "Admission No",
      render: (row) => (
        <span className="font-mono font-bold text-brand-gold text-xs">
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
            <span className="font-semibold text-light-primary dark:text-dark-primary block">
              {row.full_name}
            </span>
            <span className="text-xs text-light-secondary dark:text-dark-secondary block">
              {row.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "class_name",
      header: "Class & Section",
      render: (row) => (
        <span>
          {row.class_name ? `${row.class_name} - ${row.section_name}` : "Unenrolled"}
        </span>
      ),
    },
    {
      key: "roll_number",
      header: "Roll No",
      render: (row) => <span>{row.roll_number || "—"}</span>,
    },
    {
      key: "student_status",
      header: "Status",
      render: (row) => getStatusBadge(row.student_status),
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(row.id);
          }}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
    },
  ];

  const selectedClassObj = classes.find((c) => String(c.id) === String(watchedClassId));
  const availableSections = selectedClassObj?.sections || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        subtitle="Manage student admissions, real-time Supabase enrollments, and academic biodata"
        action={
          <Button
            variant="primary"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsRegisterOpen(true)}
          >
            Admit New Student
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-light-secondary dark:text-dark-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search admission no, student name..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-light-secondary" />
          <select
            value={selectedClassId || ""}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <Table
        columns={columns}
        data={filteredStudents}
        keyExtractor={(row) => String(row.id)}
        isLoading={isLoading}
        onRowClick={(row) => handleViewDetails(row.id)}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Register Student Modal */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Admit New Student"
        description="Creates student record and class enrollment in persistent database"
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsRegisterOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onRegisterStudent)}
              isLoading={isSubmitting}
            >
              Confirm Admission
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onRegisterStudent)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admission Number"
              placeholder="e.g. DMHS-2025-0150"
              error={errors.admission_number?.message}
              required
              {...register("admission_number")}
            />
            <Input
              label="Student Full Name"
              placeholder="e.g. Zainab Fatima"
              error={errors.full_name?.message}
              required
              {...register("full_name")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              placeholder="e.g. zainab.fatima"
              error={errors.username?.message}
              required
              {...register("username")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. zainab.fatima@student.dmhs.edu.in"
              error={errors.email?.message}
              required
              {...register("email")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Temporary Password"
              type="password"
              placeholder="At least 6 characters"
              error={errors.password?.message}
              required
              {...register("password")}
            />
            <Select
              label="Gender"
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
              {...register("gender")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Academic Year"
              error={errors.academic_year_id?.message}
              required
              options={[
                { value: "", label: "Select Year" },
                ...academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `${ay.name} ${ay.is_current ? "(Current)" : ""}`,
                })),
              ]}
              {...register("academic_year_id")}
            />

            <Select
              label="Class"
              error={errors.class_id?.message}
              required
              options={[
                { value: "", label: "Select Class" },
                ...classes.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
              {...register("class_id")}
            />

            <Select
              label="Section"
              error={errors.section_id?.message}
              required
              disabled={!watchedClassId}
              options={[
                { value: "", label: "Select Section" },
                ...availableSections.map((s) => ({
                  value: String(s.id),
                  label: `Section ${s.name}`,
                })),
              ]}
              {...register("section_id")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Roll Number"
              placeholder="e.g. 15"
              {...register("roll_number")}
            />
            <Input
              label="Guardian Name"
              placeholder="e.g. Mohammed Ahmed (Father)"
              {...register("guardian_name")}
            />
            <Input
              label="Guardian Phone"
              placeholder="+91 98490 00000"
              {...register("guardian_phone")}
            />
          </div>
        </form>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Student Profile & Dossier"
        description="Detailed record from Deccan Mission High School database"
        maxWidth="lg"
        footer={
          <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedStudent.photo_url ? (
                    <img
                      src={selectedStudent.photo_url}
                      alt={selectedStudent.full_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-brand-gold shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold text-xl">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-brand-gold text-brand-navy shadow hover:bg-brand-gold-light transition-colors"
                    title="Upload profile photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
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

              {/* Status Selector */}
              <div className="text-right">
                <label className="text-[10px] uppercase font-bold tracking-wider text-light-secondary dark:text-dark-secondary block mb-1">
                  Enrollment Status
                </label>
                <select
                  value={selectedStudent.student_status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-brand-gold/40 bg-white dark:bg-dark-card text-brand-gold focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="transferred">Transferred</option>
                  <option value="graduated">Graduated</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Email</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary truncate block">
                  {selectedStudent.email}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Current Enrollment</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.current_enrollment
                    ? `${selectedStudent.current_enrollment.class_name} - ${selectedStudent.current_enrollment.section_name}`
                    : "Not Enrolled"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Roll Number</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.current_enrollment?.roll_number || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Blood Group</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.blood_group || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Guardian</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.guardian_name || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Guardian Phone</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedStudent.guardian_phone || "—"}
                </span>
              </div>
            </div>

            {/* Address */}
            {selectedStudent.address && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span className="text-light-primary dark:text-dark-primary">
                  {selectedStudent.address}
                </span>
              </div>
            )}

            {/* Documents & Dossier Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Student Documents (Supabase Storage)</span>
                </h5>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="w-3 h-3" />}
                  onClick={() => docInputRef.current?.click()}
                  isLoading={isUploadingDoc}
                >
                  Upload Document
                </Button>
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </div>

              {studentDocs.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-light-border dark:border-dark-border text-center text-xs text-light-secondary dark:text-dark-secondary">
                  No documents currently attached to this student dossier.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {studentDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-brand-gold shrink-0" />
                        <span className="font-medium text-light-primary dark:text-dark-primary truncate">
                          {doc.title}
                        </span>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-gold font-semibold hover:underline shrink-0 ml-2"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
