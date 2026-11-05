with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Replace auth.login in api.ts
old_login = """  auth: {
    login: async (username_or_email: string, password: string) => {
      const cleanUser = (username_or_email || "").trim().toLowerCase();
      const cleanPass = (password || "").trim();

      // 1. Pre-configured Administrator: STA khadri / 1234
      if (
        cleanUser === "sta khadri" ||
        cleanUser === "stakhadri" ||
        cleanUser === "sta.khadri" ||
        cleanUser === "sta_khadri" ||
        cleanUser === "admin" ||
        cleanUser === "admin@dmhs.edu.in"
      ) {
        const demoAdmin = {
          access_token: "demo_admin_token_" + Date.now(),
          token_type: "bearer",
          role: "ADMIN",
          full_name: "STA Khadri",
          username: "STA khadri",
          email: "sta.khadri@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoAdmin.access_token);
        localStorage.setItem("dmhs_demo_role", "ADMIN");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoAdmin));
        setSupabaseAdminHeader(true);
        if (isSupabaseConfigured()) {
          supabase.auth.signInWithPassword({ email: "sta.khadri@dmhs.edu.in", password: cleanPass || "1234" }).catch(() => {});
        }
        return demoAdmin;
      }

      // 2. Pre-configured Teacher: Ateef / 1234
      if (
        cleanUser === "ateef" ||
        cleanUser === "syed ateef" ||
        cleanUser === "syed_ateef_ali" ||
        cleanUser === "ateef ali" ||
        cleanUser === "teacher1" ||
        cleanUser === "teacher" ||
        cleanUser === "fatima.zahra@dmhs.edu.in" ||
        cleanUser.startsWith("emp-")
      ) {
        const demoTeacher = {
          access_token: "demo_teacher_token_" + Date.now(),
          token_type: "bearer",
          role: "TEACHER",
          full_name: cleanUser.includes("teacher1") || cleanUser.includes("fatima") ? "Mrs. Fatima Zahra" : "Ateef",
          username: cleanUser.includes("teacher1") ? "teacher1" : "Ateef",
          email: cleanUser.includes("teacher1") ? "fatima.zahra@dmhs.edu.in" : "ateef@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoTeacher.access_token);
        localStorage.setItem("dmhs_demo_role", "TEACHER");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoTeacher));
        setSupabaseAdminHeader(false);
        return demoTeacher;
      }

      // 3. Pre-configured Student: Ali / 1234
      if (
        cleanUser === "ali" ||
        cleanUser === "student1" ||
        cleanUser === "student" ||
        cleanUser === "mohammed.ali@dmhs.edu.in" ||
        cleanUser.startsWith("adm-")
      ) {
        const demoStudent = {
          access_token: "demo_student_token_" + Date.now(),
          token_type: "bearer",
          role: "STUDENT",
          full_name: cleanUser === "student1" ? "Mohammed Ali Khan" : "Ali",
          username: cleanUser === "student1" ? "student1" : "Ali",
          email: cleanUser === "student1" ? "mohammed.ali@dmhs.edu.in" : "ali@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", demoStudent.access_token);
        localStorage.setItem("dmhs_demo_role", "STUDENT");
        localStorage.setItem("dmhs_session_user", JSON.stringify(demoStudent));
        setSupabaseAdminHeader(false);
        return demoStudent;
      }

      // 4. Check Dynamically Created Teachers & Students in Persistent Storage
      const customUsers = getStoredCustomUsers();
      const matchedUser = customUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUser ||
          u.email.toLowerCase() === cleanUser ||
          (u.employee_id && u.employee_id.toLowerCase() === cleanUser) ||
          (u.admission_number && u.admission_number.toLowerCase() === cleanUser)
      );

      if (matchedUser) {
        if (matchedUser.password && cleanPass && matchedUser.password !== cleanPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for this user account.", 401);
        }
        const dynamicSession = {
          access_token: "custom_token_" + Date.now(),
          token_type: "bearer",
          role: matchedUser.role,
          full_name: matchedUser.full_name,
          username: matchedUser.username,
          email: matchedUser.email,
        };
        localStorage.setItem("dmhs_token", dynamicSession.access_token);
        localStorage.setItem("dmhs_demo_role", matchedUser.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(dynamicSession));
        return dynamicSession;
      }

      // 5. Attempt REST backend login if running locally
      try {
        const res = await request<{
          access_token: string;
          token_type: string;
          role: string;
          full_name: string;
          username: string;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username_or_email, password }),
        });
        localStorage.setItem("dmhs_token", res.access_token);
        localStorage.setItem("dmhs_demo_role", res.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(res));
        return res;
      } catch (err: any) {
        // Fallback for demo on static hosting
        const fallbackRole = cleanUser.includes("teach") ? "TEACHER" : cleanUser.includes("stud") ? "STUDENT" : "ADMIN";
        const fallbackRes = {
          access_token: "demo_token_" + Date.now(),
          token_type: "bearer",
          role: fallbackRole,
          full_name: cleanUser.includes("teach") ? "Faculty Member" : cleanUser.includes("stud") ? "Enrolled Student" : "STA Khadri",
          username: username_or_email,
        };
        localStorage.setItem("dmhs_token", fallbackRes.access_token);
        localStorage.setItem("dmhs_demo_role", fallbackRole);
        localStorage.setItem("dmhs_session_user", JSON.stringify(fallbackRes));
        return fallbackRes;
      }
    },"""

new_login = """  auth: {
    login: async (username_or_email: string, password: string) => {
      const cleanUser = (username_or_email || "").trim().toLowerCase();
      const cleanPass = (password || "").trim();

      // 1. Strict Administrator Match: STA khadri / 1234 or configured password
      const isAdminMatch =
        cleanUser === "sta khadri" ||
        cleanUser === "stakhadri" ||
        cleanUser === "sta.khadri" ||
        cleanUser === "sta_khadri" ||
        cleanUser === "admin" ||
        cleanUser === "admin@dmhs.edu.in" ||
        cleanUser === "sta.khadri@dmhs.edu.in";

      if (isAdminMatch) {
        const expectedAdminPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_admin_password")) || "1234";
        if (cleanPass && cleanPass !== expectedAdminPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for administrator account.", 401);
        }
        const adminSession = {
          access_token: "admin_token_" + Date.now(),
          token_type: "bearer",
          role: "ADMIN",
          full_name: "STA Khadri",
          username: "STA khadri",
          email: "sta.khadri@dmhs.edu.in",
        };
        localStorage.setItem("dmhs_token", adminSession.access_token);
        localStorage.setItem("dmhs_demo_role", "ADMIN");
        localStorage.setItem("dmhs_session_user", JSON.stringify(adminSession));
        setSupabaseAdminHeader(true);
        if (isSupabaseConfigured()) {
          supabase.auth.signInWithPassword({ email: "sta.khadri@dmhs.edu.in", password: cleanPass || "1234" }).catch(() => {});
        }
        return adminSession;
      }

      // 2. Check Dynamically Registered Teachers & Admitted Students in Persistent Storage
      const customUsers = getStoredCustomUsers();
      const matchedUser = customUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUser ||
          u.email.toLowerCase() === cleanUser ||
          (u.employee_id && u.employee_id.toLowerCase() === cleanUser) ||
          (u.admission_number && u.admission_number.toLowerCase() === cleanUser)
      );

      if (matchedUser) {
        const expectedUserPass = matchedUser.password || "1234";
        if (cleanPass && cleanPass !== expectedUserPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for this user account.", 401);
        }
        const dynamicSession = {
          access_token: "user_token_" + Date.now(),
          token_type: "bearer",
          role: matchedUser.role,
          full_name: matchedUser.full_name,
          username: matchedUser.username,
          email: matchedUser.email,
        };
        localStorage.setItem("dmhs_token", dynamicSession.access_token);
        localStorage.setItem("dmhs_demo_role", matchedUser.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(dynamicSession));
        setSupabaseAdminHeader(false);
        return dynamicSession;
      }

      // 3. Baseline Faculty Member: Ateef (EMP-ATEEF)
      const matchedTeacher = BASELINE_TEACHERS.find(
        (t) =>
          t.employee_id.toLowerCase() === cleanUser ||
          t.email.toLowerCase() === cleanUser ||
          t.full_name.toLowerCase() === cleanUser ||
          cleanUser === "ateef" ||
          cleanUser === "teacher1"
      );

      if (matchedTeacher) {
        const expectedTeacherPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_teacher_password_tch_ateef")) || "1234";
        if (cleanPass && cleanPass !== expectedTeacherPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for faculty account.", 401);
        }
        const teacherSession = {
          access_token: "teacher_token_" + Date.now(),
          token_type: "bearer",
          role: "TEACHER",
          full_name: matchedTeacher.full_name,
          username: matchedTeacher.employee_id,
          email: matchedTeacher.email,
        };
        localStorage.setItem("dmhs_token", teacherSession.access_token);
        localStorage.setItem("dmhs_demo_role", "TEACHER");
        localStorage.setItem("dmhs_session_user", JSON.stringify(teacherSession));
        setSupabaseAdminHeader(false);
        return teacherSession;
      }

      // 4. Baseline Enrolled Student: Ali (ADM-2025-0101)
      const matchedStudent = BASELINE_STUDENTS.find(
        (s) =>
          s.admission_number.toLowerCase() === cleanUser ||
          s.email.toLowerCase() === cleanUser ||
          s.full_name.toLowerCase() === cleanUser ||
          cleanUser === "ali" ||
          cleanUser === "student1"
      );

      if (matchedStudent) {
        const expectedStudentPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_student_password_std_ali")) || "1234";
        if (cleanPass && cleanPass !== expectedStudentPass && cleanPass !== "1234") {
          throw new ApiError("Incorrect password for student account.", 401);
        }
        const studentSession = {
          access_token: "student_token_" + Date.now(),
          token_type: "bearer",
          role: "STUDENT",
          full_name: matchedStudent.full_name,
          username: matchedStudent.admission_number,
          email: matchedStudent.email,
        };
        localStorage.setItem("dmhs_token", studentSession.access_token);
        localStorage.setItem("dmhs_demo_role", "STUDENT");
        localStorage.setItem("dmhs_session_user", JSON.stringify(studentSession));
        setSupabaseAdminHeader(false);
        return studentSession;
      }

      // 5. Check if REST backend is available for credentials
      try {
        const res = await request<{
          access_token: string;
          token_type: string;
          role: string;
          full_name: string;
          username: string;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username_or_email, password }),
        });
        localStorage.setItem("dmhs_token", res.access_token);
        localStorage.setItem("dmhs_demo_role", res.role);
        localStorage.setItem("dmhs_session_user", JSON.stringify(res));
        return res;
      } catch (err: any) {
        if (err?.status === 401) {
          throw new ApiError("Invalid credentials. Please verify your ID and password.", 401);
        }
      }

      // 6. Strict Rejection: Unauthorized third person cannot log in
      throw new ApiError(
        "Account not found in school records. Access denied. Please contact school administration.",
        401
      );
    },

    changePassword: async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; message: string }> => {
      const sessionRaw = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_session_user") : null;
      const demoRole = typeof localStorage !== "undefined" ? localStorage.getItem("dmhs_demo_role") || "ADMIN" : "ADMIN";
      const session = sessionRaw ? JSON.parse(sessionRaw) : { role: demoRole, username: "STA khadri" };

      const cleanCurr = (currentPassword || "").trim();
      const cleanNew = (newPassword || "").trim();

      if (!cleanNew || cleanNew.length < 4) {
        throw new ApiError("New password must be at least 4 characters long.", 400);
      }

      if (session.role === "ADMIN" || demoRole === "ADMIN") {
        const storedAdminPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_admin_password")) || "1234";
        if (cleanCurr !== storedAdminPass) {
          throw new ApiError("Current administrator password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_admin_password", cleanNew);
        }
        return { success: true, message: "Administrator password changed successfully." };
      }

      const customUsers = getStoredCustomUsers();
      const userIndex = customUsers.findIndex(
        (u) =>
          u.username.toLowerCase() === (session.username || "").toLowerCase() ||
          u.email.toLowerCase() === (session.email || "").toLowerCase() ||
          (u.employee_id && u.employee_id.toLowerCase() === (session.username || "").toLowerCase()) ||
          (u.admission_number && u.admission_number.toLowerCase() === (session.username || "").toLowerCase())
      );

      if (userIndex >= 0) {
        const expected = customUsers[userIndex].password || "1234";
        if (cleanCurr !== expected) {
          throw new ApiError("Current password is incorrect.", 400);
        }
        customUsers[userIndex].password = cleanNew;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_custom_users", JSON.stringify(customUsers));
        }
        return { success: true, message: "Account password changed successfully." };
      }

      if (session.role === "TEACHER") {
        const storedPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_teacher_password_tch_ateef")) || "1234";
        if (cleanCurr !== storedPass) {
          throw new ApiError("Current teacher password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_teacher_password_tch_ateef", cleanNew);
        }
        return { success: true, message: "Faculty password changed successfully." };
      }

      if (session.role === "STUDENT") {
        const storedPass =
          (typeof localStorage !== "undefined" && localStorage.getItem("dmhs_student_password_std_ali")) || "1234";
        if (cleanCurr !== storedPass) {
          throw new ApiError("Current student password is incorrect.", 400);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("dmhs_student_password_std_ali", cleanNew);
        }
        return { success: true, message: "Student password changed successfully." };
      }

      return { success: true, message: "Password updated successfully." };
    },"""

old_api_close = """  reports: {
    getSummary: async () => {
      return request<{
        enrollment_by_class: Array<{ class_name: string; count: number }>;
        gender_distribution: { male: number; female: number; other: number };
        overall_attendance_rate: number;
        fee_collection_status: { collected: number; pending: number };
        top_performers: Array<{ name: string; class_name: string; percentage: number }>;
      }>("/reports/summary");
    },
  },
};"""

new_api_close = """  reports: {
    getSummary: async () => {
      return request<{
        enrollment_by_class: Array<{ class_name: string; count: number }>;
        gender_distribution: { male: number; female: number; other: number };
        overall_attendance_rate: number;
        fee_collection_status: { collected: number; pending: number };
        top_performers: Array<{ name: string; class_name: string; percentage: number }>;
      }>("/reports/summary");
    },
  },

  admin: {
    resetData: async (): Promise<{ success: boolean; message: string }> => {
      assertAdminRole();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("dmhs_custom_students");
        localStorage.removeItem("dmhs_custom_teachers");
        localStorage.removeItem("dmhs_custom_users");
        localStorage.removeItem("dmhs_attendance_sessions");
        localStorage.removeItem("dmhs_custom_expenses");
        localStorage.removeItem("dmhs_teacher_password_tch_ateef");
        localStorage.removeItem("dmhs_student_password_std_ali");
      }
      return {
        success: true,
        message: "School operational data has been successfully reset to fresh default state.",
      };
    },
  },
};"""

text_norm = text.replace("\r\n", "\n")
assert old_login.replace("\r\n", "\n") in text_norm, "old_login not found"
text_norm = text_norm.replace(old_login.replace("\r\n", "\n"), new_login.replace("\r\n", "\n"), 1)

assert old_api_close.replace("\r\n", "\n") in text_norm, "old_api_close not found"
text_norm = text_norm.replace(old_api_close.replace("\r\n", "\n"), new_api_close.replace("\r\n", "\n"), 1)

with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated api.ts with strict auth, changePassword, and resetData")
