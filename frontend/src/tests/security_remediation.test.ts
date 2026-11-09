import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../services/api";
import { authRecoveryService } from "../services/authRecoveryService";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "../services/authCrypto";
import { sanitizePostgrestSearch } from "../services/supabaseService";

// Mock localStorage polyfill for Node test runner
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0,
  } as any;
}

describe("DMHS Security Hardening & Remediation Verification Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    authRecoveryService.clearAllOtpSessions?.();
  });

  // ==========================================================================
  // SEC-01 & SEC-05: OTP BACKDOOR REMOVAL & STRICT RATE LIMITING
  // ==========================================================================
  describe("SEC-01 & SEC-05: OTP Security & Rate Limiting", () => {
    it("strictly rejects the 123456 backdoor bypass code", async () => {
      const init = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      const sessionId = init.sessionId!;

      // Attempting to bypass with former backdoor code '123456' must fail
      if (init.debugOtp !== "123456") {
        await expect(authRecoveryService.verifyOtp(sessionId, "123456")).rejects.toThrow(
          /Invalid 6-digit verification code/
        );
      }
    });

    it("requires exact match with generated OTP and succeeds", async () => {
      const init = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      const sessionId = init.sessionId!;
      const realOtp = init.debugOtp!;

      const verifyRes = await authRecoveryService.verifyOtp(sessionId, realOtp);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.resetToken).toBe(sessionId);
    });

    it("locks session after 3 failed attempts (rate limit guard)", async () => {
      const init = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      const sessionId = init.sessionId!;

      await expect(authRecoveryService.verifyOtp(sessionId, "000001")).rejects.toThrow();
      await expect(authRecoveryService.verifyOtp(sessionId, "000002")).rejects.toThrow();
      await expect(authRecoveryService.verifyOtp(sessionId, "000003")).rejects.toThrow(
        /Maximum verification attempts/
      );
    });

    it("enforces 60-second cooldown on consecutive OTP requests for same email", async () => {
      await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      // Immediate second request must be rejected by cooldown guard
      await expect(authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in")).rejects.toThrow(
        /Please wait/
      );
    });
  });

  // ==========================================================================
  // SEC-02 & SEC-04: CRYPTOGRAPHIC RBAC & PASSWORD HASHING
  // ==========================================================================
  describe("SEC-02 & SEC-04: Cryptographic Role Verification & Password Hashing", () => {
    it("hashes plaintext passwords using salted SHA-256 and verifies correctly", () => {
      const plain = "SecretPass@2026";
      const hashed = hashPassword(plain);

      expect(hashed).toMatch(/^sha256\$[a-f0-9]{64}$/);
      expect(hashed).not.toBe(plain);
      expect(verifyPassword(plain, hashed)).toBe(true);
      expect(verifyPassword("WrongPassword", hashed)).toBe(false);
    });

    it("generates signed tamper-proof session tokens", () => {
      const token = createSessionToken({
        id: "usr_101",
        role: "STUDENT",
        username: "TestStudent",
        email: "student@dmhs.edu.in",
      });

      expect(token).toMatch(/^dmhs\.[A-Za-z0-9+/=]+\.[a-f0-9]{32}$/);

      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.role).toBe("STUDENT");
      expect(verified?.username).toBe("TestStudent");
    });

    it("detects and rejects tampered session tokens", () => {
      const token = createSessionToken({
        id: "usr_102",
        role: "STUDENT",
        username: "MaliciousStudent",
      });

      // Tamper with the token body
      const parts = token.split(".");
      const tampered = `dmhs.eyJyZXN1bHQiOiJhZG1pbiJ9.${parts[2]}`;
      expect(verifySessionToken(tampered)).toBeNull();
    });

    it("blocks student privilege escalation via dmhs_demo_role tampering", async () => {
      // 1. Log in as student Ali
      const studentSession = await api.auth.login({
        username_or_email: "ali",
        password: "1234",
      });
      expect(studentSession.role).toBe("STUDENT");

      // 2. Malicious user tampers with localStorage to claim ADMIN role
      localStorage.setItem("dmhs_demo_role", "ADMIN");

      // 3. Attempting to call administrator-only operation must throw 403 Forbidden
      await expect(
        api.expenses.create({
          amount: 5000,
          category: "Electricity",
          expense_date: "2026-11-09",
          description: "Unauthorized expense by student",
        })
      ).rejects.toThrow(/Forbidden: Unauthorized users cannot perform administrator-only operations/);
    });
  });

  // ==========================================================================
  // SEC-06 & SEC-07: DOCUMENT IDOR & RESTRICTED FILE UPLOADS
  // ==========================================================================
  describe("SEC-06 & SEC-07: IDOR Protection & File Upload Validation", () => {
    it("rejects oversized file uploads exceeding 5MB limit", async () => {
      // Simulate file object > 5MB
      const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "oversized.pdf", {
        type: "application/pdf",
      });

      await expect(
        api.students.uploadDocument("std_ali", bigFile, "Aadhaar Card", "Aadhaar")
      ).rejects.toThrow(/File size exceeds 5MB limit/);
    });

    it("rejects unauthorized file types (e.g., .exe, .sh, .html)", async () => {
      const maliciousFile = new File(["malicious script"], "payload.exe", {
        type: "application/x-msdownload",
      });

      await expect(
        api.students.uploadDocument("std_ali", maliciousFile, "Certificate", "Payload")
      ).rejects.toThrow(/Invalid file type/);
    });

    it("prevents Student A from accessing or modifying Student B documents (IDOR)", async () => {
      // Log in as student Ali
      await api.auth.login({
        username_or_email: "ali",
        password: "1234",
      });

      const validFile = new File(["sample content"], "marksheet.pdf", {
        type: "application/pdf",
      });

      // Student Ali trying to upload a document to another student's account (e.g., std_sara)
      await expect(
        api.students.uploadDocument("std_sara", validFile, "Marksheet", "Sara Marksheet")
      ).rejects.toThrow(/Access Denied/);
    });
  });

  // ==========================================================================
  // SEC-09: POSTGREST FILTER INJECTION SANITIZATION
  // ==========================================================================
  describe("SEC-09: PostgREST Filter Injection Sanitization", () => {
    it("sanitizes reserved grammar operators from query string", () => {
      const maliciousQuery = 'admin"),role.eq.SUPERADMIN,email.like.%(secret';
      const clean = sanitizePostgrestSearch(maliciousQuery);

      expect(clean).not.toContain("(");
      expect(clean).not.toContain(")");
      expect(clean).not.toContain(",");
      expect(clean).not.toContain('"');
      expect(clean).not.toContain(".");
      expect(clean).not.toContain("%");
      expect(clean).toBe("adminroleeqSUPERADMINemaillikesecret");
    });
  });
});
