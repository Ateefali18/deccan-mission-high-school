import React, { useEffect, useState } from "react";
import {
  Bell,
  PlusCircle,
  AlertCircle,
  Clock,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { NoticeItem } from "../../types";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";

export const NoticesPage: React.FC = () => {
  const { session, role } = useAuth();
  const toast = useToast();

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAudience, setFilterAudience] = useState("all");

  // Create Notice Modal State (Admin only)
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [priority, setPriority] = useState("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const data = await api.notices.list(filterAudience);
      setNotices(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load notices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [filterAudience]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.notices.create({
        title,
        content,
        target_audience: targetAudience,
        priority,
      });
      toast.success("School notice published successfully!");
      setIsOpen(false);
      setTitle("");
      setContent("");
      setTargetAudience("all");
      setPriority("normal");
      fetchNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p.toLowerCase()) {
      case "urgent":
        return <Badge variant="danger" size="sm">Urgent</Badge>;
      case "high":
        return <Badge variant="gold" size="sm">High Priority</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Notice</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Notices & Circulars"
        subtitle="Institutional announcements, CBSE notifications, and academic advisories"
        action={
          role === "ADMIN" ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setIsOpen(true)}
            >
              Publish Notice
            </Button>
          ) : undefined
        }
      />

      {/* Filter Ribbon */}
      <div className="p-3 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-light-secondary dark:text-dark-secondary font-semibold">
          <Filter className="w-4 h-4 text-brand-gold" />
          <span>Audience Filter:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {["all", "teachers", "students"].map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                filterAudience === aud
                  ? "bg-brand-navy text-white dark:bg-brand-gold dark:text-brand-navy shadow-xs"
                  : "bg-gray-100 dark:bg-dark-elevated text-light-secondary hover:text-brand-gold"
              }`}
            >
              {aud}
            </button>
          ))}
        </div>
      </div>

      {/* Notices Stream */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 h-32 animate-pulse bg-gray-100 dark:bg-dark-card" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <Card className="p-10 text-center text-light-secondary dark:text-dark-secondary">
          <Bell className="w-10 h-10 text-brand-gold mx-auto mb-3 opacity-60" />
          <h4 className="text-sm font-bold text-light-primary dark:text-dark-primary mb-1">
            No Notices Published
          </h4>
          <p className="text-xs">There are no circulars matching your current selection.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <Card key={n.id} className="p-6 transition-all hover:border-brand-gold/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mt-0.5">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-light-primary dark:text-dark-primary">
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-light-secondary dark:text-dark-secondary mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-gold" />
                        {new Date(n.publish_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="capitalize font-medium">Audience: {n.target_audience}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{getPriorityBadge(n.priority)}</div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-dark-elevated/40 border border-light-border/70 dark:border-dark-border/70 text-xs text-light-primary dark:text-dark-primary leading-relaxed whitespace-pre-wrap">
                {n.content}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Publish Notice Modal (Admin Only) */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Publish Official Notice or Circular"
        description="Notices are broadcast live to authorized teachers, students, and parent portals"
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateNotice}
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Publish Now
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-light-primary dark:text-dark-primary block mb-1.5">
              Notice Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule for CBSE Periodic Assessment II (2025–26)"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-light-primary dark:text-dark-primary block mb-1.5">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
              >
                <option value="all">All School (Teachers & Students)</option>
                <option value="teachers">Teaching Faculty Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-light-primary dark:text-dark-primary block mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
              >
                <option value="normal">Normal Circular</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Advisory</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-light-primary dark:text-dark-primary block mb-1.5">
              Circular Content *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter full text of the circular, schedule details, or principal instructions..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-xs text-light-primary dark:text-dark-primary focus:border-brand-gold focus:outline-none"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
