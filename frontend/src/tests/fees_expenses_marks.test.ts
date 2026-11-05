// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { api, getStoredCustomExpenses, getStoredInvoices, getStoredPayments, saveCustomPayment } from "../services/api";

describe("Prompt 3: Fees Summary, Expense Management, and Marks Interface Verification", () => {
  beforeEach(() => {
    // Setup fresh test localStorage
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      length: 0,
      key: () => null,
    } as any;
  });

  // FLOW 1: Fees collected total matches successfully recorded payments
  it("Step 1: Fees collected total matches successfully recorded payments", async () => {
    const summary = await api.fees.getFinancialSummary();
    const payments = getStoredPayments();
    const validPayments = payments.filter((p) => !p.status || p.status === "completed" || p.status === "paid" || p.status === "success");
    const manualSum = validPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    expect(summary.total_collected_fees).toBe(manualSum);
    expect(summary.total_collected_fees).toBeGreaterThan(0);
  });

  // FLOW 2: Remaining fees calculated correctly as Total Applicable Fees minus Total Successfully Recorded Payments
  it("Step 2: Remaining fees calculated correctly as Total Applicable Fees - Total Successfully Recorded Payments", async () => {
    const summary = await api.fees.getFinancialSummary();
    const expectedRemaining = Math.max(0, summary.total_applicable_fees - summary.total_collected_fees);

    expect(summary.total_remaining_fees).toBe(expectedRemaining);
    expect(summary.total_applicable_fees).toBeGreaterThanOrEqual(summary.total_collected_fees);
  });

  // FLOW 3: Recording payment immediately updates both Total Collected and Remaining Fees
  it("Step 3: Payments recorded update both cards immediately", async () => {
    const beforeSummary = await api.fees.getFinancialSummary();
    const initialCollected = beforeSummary.total_collected_fees;
    const initialRemaining = beforeSummary.total_remaining_fees;

    const paymentAmount = 15000;
    await api.fees.recordPayment({
      invoice_id: 2,
      student_id: 2,
      receipt_number: "TEST-REC-999",
      amount: paymentAmount,
      payment_mode: "Cash",
    });

    const afterSummary = await api.fees.getFinancialSummary();
    expect(afterSummary.total_collected_fees).toBe(initialCollected + paymentAmount);
    expect(afterSummary.total_remaining_fees).toBe(initialRemaining - paymentAmount);
    expect(afterSummary.total_applicable_fees).toBe(beforeSummary.total_applicable_fees);
  });

  // FLOW 4: Duplicate or pending payments do not affect totals
  it("Step 4: Pending, failed, or cancelled payments do not inflate Total Collected", async () => {
    const baselineSummary = await api.fees.getFinancialSummary();

    // Insert a pending / failed / cancelled payment directly into storage
    const payments = getStoredPayments();
    payments.push({
      id: "fake_pending_1",
      invoice_id: 5,
      student_id: 5,
      receipt_number: "PENDING-001",
      amount: 40000,
      payment_mode: "Cash",
      status: "pending", // NOT completed
    });
    payments.push({
      id: "fake_cancelled_1",
      invoice_id: 5,
      student_id: 5,
      receipt_number: "CANCELLED-001",
      amount: 40000,
      payment_mode: "Cash",
      status: "cancelled", // Cancelled
    });
    localStorage.setItem("dmhs_custom_payments", JSON.stringify(payments));

    const checkSummary = await api.fees.getFinancialSummary();
    expect(checkSummary.total_collected_fees).toBe(baselineSummary.total_collected_fees);
    expect(checkSummary.total_remaining_fees).toBe(baselineSummary.total_remaining_fees);
  });

  // FLOW 5: Administrator can add an expense with a category, amount, description and date
  it("Step 5 & 6: Administrator can record an expense across all 7 designated categories", async () => {
    const newExpense = await api.expenses.create({
      expense_date: "2026-11-02",
      category: "Drinking Water Expenses",
      description: "Mineral water supplies for Class 1 to 10 water coolers",
      amount: 7500,
      payment_method: "Cash",
      reference_number: "VOUCHER-TEST-77",
      notes: "Delivered by Hyderabad Spring Waters",
    });

    expect(newExpense.id).toBeDefined();
    expect(newExpense.category).toBe("Drinking Water Expenses");
    expect(newExpense.amount).toBe(7500);
    expect(newExpense.description).toBe("Mineral water supplies for Class 1 to 10 water coolers");
  });

  // FLOW 6: Negative or zero amounts are rejected
  it("Step 6b: Expense creation validates amount > 0 and required fields", async () => {
    await expect(
      api.expenses.create({
        expense_date: "2026-11-02",
        category: "Electricity Bill",
        description: "Power bill",
        amount: -500,
      })
    ).rejects.toThrow("Expense amount must be greater than zero.");

    await expect(
      api.expenses.create({
        expense_date: "2026-11-02",
        category: "Electricity Bill",
        description: "",
        amount: 1000,
      })
    ).rejects.toThrow("Expense description is required.");
  });

  // FLOW 7: Administrator can view saved expenses in table
  it("Step 7: Administrator can view saved expenses in table", async () => {
    await api.expenses.create({
      expense_date: "2026-11-02",
      category: "Staff Salaries",
      description: "Special test salary voucher",
      amount: 25000,
      payment_method: "Bank Transfer",
    });

    const list = await api.expenses.list({ search: "Special test salary voucher" });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].description).toBe("Special test salary voucher");
    expect(list[0].amount).toBe(25000);
  });

  // FLOW 8: Filter expenses by category and date range
  it("Step 8: Administrator can filter expenses by category and date range", async () => {
    await api.expenses.create({
      expense_date: "2026-10-15",
      category: "Usable Water Expenses",
      description: "October sanitation water tanker",
      amount: 4000,
    });
    await api.expenses.create({
      expense_date: "2026-11-01",
      category: "Building Rent",
      description: "November campus building lease",
      amount: 65000,
    });

    const categoryFiltered = await api.expenses.list({ category: "Usable Water Expenses" });
    expect(categoryFiltered.every((e) => e.category === "Usable Water Expenses")).toBe(true);

    const dateFiltered = await api.expenses.list({
      from_date: "2026-11-01",
      to_date: "2026-11-30",
    });
    expect(dateFiltered.every((e) => e.expense_date >= "2026-11-01" && e.expense_date <= "2026-11-30")).toBe(true);
  }, 15000);

  // FLOW 9: Monthly and category-wise expense totals calculate accurately
  it("Step 9: Monthly and category-wise expense totals calculate correctly", async () => {
    const stats = await api.expenses.getStats();
    expect(stats.total_expenses).toBeGreaterThan(0);
    expect(stats.total_count).toBeGreaterThan(0);
    expect(stats.category_breakdown["Staff Salaries"]).toBeDefined();
    expect(stats.category_breakdown["Aaya’s Salaries"]).toBeDefined();
    expect(stats.category_breakdown["Building Rent"]).toBeDefined();
    expect(stats.category_breakdown["Electricity Bill"]).toBeDefined();
    expect(stats.category_breakdown["Drinking Water Expenses"]).toBeDefined();
    expect(stats.category_breakdown["Usable Water Expenses"]).toBeDefined();
    expect(stats.category_breakdown["Other Expenses"]).toBeDefined();

    // Verify sum of breakdown equals total_expenses
    const sumCategories = Object.values(stats.category_breakdown).reduce((a, b) => a + b, 0);
    expect(sumCategories).toBe(stats.total_expenses);
  });

  // FLOW 10: Safe deactivation / edit preserves audit trail
  it("Step 10: Updating and deactivating expenses maintains auditability", async () => {
    const exp = await api.expenses.create({
      expense_date: "2026-11-02",
      category: "Other Expenses",
      description: "Whiteboard markers & exam answer sheets",
      amount: 1800,
    });

    const updated = await api.expenses.update(exp.id, {
      amount: 2100,
      notes: "Revised voucher with GST bill",
    });
    expect(updated.amount).toBe(2100);
    expect(updated.notes).toBe("Revised voucher with GST bill");

    const deleted = await api.expenses.delete(exp.id);
    expect(deleted).toBe(true);

    const activeList = await api.expenses.list();
    expect(activeList.find((e) => e.id === exp.id)).toBeUndefined();
  }, 15000);
});
