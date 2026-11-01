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
  Edit2,
  Trash2,
  Camera,
  Upload,
  FileText,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
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
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const studentCreateSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Student@12345"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  class_id: z.coerce.number().min(1, "Please select a class"),
  section_id: z.coerce.number().min(1, "Please select a section"),
  academic_year_id: z.coerce.number().min(1, "Please select academic year"),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  roll_number: z.string().optional(),
});

const studentEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  class_id: z.coerce.number().optional(),
  section_id: z.coerce.number().optional(),
  roll_number: z.string().optional(),
  student_status: z.string().default("active"),
});

type StudentCreateFormData = z.infer<typeof studentCreateSchema>;
type StudentEditFormData = z.infer<typeof studentEditSchema>;

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

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [studentDocs, setStudentDocs] = useState<DocumentItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | number | null>(null);

  // Deactivate Confirmation
  const [deactivatingStudent, setDeactivatingStudent] = useState<StudentListItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Registration Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentCreateFormData>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      password: "Student@12345",
    },
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitting: isSubmittingEdit },
  } = useForm<StudentEditFormData>({
    resolver: zodResolver(studentEditSchema),
  });

  const watchedCreateClassId = watch("class_id");
  const watchedEditClassId = watchEdit("class_id");

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

  // Create Student
  const onRegisterStudent = async (data: StudentCreateFormData) => {
    try {
      const payload = {
        ...data,
        username: data.username || data.email.split("@")[0],
      };
      await api.students.create(payload);
      toast.success(`Student ${data.full_name} admitted successfully!`);
      setIsRegisterOpen(false);
      reset();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to admit student");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (id: number | string) => {
    try {
      const profile = await api.students.getById(id);
      setEditingStudentId(id);

      // Locate class & section ID if available
      const matchingClass = classes.find(
        (c) => c.name === profile.current_enrollment?.class_name
      );
      const matchingSection = matchingClass?.sections?.find(
        (s) => s.name === profile.current_enrollment?.section_name
      );

      resetEdit({
        full_name: profile.full_name,
        email: profile.email,
        gender: profile.gender || "",
        date_of_birth: profile.date_of_birth || "",
        blood_group: profile.blood_group || "",
        guardian_name: profile.guardian_name || "",
        guardian_phone: profile.guardian_phone || "",
        emergency_contact: profile.emergency_contact || "",
        address: profile.address || "",
        class_id: matchingClass ? Number(matchingClass.id) : undefined,
        section_id: matchingSection ? Number(matchingSection.id) : undefined,
        roll_number: profile.current_enrollment?.roll_number || "",
        student_status: profile.student_status || "active",
      });
      setIsEditOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load student details for editing");
    }
  };

  // Save Edit Student
  const onSaveEdit = async (data: StudentEditFormData) => {
    if (!editingStudentId) return;
    try {
      await api.students.update(editingStudentId, data);
      toast.success(`Student profile updated successfully!`);
      setIsEditOpen(false);
      setEditingStudentId(null);
      fetchStudents();
      if (selectedStudent && selectedStudent.id === editingStudentId) {
        const updated = await api.students.getById(editingStudentId);
        setSelectedStudent(updated);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update student profile");
    }
  };

  // Deactivate Student
  const onConfirmDeactivate = async () => {
    if (!deactivatingStudent) return;
    setIsDeactivating(true);
    try {
      await api.students.deactivate(deactivatingStudent.id);
      toast.success(`Student ${deactivatingStudent.full_name} deactivated.`);
      setDeactivatingStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate student");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.students.getById(id);
      setSelectedStudent(profile);
      setIsDetailOpen(true);
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge variant="success" size="sm">Active</Badge>;
      case "transferred":
        return <Badge variant="warning" size="sm">Transferred</Badge>;
      case "graduated":
        return <Badge variant="gold" size="sm">Graduated</Badge>;
      case "withdrawn":
      case "inactive":
        return <Badge variant="danger" size="sm">Inactive</Badge>;
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
          {row.class_name ? `${row.class_name} - ${row.section_name || "A"}` : "Unenrolled"}
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
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.id)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row.id)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          {row.student_status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => setDeactivatingStudent(row)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Section options for create
  const selectedCreateClassObj = classes.find((c) => String(c.id) === String(watchedCreateClassId));
  const availableCreateSections = selectedCreateClassObj?.sections || [];

  // Section options for edit
  const selectedEditClassObj = classes.find((c) => String(c.id) === String(watchedEditClassId));
  const availableEditSections = selectedEditClassObj?.sections || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        subtitle="Manage student admissions, real-time enrollments, and academic biodata"
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
        <div className="relative w-full sm:w-80">
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
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <Table
        columns={columns}
        data={students}
        keyExtractor={(row) => String(row.id)}
        isLoading={isLoading}
        onRowClick={(row) => handleViewDetails(row.id)}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onChange={setPage}
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
              label="Email"
              type="email"
              placeholder="e.g. zainab.fatima@student.dmhs.edu.in"
              error={errors.email?.message}
              required
              {...register("email")}
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
              disabled={!watchedCreateClassId}
              options={[
                { value: "", label: "Select Section" },
                ...availableCreateSections.map((s) => ({
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              {...register("date_of_birth")}
            />
            <Input
              label="Residential Address"
              placeholder="e.g. Moghalpura, Hyderabad"
              {...register("address")}
            />
          </div>
        </form>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Student Profile"
        description="Update personal details, enrollment, and guardian contact info"
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmittingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEdit(onSaveEdit)}
              isLoading={isSubmittingEdit}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student Full Name"
              error={editErrors.full_name?.message}
              required
              {...registerEdit("full_name")}
            />
            <Input
              label="Email"
              type="email"
              error={editErrors.email?.message}
              required
              {...registerEdit("email")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Gender"
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
              {...registerEdit("gender")}
            />
            <Input
              label="Date of Birth"
              type="date"
              {...registerEdit("date_of_birth")}
            />
            <Select
              label="Blood Group"
              options={[
                { value: "", label: "Select Blood Group" },
                { value: "A+", label: "A+" },
                { value: "A-", label: "A-" },
                { value: "B+", label: "B+" },
                { value: "B-", label: "B-" },
                { value: "O+", label: "O+" },
                { value: "O-", label: "O-" },
                { value: "AB+", label: "AB+" },
                { value: "AB-", label: "AB-" },
              ]}
              {...registerEdit("blood_group")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Class"
              options={[
                { value: "", label: "Select Class" },
                ...classes.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
              {...registerEdit("class_id")}
            />

            <Select
              label="Section"
              disabled={!watchedEditClassId}
              options={[
                { value: "", label: "Select Section" },
                ...availableEditSections.map((s) => ({
                  value: String(s.id),
                  label: `Section ${s.name}`,
                })),
              ]}
              {...registerEdit("section_id")}
            />

            <Input
              label="Roll Number"
              placeholder="e.g. 15"
              {...registerEdit("roll_number")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Guardian Name"
              placeholder="e.g. Mohammed Ahmed"
              {...registerEdit("guardian_name")}
            />
            <Input
              label="Guardian Phone"
              placeholder="+91 98490 00000"
              {...registerEdit("guardian_phone")}
            />
            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "transferred", label: "Transferred" },
                { value: "graduated", label: "Graduated" },
                { value: "withdrawn", label: "Withdrawn" },
              ]}
              {...registerEdit("student_status")}
            />
          </div>

          <Input
            label="Residential Address"
            placeholder="e.g. Moghalpura, Hyderabad"
            {...registerEdit("address")}
          />
        </form>
      </Dialog>

      {/* Confirm Deactivate Student Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingStudent}
        onClose={() => setDeactivatingStudent(null)}
        onConfirm={onConfirmDeactivate}
        title="Deactivate Student"
        message={`Are you sure you want to deactivate ${deactivatingStudent?.full_name} (${deactivatingStudent?.admission_number})? Academic records, past attendance, and documents will be securely preserved.`}
        confirmLabel="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />

      {/* Student Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Student Profile & Dossier"
        description="Detailed record from Deccan Mission High School database"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                if (selectedStudent) {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedStudent.id);
                }
              }}
            >
              Edit Profile
            </Button>
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </div>
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
                  <option value="inactive">Inactive</option>
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
