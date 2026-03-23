"use client";

interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
}

/**
 * Labeled wrapper for a filter section
 */
export function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
