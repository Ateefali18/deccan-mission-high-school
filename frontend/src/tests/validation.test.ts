import { describe, it, expect } from "vitest";
import { z } from "zod";

const studentSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  class_id: z.union([z.string().min(1, "Please select a class"), z.number().min(1, "Please select a class")]),
  section_id: z.union([z.string().min(1, "Please select a section"), z.number().min(1, "Please select a section")]),
  academic_year_id: z.union([z.string().min(1, "Please select academic year"), z.number().min(1, "Please select academic year")]),
});

describe("Form Validation Schemas", () => {
  it("validates compliant student admission data with numbers or strings for IDs", () => {
    const validDataNumeric = {
      admission_number: "ADM-2025-0999",
      full_name: "Tariq Mahmood",
      username: "tariq.m",
      email: "tariq@dmhs.edu.in",
      password: "StrongPassword123",
      class_id: 1,
      section_id: 2,
      academic_year_id: 1,
    };
    expect(studentSchema.safeParse(validDataNumeric).success).toBe(true);

    const validDataString = {
      admission_number: "ADM-2026-0042",
      full_name: "Farhan Qureshi",
      username: "farhan.q",
      email: "farhan@dmhs.edu.in",
      password: "StrongPassword123",
      class_id: "cls_10",
      section_id: "sec_10_a",
      academic_year_id: "ay_2026_27",
    };
    expect(studentSchema.safeParse(validDataString).success).toBe(true);
  });

  it("rejects invalid emails, short passwords, and empty IDs", () => {
    const invalidData = {
      admission_number: "AD",
      full_name: "T",
      username: "ta",
      email: "invalid-email-string",
      password: "123",
      class_id: "",
      section_id: "",
      academic_year_id: "",
    };
    const result = studentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issueFields = result.error.issues.map((i) => i.path[0]);
      expect(issueFields).toContain("email");
      expect(issueFields).toContain("password");
      expect(issueFields).toContain("admission_number");
      expect(issueFields).toContain("class_id");
      expect(issueFields).toContain("section_id");
      expect(issueFields).toContain("academic_year_id");
    }
  });
});

describe("Examination Marks Validation & SSC 9-Point Grading Scale", () => {
  const validateMarkEntry = (mark: number | null, isAbsent: boolean, maxMarks: number = 100) => {
    if (isAbsent) return { valid: true, error: null };
    if (mark === null || mark === undefined) return { valid: true, error: null };
    if (mark < 0) return { valid: false, error: "Marks cannot be negative" };
    if (mark > maxMarks) return { valid: false, error: `Marks cannot exceed max marks (${maxMarks})` };
    return { valid: true, error: null };
  };

  const getSSCGrade = (pct: number) => {
    if (pct >= 91) return "A1";
    if (pct >= 81) return "A2";
    if (pct >= 71) return "B1";
    if (pct >= 61) return "B2";
    if (pct >= 51) return "C1";
    if (pct >= 41) return "C2";
    if (pct >= 33) return "D";
    if (pct >= 21) return "E1";
    return "E2";
  };

  it("validates marks within allowed range and rejects marks exceeding max_marks", () => {
    expect(validateMarkEntry(95, false, 100).valid).toBe(true);
    expect(validateMarkEntry(0, false, 100).valid).toBe(true);
    expect(validateMarkEntry(-5, false, 100).valid).toBe(false);
    expect(validateMarkEntry(105, false, 100).valid).toBe(false);
    expect(validateMarkEntry(null, true, 100).valid).toBe(true); // Absent is valid
  });

  it("accurately computes standard SSC 9-point grade boundaries", () => {
    expect(getSSCGrade(95)).toBe("A1");
    expect(getSSCGrade(91)).toBe("A1");
    expect(getSSCGrade(90.5)).toBe("A2");
    expect(getSSCGrade(81)).toBe("A2");
    expect(getSSCGrade(75)).toBe("B1");
    expect(getSSCGrade(65)).toBe("B2");
    expect(getSSCGrade(55)).toBe("C1");
    expect(getSSCGrade(45)).toBe("C2");
    expect(getSSCGrade(35)).toBe("D");
    expect(getSSCGrade(28)).toBe("E1");
    expect(getSSCGrade(15)).toBe("E2");
  });
});
