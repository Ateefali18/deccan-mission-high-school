import React, { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  PlusCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  IndianRupee,
  Receipt,
  Download,
  Search,
  Filter,
  ShieldCheck,
  Info,
  Sliders,
  Percent,
  Layers,
  History,
  Users,
  Check,
  ArrowRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { api, getCategoryForClass } from "../../services/api";
import type {
  FeeFinancialSummary,
  FeeStructure,
  FeeComponent,
  FeePaymentTransaction,
} from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

interface InvoiceItem {
  id: number | string;
  invoice_number: string;
  student_id: number | string;
  student_name: string;
  admission_number: string;
  class_name: string;
  class_id?: number | string;
  section_name: string;
  academic_year?: string;
  academic_term?: string;
  academic_category?: string;
  fee_category?: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "pending" | "cancelled";
  concession_amount?: number;
  concession_reason?: string;
  due_date: string;
  created_at: string;
}

export const FeesPage: React.FC = () => {
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    "all" | "Pre-Primary" | "Primary" | "Higher Classes" | "structures" | "history"
  >("all");

  const [summary, setSummary] = useState<FeeFinancialSummary>({
    total_applicable_fees: 0,
    total_collected_fees: 0,
    total_remaining_fees: 0,
    collection_rate: 0,
    completed_payments_count: 0,
    total_enrolled_students: 0,
    pre_primary_collected: 0,
    primary_collected: 0,
    higher_classes_collected: 0,
    pre_primary_applicable: 0,
    primary_applicable: 0,
    higher_classes_applicable: 0,
  });

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<FeePaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  // Payment Recording Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Concession / Discount Modal
  const [isConcessionOpen, setIsConcessionOpen] = useState(false);
  const [concessionAmount, setConcessionAmount] = useState("");
  const [concessionReason, setConcessionReason] = useState("");
  const [isSubmittingConcession, setIsSubmittingConcession] = useState(false);

  // Fee Structure Editing / Creation Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<Partial<FeeStructure>>({
    category: "Primary",
    class_name: "Class 1",
    tuition_fee: 15000,
    admission_fee: 3000,
    exam_fee: 2000,
    library_fee: 1000,
    laboratory_fee: 0,
    transport_fee: 0,
    activity_fee: 1000,
    other_charges: 0,
  });
  const [applyFeeMode, setApplyFeeMode] = useState<"new_only" | "all_class" | "selected">("all_class");
  const [isSavingStructure, setIsSavingStructure] = useState(false);

  // Receipt Voucher Print/View Modal
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Auto-sync enrolled students first
      await api.fees.syncEnrolledStudents();

      const [summaryData, invData, structuresData, historyData] = await Promise.all([
        api.fees.getFinancialSummary(),
        api.fees.getInvoices(),
        api.fees.getFeeStructures(),
        api.fees.getPaymentHistory(),
      ]);

      setSummary(summaryData);
      setInvoices(invData);
      setFeeStructures(structuresData);
      setPaymentHistory(historyData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load fee management records");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Payment Recording
  const handleOpenPayment = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.balance));
    setReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
    setTransactionRef("");
    setPaymentRemarks("");
    setPaymentMode("Cash");
    setIsPaymentOpen(true);
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    if (amt > selectedInvoice.balance) {
      toast.error(`Payment amount (₹${amt}) cannot exceed remaining balance (₹${selectedInvoice.balance}).`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await api.fees.recordPayment({
        invoice_id: selectedInvoice.id,
        student_id: selectedInvoice.student_id,
        receipt_number: receiptNumber.trim() || `REC-${Date.now().toString().slice(-6)}`,
        amount: amt,
        payment_mode: paymentMode,
        transaction_reference: transactionRef.trim() || undefined,
        remarks: paymentRemarks.trim() || undefined,
      });

      toast.success(
        `Fee payment of ₹${amt.toLocaleString("en-IN")} recorded successfully! Receipt #${res.payment.receipt_number} generated.`
      );
      setIsPaymentOpen(false);
      setActiveReceipt(res.payment);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Concession Modal
  const handleOpenConcession = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setConcessionAmount(String(inv.concession_amount || 0));
    setConcessionReason(inv.concession_reason || "Approved Merit / Sibling Concession");
    setIsConcessionOpen(true);
  };

  // Submit Concession
  const handleSaveConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = parseFloat(concessionAmount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Please enter a valid non-negative concession amount.");
      return;
    }

    setIsSubmittingConcession(true);
    try {
      await api.fees.applyDiscountOrConcession(selectedInvoice.id, amt, concessionReason);
      toast.success(`Fee concession of ₹${amt.toLocaleString("en-IN")} applied to ${selectedInvoice.student_name}.`);
      setIsConcessionOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply concession");
    } finally {
      setIsSubmittingConcession(false);
    }
  };

  // Save Fee Structure
  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStructure(true);
    try {
      await api.fees.saveFeeStructure(editingStructure, applyFeeMode);
      toast.success(
        `Fee structure saved! Updated applicable fees applied (${
          applyFeeMode === "all_class" ? "All students in class" : "New admissions only"
        }), preserving prior payments.`
      );
      setIsStructureModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save fee structure");
    } finally {
      setIsSavingStructure(false);
    }
  };

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const category = inv.academic_category || inv.fee_category || getCategoryForClass(inv.class_name || "");

    // Category tab filter
    if (activeCategoryTab !== "all" && activeCategoryTab !== "structures" && activeCategoryTab !== "history") {
      if (category.toLowerCase() !== activeCategoryTab.toLowerCase()) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;

    // Class filter
    if (classFilter !== "all" && inv.class_name !== classFilter) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.student_name.toLowerCase().includes(q) ||
        inv.admission_number.toLowerCase().includes(q) ||
        inv.invoice_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Student Collections Management"
        description="Comprehensive category billing (Pre-Primary, Primary, Higher Classes), custom fee structures, live reconciliations, and verified receipt vouchers."
        icon={<CreditCard className="w-6 h-6 text-brand-gold" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Sliders className="w-4 h-4" />}
              onClick={() => {
                setEditingStructure({
                  category: "Primary",
                  class_name: "Class 1",
                  tuition_fee: 15000,
                  admission_fee: 3000,
                  exam_fee: 2000,
                  library_fee: 1000,
                  laboratory_fee: 0,
                  transport_fee: 0,
                  activity_fee: 1000,
                  other_charges: 0,
                });
                setIsStructureModalOpen(true);
              }}
            >
              Configure Fee Structure
            </Button>
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadData}
              isLoading={isLoading}
            >
              Sync Enrolled Students
            </Button>
          </div>
        }
      />

      {/* ==================================================================== */}
      {/* 1. TOP FINANCIAL SUMMARY CARDS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: TOTAL FEES COLLECTED */}
        <Card className="p-6 border-l-4 border-l-emerald-500 bg-white dark:bg-dark-card shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              CARD 1: TOTAL FEES COLLECTED
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-light-primary dark:text-dark-primary font-mono tracking-tight">
              ₹{summary.total_collected_fees.toLocaleString("en-IN")}
            </h2>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
              Sum of successfully recorded student payments ({summary.completed_payments_count} verified receipts).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs">
            <span className="text-light-secondary dark:text-dark-secondary">Collection Recovery Rate:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {summary.collection_rate}%
            </span>
          </div>
        </Card>

        {/* CARD 2: REMAINING FEES */}
        <Card className="p-6 border-l-4 border-l-brand-gold bg-white dark:bg-dark-card shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
              CARD 2: REMAINING FEES
            </span>
            <span className="p-2 rounded-xl bg-brand-gold/15 text-brand-gold font-bold">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-gold font-mono tracking-tight">
              ₹{summary.total_remaining_fees.toLocaleString("en-IN")}
            </h2>
            <p className="text-xs text-light-secondary dark:text-dark-secondary mt-1">
              Outstanding fee balance still to be collected (Total Applicable - Total Collected).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs">
            <span className="text-light-secondary dark:text-dark-secondary">Total Applicable Fees:</span>
            <span className="font-extrabold text-light-primary dark:text-dark-primary font-mono">
              ₹{summary.total_applicable_fees.toLocaleString("en-IN")}
            </span>
          </div>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* 2. CATEGORY COLLECTION BREAKDOWN BARS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-gray-50/70 dark:bg-dark-elevated/40 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs font-bold text-light-secondary dark:text-dark-secondary mb-1">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-brand-navy dark:text-brand-gold" />
          </div>
          <p className="text-xl font-bold font-mono text-light-primary dark:text-dark-primary">
            {summary.total_enrolled_students || invoices.length} Students
          </p>
          <p className="text-[10px] text-light-secondary dark:text-dark-secondary mt-1">
            Auto-synchronized with Admissions
          </p>
        </Card>

        <Card className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
            <span>Pre-Primary Collection</span>
            <Badge variant="purple" size="sm">Nursery - UKG</Badge>
          </div>
          <p className="text-xl font-bold font-mono text-purple-900 dark:text-purple-200">
            ₹{(summary.pre_primary_collected || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-1">
            Applicable: ₹{(summary.pre_primary_applicable || 0).toLocaleString("en-IN")}
          </p>
        </Card>

        <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">
            <span>Primary Collection</span>
            <Badge variant="blue" size="sm">Class 1 - 5</Badge>
          </div>
          <p className="text-xl font-bold font-mono text-blue-900 dark:text-blue-200">
            ₹{(summary.primary_collected || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-1">
            Applicable: ₹{(summary.primary_applicable || 0).toLocaleString("en-IN")}
          </p>
        </Card>

        <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
            <span>Higher Classes Collection</span>
            <Badge variant="gold" size="sm">Class 6 - 10</Badge>
          </div>
          <p className="text-xl font-bold font-mono text-amber-900 dark:text-amber-200">
            ₹{(summary.higher_classes_collected || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1">
            Applicable: ₹{(summary.higher_classes_applicable || 0).toLocaleString("en-IN")}
          </p>
        </Card>
      </div>

      {/* Realistic Accounting Disclosure */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
        <p>
          <strong>Automatic Admission Synchronization:</strong> Every student admitted through the portal is permanently registered in this fee ledger with tuition and examination charges corresponding to their class category. Prior payment receipts remain securely preserved during any fee structure revision.
        </p>
      </div>

      {/* ==================================================================== */}
      {/* 3. CATEGORY NAVIGATION TABS */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-light-border dark:border-dark-border pb-2">
        <button
          type="button"
          onClick={() => setActiveCategoryTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "all"
              ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-dark-bg shadow-sm"
              : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
          }`}
        >
          All Enrolled Students ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab("Pre-Primary")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "Pre-Primary"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
          }`}
        >
          Category A: Pre-Primary (Nursery, LKG, UKG)
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab("Primary")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "Primary"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
          }`}
        >
          Category B: Primary (Classes 1 - 5)
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab("Higher Classes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "Higher Classes"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
          }`}
        >
          Category C: Higher Classes (Classes 6 - 10)
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab("structures")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "structures"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 inline mr-1" />
          Fee Structures &amp; Components
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategoryTab === "history"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-gray-100 dark:bg-dark-elevated text-light-secondary dark:text-dark-secondary hover:bg-gray-200"
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1" />
          Verified Payment History ({paymentHistory.length})
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 4. VIEW: FEE STRUCTURES & COMPONENTS */}
      {/* ==================================================================== */}
      {activeCategoryTab === "structures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              Applicable School Fee Structures by Academic Category &amp; Class
            </h3>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => {
                setEditingStructure({
                  category: "Primary",
                  class_name: "Class 1",
                  tuition_fee: 15000,
                  admission_fee: 3000,
                  exam_fee: 2000,
                  library_fee: 1000,
                  laboratory_fee: 0,
                  transport_fee: 0,
                  activity_fee: 1000,
                  other_charges: 0,
                });
                setIsStructureModalOpen(true);
              }}
            >
              Add / Modify Fee Structure
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {feeStructures.map((fs) => (
              <Card key={fs.id} className="p-5 border border-light-border dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      fs.category === "Pre-Primary"
                        ? "purple"
                        : fs.category === "Primary"
                        ? "blue"
                        : "gold"
                    }
                  >
                    {fs.category}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStructure(fs);
                      setIsStructureModalOpen(true);
                    }}
                    className="text-xs font-bold text-brand-blue dark:text-dark-accent hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                    {fs.class_name}
                  </h4>
                  <div className="text-2xl font-extrabold font-mono text-brand-navy dark:text-brand-gold mt-1">
                    ₹{fs.total_applicable_fee.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="text-[11px] space-y-1 pt-2 border-t border-light-border dark:border-dark-border text-light-secondary dark:text-dark-secondary">
                  <div className="flex justify-between">
                    <span>Tuition Fee:</span>
                    <span className="font-mono font-bold">₹{fs.tuition_fee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admission Fee:</span>
                    <span className="font-mono font-bold">₹{fs.admission_fee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Examination Fee:</span>
                    <span className="font-mono font-bold">₹{fs.exam_fee.toLocaleString("en-IN")}</span>
                  </div>
                  {fs.library_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Library Fee:</span>
                      <span className="font-mono font-bold">₹{fs.library_fee.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {fs.laboratory_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Lab Charges:</span>
                      <span className="font-mono font-bold">₹{fs.laboratory_fee.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {fs.activity_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Activity &amp; Sports:</span>
                      <span className="font-mono font-bold">₹{fs.activity_fee.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. VIEW: VERIFIED PAYMENTS HISTORY */}
      {/* ==================================================================== */}
      {activeCategoryTab === "history" && (
        <Card className="overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
          <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Official Payment Receipts &amp; Transaction Ledger</span>
            </h3>
            <span className="text-xs text-light-secondary dark:text-dark-secondary font-mono">
              {paymentHistory.length} total receipts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#142B4A]/5 dark:bg-[#0B1730]/40 text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-bold tracking-wider border-b border-light-border dark:border-dark-border">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Student Name &amp; ADM #</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-light-secondary dark:text-dark-secondary">
                      No payment receipts recorded yet. Click "Record Payment" on any student invoice to generate verified receipts.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-elevated/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-navy dark:text-brand-gold">
                        {p.receipt_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-light-primary dark:text-dark-primary">{p.student_name}</div>
                        <div className="text-[10px] font-mono text-light-secondary dark:text-dark-secondary">{p.admission_number}</div>
                      </td>
                      <td className="py-3 px-4">{p.class_name || "—"}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="blue" size="sm">{p.payment_mode}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-light-secondary dark:text-dark-secondary">
                        {p.transaction_reference || "Counter Cash"}
                      </td>
                      <td className="py-3 px-4 text-light-secondary dark:text-dark-secondary">
                        {p.created_at?.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveReceipt(p)}
                          title="Print / View Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 6. MAIN VIEW: STUDENT INVOICES TABLE (ALL, PRE-PRIMARY, PRIMARY, HIGHER) */}
      {/* ==================================================================== */}
      {activeCategoryTab !== "structures" && activeCategoryTab !== "history" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Search by Student Name, Admission #, or Invoice #
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Zoya, ADM-2026-001, or INV-..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Class Filter
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                >
                  <option value="all">All Classes in Tab</option>
                  <option value="Nursery">Nursery</option>
                  <option value="LKG">LKG</option>
                  <option value="UKG">UKG</option>
                  <option value="Class 1">Class 1</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
                  Payment Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Student Invoices Table */}
          <Card className="overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
                Enrolled Students Fee Ledger ({filteredInvoices.length} students)
              </h3>
              <Badge variant="blue">
                Tab: {activeCategoryTab === "all" ? "All Categories" : activeCategoryTab}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#142B4A]/5 dark:bg-[#0B1730]/40 text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-bold tracking-wider border-b border-light-border dark:border-dark-border">
                  <tr>
                    <th className="py-3 px-4">Student Name &amp; ADM #</th>
                    <th className="py-3 px-4">Class &amp; Section</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Total Fee</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Pending Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-light-secondary dark:text-dark-secondary">
                        No enrolled students match the selected category or search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const category =
                        inv.academic_category || inv.fee_category || getCategoryForClass(inv.class_name || "");
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-dark-elevated/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-light-primary dark:text-dark-primary">
                              {inv.student_name}
                            </div>
                            <div className="text-[11px] font-mono text-brand-navy dark:text-brand-gold">
                              {inv.admission_number}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-light-primary dark:text-dark-primary">
                              {inv.class_name} - {inv.section_name}
                            </span>
                            <div className="text-[10px] text-light-secondary dark:text-dark-secondary">
                              {inv.academic_year || "2026-2027"} • {inv.academic_term || "Term 1"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                category === "Pre-Primary"
                                  ? "purple"
                                  : category === "Primary"
                                  ? "blue"
                                  : "gold"
                              }
                              size="sm"
                            >
                              {category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-light-primary dark:text-dark-primary">
                            ₹{Number(inv.total_amount).toLocaleString("en-IN")}
                            {inv.concession_amount && inv.concession_amount > 0 ? (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
                                (₹{inv.concession_amount} concession)
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(inv.paid_amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-gold">
                            ₹{Number(inv.balance || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                inv.status === "paid"
                                  ? "success"
                                  : inv.status === "partial"
                                  ? "gold"
                                  : "neutral"
                              }
                            >
                              {inv.status === "paid"
                                ? "Fully Paid"
                                : inv.status === "partial"
                                ? "Partial"
                                : "Pending"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.balance > 0 && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenPayment(inv)}
                                >
                                  Record Payment
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenConcession(inv)}
                                title="Apply Sibling / Merit Concession"
                              >
                                <Percent className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. RECORD PAYMENT MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Fee Payment Receipt"
        description={`Record verified fee payment for ${selectedInvoice?.student_name} (${selectedInvoice?.admission_number})`}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPaymentOpen(false)} disabled={isSubmittingPayment}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordPayment} isLoading={isSubmittingPayment}>
              Save &amp; Generate Receipt Voucher
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-dark-elevated text-xs space-y-1.5 border border-light-border dark:border-dark-border">
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Student Name:</span>
                <span className="font-bold text-light-primary dark:text-dark-primary">{selectedInvoice.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Class &amp; Section:</span>
                <span className="font-bold text-light-primary dark:text-dark-primary">{selectedInvoice.class_name} - {selectedInvoice.section_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Total Applicable Fee:</span>
                <span className="font-mono font-bold">₹{selectedInvoice.total_amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Already Paid:</span>
                <span className="font-mono font-bold text-emerald-600">₹{selectedInvoice.paid_amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-light-border dark:border-dark-border font-bold">
                <span className="text-brand-gold">Outstanding Balance:</span>
                <span className="font-mono text-brand-gold">₹{selectedInvoice.balance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                  Payment Amount (₹) *
                </label>
                <Input
                  type="number"
                  min="1"
                  max={selectedInvoice.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                >
                  <option value="Cash">Cash (School Counter)</option>
                  <option value="UPI / QR">UPI / QR Code</option>
                  <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque / DD">Cheque / Demand Draft</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Receipt Number *"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                required
              />
              <Input
                label="Transaction / Cheque Reference"
                placeholder="Optional reference number"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            <Input
              label="Remarks / Notes (Optional)"
              placeholder="e.g. Paid in full by father Mohammed"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
            />
          </form>
        )}
      </Dialog>

      {/* ==================================================================== */}
      {/* 8. APPLY CONCESSION / DISCOUNT MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isConcessionOpen}
        onClose={() => setIsConcessionOpen(false)}
        title="Apply Approved Fee Concession"
        description={`Set student-specific concession for ${selectedInvoice?.student_name}`}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConcessionOpen(false)} disabled={isSubmittingConcession}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveConcession} isLoading={isSubmittingConcession}>
              Apply Concession
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <form onSubmit={handleSaveConcession} className="space-y-4">
            <Input
              label="Approved Concession Amount (₹) *"
              type="number"
              min="0"
              max={selectedInvoice.total_amount}
              value={concessionAmount}
              onChange={(e) => setConcessionAmount(e.target.value)}
              required
            />
            <Input
              label="Reason / Board Approval Note *"
              placeholder="e.g. Sibling discount / Merit scholarship"
              value={concessionReason}
              onChange={(e) => setConcessionReason(e.target.value)}
              required
            />
          </form>
        )}
      </Dialog>

      {/* ==================================================================== */}
      {/* 9. CONFIGURE FEE STRUCTURE MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        title="Configure Academic Fee Structure"
        description="Set component-wise charges for classes and apply to enrolled students while strictly preserving payment history."
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsStructureModalOpen(false)} disabled={isSavingStructure}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveFeeStructure} isLoading={isSavingStructure}>
              Save Fee Structure
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveFeeStructure} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                Category *
              </label>
              <select
                value={editingStructure.category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setEditingStructure((prev) => ({
                    ...prev,
                    category: cat,
                    class_name: cat === "Pre-Primary" ? "Nursery" : cat === "Primary" ? "Class 1" : "Class 6",
                  }));
                }}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
              >
                <option value="Pre-Primary">Pre-Primary (Nursery, LKG, UKG)</option>
                <option value="Primary">Primary (Classes 1 - 5)</option>
                <option value="Higher Classes">Higher Classes (Classes 6 - 10)</option>
                <option value="Higher Secondary">Higher Secondary (Classes 11 - 12)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-1">
                Target Class *
              </label>
              <select
                value={editingStructure.class_name}
                onChange={(e) => setEditingStructure((prev) => ({ ...prev, class_name: e.target.value }))}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border"
              >
                {editingStructure.category === "Pre-Primary" ? (
                  <>
                    <option value="All Pre-Primary (Nursery, LKG, UKG)">All Pre-Primary (Nursery, LKG, UKG)</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                  </>
                ) : editingStructure.category === "Primary" ? (
                  <>
                    <option value="All Primary (Classes 1 - 5)">All Primary (Classes 1 - 5)</option>
                    <option value="Class 1">Class 1</option>
                    <option value="Class 2">Class 2</option>
                    <option value="Class 3">Class 3</option>
                    <option value="Class 4">Class 4</option>
                    <option value="Class 5">Class 5</option>
                  </>
                ) : (
                  <>
                    <option value="All Higher Classes (Classes 6 - 10)">All Higher Classes (Classes 6 - 10)</option>
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Input
              label="Tuition Fee (₹)"
              type="number"
              value={editingStructure.tuition_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, tuition_fee: Number(e.target.value) }))}
            />
            <Input
              label="Admission Fee (₹)"
              type="number"
              value={editingStructure.admission_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, admission_fee: Number(e.target.value) }))}
            />
            <Input
              label="Examination Fee (₹)"
              type="number"
              value={editingStructure.exam_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, exam_fee: Number(e.target.value) }))}
            />
            <Input
              label="Library Fee (₹)"
              type="number"
              value={editingStructure.library_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, library_fee: Number(e.target.value) }))}
            />
            <Input
              label="Lab Fee (₹)"
              type="number"
              value={editingStructure.laboratory_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, laboratory_fee: Number(e.target.value) }))}
            />
            <Input
              label="Activity / Sports (₹)"
              type="number"
              value={editingStructure.activity_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, activity_fee: Number(e.target.value) }))}
            />
            <Input
              label="Transport Fee (₹)"
              type="number"
              value={editingStructure.transport_fee}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, transport_fee: Number(e.target.value) }))}
            />
            <Input
              label="Other Charges (₹)"
              type="number"
              value={editingStructure.other_charges}
              onChange={(e) => setEditingStructure((prev) => ({ ...prev, other_charges: Number(e.target.value) }))}
            />
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-2">
              Apply This Fee Revision To:
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyFeeMode === "all_class"}
                  onChange={() => setApplyFeeMode("all_class")}
                  className="text-brand-navy"
                />
                <span className="font-semibold text-light-primary dark:text-dark-primary">
                  All eligible students in selected class (Recalculates balance; preserves all prior payments)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyFeeMode === "new_only"}
                  onChange={() => setApplyFeeMode("new_only")}
                  className="text-brand-navy"
                />
                <span className="font-semibold text-light-primary dark:text-dark-primary">
                  Future new admissions only (Current students retain their existing fee schedules)
                </span>
              </label>
            </div>
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* 10. RECEIPT VOUCHER VIEW / PRINT MODAL */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        title="Official Payment Receipt Voucher"
        description="Deccan Mission High School Verified Financial Voucher"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Print Receipt Voucher
            </Button>
            <Button variant="secondary" onClick={() => setActiveReceipt(null)}>
              Close
            </Button>
          </div>
        }
      >
        {activeReceipt && (
          <div className="p-6 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl space-y-4 font-sans text-xs">
            <div className="text-center pb-4 border-b border-light-border dark:border-dark-border">
              <h2 className="text-base font-extrabold text-brand-navy dark:text-brand-gold uppercase tracking-wide">
                Deccan Mission High School
              </h2>
              <p className="text-[10px] text-light-secondary dark:text-dark-secondary">
                Telangana State SSC Affiliation #TS-HYD-SSC-41092 • Hyderabad, India
              </p>
              <Badge variant="success" size="sm" className="mt-2">
                VERIFIED PAYMENT RECEIPT
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-light-secondary dark:text-dark-secondary block">Receipt Number:</span>
                <span className="font-mono font-bold text-light-primary dark:text-dark-primary">{activeReceipt.receipt_number}</span>
              </div>
              <div className="text-right">
                <span className="text-light-secondary dark:text-dark-secondary block">Receipt Date:</span>
                <span className="font-semibold text-light-primary dark:text-dark-primary">{activeReceipt.created_at?.slice(0, 10) || activeReceipt.payment_date}</span>
              </div>
              <div>
                <span className="text-light-secondary dark:text-dark-secondary block">Student Name:</span>
                <span className="font-bold text-light-primary dark:text-dark-primary">{activeReceipt.student_name}</span>
              </div>
              <div className="text-right">
                <span className="text-light-secondary dark:text-dark-secondary block">Admission #:</span>
                <span className="font-mono font-bold text-light-primary dark:text-dark-primary">{activeReceipt.admission_number}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-center">
              <span className="text-xs uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                Amount Received
              </span>
              <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                ₹{Number(activeReceipt.amount).toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] text-light-secondary dark:text-dark-secondary block mt-1">
                Payment Mode: {activeReceipt.payment_mode} {activeReceipt.transaction_reference ? `(${activeReceipt.transaction_reference})` : ""}
              </span>
            </div>

            <div className="text-[10px] text-light-secondary dark:text-dark-secondary text-center italic">
              This is a computer-generated fee receipt from Deccan Mission High School ERP. Official seal and verification maintained in electronic ledger.
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
