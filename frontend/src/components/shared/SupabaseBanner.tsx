import React, { useState } from "react";
import { Database, ExternalLink, X, CheckCircle2, AlertTriangle, Copy, Check } from "lucide-react";
import { isSupabaseConfigured, SUPABASE_CONFIG } from "../../services/supabaseClient";

export const SupabaseBanner: React.FC = () => {
  const isConfigured = isSupabaseConfigured();
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isDismissed) return null;

  const copyPath = () => {
    navigator.clipboard.writeText("supabase/complete_dmhs_supabase_schema.sql");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConfigured) {
    return (
      <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Supabase Connected:</strong> Live data persistence active at{" "}
            <code className="px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono">
              {SUPABASE_CONFIG.url}
            </code>
          </span>
        </div>
        <a
          href={SUPABASE_CONFIG.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-semibold hover:underline shrink-0 ml-2"
        >
          <span>Dashboard</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-gold/10 to-amber-500/5 border border-brand-gold/30 text-xs shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-gold/20 text-brand-gold shrink-0 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-light-primary dark:text-dark-primary text-sm">
              <span>Supabase Integration Ready</span>
              <span className="px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] uppercase tracking-wide">
                Target: snnzmgbkiiydboujublj
              </span>
            </div>
            <p className="mt-1 text-light-secondary dark:text-dark-secondary leading-relaxed">
              Target project:{" "}
              <a
                href={SUPABASE_CONFIG.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold hover:underline font-mono inline-flex items-center gap-1"
              >
                https://snnzmgbkiiydboujublj.supabase.co
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              . To sync live database mutations, obtain your publishable anon key from Project Settings → API and set{" "}
              <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-dark-elevated font-mono">
                VITE_SUPABASE_ANON_KEY
              </code>{" "}
              in <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-dark-elevated font-mono">frontend/.env</code>.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <a
                href={`${SUPABASE_CONFIG.dashboardUrl}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-navy font-semibold hover:bg-brand-gold-light transition-colors text-xs"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={copyPath}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors text-xs"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied SQL Path!" : "Copy complete_dmhs_supabase_schema.sql Path"}</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-light-secondary dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors shrink-0"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
