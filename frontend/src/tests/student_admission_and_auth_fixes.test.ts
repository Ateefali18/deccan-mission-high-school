import { describe, it, expect, beforeEach } from "vitest";
import { api, getCategoryForClass } from "../services/api";

// Simple in-memory storage mock for vitest node environment if needed
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

describe("Student Admission, Class Hierarchy & Auth Fixes Verification", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  it("accurately categorizes classes according to Telangana SSC hierarchy", () => {
    expect(getCategoryForClass("Nursery")).toBe("Pre-Primary");
    expect(getCategoryForClass("LKG")).toBe("Pre-Primary");
    expect(getCategoryForClass("UKG")).toBe("Pre-Primary");

    expect(getCategoryForClass("Class 1")).toBe("Primary");
    expect(getCategoryForClass("Class 2")).toBe("Primary");
    expect(getCategoryForClass("Class 5")).toBe("Primary");

    expect(getCategoryForClass("Class 6")).toBe("Higher Classes");
    expect(getCategoryForClass("Class 9")).toBe("Higher Classes");
    expect(getCategoryForClass("Class 10")).toBe("Higher Classes");

    expect(getCategoryForClass("Class 11")).toBe("Higher Secondary");
    expect(getCategoryForClass("Class 12")).toBe("Higher Secondary");
  });

  it(
    "admits students across Nursery, UKG, Class 1, Class 5, Class 6, Class 9, and Class 10 with exact class assignment (NEVER defaults to 10-A)",
    async () => {
      const testHierarchy = [
        { class_id: "cls_nursery", class_name: "Nursery", section_id: "sec_nur_a", section_name: "A", expectedCategory: "Pre-Primary" },
        { class_id: "cls_ukg", class_name: "UKG", section_id: "sec_ukg_b", section_name: "B", expectedCategory: "Pre-Primary" },
        { class_id: "cls_1", class_name: "Class 1", section_id: "sec_1_a", section_name: "A", expectedCategory: "Primary" },
        { class_id: "cls_5", class_name: "Class 5", section_id: "sec_5_b", section_name: "B", expectedCategory: "Primary" },
        { class_id: "cls_6", class_name: "Class 6", section_id: "sec_6_a", section_name: "A", expectedCategory: "Higher Classes" },
        { class_id: "cls_9", class_name: "Class 9", section_id: "sec_9_b", section_name: "B", expectedCategory: "Higher Classes" },
        { class_id: "cls_10", class_name: "Class 10", section_id: "sec_10_c", section_name: "C", expectedCategory: "Higher Classes" },
      ];

      for (let i = 0; i < testHierarchy.length; i++) {
        const item = testHierarchy[i];
        const admNo = `ADM-TEST-${2026}-${String(i + 1).padStart(3, "0")}`;
        const studentName = `Student ${item.class_name}`;

        const created = await api.students.create({
          full_name: studentName,
          admission_number: admNo,
          class_id: item.class_id,
          class_name: item.class_name,
          section_id: item.section_id,
          section_name: item.section_name,
          academic_year_id: "ay_2026_27",
          academic_term_id: "term_1",
          date_of_birth: "2015-05-15",
          gender: "Male",
          father_name: `Father of ${studentName}`,
          father_phone: "+91 98490 11111",
          father_email: "father@dmhs.edu.in",
          father_occupation: "Engineer",
          mother_name: `Mother of ${studentName}`,
          mother_phone: "+91 98490 22222",
          mother_email: "mother@dmhs.edu.in",
          mother_occupation: "Doctor",
          password: "Pass@" + (1000 + i),
        });

        // Verify exact assignment
        expect(created.class_name).toBe(item.class_name);
        expect(created.section_name).toBe(item.section_name);
        expect(created.academic_category).toBe(item.expectedCategory);
        expect(created.admission_number).toBe(admNo);

        // Verify separate parents info
        expect(created.father_name).toBe(`Father of ${studentName}`);
        expect(created.mother_name).toBe(`Mother of ${studentName}`);

        // Verify document status
        expect(created.documents_status).toBe("pending");
        expect(created.documents_count).toBe(0);

        // Verify student appears in student list
        const list = await api.students.list({ limit: 100 });
        const foundInList = list.items.find((s) => s.admission_number === admNo);
        expect(foundInList).toBeDefined();
        expect(foundInList?.class_name).toBe(item.class_name);
        expect(foundInList?.section_name).toBe(item.section_name);
        expect(foundInList?.academic_category).toBe(item.expectedCategory);
      }
    },
    30000
  );

  it(
    "automatically generates fee invoice when student is admitted so they appear in Fees & Payments",
    async () => {
      const admNo = "ADM-FEES-001";
      await api.students.create({
        full_name: "Zoya Afreen",
        admission_number: admNo,
        class_id: "cls_1",
        class_name: "Class 1",
        section_id: "sec_1_a",
        section_name: "A",
        academic_year_id: "ay_2026_27",
        father_name: "Mohammed Afreen",
        father_phone: "+91 98490 55555",
        mother_name: "Shabana Begum",
        mother_phone: "+91 98490 66666",
        password: "ZoyaPass@123",
      });

      const invoices = await api.fees.getInvoices({ search: "Zoya" });
      const studentInvoice = invoices.find((inv) => inv.admission_number === admNo);

      expect(studentInvoice).toBeDefined();
      expect(studentInvoice?.student_name).toBe("Zoya Afreen");
      expect(studentInvoice?.class_name).toBe("Class 1");
      expect(studentInvoice?.total_amount).toBeGreaterThan(0);
      expect(studentInvoice?.balance).toBe(studentInvoice?.total_amount);
    },
    15000
  );

  it("deactivates faculty members with non-UUID string IDs safely without UUID error", async () => {
    const res = await api.teachers.deactivate("tch_ateef");
    expect(res).toBeDefined();
  });

  it("supports document upload, download, and deletion per student", async () => {
    const studentId = "std_test_docs_01";
    const testFile = new File(["dummy content"], "aadhaar_card.pdf", { type: "application/pdf" });

    const doc = await api.students.uploadDocument(studentId, testFile, "Aadhaar Card", "aadhaar_card.pdf");
    expect(doc).toBeDefined();
    expect(doc.student_id).toBe(studentId);
    expect(doc.file_name).toBe("aadhaar_card.pdf");
    expect(doc.mime_type).toContain("pdf");

    // Retrieve documents
    const docs = await api.students.getDocuments(studentId);
    expect(docs.length).toBe(1);
    expect(docs[0].id).toBe(doc.id);

    // Delete document
    const deleteRes = await api.students.deleteDocument(doc.id);
    expect(deleteRes).toBe(true);

    const docsAfter = await api.students.getDocuments(studentId);
    expect(docsAfter.length).toBe(0);
  });
});
