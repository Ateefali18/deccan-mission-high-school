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
} from "lucide-react";
import { api } from "../../services/api";
import type { FeeFinancialSummary } from "../../types";
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
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "pending" | "cancelled";
  due_date: string;
  created_at: string;
}

export const FeesPage: React.FC = () => {
  const [summary, setSummary] = useState<FeeFinancialSummary>({
    total_applicable_fees: 0,
    total_collected_fees: 0,
    total_remaining_fees: 0,
    collection_rate: 0,
    completed_payments_count: 0,
  });

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Payment Recording Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, invData] = await Promise.all([
        api.fees.getFinancialSummary(),
        api.fees.getInvoices(),
      ]);
      setSummary(summaryData);
      setInvoices(invData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load fee management records");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPayment = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.balance));
    setReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
    setTransactionRef("");
    setPaymentMode("Cash");
    setIsPaymentOpen(true);
  };

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

    setIsSubmitting(true);
    try {
      await api.fees.recordPayment({
        invoice_id: selectedInvoice.id,
        student_id: selectedInvoice.student_id,
        receipt_number: receiptNumber.trim() || `REC-${Date.now().toString().slice(-6)}`,
        amount: amt,
        payment_mode: paymentMode,
        transaction_reference: transactionRef.trim() || undefined,
      });

      toast.success(`Fee payment of ₹${amt.toLocaleString("en-IN")} recorded successfully! Receipt #${receiptNumber} generated.`);
      setIsPaymentOpen(false);
      // Immediately refresh financial summary and invoices table
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
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
        title="Student Fees & Collections"
        description="Comprehensive fee ledger, student tuition billing, receipt vouchers, and live balance reconciliations."
        icon={<CreditCard className="w-6 h-6 text-brand-gold" />}
      />

      {/* ==================================================================== */}
      {/* 1. TOP SUMMARY CARDS (CARD 1: TOTAL FEES COLLECTED, CARD 2: REMAINING FEES) */}
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
              Sum of successfully recorded payments ({summary.completed_payments_count} verified receipts).
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

      {/* Secondary Financial Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-gray-50/70 dark:bg-dark-elevated/40 border border-light-border dark:border-dark-border text-center">
          <p className="text-[10px] uppercase font-bold text-light-secondary dark:text-dark-secondary">
            Total Applicable Fees
          </p>
          <p className="text-lg font-bold text-light-primary dark:text-dark-primary font-mono mt-0.5">
            ₹{summary.total_applicable_fees.toLocaleString("en-IN")}
          </p>
        </Card>

        <Card className="p-3.5 bg-gray-50/70 dark:bg-dark-elevated/40 border border-light-border dark:border-dark-border text-center">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
            Total Collected Fees
          </p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            ₹{summary.total_collected_fees.toLocaleString("en-IN")}
          </p>
        </Card>

        <Card className="p-3.5 bg-gray-50/70 dark:bg-dark-elevated/40 border border-light-border dark:border-dark-border text-center">
          <p className="text-[10px] uppercase font-bold text-brand-gold">
            Total Remaining Fees
          </p>
          <p className="text-lg font-bold text-brand-gold font-mono mt-0.5">
            ₹{summary.total_remaining_fees.toLocaleString("en-IN")}
          </p>
        </Card>
      </div>

      {/* Realistic Payment Processing Disclosure */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue" />
        <p>
          <strong>Official School Financial Accounting:</strong> All payments recorded in this ledger correspond to verified student payments received via school counter cash, direct bank deposit, or cheque. Online payment gateway processing is inactive until merchant gateway credentials are submitted by the school board.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-1">
              Search Invoices
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-light-secondary dark:text-dark-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name, admission #, or invoice number..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
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

      {/* Invoices Table */}
      <Card className="overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
            Student Fee Invoices &amp; Payment Receipts
          </h3>
          <span className="text-xs text-light-secondary dark:text-dark-secondary font-mono">
            Showing {filteredInvoices.length} invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#142B4A]/5 dark:bg-[#0B1730]/40 text-light-secondary dark:text-dark-secondary uppercase text-[10px] font-bold tracking-wider border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-light-secondary dark:text-dark-secondary">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-7 h-7 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs">Loading fee invoices from database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-light-secondary dark:text-dark-secondary">
                    No fee invoices match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-brand-pale/20 dark:hover:bg-dark-elevated/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-light-primary dark:text-dark-primary">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-light-primary dark:text-dark-primary">
                        {inv.student_name}
                      </p>
                      <p className="font-mono text-[10px] text-light-secondary dark:text-dark-secondary">
                        {inv.admission_number}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-light-primary dark:text-dark-primary">
                      ₹{inv.total_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{inv.paid_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-gold">
                      ₹{inv.balance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.status === "paid" ? (
                        <Badge variant="success" size="sm">Fully Paid</Badge>
                      ) : inv.status === "partial" ? (
                        <Badge variant="gold" size="sm">Partial</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Pending</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-light-secondary dark:text-dark-secondary">
                      {inv.due_date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.balance > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPayment(inv)}
                          leftIcon={<Receipt className="w-3.5 h-3.5" />}
                        >
                          Record Payment
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Paid in Full
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Fee Payment Receipt"
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-dark-elevated/60 border border-light-border dark:border-dark-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Student:</span>
                <span className="font-bold text-light-primary dark:text-dark-primary">
                  {selectedInvoice.student_name} ({selectedInvoice.admission_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Invoice Total:</span>
                <span className="font-mono font-bold text-light-primary dark:text-dark-primary">
                  ₹{selectedInvoice.total_amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-secondary dark:text-dark-secondary">Outstanding Balance:</span>
                <span className="font-mono font-bold text-brand-gold">
                  ₹{selectedInvoice.balance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Receipt Number *
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                required
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Amount to Collect (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-light-secondary dark:text-dark-secondary">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoice.balance}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm pl-7 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
              >
                <option value="Cash">Cash (Counter Receipt)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI Payment</option>
                <option value="Demand Draft">Demand Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-primary dark:text-dark-primary mb-1">
                Transaction / Cheque Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / Cheque number"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(false)}
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
                Confirm Payment &amp; Issue Receipt
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};
export default FeesPage;
