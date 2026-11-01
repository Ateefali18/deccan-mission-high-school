import React, { useEffect, useState } from "react";
import { CreditCard, PlusCircle, CheckCircle, Clock, AlertCircle, FileText, IndianRupee } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

interface InvoiceItem {
  id: number;
  invoice_number: string;
  student_id: number;
  student_name: string;
  admission_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "pending";
  due_date: string;
  created_at: string;
}

interface FeeStats {
  total_billed: number;
  total_collected: number;
  outstanding: number;
  collection_rate: number;
}

export const FeesPage: React.FC = () => {
  const [stats, setStats] = useState<FeeStats>({
    total_billed: 0,
    total_collected: 0,
    outstanding: 0,
    collection_rate: 0,
  });
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, invData] = await Promise.all([
        api.fees.getStats(),
        api.fees.getInvoices(),
      ]);
      setStats(statsData);
      setInvoices(invData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load fee management records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPayment = (inv: InvoiceItem) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.balance));
    setReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
    setPaymentMode("cash");
    setIsPaymentOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.fees.recordPayment({
        invoice_id: selectedInvoice.id,
        student_id: selectedInvoice.student_id,
        receipt_number: receiptNumber.trim(),
        amount: amt,
        payment_mode: paymentMode,
      });
      toast.success(`Payment of ₹${amt.toLocaleString("en-IN")} recorded successfully!`);
      setIsPaymentOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Collections"
        description="Monitor school fee billing, collect tuition installments, issue payment receipts, and track outstanding balances."
        icon={<CreditCard className="w-6 h-6 text-brand-blue" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-blue">
          <p className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
            Total Billed
          </p>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
            ₹{stats.total_billed.toLocaleString("en-IN")}
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Academic Year 2025-2026</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-status-success">
          <p className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
            Total Collected
          </p>
          <h2 className="text-2xl font-bold text-status-success mt-1">
            ₹{stats.total_collected.toLocaleString("en-IN")}
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Real-time collections</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-status-warning">
          <p className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
            Outstanding Dues
          </p>
          <h2 className="text-2xl font-bold text-status-warning mt-1">
            ₹{stats.outstanding.toLocaleString("en-IN")}
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Pending payments</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-xs uppercase font-semibold text-light-muted dark:text-dark-muted">
            Collection Rate
          </p>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
            {stats.collection_rate}%
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">Recovery percentage</p>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
            Student Fee Invoices & Receipts
          </h3>
          <span className="text-xs text-light-muted dark:text-dark-muted">
            Showing {invoices.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#142B4A]/5 dark:bg-[#0B1730]/40 text-xs font-semibold uppercase text-light-muted dark:text-dark-muted">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-light-muted dark:text-dark-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-light-muted dark:text-dark-muted">
                    No fee invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-brand-pale/20 dark:hover:bg-dark-elevated/40">
                    <td className="py-3 px-4 font-mono font-medium text-brand-blue">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-light-text dark:text-dark-text">{inv.student_name}</div>
                      <div className="text-xs text-light-muted dark:text-dark-muted">Adm: {inv.admission_number}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">₹{inv.total_amount.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-status-success font-medium">
                      ₹{inv.paid_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-medium text-status-warning">
                      ₹{inv.balance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      {inv.status === "paid" && <Badge variant="green">Paid</Badge>}
                      {inv.status === "partial" && <Badge variant="yellow">Partial</Badge>}
                      {inv.status === "pending" && <Badge variant="red">Pending</Badge>}
                    </td>
                    <td className="py-3 px-4 text-xs text-light-muted dark:text-dark-muted">{inv.due_date}</td>
                    <td className="py-3 px-4 text-right">
                      {inv.balance > 0 ? (
                        <Button size="sm" onClick={() => handleOpenPayment(inv)}>
                          Collect Fee
                        </Button>
                      ) : (
                        <span className="text-xs text-status-success font-medium flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Cleared
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
        title="Record Fee Payment"
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-brand-pale/50 dark:bg-dark-elevated rounded-lg space-y-1">
              <p className="text-xs text-light-muted dark:text-dark-muted">
                Student: <span className="font-semibold text-light-text dark:text-dark-text">{selectedInvoice.student_name}</span> ({selectedInvoice.admission_number})
              </p>
              <p className="text-xs text-light-muted dark:text-dark-muted">
                Invoice: <span className="font-mono text-brand-blue">{selectedInvoice.invoice_number}</span> | Balance: <span className="font-semibold text-status-warning">₹{selectedInvoice.balance.toLocaleString("en-IN")}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Receipt Number *
              </label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Payment Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={selectedInvoice.balance}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="cash">Cash Counter</option>
                <option value="upi">UPI / QR Code</option>
                <option value="online">Net Banking / Card</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Generate Receipt & Save"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};
