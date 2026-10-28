import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowLeft } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/15 text-brand-gold mb-4 border border-brand-gold/30">
          <HelpCircle className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-light-primary dark:text-dark-primary mb-2">
          404 — Page Not Found
        </h2>

        <p className="text-xs sm:text-sm text-light-secondary dark:text-dark-secondary mb-6 leading-relaxed">
          The requested route does not exist in Deccan Mission High School ERP.
        </p>

        <Link to="/">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
};
