import { describe, it, expect, beforeEach } from "vitest";
import { authRecoveryService, maskEmail } from "../services/authRecoveryService";
import { api } from "../services/api";

// Simple in-memory storage mock for vitest node environment
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as any;
}

describe("Gmail OTP Password Recovery & Admin Password Management", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  describe("maskEmail helper", () => {
    it("correctly masks Gmail and school email addresses", () => {
      expect(maskEmail("ateef@gmail.com")).toBe("a***f@gmail.com");
      expect(maskEmail("sta.khadri@dmhs.edu.in")).toBe("s***i@dmhs.edu.in");
      expect(maskEmail("ali@dmhs.edu.in")).toBe("a***i@dmhs.edu.in");
      expect(maskEmail("ab@gmail.com")).toBe("a***@gmail.com");
      expect(maskEmail("")).toBe("u***@dmhs.edu.in");
    });
  });

  describe("5-Step Password Recovery Workflow for All Roles", () => {
    it("Step 1 & 2 & 3: Requests OTP for Admin, Faculty, and Student with 5-minute expiry and 60s cooldown", async () => {
      // 1. Admin Request
      const adminRes = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      expect(adminRes.success).toBe(true);
      expect(adminRes.sessionId).toBeDefined();
      expect(adminRes.maskedEmail).toBe("s***i@dmhs.edu.in");
      expect(adminRes.expiresSeconds).toBe(300); // 5 minutes
      expect(adminRes.cooldownSeconds).toBe(60); // 60s cooldown
      expect(adminRes.debugOtp).toMatch(/^\d{6}$/);

      // 2. Faculty Request by Employee ID
      const facultyRes = await authRecoveryService.requestOtp("EMP-ATEEF");
      expect(facultyRes.success).toBe(true);
      expect(facultyRes.sessionId).toBeDefined();
      expect(facultyRes.maskedEmail).toBe("a***f@dmhs.edu.in");
      expect(facultyRes.debugOtp).toMatch(/^\d{6}$/);

      // 3. Student Request by Admission Number
      const studentRes = await authRecoveryService.requestOtp("ADM-ALI");
      expect(studentRes.success).toBe(true);
      expect(studentRes.sessionId).toBeDefined();
      expect(studentRes.maskedEmail).toBe("a***i@dmhs.edu.in");
      expect(studentRes.debugOtp).toMatch(/^\d{6}$/);
    });

    it("Step 2 Security: Non-registered email yields generic response to prevent account enumeration", async () => {
      const genericRes = await authRecoveryService.requestOtp("random_hacker@unknown.org");
      expect(genericRes.success).toBe(true);
      expect(genericRes.sessionId).toBeUndefined();
      expect(genericRes.debugOtp).toBeUndefined();
      expect(genericRes.message).toContain("If this identifier is registered with DMHS");
    });

    it("Step 4: Verifies 6-digit OTP code correctly", async () => {
      const req = await authRecoveryService.requestOtp("ateef@dmhs.edu.in");
      const otp = req.debugOtp!;

      const verifyRes = await authRecoveryService.verifyOtp(req.sessionId!, otp);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.resetToken).toBe(req.sessionId);
    });

    it("Step 4 Security: Enforces maximum 3 attempts and rate limiting", async () => {
      const req = await authRecoveryService.requestOtp("ateef@dmhs.edu.in");
      const sid = req.sessionId!;

      // Attempt 1: wrong OTP
      await expect(authRecoveryService.verifyOtp(sid, "000000")).rejects.toThrow("2 attempts remaining");

      // Attempt 2: wrong OTP
      await expect(authRecoveryService.verifyOtp(sid, "111111")).rejects.toThrow("1 attempt remaining");

      // Attempt 3: wrong OTP -> Session locked
      await expect(authRecoveryService.verifyOtp(sid, "222222")).rejects.toThrow("Maximum verification attempts exceeded");

      // Subsequent attempt fails with session invalid
      await expect(authRecoveryService.verifyOtp(sid, "333333")).rejects.toThrow("Invalid or expired");
    });

    it("Step 4 Resend: Enforces 60-second cooldown before resending code", async () => {
      const req = await authRecoveryService.requestOtp("ali@dmhs.edu.in");
      const sid = req.sessionId!;

      // Immediate resend should throw cooldown error
      await expect(authRecoveryService.resendOtp(sid)).rejects.toThrow(/Please wait \d+s/);
    });

    it("Step 5: Resets password, invalidates old credentials, and allows sign-in with new password", async () => {
      // 1. Request OTP for Faculty Ateef
      const req = await authRecoveryService.requestOtp("ateef@dmhs.edu.in");
      const sid = req.sessionId!;
      const otp = req.debugOtp!;

      // 2. Verify OTP
      await authRecoveryService.verifyOtp(sid, otp);

      // 3. Reset password to 'NewSecret@2026'
      const resetRes = await authRecoveryService.resetPasswordWithToken(sid, "NewSecret@2026");
      expect(resetRes.success).toBe(true);

      // 4. Single-use guarantee: Re-using the same session token fails
      await expect(authRecoveryService.resetPasswordWithToken(sid, "AnotherPass")).rejects.toThrow(
        "Session unauthorized or verification incomplete"
      );

      // 5. Authenticate with new password via api.auth.login
      const session = await api.auth.login("EMP-ATEEF", "NewSecret@2026");
      expect(session.role).toBe("TEACHER");
      expect(session.full_name).toBe("Ateef");

      // 6. Old default password '1234' is now invalid
      await expect(api.auth.login("EMP-ATEEF", "1234")).rejects.toThrow("Incorrect password for faculty account.");
    });
  });

  describe("Admin Password Management", () => {
    it("lists all faculty and students with password reset tracking status", async () => {
      const userList = await authRecoveryService.listUsersForAdminCredentials();
      expect(userList.length).toBeGreaterThanOrEqual(3);

      const adminUser = userList.find((u) => u.role === "ADMIN");
      const facultyUser = userList.find((u) => u.identifier === "EMP-ATEEF");
      const studentUser = userList.find((u) => u.identifier === "ADM-ALI");

      expect(adminUser).toBeDefined();
      expect(facultyUser).toBeDefined();
      expect(studentUser).toBeDefined();
      expect(facultyUser?.email).toBe("ateef@dmhs.edu.in");
    });

    it("allows admin to initiate reset and dispatch OTP to user's registered Gmail", async () => {
      const res = await authRecoveryService.adminInitiateReset("EMP-ATEEF");
      expect(res.success).toBe(true);
      expect(res.maskedEmail).toBe("a***f@dmhs.edu.in");
      expect(res.message).toContain("dispatched to registered address");

      const logs = await authRecoveryService.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe("OTP_DISPATCHED");
      expect(logs[0].email).toBe("ateef@dmhs.edu.in");
    });

    it("allows admin to directly generate / set new password for a student or faculty", async () => {
      // Admin generates a password for student Ali
      const res = await authRecoveryService.adminSetUserPassword("ADM-ALI", "AliSpecial@2026");
      expect(res.success).toBe(true);
      expect(res.generatedPassword).toBe("AliSpecial@2026");

      // Student Ali can immediately log in with the admin-configured password
      const studentSession = await api.auth.login("ADM-ALI", "AliSpecial@2026");
      expect(studentSession.role).toBe("STUDENT");
      expect(studentSession.full_name).toBe("Ali");

      // Old password fails
      await expect(api.auth.login("ADM-ALI", "1234")).rejects.toThrow("Incorrect password for student account.");

      // Reset audit log reflects admin reset
      const logs = await authRecoveryService.getAuditLogs();
      const adminResetLog = logs.find((l) => l.action === "ADMIN_FORCE_RESET");
      expect(adminResetLog).toBeDefined();
      expect(adminResetLog?.status).toBe("Completed");
    });
  });
});
