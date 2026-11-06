import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  PlusCircle,
  CheckCircle2,
  Edit3,
  Star,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  Trash2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../../services/api";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import type { AcademicYear, AcademicTerm } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

// Schema for Academic Year
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

// Schema for Academic Term
const termSchema = z
  .object({
    name: z.string().min(2, "Term name required (e.g. Term 1, FA1 + SA1)"),
    term_type: z.string().default("term"),
    start_date: z.string().min(1, "Start date required"),
    end_date: z.string().min(1, "End date required"),
    is_current: z.boolean().default(false),
    status: z.enum(["active", "planned", "completed", "inactive"]).default("active"),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be chronologically after start date",
    path: ["end_date"],
  });

type AyFormData = z.infer<typeof aySchema>;
type TermFormData = z.infer<typeof termSchema>;

export const AcademicYearsPage: React.FC = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedAyIdForTerms, setSelectedAyIdForTerms] = useState<string | number | null>(null);

  // Academic Year Modals
  const [isAyOpen, setIsAyOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Academic Term Modals
  const [isTermOpen, setIsTermOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [targetAyForNewTerm, setTargetAyForNewTerm] = useState<AcademicYear | null>(null);

  // Delete Term Dialog
  const [deletingTerm, setDeletingTerm] = useState<AcademicTerm | null>(null);
  const [isDeletingTerm, setIsDeletingTerm] = useState(false);

  const toast = useToast();

  const {
    register: registerAy,
    handleSubmit: handleSubmitAy,
    reset: resetAy,
    setValue: setAyValue,
    formState: { errors: ayErrors, isSubmitting: isSubmittingAy },
  } = useForm<AyFormData>({
    resolver: zodResolver(aySchema),
    defaultValues: { status: "active", is_current: false },
  });

  const {
    register: registerTerm,
    handleSubmit: handleSubmitTerm,
    reset: resetTerm,
    setValue: setTermValue,
    formState: { errors: termErrors, isSubmitting: isSubmittingTerm },
  } = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    defaultValues: { term_type: "term", status: "active", is_current: false },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [years, terms] = await Promise.all([
        api.academicYears.list(),
        api.academicTerms.list(),
      ]);
      setAcademicYears(years);
      setAcademicTerms(terms);
      if (!selectedAyIdForTerms && years.length > 0) {
        const current = years.find((y) => y.is_current) || years[0];
        setSelectedAyIdForTerms(current.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load academic sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization
  useRealtimeSync({
    tables: ["academic_years", "academic_terms"],
    onSync: () => {
      loadData();
    },
  });

  // Current Active Year & Term
  const currentActiveYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const currentActiveTerm = academicTerms.find((t) => t.is_current) || academicTerms[0];

  // --------------------------------------------------------------------------
  // ACADEMIC YEAR HANDLERS
  // --------------------------------------------------------------------------
  const openCreateAyModal = () => {
    setEditingYear(null);
    resetAy({
      name: "",
      start_date: "",
      end_date: "",
      is_current: false,
      status: "active",
    });
    setIsAyOpen(true);
  };

  const openEditAyModal = (year: AcademicYear) => {
    setEditingYear(year);
    setAyValue("name", year.name);
    setAyValue("start_date", year.start_date ? year.start_date.split("T")[0] : "");
    setAyValue("end_date", year.end_date ? year.end_date.split("T")[0] : "");
    setAyValue("is_current", year.is_current);
    setAyValue("status", year.status || "active");
    setIsAyOpen(true);
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
      setIsAyOpen(false);
      resetAy();
      setEditingYear(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save academic year");
    }
  };

  const onSetCurrentYear = async (year: AcademicYear) => {
    try {
      await (api.academicYears as any).setCurrent(year.id);
      toast.success(`${year.name} is now the active academic session!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to set current academic year");
    }
  };

  // --------------------------------------------------------------------------
  // ACADEMIC TERM HANDLERS
  // --------------------------------------------------------------------------
  const openCreateTermModal = (ay: AcademicYear) => {
    setTargetAyForNewTerm(ay);
    setEditingTerm(null);
    resetTerm({
      name: "",
      term_type: "term",
      start_date: ay.start_date ? ay.start_date.split("T")[0] : "",
      end_date: ay.end_date ? ay.end_date.split("T")[0] : "",
      is_current: false,
      status: "active",
    });
    setIsTermOpen(true);
  };

  const openEditTermModal = (term: AcademicTerm) => {
    setEditingTerm(term);
    const parentAy = academicYears.find((y) => String(y.id) === String(term.academic_year_id));
    setTargetAyForNewTerm(parentAy || null);
    setTermValue("name", term.name);
    setTermValue("term_type", term.term_type || "term");
    setTermValue("start_date", term.start_date ? term.start_date.split("T")[0] : "");
    setTermValue("end_date", term.end_date ? term.end_date.split("T")[0] : "");
    setTermValue("is_current", term.is_current);
    setTermValue("status", (term.status as any) || "active");
    setIsTermOpen(true);
  };

  const onSaveTerm = async (data: TermFormData) => {
    try {
      if (editingTerm) {
        await api.academicTerms.update(editingTerm.id, data);
        toast.success(`Academic term "${data.name}" updated successfully!`);
      } else if (targetAyForNewTerm) {
        await api.academicTerms.create({
          ...data,
          academic_year_id: targetAyForNewTerm.id,
        });
        toast.success(`Academic term "${data.name}" created under ${targetAyForNewTerm.name}!`);
      }
      setIsTermOpen(false);
      resetTerm();
      setEditingTerm(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save academic term");
    }
  };

  const onSetCurrentTerm = async (term: AcademicTerm) => {
    try {
      await api.academicTerms.setCurrent(term.id);
      toast.success(`"${term.name}" is now the active academic term!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to set active academic term");
    }
  };

  const handleConfirmDeleteTerm = async () => {
    if (!deletingTerm) return;
    setIsDeletingTerm(true);
    try {
      await api.academicTerms.delete(deletingTerm.id);
      toast.success(`Academic term "${deletingTerm.name}" deleted successfully.`);
      setDeletingTerm(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete academic term");
    } finally {
      setIsDeletingTerm(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Governance & Terms"
        subtitle="Manage school academic sessions, semester terms, and real-time active enrollment context"
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
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
            <Button
              variant="primary"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={openCreateAyModal}
            >
              Add Academic Year
            </Button>
          </div>
        }
      />

      {/* Institutional Context Banner */}
      <Card className="p-5 bg-linear-to-r from-brand-navy/5 via-brand-blue/5 to-transparent border border-brand-blue/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                Active Institutional Academic Session
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-xl font-black text-light-primary dark:text-dark-primary tracking-tight">
                  {currentActiveYear ? currentActiveYear.name : "2026-2027"}
                </h3>
                <Badge variant="gold" size="sm">
                  Active Year
                </Badge>
                {currentActiveTerm && (
                  <Badge variant="neutral" size="sm">
                    {currentActiveTerm.name} (Active Term)
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-light-secondary dark:text-dark-secondary max-w-md">
            All student admissions, attendance logs, marks entries, and administrative dashboards automatically synchronize with this active academic session and term.
          </p>
        </div>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-light-secondary dark:text-dark-secondary">
          Loading academic sessions and terms...
        </div>
      ) : academicYears.length === 0 ? (
        <Card className="p-8 text-center text-light-secondary dark:text-dark-secondary">
          No academic years found. Click "Add Academic Year" to initialize your school sessions.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Academic Years List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {academicYears.map((ay) => {
                const termsForAy = academicTerms.filter((t) => String(t.academic_year_id) === String(ay.id));
                const isSelected = String(selectedAyIdForTerms) === String(ay.id);

                return (
                  <Card
                    key={ay.id}
                    className={`p-6 relative flex flex-col justify-between transition-all ${
                      ay.is_current ? "border-2 border-brand-gold/60 shadow-md" : "border-light-border dark:border-dark-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-light-primary dark:text-dark-primary tracking-tight">
                              {ay.name}
                            </h3>
                            <p className="text-xs text-light-secondary dark:text-dark-secondary">
                              {new Date(ay.start_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(ay.end_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        {ay.is_current ? (
                          <Badge variant="gold" size="sm">
                            Current Active
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            {ay.status}
                          </Badge>
                        )}
                      </div>

                      {/* Terms Summary Badge */}
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary mb-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-light-primary dark:text-dark-primary">
                            Academic Terms ({termsForAy.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => openCreateTermModal(ay)}
                            className="text-[11px] font-bold text-brand-blue dark:text-dark-accent hover:underline flex items-center gap-1"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Add Term
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {termsForAy.length === 0 ? (
                            <span className="text-[11px] text-light-muted dark:text-dark-muted italic">
                              No terms defined yet.
                            </span>
                          ) : (
                            termsForAy.map((t) => (
                              <span
                                key={t.id}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                  t.is_current
                                    ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40"
                                    : "bg-white dark:bg-dark-card text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border"
                                }`}
                              >
                                {t.name} {t.is_current ? "★" : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit3 className="w-3 h-3" />}
                          onClick={() => openEditAyModal(ay)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedAyIdForTerms(ay.id)}
                        >
                          {isSelected ? "Terms Selected" : "View Terms"}
                        </Button>
                      </div>
                      {!ay.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-brand-navy dark:text-brand-gold hover:bg-brand-navy/5 font-semibold text-xs"
                          leftIcon={<Star className="w-3.5 h-3.5" />}
                          onClick={() => onSetCurrentYear(ay)}
                        >
                          Set Current
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
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
                      <th className="px-6 py-3">Terms Count</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Active State</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {academicYears.map((ay) => {
                      const termsCount = academicTerms.filter((t) => String(t.academic_year_id) === String(ay.id)).length;
                      return (
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
                            <span className="font-semibold text-xs px-2.5 py-1 rounded bg-brand-blue/10 text-brand-blue">
                              {termsCount} Terms
                            </span>
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
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                              onClick={() => openEditAyModal(ay)}
                            >
                              Edit
                            </Button>
                            {!ay.is_current && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-brand-navy dark:text-brand-gold hover:bg-brand-navy/5"
                                leftIcon={<Star className="w-3.5 h-3.5" />}
                                onClick={() => onSetCurrentYear(ay)}
                              >
                                Make Active
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Academic Terms Dedicated Management Panel */}
          {selectedAyIdForTerms && (
            <Card className="p-6 space-y-4 border-2 border-brand-blue/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-light-border dark:border-dark-border gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue dark:text-dark-accent">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                      Academic Terms for {academicYears.find((y) => String(y.id) === String(selectedAyIdForTerms))?.name || "Selected Session"}
                    </h3>
                    <p className="text-xs text-light-secondary dark:text-dark-secondary">
                      Configure FA1, FA2, SA1, SA2, and annual terms. Mark one term as current active term.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const ay = academicYears.find((y) => String(y.id) === String(selectedAyIdForTerms));
                      if (ay) openCreateTermModal(ay);
                    }}
                  >
                    Add Term Under This Session
                  </Button>
                </div>
              </div>

              {/* Terms Table */}
              {academicTerms.filter((t) => String(t.academic_year_id) === String(selectedAyIdForTerms)).length === 0 ? (
                <div className="p-8 text-center text-xs text-light-secondary dark:text-dark-secondary bg-gray-50 dark:bg-dark-elevated rounded-xl">
                  No academic terms created for this session yet. Click "Add Term Under This Session" to create Term 1, Term 2, or Semester terms.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-light-primary dark:text-dark-primary">
                    <thead className="bg-gray-50 dark:bg-dark-elevated border-b border-light-border dark:border-dark-border uppercase font-bold text-[10px] text-light-secondary dark:text-dark-secondary">
                      <tr>
                        <th className="px-4 py-3">Term Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">End Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Current Active</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                      {academicTerms
                        .filter((t) => String(t.academic_year_id) === String(selectedAyIdForTerms))
                        .map((term) => (
                          <tr key={term.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-elevated/40">
                            <td className="px-4 py-3 font-bold text-brand-navy dark:text-brand-gold">
                              {term.name}
                            </td>
                            <td className="px-4 py-3 uppercase text-[10px] text-light-secondary">
                              {term.term_type || "Term"}
                            </td>
                            <td className="px-4 py-3 text-light-secondary">
                              {new Date(term.start_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3 text-light-secondary">
                              {new Date(term.end_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize font-semibold text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-elevated text-light-secondary">
                                {term.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {term.is_current ? (
                                <Badge variant="gold" size="sm">
                                  Current Term
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-light-secondary">Inactive</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              {!term.is_current && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[11px] font-bold text-brand-blue hover:underline"
                                  onClick={() => onSetCurrentTerm(term)}
                                >
                                  Make Active
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditTermModal(term)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => setDeletingTerm(term)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Add / Edit Academic Year Modal */}
      <Dialog
        isOpen={isAyOpen}
        onClose={() => setIsAyOpen(false)}
        title={editingYear ? `Edit Academic Year (${editingYear.name})` : "Create Academic Year"}
        description={
          editingYear
            ? "Update session name, duration dates, or set as current active school session."
            : "Creates a new academic year record. Only one session can be active at a time."
        }
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAy(onSaveYear)}
              isLoading={isSubmittingAy}
            >
              {editingYear ? "Save Changes" : "Save Academic Year"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitAy(onSaveYear)} className="space-y-4">
          <Input
            label="Academic Year Name"
            placeholder="e.g. 2026-2027"
            error={ayErrors.name?.message}
            required
            {...registerAy("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={ayErrors.start_date?.message}
              required
              {...registerAy("start_date")}
            />
            <Input
              label="End Date"
              type="date"
              error={ayErrors.end_date?.message}
              required
              {...registerAy("end_date")}
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
              {...registerAy("status")}
            />
            <div className="flex items-center gap-2 pt-5">
              <input
                id="is_current_ay"
                type="checkbox"
                className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
                {...registerAy("is_current")}
              />
              <label htmlFor="is_current_ay" className="text-xs font-bold text-light-primary dark:text-dark-primary">
                Set as Current Session
              </label>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Add / Edit Academic Term Modal */}
      <Dialog
        isOpen={isTermOpen}
        onClose={() => setIsTermOpen(false)}
        title={editingTerm ? `Edit Term (${editingTerm.name})` : `Create Term under ${targetAyForNewTerm?.name || "Session"}`}
        description="Configure academic term title, type, and dates. Setting as current activates it across marks and attendance registers."
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTermOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitTerm(onSaveTerm)}
              isLoading={isSubmittingTerm}
            >
              {editingTerm ? "Save Term Changes" : "Save Academic Term"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitTerm(onSaveTerm)} className="space-y-4">
          <Input
            label="Term Title"
            placeholder="e.g. Term 1 (FA1 + SA1) or Semester 1"
            error={termErrors.name?.message}
            required
            {...registerTerm("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Term Type"
              options={[
                { label: "Quarter / Assessment Term", value: "term" },
                { label: "Semester", value: "semester" },
                { label: "Annual Full-Term", value: "annual" },
              ]}
              {...registerTerm("term_type")}
            />
            <Select
              label="Status"
              options={[
                { label: "Active", value: "active" },
                { label: "Planned", value: "planned" },
                { label: "Completed", value: "completed" },
                { label: "Inactive", value: "inactive" },
              ]}
              {...registerTerm("status")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={termErrors.start_date?.message}
              required
              {...registerTerm("start_date")}
            />
            <Input
              label="End Date"
              type="date"
              error={termErrors.end_date?.message}
              required
              {...registerTerm("end_date")}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_current_term"
              type="checkbox"
              className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
              {...registerTerm("is_current")}
            />
            <label htmlFor="is_current_term" className="text-xs font-bold text-light-primary dark:text-dark-primary">
              Set as Current Active Term for School
            </label>
          </div>
        </form>
      </Dialog>

      {/* Delete Term Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTerm)}
        onClose={() => setDeletingTerm(null)}
        onConfirm={handleConfirmDeleteTerm}
        title="Delete Academic Term"
        message={`Are you sure you want to delete "${deletingTerm?.name}"? Historical examination and marks entries associated with this term should be reviewed before deletion.`}
        confirmText="Yes, Delete Term"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingTerm}
      />
    </div>
  );
};
