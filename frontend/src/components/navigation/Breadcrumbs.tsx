import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center text-xs text-light-secondary dark:text-dark-secondary select-none">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-brand-gold transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const formattedName = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-50" />
            {isLast ? (
              <span className="font-semibold text-light-primary dark:text-dark-primary">
                {formattedName}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-brand-gold transition-colors font-medium">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
