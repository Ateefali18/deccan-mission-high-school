with open('frontend/src/pages/admin/TeachersPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isSubmittingCreate },
  } = useForm<TeacherCreateFormData>({"""

replacement1 = """  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors, isSubmitting: isSubmittingCreate },
  } = useForm<TeacherCreateFormData>({"""

target2 = """          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Temporary Password"
              type="password"
              placeholder="At least 6 characters"
              error={createErrors.password?.message}
              required
              {...registerCreate("password")}
            />"""

replacement2 = """          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                  Portal Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const randomPass = "TCH@" + Math.floor(1000 + Math.random() * 9000);
                    setCreateValue("password", randomPass);
                    toast.success(`Generated faculty password: ${randomPass}`);
                  }}
                  className="text-[11px] font-bold text-brand-blue dark:text-dark-accent hover:underline"
                >
                  Auto-Generate
                </button>
              </div>
              <Input
                placeholder="e.g. 1234 or TCH@2026"
                error={createErrors.password?.message}
                required
                {...registerCreate("password")}
              />
            </div>"""

norm_content = content.replace('\r\n', '\n')
norm_target1 = target1.replace('\r\n', '\n')
norm_target2 = target2.replace('\r\n', '\n')

assert norm_target1 in norm_content, "target1 not found"
norm_content = norm_content.replace(norm_target1, replacement1.replace('\r\n', '\n'), 1)

assert norm_target2 in norm_content, "target2 not found"
norm_content = norm_content.replace(norm_target2, replacement2.replace('\r\n', '\n'), 1)

with open('frontend/src/pages/admin/TeachersPage.tsx', 'w', encoding='utf-8') as f:
    f.write(norm_content)

print("Successfully patched TeachersPage.tsx")
