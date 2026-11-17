import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../services/api";
import { authRecoveryService } from "../services/authRecoveryService";

describe("User Credentials Registry & Settings Decoupling", () => {
  it("listUsersForCredentials returns an array without throwing", async () => {
    const users = await api.admin.listUsersForCredentials();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users.some((u) => u.role === "ADMIN")).toBe(true);
  });

  it("getPasswordResetAuditLogs returns an array without throwing", async () => {
    const logs = await api.admin.getPasswordResetAuditLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("adminSetUserPassword updates password and logs audit action", async () => {
    const res = await api.admin.setUserPassword("sta.khadri@dmhs.edu.in", "NewPass@1234");
    expect(res.success).toBe(true);
    expect(res.message).toBeDefined();

    const logs = await api.admin.getPasswordResetAuditLogs();
    expect(logs.some((l) => l.action === "ADMIN_FORCE_RESET")).toBe(true);
  });

  it("authRecoveryService direct methods work cleanly", async () => {
    const users = await authRecoveryService.listUsersForAdminCredentials();
    expect(Array.isArray(users)).toBe(true);
    const logs = await authRecoveryService.getAuditLogs();
    expect(Array.isArray(logs)).toBe(true);
  });
});
