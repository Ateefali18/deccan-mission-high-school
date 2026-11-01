import React, { useEffect, useState } from "react";
import { BookOpen, PlusCircle, Search, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

interface SubjectItem {
  id: number;
  name: string;
  code: string;
  department?: string | null;
  is_elective?: boolean;
  is_active?: boolean;
}

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.subjects.list();
      setSubjects(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setName("");
    setCode("");
    setDepartment("General");
    setIsOpen(true);
  };

  const handleOpenEdit = (subject: SubjectItem) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code);
    setDepartment(subject.department || "General");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Subject name and code are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await api.subjects.update(editingSubject.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          is_active: true,
        });
        toast.success(`Subject ${name} updated successfully!`);
      } else {
        await api.subjects.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          is_active: true,
        });
        toast.success(`Subject ${name} added successfully!`);
      }
      setIsOpen(false);
      loadSubjects();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (subject: SubjectItem) => {
    if (!window.confirm(`Are you sure you want to deactivate ${subject.name}?`)) return;
    try {
      await api.subjects.deactivate(subject.id);
      toast.success(`Subject ${subject.name} deactivated.`);
      loadSubjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate subject");
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects & Curriculum"
        description="Configure CBSE academic subjects, syllabus modules, subject codes, and departmental assignments."
        icon={<BookOpen className="w-6 h-6 text-brand-blue" />}
        action={
          <Button onClick={handleOpenCreate} icon={<PlusCircle className="w-4 h-4" />}>
            Add Subject
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
          <Input
            placeholder="Search subjects or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-light-muted dark:text-dark-muted font-medium">
          Total Subjects: {subjects.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
            <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading subjects...
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
            No subjects found.
          </div>
        ) : (
          filteredSubjects.map((s) => (
            <Card key={s.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
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
                <span className="inline-flex items-center gap-1.5 text-xs text-status-success font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Active
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(s)}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeactivate(s)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingSubject ? "Edit Subject" : "Add Academic Subject"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Subject Name *
            </label>
            <Input
              placeholder="e.g. Mathematics, Urdu Course A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Subject Code *
            </label>
            <Input
              placeholder="e.g. MATH-101, URD-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Department
            </label>
            <Input
              placeholder="e.g. Mathematics, Sciences, Languages"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
