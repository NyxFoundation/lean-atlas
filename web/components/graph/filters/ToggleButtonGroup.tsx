"use client";

interface ToggleButtonOption {
  id: string;
  label: string;
  color: string;
  count?: number;
}

interface ToggleButtonGroupProps {
  options: ToggleButtonOption[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  size?: "default" | "small";
}

export const INACTIVE_STYLE =
  "bg-[var(--filter-inactive-bg)] border-[var(--filter-inactive-border)] text-[var(--filter-inactive-text)]";

/**
 * Toggleable button group
 */
export function ToggleButtonGroup({
  options,
  selectedIds,
  onToggle,
  size = "default",
}: ToggleButtonGroupProps) {
  const sizeClass =
    size === "small" ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-xs";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ id, label, color, count }) => (
        <button
          key={id}
          onClick={() => onToggle(id)}
          className={`${sizeClass} rounded border transition-all ${
            selectedIds.has(id) ? color : INACTIVE_STYLE
          }`}
        >
          {label}
          {count !== undefined && ` (${count})`}
        </button>
      ))}
    </div>
  );
}
