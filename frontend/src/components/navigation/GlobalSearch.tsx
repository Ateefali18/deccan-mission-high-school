import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, UserCheck, GraduationCap, X } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { api } from "../../services/api";
import type { SearchResultItem } from "../../types";
import { useNavigate } from "react-router-dom";

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    api.search
      .query(debouncedQuery.trim(), 8)
      .then((res) => {
        if (isMounted) {
          setResults(res.results);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (isMounted) setResults([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery("");
    if (item.type === "student") {
      navigate(`/admin/students?search=${encodeURIComponent(item.identifier)}`);
    } else {
      navigate(`/admin/teachers?search=${encodeURIComponent(item.identifier)}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs sm:max-w-md">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-light-secondary dark:text-dark-secondary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search student admission no, teacher ID, or name..."
          className="w-full text-xs sm:text-sm pl-10 pr-9 py-2 rounded-xl bg-gray-100/80 dark:bg-dark-elevated text-light-primary dark:text-dark-primary border border-transparent focus:border-brand-blue dark:focus:border-dark-accent focus:bg-white dark:focus:bg-dark-card focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 absolute right-3 animate-spin text-brand-blue dark:text-dark-accent" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 p-0.5 text-light-secondary hover:text-light-primary dark:hover:text-dark-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-light-secondary dark:text-dark-secondary">
              Searching directory...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-light-secondary dark:text-dark-secondary">
              No students or faculty matching "{debouncedQuery}"
            </div>
          ) : (
            <div className="divide-y divide-light-border/60 dark:divide-dark-border/60">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-brand-blue/10 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-elevated text-brand-blue dark:text-dark-accent shrink-0">
                    {item.type === "student" ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-semibold text-light-primary dark:text-dark-primary truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-brand-blue dark:text-dark-accent font-bold">
                        {item.identifier}
                      </span>
                    </div>
                    <p className="text-xs text-light-secondary dark:text-dark-secondary truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
