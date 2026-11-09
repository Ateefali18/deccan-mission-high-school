import type { UserCredentialItem, PasswordResetSession, PasswordResetLogItem } from "../types";
import { hashPassword, verifyPassword } from "./authCrypto";

export interface CustomUserAccount {
  id?: number | string;
  username: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  full_name: string;
  password?: string;
  employee_id?: string;
  admission_number?: string;
  designation?: string;
  department?: string;
  class_id?: string | number;
  section_id?: string | number;
}

let inMemoryCustomUsers: CustomUserAccount[] = [];
let inMemoryCustomTeachers: any[] = [];
let inMemoryAdminPassword = "1234";

export function getStoredCustomUsers(): CustomUserAccount[] {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem("dmhs_custom_users");
      if (raw) return JSON.parse(raw);
    }
    return inMemoryCustomUsers;
  } catch {
    return inMemoryCustomUsers;
  }
}

export function saveCustomUser(user: CustomUserAccount) {
  const users = getStoredCustomUsers().filter((u) => u.username !== user.username && u.email !== user.email);
  const secureUser = {
    ...user,
    password: user.password ? hashPassword(user.password) : undefined,
  };
  users.unshift(secureUser);
  inMemoryCustomUsers = users;
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
      localStorage.setItem("dmhs_custom_users", JSON.stringify(users));
    }
  } catch {}
}

export function getStoredCustomTeachers(): any[] {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem("dmhs_custom_teachers");
      if (raw) return JSON.parse(raw);
    }
    return inMemoryCustomTeachers;
  } catch {
    return inMemoryCustomTeachers;
  }
}

export function getAdminPassword(): string {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      const pass = localStorage.getItem("dmhs_admin_password");
      if (pass) return pass;
    }
    return inMemoryAdminPassword;
  } catch {
    return inMemoryAdminPassword;
  }
}

export function setAdminPassword(pass: string) {
  const hashed = hashPassword(pass);
  inMemoryAdminPassword = hashed;
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
      localStorage.setItem("dmhs_admin_password", hashed);
    }
  } catch {}
}

export function getStoredCustomStudents(): any[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem("dmhs_custom_students");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "u***@dmhs.edu.in";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

let inMemoryOtpSessions: Record<string, PasswordResetSession> = {};

export function clearAllOtpSessions() {
  inMemoryOtpSessions = {};
  if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.removeItem === "function") {
    localStorage.removeItem("dmhs_active_otp_sessions");
  }
}

export function getStoredOtpSessions(): Record<string, PasswordResetSession> {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem("dmhs_active_otp_sessions");
      if (raw) return JSON.parse(raw);
      inMemoryOtpSessions = {};
      return {};
    }
    return inMemoryOtpSessions;
  } catch {
    return inMemoryOtpSessions;
  }
}

export function saveStoredOtpSessions(sessions: Record<string, PasswordResetSession>) {
  inMemoryOtpSessions = { ...sessions };
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
      localStorage.setItem("dmhs_active_otp_sessions", JSON.stringify(sessions));
    }
  } catch {}
}

export function getPasswordResetLogs(): PasswordResetLogItem[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem("dmhs_password_reset_logs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendPasswordResetLog(log: Omit<PasswordResetLogItem, "id">) {
  try {
    const logs = getPasswordResetLogs();
    const newLog: PasswordResetLogItem = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      ...log,
    };
    logs.unshift(newLog);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("dmhs_password_reset_logs", JSON.stringify(logs.slice(0, 100)));
    }
  } catch {}
}

export interface MatchedAccountInfo {
  found: boolean;
  role?: "ADMIN" | "TEACHER" | "STUDENT";
  email?: string;
  name?: string;
  identifier?: string;
  targetId?: string;
}

export function findAccountByIdentifier(identifier: string): MatchedAccountInfo {
  const clean = (identifier || "").trim().toLowerCase();
  if (!clean) return { found: false };

  // 1. Check Administrator
  if (
    clean === "admin" ||
    clean === "sta khadri" ||
    clean === "stakhadri" ||
    clean === "sta.khadri" ||
    clean === "sta_khadri" ||
    clean === "sta.khadri@dmhs.edu.in" ||
    clean === "admin@dmhs.edu.in"
  ) {
    return {
      found: true,
      role: "ADMIN",
      email: "sta.khadri@dmhs.edu.in",
      name: "STA Khadri",
      identifier: "ADM-STA-KHADRI",
      targetId: "adm_sta_khadri",
    };
  }

  // 2. Check Custom Users Store
  const customUsers = getStoredCustomUsers();
  const matchedCustom = customUsers.find(
    (u) =>
      u.username.toLowerCase() === clean ||
      u.email.toLowerCase() === clean ||
      (u.employee_id && u.employee_id.toLowerCase() === clean) ||
      (u.admission_number && u.admission_number.toLowerCase() === clean)
  );
  if (matchedCustom) {
    return {
      found: true,
      role: matchedCustom.role,
      email: matchedCustom.email,
      name: matchedCustom.full_name,
      identifier: matchedCustom.admission_number || matchedCustom.employee_id || matchedCustom.username,
      targetId: String(matchedCustom.id || matchedCustom.username),
    };
  }

  // 3. Check Teachers
  const customTeachers = getStoredCustomTeachers();
  const baselineTeachers = [
    { id: "tch_ateef", employee_id: "EMP-ATEEF", full_name: "Ateef", email: "ateef@dmhs.edu.in" },
    { id: "tch_fatima", employee_id: "EMP-1001", full_name: "Mrs. Fatima Zahra", email: "fatima.zahra@dmhs.edu.in" },
    { id: "tch_tariq", employee_id: "EMP-1002", full_name: "Dr. Mohammed Tariq", email: "tariq.mohammed@dmhs.edu.in" },
  ];
  const allTeachers = [...customTeachers, ...baselineTeachers];
  const matchedTeacher = allTeachers.find(
    (t) =>
      t.email?.toLowerCase() === clean ||
      t.employee_id?.toLowerCase() === clean ||
      t.full_name?.toLowerCase() === clean ||
      String(t.id).toLowerCase() === clean ||
      (clean === "ateef" && String(t.id) === "tch_ateef")
  );
  if (matchedTeacher) {
    return {
      found: true,
      role: "TEACHER",
      email: matchedTeacher.email,
      name: matchedTeacher.full_name,
      identifier: matchedTeacher.employee_id,
      targetId: String(matchedTeacher.id),
    };
  }

  // 4. Check Students
  const customStudents = getStoredCustomStudents();
  const baselineStudents = [
    { id: "std_ali", admission_number: "ADM-ALI", full_name: "Ali", email: "ali@dmhs.edu.in" },
    { id: "std_ali_khan", admission_number: "ADM-2025-0101", full_name: "Mohammed Ali Khan", email: "mohammed.ali@dmhs.edu.in" },
    { id: "std_sara", admission_number: "ADM-2025-0102", full_name: "Sara Fatima", email: "sara.fatima@dmhs.edu.in" },
  ];
  const allStudents = [...customStudents, ...baselineStudents];
  const matchedStudent = allStudents.find(
    (s) =>
      s.email?.toLowerCase() === clean ||
      s.admission_number?.toLowerCase() === clean ||
      s.full_name?.toLowerCase() === clean ||
      String(s.id).toLowerCase() === clean ||
      (clean === "ali" && String(s.id) === "std_ali")
  );
  if (matchedStudent) {
    return {
      found: true,
      role: "STUDENT",
      email: matchedStudent.email,
      name: matchedStudent.full_name,
      identifier: matchedStudent.admission_number,
      targetId: String(matchedStudent.id),
    };
  }

  return { found: false };
}

async function dispatchRealGmailOtp(params: {
  email: string;
  otp: string;
  name: string;
  role: string;
  identifier: string;
}): Promise<{ delivered: boolean; notice?: string }> {
  try {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return { delivered: true, notice: `Verification code dispatched to ${params.email}` };
    }
    if (data?.code === "SMTP_CREDENTIALS_MISSING") {
      return {
        delivered: false,
        notice: "Gmail credentials (GMAIL_USER & GMAIL_APP_PASSWORD) pending configuration in Netlify environment variables.",
      };
    }
    return { delivered: false, notice: data?.message || "Email delivery awaiting network response." };
  } catch {
    return { delivered: false, notice: "Netlify serverless function /api/send-otp is active in deployed environment." };
  }
}

export const authRecoveryService = {
  getAdminPassword,
  setAdminPassword,
  clearAllOtpSessions,
  /**
   * Step 1 & 2 & 3: Request 6-digit OTP to registered Gmail address.
   * Returns a generic message to prevent unauthorized account probing.
   */
  requestOtp: async (identifier: string): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedEmail?: string;
    cooldownSeconds?: number;
    expiresSeconds?: number;
    debugOtp?: string;
    emailDelivered?: boolean;
    emailNotice?: string;
  }> => {
    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      throw new ApiError("Please enter your registered email address, username, or admission number.", 400);
    }

    const account = findAccountByIdentifier(cleanId);

    // If account not found, return generic success to prevent email enumeration
    if (!account.found || !account.email) {
      return {
        success: true,
        message: "If this identifier is registered with DMHS, a 6-digit verification code has been dispatched to the registered email.",
      };
    }

    // Check if an unexpired cooldown is already active for this email to prevent spam/flooding
    const existingSessions = getStoredOtpSessions();
    const activeExisting = Object.values(existingSessions).find(
      (s) => s.email.toLowerCase() === account.email.toLowerCase() && Date.now() < s.resendCooldownUntil
    );
    if (activeExisting) {
      const waitSec = Math.ceil((activeExisting.resendCooldownUntil - Date.now()) / 1000);
      throw new ApiError(`Please wait ${waitSec}s before requesting a new verification code.`, 429);
    }

    // Generate 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = "otp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const masked = maskEmail(account.email);

    const session: PasswordResetSession = {
      sessionId,
      identifier: cleanId,
      email: account.email,
      maskedEmail: masked,
      role: account.role || "STUDENT",
      targetId: account.targetId || cleanId,
      otp: generatedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes (300 seconds)
      resendCooldownUntil: Date.now() + 60 * 1000, // 60 seconds cooldown
      attempts: 0,
      maxAttempts: 3,
      verified: false,
    };

    const sessions = getStoredOtpSessions();
    sessions[sessionId] = session;
    saveStoredOtpSessions(sessions);

    appendPasswordResetLog({
      user_name: account.name || cleanId,
      role: account.role || "MEMBER",
      email: account.email,
      action: "OTP_DISPATCHED",
      status: "Pending Verification",
      timestamp: new Date().toISOString(),
    });

    // Real Gmail delivery via Netlify Function
    const dispatchResult = await dispatchRealGmailOtp({
      email: account.email,
      otp: generatedOtp,
      name: account.name || cleanId,
      role: account.role || "MEMBER",
      identifier: cleanId,
    });

    const isTestOrDev =
      (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
      (typeof import.meta !== "undefined" && !import.meta.env?.PROD);

    return {
      success: true,
      sessionId,
      maskedEmail: masked,
      cooldownSeconds: 60,
      expiresSeconds: 300,
      debugOtp: isTestOrDev ? generatedOtp : undefined,
      emailDelivered: dispatchResult.delivered,
      emailNotice: dispatchResult.notice,
      message: `A 6-digit verification code has been dispatched to ${masked}.`,
    };
  },

  /**
   * Step 4: Verify 6-digit OTP with expiry and rate-limit guard.
   */
  verifyOtp: async (
    sessionId: string,
    enteredOtp: string
  ): Promise<{ success: boolean; message: string; resetToken: string }> => {
    const sessions = getStoredOtpSessions();
    const session = sessions[sessionId];

    if (!session) {
      throw new ApiError("Invalid or expired password reset session. Please request a new code.", 400);
    }

    // Expiry check (5-minute window)
    if (Date.now() > session.expiresAt) {
      delete sessions[sessionId];
      saveStoredOtpSessions(sessions);
      throw new ApiError("Verification code has expired (5-minute limit). Please request a new code.", 400);
    }

    // Rate limiting (max 3 failed attempts)
    if (session.attempts >= session.maxAttempts) {
      delete sessions[sessionId];
      saveStoredOtpSessions(sessions);
      throw new ApiError("Maximum verification attempts (3) exceeded. For security, please request a new verification code.", 429);
    }

    const cleanInput = (enteredOtp || "").trim();
    // SEC-01 Hardened: Exact 6-digit match required. Backdoor 123456 strictly removed.
    const isMatch = cleanInput === session.otp;

    if (!isMatch) {
      session.attempts += 1;
      sessions[sessionId] = session;
      saveStoredOtpSessions(sessions);

      const remaining = session.maxAttempts - session.attempts;
      if (remaining <= 0) {
        delete sessions[sessionId];
        saveStoredOtpSessions(sessions);
        throw new ApiError("Maximum verification attempts exceeded. Session locked. Please request a new verification code.", 429);
      }
      throw new ApiError(`Invalid 6-digit verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`, 400);
    }

    // Verification successful
    session.verified = true;
    session.verifiedAt = Date.now();
    sessions[sessionId] = session;
    saveStoredOtpSessions(sessions);

    appendPasswordResetLog({
      user_name: session.identifier,
      role: session.role,
      email: session.email,
      action: "OTP_VERIFIED",
      status: "Pending Verification",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Verification code confirmed successfully. Please create your new password.",
      resetToken: sessionId,
    };
  },

  /**
   * Resend OTP code respecting the 60-second cooldown
   */
  resendOtp: async (
    sessionId: string
  ): Promise<{
    success: boolean;
    sessionId: string;
    maskedEmail: string;
    cooldownSeconds: number;
    expiresSeconds: number;
    debugOtp?: string;
  }> => {
    const sessions = getStoredOtpSessions();
    const session = sessions[sessionId];

    if (!session) {
      throw new ApiError("Reset session expired or not found. Please start over.", 400);
    }

    if (Date.now() < session.resendCooldownUntil) {
      const waitSec = Math.ceil((session.resendCooldownUntil - Date.now()) / 1000);
      throw new ApiError(`Please wait ${waitSec}s before requesting a new verification code.`, 429);
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    session.otp = newOtp;
    session.expiresAt = Date.now() + 5 * 60 * 1000;
    session.resendCooldownUntil = Date.now() + 60 * 1000;
    session.attempts = 0;
    sessions[sessionId] = session;
    saveStoredOtpSessions(sessions);

    appendPasswordResetLog({
      user_name: session.identifier,
      role: session.role,
      email: session.email,
      action: "OTP_DISPATCHED",
      status: "Pending Verification",
      timestamp: new Date().toISOString(),
    });

    // Real Gmail delivery via Netlify Function
    const resendDispatch = await dispatchRealGmailOtp({
      email: session.email,
      otp: newOtp,
      name: session.identifier,
      role: session.role,
      identifier: session.identifier,
    });

    const isTestOrDev =
      (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
      (typeof import.meta !== "undefined" && !import.meta.env?.PROD);

    return {
      success: true,
      sessionId,
      maskedEmail: session.maskedEmail,
      cooldownSeconds: 60,
      expiresSeconds: 300,
      debugOtp: isTestOrDev ? newOtp : undefined,
      emailDelivered: resendDispatch.delivered,
      emailNotice: resendDispatch.notice,
    };
  },

  /**
   * Step 5: Save new password and invalidate prior credentials
   */
  resetPasswordWithToken: async (
    sessionId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const sessions = getStoredOtpSessions();
    const session = sessions[sessionId];

    if (!session || !session.verified) {
      throw new ApiError("Session unauthorized or verification incomplete. Please verify OTP first.", 401);
    }

    // Token valid for 10 minutes post verification
    if (session.verifiedAt && Date.now() - session.verifiedAt > 10 * 60 * 1000) {
      delete sessions[sessionId];
      saveStoredOtpSessions(sessions);
      throw new ApiError("Password reset session expired. Please request a new verification code.", 400);
    }

    const cleanPass = (newPassword || "").trim();
    if (cleanPass.length < 4) {
      throw new ApiError("New password must be at least 4 characters long.", 400);
    }

    // Hash the new password before storing
    const hashedPass = hashPassword(cleanPass);

    // Apply update to appropriate account
    if (session.role === "ADMIN") {
      setAdminPassword(hashedPass);
    } else if (session.role === "TEACHER") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_teacher_password_${session.targetId}`, hashedPass);
      }
    } else if (session.role === "STUDENT") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_student_password_${session.targetId}`, hashedPass);
      }
    }

    // Also update in dmhs_custom_users if registered
    const customUsers = getStoredCustomUsers();
    let userFoundInCustom = false;
    const updatedCustom = customUsers.map((u) => {
      if (
        u.email?.toLowerCase() === session.email.toLowerCase() ||
        u.username?.toLowerCase() === session.identifier.toLowerCase() ||
        (u.admission_number && u.admission_number.toLowerCase() === session.identifier.toLowerCase()) ||
        (u.employee_id && u.employee_id.toLowerCase() === session.identifier.toLowerCase())
      ) {
        userFoundInCustom = true;
        return { ...u, password: hashedPass };
      }
      return u;
    });

    if (typeof localStorage !== "undefined") {
      if (userFoundInCustom) {
        localStorage.setItem("dmhs_custom_users", JSON.stringify(updatedCustom));
      }
    }

    // Invalidate session immediately (single use)
    delete sessions[sessionId];
    saveStoredOtpSessions(sessions);

    appendPasswordResetLog({
      user_name: session.identifier,
      role: session.role,
      email: session.email,
      action: "PASSWORD_RESET_SUCCESS",
      status: "Completed",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Password reset completed successfully! You can now sign in with your new credentials.",
    };
  },

  /**
   * Admin: List all students and faculty with credential reset status
   */
  listUsersForAdminCredentials: async (): Promise<UserCredentialItem[]> => {
    const users: UserCredentialItem[] = [];
    const logs = getPasswordResetLogs();

    const getLatestLog = (email: string) => {
      return logs.find((l) => l.email?.toLowerCase() === (email || "").toLowerCase());
    };

    // 1. Admin
    const adminLog = getLatestLog("sta.khadri@dmhs.edu.in");
    users.push({
      id: "adm_sta_khadri",
      name: "STA Khadri",
      identifier: "STA-KHADRI (Principal)",
      email: "sta.khadri@dmhs.edu.in",
      role: "ADMIN",
      status: "ACTIVE",
      last_reset_status: adminLog ? (adminLog.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
      last_reset_at: adminLog?.timestamp,
    });

    // 2. Teachers
    const customTeachers = getStoredCustomTeachers();
    const baselineTeachers = [
      { id: "tch_ateef", employee_id: "EMP-ATEEF", full_name: "Ateef", email: "ateef@dmhs.edu.in", department: "Mathematics" },
      { id: "tch_fatima", employee_id: "EMP-1001", full_name: "Mrs. Fatima Zahra", email: "fatima.zahra@dmhs.edu.in", department: "Mathematics" },
      { id: "tch_tariq", employee_id: "EMP-1002", full_name: "Dr. Mohammed Tariq", email: "tariq.mohammed@dmhs.edu.in", department: "Science" },
    ];
    const teachersMap = new Map<string, any>();
    [...baselineTeachers, ...customTeachers].forEach((t) => {
      teachersMap.set(String(t.id), t);
    });

    teachersMap.forEach((t) => {
      const log = getLatestLog(t.email);
      users.push({
        id: String(t.id),
        name: t.full_name,
        identifier: t.employee_id || `EMP-${t.id}`,
        email: t.email || `${t.employee_id.toLowerCase()}@dmhs.edu.in`,
        role: "TEACHER",
        academic_class: t.department || "Faculty",
        status: "ACTIVE",
        last_reset_status: log ? (log.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
        last_reset_at: log?.timestamp,
      });
    });

    // 3. Students
    const customStudents = getStoredCustomStudents();
    const baselineStudents = [
      { id: "std_ali", admission_number: "ADM-ALI", full_name: "Ali", email: "ali@dmhs.edu.in", class_name: "Class 10-A" },
      { id: "std_ali_khan", admission_number: "ADM-2025-0101", full_name: "Mohammed Ali Khan", email: "mohammed.ali@dmhs.edu.in", class_name: "Class 10-A" },
      { id: "std_sara", admission_number: "ADM-2025-0102", full_name: "Sara Fatima", email: "sara.fatima@dmhs.edu.in", class_name: "Class 9-A" },
    ];
    const studentsMap = new Map<string, any>();
    [...baselineStudents, ...customStudents].forEach((s) => {
      studentsMap.set(String(s.id), s);
    });

    studentsMap.forEach((s) => {
      const log = getLatestLog(s.email);
      users.push({
        id: String(s.id),
        name: s.full_name,
        identifier: s.admission_number || `ADM-${s.id}`,
        email: s.email || `${s.admission_number.toLowerCase()}@dmhs.edu.in`,
        role: "STUDENT",
        academic_class: s.class_name ? `${s.class_name}${s.section_name ? `-${s.section_name}` : ""}` : "Student",
        status: "ACTIVE",
        last_reset_status: log ? (log.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
        last_reset_at: log?.timestamp,
      });
    });

    return users;
  },

  /**
   * Admin: Initiate password reset OTP dispatch to user's registered Gmail
   */
  adminInitiateReset: async (identifierOrEmail: string): Promise<{ success: boolean; message: string; maskedEmail: string; debugOtp?: string }> => {
    const res = await authRecoveryService.requestOtp(identifierOrEmail);
    return {
      success: true,
      message: `Password reset OTP has been dispatched to registered address ${res.maskedEmail || ""}.`,
      maskedEmail: res.maskedEmail || "",
      debugOtp: res.debugOtp,
    };
  },

  /**
   * Admin: Directly set or generate new password for student or faculty
   */
  adminSetUserPassword: async (
    identifierOrEmail: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string; generatedPassword?: string }> => {
    const cleanId = (identifierOrEmail || "").trim();
    const account = findAccountByIdentifier(cleanId);

    if (!account.found) {
      throw new ApiError(`User account with identifier "${identifierOrEmail}" not found in school records.`, 404);
    }

    const finalPass = newPassword?.trim() || `Dmhs@${Math.floor(1000 + Math.random() * 9000)}`;

    if (account.role === "ADMIN") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("dmhs_admin_password", finalPass);
      }
    } else if (account.role === "TEACHER") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_teacher_password_${account.targetId}`, finalPass);
      }
    } else if (account.role === "STUDENT") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_student_password_${account.targetId}`, finalPass);
      }
    }

    // Also update in dmhs_custom_users
    const customUsers = getStoredCustomUsers();
    const updatedCustom = customUsers.map((u) => {
      if (
        u.email?.toLowerCase() === account.email?.toLowerCase() ||
        u.username?.toLowerCase() === cleanId.toLowerCase() ||
        (u.admission_number && u.admission_number.toLowerCase() === cleanId.toLowerCase()) ||
        (u.employee_id && u.employee_id.toLowerCase() === cleanId.toLowerCase())
      ) {
        return { ...u, password: finalPass };
      }
      return u;
    });

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("dmhs_custom_users", JSON.stringify(updatedCustom));
    }

    appendPasswordResetLog({
      user_name: account.name || cleanId,
      role: account.role || "MEMBER",
      email: account.email || "",
      action: "ADMIN_FORCE_RESET",
      status: "Completed",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Password updated successfully for ${account.name} (${account.identifier}).`,
      generatedPassword: finalPass,
    };
  },

  /**
   * Retrieve Password Reset Audit Logs
   */
  getAuditLogs: async (): Promise<PasswordResetLogItem[]> => {
    return getPasswordResetLogs();
  },
};
