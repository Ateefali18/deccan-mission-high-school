import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  IndianRupee,
  FileText,
  Building,
  Zap,
  Droplet,
  Users,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Download,
  ShieldCheck,
  X,
  CreditCard,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { ExpenseItem, ExpenseCategory, ExpenseStats } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Staff Salaries",
  "Aaya’s Salaries",
  "Building Rent",
  "Electricity Bill",
  "Drinking Water Expenses",
  "Usable Water Expenses",
  "Other Expenses",
];

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "UPI",
  "Demand Draft",
  "Other",
];

export const ExpensesPage: React.FC = () => {
  const { session } = useAuth();
  const toast = useToast();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    current_month_expenses: 0,
    category_breakdown: {},
    total_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    expense_date: string;
    category: ExpenseCategory;
    description: string;
    amount: string;
    payment_method: string;
    reference_number: string;
    notes: string;
  }>({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Staff Salaries",
    description: "",
    amount: "",
    payment_method: "Cash",
    reference_number: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Data
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        api.expenses.list({
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: searchQuery || undefined,
        }),
        api.expenses.getStats({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
      ]);
      setExpenses(list);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load operational expenses");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, fromDate, toDate, searchQuery, toast]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Reset form
  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().slice(0, 10),
      category: "Staff Salaries",
      description: "",
      amount: "",
      payment_method: "Cash",
      reference_number: `EXP-${Date.now().toString().slice(-6)}`,
      notes: "",
    });
    setFormErrors({});
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: ExpenseItem) => {
    setSelectedExpense(exp);
    setFormData({
      expense_date: exp.expense_date,
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      payment_method: exp.payment_method || "Cash",
      reference_number: exp.reference_number || "",
      notes: exp.notes || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (exp: ExpenseItem) => {
    setSelectedExpense(exp);
    setIsViewModalOpen(true);
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.expense_date) {
      errors.expense_date = "Expense date is required.";
    }
    if (!formData.category) {
      errors.category = "Category selection is required.";
    }
    if (!formData.description.trim()) {
      errors.description = "Expense description is required.";
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.amount = "Please enter a valid positive amount.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await api.expenses.create({
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success(`Expense of ₹${parseFloat(formData.amount).toLocaleString("en-IN")} recorded under ${formData.category}!`);
      setIsAddModalOpen(false);
      resetForm();
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Expense
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense || !validateForm()) return;

    setIsSubmitting(true);
    try {
      await api.expenses.update(selectedExpense.id, {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success("Expense voucher updated successfully!");
      setIsEditModalOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to update expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft Deactivate / Archive
  const handleDeleteExpense = async (exp: ExpenseItem) => {
    if (!window.confirm(`Are you sure you want to deactivate expense voucher "${exp.description}" (₹${exp.amount.toLocaleString("en-IN")})? This maintains an audit record.`)) {
      return;
    }

    try {
      await api.expenses.delete(exp.id);
      toast.success("Expense voucher archived successfully.");
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive expense record");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const headers = "Date,Category,Description,Amount,Payment Method,Reference Number,Recorded By\n";
    const body = expenses
      .map(
        (e) =>
          `"${e.expense_date}","${e.category}","${e.description.replace(/"/g, '""')}",${e.amount},"${e.payment_method}","${e.reference_number || ""}","${e.recorded_by_name || "Admin"}"`
      )
      .join("\n");

    const blob = new Blob([headers + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DMHS_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("Expenses ledger exported to CSV successfully");
  };

  // Category Icon & Color Mapping
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Staff Salaries":
        return <Badge variant="primary" size="sm">Staff Salaries</Badge>;
      case "Aaya’s Salaries":
        return <Badge variant="neutral" size="sm">Aaya’s Salaries</Badge>;
      case "Building Rent":
        return <Badge variant="gold" size="sm">Building Rent</Badge>;
      case "Electricity Bill":
        return <Badge variant="warning" size="sm">Electricity Bill</Badge>;
      case "Drinking Water Expenses":
        return <Badge variant="success" size="sm">Drinking Water</Badge>;
      case "Usable Water Expenses":
        return <Badge variant="info" size="sm">Usable Water</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Other Expenses</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="School Operational Expenses"
        description="Comprehensive expense management, category ledgers, monthly operational burn rates, and financial audit controls."
        icon={<Receipt className="w-6 h-6 text-brand-gold" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
              disabled={expenses.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              Add Expense
            </Button>
          </div>
        }
      />

      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL EXPENSES */}
        <Card className="p-4 border-l-4 border-l-red-500 bg-white dark:bg-dark-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
              Total Expenses
            </p>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-light-primary dark:text-dark-primary mt-2">
            ₹{stats.total_expenses.toLocaleString("en-IN")}
          </h2>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Total active operational ledger ({stats.total_count} records)
          </p>
        </Card>

        {/* CARD 2: CURRENT MONTH EXPENSES */}
        <Card className="p-4 border-l-4 border-l-brand-gold bg-white dark:bg-dark-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
              This Month’s Outflow
            </p>
            <div className="w-8 h-8 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-gold mt-2">
            ₹{stats.current_month_expenses.toLocaleString("en-IN")}
          </h2>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Month of {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
        </Card>

        {/* CARD 3: SALARIES COMBINED */}
        <Card className="p-4 border-l-4 border-l-brand-blue bg-white dark:bg-dark-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
              Salaries Total
            </p>
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue dark:text-dark-accent flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-light-primary dark:text-dark-primary mt-2">
            ₹{((stats.category_breakdown["Staff Salaries"] || 0) + (stats.category_breakdown["Aaya’s Salaries"] || 0)).toLocaleString("en-IN")}
          </h2>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Staff + Aayas compensation
          </p>
        </Card>

        {/* CARD 4: UTILITIES & RENT */}
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-white dark:bg-dark-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-light-secondary dark:text-dark-secondary">
              Rent &amp; Utilities
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-light-primary dark:text-dark-primary mt-2">
            ₹{(
              (stats.category_breakdown["Building Rent"] || 0) +
              (stats.category_breakdown["Electricity Bill"] || 0) +
              (stats.category_breakdown["Drinking Water Expenses"] || 0) +
              (stats.category_breakdown["Usable Water Expenses"] || 0)
            ).toLocaleString("en-IN")}
          </h2>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
            Facility maintenance &amp; recurring utilities
          </p>
        </Card>
      </div>

      {/* Category Breakdown Horizontal Pills */}
      <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-3">
          Category-Wise Expense Allocations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {EXPENSE_CATEGORIES.map((cat) => {
            const catAmount = stats.category_breakdown[cat] || 0;
            const pct = stats.total_expenses > 0 ? Math.round((catAmount / stats.total_expenses) * 100) : 0;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brand-blue/10 border-brand-blue dark:border-dark-accent shadow-sm ring-1 ring-brand-blue"
                    : "bg-gray-50/70 dark:bg-dark-elevated/50 border-light-border dark:border-dark-border hover:border-brand-gold/60"
                }`}
              >
                <span className="text-[10px] font-bold block text-light-secondary dark:text-dark-secondary truncate" title={cat}>
                  {cat}
                </span>
                <span className="text-xs font-extrabold block text-light-primary dark:text-dark-primary mt-1 font-mono">
                  ₹{catAmount.toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] font-semibold text-light-secondary dark:text-dark-secondary block">
                  {pct}% of total
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              Search Expenses
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description, reference #..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              Category Filter
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            >
              <option value="all">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
            />
          </div>

          {/* To Date */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
            />
          </div>

          {/* Clear Button */}
          <div className="sm:col-span-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setFromDate("");
                setToDate("");
              }}
              className="w-full text-xs"
              title="Reset all filters"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              Operational Expense Ledger
            </h3>
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              Showing {expenses.length} recorded voucher entries
            </p>
          </div>
          {selectedCategory !== "all" && (
            <Badge variant="primary" size="sm">
              Filtered: {selectedCategory}
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#142B4A]/5 dark:bg-[#0B1730]/40 text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-bold tracking-wider border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-light-secondary dark:text-dark-secondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-7 h-7 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs">Loading operational expenses from database...</p>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-light-secondary dark:text-dark-secondary">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center border border-brand-gold/20">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-light-primary dark:text-dark-primary">
                        No Operational Expenses Found
                      </p>
                      <p className="text-xs max-w-sm">
                        {searchQuery || selectedCategory !== "all" || fromDate || toDate
                          ? "No expense records match your current filter criteria. Try adjusting or clearing your filters."
                          : "No operational expenses recorded yet. Click 'Add Expense' above to record staff salaries, utilities, rent, or maintenance vouchers."}
                      </p>
                      <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<PlusCircle className="w-4 h-4" />}>
                        Record First Expense
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-brand-pale/20 dark:hover:bg-dark-elevated/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-light-primary dark:text-dark-primary whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(exp.category)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-light-primary dark:text-dark-primary line-clamp-1">
                        {exp.description}
                      </p>
                      {exp.notes && (
                        <p className="text-[10px] text-light-secondary dark:text-dark-secondary line-clamp-1">
                          Note: {exp.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-light-primary dark:text-dark-primary whitespace-nowrap">
                      ₹{exp.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-light-primary dark:text-dark-primary font-medium text-[11px]">
                        <CreditCard className="w-3 h-3 text-light-secondary" />
                        {exp.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-light-secondary dark:text-dark-secondary whitespace-nowrap">
                      {exp.reference_number || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenView(exp)}
                          className="p-1.5 rounded-lg text-light-secondary hover:text-brand-blue hover:bg-brand-blue/10 transition-colors cursor-pointer"
                          title="View Voucher Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg text-light-secondary hover:text-brand-gold hover:bg-brand-gold/10 transition-colors cursor-pointer"
                          title="Edit Expense Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1.5 rounded-lg text-light-secondary hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Archive Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* ADD EXPENSE MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Operational Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <p className="text-xs text-light-secondary dark:text-dark-secondary">
            Enter authorized school operational expenditure. All transactions update financial metrics live and maintain an audit record.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
              {formErrors.expense_date && (
                <p className="text-[10px] text-red-500 mt-1">{formErrors.expense_date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-[10px] text-red-500 mt-1">{formErrors.category}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
              Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly salary disbursement, campus water tanker, electricity bill..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            />
            {formErrors.description && (
              <p className="text-[10px] text-red-500 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-light-secondary dark:text-dark-secondary">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full text-xs sm:text-sm pl-7 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono font-bold"
                />
              </div>
              {formErrors.amount && (
                <p className="text-[10px] text-red-500 mt-1">{formErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Reference / Receipt # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. VOUCHER-101, CHQ-4921, TXN-91823"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Audit Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved by secretary, receipt in file"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Save Expense
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* EDIT EXPENSE MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Operational Expense Voucher"
      >
        <form onSubmit={handleUpdateExpense} className="space-y-4">
          <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-xs text-brand-gold font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Authorized Administrator Financial Correction Mode</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Audit Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Update Voucher
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* VIEW DETAILS MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Expense Voucher Details"
      >
        {selectedExpense && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated/60 border border-light-border dark:border-dark-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Expense Category
                  </span>
                  <div className="mt-1">{getCategoryBadge(selectedExpense.category)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Amount Paid
                  </span>
                  <span className="text-xl font-extrabold text-light-primary dark:text-dark-primary font-mono block">
                    ₹{selectedExpense.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-light-border dark:border-dark-border">
                <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                  Description
                </span>
                <p className="text-sm font-semibold text-light-primary dark:text-dark-primary mt-0.5">
                  {selectedExpense.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-light-border dark:border-dark-border text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Expense Date
                  </span>
                  <span className="font-mono font-medium text-light-primary dark:text-dark-primary">
                    {selectedExpense.expense_date}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Payment Method
                  </span>
                  <span className="font-medium text-light-primary dark:text-dark-primary">
                    {selectedExpense.payment_method}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Reference Number
                  </span>
                  <span className="font-mono font-medium text-light-primary dark:text-dark-primary">
                    {selectedExpense.reference_number || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Recorded By
                  </span>
                  <span className="font-medium text-light-primary dark:text-dark-primary">
                    {selectedExpense.recorded_by_name || "STA Khadri"}
                  </span>
                </div>
              </div>

              {selectedExpense.notes && (
                <div className="pt-2 border-t border-light-border dark:border-dark-border text-xs">
                  <span className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary block">
                    Audit Notes
                  </span>
                  <p className="text-light-secondary dark:text-dark-secondary mt-0.5">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedExpense);
                }}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default ExpensesPage;
