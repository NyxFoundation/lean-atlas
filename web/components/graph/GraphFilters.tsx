"use client";

import { useMemo, useState } from "react";
import type {
  Confidence,
  CustomNodeData,
  DefProgress,
  DependencyFilterMode,
  EdgeVisualKind,
  FilterState,
  LineSizeCategory,
  ProofProgress,
  SorryFilter,
  SubKind,
} from "@/lib/types";
import {
  CONFIDENCE_FILTER_STYLES,
  KIND_FILTER_STYLES,
  LINE_SIZE_FILTER_STYLES,
} from "@/lib/constants";
import { getLineSizeLabel, type LineBoundaries } from "@/lib/lineSize";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  AdvancedFilterPanel,
  EdgeKindFilterSection,
  FilterSection,
  KindFilterSection,
  ProgressFilterSection,
  SorryFilterSection,
  ToggleButtonGroup,
  type DependencySearchSuggestion,
  type FilterCounts,
  type FilterOption,
} from "./filters";

interface GraphFiltersProps {
  filters: FilterState;
  directories: string[];
  isMinimized: boolean;
  onToggleMinimized: () => void;
  onToggleKind: (kind: string) => void;
  onToggleConfidence: (conf: Confidence) => void;
  onToggleDirectory: (dir: string) => void;
  onToggleSorryFilter: (filter: SorryFilter) => void;
  onToggleLineSize: (size: LineSizeCategory) => void;
  onToggleSubKind: (subKind: SubKind) => void;
  onSelectAllSubKinds: (parentKind: "theorem" | "definition") => void;
  onDeselectAllSubKinds: (parentKind: "theorem" | "definition") => void;
  onSetSearchQuery: (query: string) => void;
  onSetAlwaysShowMainTheorems: (value: boolean) => void;
  onReset: () => void;
  onRelayout: () => void;
  statistics: {
    total: number;
    filtered: number;
  };
  filterCounts: FilterCounts;
  lineBoundaries: LineBoundaries;
  nodesMap: Map<string, CustomNodeData>;
  onAddDependencyFilterNode: (nodeId: string) => void;
  onRemoveDependencyFilterNode: (nodeId: string) => void;
  onSetDependencyFilterMode: (mode: DependencyFilterMode) => void;
  onToggleDependencyFilter: (active: boolean) => void;
  onClearDependencyFilter: () => void;
  onToggleEdgeKind: (kind: EdgeVisualKind) => void;
  onToggleProofProgress: (pp: ProofProgress) => void;
  onToggleDefProgress: (dp: DefProgress) => void;
  onSetTypeReachableOnly: (value: boolean) => void;
}

function buildDependencySearchSuggestions(
  query: string,
  nodesMap: Map<string, CustomNodeData>,
  selectedNodeIds: Set<string>,
): DependencySearchSuggestion[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase();
  return Array.from(nodesMap.values())
    .filter(
      (node) =>
        !selectedNodeIds.has(node.id) &&
        (node.id.toLowerCase().includes(normalizedQuery) ||
          node.shortName.toLowerCase().includes(normalizedQuery) ||
          (node.meta.name &&
            node.meta.name.toLowerCase().includes(normalizedQuery))),
    )
    .slice(0, 10)
    .map((node) => ({
      id: node.id,
      shortName: node.shortName,
      name: node.meta.name,
    }));
}

export function GraphFilters({
  filters,
  directories,
  isMinimized,
  onToggleMinimized,
  onToggleKind,
  onToggleConfidence,
  onToggleDirectory,
  onToggleSorryFilter,
  onToggleLineSize,
  onToggleSubKind,
  onSelectAllSubKinds,
  onDeselectAllSubKinds,
  onSetSearchQuery,
  onSetAlwaysShowMainTheorems,
  onReset,
  onRelayout,
  statistics,
  filterCounts,
  lineBoundaries,
  nodesMap,
  onAddDependencyFilterNode,
  onRemoveDependencyFilterNode,
  onSetDependencyFilterMode,
  onToggleDependencyFilter,
  onClearDependencyFilter,
  onToggleEdgeKind,
  onToggleProofProgress,
  onToggleDefProgress,
  onSetTypeReachableOnly,
}: GraphFiltersProps) {
  const { t } = useTranslation();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [dependencySearchQuery, setDependencySearchQuery] = useState("");

  const dependencySearchSuggestions = useMemo(
    () =>
      buildDependencySearchSuggestions(
        dependencySearchQuery,
        nodesMap,
        filters.dependencyFilter.nodeIds,
      ),
    [dependencySearchQuery, nodesMap, filters.dependencyFilter.nodeIds],
  );

  const kindOptions: FilterOption[] = KIND_FILTER_STYLES.map(
    ({ id, color }) => ({
      id,
      label: t.kinds[id as keyof typeof t.kinds] ?? id,
      color,
      count: filterCounts.kinds[id as keyof typeof filterCounts.kinds],
    }),
  );

  const confidenceOptions: FilterOption[] = CONFIDENCE_FILTER_STYLES.map(
    ({ id, color }) => ({
      id,
      label: t.confidenceLevels[id],
      color,
      count: filterCounts.confidence[id],
    }),
  );

  const lineSizeOptions: FilterOption[] = LINE_SIZE_FILTER_STYLES.map(
    ({ id, color }) => ({
      id,
      label: getLineSizeLabel(id, lineBoundaries, t.lineSizes[id]),
      color,
      count: filterCounts.lineSize[id],
    }),
  );

  return (
    <div className="atlas-panel max-h-[calc(100vh-8rem)] w-64 overflow-y-auto">
      <div className="atlas-panel-header sticky top-0 rounded-t-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleMinimized}
            className="flex items-center gap-2 transition-colors hover:text-[var(--accent)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-[var(--panel-text-muted)] transition-transform ${
                isMinimized ? "-rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <svg
              className="h-5 w-5 text-[var(--panel-text)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
          {!isMinimized && (
            <button
              onClick={onReset}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              {t.filters.reset}
            </button>
          )}
        </div>
        <div className="mt-1 text-xs text-[var(--panel-text-muted)]">
          {statistics.filtered} {t.filters.nodesShowing}
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="typeReachableOnly"
              checked={filters.typeReachableOnly}
              onChange={(e) => onSetTypeReachableOnly(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--accent)] focus:ring-[var(--input-focus-ring)]"
            />
            <label
              htmlFor="typeReachableOnly"
              className="cursor-pointer text-xs text-[var(--panel-text)]"
            >
              {t.filters.humanReviewOnly}
            </label>
            <InfoTooltip text={t.filters.humanReviewTooltip} />
          </div>

          <KindFilterSection
            filters={filters}
            kindOptions={kindOptions}
            filterCounts={filterCounts}
            onToggleKind={onToggleKind}
            onToggleSubKind={onToggleSubKind}
            onSelectAllSubKinds={onSelectAllSubKinds}
            onDeselectAllSubKinds={onDeselectAllSubKinds}
          />

          <FilterSection label={t.filters.confidence}>
            <ToggleButtonGroup
              options={confidenceOptions}
              selectedIds={filters.confidence as Set<string>}
              onToggle={(id) => onToggleConfidence(id as Confidence)}
            />
          </FilterSection>

          <ProgressFilterSection
            filters={filters}
            onToggleProofProgress={onToggleProofProgress}
            onToggleDefProgress={onToggleDefProgress}
          />

          <SorryFilterSection
            selectedSorryFilter={filters.sorryFilter}
            counts={filterCounts.sorry}
            onToggleSorryFilter={onToggleSorryFilter}
          />

          <FilterSection label={t.filters.lineCount}>
            <ToggleButtonGroup
              options={lineSizeOptions}
              selectedIds={filters.lineSize as Set<string>}
              onToggle={(id) => onToggleLineSize(id as LineSizeCategory)}
            />
          </FilterSection>

          <EdgeKindFilterSection
            selectedEdgeKinds={filters.edgeKinds}
            onToggleEdgeKind={onToggleEdgeKind}
          />

          <AdvancedFilterPanel
            filters={filters}
            directories={directories}
            showAdvancedSearch={showAdvancedSearch}
            onToggleAdvancedSearch={() =>
              setShowAdvancedSearch((previous) => !previous)
            }
            onSetSearchQuery={onSetSearchQuery}
            onToggleDirectory={onToggleDirectory}
            onSetAlwaysShowMainTheorems={onSetAlwaysShowMainTheorems}
            nodesMap={nodesMap}
            dependencySearchQuery={dependencySearchQuery}
            dependencySearchSuggestions={dependencySearchSuggestions}
            onDependencySearchQueryChange={setDependencySearchQuery}
            onAddDependencyFilterNode={onAddDependencyFilterNode}
            onRemoveDependencyFilterNode={onRemoveDependencyFilterNode}
            onSetDependencyFilterMode={onSetDependencyFilterMode}
            onToggleDependencyFilter={onToggleDependencyFilter}
            onClearDependencyFilter={onClearDependencyFilter}
          />

          <div className="border-t border-[var(--divider)] pt-3">
            <button
              onClick={onRelayout}
              className="atlas-btn-primary w-full px-4 py-2 text-sm font-medium"
            >
              {t.filters.relayout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
