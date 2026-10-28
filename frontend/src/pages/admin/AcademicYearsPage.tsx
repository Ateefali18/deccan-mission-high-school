import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, PlusCircle, CheckCircle2 } from "lucide-react";
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

const aySchema = z.object({
  name: z.string().min(4, "Session name required (e.g. 2026-2027)"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  is_current: z.boolean().default(false),
  status: z.string().default("active"),
});

type AyFormData = z.infer<typeof aySchema>;

export const AcademicYearsPage: React.FC = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
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

  const onAddYear = async (data: AyFormData) => {
    try {
      await api.academicYears.create(data);
      toast.success(`Academic Year ${data.name} created successfully!`);
      setIsOpen(false);
      reset();
      fetchYears();
    } catch (err: any) {
      toast.error(err.message || "Failed to create academic year");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years & Terms"
        subtitle="Configure school sessions for historical enrollments and promotions"
        action={
          <Button
            variant="primary"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsOpen(true)}
          >
            Add Academic Year
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {academicYears.map((ay) => (
          <Card key={ay.id} className="p-6 relative overflow-hidden">
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
                    {new Date(ay.start_date).toLocaleDateString()} to{" "}
                    {new Date(ay.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {ay.is_current ? (
                <Badge variant="gold" size="md">
                  Current Term
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  {ay.status}
                </Badge>
              )}
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary">
              <span className="block font-medium">Session Status</span>
              <span className="font-bold text-light-primary dark:text-dark-primary capitalize">
                {ay.is_current ? "Active & Authorized for Enrollments" : ay.status}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Academic Year"
        description="Creates an academic year record in the database"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onAddYear)}
              isLoading={isSubmitting}
            >
              Save Academic Year
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onAddYear)} className="space-y-4">
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
