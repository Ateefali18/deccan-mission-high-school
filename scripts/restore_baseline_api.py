with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Restore BASELINE_TEACHERS
old_teachers = """const BASELINE_TEACHERS: TeacherListItem[] = [
  {
    id: "tch_ateef",
    employee_id: "EMP-ATEEF",
    full_name: "Ateef",
    email: "ateef@dmhs.edu.in",
    designation: "Senior Mathematics Faculty",
    department: "Mathematics",
    employment_status: "active",
    assigned_classes_count: 2,
  },
];"""

new_teachers = """const BASELINE_TEACHERS: TeacherListItem[] = [
  {
    id: "tch_ateef",
    employee_id: "EMP-ATEEF",
    full_name: "Ateef",
    email: "ateef@dmhs.edu.in",
    designation: "Senior Mathematics Faculty",
    department: "Mathematics",
    employment_status: "active",
    assigned_classes_count: 2,
  },
  {
    id: "tch_fatima",
    employee_id: "EMP-1001",
    full_name: "Mrs. Fatima Zahra",
    email: "fatima.zahra@dmhs.edu.in",
    designation: "Senior Mathematics Teacher",
    department: "Mathematics",
    employment_status: "active",
    assigned_classes_count: 2,
  },
  {
    id: "tch_tariq",
    employee_id: "EMP-1002",
    full_name: "Dr. Mohammed Tariq",
    email: "tariq.mohammed@dmhs.edu.in",
    designation: "Science Faculty",
    department: "Science",
    employment_status: "active",
    assigned_classes_count: 1,
  },
];"""

# Restore BASELINE_STUDENTS
old_students = """export const BASELINE_STUDENTS: StudentListItem[] = [
  {
    id: "std_ali",
    admission_number: "ADM-ALI",
    full_name: "Ali",
    email: "ali@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "01",
    student_status: "active",
  },
];"""

new_students = """export const BASELINE_STUDENTS: StudentListItem[] = [
  {
    id: "std_ali",
    admission_number: "ADM-ALI",
    full_name: "Ali",
    email: "ali@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "01",
    student_status: "active",
  },
  {
    id: "std_ali_khan",
    admission_number: "ADM-2025-0101",
    full_name: "Mohammed Ali Khan",
    email: "mohammed.ali@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "02",
    student_status: "active",
  },
  {
    id: "std_ayesha",
    admission_number: "ADM-2025-0102",
    full_name: "Ayesha Siddiqua",
    email: "ayesha.siddiqua@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "03",
    student_status: "active",
  },
  {
    id: "std_ibrahim",
    admission_number: "ADM-2025-0103",
    full_name: "Syed Ibrahim",
    email: "syed.ibrahim@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "04",
    student_status: "active",
  },
  {
    id: "std_zainab",
    admission_number: "ADM-2025-0104",
    full_name: "Zainab Fatima",
    email: "zainab.fatima@dmhs.edu.in",
    class_name: "Class 10",
    section_name: "A",
    roll_number: "05",
    student_status: "active",
  },
];"""

# Restore INITIAL_EXPENSES
old_expenses = 'const INITIAL_EXPENSES: ExpenseItem[] = [];'
new_expenses = """const INITIAL_EXPENSES: ExpenseItem[] = [
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

# Restore INITIAL_INVOICES
old_invoices = 'const INITIAL_INVOICES: any[] = [];'
new_invoices = """const INITIAL_INVOICES = [
  {
    id: 1,
    invoice_number: "DMHS-INV-2025-001",
    student_id: 1,
    student_name: "Zeeshan Khan",
    admission_number: "DMHS-2025-0001",
    total_amount: 45000,
    paid_amount: 45000,
    balance: 0,
    status: "paid",
    due_date: "2025-08-15",
    created_at: "2025-06-10",
  },
  {
    id: 2,
    invoice_number: "DMHS-INV-2025-002",
    student_id: 2,
    student_name: "Ayesha Siddiqa",
    admission_number: "DMHS-2025-0002",
    total_amount: 45000,
    paid_amount: 30000,
    balance: 15000,
    status: "partial",
    due_date: "2025-08-15",
    created_at: "2025-06-10",
  },
];"""

# Restore INITIAL_PAYMENTS
old_payments = 'const INITIAL_PAYMENTS: any[] = [];'
new_payments = """const INITIAL_PAYMENTS = [
  {
    id: 1,
    invoice_id: 1,
    student_id: 1,
    receipt_number: "REC-2025-101",
    amount: 45000,
    payment_mode: "Bank Transfer",
    status: "completed",
    payment_date: "2025-07-02",
  },
  {
    id: 2,
    invoice_id: 2,
    student_id: 2,
    receipt_number: "REC-2025-102",
    amount: 30000,
    payment_mode: "Bank Transfer",
    status: "completed",
    payment_date: "2025-07-10",
  },
];"""

text_norm = text.replace('\r\n', '\n')
for old, new in [
    (old_teachers.replace('\r\n', '\n'), new_teachers.replace('\r\n', '\n')),
    (old_students.replace('\r\n', '\n'), new_students.replace('\r\n', '\n')),
    (old_expenses, new_expenses.replace('\r\n', '\n')),
    (old_invoices, new_invoices.replace('\r\n', '\n')),
    (old_payments, new_payments.replace('\r\n', '\n'))
]:
    assert old in text_norm, f'Could not find {old[:30]}'
    text_norm = text_norm.replace(old, new, 1)

with open('frontend/src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(text_norm)
print('SUCCESS: Restored baseline arrays in api.ts')
