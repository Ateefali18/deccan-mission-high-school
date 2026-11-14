import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Layers,
  Calendar,
  Users,
  ShieldCheck,
  Download,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { api, getCategoryForClass } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { StudentListItem, StudentProfile, SchoolClass, AcademicYear, AcademicTerm, DocumentItem } from "../../types";
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

// ----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ----------------------------------------------------------------------------

const studentCreateSchema = z.object({
  // Personal Info
  full_name: z.string().min(2, "Student full name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select gender"),
  caste: z.string().optional(),
  religion: z.string().optional(),
  mother_tongue: z.string().optional(),
  first_language: z.string().optional(),
  second_language: z.string().optional(),
  third_language: z.string().optional(),
  aadhaar_number: z.string().optional(),
  apaar_id: z.string().optional(),
  admission_date: z.string().optional(),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  student_phone: z.string().optional(),
  blood_group: z.string().optional(),
  address: z.string().optional(),

  // Parent Info (Separate Father and Mother)
  father_name: z.string().min(2, "Father's full name is required"),
  father_phone: z.string().min(5, "Father's contact number is required"),
  father_email: z.string().email("Valid email required").optional().or(z.literal("")),
  father_occupation: z.string().optional(),

  mother_name: z.string().min(2, "Mother's full name is required"),
  mother_phone: z.string().optional(),
  mother_email: z.string().email("Valid email required").optional().or(z.literal("")),
  mother_occupation: z.string().optional(),

  // Academic Info
  academic_year_id: z.union([z.string().min(1, "Select academic year"), z.number().min(1, "Select academic year")]),
  academic_term_id: z.union([z.string(), z.number()]).optional(),
  class_id: z.union([z.string().min(1, "Please select a class"), z.number().min(1, "Please select a class")]),
  section_id: z.union([z.string().min(1, "Please select a section"), z.number().min(1, "Please select a section")]),
  admission_number: z.string().min(3, "Admission number is required"),
  roll_number: z.string().optional(),
  password: z.string().min(1, "Password is required").default("1234"),
});

const studentEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  caste: z.string().optional(),
  religion: z.string().optional(),
  mother_tongue: z.string().optional(),
  first_language: z.string().optional(),
  second_language: z.string().optional(),
  third_language: z.string().optional(),
  aadhaar_number: z.string().optional(),
  apaar_id: z.string().optional(),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  student_phone: z.string().optional(),
  blood_group: z.string().optional(),
  address: z.string().optional(),

  father_name: z.string().optional(),
  father_phone: z.string().optional(),
  father_email: z.string().optional(),
  father_occupation: z.string().optional(),

  mother_name: z.string().optional(),
  mother_phone: z.string().optional(),
  mother_email: z.string().optional(),
  mother_occupation: z.string().optional(),

  class_id: z.union([z.string(), z.number()]).optional(),
  section_id: z.union([z.string(), z.number()]).optional(),
  roll_number: z.string().optional(),
  student_status: z.string().default("active"),
});

type StudentCreateFormData = z.infer<typeof studentCreateSchema>;
type StudentEditFormData = z.infer<typeof studentEditSchema>;

export const StudentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const toast = useToast();

  // Active View Tab: Directory vs Documents
  const [activeTab, setActiveTab] = useState<"directory" | "documents">("directory");

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Automatically open admission dialog if navigated with ?action=admit
  useEffect(() => {
    if (searchParams.get("action") === "admit") {
      setIsRegisterOpen(true);
    }
  }, [searchParams]);
  const [admissionFormStep, setAdmissionFormStep] = useState<1 | 2 | 3>(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [studentDocs, setStudentDocs] = useState<DocumentItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Document Management Modal
  const [docUploadTitle, setDocUploadTitle] = useState("");
  const [docUploadType, setDocUploadType] = useState("Birth Certificate");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | number | null>(null);

  // Deactivate Confirmation
  const [deactivatingStudent, setDeactivatingStudent] = useState<StudentListItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Permanent Delete Confirmation
  const [permanentlyDeletingStudent, setPermanentlyDeletingStudent] = useState<StudentListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Registration Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StudentCreateFormData>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      password: "1234",
      admission_date: new Date().toISOString().slice(0, 10),
      gender: "Male",
      first_language: "Telugu",
      second_language: "Hindi",
      third_language: "English",
      religion: "Islam",
      caste: "BC-E",
      mother_tongue: "Urdu",
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
  const watchedCreateAyId = watch("academic_year_id");
  const watchedEditClassId = watchEdit("class_id");

  const selectedEditClassObj = useMemo(() => {
    return classes.find((c) => String(c.id) === String(watchedEditClassId));
  }, [classes, watchedEditClassId]);

  const availableEditSections = useMemo(() => {
    return selectedEditClassObj?.sections || [];
  }, [selectedEditClassObj]);

  // Load classes, academic years, and terms
  useEffect(() => {
    api.classes.list().then(setClasses).catch(() => {});
    api.academicYears.list().then((years) => {
      setAcademicYears(years);
      const curr = years.find((y) => y.is_current) || years[0];
      if (curr) setValue("academic_year_id", String(curr.id));
    }).catch(() => {});
    api.academicTerms.list().then(setAcademicTerms).catch(() => {});
  }, [setValue]);

  // Derive active class object and category
  const selectedCreateClassObj = useMemo(() => {
    return classes.find((c) => String(c.id) === String(watchedCreateClassId));
  }, [classes, watchedCreateClassId]);

  const selectedCreateCategory = useMemo(() => {
    if (!selectedCreateClassObj) return "Not Selected";
    return selectedCreateClassObj.category || getCategoryForClass(selectedCreateClassObj.name);
  }, [selectedCreateClassObj]);

  const availableCreateSections = useMemo(() => {
    return selectedCreateClassObj?.sections || [];
  }, [selectedCreateClassObj]);

  // Filter terms by selected academic year
  const availableTerms = useMemo(() => {
    if (!watchedCreateAyId) return academicTerms;
    return academicTerms.filter((t) => String(t.academic_year_id) === String(watchedCreateAyId));
  }, [academicTerms, watchedCreateAyId]);

  // Fetch student roster
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.students.list({
        page,
        limit: pageSize,
        class_id: selectedClassId === "all" ? undefined : selectedClassId,
        status: selectedStatusFilter === "all" ? undefined : selectedStatusFilter,
        search: searchTerm,
      });
      setStudents(data.items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedClassId, selectedStatusFilter, searchTerm, toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Real-time synchronization
  useRealtimeSync({
    tables: ["students", "student_documents", "student_enrollments", "classes", "sections"],
    onSync: () => {
      fetchStudents();
    },
  });

  // --------------------------------------------------------------------------
  // STUDENT ADMISSION SUBMISSION (GUARANTEES EXACT CLASS ASSIGNMENT)
  // --------------------------------------------------------------------------
  const onInvalidStudent = (errs: any) => {
    const step1Keys = [
      "full_name",
      "date_of_birth",
      "gender",
      "caste",
      "religion",
      "mother_tongue",
      "aadhaar_number",
      "apaar_id",
      "email",
      "student_phone",
      "blood_group",
      "address",
    ];
    const step2Keys = [
      "father_name",
      "father_phone",
      "father_email",
      "father_occupation",
      "mother_name",
      "mother_phone",
      "mother_email",
      "mother_occupation",
    ];
    const step3Keys = [
      "academic_year_id",
      "academic_term_id",
      "class_id",
      "section_id",
      "admission_number",
      "roll_number",
      "password",
    ];

    if (step1Keys.some((k) => errs[k])) {
      setAdmissionFormStep(1);
      const firstK = step1Keys.find((k) => errs[k]);
      toast.error(errs[firstK]?.message || "Please complete required personal details in Step 1.");
    } else if (step2Keys.some((k) => errs[k])) {
      setAdmissionFormStep(2);
      const firstK = step2Keys.find((k) => errs[k]);
      toast.error(errs[firstK]?.message || "Please complete required parent details in Step 2.");
    } else if (step3Keys.some((k) => errs[k])) {
      setAdmissionFormStep(3);
      const firstK = step3Keys.find((k) => errs[k]);
      toast.error(errs[firstK]?.message || "Please complete required academic allotment fields in Step 3.");
    } else {
      const firstK = Object.keys(errs)[0];
      toast.error(errs[firstK]?.message || "Please check required fields.");
    }
  };

  const onRegisterStudent = async (data: StudentCreateFormData) => {
    try {
      // Duplicate admission number check
      const existingAdm = students.find(
        (s) => s.admission_number?.trim().toLowerCase() === data.admission_number.trim().toLowerCase()
      );
      if (existingAdm) {
        toast.error(`Admission number "${data.admission_number}" is already assigned to ${existingAdm.full_name}.`);
        return;
      }

      // Resolve exact class object and section object (never default to 10-A)
      const selectedClassObj = classes.find((c) => String(c.id) === String(data.class_id));
      const selectedSectionObj = selectedClassObj?.sections?.find((s) => String(s.id) === String(data.section_id));
      const selectedAyObj = academicYears.find((y) => String(y.id) === String(data.academic_year_id));
      const selectedTermObj = academicTerms.find((t) => String(t.id) === String(data.academic_term_id));

      const resolvedClassName = selectedClassObj ? selectedClassObj.name : `Class ${data.class_id}`;
      const resolvedSectionName = selectedSectionObj ? selectedSectionObj.name : "A";
      const resolvedCategory = selectedClassObj?.category || getCategoryForClass(resolvedClassName);

      const cleanEmail = data.email && data.email.trim() !== "" ? data.email.trim().toLowerCase() : null;

      const payload = {
        ...data,
        class_name: resolvedClassName,
        section_name: resolvedSectionName,
        academic_category: resolvedCategory,
        academic_year_name: selectedAyObj?.name || "2025-2026",
        academic_term_name: selectedTermObj?.name || "Term 1",
        class_teacher_name: selectedClassObj?.class_teacher_name || null,
        username: data.admission_number,
        email: cleanEmail,
      };

      await api.students.create(payload);
      toast.success(
        `Student ${data.full_name} admitted successfully to ${resolvedClassName} - Section ${resolvedSectionName}!`,
        { title: "Admission Confirmed" }
      );
      setIsRegisterOpen(false);
      setAdmissionFormStep(1);
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
      setSelectedStudent(profile);
      setEditingStudentId(id);

      // Locate previously saved class & section
      let classIdVal = profile.class_id || profile.current_enrollment?.class_id;
      let sectionIdVal = profile.section_id || profile.current_enrollment?.section_id;

      if (!classIdVal && profile.class_name) {
        const found = classes.find((c) => c.name.toLowerCase() === profile.class_name?.toLowerCase());
        if (found) classIdVal = found.id;
      }
      if (!sectionIdVal && classIdVal && profile.section_name) {
        const foundClass = classes.find((c) => String(c.id) === String(classIdVal));
        const foundSec = foundClass?.sections?.find((s) => s.name.toUpperCase() === profile.section_name?.toUpperCase());
        if (foundSec) sectionIdVal = foundSec.id;
      }

      resetEdit({
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "Male",
        caste: profile.caste || "",
        religion: profile.religion || "",
        mother_tongue: profile.mother_tongue || "",
        first_language: profile.first_language || "",
        second_language: profile.second_language || "",
        third_language: profile.third_language || "",
        aadhaar_number: profile.aadhaar_number || "",
        apaar_id: profile.apaar_id || "",
        email: profile.email || "",
        student_phone: profile.student_phone || "",
        blood_group: profile.blood_group || "",
        address: profile.address || "",
        father_name: profile.father_name || profile.guardian_name || "",
        father_phone: profile.father_phone || profile.guardian_phone || "",
        father_email: profile.father_email || "",
        father_occupation: profile.father_occupation || "",
        mother_name: profile.mother_name || "",
        mother_phone: profile.mother_phone || "",
        mother_email: profile.mother_email || "",
        mother_occupation: profile.mother_occupation || "",
        class_id: classIdVal ? String(classIdVal) : "",
        section_id: sectionIdVal ? String(sectionIdVal) : "",
        roll_number: profile.roll_number || profile.current_enrollment?.roll_number || "",
        student_status: profile.student_status || "active",
      });

      setIsEditOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load student for editing");
    }
  };

  const onSaveEdit = async (data: StudentEditFormData) => {
    if (!editingStudentId) return;
    try {
      // Resolve class and section names
      const selectedClassObj = classes.find((c) => String(c.id) === String(data.class_id));
      const selectedSectionObj = selectedClassObj?.sections?.find((s) => String(s.id) === String(data.section_id));

      const payload = {
        ...data,
        class_name: selectedClassObj ? selectedClassObj.name : undefined,
        section_name: selectedSectionObj ? selectedSectionObj.name : undefined,
        academic_category: selectedClassObj?.category || (selectedClassObj ? getCategoryForClass(selectedClassObj.name) : undefined),
      };

      await api.students.update(editingStudentId, payload);
      toast.success(`Student profile updated successfully!`);
      setIsEditOpen(false);
      setEditingStudentId(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update student profile");
    }
  };

  // View Details and Dossier
  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.students.getById(id);
      setSelectedStudent(profile);
      setIsDetailOpen(true);
      const docs = await api.students.getDocuments(id);
      setStudentDocs(docs);
    } catch (err: any) {
      toast.error(err.message || "Failed to load student dossier");
    }
  };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    setIsUploadingPhoto(true);
    try {
      const url = await api.students.uploadPhoto(selectedStudent.id, file);
      setSelectedStudent({ ...selectedStudent, photo_url: url });
      toast.success("Profile photo updated successfully!");
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // --------------------------------------------------------------------------
  // DOCUMENT MANAGEMENT: UPLOAD, PREVIEW, DOWNLOAD, AND DELETE
  // --------------------------------------------------------------------------
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedStudent) return;

    setIsUploadingDoc(true);
    setUploadProgress(20);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 80));

        const docTitle = docUploadTitle.trim() || file.name.replace(/\.[^/.]+$/, "");
        const doc = await api.students.uploadDocument(
          selectedStudent.id,
          file,
          docUploadType,
          docTitle
        );
        setStudentDocs((prev) => [doc, ...prev]);
      }
      setUploadProgress(100);
      toast.success(`Uploaded ${files.length} document(s) successfully!`);
      setDocUploadTitle("");
      if (docInputRef.current) docInputRef.current.value = "";
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Document upload failed");
    } finally {
      setIsUploadingDoc(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedStudent) return;
    try {
      await api.students.deleteDocument(docId, selectedStudent.id);
      setStudentDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Document removed successfully.");
      setDeletingDocId(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove document");
    }
  };

  // Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivatingStudent) return;
    setIsDeactivating(true);
    try {
      await api.students.deactivate(deactivatingStudent.id);
      toast.success(`Student ${deactivatingStudent.full_name} deactivated safely.`);
      setIsRegisterOpen(false);
      setDeactivatingStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate student");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Permanent Delete
  const handleConfirmPermanentDeleteStudent = async () => {
    if (!permanentlyDeletingStudent || deleteConfirmText.trim() !== "DELETE") return;
    setIsPermanentlyDeleting(true);
    try {
      await api.students.deletePermanently(permanentlyDeletingStudent.id);
      toast.success(
        `Student ${permanentlyDeletingStudent.full_name} (${permanentlyDeletingStudent.admission_number}) permanently deleted from DMHS database.`
      );
      setPermanentlyDeletingStudent(null);
      setDeleteConfirmText("");
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete student");
    } finally {
      setIsPermanentlyDeleting(false);
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

  // Table columns for Directory
  const directoryColumns: Column<StudentListItem>[] = [
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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-navy/10 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {row.photo_url ? (
              <img src={row.photo_url} alt={row.full_name} className="w-full h-full object-cover" />
            ) : (
              row.full_name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <span className="font-semibold text-light-primary dark:text-dark-primary block text-xs">
              {row.full_name}
            </span>
            <span className="text-[11px] text-light-secondary dark:text-dark-secondary block">
              {row.father_name ? `Father: ${row.father_name}` : row.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "class_name",
      header: "Class & Category",
      render: (row) => {
        const cat = row.academic_category || getCategoryForClass(row.class_name || "");
        return (
          <div>
            <div className="font-medium text-xs text-light-primary dark:text-dark-primary">
              {row.class_name ? `${row.class_name} • Sec ${row.section_name || "A"}` : "Unassigned"}
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-blue/10 text-brand-blue dark:text-dark-accent font-semibold">
              {cat}
            </span>
          </div>
        );
      },
    },
    {
      key: "roll_number",
      header: "Roll No",
      render: (row) => (
        <span className="font-mono text-xs text-light-secondary dark:text-dark-secondary">
          {row.roll_number || "—"}
        </span>
      ),
    },
    {
      key: "student_status",
      header: "Status",
      render: (row) => getStatusBadge(row.student_status),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.id)}
            title="View Dossier & Documents"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row.id)}
            title="Edit Student Profile"
          >
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeactivatingStudent(row)}
            title="Deactivate Student"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPermanentlyDeletingStudent(row);
              setDeleteConfirmText("");
            }}
            title="Delete Permanently"
            className="hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <UserX className="w-3.5 h-3.5 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  // Table columns for Documents View
  const documentsColumns: Column<StudentListItem>[] = [
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
        <div>
          <span className="font-semibold text-light-primary dark:text-dark-primary block text-xs">
            {row.full_name}
          </span>
          <span className="text-[11px] text-light-secondary dark:text-dark-secondary">
            {row.class_name} • Section {row.section_name || "A"}
          </span>
        </div>
      ),
    },
    {
      key: "documents_count",
      header: "Attached Documents",
      render: (row) => {
        const count = row.documents_count ?? 0;
        return (
          <span className="font-mono text-xs font-semibold text-light-primary dark:text-dark-primary flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-gold" />
            <span>{count} file{count === 1 ? "" : "s"}</span>
          </span>
        );
      },
    },
    {
      key: "documents_status",
      header: "Submission Status",
      render: (row) => {
        const count = row.documents_count ?? 0;
        if (count >= 3) {
          return <Badge variant="success" size="sm">Verified (Complete)</Badge>;
        } else if (count > 0) {
          return <Badge variant="warning" size="sm">Partial ({count} Uploaded)</Badge>;
        }
        return <Badge variant="danger" size="sm">Pending Documents</Badge>;
      },
    },
    {
      key: "actions",
      header: "Dossier Action",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5 text-brand-blue" />}
            onClick={() => handleViewDetails(row.id)}
          >
            Manage Documents
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Admissions & Dossier Management"
        subtitle="TS SSC compliant student registration, parent documentation, class enrollments, and verified records"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchStudents}
            >
              Sync
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setAdmissionFormStep(1);
                setIsRegisterOpen(true);
              }}
            >
              Admit New Student
            </Button>
          </div>
        }
      />

      {/* View Mode Tabs: Directory vs Documents */}
      <div className="flex items-center gap-3 border-b border-light-border dark:border-dark-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "directory"
              ? "bg-brand-navy text-brand-gold shadow-sm"
              : "text-light-secondary dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Directory ({total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "documents"
              ? "bg-brand-navy text-brand-gold shadow-sm"
              : "text-light-secondary dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Student Documents & Dossiers</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-light-secondary dark:text-dark-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, admission no, father..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-light-secondary" />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="all">All Classes & Grades</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.category || getCategoryForClass(c.name)})
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
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Table
        columns={activeTab === "directory" ? directoryColumns : documentsColumns}
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

      {/* ---------------------------------------------------------------------- */}
      {/* ADMIT NEW STUDENT MODAL (STEP-BY-STEP ADMISSION)                       */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Admit New Student to DMHS"
        description="Creates student record, parent profiles, and verified class enrollment in database"
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {admissionFormStep > 1 && (
                <Button variant="secondary" onClick={() => setAdmissionFormStep((prev) => (prev - 1) as any)}>
                  ← Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsRegisterOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              {admissionFormStep < 3 ? (
                <Button variant="primary" onClick={() => setAdmissionFormStep((prev) => (prev + 1) as any)}>
                  Next Step →
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit(onRegisterStudent, onInvalidStudent)} isLoading={isSubmitting}>
                  Confirm Admission &amp; Enrol
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3 text-xs">
            <button
              type="button"
              onClick={() => setAdmissionFormStep(1)}
              className={`flex items-center gap-2 font-semibold ${
                admissionFormStep === 1 ? "text-brand-gold font-bold" : "text-light-secondary"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                admissionFormStep === 1 ? "bg-brand-navy text-brand-gold border border-brand-gold" : "bg-gray-200 text-gray-700"
              }`}>1</span>
              <span>Personal Information</span>
            </button>

            <button
              type="button"
              onClick={() => setAdmissionFormStep(2)}
              className={`flex items-center gap-2 font-semibold ${
                admissionFormStep === 2 ? "text-brand-gold font-bold" : "text-light-secondary"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                admissionFormStep === 2 ? "bg-brand-navy text-brand-gold border border-brand-gold" : "bg-gray-200 text-gray-700"
              }`}>2</span>
              <span>Father &amp; Mother Details</span>
            </button>

            <button
              type="button"
              onClick={() => setAdmissionFormStep(3)}
              className={`flex items-center gap-2 font-semibold ${
                admissionFormStep === 3 ? "text-brand-gold font-bold" : "text-light-secondary"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                admissionFormStep === 3 ? "bg-brand-navy text-brand-gold border border-brand-gold" : "bg-gray-200 text-gray-700"
              }`}>3</span>
              <span>Academic &amp; Class Enrolment</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onRegisterStudent, onInvalidStudent)} className="space-y-4">
            {/* STEP 1: PERSONAL INFORMATION */}
            <div className={admissionFormStep === 1 ? "space-y-4 animate-in fade-in-50" : "hidden"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Student Full Name *"
                  placeholder="Enter student's full name"
                  error={errors.full_name?.message}
                  required
                  {...register("full_name")}
                />
                  <Input
                    label="Date of Birth *"
                    type="date"
                    error={errors.date_of_birth?.message}
                    required
                    {...register("date_of_birth")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Gender *"
                    error={errors.gender?.message}
                    required
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                    {...register("gender")}
                  />
                  <Select
                    label="Caste / Community"
                    options={[
                      { value: "BC-E", label: "BC-E (Socially & Educationally Backward)" },
                      { value: "OC", label: "OC (General / Open Category)" },
                      { value: "BC-A", label: "BC-A" },
                      { value: "BC-B", label: "BC-B" },
                      { value: "BC-C", label: "BC-C" },
                      { value: "BC-D", label: "BC-D" },
                      { value: "SC", label: "SC" },
                      { value: "ST", label: "ST" },
                      { value: "Other", label: "Other" },
                    ]}
                    {...register("caste")}
                  />
                  <Select
                    label="Religion"
                    options={[
                      { value: "Islam", label: "Islam" },
                      { value: "Hinduism", label: "Hinduism" },
                      { value: "Christianity", label: "Christianity" },
                      { value: "Sikhism", label: "Sikhism" },
                      { value: "Jainism", label: "Jainism" },
                      { value: "Other", label: "Other" },
                    ]}
                    {...register("religion")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Input
                    label="Mother Tongue"
                    placeholder="Enter mother tongue (e.g. Urdu, Telugu)"
                    {...register("mother_tongue")}
                  />
                  <Select
                    label="First Language"
                    options={[
                      { value: "Telugu", label: "Telugu (SSC First Lang)" },
                      { value: "Urdu", label: "Urdu (SSC First Lang)" },
                      { value: "Hindi", label: "Hindi (SSC First Lang)" },
                    ]}
                    {...register("first_language")}
                  />
                  <Select
                    label="Second Language"
                    options={[
                      { value: "Hindi", label: "Hindi (SSC Second Lang)" },
                      { value: "Telugu", label: "Telugu (SSC Second Lang)" },
                    ]}
                    {...register("second_language")}
                  />
                  <Select
                    label="Third Language"
                    options={[
                      { value: "English", label: "English (Compulsory)" },
                    ]}
                    {...register("third_language")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Aadhaar Card Number"
                    placeholder="12-digit UID (e.g. 5432 1098 7654)"
                    maxLength={14}
                    {...register("aadhaar_number")}
                  />
                  <Input
                    label="Student APAAR ID"
                    placeholder="12-digit Education APAAR ID"
                    maxLength={14}
                    {...register("apaar_id")}
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
                    {...register("blood_group")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Student Contact Phone (Optional)"
                    placeholder="+91 98490 00000"
                    {...register("student_phone")}
                  />
                  <Input
                    label="Student Email Address (Optional)"
                    type="email"
                    placeholder="Enter student email (optional)"
                    {...register("email")}
                  />
                </div>

                <Input
                  label="Residential Address"
                  placeholder="Enter residential address"
                  {...register("address")}
                />
              </div>

            {/* STEP 2: PARENT INFORMATION (SEPARATE FATHER & MOTHER) */}
            <div className={admissionFormStep === 2 ? "space-y-4 animate-in fade-in-50" : "hidden"}>
              <div className="space-y-4">
                {/* Father Information Card */}
                <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-navy dark:text-brand-gold uppercase tracking-wider">
                    <Users className="w-4 h-4 text-brand-gold" />
                    <span>Father Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Father's Full Name *"
                      placeholder="Enter father's full name"
                      error={errors.father_name?.message}
                      required
                      {...register("father_name")}
                    />
                    <Input
                      label="Father's Contact Phone *"
                      placeholder="+91 98490 12345"
                      error={errors.father_phone?.message}
                      required
                      {...register("father_phone")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Father's Email Address (Optional)"
                      type="email"
                      placeholder="Enter father's email (optional)"
                      {...register("father_email")}
                    />
                    <Input
                      label="Father's Occupation (Optional)"
                      placeholder="Enter father's occupation"
                      {...register("father_occupation")}
                    />
                  </div>
                </div>

                {/* Mother Information Card */}
                <div className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-navy dark:text-brand-gold uppercase tracking-wider">
                    <Users className="w-4 h-4 text-brand-gold" />
                    <span>Mother Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Mother's Full Name *"
                      placeholder="Enter mother's full name"
                      error={errors.mother_name?.message}
                      required
                      {...register("mother_name")}
                    />
                    <Input
                      label="Mother's Contact Phone"
                      placeholder="+91 98490 67890"
                      {...register("mother_phone")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Mother's Email Address (Optional)"
                      type="email"
                      placeholder="Enter mother's email (optional)"
                      {...register("mother_email")}
                    />
                    <Input
                      label="Mother's Occupation (Optional)"
                      placeholder="Enter mother's occupation"
                      {...register("mother_occupation")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: ACADEMIC & ENROLMENT INFORMATION */}
            <div className={admissionFormStep === 3 ? "space-y-4 animate-in fade-in-50" : "hidden"}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Admission Number *"
                    placeholder="Enter admission number (e.g. DMHS-2025-001)"
                    error={errors.admission_number?.message}
                    required
                    {...register("admission_number")}
                  />
                  <Input
                    label="Date of Admission *"
                    type="date"
                    required
                    {...register("admission_date")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Academic Year *"
                    error={errors.academic_year_id?.message}
                    required
                    options={[
                      { value: "", label: "Select Academic Year" },
                      ...academicYears.map((ay) => ({
                        value: String(ay.id),
                        label: `${ay.name} ${ay.is_current ? "(Current Session)" : ""}`,
                      })),
                    ]}
                    {...register("academic_year_id")}
                  />

                  <Select
                    label="Academic Term *"
                    options={[
                      { value: "", label: "Select Term (or Active Term)" },
                      ...availableTerms.map((t) => ({
                        value: String(t.id),
                        label: `${t.name} ${t.is_current ? "(Active)" : ""}`,
                      })),
                    ]}
                    {...register("academic_term_id")}
                  />
                </div>

                {/* Class & Section Selection */}
                <div className="p-4 rounded-xl border border-brand-blue/30 bg-brand-blue/5 dark:bg-dark-elevated space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-navy dark:text-brand-gold uppercase tracking-wider">
                      Class &amp; Section Assignment
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-navy text-brand-gold font-bold font-mono">
                      Category: {selectedCreateCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Select
                      label="Class *"
                      error={errors.class_id?.message}
                      required
                      options={[
                        { value: "", label: "Select Class" },
                        ...classes.map((c) => ({
                          value: String(c.id),
                          label: `${c.name} (${c.category || getCategoryForClass(c.name)})`,
                        })),
                      ]}
                      {...register("class_id")}
                    />

                    <Select
                      label="Section *"
                      error={errors.section_id?.message}
                      required
                      disabled={!watchedCreateClassId}
                      options={[
                        { value: "", label: "Select Section" },
                        ...availableCreateSections.map((s) => ({
                          value: String(s.id),
                          label: `Section ${s.name} (Cap: ${s.capacity || 40})`,
                        })),
                      ]}
                      {...register("section_id")}
                    />

                    <Input
                      label="Roll Number"
                      placeholder="Enter roll number"
                      {...register("roll_number")}
                    />
                  </div>

                  {selectedCreateClassObj && (
                    <div className="flex items-center justify-between text-xs text-light-secondary dark:text-dark-secondary pt-1 border-t border-brand-blue/20">
                      <span>Curriculum: <strong>{selectedCreateClassObj.stream || "Telangana State SSC"}</strong></span>
                      <span>Class Teacher: <strong>{selectedCreateClassObj.class_teacher_name || "Assigned on schedule"}</strong></span>
                    </div>
                  )}
                </div>

                {/* Password Generation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                        Student Portal Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pass = "DMHS@" + Math.floor(1000 + Math.random() * 9000);
                          setValue("password", pass);
                          toast.success(`Generated portal password: ${pass}`);
                        }}
                        className="text-[11px] font-bold text-brand-blue dark:text-dark-accent hover:underline"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <Input
                      placeholder="Portal login password"
                      error={errors.password?.message}
                      required
                      {...register("password")}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary flex flex-col justify-center border border-light-border dark:border-dark-border">
                    <span className="font-bold text-light-primary dark:text-dark-primary mb-0.5">Automated Sync Notice:</span>
                    <span>Admitted student will automatically appear in <strong>Student Directory</strong>, <strong>Student Documents</strong>, and <strong>Fees &amp; Collections</strong> with their verified class.</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT STUDENT PROFILE MODAL                                             */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Student Profile &amp; Enrollment"
        description="Update personal details, father &amp; mother contact information, and class allocation"
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitEdit(onSaveEdit)} isLoading={isSubmittingEdit}>
              Save Profile Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-1">
            1. Personal & Demographic Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Student Full Name *"
              error={editErrors.full_name?.message}
              required
              {...registerEdit("full_name")}
            />
            <Input
              label="Date of Birth"
              type="date"
              {...registerEdit("date_of_birth")}
            />
            <Select
              label="Gender"
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
              {...registerEdit("gender")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Caste" {...registerEdit("caste")} />
            <Input label="Religion" {...registerEdit("religion")} />
            <Input label="Mother Tongue" {...registerEdit("mother_tongue")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="First Language" {...registerEdit("first_language")} />
            <Input label="Second Language" {...registerEdit("second_language")} />
            <Input label="Third Language" {...registerEdit("third_language")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Aadhaar Number" {...registerEdit("aadhaar_number")} />
            <Input label="Student APAAR ID" {...registerEdit("apaar_id")} />
            <Input label="Student Email" type="email" error={editErrors.email?.message} {...registerEdit("email")} />
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-1 pt-2">
            2. Parent & Guardian Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Father's Full Name" {...registerEdit("father_name")} />
            <Input label="Father's Contact Phone" {...registerEdit("father_phone")} />
            <Input label="Father's Email" type="email" {...registerEdit("father_email")} />
            <Input label="Father's Occupation" {...registerEdit("father_occupation")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Mother's Full Name" {...registerEdit("mother_name")} />
            <Input label="Mother's Contact Phone" {...registerEdit("mother_phone")} />
            <Input label="Mother's Email" type="email" {...registerEdit("mother_email")} />
            <Input label="Mother's Occupation" {...registerEdit("mother_occupation")} />
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-1 pt-2">
            3. Academic Allocation & Status
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Class"
              options={[
                { value: "", label: "Select Class" },
                ...classes.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} (${c.category || getCategoryForClass(c.name)})`,
                })),
              ]}
              {...registerEdit("class_id")}
            />
            <Select
              label="Section"
              options={[
                { value: "", label: "Select Section" },
                ...availableEditSections.map((s) => ({
                  value: String(s.id),
                  label: `Section ${s.name}`,
                })),
              ]}
              {...registerEdit("section_id")}
            />
            <Input label="Roll Number" {...registerEdit("roll_number")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Residential Address" {...registerEdit("address")} />
            <Select
              label="Student Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "transferred", label: "Transferred" },
              ]}
              {...registerEdit("student_status")}
            />
          </div>
        </form>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* STUDENT DOSSIER & COMPREHENSIVE DOCUMENT MANAGEMENT MODAL               */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedStudent ? `${selectedStudent.full_name} — Dossier & Documents` : "Student Dossier"}
        description={selectedStudent ? `Admission: ${selectedStudent.admission_number} • Enrolled: ${selectedStudent.class_name || "Class"} ${selectedStudent.section_name || ""}` : ""}
        maxWidth="xl"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-brand-navy text-white border border-brand-gold/30">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full bg-brand-gold/20 flex items-center justify-center font-bold text-xl text-brand-gold border-2 border-brand-gold/50 overflow-hidden">
                  {selectedStudent.photo_url ? (
                    <img src={selectedStudent.photo_url} alt={selectedStudent.full_name} className="w-full h-full object-cover" />
                  ) : (
                    selectedStudent.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Update photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-bold">{selectedStudent.full_name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-mono font-semibold">
                    {selectedStudent.admission_number}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                    {selectedStudent.student_status?.toUpperCase() || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  Enrolled in <strong>{selectedStudent.class_name || "Class"} - Section {selectedStudent.section_name || "A"}</strong> • Roll No: {selectedStudent.roll_number || "—"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Category: <strong>{selectedStudent.academic_category || getCategoryForClass(selectedStudent.class_name || "")}</strong> • Curriculum: Telangana State SSC Board
                </p>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Date of Birth</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.date_of_birth || "—"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Gender</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.gender || "—"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Blood Group</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.blood_group || "—"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Community / Caste</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.caste || "BC-E"}</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Religion</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.religion || "Islam"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Mother Tongue</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">{selectedStudent.mother_tongue || "Urdu"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Aadhaar Number</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block font-mono">{selectedStudent.aadhaar_number || "—"}</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Student APAAR ID</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block font-mono">{selectedStudent.apaar_id || "—"}</span>
              </div>
            </div>

            {/* Parent Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated space-y-1">
                <span className="font-bold text-brand-navy dark:text-brand-gold uppercase tracking-wider block">Father Details</span>
                <p><strong>Name:</strong> {selectedStudent.father_name || "—"}</p>
                <p><strong>Phone:</strong> {selectedStudent.father_phone || "—"}</p>
                {selectedStudent.father_email && <p><strong>Email:</strong> {selectedStudent.father_email}</p>}
                {selectedStudent.father_occupation && <p><strong>Occupation:</strong> {selectedStudent.father_occupation}</p>}
              </div>

              <div className="p-3.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated space-y-1">
                <span className="font-bold text-brand-navy dark:text-brand-gold uppercase tracking-wider block">Mother Details</span>
                <p><strong>Name:</strong> {selectedStudent.mother_name || "—"}</p>
                <p><strong>Phone:</strong> {selectedStudent.mother_phone || "—"}</p>
                {selectedStudent.mother_email && <p><strong>Email:</strong> {selectedStudent.mother_email}</p>}
                {selectedStudent.mother_occupation && <p><strong>Occupation:</strong> {selectedStudent.mother_occupation}</p>}
              </div>
            </div>

            {/* Address */}
            {selectedStudent.address && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                <span className="text-light-primary dark:text-dark-primary">{selectedStudent.address}</span>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* DOCUMENT UPLOAD & MANAGEMENT SECTION (PDF, JPG, JPEG, PNG)          */}
            {/* ------------------------------------------------------------------ */}
            <div className="space-y-3 pt-2 border-t border-light-border dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-light-primary dark:text-dark-primary flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-gold" />
                    <span>Student Documents &amp; Certificates ({studentDocs.length})</span>
                  </h5>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                    Supports PDF, JPG, JPEG and PNG formats. Stored securely in database &amp; persistent storage.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => docInputRef.current?.click()}
                  isLoading={isUploadingDoc}
                >
                  Upload Document
                </Button>
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocumentUpload}
                  accept="application/pdf,image/jpeg,image/png,image/jpg"
                  multiple
                  className="hidden"
                />
              </div>

              {/* Upload Configuration Bar */}
              <div className="p-3 rounded-xl bg-brand-blue/5 dark:bg-dark-elevated border border-brand-blue/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                    Document Category / Type
                  </label>
                  <select
                    value={docUploadType}
                    onChange={(e) => setDocUploadType(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary"
                  >
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Aadhaar Card Copy">Aadhaar Card Copy</option>
                    <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                    <option value="Previous Marks Memo">Previous Marks Memo / Progress Card</option>
                    <option value="Study & Conduct Certificate">Study &amp; Conduct Certificate</option>
                    <option value="Passport Photo">Passport Photo</option>
                    <option value="Medical Certificate">Medical Certificate</option>
                    <option value="Other Document">Other School Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                    Document Title (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={docUploadTitle}
                    onChange={(e) => setDocUploadTitle(e.target.value)}
                    placeholder="e.g. Birth Certificate Original Scan"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary"
                  />
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploadingDoc && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-brand-blue font-semibold">
                    <span>Uploading documents...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-brand-blue h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Documents List */}
              {studentDocs.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-light-border dark:border-dark-border text-center text-xs text-light-secondary dark:text-dark-secondary space-y-1">
                  <FileText className="w-8 h-8 mx-auto text-light-secondary/40" />
                  <p className="font-semibold text-light-primary dark:text-dark-primary">No documents currently uploaded</p>
                  <p>Click "Upload Document" to attach Birth Certificate, Aadhaar Card, or TC.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentDocs.map((doc) => {
                    const isPdf = doc.mime_type?.includes("pdf") || doc.title?.toLowerCase().endsWith(".pdf") || doc.file_url?.toLowerCase().includes("pdf");
                    const sizeKb = doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "Document";

                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPdf ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-light-primary dark:text-dark-primary block truncate">
                              {doc.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-light-secondary dark:text-dark-secondary mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-light-primary dark:text-dark-primary">
                                {doc.document_type || "Certificate"}
                              </span>
                              <span>•</span>
                              <span>{sizeKb}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 font-semibold flex items-center gap-1 text-[11px]"
                            title="Preview Document"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Preview</span>
                          </a>

                          <a
                            href={doc.file_url}
                            download={doc.title}
                            className="px-2.5 py-1 rounded-lg bg-brand-gold text-brand-navy hover:bg-brand-gold/90 font-bold flex items-center gap-1 text-[11px]"
                            title="Download File"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setDeletingDocId(doc.id)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDocId}
        onClose={() => setDeletingDocId(null)}
        onConfirm={() => deletingDocId && handleDeleteDocument(deletingDocId)}
        title="Delete Student Document"
        message="Are you sure you want to permanently delete this document? This action cannot be undone."
        confirmLabel="Delete Document"
        isDestructive
      />

      {/* Deactivate Student Confirmation */}
      <ConfirmDialog
        isOpen={!!deactivatingStudent}
        onClose={() => setDeactivatingStudent(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Student"
        message={`Are you sure you want to deactivate ${deactivatingStudent?.full_name} (${deactivatingStudent?.admission_number})? Academic records and attendance logs will be preserved.`}
        confirmLabel="Deactivate Student"
        isDestructive
        isLoading={isDeactivating}
      />

      {/* Permanent Delete Student Dialog with Typed Confirmation */}
      <Dialog
        isOpen={!!permanentlyDeletingStudent}
        onClose={() => {
          if (!isPermanentlyDeleting) {
            setPermanentlyDeletingStudent(null);
            setDeleteConfirmText("");
          }
        }}
        title="Permanently Delete Student Record"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Permanent Database Cascade Deletion</span>
            </div>
            <p className="text-xs text-light-secondary dark:text-dark-secondary leading-relaxed">
              You are about to permanently delete student{" "}
              <strong className="text-light-primary dark:text-dark-primary font-bold">
                {permanentlyDeletingStudent?.full_name}
              </strong>{" "}
              (Admission No:{" "}
              <strong className="font-mono text-brand-gold">
                {permanentlyDeletingStudent?.admission_number}
              </strong>
              ).
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-medium">
              This action will completely remove this student, their enrollments, documents, academic/fee mappings, and their institutional GoTrue login account from the DMHS database. This operation cannot be reversed.
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
                setPermanentlyDeletingStudent(null);
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
              onClick={handleConfirmPermanentDeleteStudent}
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
