with open("frontend/src/pages/auth/LoginPage.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update Input label & placeholder
old_input = """              <Input
                label="Username, Email or Admission No."
                placeholder="e.g. STA khadri, Ateef, Ali, or EMP/ADM ID"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.username_or_email?.message}
                {...register("username_or_email")}
                disabled={isSubmitting}
              />"""

new_input = """              <Input
                label="School Email, Admission Number or Employee ID"
                placeholder="e.g. ADM-2026-001, EMP-101, or name@dmhs.edu.in"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.username_or_email?.message}
                {...register("username_or_email")}
                disabled={isSubmitting}
              />"""

# 2. Remove the 1-Click Role Access section completely
old_quick_access = """          {/* Quick-Access Role Buttons */}
          <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                1-Click Role Access
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue font-bold">
                TEST CREDENTIALS
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  setDevAccount("STA khadri", "1234");
                  try {
                    const s = await login("STA khadri", "1234");
                    handleSuccessfulAuth(s);
                  } catch (e) {}
                }}
                className="p-2.5 rounded-xl text-center bg-brand-pale/50 dark:bg-dark-elevated hover:border-brand-blue border border-brand-blue/30 transition-all hover:scale-[1.02] shadow-sm"
              >
                <span className="text-xs font-bold block text-brand-navy dark:text-white">Admin</span>
                <span className="text-[10px] text-brand-blue dark:text-dark-accent block">STA khadri</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDevAccount("Ateef", "1234");
                  try {
                    const s = await login("Ateef", "1234");
                    handleSuccessfulAuth(s);
                  } catch (e) {}
                }}
                className="p-2.5 rounded-xl text-center bg-brand-pale/50 dark:bg-dark-elevated hover:border-brand-blue border border-brand-blue/30 transition-all hover:scale-[1.02] shadow-sm"
              >
                <span className="text-xs font-bold block text-brand-navy dark:text-white">Teacher</span>
                <span className="text-[10px] text-brand-blue dark:text-dark-accent block">Ateef</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDevAccount("Ali", "1234");
                  try {
                    const s = await login("Ali", "1234");
                    handleSuccessfulAuth(s);
                  } catch (e) {}
                }}
                className="p-2.5 rounded-xl text-center bg-brand-pale/50 dark:bg-dark-elevated hover:border-brand-blue border border-brand-blue/30 transition-all hover:scale-[1.02] shadow-sm"
              >
                <span className="text-xs font-bold block text-brand-navy dark:text-white">Student</span>
                <span className="text-[10px] text-brand-blue dark:text-dark-accent block">Ali</span>
              </button>
            </div>
            <p className="text-[11px] text-center text-light-secondary dark:text-dark-secondary mt-3">
              Admin can register new teachers and admit students, who can immediately log in with their credentials.
            </p>
          </div>"""

new_quick_access = """          {/* Institutional Access Notice */}
          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border text-center">
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              Authorized students, faculty, and administrative staff only.
            </p>
            <p className="text-[11px] text-light-muted dark:text-dark-muted mt-1">
              For initial login credentials or password resets, contact the school administrative office.
            </p>
          </div>"""

text_norm = text.replace("\r\n", "\n")
assert old_input.replace("\r\n", "\n") in text_norm, "old_input not found"
text_norm = text_norm.replace(old_input.replace("\r\n", "\n"), new_input.replace("\r\n", "\n"), 1)

assert old_quick_access.replace("\r\n", "\n") in text_norm, "old_quick_access not found"
text_norm = text_norm.replace(old_quick_access.replace("\r\n", "\n"), new_quick_access.replace("\r\n", "\n"), 1)

with open("frontend/src/pages/auth/LoginPage.tsx", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated LoginPage.tsx - single tap login removed and input cleaned")
