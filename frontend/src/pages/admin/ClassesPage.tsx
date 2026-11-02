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
  School,
  Calendar,
  RotateCcw,
  ShieldCheck,
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
  academic_year: z.string().default("2025–2026"),
  is_active: z.boolean().default(true),
});

const sectionSchema = z.object({
  name: z.string().min(1, "Section name required (e.g. C)"),
  room_number: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").default(40),
  academic_year: z.string().default("2025–2026"),
  is_active: z.boolean().default(true),
});

type ClassFormData = z.infer<typeof classSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2025–2026");
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
    defaultValues: { grade_level: 1, stream: "General", academic_year: "2025–2026", is_active: true },
  });

  const classEditForm = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  const sectionCreateForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { capacity: 40, academic_year: "2025–2026", is_active: true },
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
    // Check for duplicate class name within the academic year
    const isDuplicate = classes.some(
      (c) => c.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Class "${data.name}" already exists in ${data.academic_year || selectedAcademicYear}. Duplicate classes are prevented.`);
      return;
    }

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
      academic_year: selectedAcademicYear,
      is_active: cls.is_active !== false,
    });
    setIsEditClassOpen(true);
  };

  const onSaveEditClass = async (data: ClassFormData) => {
    if (!editingClass) return;

    // Check duplicate name on rename
    const isDuplicate = classes.some(
      (c) =>
        String(c.id) !== String(editingClass.id) &&
        c.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Another class named "${data.name}" already exists.`);
      return;
    }

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
      toast.success(`Class ${deactivatingClass.name} deactivated safely. Existing records preserved.`);
      setDeactivatingClass(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate class");
    } finally {
      setIsDeactivating(false);
    }
  };

  const onReactivateClass = async (cls: SchoolClass) => {
    try {
      await api.classes.update(cls.id, { is_active: true });
      toast.success(`Class ${cls.name} reactivated successfully!`);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate class");
    }
  };

  // Section Actions
  const onAddSection = async (data: SectionFormData) => {
    if (!selectedClassForSection) return;

    // Check duplicate section name within this class
    const cleanSecName = data.name.trim().toUpperCase();
    const existingSections = selectedClassForSection.sections || [];
    const isDuplicate = existingSections.some(
      (s) => s.name.trim().toUpperCase() === cleanSecName
    );
    if (isDuplicate) {
      toast.error(`Section "${cleanSecName}" already exists under ${selectedClassForSection.name}. Duplicate sections are prevented.`);
      return;
    }

    try {
      await api.classes.createSection(selectedClassForSection.id, {
        name: cleanSecName,
        room_number: data.room_number,
        capacity: data.capacity,
      });
      toast.success(`Section ${cleanSecName} added to ${selectedClassForSection.name}!`);
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
      academic_year: selectedAcademicYear,
      is_active: sec.is_active !== false,
    });
    setIsEditSectionOpen(true);
  };

  const onSaveEditSection = async (data: SectionFormData) => {
    if (!editingSection) return;
    try {
      await api.classes.updateSection(editingSection.id, {
        name: data.name.trim().toUpperCase(),
        room_number: data.room_number,
        capacity: data.capacity,
        is_active: data.is_active,
      });
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
      toast.success(`Section ${deactivatingSection.name} deactivated safely. Student enrollments preserved.`);
      setDeactivatingSection(null);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate section");
    } finally {
      setIsDeactivating(false);
    }
  };

  const onReactivateSection = async (sec: Section) => {
    try {
      await api.classes.updateSection(sec.id, { is_active: true });
      toast.success(`Section ${sec.name} reactivated successfully!`);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate section");
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

  const totalActiveClasses = classes.filter((c) => c.is_active !== false).length;
  const totalSections = classes.reduce(
    (acc, c) => acc + (c.sections || []).filter((s) => s.is_active !== false).length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Sections Management"
        subtitle="Configure academic grades, section divisions, classroom capacities, and academic year mappings"
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

      {/* School Association & Academic Year Status Bar */}
      <div className="p-4 bg-brand-navy text-white rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-brand-gold/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">Deccan Mission High School</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-mono font-medium border border-brand-gold/30">
                TS-HYD-SSC-41092
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Telangana State Board of Secondary Education (SSC) Curriculum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-200 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-brand-gold" />
            <span>Academic Year:</span>
            <strong className="text-white font-mono">{selectedAcademicYear}</strong>
          </div>
          <div className="text-xs text-gray-300 font-mono hidden sm:block">
            {totalActiveClasses} Active Classes • {totalSections} Active Sections
          </div>
        </div>
      </div>

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
            <option value="active">Active Classes Only</option>
            <option value="all">All Classes</option>
            <option value="inactive">Inactive Classes Only</option>
          </select>
          <span className="text-xs text-light-secondary dark:text-dark-secondary font-mono">
            {filteredClasses.length} {filteredClasses.length === 1 ? "Class" : "Classes"}
          </span>
        </div>
      </div>

      {/* Classes Grid */}
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
            const allSections = cls.sections || [];
            const activeSections = allSections.filter((s) => s.is_active !== false);
            const inactiveSections = allSections.filter((s) => s.is_active === false);

            return (
              <Card
                key={cls.id}
                className={`p-5 flex flex-col justify-between hover:border-brand-gold/50 transition-all ${
                  cls.is_active === false ? "opacity-70 bg-gray-50 dark:bg-dark-card/50 border-dashed" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-light-primary dark:text-dark-primary">
                          {cls.name}
                        </h3>
                        {cls.is_active === false ? (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        ) : (
                          <Badge variant="green" size="sm">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
                        Grade Level {cls.grade_level} • {cls.stream || "General"} • {selectedAcademicYear}
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
                      {cls.is_active !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Deactivate Class"
                          onClick={() => setDeactivatingClass(cls)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-status-success hover:text-green-600"
                          title="Reactivate Class"
                          onClick={() => onReactivateClass(cls)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Section List */}
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                        Sections ({activeSections.length} Active{inactiveSections.length > 0 ? `, ${inactiveSections.length} Inactive` : ""})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {allSections.length === 0 ? (
                        <div className="col-span-2 p-3 text-center rounded-lg border border-dashed border-light-border dark:border-dark-border text-xs text-light-secondary">
                          No sections configured
                        </div>
                      ) : (
                        allSections.map((sec) => (
                          <div
                            key={sec.id}
                            className={`p-2.5 rounded-lg border text-xs relative group ${
                              sec.is_active === false
                                ? "bg-gray-100/60 dark:bg-dark-elevated/40 border-dashed border-gray-300 dark:border-gray-700 opacity-60"
                                : "bg-gray-50 dark:bg-dark-elevated border-light-border dark:border-dark-border"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-light-primary dark:text-dark-primary">
                              <span>Section {sec.name}</span>
                              <span className="text-[10px] text-brand-gold font-mono">
                                Cap: {sec.capacity}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-light-secondary dark:text-dark-secondary mt-0.5">
                              <span>{sec.room_number ? `Room ${sec.room_number}` : "Main Wing"}</span>
                              {sec.is_active === false && (
                                <span className="text-red-500 font-medium">Inactive</span>
                              )}
                            </div>

                            {/* Section Quick Actions */}
                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-light-border/40 dark:border-dark-border/40">
                              <button
                                type="button"
                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                onClick={() => onOpenEditSection(sec)}
                              >
                                <Edit2 className="w-2.5 h-2.5" /> Edit
                              </button>
                              <span className="text-[10px] text-light-secondary/40">•</span>
                              {sec.is_active !== false ? (
                                <button
                                  type="button"
                                  className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
                                  onClick={() => setDeactivatingSection(sec)}
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="text-[10px] text-status-success hover:underline flex items-center gap-0.5"
                                  onClick={() => onReactivateSection(sec)}
                                >
                                  <RotateCcw className="w-2.5 h-2.5" /> Reactivate
                                </button>
                              )}
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
        title="Create New Academic Class"
        description="Creates a new academic grade level associated with Deccan Mission High School"
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
          <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg text-xs space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex justify-between text-light-secondary dark:text-dark-secondary">
              <span>Institution:</span>
              <strong className="text-light-primary dark:text-dark-primary">Deccan Mission High School (DMHS-HYD)</strong>
            </div>
            <div className="flex justify-between text-light-secondary dark:text-dark-secondary">
              <span>Academic Curriculum:</span>
              <strong className="text-light-primary dark:text-dark-primary">Telangana State SSC Board</strong>
            </div>
          </div>

          <Input
            label="Class Name *"
            placeholder="e.g. Class 11, Class 12, Pre-Primary"
            error={classCreateForm.formState.errors.name?.message}
            required
            {...classCreateForm.register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Level (1-12) *"
              type="number"
              min={1}
              max={12}
              error={classCreateForm.formState.errors.grade_level?.message}
              required
              {...classCreateForm.register("grade_level")}
            />
            <Select
              label="Curriculum Stream"
              options={[
                { label: "General (SSC Standard)", value: "General" },
                { label: "Science Stream", value: "Science" },
                { label: "Commerce", value: "Commerce" },
                { label: "Arts / Humanities", value: "Arts" },
              ]}
              {...classCreateForm.register("stream")}
            />
          </div>

          <Select
            label="Academic Year Association *"
            options={[
              { label: "Academic Year 2025–2026 (Current)", value: "2025–2026" },
              { label: "Academic Year 2026–2027 (Upcoming)", value: "2026–2027" },
            ]}
            {...classCreateForm.register("academic_year")}
          />
        </form>
      </Dialog>

      {/* Edit Class Modal */}
      <Dialog
        isOpen={isEditClassOpen}
        onClose={() => setIsEditClassOpen(false)}
        title={`Edit ${editingClass?.name || "Class"}`}
        description="Update class name, grade level, stream, and status"
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
            label="Class Name *"
            placeholder="e.g. Class 11"
            error={classEditForm.formState.errors.name?.message}
            required
            {...classEditForm.register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Level (1-12) *"
              type="number"
              min={1}
              max={12}
              error={classEditForm.formState.errors.grade_level?.message}
              required
              {...classEditForm.register("grade_level")}
            />
            <Select
              label="Curriculum Stream"
              options={[
                { label: "General (SSC Standard)", value: "General" },
                { label: "Science Stream", value: "Science" },
                { label: "Commerce", value: "Commerce" },
                { label: "Arts / Humanities", value: "Arts" },
              ]}
              {...classEditForm.register("stream")}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-light-primary dark:text-dark-primary">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                {...classEditForm.register("is_active")}
              />
              <span>Class Status: Active for Academic Enrollment</span>
            </label>
          </div>
        </form>
      </Dialog>

      {/* Add Section Modal */}
      <Dialog
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        title={`Add Section to ${selectedClassForSection?.name || "Class"}`}
        description={`Creates a new classroom division under ${selectedClassForSection?.name || "Class"}`}
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
          <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg text-xs space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex justify-between">
              <span className="text-light-secondary dark:text-dark-secondary">Associated Class:</span>
              <strong className="text-brand-blue font-bold">{selectedClassForSection?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-light-secondary dark:text-dark-secondary">Academic Year:</span>
              <span className="font-mono">{selectedAcademicYear}</span>
            </div>
          </div>

          <Input
            label="Section Identifier * (e.g. A, B, C)"
            placeholder="e.g. C, D"
            error={sectionCreateForm.formState.errors.name?.message}
            required
            {...sectionCreateForm.register("name")}
          />
          <Input
            label="Classroom / Hall Number"
            placeholder="e.g. Room 204, Science Lab A"
            {...sectionCreateForm.register("room_number")}
          />
          <Input
            label="Student Capacity *"
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
        description="Update section identifier, classroom, capacity, and active status"
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
            label="Section Identifier *"
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
            label="Student Capacity *"
            type="number"
            error={sectionEditForm.formState.errors.capacity?.message}
            required
            {...sectionEditForm.register("capacity")}
          />

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-light-primary dark:text-dark-primary">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                {...sectionEditForm.register("is_active")}
              />
              <span>Section Status: Active for Timetable & Roll Call</span>
            </label>
          </div>
        </form>
      </Dialog>

      {/* Confirm Deactivate Class */}
      <ConfirmDialog
        isOpen={!!deactivatingClass}
        onClose={() => setDeactivatingClass(null)}
        onConfirm={onConfirmDeactivateClass}
        title="Deactivate Class"
        message={`Are you sure you want to deactivate ${deactivatingClass?.name}? All existing student enrollment records, marks, and historical timetables will remain safely intact in the database.`}
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
        message={`Are you sure you want to deactivate Section ${deactivatingSection?.name}? Student enrollment records and attendance logs will remain safely preserved.`}
        confirmLabel="Deactivate Section"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};
