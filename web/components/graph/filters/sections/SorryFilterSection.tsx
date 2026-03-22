"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterSection, INACTIVE_STYLE } from "@/components/graph/filters";
import type { SorryFilterSectionProps } from "@/components/graph/filters/types";

export function SorryFilterSection({
  selectedSorryFilter,
  counts,
  onToggleSorryFilter,
}: SorryFilterSectionProps) {
  const { t } = useTranslation();

  return (
    <FilterSection label={t.filters.sorryStatus}>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onToggleSorryFilter("hasSorry")}
          className={`rounded border px-2 py-1 text-xs transition-all ${
            selectedSorryFilter.has("hasSorry")
              ? "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]"
              : INACTIVE_STYLE
          }`}
        >
          {t.filters.hasSorry} ({counts.hasSorry})
        </button>
        <button
          onClick={() => onToggleSorryFilter("noSorry")}
          className={`rounded border px-2 py-1 text-xs transition-all ${
            selectedSorryFilter.has("noSorry")
              ? "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]"
              : INACTIVE_STYLE
          }`}
        >
          {t.filters.noSorry} ({counts.noSorry})
        </button>
      </div>
    </FilterSection>
  );
}
