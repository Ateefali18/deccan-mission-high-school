import React, { useEffect, useState } from "react";
import { FileText, PlusCircle, Calendar, Trash2, BookOpen, Clock } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import type { SchoolClass } from "../../types";

interface AssignmentItem {
  id: number;
  title: string;
  subject: string;
  description?: string;
  class_id: number;
  class_name: string;
  section_id?: number;
  section_name?: string;
  due_date: string;
  max_marks: number;
  created_at: string;
}

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState<number>(10);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState("20");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assData, classData] = await Promise.all([
        api.assignments.list(),
        api.classes.list(),
      ]);
      setAssignments(assData);
      setClasses(classData);
      if (classData.length > 0 && !classId) {
        setClassId(Number(classData[0].id));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setTitle("");
    setSubject("Mathematics");
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
    setDescription("");
    setMaxMarks("20");
    setIsOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !dueDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.assignments.create({
        title: title.trim(),
        subject: subject.trim(),
        class_id: classId,
        due_date: dueDate,
        description: description.trim(),
        max_marks: parseFloat(maxMarks) || 20,
      });
      toast.success(`Assignment "${title}" posted successfully!`);
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: AssignmentItem) => {
    if (!window.confirm(`Are you sure you want to remove assignment "${item.title}"?`)) return;
    try {
      await api.assignments.delete(item.id);
      toast.success("Assignment removed.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete assignment");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework & Assignments"
        description="Create classroom homework tasks, projects, and coursework exercises with submission deadlines and maximum grading points."
        icon={<FileText className="w-6 h-6 text-brand-blue" />}
        action={
          <Button onClick={handleOpenCreate} icon={<PlusCircle className="w-4 h-4" />}>
            New Assignment
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
            <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-light-muted dark:text-dark-muted">
            No active assignments created.
          </div>
        ) : (
          assignments.map((a) => (
            <Card key={a.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="blue">{a.subject}</Badge>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-pale dark:bg-dark-elevated text-brand-blue">
                    {a.class_name}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-xs text-light-muted dark:text-dark-muted mt-1 line-clamp-3">
                      {a.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between text-xs text-light-muted dark:text-dark-muted">
                  <span className="flex items-center gap-1 text-status-warning font-medium">
                    <Clock className="w-3.5 h-3.5" /> Due: {a.due_date}
                  </span>
                  <span className="font-medium text-light-text dark:text-dark-text">
                    Max Marks: {a.max_marks}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(a)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
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
        title="Create New Assignment"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Assignment Title *
            </label>
            <Input
              placeholder="e.g. Chapter 4 Practice Questions"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Subject *
              </label>
              <Input
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Class *
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Due Date *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Maximum Marks
              </label>
              <Input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
              Description / Task Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Provide assignment guidelines, questions, textbook references..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Publish Assignment"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
