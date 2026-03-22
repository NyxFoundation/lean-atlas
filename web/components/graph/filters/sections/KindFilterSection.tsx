"use client";

import type { SubKind } from "@/lib/types";
import { SUBKIND_FILTER_STYLES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterSection, ToggleButtonGroup } from "@/components/graph/filters";
import type { KindFilterSectionProps } from "@/components/graph/filters/types";

const THEOREM_SUBKINDS: SubKind[] = ["theorem_manual", "theorem_auto"];
const DEFINITION_SUBKINDS: SubKind[] = [
  "definition",
  "inductive",
  "structure",
  "abbrev",
];

function SubKindGroup({
  title,
  subKinds,
  selectedSubKinds,
  counts,
  borderClass,
  selectAllClass,
  onToggleSubKind,
  onSelectAll,
  onDeselectAll,
}: {
  title: string;
  subKinds: SubKind[];
  selectedSubKinds: Set<SubKind>;
  counts: KindFilterSectionProps["filterCounts"]["subKinds"];
  borderClass: string;
  selectAllClass: string;
  onToggleSubKind: (subKind: SubKind) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={`ml-4 mt-2 border-l-2 pl-3 ${borderClass}`}>
      <label className="mb-1 block text-xs text-[var(--panel-text-faint)]">
        {title}
      </label>
      <ToggleButtonGroup
        options={subKinds.map((subKind) => ({
          id: subKind,
          label: t.subKinds[subKind],
          color: SUBKIND_FILTER_STYLES[subKind].color,
          count: counts[subKind],
        }))}
        selectedIds={selectedSubKinds as Set<string>}
        onToggle={(id) => onToggleSubKind(id as SubKind)}
        size="small"
      />
      <div className="mt-1 flex gap-2 text-xs">
        <button onClick={onSelectAll} className={selectAllClass}>
          {t.filters.selectAll}
        </button>
        <button
          onClick={onDeselectAll}
          className="text-[var(--panel-text-muted)] hover:text-[var(--panel-text)]"
        >
          {t.filters.deselectAll}
        </button>
      </div>
    </div>
  );
}

export function KindFilterSection({
  filters,
  kindOptions,
  filterCounts,
  onToggleKind,
  onToggleSubKind,
  onSelectAllSubKinds,
  onDeselectAllSubKinds,
}: KindFilterSectionProps) {
  const { t } = useTranslation();

  return (
    <FilterSection label={t.filters.kind}>
      <ToggleButtonGroup
        options={kindOptions}
        selectedIds={filters.kinds}
        onToggle={onToggleKind}
      />

      {filters.kinds.has("theorem") && (
        <SubKindGroup
          title={t.filters.theoremDetail}
          subKinds={THEOREM_SUBKINDS}
          selectedSubKinds={filters.subKinds}
          counts={filterCounts.subKinds}
          borderClass="border-[var(--divider)]"
          selectAllClass="text-[var(--accent)] hover:text-[var(--accent-hover)]"
          onToggleSubKind={onToggleSubKind}
          onSelectAll={() => onSelectAllSubKinds("theorem")}
          onDeselectAll={() => onDeselectAllSubKinds("theorem")}
        />
      )}

      {filters.kinds.has("definition") && (
        <SubKindGroup
          title={t.filters.definitionDetail}
          subKinds={DEFINITION_SUBKINDS}
          selectedSubKinds={filters.subKinds}
          counts={filterCounts.subKinds}
          borderClass="border-[var(--divider)]"
          selectAllClass="text-[var(--accent)] hover:text-[var(--accent-hover)]"
          onToggleSubKind={onToggleSubKind}
          onSelectAll={() => onSelectAllSubKinds("definition")}
          onDeselectAll={() => onDeselectAllSubKinds("definition")}
        />
      )}
    </FilterSection>
  );
}
