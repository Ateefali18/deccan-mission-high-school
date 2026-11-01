import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Layers,
  Plus,
  PlusCircle,
  Users,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { api } from "../../services/api";
import type { SchoolClass, Section } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const classSchema = z.object({
  name: z.string().min(2, "Class name required (e.g. Class 11)"),
  grade_level: z.coerce.number().min(1).max(12),
  stream: z.string().optional(),
});

const sectionSchema = z.object({
  name: z.string().min(1, "Section name required (e.g. C)"),
  room_number: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").default(40),
});

type ClassFormData = z.infer<typeof classSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const toast = useToast();

  // Create Modals
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [selectedClassForSection, setSelectedClassForSection] = useState<SchoolClass | null>(null);

  // Edit Modals
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // Deactivate Confirmations
  const [deactivatingClass, setDeactivatingClass] = useState<SchoolClass | null>(null);
  const [deactivatingSection, setDeactivatingSection] = useState<Section | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Forms
  const classCreateForm = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: { grade_level: 1, stream: "General" },
  });

  const classEditForm = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  const sectionCreateForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { capacity: 40 },
  });

  const sectionEditForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
  });

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const data = await api.classes.list();
      setClasses(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Class Actions
  const onAddClass = async (data: ClassFormData) => {
    try {
      await api.classes.create(data);
      toast.success(`Class ${data.name} created successfully!`);
      setIsAddClassOpen(false);
      classCreateForm.reset();
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to create class");
    }
  };

  const onOpenEditClass = (cls: SchoolClass) => {
    setEditingClass(cls);
    classEditForm.reset({
      name: cls.name,
      grade_level: cls.grade_level,
      stream: cls.stream || "General",
    });
    setIsEditClassOpen(true);
  };

  const onSaveEditClass = async (data: ClassFormData) => {
    if (!editingClass) return;
    try {
      await api.classes.update(editingClass.id, data);
      toast.success(`Class ${data.name} updated successfully!`);
      setIsEditClassOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to update class");
    }
  };

  const onConfirmDeactivateClass = async () => {
    if (!deactivatingClass) return;
    setIsDeactivating(true);
    try {
      await api.classes.deactivate(deactivatingClass.id);
      toast.success(`Class ${deactivatingClass.name} deactivated successfully.`);
      setDeactivatingClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate class");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Section Actions
  const onAddSection = async (data: SectionFormData) => {
    if (!selectedClassForSection) return;
    try {
      await api.classes.createSection(selectedClassForSection.id, data);
      toast.success(`Section ${data.name} added to ${selectedClassForSection.name}!`);
      setIsAddSectionOpen(false);
      sectionCreateForm.reset();
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to create section");
    }
  };

  const onOpenEditSection = (sec: Section) => {
    setEditingSection(sec);
    sectionEditForm.reset({
      name: sec.name,
      room_number: sec.room_number || "",
      capacity: sec.capacity || 40,
    });
    setIsEditSectionOpen(true);
  };

  const onSaveEditSection = async (data: SectionFormData) => {
    if (!editingSection) return;
    try {
      await api.classes.updateSection(editingSection.id, data);
      toast.success(`Section ${data.name} updated successfully!`);
      setIsEditSectionOpen(false);
      setEditingSection(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to update section");
    }
  };

  const onConfirmDeactivateSection = async () => {
    if (!deactivatingSection) return;
    setIsDeactivating(true);
    try {
      await api.classes.deactivateSection(deactivatingSection.id);
      toast.success(`Section ${deactivatingSection.name} deactivated successfully.`);
      setDeactivatingSection(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate section");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Filtered list
  const filteredClasses = useMemo(() => {
    return classes
      .filter((cls) => {
        if (statusFilter === "active") return cls.is_active !== false;
        if (statusFilter === "inactive") return cls.is_active === false;
        return true;
      })
      .filter((cls) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const matchesClass =
          cls.name.toLowerCase().includes(term) ||
          (cls.stream && cls.stream.toLowerCase().includes(term)) ||
          String(cls.grade_level).includes(term);
        const matchesSection = (cls.sections || []).some(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.room_number && s.room_number.toLowerCase().includes(term))
        );
        return matchesClass || matchesSection;
      });
  }, [classes, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Sections"
        subtitle="Manage academic grade levels, classroom capacities, and section divisions"
        action={
          <Button
            variant="primary"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsAddClassOpen(true)}
          >
            Create New Class
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-light-secondary dark:text-dark-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search class, grade, stream, or section..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-light-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
          >
            <option value="active">Active Classes</option>
            <option value="all">All Classes</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <span className="text-xs text-light-secondary dark:text-dark-secondary font-mono">
            {filteredClasses.length} {filteredClasses.length === 1 ? "Class" : "Classes"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 h-48 animate-pulse bg-gray-100 dark:bg-dark-card" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
          <Layers className="w-10 h-10 mx-auto text-light-secondary/50 mb-3" />
          <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">No Classes Found</h3>
          <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
            {searchTerm ? "No classes match your current search criteria." : "Create your first academic class to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const activeSections = (cls.sections || []).filter((s) => s.is_active !== false);

            return (
              <Card
                key={cls.id}
                className={`p-5 flex flex-col justify-between hover:border-brand-gold/50 transition-all ${
                  cls.is_active === false ? "opacity-60 bg-gray-50 dark:bg-dark-card/50" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-light-primary dark:text-dark-primary">
                          {cls.name}
                        </h3>
                        {cls.is_active === false && (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-light-secondary dark:text-dark-secondary">
                        Grade Level {cls.grade_level} • {cls.stream || "General"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Edit Class"
                        onClick={() => onOpenEditClass(cls)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {cls.is_active !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Deactivate Class"
                          onClick={() => setDeactivatingClass(cls)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                        Sections ({activeSections.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {activeSections.length === 0 ? (
                        <div className="col-span-2 p-3 text-center rounded-lg border border-dashed border-light-border dark:border-dark-border text-xs text-light-secondary">
                          No active sections
                        </div>
                      ) : (
                        activeSections.map((sec) => (
                          <div
                            key={sec.id}
                            className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-xs relative group"
                          >
                            <div className="flex items-center justify-between font-bold text-light-primary dark:text-dark-primary">
                              <span>Section {sec.name}</span>
                              <span className="text-[10px] text-brand-gold font-mono">
                                Cap: {sec.capacity}
                              </span>
                            </div>
                            {sec.room_number && (
                              <p className="text-[10px] text-light-secondary dark:text-dark-secondary mt-0.5">
                                Room {sec.room_number}
                              </p>
                            )}

                            {/* Section Quick Actions */}
                            <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-light-border/40 dark:border-dark-border/40">
                              <button
                                type="button"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                onClick={() => onOpenEditSection(sec)}
                              >
                                <Edit2 className="w-2.5 h-2.5" /> Edit
                              </button>
                              <span className="text-[10px] text-light-secondary/40">•</span>
                              <button
                                type="button"
                                className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
                                onClick={() => setDeactivatingSection(sec)}
                              >
                                <Trash2 className="w-2.5 h-2.5" /> Deactivate
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedClassForSection(cls);
                      setIsAddSectionOpen(true);
                    }}
                  >
                    Add Section
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Class Modal */}
      <Dialog
        isOpen={isAddClassOpen}
        onClose={() => setIsAddClassOpen(false)}
        title="Create New Class"
        description="Creates a new academic grade level in the database"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddClassOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={classCreateForm.handleSubmit(onAddClass)}
              isLoading={classCreateForm.formState.isSubmitting}
            >
              Save Class
            </Button>
          </>
        }
      >
        <form onSubmit={classCreateForm.handleSubmit(onAddClass)} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 11 or Grade 1"
            error={classCreateForm.formState.errors.name?.message}
            required
            {...classCreateForm.register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Level (1-12)"
              type="number"
              min={1}
              max={12}
              error={classCreateForm.formState.errors.grade_level?.message}
              required
              {...classCreateForm.register("grade_level")}
            />
            <Select
              label="Stream"
              options={[
                { label: "General", value: "General" },
                { label: "Science", value: "Science" },
                { label: "Commerce", value: "Commerce" },
                { label: "Arts / Humanities", value: "Arts" },
              ]}
              {...classCreateForm.register("stream")}
            />
          </div>
        </form>
      </Dialog>

      {/* Edit Class Modal */}
      <Dialog
        isOpen={isEditClassOpen}
        onClose={() => setIsEditClassOpen(false)}
        title={`Edit ${editingClass?.name || "Class"}`}
        description="Update class grade level, name, and stream"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditClassOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={classEditForm.handleSubmit(onSaveEditClass)}
              isLoading={classEditForm.formState.isSubmitting}
            >
              Update Class
            </Button>
          </>
        }
      >
        <form onSubmit={classEditForm.handleSubmit(onSaveEditClass)} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 11"
            error={classEditForm.formState.errors.name?.message}
            required
            {...classEditForm.register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Level (1-12)"
              type="number"
              min={1}
              max={12}
              error={classEditForm.formState.errors.grade_level?.message}
              required
              {...classEditForm.register("grade_level")}
            />
            <Select
              label="Stream"
              options={[
                { label: "General", value: "General" },
                { label: "Science", value: "Science" },
                { label: "Commerce", value: "Commerce" },
                { label: "Arts / Humanities", value: "Arts" },
              ]}
              {...classEditForm.register("stream")}
            />
          </div>
        </form>
      </Dialog>

      {/* Add Section Modal */}
      <Dialog
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        title={`Add Section to ${selectedClassForSection?.name || "Class"}`}
        description="Creates a new division for this grade level in the database"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={sectionCreateForm.handleSubmit(onAddSection)}
              isLoading={sectionCreateForm.formState.isSubmitting}
            >
              Add Section
            </Button>
          </>
        }
      >
        <form onSubmit={sectionCreateForm.handleSubmit(onAddSection)} className="space-y-4">
          <Input
            label="Section Identifier"
            placeholder="e.g. B, C, D"
            error={sectionCreateForm.formState.errors.name?.message}
            required
            {...sectionCreateForm.register("name")}
          />
          <Input
            label="Classroom Number"
            placeholder="e.g. Room 204"
            {...sectionCreateForm.register("room_number")}
          />
          <Input
            label="Student Capacity"
            type="number"
            defaultValue={40}
            error={sectionCreateForm.formState.errors.capacity?.message}
            required
            {...sectionCreateForm.register("capacity")}
          />
        </form>
      </Dialog>

      {/* Edit Section Modal */}
      <Dialog
        isOpen={isEditSectionOpen}
        onClose={() => setIsEditSectionOpen(false)}
        title={`Edit Section ${editingSection?.name || ""}`}
        description="Update classroom number and maximum student capacity"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={sectionEditForm.handleSubmit(onSaveEditSection)}
              isLoading={sectionEditForm.formState.isSubmitting}
            >
              Update Section
            </Button>
          </>
        }
      >
        <form onSubmit={sectionEditForm.handleSubmit(onSaveEditSection)} className="space-y-4">
          <Input
            label="Section Identifier"
            placeholder="e.g. A, B, C"
            error={sectionEditForm.formState.errors.name?.message}
            required
            {...sectionEditForm.register("name")}
          />
          <Input
            label="Classroom Number"
            placeholder="e.g. Room 204"
            {...sectionEditForm.register("room_number")}
          />
          <Input
            label="Student Capacity"
            type="number"
            error={sectionEditForm.formState.errors.capacity?.message}
            required
            {...sectionEditForm.register("capacity")}
          />
        </form>
      </Dialog>

      {/* Confirm Deactivate Class */}
      <ConfirmDialog
        isOpen={!!deactivatingClass}
        onClose={() => setDeactivatingClass(null)}
        onConfirm={onConfirmDeactivateClass}
        title="Deactivate Class"
        message={`Are you sure you want to deactivate ${deactivatingClass?.name}? Existing student records and historical enrollments will be safely preserved.`}
        confirmLabel="Deactivate Class"
        isDestructive
        isLoading={isDeactivating}
      />

      {/* Confirm Deactivate Section */}
      <ConfirmDialog
        isOpen={!!deactivatingSection}
        onClose={() => setDeactivatingSection(null)}
        onConfirm={onConfirmDeactivateSection}
        title="Deactivate Section"
        message={`Are you sure you want to deactivate Section ${deactivatingSection?.name}? Student enrollment records will be safely preserved.`}
        confirmLabel="Deactivate Section"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};
