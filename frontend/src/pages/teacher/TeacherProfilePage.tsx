import React, { useEffect, useState } from "react";
import { Users, Mail, BookOpen, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import type { TeacherProfile } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

export const TeacherProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.teachers
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
        title="Faculty Identity Profile"
        subtitle="Official instructional employment record and departmental credentials"
      />

      {isLoading ? (
        <Card className="p-8 animate-pulse bg-gray-100 dark:bg-dark-card h-64" />
      ) : profile ? (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-brand-gold/20 text-brand-gold border-2 border-brand-gold/40 flex items-center justify-center font-bold text-2xl shrink-0">
                <Users className="w-10 h-10" />
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-black text-light-primary dark:text-dark-primary tracking-tight">
                    {profile.full_name}
                  </h2>
                  <Badge variant="gold" size="sm">
                    {profile.designation}
                  </Badge>
                </div>

                <p className="text-xs font-mono font-bold text-brand-gold">
                  Employee ID: {profile.employee_id}
                </p>

                <p className="text-xs text-light-secondary dark:text-dark-secondary flex items-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile.email}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary">
                Employment Specifications
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-light-border dark:border-dark-border">
                  <span className="text-light-secondary">Department:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">{profile.department || "General"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border dark:border-dark-border">
                  <span className="text-light-secondary">Qualifications:</span>
                  <span className="font-bold text-light-primary dark:text-dark-primary">{profile.qualification || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-light-border dark:border-dark-border">
                  <span className="text-light-secondary">Employment Status:</span>
                  <Badge variant={profile.employment_status === "active" ? "success" : "neutral"} size="sm">
                    {profile.employment_status}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-light-secondary dark:text-dark-secondary flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-gold" />
                <span>Assigned Classes This Term</span>
              </h4>
              {profile.assignments.length === 0 ? (
                <p className="text-xs text-light-secondary py-3">No instructional assignments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {profile.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated text-xs flex items-center justify-between font-semibold"
                    >
                      <span>
                        {a.class_name} • Sec {a.section_name} ({a.subject_name})
                      </span>
                      <Badge variant="gold" size="sm">
                        {a.role_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};
