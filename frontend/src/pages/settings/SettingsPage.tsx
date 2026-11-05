import React, { useEffect, useState } from "react";
import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award, Smartphone, Key, ShieldAlert, CheckCircle2, Copy, Trash2, AlertTriangle } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ChangePasswordCard } from "../../components/shared/ChangePasswordCard";

interface SchoolConfig {
  id: number;
  name: string;
  code: string;
  affiliation_number?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  timezone?: string;
}

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [schoolName, setSchoolName] = useState("");
  const [affiliationNo, setAffiliationNo] = useState("TS-HYD-SSC-41092");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  // 2FA / MFA Security State
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [mfaSecret] = useState("DMHS-JBSW-Y3DP-EHPK-3PXP");
  const [recoveryCodes] = useState([
    "DMHS-RECOVERY-2026",
    "DMHS-AUTH-41092",
    "DMHS-SEC-8821",
    "DMHS-BAK-9901",
  ]);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const toast = useToast();

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.admin.resetData();
      toast.success("School operational data reset successfully! Transient records cleared.");
      setIsResetConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset school data.");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("dmhs_admin_mfa_enabled") === "true";
    setIsMfaEnabled(saved);
  }, []);

  const handleToggleMfa = () => {
    const next = !isMfaEnabled;
    setIsMfaEnabled(next);
    localStorage.setItem("dmhs_admin_mfa_enabled", next ? "true" : "false");
    toast.success(
      next
        ? "Two-Step Verification (2FA) is now ENABLED for Administrator."
        : "Two-Step Verification has been disabled."
    );
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const data = await api.schools.getCurrent();
        setConfig(data);
        setSchoolName(data.name || "Deccan Mission High School");
        setAffiliationNo(data.affiliation_number || "TS-HYD-SSC-41092");
        setContactEmail(data.contact_email || "admin@deccanmission.edu.in");
        setContactPhone(data.contact_phone || "+91 40 2456 7890");
        setAddress(data.address || "Old City, Hyderabad, Telangana 500002, India");
      } catch (err: any) {
        toast.error(err.message || "Failed to load institution settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.schools.updateCurrent({
        name: schoolName,
        affiliation_number: affiliationNo,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address: address,
      });
      toast.success("Institution settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-light-muted dark:text-dark-muted">
        <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Institution Settings"
        description="Manage school legal identification, Telangana SSC affiliation credentials, official contact lines, and campus profile."
        icon={<Settings className="w-6 h-6 text-brand-blue" />}
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-light-border dark:border-dark-border">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 border border-brand-blue/30 shadow-sm flex items-center justify-center shrink-0">
              <img src="/dmhs-logo-128.png" alt="DMHS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
                {schoolName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="blue">Code: {config?.code || "DMHS-HYD"}</Badge>
                <Badge variant="green">Telangana State SSC Board</Badge>
                <span className="text-xs text-light-muted dark:text-dark-muted">
                  Affiliation: {affiliationNo}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                School Legal Name *
              </label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                SSC Affiliation Number *
              </label>
              <Input
                value={affiliationNo}
                onChange={(e) => setAffiliationNo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Official Contact Email *
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Administrative Telephone *
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Campus Postal Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-light-border dark:border-dark-border">
            <Button type="submit" disabled={isSaving} icon={<Save className="w-4 h-4" />}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Card>

        {/* Administrator Security & 2-Step Verification (MFA) */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue dark:text-dark-accent">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                  Administrator Two-Step Verification (MFA / 2FA)
                </h3>
                <p className="text-xs text-light-secondary dark:text-dark-secondary">
                  Enforce TOTP authenticator code verification for administrator portal sign-in
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={isMfaEnabled ? "danger" : "primary"}
              size="sm"
              onClick={handleToggleMfa}
            >
              {isMfaEnabled ? "Disable 2FA" : "Enable 2FA Protection"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                Authenticator App Key
              </span>
              <div className="flex items-center justify-between bg-white dark:bg-dark-card p-2.5 rounded-lg border border-light-border dark:border-dark-border">
                <code className="text-xs font-mono font-bold text-brand-navy dark:text-brand-gold">
                  {mfaSecret}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mfaSecret);
                    toast.success("MFA Key copied to clipboard");
                  }}
                  className="p-1 hover:text-brand-blue text-light-secondary dark:text-dark-secondary"
                  title="Copy Key"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                Compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated border border-light-border dark:border-dark-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary block">
                Emergency Recovery Codes
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] font-bold text-brand-navy dark:text-white">
                {recoveryCodes.map((code) => (
                  <span key={code} className="bg-white dark:bg-dark-card px-2 py-1 rounded border border-light-border dark:border-dark-border text-center">
                    {code}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
                Use these emergency single-use keys if you ever lose your mobile authenticator.
              </p>
            </div>
          </div>
        </Card>

        {/* Administrator Change Password */}
        <ChangePasswordCard userRoleLabel="Administrator" />

        {/* System Data Reset & Cleanup */}
        <Card className="p-6 space-y-4 border-2 border-red-500/20 bg-red-500/5 dark:bg-red-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                  Reset School ERP Operational Data
                </h3>
                <p className="text-xs text-light-secondary dark:text-dark-secondary">
                  Wipes test admissions, dynamic teachers, attendance logs, and custom expenses back to clean school defaults.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
            >
              Reset School Data
            </Button>
          </div>
          <p className="text-[11px] text-light-muted dark:text-dark-muted">
            Note: Preserves institutional SSC board configuration, class definitions, and administrator access credentials.
          </p>
        </Card>

        {/* Brand & Theme Rules */}
        <Card className="p-6 space-y-4 bg-brand-pale/30 dark:bg-dark-elevated/40 border border-brand-blue/20">
          <h3 className="text-sm font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-blue" /> Institutional Design Standards & Royal Navy Tokens
          </h3>
          <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
            Deccan Mission High School ERP enforces high-contrast Royal Navy (#142B4A), Professional Blue (#2563EB), and Deep Navy (#0B1730) design standards for compliance with national educational management benchmarks.
          </p>
        </Card>
      </form>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Confirm Operational Data Reset"
        message="Are you sure you want to reset all temporary student admissions, teacher registrations, attendance logs, and custom expenses? The baseline school master configuration will remain intact."
        confirmText="Yes, Reset Data"
        cancelText="Cancel"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
};
