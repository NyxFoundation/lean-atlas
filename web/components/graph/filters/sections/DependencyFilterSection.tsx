"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterSection } from "@/components/graph/filters";
import type { DependencyFilterMode } from "@/lib/types";
import type { DependencyFilterProps } from "@/components/graph/filters/types";

const ACTIVE_MODE_STYLE =
  "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] border-[var(--accent)] text-[var(--accent)] font-medium";
const INACTIVE_MODE_STYLE =
  "bg-[var(--filter-inactive-bg)] border-[var(--filter-inactive-border)] text-[var(--filter-inactive-text)]";

function ModeButton({
  mode,
  currentMode,
  label,
  onSetMode,
}: {
  mode: DependencyFilterMode;
  currentMode: DependencyFilterMode;
  label: string;
  onSetMode: (mode: DependencyFilterMode) => void;
}) {
  return (
    <button
      onClick={() => onSetMode(mode)}
      className={`flex-1 rounded border px-2 py-1 text-xs transition-all ${
        currentMode === mode ? ACTIVE_MODE_STYLE : INACTIVE_MODE_STYLE
      }`}
    >
      {label}
    </button>
  );
}

export function DependencyFilterSection({
  filters,
  nodesMap,
  dependencySearchQuery,
  dependencySearchSuggestions,
  onDependencySearchQueryChange,
  onAddDependencyFilterNode,
  onRemoveDependencyFilterNode,
  onSetDependencyFilterMode,
  onToggleDependencyFilter,
  onClearDependencyFilter,
}: DependencyFilterProps) {
  const { t } = useTranslation();
  const selectedNodeIds = Array.from(filters.dependencyFilter.nodeIds);
  const hasSelectedNodes = selectedNodeIds.length > 0;

  return (
    <FilterSection label={t.filters.dependencyFilter}>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="dependencyFilterActive"
          checked={filters.dependencyFilter.isActive}
          onChange={(e) => onToggleDependencyFilter(e.target.checked)}
          disabled={!hasSelectedNodes}
          className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--accent)] focus:ring-[var(--input-focus-ring)] disabled:opacity-50"
        />
        <label
          htmlFor="dependencyFilterActive"
          className={`text-xs cursor-pointer ${
            hasSelectedNodes
              ? "text-[var(--panel-text)]"
              : "text-[var(--panel-text-faint)]"
          }`}
        >
          {t.filters.filterActive}
        </label>
      </div>

      <div className="mb-3 flex gap-2">
        <ModeButton
          mode="dependencies"
          currentMode={filters.dependencyFilter.mode}
          label={t.filters.dependencies}
          onSetMode={onSetDependencyFilterMode}
        />
        <ModeButton
          mode="dependents"
          currentMode={filters.dependencyFilter.mode}
          label={t.filters.dependents}
          onSetMode={onSetDependencyFilterMode}
        />
      </div>

      <div className="relative mb-2">
        <input
          type="text"
          value={dependencySearchQuery}
          onChange={(e) => onDependencySearchQueryChange(e.target.value)}
          placeholder={t.filters.searchNodes}
          className="atlas-input w-full px-3 py-2 text-xs"
        />
        {dependencySearchSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md atlas-panel">
            {dependencySearchSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => {
                  onAddDependencyFilterNode(suggestion.id);
                  onDependencySearchQueryChange("");
                }}
                className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--hover-bg)]"
              >
                <div className="truncate font-medium text-[var(--panel-text)]">
                  {suggestion.shortName}
                </div>
                {suggestion.name && (
                  <div className="truncate text-[var(--panel-text-muted)]">
                    {suggestion.name}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSelectedNodes && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--panel-text-muted)]">
              {t.filters.selected} ({selectedNodeIds.length})
            </span>
            <button
              onClick={onClearDependencyFilter}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              {t.filters.clear}
            </button>
          </div>
          <div className="max-h-24 space-y-1 overflow-y-auto">
            {selectedNodeIds.map((nodeId) => {
              const node = nodesMap.get(nodeId);
              return (
                <div
                  key={nodeId}
                  className="flex items-center justify-between rounded bg-[var(--input-bg)] px-2 py-1"
                >
                  <span
                    className="flex-1 truncate text-xs text-[var(--panel-text)]"
                    title={nodeId}
                  >
                    {node?.shortName || nodeId.split(".").pop()}
                  </span>
                  <button
                    onClick={() => onRemoveDependencyFilterNode(nodeId)}
                    className="ml-2 text-[var(--panel-text-faint)] hover:text-red-600 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </FilterSection>
  );
}
