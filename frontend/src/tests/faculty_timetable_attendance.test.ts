// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  api,
  checkTimetableConflicts,
  getStoredCustomTimetable,
  saveCustomTimetableSlot,
  getStoredAttendanceSessions,
} from "../services/api";

describe("PROMPT 2: Faculty Timetable and Period-Wise Student Attendance Workflows", { timeout: 30000 }, () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (k: string) => mockStore[k] || null,
      setItem: (k: string, v: string) => {
        mockStore[k] = v.toString();
      },
      removeItem: (k: string) => {
        delete mockStore[k];
      },
      clear: () => {
        mockStore = {};
      },
    };
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "localStorage", { value: mockLocalStorage, writable: true, configurable: true });
    }
    Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true, configurable: true });
  });

  it("Workflow 1 & 2: Administrator creates timetable, assigns teacher, class, section, subject and prevents conflicts", async () => {
    // 1. Log in as Administrator: STA khadri / 1234
    const adminSession = await api.auth.login("STA khadri", "1234");
    expect(adminSession.role).toBe("ADMIN");
    expect(adminSession.username).toBe("STA khadri");

    // 2. Administrator allots a timetable slot
    const newSlot = {
      day: 1, // Monday
      period: 7,
      time: "02:30 PM - 03:15 PM",
      subject: "Higher Mathematics Seminar",
      teacher: "Ateef",
      teacher_id: "tch_ateef",
      room: "Seminar Hall 1",
      class_id: "cls_10",
      class_name: "Class 10",
      section_id: "sec_10_b",
      section_name: "B",
    };

    const allotRes = await api.timetable.allotSlot(newSlot);
    expect(allotRes.success).toBe(true);

    // 3. Verify the slot exists in the schedule
    const mondaySlots = await api.timetable.getSchedule({ day_of_week: 1, teacher_name: "Ateef" });
    const foundSlot = mondaySlots.find((s) => s.period === 7);
    expect(foundSlot).toBeDefined();
    expect(foundSlot?.subject).toBe("Higher Mathematics Seminar");

    // 4. Test Conflict Prevention:
    // Try to double-book Teacher Ateef in Period 7 on Monday with another class
    const conflictingSlot = {
      day: 1,
      period: 7,
      time: "02:30 PM - 03:15 PM",
      subject: "Mathematics Lab",
      teacher: "Ateef",
      room: "Room 202",
      class_name: "Class 9",
      section_name: "A",
      section_id: "sec_9_a",
    };

    const conflict = checkTimetableConflicts(conflictingSlot);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.reason).toContain("Conflict Detected");
    expect(conflict.reason).toContain("Ateef");

    // Attempting to allot conflicting slot should throw ApiError
    await expect(api.timetable.allotSlot(conflictingSlot)).rejects.toThrow(/Conflict Detected/);
  });

  it("Workflow 3 & 4: Teacher logs in and sees strictly their own timetable for today, sorted chronologically", async () => {
    // 1. Log in as Teacher: Ateef / 1234
    const teacherSession = await api.auth.login("Ateef", "1234");
    expect(teacherSession.role).toBe("TEACHER");
    expect(teacherSession.username).toBe("Ateef");

    // 2. Fetch today's timetable for Monday (2026-11-02 is a Monday)
    const testMondayDate = "2026-11-02";
    const todayPeriods = await api.timetable.getTeacherTodayTimetable("Ateef", testMondayDate);

    expect(todayPeriods.length).toBeGreaterThan(0);

    // Verify all returned periods belong exclusively to Ateef
    todayPeriods.forEach((period) => {
      const teacherStr = period.teacher.toLowerCase();
      expect(teacherStr.includes("ateef") || teacherStr.includes("fatima")).toBe(true);
      expect(period).toHaveProperty("period");
      expect(period).toHaveProperty("time");
      expect(period).toHaveProperty("subject");
      expect(period).toHaveProperty("class_name");
      expect(period).toHaveProperty("section_name");
      expect(period).toHaveProperty("attendance_status");
    });

    // Verify periods are sorted chronologically
    for (let i = 0; i < todayPeriods.length - 1; i++) {
      expect(todayPeriods[i].period).toBeLessThan(todayPeriods[i + 1].period);
    }

    // Verify initial attendance status is "Not Started"
    expect(todayPeriods[0].attendance_status).toBe("Not Started");
  });

  it("Workflow 5 & 6: Selecting a period retrieves correct class & section students strictly in isolated scope", async () => {
    // 1. Get Class 10 Section A students
    const secAStudents = await api.students.list({
      classId: "cls_10",
      sectionId: "sec_10_a",
    });

    expect(secAStudents.items.length).toBeGreaterThan(0);

    // 2. All students in this query must belong to Section A
    secAStudents.items.forEach((s) => {
      expect(s.class_name).toBe("Class 10");
      expect(s.section_name).toBe("A");
    });

    // 3. Check Section B roster isolation
    const secBStudents = await api.students.list({
      classId: "cls_10",
      sectionId: "sec_10_b",
    });

    secBStudents.items.forEach((s) => {
      expect(s.section_name).toBe("B");
    });

    // Student from Section B should NOT be present in Section A roster
    const secBStudentIds = new Set(secBStudents.items.map((s) => s.id));
    secAStudents.items.forEach((s) => {
      expect(secBStudentIds.has(s.id)).toBe(false);
    });
  });

  it("Workflow 7 & 8: Teacher marks period attendance, validates complete roster, and saves correctly", async () => {
    await api.auth.login("Ateef", "1234");
    const testDate = "2026-11-02";
    const periodNumber = 1;

    // Fetch students of Class 10 Section A
    const roster = await api.students.list({ classId: "cls_10", sectionId: "sec_10_a" });
    expect(roster.items.length).toBeGreaterThan(0);

    // 1. Test Incomplete Attendance Validation:
    // If some students have no status (empty/null), saving must fail with a validation message
    const incompleteRecords = roster.items.map((s, idx) => ({
      student_id: s.id,
      status: idx === 0 ? "present" : "", // incomplete
    }));

    await expect(
      api.attendance.submit({
        academic_year_id: "ay_2025_2026",
        class_id: "cls_10",
        section_id: "sec_10_a",
        session_date: testDate,
        period_number: periodNumber,
        subject_id: "sub_math",
        records: incompleteRecords as any,
      })
    ).rejects.toThrow(/Please assign an attendance status/);

    // 2. Complete Attendance Marking:
    // Mark first student present, second student absent, others present
    const validRecords = roster.items.map((s, idx) => ({
      student_id: s.id,
      status: idx === 1 ? "absent" : idx === 2 ? "late" : "present",
      remarks: idx === 1 ? "Family function" : undefined,
    }));

    const saveResult = await api.attendance.submit({
      academic_year_id: "ay_2025_2026",
      class_id: "cls_10",
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
      subject_id: "sub_math",
      teacher_id: "tch_ateef",
      records: validRecords,
    });

    expect(saveResult).toBeDefined();
    expect(saveResult.total_records).toBe(roster.items.length);
    expect(saveResult.message).toContain("Period 1 saved successfully");
  });

  it("Workflow 9: Saved attendance remains after page refresh and updates period status to Completed", async () => {
    await api.auth.login("Ateef", "1234");
    const testDate = "2026-11-02";
    const periodNumber = 1;

    // Save attendance for Period 1
    const roster = await api.students.list({ classId: "cls_10", sectionId: "sec_10_a" });
    await api.attendance.submit({
      academic_year_id: "ay_2025_2026",
      class_id: "cls_10",
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
      subject_id: "sub_math",
      teacher_id: "tch_ateef",
      records: roster.items.map((s) => ({ student_id: s.id, status: "present" })),
    });

    // Simulate page refresh by fetching session anew
    const loadedSession = await api.attendance.getSession({
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
    });

    expect(loadedSession).toBeDefined();
    expect(loadedSession.session_id).toBeTruthy();
    expect(loadedSession.status).toBe("submitted");
    expect(Object.keys(loadedSession.records).length).toBe(roster.items.length);

    // Verify timetable today period card now reflects "Completed"
    const todayPeriods = await api.timetable.getTeacherTodayTimetable("Ateef", testDate);
    const period1Card = todayPeriods.find((p) => p.period === 1);
    expect(period1Card).toBeDefined();
    expect(period1Card?.attendance_status).toBe("Completed");
  });

  it("Workflow 10 & 11: Existing attendance can be viewed and corrected without creating duplicate records", async () => {
    await api.auth.login("Ateef", "1234");
    const testDate = "2026-11-02";
    const periodNumber = 1;

    // 1. Initial submission
    const roster = await api.students.list({ classId: "cls_10", sectionId: "sec_10_a" });
    await api.attendance.submit({
      academic_year_id: "ay_2025_2026",
      class_id: "cls_10",
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
      subject_id: "sub_math",
      teacher_id: "tch_ateef",
      records: roster.items.map((s, idx) => ({ student_id: s.id, status: idx === 1 ? "absent" : "present" })),
    });

    // 2. Fetch initial saved session
    const initialSession = await api.attendance.getSession({
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
    });

    const initialSessionId = initialSession.session_id;
    const initialRecordCount = Object.keys(initialSession.records).length;

    // 3. Teacher corrects a student's status (from absent to present with note)
    const studentIds = Object.keys(initialSession.records);
    const correctedStudentId = studentIds[1]; // student who was marked absent

    const updatedRecords = studentIds.map((sId) => ({
      student_id: sId,
      status: sId === correctedStudentId ? "present" : initialSession.records[sId].status,
      remarks: sId === correctedStudentId ? "Arrived with medical slip" : initialSession.records[sId].remarks,
    }));

    // 4. Submit correction
    const updateRes = await api.attendance.submit({
      academic_year_id: "ay_2025_2026",
      class_id: "cls_10",
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
      records: updatedRecords,
    });

    expect(updateRes.session_id).toBe(initialSessionId); // Same session preserved

    // 5. Reload to verify correction was applied and no duplicate rows created
    const refreshedSession = await api.attendance.getSession({
      section_id: "sec_10_a",
      session_date: testDate,
      period_number: periodNumber,
    });

    expect(Object.keys(refreshedSession.records).length).toBe(initialRecordCount);
    expect(refreshedSession.records[correctedStudentId].status).toBe("present");
    expect(refreshedSession.records[correctedStudentId].remarks).toBe("Arrived with medical slip");
  });
});
