import re

with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Reset BASELINE_TEACHERS
text = re.sub(
    r'const BASELINE_TEACHERS:\s*TeacherListItem\[\]\s*=\s*\[[\s\S]*?\];',
    '''const BASELINE_TEACHERS: TeacherListItem[] = [
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
];''',
    text,
    count=1
)

# 2. Reset BASELINE_STUDENTS
text = re.sub(
    r'export const BASELINE_STUDENTS:\s*StudentListItem\[\]\s*=\s*\[[\s\S]*?\];',
    '''export const BASELINE_STUDENTS: StudentListItem[] = [
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
];''',
    text,
    count=1
)

# 3. Reset INITIAL_EXPENSES
text = re.sub(
    r'const INITIAL_EXPENSES:\s*ExpenseItem\[\]\s*=\s*\[[\s\S]*?\];',
    'const INITIAL_EXPENSES: ExpenseItem[] = [];',
    text,
    count=1
)

# 4. Reset INITIAL_INVOICES
text = re.sub(
    r'const INITIAL_INVOICES\s*=\s*\[[\s\S]*?\];',
    'const INITIAL_INVOICES: any[] = [];',
    text,
    count=1
)

# 5. Reset INITIAL_PAYMENTS
text = re.sub(
    r'const INITIAL_PAYMENTS\s*=\s*\[[\s\S]*?\];',
    'const INITIAL_PAYMENTS: any[] = [];',
    text,
    count=1
)

with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCCESS: frontend/src/services/api.ts reset safely")
