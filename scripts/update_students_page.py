with open("frontend/src/pages/admin/StudentsPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update schema
old_schema = """const studentCreateSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required").default("1234"),"""

new_schema = """const studentCreateSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required").default("1234"),"""

# 2. Update onRegisterStudent with duplicate check
old_register = """  // Create Student
  const onRegisterStudent = async (data: StudentCreateFormData) => {
    try {
      const payload = {
        ...data,
        username: data.username || data.email.split("@")[0],
      };
      await api.students.create(payload);
      toast.success(`Student ${data.full_name} admitted successfully!`);
      setIsRegisterOpen(false);
      reset();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to admit student");
    }
  };"""

new_register = """  // Create Student
  const onRegisterStudent = async (data: StudentCreateFormData) => {
    try {
      // Validate duplicate admission number and email
      const existingAdm = students.find(
        (s) => s.admission_number?.trim().toLowerCase() === data.admission_number.trim().toLowerCase()
      );
      if (existingAdm) {
        toast.error(`Admission number "${data.admission_number}" is already assigned to ${existingAdm.full_name}.`);
        return;
      }
      const existingEmail = students.find(
        (s) => s.email && s.email.trim().toLowerCase() === data.email.trim().toLowerCase()
      );
      if (existingEmail) {
        toast.error(`Email "${data.email}" is already registered to ${existingEmail.full_name}.`);
        return;
      }

      const payload = {
        ...data,
        username: data.admission_number,
      };
      await api.students.create(payload);
      toast.success(`Student ${data.full_name} admitted successfully! Admission No: ${data.admission_number}`);
      setIsRegisterOpen(false);
      reset();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Failed to admit student");
    }
  };"""

# 3. Update form UI: remove username input
old_input = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Login Username (Optional)"
              placeholder="e.g. Ali (portal sign-in username)"
              error={errors.username?.message}
              {...register("username")}
            />
            <Input
              label="Login Password"
              type="password"
              placeholder="e.g. 1234"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>"""

new_input = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

content_norm = content.replace("\r\n", "\n")
assert old_schema.replace("\r\n", "\n") in content_norm, "old_schema not found"
content_norm = content_norm.replace(old_schema.replace("\r\n", "\n"), new_schema.replace("\r\n", "\n"), 1)

assert old_register.replace("\r\n", "\n") in content_norm, "old_register not found"
content_norm = content_norm.replace(old_register.replace("\r\n", "\n"), new_register.replace("\r\n", "\n"), 1)

assert old_input.replace("\r\n", "\n") in content_norm, "old_input not found"
content_norm = content_norm.replace(old_input.replace("\r\n", "\n"), new_input.replace("\r\n", "\n"), 1)

with open("frontend/src/pages/admin/StudentsPage.tsx", "w", encoding="utf-8") as f:
    f.write(content_norm)

print("SUCCESS: updated StudentsPage.tsx - username field completely removed")
