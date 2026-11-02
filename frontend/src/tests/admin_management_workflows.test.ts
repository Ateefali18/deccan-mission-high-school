// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  api,
  ApiError,
  getStoredCustomClasses,
  getStoredCustomSubjects,
  getStoredClassSubjectAssignments,
} from "../services/api";

describe("Prompt 1: Administrator Academic Management & SSC Workflows", { timeout: 30000 }, () => {
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

  // Workflow 1: Administrator adds a class & duplicate prevention
  it("Workflow 1: Administrator can add classes and duplicate class names are blocked", async () => {
    // Log in as STA Khadri (Admin)
    await api.auth.login("STA khadri", "1234");
    expect(localStorage.getItem("dmhs_demo_role")).toBe("ADMIN");

    // Add Class 11
    const newClass = await api.classes.create({
      name: "Class 11",
      grade_level: 11,
      stream: "Science",
    });

    expect(newClass).toBeDefined();
    expect(newClass.name).toBe("Class 11");
    expect(newClass.grade_level).toBe(11);

    // Verify it appears in classes.list()
    const all = await api.classes.list();
    const found = all.find((c) => c.name === "Class 11");
    expect(found).toBeDefined();

    // Verify duplicate class creation in same academic year is blocked
    await expect(
      api.classes.create({
        name: "Class 11",
        grade_level: 11,
      })
    ).rejects.toThrow(/already exists/i);
  });

  // Workflow 2: Administrator creates sections under that class & duplicate prevention
  it("Workflow 2: Administrator can create sections under a class and duplicate sections are blocked", async () => {
    await api.auth.login("STA khadri", "1234");

    const createdClass = await api.classes.create({
      name: "Class 12",
      grade_level: 12,
      stream: "General",
    });

    // Add Section A
    const secA = await api.classes.createSection(createdClass.id, {
      name: "A",
      room_number: "Room 501",
      capacity: 35,
    });
    expect(secA).toBeDefined();
    expect(secA.name).toBe("A");
    expect(secA.room_number).toBe("Room 501");

    // Add Section B
    const secB = await api.classes.createSection(createdClass.id, {
      name: "B",
      room_number: "Room 502",
      capacity: 40,
    });
    expect(secB.name).toBe("B");

    // Verify both sections are listed under Class 12
    const all = await api.classes.list();
    const updatedClass = all.find((c) => String(c.id) === String(createdClass.id));
    expect(updatedClass?.sections?.length).toBe(2);

    // Attempting duplicate section 'A' in the same class must be rejected
    await expect(
      api.classes.createSection(createdClass.id, {
        name: "A",
        capacity: 40,
      })
    ).rejects.toThrow(/already exists/i);
  });

  // Workflow 3: Administrator adds subjects and assigns them to classes
  it("Workflow 3: Administrator can add subjects and associate them with classes", async () => {
    await api.auth.login("STA khadri", "1234");

    // Add SSC subject
    const subject = await api.subjects.create({
      name: "Physical Science",
      code: "PSC-301",
      department: "Science",
    });
    expect(subject).toBeDefined();
    expect(subject.code).toBe("PSC-301");

    // Verify it is in catalog
    const catalog = await api.subjects.list();
    const foundSub = catalog.find((s) => s.code === "PSC-301");
    expect(foundSub).toBeDefined();

    // Prevent duplicate subject code
    await expect(
      api.subjects.create({
        name: "Duplicate Science",
        code: "PSC-301",
      })
    ).rejects.toThrow(/already registered/i);

    // Associate subject with Class 10
    const classes = await api.classes.list();
    const class10 = classes.find((c) => c.name === "Class 10") || classes[0];

    const assignment = await api.subjects.assignToClass(class10.id, subject.id, false);
    expect(assignment).toBeDefined();
    expect(String(assignment.class_id)).toBe(String(class10.id));

    // Verify subject is retrieved by class
    const classSubs = await api.subjects.list(class10.id);
    const assignedSub = classSubs.find((s) => s.code === "PSC-301" || String(s.id) === String(subject.id));
    expect(assignedSub).toBeDefined();
  });

  // Workflow 4: Administrator edits a class
  it("Workflow 4: Administrator can edit a class", async () => {
    await api.auth.login("STA khadri", "1234");

    const newClass = await api.classes.create({
      name: "Class 5",
      grade_level: 5,
      stream: "General",
    });

    const updated = await api.classes.update(newClass.id, {
      name: "Class 5 Primary",
      stream: "Integrated SSC",
    });
    expect(updated.name).toBe("Class 5 Primary");
    expect(updated.stream).toBe("Integrated SSC");

    const all = await api.classes.list();
    const found = all.find((c) => String(c.id) === String(newClass.id));
    expect(found?.name).toBe("Class 5 Primary");
  });

  // Workflow 5: Administrator edits a section
  it("Workflow 5: Administrator can edit a section", async () => {
    await api.auth.login("STA khadri", "1234");

    const cls = await api.classes.create({
      name: "Class 4",
      grade_level: 4,
    });

    const sec = await api.classes.createSection(cls.id, {
      name: "A",
      room_number: "Room 101",
      capacity: 35,
    });

    const updatedSec = await api.classes.updateSection(sec.id, {
      room_number: "Room 102 New Wing",
      capacity: 45,
    });

    expect(updatedSec.room_number).toBe("Room 102 New Wing");
    expect(updatedSec.capacity).toBe(45);
  });

  // Workflow 6: Changes remain after refreshing page (persistence verification)
  it("Workflow 6: Changes remain after refreshing the page (persistent storage)", async () => {
    await api.auth.login("STA khadri", "1234");

    await api.classes.create({
      name: "Class 3",
      grade_level: 3,
    });

    await api.subjects.create({
      name: "Environmental Studies",
      code: "EVS-101",
      department: "Science",
    });

    // Verify localStorage retains them
    const storedClasses = getStoredCustomClasses();
    expect(storedClasses.some((c) => c.name === "Class 3")).toBe(true);

    const storedSubjects = getStoredCustomSubjects();
    expect(storedSubjects.some((s) => s.code === "EVS-101")).toBe(true);

    // Call api.classes.list() and api.subjects.list() as if fresh page load
    const freshClasses = await api.classes.list();
    expect(freshClasses.some((c) => c.name === "Class 3")).toBe(true);

    const freshSubjects = await api.subjects.list();
    expect(freshSubjects.some((s) => s.code === "EVS-101")).toBe(true);
  });

  // Workflow 7: Unauthorized users cannot perform administrator-only operations
  it("Workflow 7: Unauthorized users (students and teachers) are blocked from admin operations", async () => {
    // 1. Teacher logs in (Ateef / 1234)
    await api.auth.login("Ateef", "1234");
    expect(localStorage.getItem("dmhs_demo_role")).toBe("TEACHER");

    // Teacher cannot add classes
    await expect(
      api.classes.create({ name: "Hacked Class", grade_level: 1 })
    ).rejects.toThrow(/Forbidden|Unauthorized/i);

    // Teacher cannot add sections
    await expect(
      api.classes.createSection("cls_10", { name: "X", capacity: 20 })
    ).rejects.toThrow(/Forbidden|Unauthorized/i);

    // Teacher cannot create subjects
    await expect(
      api.subjects.create({ name: "Hacked Subject", code: "HCK-999" })
    ).rejects.toThrow(/Forbidden|Unauthorized/i);

    // 2. Student logs in (Ali / 1234)
    await api.auth.login("Ali", "1234");
    expect(localStorage.getItem("dmhs_demo_role")).toBe("STUDENT");

    // Student cannot update or deactivate classes
    await expect(api.classes.deactivate("cls_10")).rejects.toThrow(/Forbidden|Unauthorized/i);

    // Student cannot deactivate subjects
    await expect(api.subjects.deactivate("sub_1")).rejects.toThrow(/Forbidden|Unauthorized/i);
  });
});
