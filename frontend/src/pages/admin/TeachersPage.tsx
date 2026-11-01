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
} from "lucide-react";
import { api } from "../../services/api";
import type { TeacherListItem, TeacherProfile } from "../../types";
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
  employee_id: z.string().min(3, "Employee ID is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  designation: z.string().min(2, "Designation is required"),
  department: z.string().optional(),
  qualification: z.string().optional(),
  contact_phone: z.string().optional(),
});

const teacherEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  designation: z.string().min(2, "Designation is required"),
  department: z.string().optional(),
  qualification: z.string().optional(),
  contact_phone: z.string().optional(),
  is_active: z.boolean().default(true),
});

type TeacherCreateFormData = z.infer<typeof teacherCreateSchema>;
type TeacherEditFormData = z.infer<typeof teacherEditSchema>;

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

  // Dialogs
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Edit Faculty State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | string | null>(null);

  // Deactivate Faculty State
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivatingTeacher, setDeactivatingTeacher] = useState<TeacherListItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isSubmittingCreate },
  } = useForm<TeacherCreateFormData>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: {
      designation: "Faculty / Senior Teacher",
      department: "General",
      password: "Teacher@12345",
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
      setTeachers(data.items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty list");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const onRegisterTeacher = async (data: TeacherCreateFormData) => {
    try {
      await api.teachers.create(data);
      toast.success(`Faculty member ${data.full_name} registered successfully!`);
      setIsRegisterOpen(false);
      resetCreate();
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to register teacher");
    }
  };

  const handleViewDetails = async (id: number | string) => {
    try {
      const profile = await api.teachers.getById(id);
      setSelectedTeacher(profile);
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
      setEditValue("contact_phone", profile.contact_phone || "");
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
      if (selectedTeacher && selectedTeacher.id === editingTeacherId) {
        const updated = await api.teachers.getById(editingTeacherId);
        setSelectedTeacher(updated);
      }
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
      toast.success(`Faculty member ${deactivatingTeacher.full_name} deactivated successfully!`);
      setIsDeactivateOpen(false);
      setDeactivatingTeacher(null);
      if (selectedTeacher && selectedTeacher.id === deactivatingTeacher.id) {
        setIsDetailOpen(false);
      }
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate faculty member");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleToggleStatus = async (id: number | string, currentStatus: string) => {
    const newStatus = currentStatus !== "active";
    try {
      await api.teachers.toggleStatus(id, newStatus);
      toast.success(`Faculty status set to ${newStatus ? "Active" : "Inactive"}`);
      if (selectedTeacher && selectedTeacher.id === id) {
        setSelectedTeacher({
          ...selectedTeacher,
          is_active: newStatus,
          employment_status: newStatus ? "active" : "inactive",
        });
      }
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.designation && t.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? t.employment_status === "active"
        : t.employment_status !== "active";

    return matchesSearch && matchesStatus;
  });

  const columns: Column<TeacherListItem>[] = [
    {
      key: "employee_id",
      header: "Employee ID",
      render: (row) => (
        <span className="font-mono font-bold text-brand-gold text-xs">
          {row.employee_id}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Faculty Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold text-xs shrink-0">
            {row.full_name.charAt(0)}
          </div>
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
      key: "designation",
      header: "Designation & Subject",
      render: (row) => (
        <div>
          <span className="text-light-primary dark:text-dark-primary font-medium block">
            {row.designation}
          </span>
          <span className="text-xs text-light-secondary dark:text-dark-secondary block">
            {row.department || "General Department"}
          </span>
        </div>
      ),
    },
    {
      key: "assigned_classes_count",
      header: "Classes",
      render: (row) => (
        <Badge variant="gold" size="sm">
          {row.assigned_classes_count} Classes
        </Badge>
      ),
    },
    {
      key: "employment_status",
      header: "Status",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(row.id, row.employment_status);
          }}
          className="cursor-pointer transition-transform active:scale-95"
          title="Click to toggle active status"
        >
          <Badge variant={row.employment_status === "active" ? "success" : "neutral"} size="sm">
            {row.employment_status === "active" ? "● Active" : "○ Inactive"}
          </Badge>
        </button>
      ),
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
            onClick={() => handleOpenEdit(row)}
            leftIcon={<Edit2 className="w-3.5 h-3.5 text-brand-gold" />}
          >
            Edit
          </Button>
          {row.employment_status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDeactivate(row)}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Staff Directory"
        subtitle="Manage faculty credentials, teacher assignments, and departmental allocation in real time"
        action={
          <Button
            variant="primary"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsRegisterOpen(true)}
          >
            Add New Faculty Member
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
            placeholder="Search employee ID, faculty name, department..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Button
            variant={statusFilter === "all" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All Faculty
          </Button>
          <Button
            variant={statusFilter === "active" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("active")}
          >
            Active Only
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Teachers Table */}
      <Table
        columns={columns}
        data={filteredTeachers}
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

      {/* Register Teacher Modal */}
      <Dialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Add Faculty Member"
        description="Creates faculty credentials and registers teacher profile in database"
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsRegisterOpen(false)}
              disabled={isSubmittingCreate}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitCreate(onRegisterTeacher)}
              isLoading={isSubmittingCreate}
            >
              Save Faculty Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitCreate(onRegisterTeacher)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employee ID"
              placeholder="e.g. EMP-1002"
              error={createErrors.employee_id?.message}
              required
              {...registerCreate("employee_id")}
            />
            <Input
              label="Faculty Full Name"
              placeholder="e.g. Dr. Syed Ibrahim"
              error={createErrors.full_name?.message}
              required
              {...registerCreate("full_name")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username (Optional)"
              placeholder="e.g. syed.ibrahim"
              error={createErrors.username?.message}
              {...registerCreate("username")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. syed.ibrahim@dmhs.edu.in"
              error={createErrors.email?.message}
              required
              {...registerCreate("email")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Temporary Password"
              type="password"
              placeholder="At least 6 characters"
              error={createErrors.password?.message}
              required
              {...registerCreate("password")}
            />
            <Input
              label="Designation"
              placeholder="e.g. Senior Faculty"
              error={createErrors.designation?.message}
              required
              {...registerCreate("designation")}
            />
            <Input
              label="Department"
              placeholder="e.g. Physics / Science"
              error={createErrors.department?.message}
              {...registerCreate("department")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Qualifications"
              placeholder="e.g. M.Sc. Physics, B.Ed, Ph.D"
              {...registerCreate("qualification")}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98490 12345"
              {...registerCreate("contact_phone")}
            />
          </div>
        </form>
      </Dialog>

      {/* Teacher Details Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Faculty Member Profile"
        description="Detailed record from Deccan Mission High School database"
        maxWidth="md"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold text-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-light-primary dark:text-dark-primary">
                    {selectedTeacher.full_name}
                  </h4>
                  <p className="text-xs font-mono font-bold text-brand-gold">
                    Employee ID: {selectedTeacher.employee_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleStatus(selectedTeacher.id, selectedTeacher.employment_status)}
                className="cursor-pointer"
                title="Click to toggle status"
              >
                <Badge variant={selectedTeacher.employment_status === "active" ? "success" : "neutral"}>
                  {selectedTeacher.employment_status === "active" ? "Active" : "Inactive"}
                </Badge>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Designation</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.designation}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Department</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.department || "General Faculty"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Email</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block truncate">
                  {selectedTeacher.email}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                <span className="text-light-secondary dark:text-dark-secondary block">Qualifications</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary block">
                  {selectedTeacher.qualification || "—"}
                </span>
              </div>
            </div>

            {selectedTeacher.contact_phone && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-gold" />
                <span className="text-light-secondary dark:text-dark-secondary">Contact:</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary font-mono">
                  {selectedTeacher.contact_phone}
                </span>
              </div>
            )}

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Class & Subject Assignments</span>
              </h5>
              {selectedTeacher.assignments && selectedTeacher.assignments.length === 0 ? (
                <p className="text-xs text-light-secondary dark:text-dark-secondary p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated">
                  No classes currently assigned for this term.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(selectedTeacher.assignments || []).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-light-primary dark:text-dark-primary">
                        {a.class_name} - Sec {a.section_name} ({a.subject_name})
                      </span>
                      <Badge variant="gold" size="sm">
                        {a.role_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit Teacher Modal */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation / Specialization"
              placeholder="e.g. Senior Faculty - Mathematics"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Qualifications"
              placeholder="e.g. M.Sc, B.Ed"
              error={editErrors.qualification?.message}
              {...registerEdit("qualification")}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98490 00000"
              error={editErrors.contact_phone?.message}
              {...registerEdit("contact_phone")}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer font-medium text-light-primary dark:text-dark-primary">
              <input
                type="checkbox"
                className="rounded border-light-border dark:border-dark-border text-brand-gold focus:ring-brand-gold"
                {...registerEdit("is_active")}
              />
              Active Faculty Status (Allows portal login and teaching allocations)
            </label>
          </div>
        </form>
      </Dialog>

      {/* Deactivate Faculty Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setDeactivatingTeacher(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Faculty Member"
        message={
          deactivatingTeacher
            ? `Are you sure you want to deactivate ${deactivatingTeacher.full_name} (${deactivatingTeacher.employee_id})? The teacher will no longer be able to log in or enter marks, but historical timetable and student records will be preserved.`
            : "Are you sure you want to deactivate this faculty member?"
        }
        confirmText="Deactivate Faculty"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
};
