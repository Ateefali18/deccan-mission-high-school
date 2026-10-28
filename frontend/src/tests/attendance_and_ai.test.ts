import { describe, it, expect } from "vitest";

// Standardized school attendance formula verification
function calculateAttendancePercentage(
  present: number,
  late: number,
  absent: number,
  excused: number,
  lateWeight: number = 1.0,
  excusedInDenominator: boolean = false
): number {
  const attended = present + late * lateWeight;
  const denominator = excusedInDenominator
    ? present + late + absent + excused
    : present + late + absent;

  if (denominator <= 0) return 100.0;
  const pct = (attended / denominator) * 100.0;
  return Number(Math.min(100.0, Math.max(0.0, pct)).toFixed(2));
}

describe("Attendance Calculation Formula", () => {
  it("calculates 100% for full attendance", () => {
    expect(calculateAttendancePercentage(120, 0, 0, 0)).toBe(100.0);
  });

  it("calculates accurate percentage for mixed attendance", () => {
    expect(calculateAttendancePercentage(75, 5, 20, 0, 1.0)).toBe(80.0);
  });

  it("handles late weight weighting correctly", () => {
    // 70 present + (10 * 0.5) = 75 / 100 = 75.0%
    expect(calculateAttendancePercentage(70, 10, 20, 0, 0.5)).toBe(75.0);
  });

  it("excludes excused absences from denominator by default", () => {
    // 80 present, 10 absent, 10 excused => 80 / 90 = 88.89%
    expect(calculateAttendancePercentage(80, 0, 10, 10)).toBe(88.89);
  });

  it("identifies low attendance warning below 75%", () => {
    const pct = calculateAttendancePercentage(70, 0, 30, 0);
    expect(pct).toBe(70.0);
    expect(pct < 75.0).toBe(true);
  });
});
