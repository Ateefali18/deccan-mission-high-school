import React, { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { Badge } from "../ui/Badge";
import { useNavigate } from "react-router-dom";

export const UserMenu: React.FC = () => {
  const { session, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session || !session.user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const fullName = session.user.full_name || "School User";
  const initials = fullName.charAt(0).toUpperCase() || "U";
  const userEmail = session.user.email || "";
  const roleName = session.role || "MEMBER";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border"
        aria-label="User profile options"
      >
        <div className="w-8 h-8 rounded-full bg-brand-blue/15 text-brand-blue dark:text-dark-accent flex items-center justify-center font-bold text-xs border border-brand-blue/30">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-light-primary dark:text-dark-primary leading-tight truncate max-w-[130px]">
            {fullName}
          </p>
          <p className="text-[10px] text-light-secondary dark:text-dark-secondary uppercase font-semibold tracking-wider">
            {roleName}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-light-secondary hidden sm:block opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-light-border/70 dark:border-dark-border/70">
            <p className="text-sm font-bold text-light-primary dark:text-dark-primary">
              {fullName}
            </p>
            <p className="text-xs text-light-secondary dark:text-dark-secondary truncate mb-2">
              {userEmail}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {roleName}
              </Badge>
              {session.identifier && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-light-primary dark:text-dark-primary font-bold">
                  {session.identifier}
                </span>
              )}
            </div>
          </div>

          {/* Action Links */}
          <div className="py-1">
            {session.role === "STUDENT" && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/student/profile");
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-light-primary dark:text-dark-primary hover:bg-brand-blue/10 flex items-center gap-2.5 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-brand-blue dark:text-dark-accent" />
                <span>My Profile</span>
              </button>
            )}
            {session.role === "TEACHER" && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/teacher/profile");
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-light-primary dark:text-dark-primary hover:bg-brand-blue/10 flex items-center gap-2.5 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-brand-blue dark:text-dark-accent" />
                <span>My Faculty Profile</span>
              </button>
            )}
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-light-secondary dark:text-dark-secondary">
              School Isolation
            </div>
            <div className="px-4 py-1 text-xs text-light-secondary dark:text-dark-secondary">
              {session.school_name}
            </div>
          </div>

          <div className="border-t border-light-border/70 dark:border-dark-border/70 pt-1 mt-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-status-error hover:bg-status-error/10 flex items-center gap-2.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
