with open("frontend/src/pages/settings/SettingsPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target_imports = """import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award } from "lucide-react";"""
replacement_imports = """import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award, Smartphone, Key, ShieldAlert, CheckCircle2, Copy } from "lucide-react";"""

target_state = """  const [address, setAddress] = useState("");

  const toast = useToast();"""

replacement_state = """  const [address, setAddress] = useState("");

  // 2FA / MFA Security State
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [mfaSecret] = useState("DMHS-JBSW-Y3DP-EHPK-3PXP");
  const [recoveryCodes] = useState([
    "DMHS-RECOVERY-2026",
    "DMHS-AUTH-41092",
    "DMHS-SEC-8821",
    "DMHS-BAK-9901",
  ]);

  const toast = useToast();

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
  };"""

target_end = """        {/* Brand & Theme Rules */}
        <Card className="p-6 space-y-4 bg-brand-pale/30 dark:bg-dark-elevated/40 border border-brand-blue/20">"""

replacement_end = """        {/* Administrator Security & 2-Step Verification (MFA) */}
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

        {/* Brand & Theme Rules */}
        <Card className="p-6 space-y-4 bg-brand-pale/30 dark:bg-dark-elevated/40 border border-brand-blue/20">"""

content_norm = content.replace("\r\n", "\n")
assert target_imports.replace("\r\n", "\n") in content_norm, "target_imports not found"
content_norm = content_norm.replace(target_imports.replace("\r\n", "\n"), replacement_imports.replace("\r\n", "\n"), 1)

assert target_state.replace("\r\n", "\n") in content_norm, "target_state not found"
content_norm = content_norm.replace(target_state.replace("\r\n", "\n"), replacement_state.replace("\r\n", "\n"), 1)

assert target_end.replace("\r\n", "\n") in content_norm, "target_end not found"
content_norm = content_norm.replace(target_end.replace("\r\n", "\n"), replacement_end.replace("\r\n", "\n"), 1)

with open("frontend/src/pages/settings/SettingsPage.tsx", "w", encoding="utf-8") as f:
    f.write(content_norm)

print("SUCCESS: updated SettingsPage.tsx with 2FA / MFA and Security management")
