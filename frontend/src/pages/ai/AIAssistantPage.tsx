import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Bot,
  User as UserIcon,
  Send,
  Loader2,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Database,
  Cpu,
  KeyRound,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { api } from "../../services/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  route?: string;
  timestamp: string;
  provider?: string;
}

interface AIStatus {
  provider: string;
  model: string;
  is_api_key_configured: boolean;
  server_side_key_enforced: boolean;
  pii_safeguards_active: boolean;
  grounded_queries_supported: string[];
}

export const AIAssistantPage: React.FC = () => {
  const { session, role } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<AIStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchStatus = async () => {
    try {
      const data = await api.ai.getStatus();
      setStatus(data);
    } catch {
      // Graceful fallback status
      setStatus({
        provider: "gemini",
        model: "gemini-1.5-pro",
        is_api_key_configured: false,
        server_side_key_enforced: true,
        pii_safeguards_active: true,
        grounded_queries_supported: [
          "Master Timetable & Next Period",
          "Student Directory & Profile by Admission Number",
          "Attendance Summary & Low Attendance (<75%) Alerts",
          "CBSE Examinations & Result Schedules",
          "Fee Balances & Overdue Ledgers (Role-Secured)",
          "Official Notices & Announcements",
        ],
      });
    }
  };

  const suggestions: Record<string, string[]> = {
    ADMIN: [
      "Find student with admission number ADM-1001",
      "Which students have attendance below 75%?",
      "Show today's attendance for Class 6",
      "How many students are in Class 10?",
      "Show the number of active students in every class",
      "Which teachers have not completed marks entry?",
      "Show upcoming examinations",
      "What is the total outstanding fee?",
      "Show latest school notices",
      "Find inactive students",
    ],
    TEACHER: [
      "What is my next period?",
      "Show my timetable for today",
      "Which students have low attendance in my class?",
      "Show upcoming examinations",
      "Show latest school notices",
    ],
    STUDENT: [
      "What is my next period?",
      "What is my attendance percentage?",
      "When is my next examination?",
      "What is my outstanding fee balance?",
      "Show latest notice from the principal",
    ],
  };

  const activeSuggestions = suggestions[role || "STUDENT"] || suggestions.STUDENT;

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || input).trim();
    if (!q || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.ai.query(q, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        source: res.source,
        route: res.route,
        provider: res.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: err.message || "Failed to query the authorized school assistant. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/15 border border-brand-blue/40 text-brand-blue dark:text-dark-accent flex items-center justify-center font-bold shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-light-primary dark:text-dark-primary">
                  DMHS School AI Assistant
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  PHASE 3 LIVE
                </span>
              </div>
              <p className="text-xs text-light-secondary dark:text-dark-secondary mt-0.5">
                Role-authorized natural language queries grounded in official Deccan Mission High School database records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages([]);
                setConversationId(undefined);
              }}
              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-xs text-light-secondary dark:text-dark-secondary hover:text-red-500 hover:border-red-500/40 transition-colors flex items-center gap-1.5"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={fetchStatus}
              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-xs text-light-secondary dark:text-dark-secondary hover:text-brand-blue dark:hover:text-dark-accent hover:border-brand-blue/40 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Status</span>
            </button>
          </div>
        </div>

        {/* Security & Provider Status Ribbon */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-light-border dark:border-dark-border text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated/40 border border-light-border/80 dark:border-dark-border/80">
            <Cpu className="w-4 h-4 text-brand-blue dark:text-dark-accent shrink-0" />
            <div>
              <span className="text-[10px] text-light-secondary dark:text-dark-secondary block uppercase tracking-wider font-semibold">
                AI Provider Mode
              </span>
              <span className="font-medium text-light-primary dark:text-dark-primary flex items-center gap-1">
                {status?.is_api_key_configured ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Google Gemini 1.5 Pro
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    DMHS Grounded DB Engine
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated/40 border border-light-border/80 dark:border-dark-border/80">
            <KeyRound className="w-4 h-4 text-brand-blue dark:text-dark-accent shrink-0" />
            <div>
              <span className="text-[10px] text-light-secondary dark:text-dark-secondary block uppercase tracking-wider font-semibold">
                API Key Security
              </span>
              <span className="font-medium text-light-primary dark:text-dark-primary">
                Server-Side Only (backend/.env)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-dark-elevated/40 border border-light-border/80 dark:border-dark-border/80">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] text-light-secondary dark:text-dark-secondary block uppercase tracking-wider font-semibold">
                PII Protection & Role Scope
              </span>
              <span className="font-medium text-light-primary dark:text-dark-primary">
                Active for {role} ({session?.user.full_name})
              </span>
            </div>
          </div>
        </div>

        {!status?.is_api_key_configured && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Institutional Database Grounding Active</p>
              <p className="opacity-90 mt-0.5">
                All school data queries (timetable, admissions, attendance, low attendance alerts, class counts, examinations, notices, fees) are resolved directly from the verified database. To enable general external generative AI reasoning, set <code className="px-1 py-0.2 bg-black/10 dark:bg-white/10 rounded font-mono">AI_API_KEY</code> in <code className="px-1 py-0.2 bg-black/10 dark:bg-white/10 rounded font-mono">backend/.env</code>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-sm flex flex-col h-[560px]">
        {/* Suggested Queries Bar */}
        <div className="p-3 border-b border-light-border dark:border-dark-border bg-gray-50/70 dark:bg-dark-elevated/20 overflow-x-auto">
          <p className="text-[11px] font-semibold text-light-secondary dark:text-dark-secondary mb-1.5">
            Recommended Questions for {role}:
          </p>
          <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
            {activeSuggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary hover:border-brand-blue hover:text-brand-blue dark:hover:border-dark-accent dark:hover:text-dark-accent hover:bg-brand-blue/5 transition-all text-left whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-light-secondary dark:text-dark-secondary">
              <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue dark:text-dark-accent flex items-center justify-center mb-3">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-light-primary dark:text-dark-primary mb-1">
                How can I assist you today?
              </h3>
              <p className="text-xs max-w-md leading-relaxed">
                Ask about class schedules, student records by admission number, attendance summaries, CBSE exams, marks entry progress, or school circulars.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-brand-blue/15 text-brand-blue dark:text-dark-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                    m.role === "user"
                      ? "bg-brand-blue text-white rounded-br-xs font-medium"
                      : "bg-gray-100 text-light-primary dark:bg-dark-elevated dark:text-dark-primary rounded-bl-xs border border-light-border dark:border-dark-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Metadata & Deep-links */}
                  {m.role === "assistant" && (m.source || m.route) && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-dark-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {m.source && (
                        <span className="text-light-secondary dark:text-dark-secondary font-mono flex items-center gap-1">
                          <Database className="w-3 h-3 text-brand-blue dark:text-dark-accent" />
                          <span>{m.source}</span>
                        </span>
                      )}
                      {m.route && (
                        <button
                          onClick={() => navigate(m.route!)}
                          className="font-bold text-brand-blue dark:text-dark-accent hover:underline flex items-center gap-1 ml-auto"
                        >
                          <span>Open in Portal</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <span className="block mt-1.5 text-[9px] opacity-60 text-right">
                    {m.timestamp}
                  </span>
                </div>

                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-light-secondary dark:text-dark-secondary">
              <div className="w-8 h-8 rounded-full bg-brand-blue/15 text-brand-blue dark:text-dark-accent flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-dark-elevated border border-light-border dark:border-dark-border">
                <span>Querying authorized Deccan Mission records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-light-border dark:border-dark-border bg-white dark:bg-dark-card rounded-b-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question as ${role?.toLowerCase()} (e.g. "Find student ADM-1001", "Show upcoming exams")...`}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-xs text-light-primary dark:text-dark-primary focus:outline-hidden focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
