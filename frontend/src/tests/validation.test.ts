import { describe, it, expect } from "vitest";
import { z } from "zod";

const studentSchema = z.object({
  admission_number: z.string().min(3, "Admission number is required"),
  full_name: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  class_id: z.coerce.number().min(1, "Please select a class"),
  section_id: z.coerce.number().min(1, "Please select a section"),
  academic_year_id: z.coerce.number().min(1, "Please select academic year"),
});

describe("Form Validation Schemas", () => {
  it("validates compliant student admission data", () => {
    const validData = {
      admission_number: "ADM-2025-0999",
      full_name: "Tariq Mahmood",
      username: "tariq.m",
      email: "tariq@dmhs.edu.in",
      password: "StrongPassword123",
      class_id: 1,
      section_id: 2,
      academic_year_id: 1,
    };
    const result = studentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid emails and short passwords", () => {
    const invalidData = {
      admission_number: "AD",
      full_name: "T",
      username: "ta",
      email: "invalid-email-string",
      password: "123",
      class_id: 0,
      section_id: 0,
      academic_year_id: 0,
    };
    const result = studentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issueFields = result.error.issues.map((i) => i.path[0]);
      expect(issueFields).toContain("email");
      expect(issueFields).toContain("password");
      expect(issueFields).toContain("admission_number");
    }
  });
});
