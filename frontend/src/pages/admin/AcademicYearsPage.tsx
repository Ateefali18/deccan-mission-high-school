import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, PlusCircle, CheckCircle2, Edit3, Star, LayoutGrid, Table as TableIcon } from "lucide-react";
import { api } from "../../services/api";
import type { AcademicYear } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

const aySchema = z
  .object({
    name: z.string().min(4, "Session name required (e.g. 2026-2027)"),
    start_date: z.string().min(1, "Start date required"),
    end_date: z.string().min(1, "End date required"),
    is_current: z.boolean().default(false),
    status: z.string().default("active"),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be chronologically after start date",
    path: ["end_date"],
  });

type AyFormData = z.infer<typeof aySchema>;

export const AcademicYearsPage: React.FC = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AyFormData>({
    resolver: zodResolver(aySchema),
    defaultValues: {
      status: "active",
      is_current: false,
    },
  });

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const data = await api.academicYears.list();
      setAcademicYears(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load academic years");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const openCreateModal = () => {
    setEditingYear(null);
    reset({
      name: "",
      start_date: "",
      end_date: "",
      is_current: false,
      status: "active",
    });
    setIsOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setValue("name", year.name);
    setValue("start_date", year.start_date ? year.start_date.split("T")[0] : "");
    setValue("end_date", year.end_date ? year.end_date.split("T")[0] : "");
    setValue("is_current", year.is_current);
    setValue("status", year.status || "active");
    setIsOpen(true);
  };

  const onSaveYear = async (data: AyFormData) => {
    try {
      if (editingYear) {
        await (api.academicYears as any).update(editingYear.id, data);
        toast.success(`Academic Year ${data.name} updated successfully!`);
      } else {
        await api.academicYears.create(data);
        toast.success(`Academic Year ${data.name} created successfully!`);
      }
      setIsOpen(false);
      reset();
      setEditingYear(null);
      await fetchYears();
    } catch (err: any) {
      toast.error(err.message || "Failed to save academic year");
    }
  };

  const onSetCurrent = async (year: AcademicYear) => {
    try {
      await (api.academicYears as any).setCurrent(year.id);
      toast.success(`${year.name} is now set as the active academic session!`);
      await fetchYears();
    } catch (err: any) {
      toast.error(err.message || "Failed to set current academic year");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years & Terms"
        subtitle="Manage school academic years, start/end terms, and active enrollment sessions"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 dark:bg-dark-elevated rounded-lg p-1 border border-light-border dark:border-dark-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-dark-surface shadow-xs text-brand-navy dark:text-dark-primary"
                    : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-dark-surface shadow-xs text-brand-navy dark:text-dark-primary"
                    : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
            <Button
              variant="primary"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Add Academic Year
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-light-secondary dark:text-dark-secondary">
          Loading academic sessions...
        </div>
      ) : academicYears.length === 0 ? (
        <Card className="p-8 text-center text-light-secondary dark:text-dark-secondary">
          No academic years found. Click "Add Academic Year" to create the first session.
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {academicYears.map((ay) => (
            <Card key={ay.id} className="p-6 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-light-primary dark:text-dark-primary tracking-tight">
                        {ay.name}
                      </h3>
                      <p className="text-xs text-light-secondary dark:text-dark-secondary">
                        {new Date(ay.start_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        to{" "}
                        {new Date(ay.end_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {ay.is_current ? (
                    <Badge variant="gold" size="md">
                      Current Active
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {ay.status}
                    </Badge>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary mb-4">
                  <span className="block font-medium">Session Status</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary capitalize">
                    {ay.is_current ? "Active & Authorized for Enrollments" : ay.status}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => openEditModal(ay)}
                >
                  Edit Session
                </Button>
                {!ay.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-navy dark:text-brand-gold hover:bg-brand-navy/5"
                    leftIcon={<Star className="w-3.5 h-3.5" />}
                    onClick={() => onSetCurrent(ay)}
                  >
                    Set as Current
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-light-primary dark:text-dark-primary">
              <thead className="bg-gray-50 dark:bg-dark-elevated border-b border-light-border dark:border-dark-border text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
                <tr>
                  <th className="px-6 py-3">Academic Session</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Active State</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-elevated/40">
                    <td className="px-6 py-4 font-bold text-brand-navy dark:text-brand-gold">
                      {ay.name}
                    </td>
                    <td className="px-6 py-4 text-light-secondary dark:text-dark-secondary">
                      {new Date(ay.start_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-light-secondary dark:text-dark-secondary">
                      {new Date(ay.end_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-semibold text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary">
                        {ay.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ay.is_current ? (
                        <Badge variant="gold" size="sm">
                          Current Active
                        </Badge>
                      ) : (
                        <span className="text-xs text-light-secondary dark:text-dark-secondary">
                          Archived / Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => openEditModal(ay)}
                      >
                        Edit
                      </Button>
                      {!ay.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-brand-navy dark:text-brand-gold hover:bg-brand-navy/5"
                          leftIcon={<Star className="w-3.5 h-3.5" />}
                          onClick={() => onSetCurrent(ay)}
                        >
                          Make Active
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingYear ? `Edit Academic Year (${editingYear.name})` : "Create Academic Year"}
        description={
          editingYear
            ? "Update session name, duration dates, or set as current active school session."
            : "Creates a new academic year record. Only one session can be active at a time."
        }
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSaveYear)}
              isLoading={isSubmitting}
            >
              {editingYear ? "Save Changes" : "Save Academic Year"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSaveYear)} className="space-y-4">
          <Input
            label="Academic Year Name"
            placeholder="e.g. 2026-2027"
            error={errors.name?.message}
            required
            {...register("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.start_date?.message}
              required
              {...register("start_date")}
            />
            <Input
              label="End Date"
              type="date"
              error={errors.end_date?.message}
              required
              {...register("end_date")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <Select
              label="Status"
              options={[
                { label: "Active", value: "active" },
                { label: "Planned", value: "planned" },
                { label: "Completed", value: "completed" },
                { label: "Archived", value: "archived" },
              ]}
              {...register("status")}
            />
            <div className="flex items-center gap-2 pt-5">
              <input
                id="is_current"
                type="checkbox"
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                {...register("is_current")}
              />
              <label htmlFor="is_current" className="text-xs font-bold text-light-primary dark:text-dark-primary">
                Set as Current Session
              </label>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
