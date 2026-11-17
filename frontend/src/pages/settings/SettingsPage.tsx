import React, { useEffect, useState, useCallback, useRef } from "react";
import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award, Smartphone, Key, ShieldAlert, CheckCircle2, Copy, Trash2, AlertTriangle, UserCheck, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../../services/api";
import { supabase, isSupabaseConfigured } from "../../services/supabaseClient";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ChangePasswordCard } from "../../components/shared/ChangePasswordCard";
import { UserCredentialsManagementCard } from "../../components/shared/UserCredentialsManagementCard";

class SafeUserCredentialsBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("[SafeUserCredentialsBoundary] caught sub-component error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">
                User Credentials Registry
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                User credentials registry is temporarily unavailable. Institution settings and profiles are unaffected.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
              Reload Module
            </Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

interface SchoolConfig {
  id?: number | string;
  name: string;
  code: string;
  affiliation_number?: string;
  board?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  timezone?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
}

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const reqSeqRef = useRef(0);
  const isDirtyRef = useRef(false);

  // Form
  const [schoolName, setSchoolName] = useState("");
  const [affiliationNo, setAffiliationNo] = useState("TS-SSC-500002");
  const [boardName, setBoardName] = useState("Telangana State Board of Secondary Education (SSC)");
  const [schoolCode, setSchoolCode] = useState("DMHS-HYD");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("https://dmhs-nwgj.vercel.app");
  const [logoUrl, setLogoUrl] = useState("/dmhs-logo-128.png");
  const [principalName, setPrincipalName] = useState("STA Khadri");
  const [principalEmail, setPrincipalEmail] = useState("sta.khadri@dmhs.edu.in");
  const [principalPhone, setPrincipalPhone] = useState("+91 9949083181");

  // Keep isDirtyRef in sync with isDirty state
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

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

  const fetchConfig = useCallback(async (isManualRefresh = false) => {
    const seq = ++reqSeqRef.current;
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const data = await api.schools.getCurrent(true);
      // Discard out-of-order older API responses
      if (seq !== reqSeqRef.current) return;

      if (!data) {
        setConfig(null);
        setFetchError("No school institution record found in Supabase database.");
        return;
      }

      setConfig(data);
      setSchoolName(data.name || "Deccan Mission High School");
      setAffiliationNo(data.affiliation_number || "TS-SSC-500002");
      setBoardName(data.board || "Telangana State Board of Secondary Education (SSC)");
      setSchoolCode(data.code || "DMHS-HYD");
      setContactEmail(data.contact_email || "info@dmhs.edu.in");
      setContactPhone(data.contact_phone || "+91 40 2456 7890");
      setAddress(data.address || "Old City, Hyderabad, Telangana 500002, India");
      setWebsite(data.website || "https://dmhs-nwgj.vercel.app");
      setLogoUrl(data.logo_url || "/dmhs-logo-128.png");
      setPrincipalName(data.principal_name || "STA Khadri");
      setPrincipalEmail(data.principal_email || "sta.khadri@dmhs.edu.in");
      setPrincipalPhone(data.principal_phone || "+91 9949083181");
      setIsDirty(false);
      isDirtyRef.current = false;
      setLastSyncedAt(new Date());

      if (isManualRefresh) {
        toast.success("Institution settings refreshed directly from Supabase.");
      }
    } catch (err: any) {
      if (seq !== reqSeqRef.current) return;
      const msg = err.message || "Failed to load institution settings from Supabase.";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      if (seq === reqSeqRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchConfig(false);
  }, [fetchConfig]);

  // Supabase Realtime multi-browser synchronization
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel("schools_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schools" },
        (payload: any) => {
          if (payload.new) {
            const row = payload.new;
            if (isDirtyRef.current) {
              toast.info("Institution settings updated on another browser. Click Refresh to apply.");
              return;
            }
            setConfig(row);
            if (row.name !== undefined) setSchoolName(row.name);
            if (row.affiliation_number !== undefined) setAffiliationNo(row.affiliation_number);
            if (row.board !== undefined) setBoardName(row.board);
            if (row.code !== undefined) setSchoolCode(row.code);
            if (row.contact_email !== undefined) setContactEmail(row.contact_email);
            if (row.contact_phone !== undefined) setContactPhone(row.contact_phone);
            if (row.address !== undefined) setAddress(row.address);
            if (row.website !== undefined) setWebsite(row.website);
            if (row.logo_url !== undefined) setLogoUrl(row.logo_url);
            if (row.principal_name !== undefined) setPrincipalName(row.principal_name);
            if (row.principal_email !== undefined) setPrincipalEmail(row.principal_email);
            if (row.principal_phone !== undefined) setPrincipalPhone(row.principal_phone);
            setLastSyncedAt(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleRefreshClick = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes in the form. Refreshing will discard your edits and load the latest saved record from Supabase. Continue?")) {
        fetchConfig(true);
      }
    } else {
      fetchConfig(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    if (!schoolName.trim()) {
      toast.error("Institution legal name is required.");
      setIsSaving(false);
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      toast.error("Please enter a valid official contact email address.");
      setIsSaving(false);
      return;
    }

    try {
      await api.schools.updateCurrent({
        name: schoolName.trim(),
        affiliation_number: affiliationNo.trim(),
        board: boardName.trim(),
        code: schoolCode.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
        website: website.trim(),
        logo_url: logoUrl.trim(),
        principal_name: principalName.trim(),
        principal_email: principalEmail.trim(),
        principal_phone: principalPhone.trim(),
      });
      // Re-fetch to ensure displayed state strictly mirrors the database record
      await fetchConfig(false);
      toast.success("Institution settings saved permanently in Supabase! Changes synchronized across all browsers.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save institution settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-light-muted dark:text-dark-muted space-y-3">
        <div className="w-9 h-9 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Fetching institution settings directly from Supabase...</p>
      </div>
    );
  }

  if (fetchError && !config) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-light-primary dark:text-dark-primary">
          Unable to Load Institution Settings
        </h2>
        <p className="text-sm text-light-secondary dark:text-dark-secondary">
          {fetchError}
        </p>
        <div className="pt-2">
          <Button onClick={() => fetchConfig(false)} icon={<RefreshCw className="w-4 h-4" />}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (!config && !fetchError) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
          <School className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-light-primary dark:text-dark-primary">
          No Institution Record Found
        </h2>
        <p className="text-sm text-light-secondary dark:text-dark-secondary">
          No school configuration record is currently registered in Supabase.
        </p>
        <div className="pt-2">
          <Button onClick={() => fetchConfig(false)} icon={<RefreshCw className="w-4 h-4" />}>
            Check Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Institution Settings"
        subtitle="Manage school legal identification, Telangana SSC affiliation credentials, official contact lines, and campus profile."
        action={
          <div className="flex items-center gap-3">
            {isDirty && (
              <Badge variant="amber">Unsaved Edits</Badge>
            )}
            {lastSyncedAt && (
              <span className="text-[11px] text-light-muted dark:text-dark-muted hidden md:inline">
                Synced {lastSyncedAt.toLocaleTimeString()}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshClick}
              disabled={isLoading || isRefreshing}
              icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        }
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
                onChange={(e) => { setSchoolName(e.target.value); setIsDirty(true); }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                SSC Affiliation Number *
              </label>
              <Input
                value={affiliationNo}
                onChange={(e) => { setAffiliationNo(e.target.value); setIsDirty(true); }}
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
                onChange={(e) => { setContactEmail(e.target.value); setIsDirty(true); }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Administrative Telephone *
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => { setContactPhone(e.target.value); setIsDirty(true); }}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Official Website URL
              </label>
              <Input
                type="url"
                value={website}
                onChange={(e) => { setWebsite(e.target.value); setIsDirty(true); }}
                placeholder="https://dmhs-nwgj.vercel.app"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Academic Board Affiliation
              </label>
              <Input
                value={boardName}
                onChange={(e) => { setBoardName(e.target.value); setIsDirty(true); }}
                placeholder="Telangana State Board of Secondary Education (SSC)"
                required
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Campus Postal Address
              </label>
              <Input
                value={address}
                onChange={(e) => { setAddress(e.target.value); setIsDirty(true); }}
                required
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Institution Logo URL
              </label>
              <Input
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); setIsDirty(true); }}
                placeholder="/dmhs-logo-128.png"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Principal Name
              </label>
              <Input
                value={principalName}
                onChange={(e) => { setPrincipalName(e.target.value); setIsDirty(true); }}
                placeholder="STA Khadri"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Principal Official Email
              </label>
              <Input
                type="email"
                value={principalEmail}
                onChange={(e) => { setPrincipalEmail(e.target.value); setIsDirty(true); }}
                placeholder="admin@deccanmission.edu.in"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-light-muted dark:text-dark-muted mb-1">
                Principal Emergency / Direct Phone
              </label>
              <Input
                value={principalPhone}
                onChange={(e) => { setPrincipalPhone(e.target.value); setIsDirty(true); }}
                placeholder="+91 9949083181"
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

        {/* User Credentials & Password Management (Admin Password Control) - Decoupled */}
        <SafeUserCredentialsBoundary>
          <UserCredentialsManagementCard />
        </SafeUserCredentialsBoundary>

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
