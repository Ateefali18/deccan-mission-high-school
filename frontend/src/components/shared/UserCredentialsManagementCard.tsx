import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Search,
  Mail,
  Shield,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Send,
  Lock,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { api } from "../../services/api";
import type { UserCredentialItem, PasswordResetLogItem } from "../../types";

export const UserCredentialsManagementCard: React.FC = () => {
  const [users, setUsers] = useState<UserCredentialItem[]>([]);
  const [logs, setLogs] = useState<PasswordResetLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TEACHER" | "STUDENT">("ALL");

  // Admin Generate / Set Password Modal
  const [selectedUser, setSelectedUser] = useState<UserCredentialItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const toast = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userList, auditLogs] = await Promise.all([
        api.admin.listUsersForCredentials(),
        api.admin.getPasswordResetAuditLogs(),
      ]);
      setUsers(userList);
      setLogs(auditLogs);
    } catch {
      toast.error("Failed to load user credentials registry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "Dmhs@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(pass);
  };

  const handleOpenSetPassword = (user: UserCredentialItem) => {
    setSelectedUser(user);
    handleGenerateRandomPassword();
    setIsModalOpen(true);
  };

  const handleSaveAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (customPassword.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.admin.setUserPassword(selectedUser.identifier, customPassword);
      toast.success(res.message || `Password generated for ${selectedUser.name}!`);
      setIsModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateOtpReset = async (user: UserCredentialItem) => {
    setActionLoadingId(user.id);
    try {
      const res = await api.admin.initiatePasswordReset(user.identifier);
      toast.success(
        res.message || `Password reset OTP dispatched to registered Gmail (${user.email}).`
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch reset OTP.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.identifier.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.academic_class && u.academic_class.toLowerCase().includes(q))
    );
  });

  return (
    <Card className="p-6 space-y-5 border border-light-border dark:border-dark-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-navy/10 dark:bg-brand-gold/15 text-brand-navy dark:text-brand-gold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
              User Credentials &amp; Password Management
            </h3>
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              Search faculty and admitted students, dispatch Gmail OTP resets, or generate new credentials
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadData}
          icon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh Users
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            placeholder="Search by student name, faculty name, admission no, EMP ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              roleFilter === "ALL"
                ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy shadow-sm"
                : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("TEACHER")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              roleFilter === "TEACHER"
                ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy shadow-sm"
                : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
            }`}
          >
            Faculty ({users.filter((u) => u.role === "TEACHER").length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("STUDENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              roleFilter === "STUDENT"
                ? "bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy shadow-sm"
                : "text-light-secondary dark:text-dark-secondary hover:text-light-primary"
            }`}
          >
            Students ({users.filter((u) => u.role === "STUDENT").length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-dark-elevated text-light-muted dark:text-dark-muted font-semibold uppercase tracking-wider border-b border-light-border dark:border-dark-border">
            <tr>
              <th className="py-3 px-4">User &amp; Role</th>
              <th className="py-3 px-4">School Identifier</th>
              <th className="py-3 px-4">Registered Gmail / Email</th>
              <th className="py-3 px-4">Class / Department</th>
              <th className="py-3 px-4">Reset Status</th>
              <th className="py-3 px-4 text-right">Credentials Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border dark:divide-dark-border bg-white dark:bg-dark-card">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-light-muted dark:text-dark-muted">
                  No matching user records found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-elevated/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand-blue/15 text-brand-blue dark:text-dark-accent font-bold text-xs flex items-center justify-center shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-light-primary dark:text-dark-primary block">
                          {user.name}
                        </span>
                        <Badge
                          variant={
                            user.role === "ADMIN"
                              ? "primary"
                              : user.role === "TEACHER"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-brand-navy dark:text-brand-gold">
                    {user.identifier}
                  </td>
                  <td className="py-3 px-4 text-light-secondary dark:text-dark-secondary">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-light-muted" />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-light-secondary dark:text-dark-secondary">
                    {user.academic_class || "—"}
                  </td>
                  <td className="py-3 px-4">
                    {user.last_reset_status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    ) : user.last_reset_status === "PENDING_VERIFICATION" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        OTP Dispatched
                      </span>
                    ) : (
                      <span className="text-[11px] text-light-muted dark:text-dark-muted">
                        Active Credentials
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInitiateOtpReset(user)}
                        disabled={actionLoadingId === user.id}
                        title="Send 6-digit OTP to user's registered Gmail"
                      >
                        <Send className="w-3.5 h-3.5 text-brand-blue mr-1" />
                        Send OTP
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenSetPassword(user)}
                        title="Generate or directly set password"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Set Password
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Password Reset Audit Logs Preview */}
      {logs.length > 0 && (
        <div className="pt-3 border-t border-light-border dark:border-dark-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
              Recent Password Security Events ({logs.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {logs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border text-xs flex items-start gap-2"
              >
                <Shield className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate text-light-primary dark:text-dark-primary">
                      {log.user_name}
                    </span>
                    <span className="text-[10px] text-light-muted">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-light-secondary dark:text-dark-secondary truncate">
                    {log.action.replace(/_/g, " ")} • {log.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Set or Generate Password */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Set Password for ${selectedUser?.name}`}
        description={`Configure portal sign-in credentials for ${selectedUser?.role} (${selectedUser?.identifier}).`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdminPassword} className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs text-light-primary dark:text-dark-primary">
            <span className="font-bold block mb-1">Account Information</span>
            <div>Identifier: <strong className="font-mono">{selectedUser?.identifier}</strong></div>
            <div>Registered Gmail: <strong>{selectedUser?.email}</strong></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase text-light-secondary dark:text-dark-secondary">
                New Password
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-xs text-brand-blue dark:text-dark-accent hover:underline flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Secure Password
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2 text-xs rounded-xl font-mono tracking-wider bg-light-input dark:bg-dark-input text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-light-muted hover:text-light-primary"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-light-secondary dark:text-dark-secondary mt-1">
              The user can sign in immediately using this password and their ID or Gmail.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save New Credentials
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
};
