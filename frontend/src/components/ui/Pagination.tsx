import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 text-xs text-light-secondary dark:text-dark-secondary">
      <div>
        Showing <span className="font-semibold text-light-primary dark:text-dark-primary">{(currentPage - 1) * pageSize + 1}</span> to{" "}
        <span className="font-semibold text-light-primary dark:text-dark-primary">
          {Math.min(currentPage * pageSize, totalItems)}
        </span>{" "}
        of <span className="font-semibold text-light-primary dark:text-dark-primary">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-2 py-1 font-medium text-light-primary dark:text-dark-primary">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
