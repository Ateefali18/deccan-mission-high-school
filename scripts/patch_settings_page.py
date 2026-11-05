with open("frontend/src/pages/settings/SettingsPage.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace imports
old_import = """import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award, Smartphone, Key, ShieldAlert, CheckCircle2, Copy } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";"""

new_import = """import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award, Smartphone, Key, ShieldAlert, CheckCircle2, Copy, Trash2, AlertTriangle } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { ChangePasswordCard } from "../../components/shared/ChangePasswordCard";"""

# Add Reset state
old_state = """  const [recoveryCodes] = useState([
    "DMHS-RECOVERY-2026",
    "DMHS-AUTH-41092",
    "DMHS-SEC-8821",
    "DMHS-BAK-9901",
  ]);

  const toast = useToast();"""

new_state = """  const [recoveryCodes] = useState([
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
  };"""

# Add ChangePasswordCard and Reset Data Card before the end of form
old_cards = """        {/* Brand & Theme Rules */}
        <Card className="p-6 space-y-4 bg-brand-pale/30 dark:bg-dark-elevated/40 border border-brand-blue/20">
          <h3 className="text-sm font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-blue" /> Institutional Design Standards & Royal Navy Tokens
          </h3>
          <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
            Deccan Mission High School ERP enforces high-contrast Royal Navy (#142B4A), Professional Blue (#2563EB), and Deep Navy (#0B1730) design standards for compliance with national educational management benchmarks.
          </p>
        </Card>
      </form>
    </div>"""

new_cards = """        {/* Administrator Change Password */}
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
    </div>"""

text_norm = text.replace("\\r\\n", "\\n")
assert old_import.replace("\\r\\n", "\\n") in text_norm, "old_import not found"
text_norm = text_norm.replace(old_import.replace("\\r\\n", "\\n"), new_import.replace("\\r\\n", "\\n"), 1)

assert old_state.replace("\\r\\n", "\\n") in text_norm, "old_state not found"
text_norm = text_norm.replace(old_state.replace("\\r\\n", "\\n"), new_state.replace("\\r\\n", "\\n"), 1)

assert old_cards.replace("\\r\\n", "\\n") in text_norm, "old_cards not found"
text_norm = text_norm.replace(old_cards.replace("\\r\\n", "\\n"), new_cards.replace("\\r\\n", "\\n"), 1)

with open("frontend/src/pages/settings/SettingsPage.tsx", "w", encoding="utf-8") as f:
    f.write(text_norm)

print("SUCCESS: Updated SettingsPage.tsx with ChangePassword and Reset Data")
