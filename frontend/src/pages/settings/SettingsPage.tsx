import React, { useEffect, useState } from "react";
import { Settings, School, ShieldCheck, Mail, Phone, MapPin, Save, Award } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Toast";

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
  const [affiliationNo, setAffiliationNo] = useState("TS-HYD-CBSE-41092");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  const toast = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const data = await api.schools.getCurrent();
        setConfig(data);
        setSchoolName(data.name || "Deccan Mission High School");
        setAffiliationNo(data.affiliation_number || "TS-HYD-CBSE-41092");
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
        description="Manage school legal identification, CBSE affiliation credentials, official contact lines, and campus profile."
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
                <Badge variant="green">CBSE Board Affiliated</Badge>
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
                CBSE Affiliation Number *
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
    </div>
  );
};
