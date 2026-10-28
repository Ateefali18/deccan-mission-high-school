import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers, Plus, PlusCircle, Users } from "lucide-react";
import { api } from "../../services/api";
import type { SchoolClass } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

const classSchema = z.object({
  name: z.string().min(2, "Class name required (e.g. Class 11)"),
  grade_level: z.coerce.number().min(1).max(12),
  stream: z.string().optional(),
});

const sectionSchema = z.object({
  name: z.string().min(1, "Section name required (e.g. C)"),
  room_number: z.string().optional(),
  capacity: z.coerce.number().min(1).default(40),
});

type ClassFormData = z.infer<typeof classSchema>;
type SectionFormData = z.infer<typeof sectionSchema>;

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [selectedClassForSection, setSelectedClassForSection] = useState<SchoolClass | null>(null);

  const classForm = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: { grade_level: 1, stream: "General" },
  });

  const sectionForm = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { capacity: 40 },
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

  const onAddClass = async (data: ClassFormData) => {
    try {
      await api.classes.create(data);
      toast.success(`Class ${data.name} created with default Section A!`);
      setIsAddClassOpen(false);
      classForm.reset();
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to create class");
    }
  };

  const onAddSection = async (data: SectionFormData) => {
    if (!selectedClassForSection) return;
    try {
      await api.classes.createSection(selectedClassForSection.id, data);
      toast.success(`Section ${data.name} added to ${selectedClassForSection.name}!`);
      setIsAddSectionOpen(false);
      sectionForm.reset();
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to create section");
    }
  };

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 h-44 animate-pulse bg-gray-100 dark:bg-dark-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-5 flex flex-col justify-between hover:border-brand-gold/50 transition-all">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-light-primary dark:text-dark-primary">{cls.name}</h3>
                    <p className="text-xs text-light-secondary dark:text-dark-secondary">
                      Grade Level {cls.grade_level} • {cls.stream || "General"}
                    </p>
                  </div>
                  <Badge variant="gold" size="sm">
                    {cls.sections.length} Sections
                  </Badge>
                </div>

                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                    Active Sections
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {cls.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-xs"
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedClassForSection(cls);
                    setIsAddSectionOpen(true);
                  }}
                >
                  Add Section to {cls.name}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <Dialog
        isOpen={isAddClassOpen}
        onClose={() => setIsAddClassOpen(false)}
        title="Create New Class"
        description="Creates a new grade level and automatically initializes Section A"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddClassOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={classForm.handleSubmit(onAddClass)}
              isLoading={classForm.formState.isSubmitting}
            >
              Save Class
            </Button>
          </>
        }
      >
        <form onSubmit={classForm.handleSubmit(onAddClass)} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 11 or Grade 1"
            error={classForm.formState.errors.name?.message}
            required
            {...classForm.register("name")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Level (1-12)"
              type="number"
              min={1}
              max={12}
              error={classForm.formState.errors.grade_level?.message}
              required
              {...classForm.register("grade_level")}
            />
            <Select
              label="Stream"
              options={[
                { label: "General", value: "General" },
                { label: "Science", value: "Science" },
                { label: "Commerce", value: "Commerce" },
                { label: "Arts / Humanities", value: "Arts" },
              ]}
              {...classForm.register("stream")}
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
              onClick={sectionForm.handleSubmit(onAddSection)}
              isLoading={sectionForm.formState.isSubmitting}
            >
              Add Section
            </Button>
          </>
        }
      >
        <form onSubmit={sectionForm.handleSubmit(onAddSection)} className="space-y-4">
          <Input
            label="Section Identifier"
            placeholder="e.g. B, C, D"
            error={sectionForm.formState.errors.name?.message}
            required
            {...sectionForm.register("name")}
          />
          <Input
            label="Classroom Number"
            placeholder="e.g. Room 204"
            {...sectionForm.register("room_number")}
          />
          <Input
            label="Student Capacity"
            type="number"
            defaultValue={40}
            error={sectionForm.formState.errors.capacity?.message}
            required
            {...sectionForm.register("capacity")}
          />
        </form>
      </Dialog>
    </div>
  );
};
