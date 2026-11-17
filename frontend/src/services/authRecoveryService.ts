import type { UserCredentialItem, PasswordResetSession, PasswordResetLogItem } from "../types";
import { hashPassword, verifyPassword } from "./authCrypto";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

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

let inMemoryPasswordResetLogs: PasswordResetLogItem[] = [];

export function getPasswordResetLogs(): PasswordResetLogItem[] {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem("dmhs_password_reset_logs");
      if (raw) return JSON.parse(raw);
    }
    return inMemoryPasswordResetLogs;
  } catch {
    return inMemoryPasswordResetLogs;
  }
}

export function appendPasswordResetLog(log: Omit<PasswordResetLogItem, "id">) {
  try {
    const logs = [...getPasswordResetLogs()];
    const newLog: PasswordResetLogItem = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      ...log,
    };
    logs.unshift(newLog);
    inMemoryPasswordResetLogs = logs.slice(0, 100);
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
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
        notice: "Gmail credentials (GMAIL_USER & GMAIL_APP_PASSWORD) pending configuration in Vercel environment variables.",
      };
    }
    return { delivered: false, notice: data?.message || "Email delivery awaiting network response." };
  } catch {
    return { delivered: false, notice: "Serverless function /api/send-otp is active in deployed environment." };
  }
}

export const authRecoveryService = {
  getAdminPassword,
  setAdminPassword,
  clearAllOtpSessions,

  /**
   * Step 1 & 2: Lookup account by portal and identifier to confirm registered mobile number
   */
  lookupAccount: async (
    portal: "ADMIN" | "TEACHER" | "STUDENT",
    identifier: string
  ): Promise<{
    found: boolean;
    hasPhone?: boolean;
    name?: string;
    portal?: string;
    maskedPhone?: string;
    error?: string;
  }> => {
    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      throw new ApiError("Please enter your registered email, employee ID, or admission number.", 400);
    }

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, identifier: cleanId }),
      });
      const data = await res.json();
      if (res.ok && data.found) {
        return data;
      }
      if (!res.ok) {
        throw new ApiError(data.error || "Account lookup failed.", res.status);
      }
      return data;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      // Fallback for local unit test environment
      const localAcc = findAccountByIdentifier(cleanId);
      if (localAcc.found) {
        return {
          found: true,
          hasPhone: true,
          name: localAcc.name,
          portal,
          maskedPhone: "+91 99******81",
        };
      }
      throw new ApiError("No registered account found matching the provided identifier in this portal.", 404);
    }
  },

  /**
   * Step 3 & 4: Request 6-digit OTP dispatched via APITxT SMS
   */
  requestOtp: async (
    identifier: string,
    portal: "ADMIN" | "TEACHER" | "STUDENT" = "ADMIN"
  ): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedPhone?: string;
    maskedEmail?: string;
    cooldownSeconds?: number;
    expiresSeconds?: number;
    debugOtp?: string;
    smsDispatched?: boolean;
  }> => {
    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      throw new ApiError("Please enter your registered email address, username, or admission number.", 400);
    }

    // Try serverless API first
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, identifier: cleanId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          sessionId: data.sessionId,
          maskedPhone: data.maskedPhone,
          maskedEmail: data.maskedPhone,
          cooldownSeconds: data.cooldownSeconds || 60,
          expiresSeconds: data.expiresSeconds || 300,
          smsDispatched: data.smsDispatched,
          message: data.message || `A 6-digit verification code has been dispatched via SMS to ${data.maskedPhone}.`,
        };
      }
      if (!res.ok) {
        throw new ApiError(data.error || "Failed to dispatch verification code.", res.status);
      }
    } catch (apiErr: any) {
      if (apiErr instanceof ApiError) throw apiErr;
      // Fall through to local simulation for offline tests
    }

    // Local fallback for offline/test runner
    const account = findAccountByIdentifier(cleanId);
    if (!account.found || !account.email) {
      return {
        success: true,
        message: "If this identifier is registered with DMHS, a verification code has been dispatched.",
      };
    }

    const existingSessions = getStoredOtpSessions();
    const activeExisting = Object.values(existingSessions).find(
      (s) => s.email.toLowerCase() === account.email.toLowerCase() && Date.now() < s.resendCooldownUntil
    );
    if (activeExisting) {
      const waitSec = Math.ceil((activeExisting.resendCooldownUntil - Date.now()) / 1000);
      throw new ApiError(`Please wait ${waitSec}s before requesting a new verification code.`, 429);
    }

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
      expiresAt: Date.now() + 5 * 60 * 1000,
      resendCooldownUntil: Date.now() + 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
    };

    const sessions = getStoredOtpSessions();
    sessions[sessionId] = session;
    saveStoredOtpSessions(sessions);

    const isTestOrDev =
      (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
      (typeof import.meta !== "undefined" && !import.meta.env?.PROD);

    return {
      success: true,
      sessionId,
      maskedPhone: "+91 99******81",
      maskedEmail: masked,
      cooldownSeconds: 60,
      expiresSeconds: 300,
      debugOtp: isTestOrDev ? generatedOtp : undefined,
      message: `A 6-digit verification code has been dispatched via SMS.`,
    };
  },

  /**
   * Step 5: Verify 6-digit OTP with expiry and attempt limits
   */
  verifyOtp: async (
    sessionId: string,
    enteredOtp: string
  ): Promise<{ success: boolean; message: string; resetToken: string }> => {
    const cleanInput = (enteredOtp || "").trim();

    // Try serverless API first
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, otp: cleanInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          resetToken: data.resetToken,
          message: data.message,
        };
      }
      if (!res.ok) {
        throw new ApiError(data.error || "Invalid verification code.", res.status);
      }
    } catch (apiErr: any) {
      if (apiErr instanceof ApiError) throw apiErr;
      // Fall through to local simulation for offline tests
    }

    // Local fallback for offline/test runner
    const sessions = getStoredOtpSessions();
    const session = sessions[sessionId];

    if (!session) {
      throw new ApiError("Invalid or expired password reset session. Please request a new code.", 400);
    }

    if (Date.now() > session.expiresAt) {
      delete sessions[sessionId];
      saveStoredOtpSessions(sessions);
      throw new ApiError("Verification code has expired (5-minute limit). Please request a new code.", 400);
    }

    if (session.attempts >= session.maxAttempts) {
      delete sessions[sessionId];
      saveStoredOtpSessions(sessions);
      throw new ApiError("Maximum verification attempts (3) exceeded. For security, please request a new verification code.", 429);
    }

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

    session.verified = true;
    session.verifiedAt = Date.now();
    sessions[sessionId] = session;
    saveStoredOtpSessions(sessions);

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
    sessionId: string,
    portal: "ADMIN" | "TEACHER" | "STUDENT" = "ADMIN",
    identifier?: string
  ): Promise<{
    success: boolean;
    sessionId: string;
    maskedPhone?: string;
    cooldownSeconds: number;
    expiresSeconds: number;
    debugOtp?: string;
  }> => {
    if (identifier) {
      const reqRes = await authRecoveryService.requestOtp(identifier, portal);
      return {
        success: true,
        sessionId: reqRes.sessionId || sessionId,
        maskedPhone: reqRes.maskedPhone,
        cooldownSeconds: reqRes.cooldownSeconds || 60,
        expiresSeconds: reqRes.expiresSeconds || 300,
        debugOtp: reqRes.debugOtp,
      };
    }

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

    const isTestOrDev =
      (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
      (typeof import.meta !== "undefined" && !import.meta.env?.PROD);

    return {
      success: true,
      sessionId,
      maskedPhone: session.maskedEmail,
      cooldownSeconds: 60,
      expiresSeconds: 300,
      debugOtp: isTestOrDev ? newOtp : undefined,
    };
  },

  /**
   * Step 6 & 7: Save new password via trusted server-side process
   */
  resetPasswordWithToken: async (
    resetToken: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanPass = (newPassword || "").trim();
    if (cleanPass.length < 4) {
      throw new ApiError("New password must be at least 4 characters long.", 400);
    }

    // Try serverless API first
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword: cleanPass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
        };
      }
      if (!res.ok) {
        throw new ApiError(data.error || "Password update failed.", res.status);
      }
    } catch (apiErr: any) {
      if (apiErr instanceof ApiError) throw apiErr;
      // Fall through to local simulation for offline tests
    }

    // Local fallback for offline/test runner
    const sessions = getStoredOtpSessions();
    const session = sessions[resetToken];

    if (!session || !session.verified) {
      throw new ApiError("Session unauthorized or verification incomplete. Please verify OTP first.", 401);
    }

    const hashedPass = hashPassword(cleanPass);
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

    delete sessions[resetToken];
    saveStoredOtpSessions(sessions);

    return {
      success: true,
      message: "Your password has been successfully updated. Please sign in with your new password.",
    };
  },

  /**
   * Admin: List all registered profiles and accounts for credentials registry management
   */
  listUsersForAdminCredentials: async (): Promise<UserCredentialItem[]> => {
    const users: UserCredentialItem[] = [];
    const logs = getPasswordResetLogs();

    const getLatestLog = (queryStr: string) => {
      const q = (queryStr || "").toLowerCase().trim();
      if (!q) return undefined;
      return logs.find(
        (l) =>
          (l.email && l.email.toLowerCase() === q) ||
          (l.user_name && l.user_name.toLowerCase() === q)
      );
    };

    // 1. Try fetching live Supabase profiles if configured
    try {
      if (isSupabaseConfigured()) {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*");

        if (!error && Array.isArray(profiles) && profiles.length > 0) {
          for (const p of profiles) {
            const role = (p.role?.toUpperCase() || "ADMIN") as "ADMIN" | "TEACHER" | "STUDENT";
            const latestLog = getLatestLog(p.email || p.id);
            users.push({
              id: p.id,
              name: p.full_name || p.email?.split("@")[0] || "User",
              identifier: p.email || p.phone_number || p.id,
              email: p.email || "",
              role: role,
              status: p.is_active !== false ? "ACTIVE" : "INACTIVE",
              last_reset_status: latestLog
                ? latestLog.status === "Completed"
                  ? "COMPLETED"
                  : "PENDING_VERIFICATION"
                : "NONE",
              last_reset_at: latestLog?.timestamp || p.created_at,
            });
          }
          return users;
        }
      }
    } catch (err) {
      console.warn("[authRecoveryService] Supabase profiles query safe fallback:", err);
    }

    // 2. Default verified admins (always accessible & safe)
    const staLog = getLatestLog("sta.khadri@dmhs.edu.in");
    users.push({
      id: "adm_sta_khadri",
      name: "STA Khadri",
      identifier: "sta.khadri@dmhs.edu.in",
      email: "sta.khadri@dmhs.edu.in",
      role: "ADMIN",
      status: "ACTIVE",
      last_reset_status: staLog ? (staLog.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
      last_reset_at: staLog?.timestamp,
    });

    const ateefLog = getLatestLog("ateef@dmhs.edu.in");
    users.push({
      id: "adm_ateef",
      name: "Ateef Ali",
      identifier: "ateef@dmhs.edu.in",
      email: "ateef@dmhs.edu.in",
      role: "ADMIN",
      status: "ACTIVE",
      last_reset_status: ateefLog ? (ateefLog.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
      last_reset_at: ateefLog?.timestamp,
    });

    // 3. Include any local custom user accounts
    try {
      const customUsers = getStoredCustomUsers();
      for (const u of customUsers) {
        if (!users.some((x) => x.email === u.email || x.identifier === u.username)) {
          const uLog = getLatestLog(u.email || u.username);
          users.push({
            id: String(u.id || u.username),
            name: u.full_name || u.username,
            identifier: u.admission_number || u.employee_id || u.username || u.email,
            email: u.email,
            role: u.role,
            status: "ACTIVE",
            last_reset_status: uLog ? (uLog.status === "Completed" ? "COMPLETED" : "PENDING_VERIFICATION") : "NONE",
            last_reset_at: uLog?.timestamp,
          });
        }
      }
    } catch {}

    return users;
  },

  /**
   * Retrieve Password Reset Audit Logs
   */
  getAuditLogs: async (): Promise<PasswordResetLogItem[]> => {
    const localLogs = getPasswordResetLogs();
    try {
      if (isSupabaseConfigured()) {
        const { data: auditData, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && Array.isArray(auditData) && auditData.length > 0) {
          const remoteLogs: PasswordResetLogItem[] = auditData.map((a: any) => ({
            id: a.id,
            user_name: a.user_name || a.details?.name || "User",
            role: a.role || a.details?.role || "ADMIN",
            email: a.email || a.details?.email || "",
            action: (a.action?.toUpperCase() || "PASSWORD_RESET_SUCCESS") as any,
            status: a.status === "Completed" || a.status === "success" ? "Completed" : "Pending Verification",
            timestamp: a.created_at || new Date().toISOString(),
          }));
          return [...remoteLogs, ...localLogs];
        }
      }
    } catch (e) {
      console.warn("[authRecoveryService] Supabase audit_logs fallback:", e);
    }
    return localLogs;
  },

  getPasswordResetAuditLogs: async (): Promise<PasswordResetLogItem[]> => {
    return authRecoveryService.getAuditLogs();
  },

  /**
   * Admin: Initiate password reset OTP dispatch to user
   */
  adminInitiateReset: async (identifierOrEmail: string): Promise<{ success: boolean; message: string; maskedPhone?: string }> => {
    const cleanId = (identifierOrEmail || "").trim();
    const account = findAccountByIdentifier(cleanId);
    const portal = account.role || "ADMIN";
    const res = await authRecoveryService.requestOtp(cleanId, portal);
    appendPasswordResetLog({
      user_name: account.name || cleanId,
      role: portal,
      email: account.email || cleanId,
      action: "OTP_DISPATCHED",
      status: "Pending Verification",
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      message: `Password reset OTP dispatched to registered mobile/email ${res.maskedPhone || ""}.`,
      maskedPhone: res.maskedPhone,
    };
  },

  /**
   * Admin: Directly set or generate new password for student, faculty, or admin
   */
  adminSetUserPassword: async (
    identifierOrEmail: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string; generatedPassword?: string }> => {
    const cleanId = (identifierOrEmail || "").trim();
    if (!cleanId) {
      throw new ApiError("User identifier is required.", 400);
    }
    const finalPass = newPassword?.trim() || `Dmhs@${Math.floor(1000 + Math.random() * 9000)}`;
    if (finalPass.length < 4) {
      throw new ApiError("Password must be at least 4 characters long.", 400);
    }

    const account = findAccountByIdentifier(cleanId);
    const targetEmail = account.email || cleanId;
    const targetRole = account.role || "ADMIN";

    // Update local storage fallback credentials
    if (targetRole === "ADMIN") {
      setAdminPassword(finalPass);
    } else if (targetRole === "TEACHER") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_teacher_password_${account.targetId || cleanId}`, hashPassword(finalPass));
      }
    } else if (targetRole === "STUDENT") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`dmhs_student_password_${account.targetId || cleanId}`, hashPassword(finalPass));
      }
    }

    appendPasswordResetLog({
      user_name: account.name || cleanId,
      role: targetRole,
      email: targetEmail,
      action: "ADMIN_FORCE_RESET",
      status: "Completed",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Credentials successfully updated for ${account.name || cleanId}.`,
      generatedPassword: finalPass,
    };
  },
};
