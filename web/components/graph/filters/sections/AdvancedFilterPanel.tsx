"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterSection } from "@/components/graph/filters";
import type { AdvancedFilterPanelProps } from "@/components/graph/filters/types";
import { DependencyFilterSection } from "./DependencyFilterSection";

export function AdvancedFilterPanel({
  filters,
  directories,
  showAdvancedSearch,
  onToggleAdvancedSearch,
  onSetSearchQuery,
  onToggleDirectory,
  onSetAlwaysShowMainTheorems,
  nodesMap,
  dependencySearchQuery,
  dependencySearchSuggestions,
  onDependencySearchQueryChange,
  onAddDependencyFilterNode,
  onRemoveDependencyFilterNode,
  onSetDependencyFilterMode,
  onToggleDependencyFilter,
  onClearDependencyFilter,
}: AdvancedFilterPanelProps) {
  const { t } = useTranslation();

  return (
    <div>
      <button
        onClick={onToggleAdvancedSearch}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--panel-text-muted)] transition-colors hover:text-[var(--panel-text)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${
            showAdvancedSearch ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {t.filters.advancedFilters}
      </button>

      {showAdvancedSearch && (
        <div className="mt-3 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alwaysShowMainTheorems"
              checked={filters.alwaysShowMainTheorems}
              onChange={(e) => onSetAlwaysShowMainTheorems(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--accent)] focus:ring-[var(--input-focus-ring)]"
            />
            <label
              htmlFor="alwaysShowMainTheorems"
              className="cursor-pointer text-xs text-[var(--panel-text)]"
            >
              {t.filters.alwaysShowMainTheorems}
            </label>
          </div>

          <FilterSection label={t.filters.search}>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="atlas-input w-full px-3 py-2 text-sm"
            />
          </FilterSection>

          {directories.length > 0 && (
            <FilterSection label={t.filters.directory}>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {directories.map((dir) => {
                  const shortDir = dir.split("/").slice(1).join("/") || dir;
                  return (
                    <label
                      key={dir}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={filters.directories.has(dir)}
                        onChange={() => onToggleDirectory(dir)}
                        className="h-3 w-3 rounded border-[var(--input-border)] accent-[var(--accent)] focus:ring-[var(--input-focus-ring)]"
                      />
                      <span
                        className="truncate text-xs text-[var(--panel-text)]"
                        title={dir}
                      >
                        {shortDir}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          )}

          <div className="border-t border-[var(--divider)] pt-4">
            <DependencyFilterSection
              filters={filters}
              nodesMap={nodesMap}
              dependencySearchQuery={dependencySearchQuery}
              dependencySearchSuggestions={dependencySearchSuggestions}
              onDependencySearchQueryChange={onDependencySearchQueryChange}
              onAddDependencyFilterNode={onAddDependencyFilterNode}
              onRemoveDependencyFilterNode={onRemoveDependencyFilterNode}
              onSetDependencyFilterMode={onSetDependencyFilterMode}
              onToggleDependencyFilter={onToggleDependencyFilter}
              onClearDependencyFilter={onClearDependencyFilter}
            />
          </div>
        </div>
      )}
    </div>
  );
}
