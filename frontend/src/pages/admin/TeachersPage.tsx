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
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  GraduationCap,
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
import { useToast } from "../../components/ui/Toast";

const teacherSchema = z.object({
  employee_id: z.string().min(3, "Employee ID is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  designation: z.string().min(2, "Designation is required"),
  department: z.string().optional(),
  qualification: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

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

  // Dialogs
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Edit Faculty State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      designation: "Teacher",
    },
  });

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.teachers.list({ page, limit: pageSize, search: searchTerm });
      setTeachers(data.items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty list");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const onRegisterTeacher = async (data: TeacherFormData) => {
    try {
      await api.teachers.create(data);
      toast.success(`Faculty member ${data.full_name} registered successfully!`);
      setIsRegisterOpen(false);
      reset();
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

  const handleOpenEdit = (profile: TeacherProfile) => {
    setEditSpecialization(profile.designation || "");
    setEditQualification(profile.qualification || "");
    setEditPhone(profile.contact_phone || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTeacher) return;
    setIsSavingEdit(true);
    try {
      await api.teachers.update(selectedTeacher.id, {
        specialization: editSpecialization,
        qualification: editQualification,
        contact_phone: editPhone,
      });
      toast.success(`Teacher ${selectedTeacher.full_name} updated successfully!`);
      setIsEditOpen(false);
      // Refresh teacher details and table
      const updated = await api.teachers.getById(selectedTeacher.id);
      setSelectedTeacher(updated);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update teacher");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (id: number | string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? false : true;
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

  const filteredTeachers = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      header: "Action",
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
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onRegisterTeacher)}
              isLoading={isSubmitting}
            >
              Save Faculty Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onRegisterTeacher)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employee ID"
              placeholder="e.g. EMP-1002"
              error={errors.employee_id?.message}
              required
              {...register("employee_id")}
            />
            <Input
              label="Faculty Full Name"
              placeholder="e.g. Dr. Syed Ibrahim"
              error={errors.full_name?.message}
              required
              {...register("full_name")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              placeholder="e.g. syed.ibrahim"
              error={errors.username?.message}
              required
              {...register("username")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="e.g. syed.ibrahim@dmhs.edu.in"
              error={errors.email?.message}
              required
              {...register("email")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Temporary Password"
              type="password"
              placeholder="At least 6 characters"
              error={errors.password?.message}
              required
              {...register("password")}
            />
            <Input
              label="Designation"
              placeholder="e.g. Senior Faculty"
              error={errors.designation?.message}
              required
              {...register("designation")}
            />
            <Input
              label="Department"
              placeholder="e.g. Physics / Science"
              error={errors.department?.message}
              {...register("department")}
            />
          </div>

          <Input
            label="Qualifications"
            placeholder="e.g. M.Sc. Physics, B.Ed, Ph.D"
            {...register("qualification")}
          />
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
                if (selectedTeacher) handleOpenEdit(selectedTeacher);
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
              {selectedTeacher.assignments.length === 0 ? (
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
        description="Update faculty qualifications and contact information in persistent database"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Designation / Specialization"
            value={editSpecialization}
            onChange={(e) => setEditSpecialization(e.target.value)}
            placeholder="e.g. Senior Faculty - Mathematics"
          />
          <Input
            label="Qualifications"
            value={editQualification}
            onChange={(e) => setEditQualification(e.target.value)}
            placeholder="e.g. M.Sc, B.Ed"
          />
          <Input
            label="Contact Phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="+91 98490 00000"
          />
        </div>
      </Dialog>
    </div>
  );
};
