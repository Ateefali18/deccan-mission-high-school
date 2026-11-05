import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { api } from "../../services/api";

interface ChangePasswordCardProps {
  userRoleLabel?: string;
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({
  userRoleLabel = "Account",
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.auth.changePassword(currentPassword, newPassword);
      toast.success(res.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 space-y-4 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-navy/10 dark:bg-brand-gold/15 text-brand-navy dark:text-brand-gold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-light-primary dark:text-dark-primary">
              Security &amp; Change Password
            </h3>
            <p className="text-xs text-light-secondary dark:text-dark-secondary">
              Update your {userRoleLabel} portal sign-in credentials
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs text-brand-blue dark:text-dark-accent hover:underline flex items-center gap-1 font-semibold"
        >
          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showPasswords ? "Hide Passwords" : "Show Passwords"}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Current Password"
            type={showPasswords ? "text" : "password"}
            placeholder="Enter existing password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <Input
            label="New Password"
            type={showPasswords ? "text" : "password"}
            placeholder="Min. 4 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Confirm New Password"
            type={showPasswords ? "text" : "password"}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-between items-center pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-light-secondary dark:text-dark-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Updated password takes effect immediately for subsequent sign-ins.</span>
          </div>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Update Password
          </Button>
        </div>
      </form>
    </Card>
  );
};
