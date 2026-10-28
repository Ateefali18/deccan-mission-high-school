import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const AccessDeniedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-status-error/40 shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-status-error/15 text-status-error mb-4 border border-status-error/30">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-light-primary dark:text-dark-primary mb-2">
          403 — Access Denied
        </h2>

        <p className="text-xs sm:text-sm text-light-secondary dark:text-dark-secondary mb-6 leading-relaxed">
          You do not possess the required role permissions to view or execute actions on this resource.
          All school administrative records are strictly isolated.
        </p>

        <Link to="/">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Safe Portal
          </Button>
        </Link>
      </Card>
    </div>
  );
};
