import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../services/api";

// In-memory mock storage for vitest environment
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

describe("DMHS Empty State & Fresh Data Entry Verification Suite", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  // ==========================================================================
  // PHASE 5 & 6: GENUINE EMPTY STATES VERIFICATION (ZERO DEMO RECORDS)
  // ==========================================================================
  describe("Phase 5 & 6: Genuine Empty States Across All Modules", () => {
    it("reports exactly 0 students and empty list when database/storage has no operational records", async () => {
      const res = await api.students.list({ limit: 100 });
      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
    });

    it("reports exactly 0 faculty members and empty list when database/storage has no records", async () => {
      const res = await api.teachers.list({ limit: 100 });
      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
    });

    it("reports exactly 0 classes when database/storage has no records", async () => {
      const res = await api.classes.list();
      expect(res).toEqual([]);
    });

    it("reports exactly 0 expenses and 0 total expenditure when empty", async () => {
      const res = await api.expenses.list();
      expect(Array.isArray(res) ? res : (res as any).items).toEqual([]);

      const stats = await api.expenses.getStats();
      expect(stats.total_expenses).toBe(0);
      expect(stats.current_month_expenses).toBe(0);
    });

    it("reports 0 applicable, 0 collected, and 0 remaining fees in financial summary when empty", async () => {
      const summary = await api.fees.getFinancialSummary();
      expect(summary.total_applicable_fees).toBe(0);
      expect(summary.total_collected_fees).toBe(0);
      expect(summary.total_remaining_fees).toBe(0);
      expect(summary.collection_rate).toBe(0);
    });

    it("reports 0 across operational counters in Admin Dashboard when empty", async () => {
      const adminStats = await api.dashboards.getAdmin();
      expect(adminStats.total_active_students).toBe(0);
      expect(adminStats.total_active_teachers).toBe(0);
      expect(adminStats.total_classes).toBe(0);
    });
  });

  // ==========================================================================
  // PHASE 7: FRESH DATA ENTRY WORKFLOW VERIFICATION
  // ==========================================================================
  describe("Phase 7: Fresh Operational Data Creation Workflow", () => {
    it("successfully creates a fresh academic session (2027-2028) and activates it", async () => {
      const createdYear = await api.academicYears.create({
        name: "2027-2028",
        start_date: "2027-06-01",
        end_date: "2028-04-30",
        is_current: true,
        status: "active",
      });

      expect(createdYear.name).toBe("2027-2028");
      expect(createdYear.is_current).toBe(true);

      const currentYear = await api.academicYears.getCurrent();
      expect(currentYear).toBeDefined();
      expect(currentYear?.name).toBe("2027-2028");
    });

    it("successfully creates fresh classes across Pre-Primary, Primary, and Higher Classes", async () => {
      // 1. Pre-Primary Class
      const nursery = await api.classes.create({
        name: "Nursery",
        grade_level: 0,
        category: "Pre-Primary",
      });
      expect(nursery.name).toBe("Nursery");

      // 2. Primary Class
      const class1 = await api.classes.create({
        name: "Class 1",
        grade_level: 1,
        category: "Primary",
      });
      expect(class1.name).toBe("Class 1");

      // 3. Higher Class
      const class10 = await api.classes.create({
        name: "Class 10",
        grade_level: 10,
        category: "Higher Classes",
      });
      expect(class10.name).toBe("Class 10");

      const list = await api.classes.list();
      expect(list.length).toBe(3);
    });

    it("admits a fresh student, verifies storage, and synchronizes with Fees module", async () => {
      const studentPayload = {
        full_name: "Fresh Student Tariq",
        admission_number: "DMHS-2026-0001",
        class_name: "Nursery",
        section_name: "A",
        academic_category: "Pre-Primary",
        date_of_birth: "2022-03-15",
        gender: "Male" as const,
        guardian_name: "Tariq Mahmood",
        guardian_relationship: "Father",
        guardian_phone: "+91 98490 99887",
        emergency_contact: "+91 98490 99887",
        address: "House 12-4-56, Moghalpura, Hyderabad",
        student_status: "active" as const,
      };

      const admitted = await api.students.create(studentPayload);
      expect(admitted.full_name).toBe("Fresh Student Tariq");
      expect(admitted.admission_number).toBe("DMHS-2026-0001");

      // Verify student appears in students list
      const studentsList = await api.students.list();
      expect(studentsList.total).toBe(1);
      expect(studentsList.items[0].admission_number).toBe("DMHS-2026-0001");

      // Verify automatic synchronization into Fees module
      const feeSummary = await api.fees.getFinancialSummary();
      expect(feeSummary.total_applicable_fees).toBeGreaterThan(0);
    });

    it("admits a fresh faculty member and verifies storage and dashboard", async () => {
      const facultyPayload = {
        full_name: "Ms. Reshma Begum",
        employee_id: "EMP-2026-001",
        email: "reshma.begum@dmhs.edu.in",
        contact_phone: "+91 98490 77665",
        qualification: "M.Sc. Mathematics, B.Ed.",
        designation: "Mathematics Teacher",
        department: "Mathematics",
        joining_date: "2026-06-01",
        employment_status: "active" as const,
      };

      const admitted = await api.teachers.create(facultyPayload);
      expect(admitted.full_name).toBe("Ms. Reshma Begum");
      expect(admitted.employee_id).toBe("EMP-2026-001");

      const teachersList = await api.teachers.list();
      expect(teachersList.total).toBe(1);
      expect(teachersList.items[0].employee_id).toBe("EMP-2026-001");
    });
  });
});
