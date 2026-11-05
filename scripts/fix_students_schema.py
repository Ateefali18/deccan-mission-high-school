with open("frontend/src/pages/admin/StudentsPage.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace schemas
old_schemas = """const studentCreateSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required").default("1234"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  class_id: z.coerce.number().min(1, "Please select a class"),
  section_id: z.coerce.number().min(1, "Please select a section"),
  academic_year_id: z.coerce.number().min(1, "Please select academic year"),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  roll_number: z.string().optional(),
});

const studentEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  class_id: z.coerce.number().optional(),
  section_id: z.coerce.number().optional(),
  roll_number: z.string().optional(),
  student_status: z.string().default("active"),
});"""

new_schemas = """const studentCreateSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required").default("1234"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  class_id: z.union([z.string().min(1, "Please select a class"), z.number().min(1, "Please select a class")]),
  section_id: z.union([z.string().min(1, "Please select a section"), z.number().min(1, "Please select a section")]),
  academic_year_id: z.union([z.string().min(1, "Please select academic year"), z.number().min(1, "Please select academic year")]),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  roll_number: z.string().optional(),
});

const studentEditSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  address: z.string().optional(),
  class_id: z.union([z.string(), z.number()]).optional(),
  section_id: z.union([z.string(), z.number()]).optional(),
  roll_number: z.string().optional(),
  student_status: z.string().default("active"),
});"""

old_password_field = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial Password"
              type="password"
              placeholder="Default login password (e.g. 1234)"
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex flex-col justify-center p-2 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border">
              <span className="font-semibold text-light-primary dark:text-dark-primary">Student Sign-In Identity</span>
              <span>Student signs in using their <strong>Admission Number</strong> or registered <strong>Email</strong>.</span>
            </div>
          </div>"""

new_password_field = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Login Password (Admin-Generated) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const randomPass = "DMHS@" + Math.floor(1000 + Math.random() * 9000);
                    setValue("password", randomPass);
                    toast.success(`Generated initial password: ${randomPass}`);
                  }}
                  className="text-[11px] font-bold text-brand-blue dark:text-dark-accent hover:underline"
                >
                  Auto-Generate
                </button>
              </div>
              <Input
                placeholder="Initial portal password (e.g. 1234 or DMHS@2026)"
                error={errors.password?.message}
                required
                {...register("password")}
              />
            </div>
            <div className="flex flex-col justify-center p-2.5 rounded-lg bg-brand-blue/5 dark:bg-dark-elevated text-xs text-light-secondary dark:text-dark-secondary border border-brand-blue/20">
              <span className="font-bold text-brand-navy dark:text-brand-gold mb-0.5">Student Login Identity</span>
              <span>Student logs in using their <strong>Admission Number</strong> or registered <strong>Email</strong> with this generated password.</span>
            </div>
          </div>"""

text_norm = text.replace("\r\n", "\n")
assert old_schemas.replace("\r\n", "\n") in text_norm, "old_schemas not found"
text_norm = text_norm.replace(old_schemas.replace("\r\n", "\n"), new_schemas.replace("\r\n", "\n"), 1)

assert old_password_field.replace("\r\n", "\n") in text_norm, "old_password_field not found"
text_norm = text_norm.replace(old_password_field.replace("\r\n", "\n"), new_password_field.replace("\r\n", "\n"), 1)

with open("frontend/src/pages/admin/StudentsPage.tsx", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated StudentsPage.tsx - Image 1 fixed")
