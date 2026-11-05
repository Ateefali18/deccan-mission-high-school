with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update INITIAL_EXPENSES to explicitly include is_active: true
old_exp = """const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "exp_001",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Staff Salaries",
    description: "Monthly faculty salary disbursement - Primary & High School staff",
    amount: 185000,
    payment_method: "Bank Transfer",
    reference_number: "SAL-2026-NOV",
    notes: "Approved by STA Khadri",
  },
  {
    id: "exp_002",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Aaya's Salaries",
    description: "Support staff and custodial helper monthly wages",
    amount: 32000,
    payment_method: "Cash",
    reference_number: "AAY-2026-NOV",
  },
  {
    id: "exp_003",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Electricity Bill",
    description: "TSSPDCL Monthly commercial power tariff for school campus",
    amount: 14850,
    payment_method: "Online Portal",
    reference_number: "TSSPDCL-41092",
  },
];"""

new_exp = """const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "exp_001",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Staff Salaries",
    description: "Monthly faculty salary disbursement - Primary & High School staff",
    amount: 185000,
    payment_method: "Bank Transfer",
    reference_number: "SAL-2026-NOV",
    notes: "Approved by STA Khadri",
    is_active: true,
  },
  {
    id: "exp_002",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Aaya's Salaries",
    description: "Support staff and custodial helper monthly wages",
    amount: 32000,
    payment_method: "Cash",
    reference_number: "AAY-2026-NOV",
    is_active: true,
  },
  {
    id: "exp_003",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Electricity Bill",
    description: "TSSPDCL Monthly commercial power tariff for school campus",
    amount: 14850,
    payment_method: "Online Portal",
    reference_number: "TSSPDCL-41092",
    is_active: true,
  },
];"""

text_norm = text.replace("\r\n", "\n")
assert old_exp.replace("\r\n", "\n") in text_norm, "old_exp not found"
text_norm = text_norm.replace(old_exp.replace("\r\n", "\n"), new_exp.replace("\r\n", "\n"), 1)

# 2. Update .filter((e) => e.is_active) to .filter((e) => e.is_active !== false)
text_norm = text_norm.replace(
    "let list = getStoredCustomExpenses().filter((e) => e.is_active);",
    "let list = getStoredCustomExpenses().filter((e) => e.is_active !== false);"
)

with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated expenses filter and initial expenses in api.ts")
