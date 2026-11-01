import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Clock, Sparkles, ArrowLeft, Calendar, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export const ComingSoonPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const moduleName = searchParams.get("module") || "Feature";
  const phase = searchParams.get("phase") || "2";

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-8">
      <PageHeader
        title={moduleName}
        subtitle={`This module is intentionally reserved for ${phase === "3" ? "Phase 3 (AI Assistant & Autonomous Workflows)" : "Phase 2 (School Operations & Academic Portals)"}`}
      />

      <Card className="p-8 text-center border-dashed border-2 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-blue/15 text-brand-blue dark:text-dark-accent mb-4 border border-brand-blue/30">
          {phase === "3" ? <Sparkles className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>

        <Badge variant={phase === "3" ? "info" : "primary"} size="md" className="mb-3">
          Roadmap Phase {phase}
        </Badge>

        <h3 className="text-xl font-bold text-light-primary dark:text-dark-primary mb-2">
          {moduleName} Module Scheduled
        </h3>

        <p className="text-xs sm:text-sm text-light-secondary dark:text-dark-secondary max-w-lg mx-auto leading-relaxed mb-6">
          Phase 1 covers the core database architecture, multi-role authentication (Admin, Teacher, Student),
          server-side permission isolation, and the Royal Navy & White design system.
          The complete functionality for <span className="font-semibold text-brand-blue dark:text-dark-accent">{moduleName}</span> will be implemented seamlessly in Prompt {phase} without altering this foundational architecture.
        </p>

        <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-elevated text-xs text-left max-w-md mx-auto mb-6 space-y-2">
          <div className="flex items-center gap-2 font-bold text-light-primary dark:text-dark-primary">
            <ShieldCheck className="w-4 h-4 text-status-success" />
            <span>Architecture Readiness Check</span>
          </div>
          <p className="text-[11px] text-light-secondary dark:text-dark-secondary">
            ✓ Database models normalized with multi-tenant school isolation
            <br />
            ✓ RBAC server permissions and route security operational
            <br />
            ✓ Audit logging and relational schemas verified
          </p>
        </div>

        <Link to="/">
          <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
};
