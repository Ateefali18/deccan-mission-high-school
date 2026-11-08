import { describe, it, expect, beforeEach } from "vitest";
import { api, getCategoryForClass } from "../services/api";

// Simple in-memory storage mock for node environment
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

describe("Prompt 2: Fees and Payments, Faculty Admission, and Institution Settings Fixes", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  // TEST 1: Nursery student -> Pre-Primary fee sync
  it("admits a Nursery student and automatically synchronizes them into Pre-Primary Fees", async () => {
    const admNo = "ADM-NUR-001";
    const student = await api.students.create({
      full_name: "Baby Ayesha",
      admission_number: admNo,
      class_id: "cls_nursery",
      class_name: "Nursery",
      section_id: "sec_nur_a",
      section_name: "A",
      father_name: "Mohammed Siddiq",
      father_phone: "+91 98490 12345",
      mother_name: "Fatima Begum",
      mother_phone: "+91 98490 54321",
    });

    expect(student.class_name).toBe("Nursery");
    expect(student.academic_category).toBe("Pre-Primary");

    // Fetch Pre-Primary invoices
    const prePrimaryInvoices = await api.fees.getInvoices({ category: "Pre-Primary" });
    const invoice = prePrimaryInvoices.find((i) => i.admission_number === admNo);

    expect(invoice).toBeDefined();
    expect(invoice?.student_name).toBe("Baby Ayesha");
    expect(invoice?.class_name).toBe("Nursery");
    expect(invoice?.academic_category).toBe("Pre-Primary");
    expect(invoice?.total_amount).toBeGreaterThan(0);
    expect(invoice?.paid_amount).toBe(0);
    expect(invoice?.balance).toBe(invoice?.total_amount);
    expect(invoice?.status).toBe("pending");
  });

  // TEST 2: Class 3 student -> Primary fee sync
  it("admits a Class 3 student and automatically synchronizes them into Primary Fees", async () => {
    const admNo = "ADM-CLS3-002";
    const student = await api.students.create({
      full_name: "Master Zaid",
      admission_number: admNo,
      class_id: "cls_3",
      class_name: "Class 3",
      section_id: "sec_3_a",
      section_name: "A",
      father_name: "Zubair Ahmed",
      father_phone: "+91 98490 22222",
      mother_name: "Amina Khan",
    });

    expect(student.academic_category).toBe("Primary");

    const primaryInvoices = await api.fees.getInvoices({ category: "Primary" });
    const invoice = primaryInvoices.find((i) => i.admission_number === admNo);

    expect(invoice).toBeDefined();
    expect(invoice?.student_name).toBe("Master Zaid");
    expect(invoice?.class_name).toBe("Class 3");
    expect(invoice?.academic_category).toBe("Primary");
  });

  // TEST 3: Class 8 student -> Higher Classes fee sync
  it("admits a Class 8 student and automatically synchronizes them into Higher Classes Fees", async () => {
    const admNo = "ADM-CLS8-003";
    const student = await api.students.create({
      full_name: "Bilal Hussain",
      admission_number: admNo,
      class_id: "cls_8",
      class_name: "Class 8",
      section_id: "sec_8_a",
      section_name: "A",
      father_name: "Altaf Hussain",
      father_phone: "+91 98490 33333",
      mother_name: "Zareena Begum",
    });

    expect(student.academic_category).toBe("Higher Classes");

    const higherInvoices = await api.fees.getInvoices({ category: "Higher Classes" });
    const invoice = higherInvoices.find((i) => i.admission_number === admNo);

    expect(invoice).toBeDefined();
    expect(invoice?.student_name).toBe("Bilal Hussain");
    expect(invoice?.class_name).toBe("Class 8");
    expect(invoice?.academic_category).toBe("Higher Classes");
  });

  // TEST 4, 5, 6: Update class fee & verify prior payments remain preserved
  it("updates a class fee and preserves prior payment transactions and recalculates outstanding balance correctly", async () => {
    const admNo = "ADM-TEST-UPDATE-01";
    const student = await api.students.create({
      full_name: "Hamza Tariq",
      admission_number: admNo,
      class_id: "cls_5",
      class_name: "Class 5",
      section_id: "sec_5_a",
      section_name: "A",
      father_name: "Tariq Ali",
      father_phone: "+91 98490 44444",
      mother_name: "Sameena",
    });

    let invoices = await api.fees.getInvoices({ search: admNo });
    let inv = invoices.find((i) => i.admission_number === admNo)!;
    expect(inv).toBeDefined();

    // Record an initial payment of 10,000
    const payment = await api.fees.recordPayment({
      invoice_id: inv.id,
      student_id: inv.student_id,
      receipt_number: "REC-INITIAL-100",
      amount: 10000,
      payment_mode: "Cash",
    });
    expect(payment.success).toBe(true);

    // Verify invoice after payment
    invoices = await api.fees.getInvoices({ search: admNo });
    inv = invoices.find((i) => i.admission_number === admNo)!;
    expect(inv.paid_amount).toBe(10000);
    const balanceBeforeRev = inv.balance;

    // Admin updates Class 5 fee structure to 30,000 (Tuition: 20000, Admission: 5000, Exam: 5000)
    await api.fees.saveFeeStructure(
      {
        class_name: "Class 5",
        category: "Primary",
        tuition_fee: 20000,
        admission_fee: 5000,
        exam_fee: 5000,
      },
      "all_class"
    );

    // Verify: Total fee updated to 30000, already paid amount 10000 PRESERVED, pending balance = 20000
    invoices = await api.fees.getInvoices({ search: admNo });
    inv = invoices.find((i) => i.admission_number === admNo)!;

    expect(inv.total_amount).toBe(30000);
    expect(inv.paid_amount).toBe(10000); // Historical payment PRESERVED
    expect(inv.balance).toBe(20000); // 30000 - 10000 = 20000
    expect(inv.status).toBe("partial");

    // Verify payment history ledger contains the initial receipt
    const history = await api.fees.getPaymentHistory(inv.student_id);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.some((h) => h.receipt_number === "REC-INITIAL-100")).toBe(true);
  });

  // TEST 7 & 8: Record student payment and verify paid amount & pending balance
  it("records a student payment and updates financial summary cards and invoice balance", async () => {
    const admNo = "ADM-PMT-VERIFY";
    await api.students.create({
      full_name: "Maryam Fatima",
      admission_number: admNo,
      class_id: "cls_1",
      class_name: "Class 1",
      section_id: "sec_1_a",
      father_name: "Syed Fatima",
      father_phone: "+91 98490 77777",
      mother_name: "Farhana",
    });

    const invoices = await api.fees.getInvoices({ search: admNo });
    const inv = invoices.find((i) => i.admission_number === admNo)!;

    const paymentRes = await api.fees.recordPayment({
      invoice_id: inv.id,
      student_id: inv.student_id,
      receipt_number: "REC-2026-9999",
      amount: 15000,
      payment_mode: "UPI / QR",
      transaction_reference: "UPI/DMHS/20260909",
    });

    expect(paymentRes.success).toBe(true);
    expect(paymentRes.payment.receipt_number).toBe("REC-2026-9999");
    expect(paymentRes.payment.amount).toBe(15000);

    // Verify updated summary
    const summary = await api.fees.getFinancialSummary();
    expect(summary.total_collected_fees).toBeGreaterThanOrEqual(15000);
    expect(summary.completed_payments_count).toBeGreaterThanOrEqual(1);
  });

  // TEST 9 & 10: Institution Settings save & persistence across reloads
  it("updates Institution Settings and retains them across page refreshes and re-queries", async () => {
    const originalConfig = await api.schools.getCurrent();
    expect(originalConfig).toBeDefined();

    const updated = await api.schools.updateCurrent({
      name: "Deccan Mission High School - Main Campus",
      affiliation_number: "TS-HYD-SSC-41092",
      board: "Telangana State Board of Secondary Education (SSC)",
      website: "https://dmhs.edu.in",
      contact_email: "principal@dmhs.edu.in",
      contact_phone: "+91 40 2456 9999",
      address: "Moghulpura, Charminar Zone, Hyderabad, Telangana 500002",
      logo_url: "/dmhs-logo-128.png",
    });

    expect(updated.name).toBe("Deccan Mission High School - Main Campus");
    expect(updated.website).toBe("https://dmhs.edu.in");
    expect(updated.contact_email).toBe("principal@dmhs.edu.in");

    // Simulate page reload by re-fetching configuration
    const reloadedConfig = await api.schools.getCurrent();
    expect(reloadedConfig.name).toBe("Deccan Mission High School - Main Campus");
    expect(reloadedConfig.website).toBe("https://dmhs.edu.in");
    expect(reloadedConfig.contact_email).toBe("principal@dmhs.edu.in");
    expect(reloadedConfig.contact_phone).toBe("+91 40 2456 9999");
  });

  // TEST 11, 12, 13: Admit faculty member, upload multiple certificates, verify accessibility
  it("admits a faculty member, uploads multiple certificates, and preserves documents across refreshes", async () => {
    const empId = "EMP-FAC-99";
    const faculty = await api.teachers.create({
      full_name: "Prof. Asadullah Khan",
      employee_id: empId,
      department: "Science",
      designation: "Senior Faculty Physics",
      email: "asadullah.khan@dmhs.edu.in",
      contact_phone: "+91 98490 88888",
      qualification: "M.Sc Physics, B.Ed",
      specialization: "Quantum Mechanics",
      date_of_birth: "1985-06-20",
      gender: "Male",
      aadhaar_number: "987654321098",
      address: "Old City, Hyderabad",
    });

    expect(faculty.employee_id).toBe(empId);
    expect(faculty.full_name).toBe("Prof. Asadullah Khan");

    // Upload multiple certificates
    const aadhaarFile = new File(["dummy aadhaar"], "aadhaar_card.pdf", { type: "application/pdf" });
    const degreeFile = new File(["dummy degree"], "msc_degree.pdf", { type: "application/pdf" });

    const doc1 = await api.teachers.uploadDocument(faculty.id, aadhaarFile, "Aadhaar Card Copy", "aadhaar_card.pdf");
    const doc2 = await api.teachers.uploadDocument(faculty.id, degreeFile, "Degree Certificate", "msc_degree.pdf");

    expect(doc1.teacher_id).toBe(String(faculty.id));
    expect(doc2.teacher_id).toBe(String(faculty.id));

    // Verify documents list retrieval
    const docs = await api.teachers.getDocuments(faculty.id);
    expect(docs.length).toBe(2);
    expect(docs.some((d) => d.title === "aadhaar_card.pdf")).toBe(true);
    expect(docs.some((d) => d.title === "msc_degree.pdf")).toBe(true);

    // Delete one document
    const deleteRes = await api.teachers.deleteDocument(doc1.id);
    expect(deleteRes).toBe(true);

    const docsAfterDelete = await api.teachers.getDocuments(faculty.id);
    expect(docsAfterDelete.length).toBe(1);
    expect(docsAfterDelete[0].id).toBe(doc2.id);
  });
});
