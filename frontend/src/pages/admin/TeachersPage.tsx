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
  UserCheck,
  History,
  Sparkles,
  School,
  GraduationCap as GradCap,
  UserX,
} from "lucide-react";
import { api } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
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
  const clean = String(val).replace(/\D/g, "");
  if (clean.length < 4) return "••••";
  return `•••• •••• ${clean.slice(-4)}`;
};

export const TeachersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const toast = useToast();

  // Main Mode Tab: "directory" | "assignments"
  const [mainTab, setMainTab] = useState<"directory" | "assignments">("directory");
  const [facultyCategory, setFacultyCategory] = useState<"Teaching Faculty" | "Non-Teaching Staff">("Teaching Faculty");

  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Phase 2: Class Teacher Assignments State
  const [classAssignments, setClassAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState<any | null>(null);
  const [chosenTeacherId, setChosenTeacherId] = useState<string>("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [historyTargetClassName, setHistoryTargetClassName] = useState<string>("");

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

  // Permanent Delete Faculty State
  const [permanentlyDeletingTeacher, setPermanentlyDeletingTeacher] = useState<TeacherListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

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

  const fetchClassAssignments = useCallback(async () => {
    setIsLoadingAssignments(true);
    try {
      const data = await (api as any).classTeachers.list();
      setClassAssignments(data);
    } catch (err: any) {
      console.warn("Failed to load class assignments:", err);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchClassAssignments();
  }, [fetchTeachers, fetchClassAssignments]);

  // Real-time synchronization across devices and browser sessions
  useRealtimeSync({
    tables: ["teachers", "class_teacher_assignments"],
    onSync: () => {
      fetchTeachers();
      fetchClassAssignments();
    },
  });

  const onInvalidCreate = (errors: any) => {
    const personalKeys = ["full_name", "contact_phone", "email", "aadhaar_number", "date_of_birth"];
    const profKeys = ["employee_id", "department", "designation", "password", "qualification", "specialization", "joining_date"];

    if (personalKeys.some((k) => errors[k])) {
      setRegisterTab("personal");
      const firstErrKey = personalKeys.find((k) => errors[k]);
      toast.error(errors[firstErrKey]?.message || "Please complete all mandatory personal details.");
    } else if (profKeys.some((k) => errors[k])) {
      setRegisterTab("professional");
      const firstErrKey = profKeys.find((k) => errors[k]);
      toast.error(errors[firstErrKey]?.message || "Please complete all mandatory professional details.");
    } else {
      const firstKey = Object.keys(errors)[0];
      toast.error(errors[firstKey]?.message || "Please check required fields.");
    }
  };

  const onRegisterTeacher = async (data: TeacherCreateFormData) => {
    try {
      setUploadProgress(true);
      const newTeacher = await api.teachers.create(data);

      // Upload any attached certificates
      if (pendingFiles.length > 0 && newTeacher?.id) {
        for (const item of pendingFiles) {
          try {
            await api.teachers.uploadDocument(newTeacher.id, item.file, item.type, item.title);
          } catch (e) {
            console.warn("Certificate upload warning:", e);
          }
        }
      }

      toast.success(
        `Faculty member ${data.full_name} (${data.employee_id}) admitted successfully to DMHS!`,
        { title: "Admission Confirmed" }
      );
      setIsRegisterOpen(false);
      resetCreate();
      setPendingFiles([]);
      setRegisterTab("personal");
      await Promise.all([fetchTeachers(), fetchClassAssignments()]);
    } catch (err: any) {
      toast.error(err.message || "Failed to register faculty member. Please check details and retry.", {
        title: "Admission Failed",
      });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleOpenAssignModal = (cls: any) => {
    setSelectedClassForAssign(cls);
    setChosenTeacherId(cls.teacher_id || "");
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedClassForAssign || !chosenTeacherId) {
      toast.error("Please select a faculty member to assign as Class Teacher.");
      return;
    }
    setIsSavingAssignment(true);
    try {
      await (api as any).classTeachers.assign(selectedClassForAssign.class_id, chosenTeacherId);
      toast.success(
        `Class Teacher assigned successfully to ${selectedClassForAssign.class_name}! Permissions updated immediately.`,
        { title: "Class Teacher Assigned" }
      );
      setIsAssignModalOpen(false);
      setSelectedClassForAssign(null);
      setChosenTeacherId("");
      await Promise.all([fetchClassAssignments(), fetchTeachers()]);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign Class Teacher");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleOpenHistory = async (cls?: any) => {
    try {
      setHistoryTargetClassName(cls ? cls.class_name : "All Classes");
      const history = await (api as any).classTeachers.getHistory(cls?.class_id);
      setAssignmentHistory(history);
      setIsHistoryModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load assignment history");
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

  const handleConfirmPermanentDeleteTeacher = async () => {
    if (!permanentlyDeletingTeacher || deleteConfirmText.trim() !== "DELETE") return;
    setIsPermanentlyDeleting(true);
    try {
      await api.teachers.deletePermanently(permanentlyDeletingTeacher.id);
      toast.success(
        `Faculty member ${permanentlyDeletingTeacher.full_name} (${permanentlyDeletingTeacher.employee_id}) permanently deleted from DMHS database.`
      );
      setPermanentlyDeletingTeacher(null);
      setDeleteConfirmText("");
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete faculty member");
    } finally {
      setIsPermanentlyDeleting(false);
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
      key: "employee_id",
      header: "Faculty ID",
      render: (row) => (
        <span className="font-mono font-bold text-xs text-brand-navy dark:text-brand-gold">
          {row.employee_id}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Full Name",
      render: (row) => (
        <div>
          <div className="font-bold text-light-primary dark:text-dark-primary">{row.full_name}</div>
          <div className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.email}</div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department & Role",
      render: (row) => (
        <div>
          <div className="font-medium text-xs text-light-primary dark:text-dark-primary">
            {row.department || "General"}
          </div>
          <div className="text-[11px] text-light-secondary dark:text-dark-secondary">{row.designation}</div>
        </div>
      ),
    },
    {
      key: "aadhaar_number",
      header: "Aadhaar Card",
      render: (row) => (
        <span className="font-mono text-xs text-light-secondary dark:text-dark-secondary">
          {maskAadhaar((row as any).aadhaar_number)}
        </span>
      ),
    },
    {
      key: "documents",
      header: "Certificates",
      render: (row) => (
        <Badge variant={row.documents_count && row.documents_count > 0 ? "gold" : "neutral"} size="sm">
          <FileText className="w-3 h-3 mr-1 inline" />
          {row.documents_count || 0} Docs
        </Badge>
      ),
    },
    {
      key: "employment_status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.employment_status === "active" ? "success" : "neutral"}>
          {row.employment_status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
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
            <Trash2 className="w-4 h-4 text-amber-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPermanentlyDeletingTeacher(row);
              setDeleteConfirmText("");
            }}
            title="Delete Permanently"
            className="hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <UserX className="w-4 h-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Teachers Management"
        description="Comprehensive faculty directory, credentials verification, class teacher assignment, and confidential document dossiers."
        action={
          <div className="flex items-center gap-2">
            {mainTab === "assignments" && (
              <Button
                variant="secondary"
                leftIcon={<History className="w-4 h-4" />}
                onClick={() => handleOpenHistory()}
              >
                Assignment History
              </Button>
            )}
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
          </div>
        }
      />

      {/* Main Mode Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-light-border dark:border-dark-border pb-3">
        <button
          type="button"
          onClick={() => setMainTab("directory")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            mainTab === "directory"
              ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg shadow-sm"
              : "bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-secondary dark:text-dark-secondary hover:bg-gray-100"
          }`}
        >
          <Users className="w-4 h-4" />
          Faculty &amp; Staff Directory ({total || teachers.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setMainTab("assignments");
            fetchClassAssignments();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            mainTab === "assignments"
              ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg shadow-sm"
              : "bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-secondary dark:text-dark-secondary hover:bg-gray-100"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Class Teacher Assignments (13 Classes)
        </button>
      </div>

      {mainTab === "directory" ? (
        <>
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
            <Table
              columns={columns}
              data={teachers}
              keyExtractor={(row) => String(row.id || row.employee_id)}
              isLoading={isLoading}
            />
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize) || 1}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        /* DEDICATED CLASS TEACHER ASSIGNMENT SYSTEM (PHASE 2) */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
            <Shield className="w-5 h-5 text-brand-navy dark:text-brand-gold shrink-0 mt-0.5" />
            <div className="text-xs text-light-primary dark:text-dark-primary leading-relaxed">
              <span className="font-bold text-sm block mb-1">Deccan Mission High School — Class Teacher Governance</span>
              Total 13 Teachers: <strong>3 Teachers</strong> dedicated to Pre-Primary (Nursery, LKG, UKG) and <strong>10 Teachers</strong> dedicated to Classes 1 to 10.
              Each class has exactly <strong>one active Class Teacher</strong> at any time. When a class teacher is updated, attendance permissions automatically transfer to the newly assigned teacher immediately, and full history is audited.
            </div>
          </div>

          {/* Pre-Primary Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-brand-navy dark:text-brand-gold uppercase tracking-wider flex items-center gap-2">
                <School className="w-4 h-4" />
                Pre-Primary Wings (3 Classes / 3 Teachers)
              </h3>
              <Badge variant="gold">Nursery, LKG &amp; UKG</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Array.isArray(classAssignments) ? classAssignments : [])
                .filter((c) => ["Nursery", "LKG", "UKG"].includes(c?.class_name) || (c?.grade_level !== undefined && c?.grade_level <= 0))
                .map((cls) => (
                  <div
                    key={cls.class_id}
                    className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-base text-brand-navy dark:text-white">{cls.class_name}</span>
                        <Badge variant={cls.is_assigned ? "success" : "neutral"} size="sm">
                          {cls.is_assigned ? "Assigned" : "Unassigned"}
                        </Badge>
                      </div>

                      {cls.is_assigned ? (
                        <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated mb-4">
                          <div className="font-bold text-sm text-light-primary dark:text-dark-primary flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            {cls.teacher_name}
                          </div>
                          <div className="text-xs text-light-secondary dark:text-dark-secondary font-mono">
                            ID: {cls.employee_id || "—"}
                          </div>
                          <div className="text-[11px] text-light-secondary dark:text-dark-secondary">
                            {cls.designation || "Class Teacher"} ({cls.department || "Pre-Primary"})
                          </div>
                          {cls.assigned_at && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                              Assigned: {new Date(cls.assigned_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 text-xs mb-4">
                          No active Class Teacher assigned. Daily attendance submission is restricted.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-light-border dark:border-dark-border">
                      <Button
                        variant={cls.is_assigned ? "secondary" : "primary"}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenAssignModal(cls)}
                      >
                        {cls.is_assigned ? "Change Teacher" : "Assign Teacher"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenHistory(cls)}
                        title="View Assignment History"
                      >
                        <History className="w-4 h-4 text-light-secondary dark:text-dark-secondary" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Primary & Higher Classes Section */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-brand-navy dark:text-brand-gold uppercase tracking-wider flex items-center gap-2">
                <GradCap className="w-4 h-4" />
                Primary &amp; High School (Classes 1 to 10 / 10 Teachers)
              </h3>
              <Badge variant="blue">Classes 1 — 10</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {(Array.isArray(classAssignments) ? classAssignments : [])
                .filter((c) => !["Nursery", "LKG", "UKG"].includes(c?.class_name) && (c?.grade_level !== undefined && c?.grade_level > 0))
                .map((cls) => (
                  <div
                    key={cls.class_id}
                    className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-brand-navy dark:text-white">{cls.class_name}</span>
                        <Badge variant={cls.is_assigned ? "success" : "neutral"} size="sm">
                          {cls.is_assigned ? "Active" : "Vacant"}
                        </Badge>
                      </div>

                      {cls.is_assigned ? (
                        <div className="space-y-1 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-elevated mb-3 text-xs">
                          <div className="font-bold text-light-primary dark:text-dark-primary truncate">
                            {cls.teacher_name}
                          </div>
                          <div className="text-[11px] text-light-secondary dark:text-dark-secondary font-mono">
                            {cls.employee_id}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {cls.department || "Faculty"}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-[11px] mb-3">
                          No Class Teacher
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-light-border dark:border-dark-border">
                      <Button
                        variant={cls.is_assigned ? "secondary" : "primary"}
                        size="sm"
                        className="flex-1 text-xs px-2 py-1"
                        onClick={() => handleOpenAssignModal(cls)}
                      >
                        {cls.is_assigned ? "Change" : "Assign"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        onClick={() => handleOpenHistory(cls)}
                        title="View History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. ADMIT FACULTY MODAL (3-STEP: PERSONAL, PROFESSIONAL, DOCUMENTS) */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title={facultyCategory === "Teaching Faculty" ? "Faculty Admission & Onboarding" : "Staff Onboarding & Registration"}
        description={`Registers ${facultyCategory.toLowerCase()} credentials, personal details, professional qualifications, and documents`}
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
              {registerTab !== "documents" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (registerTab === "personal") setRegisterTab("professional");
                    else setRegisterTab("documents");
                  }}
                >
                  Next Step →
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitCreate(onRegisterTeacher, onInvalidCreate)}
                isLoading={isSubmittingCreate || uploadProgress}
                disabled={isSubmittingCreate || uploadProgress}
              >
                {registerTab === "documents"
                  ? `Confirm & Admit ${facultyCategory === "Teaching Faculty" ? "Faculty" : "Staff"}`
                  : `Save ${facultyCategory === "Teaching Faculty" ? "Faculty" : "Staff"} Member`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Category Toggle: Teaching Faculty vs Non-Teaching Staff */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-light-border dark:border-dark-border">
            <span className="text-xs font-bold text-light-primary dark:text-dark-primary uppercase tracking-wider">
              Category:
            </span>
            <div className="inline-flex rounded-lg bg-light-card dark:bg-dark-card p-1 border border-light-border dark:border-dark-border">
              <button
                type="button"
                onClick={() => {
                  setFacultyCategory("Teaching Faculty");
                  setCreateValue("department", "Mathematics");
                  setCreateValue("designation", "Faculty / Senior Teacher");
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  facultyCategory === "Teaching Faculty"
                    ? "bg-brand-navy text-white shadow-sm"
                    : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
                }`}
              >
                🎓 Teaching Faculty
              </button>
              <button
                type="button"
                onClick={() => {
                  setFacultyCategory("Non-Teaching Staff");
                  setCreateValue("department", "Administration");
                  setCreateValue("designation", "Administrative Staff");
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  facultyCategory === "Non-Teaching Staff"
                    ? "bg-brand-navy text-white shadow-sm"
                    : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
                }`}
              >
                💼 Non-Teaching Staff
              </button>
            </div>
            <span className="text-xs text-light-secondary dark:text-dark-secondary hidden sm:inline">
              ({facultyCategory === "Teaching Faculty" ? "Teachers & Lecturers" : "Accounts, Admin, Library & Support"})
            </span>
          </div>

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

          <form onSubmit={handleSubmitCreate(onRegisterTeacher, onInvalidCreate)} className="space-y-4">
            {/* STEP 1: PERSONAL DETAILS (Kept mounted to preserve form state) */}
            <div className={registerTab === "personal" ? "space-y-4 animate-in fade-in-50" : "hidden"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={`${facultyCategory === "Teaching Faculty" ? "Faculty" : "Staff"} Full Name *`}
                  placeholder="Enter full name"
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
                  placeholder="Enter 12-digit Aadhaar number"
                  error={createErrors.aadhaar_number?.message}
                  {...registerCreate("aadhaar_number")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Phone Number *"
                  placeholder="Enter phone number (+91 ...)"
                  error={createErrors.contact_phone?.message}
                  required
                  {...registerCreate("contact_phone")}
                />
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="Enter official email address"
                  error={createErrors.email?.message}
                  required
                  {...registerCreate("email")}
                />
              </div>

              <div className="col-span-full">
                <Input
                  label="Residential Address"
                  placeholder="Enter residential address"
                  {...registerCreate("address")}
                />
              </div>
            </div>

            {/* STEP 2: PROFESSIONAL & CLASS ALLOTMENT (Kept mounted to preserve form state) */}
            <div className={registerTab === "professional" ? "space-y-4 animate-in fade-in-50" : "hidden"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={`${facultyCategory === "Teaching Faculty" ? "Faculty" : "Staff"} / Employee ID *`}
                  placeholder="Enter employee ID (e.g. EMP-001)"
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
                    {facultyCategory === "Teaching Faculty" ? (
                      <>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science (Physics/Chemistry/Bio)</option>
                        <option value="English">English</option>
                        <option value="Social Studies">Social Studies</option>
                        <option value="Languages">Languages (Telugu/Hindi/Urdu)</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Physical Education">Physical Education</option>
                        <option value="Pre-Primary">Pre-Primary (Nursery/LKG/UKG)</option>
                      </>
                    ) : (
                      <>
                        <option value="Administration">Administration</option>
                        <option value="Accounts & Finance">Accounts & Finance</option>
                        <option value="Library">Library</option>
                        <option value="Laboratory">Laboratory Operations</option>
                        <option value="Front Desk">Front Desk & Admissions</option>
                        <option value="Operations">Operations & Campus</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Designation / Title *"
                  placeholder={
                    facultyCategory === "Teaching Faculty"
                      ? "Enter faculty designation (e.g. Senior Faculty)"
                      : "Enter staff designation (e.g. Accountant)"
                  }
                  error={createErrors.designation?.message}
                  required
                  {...registerCreate("designation")}
                />
                <Input
                  label="Educational Qualifications"
                  placeholder="Enter educational qualifications"
                  {...registerCreate("qualification")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Specialization / Subject Domain"
                  placeholder="Enter specialization or subject domain"
                  {...registerCreate("specialization")}
                />
                <Input
                  label="Date of Joining"
                  type="date"
                  {...registerCreate("joining_date")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {facultyCategory === "Teaching Faculty" ? (
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
                      <option value="UKG">UKG</option>
                      <option value="LKG">LKG</option>
                      <option value="Nursery">Nursery</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                      Staff Role Category
                    </label>
                    <div className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border font-medium">
                      Non-Teaching Staff (Operations / Admin)
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                      Portal Login Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pass = "DMHS@" + Math.floor(1000 + Math.random() * 9000);
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

            {/* STEP 3: CERTIFICATES & DOCUMENTS (Kept mounted to preserve state) */}
            <div className={registerTab === "documents" ? "space-y-4 animate-in fade-in-50" : "hidden"}>
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
            </div>
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
            placeholder="Enter faculty full name"
            error={editErrors.full_name?.message}
            required
            {...registerEdit("full_name")}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter official email address"
            error={editErrors.email?.message}
            required
            {...registerEdit("email")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Designation"
              placeholder="Enter designation"
              error={editErrors.designation?.message}
              required
              {...registerEdit("designation")}
            />
            <Input
              label="Department"
              placeholder="Enter department"
              error={editErrors.department?.message}
              {...registerEdit("department")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Qualifications"
              placeholder="Enter educational qualifications"
              {...registerEdit("qualification")}
            />
            <Input
              label="Contact Phone"
              placeholder="Enter phone number (+91 ...)"
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

      {/* ==================================================================== */}
      {/* 7. ASSIGN / CHANGE CLASS TEACHER MODAL (PHASE 2) */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Class Teacher — ${selectedClassForAssign?.class_name || "Class"}`}
        description="Select an admitted faculty member to appoint as the sole active Class Teacher with exclusive daily attendance permissions."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
              disabled={isSavingAssignment}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmAssignment}
              isLoading={isSavingAssignment}
            >
              Confirm &amp; Save Assignment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Permission Transfer:</strong> Assigning a teacher will immediately grant them attendance marking authority for {selectedClassForAssign?.class_name}. Any previously assigned teacher will lose attendance rights instantly.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary mb-1">
              Select Admitted Faculty Member *
            </label>
            <select
              value={chosenTeacherId}
              onChange={(e) => setChosenTeacherId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            >
              <option value="">-- Choose Faculty Member --</option>
              {teachers
                .filter((t) => t.is_active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.employee_id}) — {t.department || "General"}
                  </option>
                ))}
            </select>
          </div>

          {selectedClassForAssign?.is_assigned && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated text-xs space-y-1">
              <span className="text-light-secondary dark:text-dark-secondary block font-semibold">Currently Active Teacher:</span>
              <span className="font-bold text-light-primary dark:text-dark-primary">
                {selectedClassForAssign.teacher_name} ({selectedClassForAssign.employee_id})
              </span>
            </div>
          )}
        </div>
      </Dialog>

      {/* ==================================================================== */}
      {/* 8. CLASS TEACHER ASSIGNMENT AUDIT HISTORY MODAL (PHASE 2 REQ 11) */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Class Teacher Assignment History — ${historyTargetClassName}`}
        description="Immutable audit trail of faculty appointments, class responsibilities, and reassignment timestamps."
        maxWidth="2xl"
        footer={
          <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>
            Close History
          </Button>
        }
      >
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
          {assignmentHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-light-secondary dark:text-dark-secondary">
              No historical assignment records found.
            </div>
          ) : (
            <div className="space-y-2">
              {assignmentHistory.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-light-primary dark:text-dark-primary">
                        {h.teacher_name}
                      </span>
                      <span className="font-mono text-[11px] text-light-secondary dark:text-dark-secondary">
                        ({h.employee_id})
                      </span>
                      <Badge variant="blue" size="sm">{h.class_name}</Badge>
                    </div>
                    <div className="text-[11px] text-light-secondary dark:text-dark-secondary flex items-center gap-3">
                      <span>Assigned: {new Date(h.assigned_at).toLocaleString()}</span>
                      {h.revoked_at && (
                        <span className="text-rose-600 dark:text-rose-400">
                          Changed / Revoked: {new Date(h.revoked_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Badge variant={h.is_active ? "success" : "neutral"} size="sm">
                      {h.is_active ? "Active" : "Archived"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Permanent Delete Faculty Dialog with Typed Confirmation */}
      <Dialog
        isOpen={!!permanentlyDeletingTeacher}
        onClose={() => {
          if (!isPermanentlyDeleting) {
            setPermanentlyDeletingTeacher(null);
            setDeleteConfirmText("");
          }
        }}
        title="Permanently Delete Faculty / Staff Record"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Permanent Database Cascade Deletion</span>
            </div>
            <p className="text-xs text-light-secondary dark:text-dark-secondary leading-relaxed">
              You are about to permanently delete faculty/staff record for{" "}
              <strong className="text-light-primary dark:text-dark-primary font-bold">
                {permanentlyDeletingTeacher?.full_name}
              </strong>{" "}
              (Employee ID:{" "}
              <strong className="font-mono text-brand-gold">
                {permanentlyDeletingTeacher?.employee_id}
              </strong>
              ).
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">
              This action will completely remove this faculty member, revoke all active class and subject teacher allotments, unlink attendance/grading logs safely, and purge their login account from the DMHS database. This operation cannot be reversed.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary">
              To confirm deletion, please type <span className="font-mono text-red-600 font-bold">DELETE</span> below:
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono text-center tracking-widest font-bold border-red-300 focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-light-border dark:border-dark-border">
            <Button
              variant="outline"
              onClick={() => {
                setPermanentlyDeletingTeacher(null);
                setDeleteConfirmText("");
              }}
              disabled={isPermanentlyDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              disabled={deleteConfirmText.trim() !== "DELETE" || isPermanentlyDeleting}
              onClick={handleConfirmPermanentDeleteTeacher}
              isLoading={isPermanentlyDeleting}
            >
              Permanently Delete Record
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
