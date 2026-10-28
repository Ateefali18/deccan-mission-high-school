import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
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
}

export const AIAssistantDrawer: React.FC = () => {
  const { session, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested prompts per role
  const suggestions: Record<string, string[]> = {
    ADMIN: [
      "Find student with admission number ADM-1001",
      "Which students have attendance below 75%?",
      "Show upcoming examinations",
      "What is the total outstanding fee?",
      "Show latest school notices",
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
      "Show latest notice from the principal",
      "What is my outstanding fee balance?",
    ],
  };

  const currentSuggestions = suggestions[role || "STUDENT"] || suggestions.STUDENT;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.ai.query(question, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        source: res.source,
        route: res.route,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: err.message || "I encountered an error querying authorized school data. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-brand-navy dark:bg-dark-card border-2 border-brand-gold text-brand-gold font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 group"
          title="Open Deccan Mission AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
          </div>
          <span>DMHS Assistant</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] uppercase font-mono tracking-wider">
            {role || "Portal"}
          </span>
        </button>
      )}

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-md h-full bg-white dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-brand-navy via-brand-navy-light to-brand-navy text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-gold/20 border border-brand-gold text-brand-gold flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                    <span>DMHS School AI</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                      SECURE
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-brand-gold" />
                    <span>Authorized for {session?.user.full_name || "User"} ({role})</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestions */}
            {messages.length === 0 && (
              <div className="p-4 bg-gray-50/80 dark:bg-dark-elevated/40 border-b border-light-border dark:border-dark-border">
                <p className="text-xs font-semibold text-light-secondary dark:text-dark-secondary mb-2">
                  Recommended queries for your role:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-primary dark:text-dark-primary hover:border-brand-gold hover:text-brand-gold transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Body */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-light-secondary dark:text-dark-secondary">
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary mb-1">
                    Ask About Authorized School Data
                  </h4>
                  <p className="text-xs leading-relaxed max-w-xs">
                    Get answers about your next period, timetable, student records, attendance, upcoming exams, fee balances, and notices.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        m.role === "user"
                          ? "bg-brand-navy text-white rounded-br-xs dark:bg-brand-gold dark:text-brand-navy font-medium"
                          : "bg-gray-100 text-light-primary dark:bg-dark-elevated dark:text-dark-primary rounded-bl-xs border border-light-border dark:border-dark-border"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Source attribution and action link */}
                      {m.role === "assistant" && (m.source || m.route) && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-dark-border/60 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          {m.source && (
                            <span className="text-light-secondary dark:text-dark-secondary font-mono">
                              Source: {m.source}
                            </span>
                          )}
                          {m.route && (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate(m.route!);
                              }}
                              className="font-bold text-brand-gold hover:underline flex items-center gap-0.5 ml-auto"
                            >
                              <span>View in Portal</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <span className="block mt-1 text-[9px] opacity-60 text-right">
                        {m.timestamp}
                      </span>
                    </div>

                    {m.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-brand-navy/20 dark:bg-brand-gold/20 text-brand-navy dark:text-brand-gold flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-light-secondary dark:text-dark-secondary p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                  <span>Consulting authorized school records...</span>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
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
                  placeholder="Ask a question about school records..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-light-border dark:border-dark-border focus:border-brand-gold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-brand-gold text-brand-navy hover:bg-brand-gold-light disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
