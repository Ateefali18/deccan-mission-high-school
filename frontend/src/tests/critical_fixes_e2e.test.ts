import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../services/api";
import { authRecoveryService } from "../services/authRecoveryService";

// Mock localStorage polyfill for Node test environment
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

describe("DMHS Critical Fixes Verification Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // PRIORITY 1: REAL GMAIL OTP PASSWORD RECOVERY
  describe("Priority 1: Gmail OTP Password Recovery System", () => {
    it("generates a 6-digit OTP with 5-minute expiry and 60-second cooldown", async () => {
      const res = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");

      expect(res.success).toBe(true);
      expect(res.sessionId).toBeDefined();
      expect(res.maskedEmail).toContain("@");
      expect(res.expiresSeconds).toBe(300); // 5 minutes
      expect(res.cooldownSeconds).toBe(60); // 60 seconds
      expect(res.debugOtp).toMatch(/^\d{6}$/); // Exactly 6 digits
    });

    it("enforces 3-attempt rate limit guard on incorrect OTP entry", async () => {
      const init = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      const sessionId = init.sessionId!;

      // 1st wrong attempt
      await expect(authRecoveryService.verifyOtp(sessionId, "000000")).rejects.toThrow();

      // 2nd wrong attempt
      await expect(authRecoveryService.verifyOtp(sessionId, "000001")).rejects.toThrow();

      // 3rd wrong attempt -> Max attempts exceeded (locks / deletes session)
      await expect(authRecoveryService.verifyOtp(sessionId, "000002")).rejects.toThrow();
    });

    it("successfully verifies valid OTP and resets password for all roles", async () => {
      const init = await authRecoveryService.requestOtp("sta.khadri@dmhs.edu.in");
      const verifyRes = await authRecoveryService.verifyOtp(init.sessionId!, init.debugOtp!);
      expect(verifyRes.success).toBe(true);

      const resetRes = await authRecoveryService.resetPasswordWithToken(init.sessionId!, "Admin@NewPass2026");
      expect(resetRes.success).toBe(true);

      // Verify new credentials work in login
      const loginRes = await api.auth.login({
        username_or_email: "sta.khadri@dmhs.edu.in",
        password: "Admin@NewPass2026",
      });
      expect(loginRes.role).toBe("ADMIN");
    });
  });

  // PRIORITY 2 & 3: COMPLETE STUDENT ADMISSION & EDITING
  describe("Priority 2 & 3: Student Admission and Complete Editing", () => {
    it("admits student with all 20+ fields and does not throw Expected number nan", async () => {
      const studentData = {
        full_name: "Syed Rehan Ali",
        admission_number: "ADM-2026-REHAN",
        date_of_birth: "2011-04-12",
        gender: "Male",
        caste: "BC-E",
        religion: "Islam",
        mother_tongue: "Urdu",
        first_language: "Telugu",
        second_language: "Hindi",
        third_language: "English",
        aadhaar_number: "1234-5678-9012",
        apaar_id: "APAAR-123456",
        student_phone: "+91 98480 11111",
        email: "rehan.ali@student.dmhs.edu.in",
        address: "Moghalpura, Hyderabad",
        father_name: "Syed Mansoor Ali",
        father_phone: "+91 98480 22222",
        father_email: "mansoor.ali@gmail.com",
        father_occupation: "Business",
        mother_name: "Zainab Begum",
        mother_phone: "+91 98480 33333",
        mother_email: "zainab.begum@gmail.com",
        mother_occupation: "Teacher",
        class_id: "cls_10",
        class_name: "Class 10",
        section_id: "sec_10a",
        section_name: "A",
        roll_number: "15",
      };

      const admitted = await api.students.create(studentData);
      expect(admitted.full_name).toBe("Syed Rehan Ali");
      expect(admitted.admission_number).toBe("ADM-2026-REHAN");
      expect(admitted.class_name).toBe("Class 10");
      expect(admitted.section_name).toBe("A");

      // Verify editing updates without duplicate creation
      const updated = await api.students.update(admitted.id, {
        full_name: "Syed Rehan Ali Updated",
        roll_number: "16",
        address: "Charminar, Hyderabad",
      });
      expect(updated.full_name).toBe("Syed Rehan Ali Updated");
      expect(updated.roll_number).toBe("16");

      const studentList = await api.students.list({ search: "REHAN" });
      expect(studentList.items.length).toBe(1);
      expect(studentList.items[0].full_name).toBe("Syed Rehan Ali Updated");
    }, 20000);
  });

  // PRIORITY 4 & 5: GENUINE STUDENT LOGIN & REAL-TIME PORTAL ISOLATION
  describe("Priority 4 & 5: Genuine Student Login Isolation", () => {
    it("authenticates an admitted student and maps their genuine profile (never hardcoded Zeeshan or Ali)", async () => {
      const studentPayload = {
        full_name: "Farhan Ahmed",
        admission_number: "ADM-FARHAN-09",
        password: "FarhanPass@123",
        class_id: "cls_9",
        class_name: "Class 9",
        section_id: "sec_9a",
        section_name: "A",
        roll_number: "22",
        father_name: "Ahmed Khan",
      };

      const admitted = await api.students.create(studentPayload);

      // Student logs in with their admission number and password
      const session = await api.auth.login({
        username_or_email: "ADM-FARHAN-09",
        password: "FarhanPass@123",
      });

      expect(session.role).toBe("STUDENT");
      expect(session.full_name).toBe("Farhan Ahmed");
      expect(session.admission_number).toBe("ADM-FARHAN-09");

      // Verify getMyProfile returns Farhan's exact profile
      const myProfile = await api.students.getMyProfile();
      expect(myProfile.full_name).toBe("Farhan Ahmed");
      expect(myProfile.admission_number).toBe("ADM-FARHAN-09");
      expect(myProfile.class_name).toBe("Class 9");
      expect(myProfile.roll_number).toBe("22");

      // Verify Student Dashboard metrics
      const dashboard = await api.dashboards.getStudent();
      expect(dashboard.student_name).toBe("Farhan Ahmed");
      expect(dashboard.admission_number).toBe("ADM-FARHAN-09");
      expect(dashboard.class_name).toBe("Class 9");
      expect(dashboard.guardian_name).toContain("Ahmed Khan");
    }, 20000);
  });

  // PRIORITY 6: FACULTY INFORMATION & DEACTIVATION
  describe("Priority 6: Faculty Information & Deactivation", () => {
    it("retrieves faculty profile for baseline faculty (EMP-ATEEF) without errors", async () => {
      const teacher = await api.teachers.getById("tch_ateef");

      expect(teacher).toBeDefined();
      expect(teacher.employee_id).toBe("EMP-ATEEF");
      expect(teacher.full_name).toBe("Ateef");
      expect(teacher.department).toBe("Mathematics");
    });

    it("safely deactivates non-UUID faculty without throwing UUID syntax errors", async () => {
      const res = await api.teachers.deactivate("tch_ateef");
      expect(res).toBeDefined();
      expect(res.message).toBe("Deactivated");
    });
  });

  // PRIORITY 7: REPORTS & ANALYTICS DYNAMIC FALLBACK
  describe("Priority 7: Reports and Analytics Calculation", () => {
    it("computes comprehensive school analytics without throwing HTTP 404", async () => {
      const summary = await api.reports.getSummary();

      expect(summary).toBeDefined();
      expect(Array.isArray(summary.enrollment_by_class)).toBe(true);
      expect(summary.gender_distribution).toBeDefined();
      expect(typeof summary.gender_distribution.male).toBe("number");
      expect(typeof summary.gender_distribution.female).toBe("number");
      expect(typeof summary.overall_attendance_rate).toBe("number");
      expect(summary.fee_collection_status).toBeDefined();
      expect(typeof summary.fee_collection_status.collected).toBe("number");
      expect(Array.isArray(summary.top_performers)).toBe(true);
    });
  });
});
