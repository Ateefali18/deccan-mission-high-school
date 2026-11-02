import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink, Info, AlertTriangle, Calendar, Award } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import type { NoticeItem } from "../../types";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "notice" | "exam" | "attendance" | "system";
  isRead: boolean;
}

export const NotificationDropdown: React.FC = () => {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load published notices and transform into notifications
    api.notices.list(role?.toLowerCase() || "all").then((notices) => {
      const items: NotificationItem[] = notices.slice(0, 5).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.content,
        time: new Date(n.publish_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        type: "notice",
        isRead: false,
      }));

      // Add dynamic attendance/exam alert
      items.push({
        id: "sys-01",
        title: "Telangana State SSC Affiliation TS-HYD-SSC-41092 Verified",
        message: "Deccan Mission High School academic portal active for Term 2025-2026.",
        time: "Today",
        type: "system",
        isRead: true,
      });

      setNotifications(items);
    }).catch(() => {});
  }, [role]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "notice":
        return <Info className="w-3.5 h-3.5 text-brand-blue dark:text-dark-accent" />;
      case "exam":
        return <Award className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-light-secondary dark:text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-blue text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-gray-50/80 dark:bg-dark-elevated/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-light-primary dark:text-dark-primary">
                Notifications & Announcements
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue dark:text-dark-accent text-[10px] font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-brand-blue dark:text-dark-accent font-semibold hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-light-border dark:divide-dark-border">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-light-secondary dark:text-dark-secondary">
                No notifications at this time.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-dark-elevated ${
                    !n.isRead ? "bg-brand-blue/5 dark:bg-brand-blue/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-light-primary dark:text-dark-primary truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-light-secondary dark:text-dark-secondary shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-light-secondary dark:text-dark-secondary line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-elevated text-center">
            <span className="text-[10px] text-light-secondary dark:text-dark-secondary">
              DMHS Live Notification Dispatch System
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
