import React from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Clock, Sparkles } from "lucide-react";

export interface ComingSoonCardProps {
  moduleName: string;
  phase: "Phase 2" | "Phase 3";
  description: string;
}

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({
  moduleName,
  phase,
  description,
}) => {
  return (
    <Card className="p-6 border-dashed border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/20">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary">{moduleName}</h4>
        <Badge variant={phase === "Phase 2" ? "gold" : "info"} size="sm">
          {phase}
        </Badge>
      </div>
      <p className="text-xs text-light-secondary dark:text-dark-secondary leading-relaxed mb-4">
        {description}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-light-secondary dark:text-dark-secondary font-medium">
        {phase === "Phase 2" ? <Clock className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        <span>Scheduled in Roadmap {phase}</span>
      </div>
    </Card>
  );
};
