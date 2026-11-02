import React, { useEffect, useState } from "react";
import {
  BookOpen,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  School,
  Layers,
  Link as LinkIcon,
  Unlink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api } from "../../services/api";
import type { SchoolClass } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

interface SubjectItem {
  id: string | number;
  name: string;
  code: string;
  department?: string | null;
  is_elective?: boolean;
  is_active?: boolean;
  class_id?: string | number;
  assignment_id?: string | number;
}

export const SubjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"catalog" | "class_curriculum">("catalog");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | number>("");
  const [classSubjects, setClassSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClassSubs, setIsLoadingClassSubs] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [deactivatingSubject, setDeactivatingSubject] = useState<SubjectItem | null>(null);
  const [removingSubject, setRemovingSubject] = useState<SubjectItem | null>(null);

  // Form states for Create/Edit Subject
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("Languages");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Class Allocation
  const [assignSubjectId, setAssignSubjectId] = useState<string | number>("");
  const [assignIsElective, setAssignIsElective] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsData, classesData] = await Promise.all([
        api.subjects.list(),
        api.classes.list(),
      ]);
      setSubjects(subsData || []);
      setClasses(classesData || []);

      if (classesData && classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load subjects and classes");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassSubjects = async (classId: string | number) => {
    if (!classId) return;
    setIsLoadingClassSubs(true);
    try {
      const data = await api.subjects.list(classId);
      setClassSubjects(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load class curriculum");
    } finally {
      setIsLoadingClassSubs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setName("");
    setCode("");
    setDepartment("Languages");
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (subject: SubjectItem) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code);
    setDepartment(subject.department || "General");
    setIsActive(subject.is_active !== false);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Subject name and code are required.");
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // Check duplicate code
    const isDup = subjects.some(
      (s) =>
        (!editingSubject || String(s.id) !== String(editingSubject.id)) &&
        s.code.trim().toUpperCase() === cleanCode
    );
    if (isDup) {
      toast.error(`Subject code "${cleanCode}" already exists in the curriculum catalog.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await api.subjects.update(editingSubject.id, {
          name: name.trim(),
          code: cleanCode,
          department: department.trim(),
          is_active: isActive,
        });
        toast.success(`Subject ${name} updated successfully!`);
      } else {
        await api.subjects.create({
          name: name.trim(),
          code: cleanCode,
          department: department.trim(),
          is_active: true,
        });
        toast.success(`Subject ${name} (${cleanCode}) added to SSC catalog!`);
      }
      setIsOpen(false);
      loadData();
      if (selectedClassId) loadClassSubjects(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingSubject) return;
    try {
      await api.subjects.deactivate(deactivatingSubject.id);
      toast.success(`Subject ${deactivatingSubject.name} safely deactivated.`);
      setDeactivatingSubject(null);
      loadData();
      if (selectedClassId) loadClassSubjects(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate subject");
    }
  };

  const handleReactivate = async (subject: SubjectItem) => {
    try {
      await api.subjects.update(subject.id, { is_active: true });
      toast.success(`Subject ${subject.name} reactivated successfully!`);
      loadData();
      if (selectedClassId) loadClassSubjects(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate subject");
    }
  };

  // Class Subject Allocation
  const handleOpenAssign = () => {
    if (!selectedClassId) {
      toast.error("Please select a class first.");
      return;
    }
    // Default to first unassigned subject
    const assignedIds = new Set(classSubjects.map((s) => String(s.id)));
    const unassigned = subjects.filter((s) => !assignedIds.has(String(s.id)));
    setAssignSubjectId(unassigned[0]?.id || subjects[0]?.id || "");
    setAssignIsElective(false);
    setIsAssignOpen(true);
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !assignSubjectId) {
      toast.error("Please select a subject to assign.");
      return;
    }

    setIsAssigning(true);
    try {
      await api.subjects.assignToClass(selectedClassId, assignSubjectId, assignIsElective);
      const subObj = subjects.find((s) => String(s.id) === String(assignSubjectId));
      const clsObj = classes.find((c) => String(c.id) === String(selectedClassId));
      toast.success(`Allocated ${subObj?.name || "Subject"} to ${clsObj?.name || "Class"}!`);
      setIsAssignOpen(false);
      loadClassSubjects(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || "Failed to associate subject with class");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingSubject || !selectedClassId) return;
    try {
      await api.subjects.removeFromClass(selectedClassId, removingSubject.id);
      const clsObj = classes.find((c) => String(c.id) === String(selectedClassId));
      toast.success(`Removed ${removingSubject.name} from ${clsObj?.name || "Class"}.`);
      setRemovingSubject(null);
      loadClassSubjects(selectedClassId);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove subject from class");
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects & Curriculum Management"
        subtitle="Configure Telangana State SSC academic subjects, curriculum modules, subject codes, and class allocations."
        action={
          <div className="flex items-center gap-2">
            {activeTab === "class_curriculum" && (
              <Button
                variant="outline"
                leftIcon={<LinkIcon className="w-4 h-4" />}
                onClick={handleOpenAssign}
              >
                Allocate Subject to Class
              </Button>
            )}
            <Button
              variant="primary"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Add New Subject
            </Button>
          </div>
        }
      />

      {/* School Board & Affiliation Banner */}
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
              Telangana State Board of Secondary Education (SSC) Curriculum Standard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "catalog"
                ? "bg-brand-gold text-brand-navy shadow-sm"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            }`}
          >
            Subject Catalog ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab("class_curriculum")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "class_curriculum"
                ? "bg-brand-gold text-brand-navy shadow-sm"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            }`}
          >
            Class Curriculum & Allocations
          </button>
        </div>
      </div>

      {/* TAB 1: SCHOOL SUBJECT CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <Input
                placeholder="Search subjects, codes, or departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-xs text-light-muted dark:text-dark-muted font-mono">
              Total Subjects: {subjects.length} • Active: {subjects.filter((s) => s.is_active !== false).length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
                <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading curriculum catalog...
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
                No subjects found in the catalog.
              </div>
            ) : (
              filteredSubjects.map((s) => (
                <Card
                  key={s.id}
                  className={`p-4 flex flex-col justify-between hover:shadow-md transition-shadow ${
                    s.is_active === false ? "opacity-60 bg-gray-50 dark:bg-dark-card/50 border-dashed" : ""
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="blue">{s.code}</Badge>
                      <span className="text-xs text-light-muted dark:text-dark-muted font-medium">
                        {s.department || "General"}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-light-text dark:text-dark-text mt-2">
                      {s.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-light-border dark:border-dark-border">
                    {s.is_active !== false ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-status-success font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-500 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(s)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      {s.is_active !== false ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeactivatingSubject(s)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReactivate(s)}
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLASS CURRICULUM ALLOCATION */}
      {activeTab === "class_curriculum" && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                Selected Class:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border font-semibold text-sm focus:border-brand-gold focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Grade {c.grade_level} • {c.stream || "General"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="text-xs text-light-muted dark:text-dark-muted font-mono">
                Allocated Subjects for {selectedClass?.name || "Class"}: {classSubjects.length}
              </span>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAssign}
              >
                Allocate Subject
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingClassSubs ? (
              <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
                <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading curriculum for {selectedClass?.name}...
              </div>
            ) : classSubjects.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl">
                <Layers className="w-10 h-10 mx-auto text-light-secondary/50 mb-3" />
                <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                  No Subjects Allocated
                </h3>
                <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
                  Allocate required SSC subjects to {selectedClass?.name} using the button above.
                </p>
              </div>
            ) : (
              classSubjects.map((cs) => (
                <Card key={cs.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="blue">{cs.code}</Badge>
                      {cs.is_elective ? (
                        <Badge variant="secondary">Elective</Badge>
                      ) : (
                        <Badge variant="green">SSC Core Subject</Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-light-text dark:text-dark-text mt-2">
                      {cs.name}
                    </h3>
                    <p className="text-xs text-light-secondary dark:text-dark-secondary">
                      Department: {cs.department || "General"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-light-border dark:border-dark-border">
                    <span className="text-[11px] text-light-muted dark:text-dark-muted font-mono">
                      Class: {selectedClass?.name}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRemovingSubject(cs)}
                      icon={<Unlink className="w-3.5 h-3.5" />}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingSubject ? "Edit Subject" : "Add Academic Subject"}
        description="Add or update subject information in the Telangana State SSC curriculum registry"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {isSubmitting ? "Saving..." : editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject Name *"
            placeholder="e.g. Mathematics, First Language: Telugu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subject Code *"
              placeholder="e.g. MAT-201, TEL-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Select
              label="Department *"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { label: "Languages (Telugu / Hindi / English / Urdu)", value: "Languages" },
                { label: "Mathematics", value: "Mathematics" },
                { label: "Science (Physical & Biological)", value: "Science" },
                { label: "Humanities / Social Studies", value: "Humanities" },
                { label: "Computer Science / IT", value: "Computer Science" },
                { label: "General & Co-Curricular", value: "General" },
              ]}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-light-primary dark:text-dark-primary">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
              />
              <span>Active in Current Academic Year</span>
            </label>
          </div>
        </form>
      </Dialog>

      {/* Allocate Subject to Class Modal */}
      <Dialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Allocate Subject to ${selectedClass?.name || "Class"}`}
        description="Assign a registered curriculum subject to this academic grade"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleAssignSubject} isLoading={isAssigning}>
              {isAssigning ? "Allocating..." : "Allocate to Class"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAssignSubject} className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-lg text-xs space-y-1 border border-light-border dark:border-dark-border">
            <div className="flex justify-between">
              <span className="text-light-secondary dark:text-dark-secondary">Target Class:</span>
              <strong className="text-brand-blue font-bold">{selectedClass?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-light-secondary dark:text-dark-secondary">Board Standard:</span>
              <span>Telangana State SSC</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Select Subject from Catalog *
            </label>
            <select
              value={assignSubjectId}
              onChange={(e) => setAssignSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border text-sm focus:border-brand-gold focus:outline-none"
              required
            >
              {subjects
                .filter((s) => s.is_active !== false)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} ({s.department || "General"})
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-light-primary dark:text-dark-primary">
              <input
                type="checkbox"
                checked={assignIsElective}
                onChange={(e) => setAssignIsElective(e.target.checked)}
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
              />
              <span>Mark as Elective (Uncheck for mandatory SSC Core Subject)</span>
            </label>
          </div>
        </form>
      </Dialog>

      {/* Confirm Deactivate Subject */}
      <ConfirmDialog
        isOpen={!!deactivatingSubject}
        onClose={() => setDeactivatingSubject(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Subject"
        message={`Are you sure you want to deactivate ${deactivatingSubject?.name}? Historical examination records and teacher assignments will remain preserved.`}
        confirmLabel="Deactivate Subject"
        isDestructive
      />

      {/* Confirm Remove Subject from Class */}
      <ConfirmDialog
        isOpen={!!removingSubject}
        onClose={() => setRemovingSubject(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Subject from Class"
        message={`Are you sure you want to remove ${removingSubject?.name} from ${selectedClass?.name}?`}
        confirmLabel="Remove from Class"
        isDestructive
      />
    </div>
  );
};
