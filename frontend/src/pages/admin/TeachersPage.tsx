import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  Search,
  Users,
  Eye,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Upload,
  FileText,
  Download,
  Calendar,
  Shield,
  FileCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { api } from "../../services/api";
import type { TeacherListItem, TeacherProfile, FacultyDocumentItem } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Table, type Column } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const teacherCreateSchema = z.object({
  // Personal Details
  full_name: z.string().min(2, "Full name is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().default("Male"),
  contact_phone: z.string().min(5, "Contact phone number is required"),
  email: z.string().email("Valid email required"),
  address: z.string().optional(),
  aadhaar_number: z.string().optional(),

  // Professional Details
  employee_id: z.string().min(3, "Faculty / Employee ID is required"),
  department: z.string().default("Mathematics"),
  designation: z.string().min(2, "Designation is required"),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joining_date: z.string().optional(),
  assigned_class: z.string().optional(),
  assigned_subject: z.string().optional(),
  employment_status: z.string().default("active"),
  username: z.string().optional(),
  password: z.string().min(1, "Password is required").default("1234"),
});

const teacherEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  designation: z.string().min(2, "Designation is required"),
  department: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  aadhaar_number: z.string().optional(),
  joining_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

type TeacherCreateFormData = z.infer<typeof teacherCreateSchema>;
type TeacherEditFormData = z.infer<typeof teacherEditSchema>;

const maskAadhaar = (val?: string | null): string => {
  if (!val) return "—";
  const clean = val.replace(/\D/g, "");
  if (clean.length < 4) return "••••";
  return `•••• •••• ${clean.slice(-4)}`;
};

export const TeachersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const toast = useToast();

  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Modal Dialogs
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerTab, setRegisterTab] = useState<"personal" | "professional" | "documents">("personal");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [selectedTeacherDocs, setSelectedTeacherDocs] = useState<FacultyDocumentItem[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Edit Faculty State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | string | null>(null);

  // Deactivate Faculty State
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivatingTeacher, setDeactivatingTeacher] = useState<TeacherListItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Class & Subject Allotment State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherListItem | null>(null);
  const [assignClass, setAssignClass] = useState("Class 10");
  const [assignSection, setAssignSection] = useState("A");
  const [assignSubject, setAssignSubject] = useState("Mathematics");
  const [assignRoleType, setAssignRoleType] = useState("Class Teacher");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Pending Certificate Uploads during Registration
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; type: string; title: string }>>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<FacultyDocumentItem | null>(null);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    setValue: setCreateValue,
    watch: watchCreate,
    formState: { errors: createErrors, isSubmitting: isSubmittingCreate },
  } = useForm<TeacherCreateFormData>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: {
      gender: "Male",
      department: "Mathematics",
      designation: "Faculty / Senior Teacher",
      password: "1234",
      joining_date: new Date().toISOString().slice(0, 10),
      employment_status: "active",
      assigned_class: "Class 10",
      assigned_subject: "Mathematics",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isSubmittingEdit },
  } = useForm<TeacherEditFormData>({
    resolver: zodResolver(teacherEditSchema),
    defaultValues: {
      is_active: true,
    },
  });

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.teachers.list({
        page,
        limit: pageSize,
        search: searchTerm,
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      let items = data.items;
      if (departmentFilter !== "all") {
        items = items.filter((t) => t.department?.toLowerCase() === departmentFilter.toLowerCase());
      }

      setTeachers(items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty list");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, departmentFilter, toast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const onRegisterTeacher = async (data: TeacherCreateFormData) => {
    try {
      setUploadProgress(true);
      const newTeacher = await api.teachers.create(data);

      // Upload any attached certificates
      if (pendingFiles.length > 0) {
        for (const item of pendingFiles) {
          try {
            await api.teachers.uploadDocument(newTeacher.id, item.file, item.type, item.title);
          } catch (e) {
            console.warn("Certificate upload warning:", e);
          }
        }
      }

      // If assigned class specified, allot immediately
      if (data.assigned_class && data.assigned_subject) {
        try {
          await api.teachers.assignClass(newTeacher.id, {
            class_name: data.assigned_class,
            section_name: "A",
            subject_name: data.assigned_subject,
            role_type: "Class Teacher",
          });
        } catch {}
      }

      toast.success(`Faculty member ${data.full_name} admitted successfully with ${pendingFiles.length} certificate(s)!`);
      setIsRegisterOpen(false);
      resetCreate();
      setPendingFiles([]);
      setRegisterTab("personal");
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to register teacher");
    } finally {
      setUploadProgress(false);
    }
  };

  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.teachers.getById(id);
      const docs = await api.teachers.getDocuments(id);
      setSelectedTeacher(profile);
      setSelectedTeacherDocs(docs);
      setIsDetailOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load teacher details");
    }
  };

  const handleOpenEdit = async (teacher: TeacherListItem | TeacherProfile) => {
    try {
      const profile = await api.teachers.getById(teacher.id);
      setSelectedTeacher(profile);
      setEditingTeacherId(profile.id);
      setEditValue("full_name", profile.full_name || "");
      setEditValue("email", profile.email || "");
      setEditValue("designation", profile.designation || "Faculty");
      setEditValue("department", profile.department || "");
      setEditValue("qualification", profile.qualification || "");
      setEditValue("specialization", (profile as any).specialization || "");
      setEditValue("contact_phone", profile.contact_phone || "");
      setEditValue("address", (profile as any).address || "");
      setEditValue("aadhaar_number", (profile as any).aadhaar_number || "");
      setEditValue("joining_date", profile.joining_date || "");
      setEditValue("is_active", profile.is_active ?? true);
      setIsEditOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load teacher for editing");
    }
  };

  const onSaveEdit = async (data: TeacherEditFormData) => {
    if (!editingTeacherId) return;
    try {
      await api.teachers.update(editingTeacherId, data);
      toast.success(`Faculty member ${data.full_name} updated successfully!`);
      setIsEditOpen(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update teacher");
    }
  };

  const handleOpenDeactivate = (teacher: TeacherListItem) => {
    setDeactivatingTeacher(teacher);
    setIsDeactivateOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingTeacher) return;
    setIsDeactivating(true);
    try {
      await api.teachers.deactivate(deactivatingTeacher.id);
      toast.success(`Faculty member ${deactivatingTeacher.full_name} deactivated safely.`);
      setIsDeactivateOpen(false);
      setDeactivatingTeacher(null);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate faculty member");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assigningTeacher) return;
    setIsSubmittingAssign(true);
    try {
      await api.teachers.assignClass(assigningTeacher.id, {
        class_name: assignClass,
        section_name: assignSection,
        subject_name: assignSubject,
        role_type: assignRoleType,
      });
      toast.success(`${assignClass}-${assignSection} (${assignSubject}) allotted to ${assigningTeacher.full_name}!`);
      setIsAssignOpen(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to allot class to faculty");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleUploadDocumentToExisting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTeacher || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const doc = await api.teachers.uploadDocument(selectedTeacher.id, file, "Educational Certificate", file.name);
      toast.success(`Certificate "${file.name}" uploaded successfully!`);
      const updatedDocs = await api.teachers.getDocuments(selectedTeacher.id);
      setSelectedTeacherDocs(updatedDocs);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedTeacher) return;
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    try {
      await api.teachers.deleteDocument(docId);
      toast.success("Document deleted successfully.");
      const updatedDocs = await api.teachers.getDocuments(selectedTeacher.id);
      setSelectedTeacherDocs(updatedDocs);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const columns: Column<TeacherListItem>[] = [
    {
      header: "Faculty ID",
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-brand-navy dark:text-brand-gold">
          {row.employee_id}
        </span>
      ),
    },
    {
      header: "Full Name",
      accessor: (row) => (
        <div>
          <div className="font-bold text-light-primary dark:text-dark-primary">{row.full_name}</div>
          <div className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.email}</div>
        </div>
      ),
    },
    {
      header: "Department & Role",
      accessor: (row) => (
        <div>
          <div className="font-medium text-xs text-light-primary dark:text-dark-primary">
            {row.department || "General"}
          </div>
          <div className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.designation}</div>
        </div>
      ),
    },
    {
      header: "Aadhaar Card",
      accessor: (row) => (
        <span className="font-mono text-xs text-light-secondary dark:text-dark-secondary">
          {maskAadhaar((row as any).aadhaar_number)}
        </span>
      ),
    },
    {
      header: "Certificates",
      accessor: (row) => (
        <Badge variant={row.documents_count && row.documents_count > 0 ? "gold" : "neutral"} size="sm">
          <FileText className="w-3 h-3 mr-1 inline" />
          {row.documents_count || 0} Docs
        </Badge>
      ),
    },
    {
      header: "Status",
      accessor: (row) => (
        <Badge variant={row.employment_status === "active" ? "success" : "neutral"}>
          {row.employment_status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.id)}
            title="View Profile & Credentials"
          >
            <Eye className="w-4 h-4 text-brand-blue" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAssigningTeacher(row);
              setIsAssignOpen(true);
            }}
            title="Allot Class & Subject"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            title="Edit Faculty Member"
          >
            <Edit2 className="w-4 h-4 text-amber-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDeactivate(row)}
            title="Deactivate Faculty"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Teachers Management"
        description="Comprehensive faculty directory, credentials verification, subject allotment, and confidential document dossiers."
        action={
          <Button
            variant="primary"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              resetCreate();
              setPendingFiles([]);
              setRegisterTab("personal");
              setIsRegisterOpen(true);
            }}
          >
            Add New Faculty Member
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-6">
          <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
            Search Faculty Directory
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
            <input
              type="text"
              placeholder="Search faculty name, ID, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
            Department
          </label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science (Physics/Chemistry)</option>
            <option value="English">English Core</option>
            <option value="Social Studies">Social Studies</option>
            <option value="Languages">Languages (Telugu/Hindi/Urdu)</option>
            <option value="Computer Science">Computer Science</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
            Employment Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Faculty</option>
            <option value="inactive">Inactive / On Leave</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
        <Table columns={columns} data={teachers} isLoading={isLoading} />
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / pageSize) || 1}
          onPageChange={setPage}
        />
      </div>

      {/* ==================================================================== */}
      {/* 1. ADMIT FACULTY MODAL (3-STEP: PERSONAL, PROFESSIONAL, DOCUMENTS) */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Faculty Admission & Onboarding"
        description="Registers faculty credentials, personal details, professional qualifications, and documents"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (registerTab === "documents") setRegisterTab("professional");
                else if (registerTab === "professional") setRegisterTab("personal");
                else setIsRegisterOpen(false);
              }}
            >
              {registerTab === "personal" ? "Cancel" : "Previous Step"}
            </Button>

            <div className="flex items-center gap-2">
              {registerTab !== "documents" ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (registerTab === "personal") setRegisterTab("professional");
                    else setRegisterTab("documents");
                  }}
                >
                  Continue to Next Step
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmitCreate(onRegisterTeacher)}
                  isLoading={isSubmittingCreate || uploadProgress}
                >
                  Confirm &amp; Admit Faculty Member
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Progress Step Badges */}
          <div className="grid grid-cols-3 gap-2 border-b border-light-border dark:border-dark-border pb-3">
            <button
              type="button"
              onClick={() => setRegisterTab("personal")}
              className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                registerTab === "personal"
                  ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary"
              }`}
            >
              1. Personal Details
            </button>
            <button
              type="button"
              onClick={() => setRegisterTab("professional")}
              className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                registerTab === "professional"
                  ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary"
              }`}
            >
              2. Professional Info
            </button>
            <button
              type="button"
              onClick={() => setRegisterTab("documents")}
              className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                registerTab === "documents"
                  ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary"
              }`}
            >
              3. Certificates &amp; Docs
            </button>
          </div>

          <form onSubmit={handleSubmitCreate(onRegisterTeacher)} className="space-y-4">
            {/* STEP 1: PERSONAL DETAILS */}
            {registerTab === "personal" && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Faculty Full Name *"
                    placeholder="e.g. Dr. Syed Khaja Mohiuddin"
                    error={createErrors.full_name?.message}
                    required
                    {...registerCreate("full_name")}
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                      Gender *
                    </label>
                    <select
                      {...registerCreate("gender")}
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    {...registerCreate("date_of_birth")}
                  />
                  <Input
                    label="Aadhaar Card Number (12 Digits)"
                    placeholder="e.g. 5432 9876 1234"
                    error={createErrors.aadhaar_number?.message}
                    {...registerCreate("aadhaar_number")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact Phone Number *"
                    placeholder="+91 98490 12345"
                    error={createErrors.contact_phone?.message}
                    required
                    {...registerCreate("contact_phone")}
                  />
                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="e.g. khaja.mohiuddin@dmhs.edu.in"
                    error={createErrors.email?.message}
                    required
                    {...registerCreate("email")}
                  />
                </div>

                <div className="col-span-full">
                  <Input
                    label="Residential Address"
                    placeholder="Street, locality, Hyderabad, Telangana"
                    {...registerCreate("address")}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: PROFESSIONAL & CLASS ALLOTMENT */}
            {registerTab === "professional" && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Faculty / Employee ID *"
                    placeholder="e.g. EMP-104"
                    error={createErrors.employee_id?.message}
                    required
                    {...registerCreate("employee_id")}
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                      Department *
                    </label>
                    <select
                      {...registerCreate("department")}
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science (Physics/Chemistry/Bio)</option>
                      <option value="English">English</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Languages">Languages (Telugu/Hindi/Urdu)</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Physical Education">Physical Education</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Designation / Title *"
                    placeholder="e.g. Senior Faculty / PGT Mathematics"
                    error={createErrors.designation?.message}
                    required
                    {...registerCreate("designation")}
                  />
                  <Input
                    label="Educational Qualifications"
                    placeholder="e.g. M.Sc. Mathematics, B.Ed"
                    {...registerCreate("qualification")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Subject Specialization"
                    placeholder="e.g. Algebra & Calculus"
                    {...registerCreate("specialization")}
                  />
                  <Input
                    label="Date of Joining"
                    type="date"
                    {...registerCreate("joining_date")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                      Initial Assigned Class
                    </label>
                    <select
                      {...registerCreate("assigned_class")}
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                    >
                      <option value="Class 10">Class 10</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 1">Class 1</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                        Portal Login Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pass = "TCH@" + Math.floor(1000 + Math.random() * 9000);
                          setCreateValue("password", pass);
                          toast.success(`Generated portal password: ${pass}`);
                        }}
                        className="text-[11px] font-bold text-brand-blue dark:text-brand-gold hover:underline"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <Input
                      placeholder="Password for portal"
                      error={createErrors.password?.message}
                      required
                      {...registerCreate("password")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CERTIFICATES & DOCUMENTS */}
            {registerTab === "documents" && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-blue" />
                    Verified Faculty Credentials Dossier
                  </p>
                  <p>
                    Attach digital copies of Aadhaar card, degree certificates, B.Ed marksheet, and prior experience letters. Supported: PDF, JPG, PNG (up to 15MB each).
                  </p>
                </div>

                <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-xl p-6 text-center hover:border-brand-navy transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-light-secondary dark:text-dark-secondary mb-2" />
                  <label className="cursor-pointer font-bold text-xs text-brand-navy dark:text-brand-gold hover:underline">
                    <span>Click to browse and upload multiple certificates</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          const added = files.map((f) => ({
                            file: f,
                            type: f.name.toLowerCase().includes("aadhaar")
                              ? "Aadhaar Card Copy"
                              : f.name.toLowerCase().includes("degree")
                              ? "Degree Certificate"
                              : f.name.toLowerCase().includes("exp")
                              ? "Experience Certificate"
                              : "Educational Certificate",
                            title: f.name,
                          }));
                          setPendingFiles((prev) => [...prev, ...added]);
                          toast.success(`Selected ${files.length} document(s) for upload`);
                        }
                      }}
                    />
                  </label>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
                    Multiple files supported simultaneously
                  </p>
                </div>

                {/* Selected Files List */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                      Ready for Upload ({pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""})
                    </h5>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {pendingFiles.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-light-primary dark:text-dark-primary truncate">
                              {item.title}
                            </span>
                            <Badge variant="blue" size="sm">{item.type}</Badge>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-700 ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </Dialog>

      {/* ==================================================================== */}
      {/* 2. FACULTY PROFILE DETAILS & CERTIFICATES DOSSIER MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Faculty Member Dossier"
        description="Comprehensive profile, allotted timetable periods, and uploaded credentials"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                if (selectedTeacher) {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedTeacher);
                }
              }}
            >
              Edit Details
            </Button>
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedTeacher && (
          <div className="space-y-5">
            {/* Header Card */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-brand-navy/10 dark:bg-brand-gold/15 border border-brand-navy/20 dark:border-brand-gold/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg flex items-center justify-center font-bold text-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-light-primary dark:text-dark-primary">
                    {selectedTeacher.full_name}
                  </h4>
                  <p className="text-xs font-mono font-bold text-brand-navy dark:text-brand-gold">
                    ID: {selectedTeacher.employee_id} • {selectedTeacher.department || "General"}
                  </p>
                </div>
              </div>
              <Badge variant={selectedTeacher.employment_status === "active" ? "success" : "neutral"}>
                {selectedTeacher.employment_status === "active" ? "Active Faculty" : "Inactive"}
              </Badge>
            </div>

            {/* Confidential Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Designation</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.designation}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Official Email</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block truncate">
                  {selectedTeacher.email}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Contact Number</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.contact_phone || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Aadhaar Card Number</span>
                <span className="font-semibold font-mono text-light-primary dark:text-dark-primary block">
                  {maskAadhaar((selectedTeacher as any).aadhaar_number)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Qualifications</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.qualification || "—"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Date of Joining</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.joining_date || "—"}
                </span>
              </div>
            </div>

            {/* Uploaded Certificates & Credentials Dossier */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-gold" />
                  <span>Verified Certificates &amp; Documents ({selectedTeacherDocs.length})</span>
                </h5>
                <label className="cursor-pointer text-xs font-bold text-brand-blue dark:text-brand-gold hover:underline flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Certificate</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadDocumentToExisting}
                  />
                </label>
              </div>

              {selectedTeacherDocs.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated text-center text-xs text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border">
                  No certificates currently attached. Click "Upload Certificate" above to attach degree, Aadhaar, or experience proofs.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTeacherDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-light-primary dark:text-dark-primary truncate">
                            {doc.title}
                          </div>
                          <div className="text-[10px] text-light-secondary dark:text-dark-secondary">
                            {doc.document_type} • {doc.created_at?.slice(0, 10)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-blue" />
                        </Button>
                        <a
                          href={doc.file_url}
                          download={doc.title}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border text-light-secondary dark:text-dark-secondary"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Class & Subject Assignments */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-blue" />
                <span>Allotted Classes &amp; Subjects</span>
              </h5>
              {(!selectedTeacher.assignments || selectedTeacher.assignments.length === 0) ? (
                <p className="text-xs text-light-secondary dark:text-dark-secondary p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                  No classes currently assigned for this term.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTeacher.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-light-primary dark:text-dark-primary">
                        {a.class_name} - Sec {a.section_name} ({a.subject_name})
                      </span>
                      <Badge variant="gold" size="sm">
                        {a.role_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ==================================================================== */}
      {/* 3. DOCUMENT PREVIEW MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || "Document Preview"}
        description={`Type: ${previewDoc?.document_type || "Certificate"}`}
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <a
              href={previewDoc?.file_url}
              download={previewDoc?.title}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              Download Document
            </a>
            <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
              Close Preview
            </Button>
          </div>
        }
      >
        <div className="h-[60vh] flex items-center justify-center bg-gray-100 dark:bg-dark-elevated rounded-xl overflow-hidden p-2">
          {previewDoc?.file_url?.startsWith("data:image/") ||
          previewDoc?.file_url?.endsWith(".jpg") ||
          previewDoc?.file_url?.endsWith(".png") ? (
            <img
              src={previewDoc.file_url}
              alt={previewDoc.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <iframe
              src={previewDoc?.file_url}
              title={previewDoc?.title}
              className="w-full h-full border-0 rounded-lg"
            />
          )}
        </div>
      </Dialog>

      {/* ==================================================================== */}
      {/* 4. EDIT FACULTY MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Faculty Member"
        description="Update faculty profile and credentials in the persistent school database"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={isSubmittingEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitEdit(onSaveEdit)} isLoading={isSubmittingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
          <Input
            label="Faculty Full Name"
            placeholder="e.g. Dr. Syed Ibrahim"
            error={editErrors.full_name?.message}
            required
            {...registerEdit("full_name")}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. syed.ibrahim@dmhs.edu.in"
            error={editErrors.email?.message}
            required
            {...registerEdit("email")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Designation"
              placeholder="e.g. Senior Faculty"
              error={editErrors.designation?.message}
              required
              {...registerEdit("designation")}
            />
            <Input
              label="Department"
              placeholder="e.g. Mathematics"
              error={editErrors.department?.message}
              {...registerEdit("department")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Qualifications"
              placeholder="e.g. M.Sc, B.Ed"
              {...registerEdit("qualification")}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98490 00000"
              error={editErrors.contact_phone?.message}
              {...registerEdit("contact_phone")}
            />
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* 5. ALLOT CLASS & SUBJECT MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Allot Class & Subject to Faculty"
        description={`Assign teaching responsibilities to ${assigningTeacher?.full_name || "Faculty"}`}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)} disabled={isSubmittingAssign}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAssign} isLoading={isSubmittingAssign}>
              Confirm Allotment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              Select Class
            </label>
            <select
              value={assignClass}
              onChange={(e) => setAssignClass(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
            >
              <option value="Class 10">Class 10</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 8">Class 8</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 6">Class 6</option>
              <option value="Class 5">Class 5</option>
              <option value="Class 1">Class 1</option>
              <option value="UKG">UKG</option>
              <option value="LKG">LKG</option>
              <option value="Nursery">Nursery</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
                Section
              </label>
              <select
                value={assignSection}
                onChange={(e) => setAssignSection(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
                Role Type
              </label>
              <select
                value={assignRoleType}
                onChange={(e) => setAssignRoleType(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
              >
                <option value="Class Teacher">Class Teacher</option>
                <option value="Subject Teacher">Subject Teacher</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={assignSubject}
              onChange={(e) => setAssignSubject(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
            />
          </div>
        </div>
      </Dialog>

      {/* ==================================================================== */}
      {/* 6. CONFIRM DEACTIVATE MODAL */}
      {/* ==================================================================== */}
      <ConfirmDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Faculty Member"
        message={`Are you sure you want to deactivate ${deactivatingTeacher?.full_name} (${deactivatingTeacher?.employee_id})? The teacher will no longer be able to log in or enter marks, but historical records will be preserved.`}
        confirmText="Deactivate Faculty"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
};
