import React, { useEffect, useState } from "react";
import { GraduationCap, Mail, Phone, MapPin, User, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import type { StudentProfile } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { ChangePasswordCard } from "../../components/shared/ChangePasswordCard";

export const StudentProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.students
      .getMyProfile()
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Student Identity Profile"
        subtitle="Official school enrollment transcript and personal guardian records"
      />

      {isLoading ? (
        <Card className="p-8 animate-pulse bg-gray-100 dark:bg-dark-card h-64" />
      ) : profile ? (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-brand-gold/20 text-brand-gold border-2 border-brand-gold/40 flex items-center justify-center font-bold text-2xl shrink-0">
                <GraduationCap className="w-10 h-10" />
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-black text-light-primary dark:text-dark-primary tracking-tight">
                    {profile.full_name}
                  </h2>
                  <Badge variant={profile.student_status === "active" ? "success" : "neutral"} size="sm">
                    {profile.student_status}
                  </Badge>
                </div>

                <p className="text-xs font-mono font-bold text-brand-gold">
                  Admission No: {profile.admission_number}
                </p>

                <p className="text-xs text-light-secondary dark:text-dark-secondary flex items-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile.email}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Academic Enrollment */}
            <Card className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-2">
                Academic Enrollment
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Enrolled Class:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.class_name || profile.current_enrollment?.class_name || "Class 10"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Section:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    Section {profile.section_name || profile.current_enrollment?.section_name || "A"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Roll Number:</span>
                  <span className="font-bold font-mono text-light-primary dark:text-dark-primary">
                    {profile.roll_number || profile.current_enrollment?.roll_number || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Academic Year:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.current_enrollment?.academic_year_name || "2025-2026"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-light-secondary dark:text-dark-secondary">Admission Date:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.admission_date || "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Personal & Demographic Details */}
            <Card className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-2">
                Personal Identity
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Date of Birth:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.date_of_birth || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Gender:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary capitalize">
                    {profile.gender || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Blood Group:</span>
                  <span className="font-bold text-brand-gold">
                    {profile.blood_group || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Religion / Caste:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.religion ? `${profile.religion}${profile.caste ? ` (${profile.caste})` : ""}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Mother Tongue:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.mother_tongue || "Urdu"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Aadhaar No:</span>
                  <span className="font-bold font-mono text-light-primary dark:text-dark-primary">
                    {profile.aadhaar_number || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-light-secondary dark:text-dark-secondary">APAAR ID:</span>
                  <span className="font-bold font-mono text-light-primary dark:text-dark-primary">
                    {profile.apaar_id || "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Parent & Contact Information */}
            <Card className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy dark:text-brand-gold border-b border-light-border dark:border-dark-border pb-2">
                Parent &amp; Family Info
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Father's Name:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.father_name || profile.guardian_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Father's Phone:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.father_phone || profile.guardian_phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Mother's Name:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.mother_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border/50 dark:border-dark-border/50">
                  <span className="text-light-secondary dark:text-dark-secondary">Mother's Phone:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">
                    {profile.mother_phone || "—"}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-light-secondary dark:text-dark-secondary block mb-1">Residential Address:</span>
                  <span className="font-semibold text-light-primary dark:text-dark-primary block bg-gray-50 dark:bg-dark-elevated/40 p-2 rounded-lg border border-light-border/40 dark:border-dark-border/40 text-[11px]">
                    {profile.address || "Hyderabad, Telangana, India"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Change Password Component */}
          <ChangePasswordCard userRoleLabel="Student" />
        </div>
      ) : null}
    </div>
  );
};
