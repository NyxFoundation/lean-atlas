"use client";

import type { DefProgress, ProofProgress } from "@/lib/types";
import {
  DEF_PROGRESS_FILTER_STYLES,
  PROOF_PROGRESS_FILTER_STYLES,
} from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { FilterSection, ToggleButtonGroup } from "@/components/graph/filters";
import type { ProgressFilterSectionProps } from "@/components/graph/filters/types";

export function ProgressFilterSection({
  filters,
  onToggleProofProgress,
  onToggleDefProgress,
}: ProgressFilterSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <FilterSection label={t.filters.proofProgress}>
        <ToggleButtonGroup
          options={PROOF_PROGRESS_FILTER_STYLES.map(({ id, color }) => ({
            id,
            label: t.proofProgressLevels[id],
            color,
          }))}
          selectedIds={filters.proofProgress as Set<string>}
          onToggle={(id) => onToggleProofProgress(id as ProofProgress)}
        />
      </FilterSection>

      <FilterSection label={t.filters.defProgress}>
        <ToggleButtonGroup
          options={DEF_PROGRESS_FILTER_STYLES.map(({ id, color }) => ({
            id,
            label: t.defProgressLevels[id],
            color,
          }))}
          selectedIds={filters.defProgress as Set<string>}
          onToggle={(id) => onToggleDefProgress(id as DefProgress)}
        />
      </FilterSection>
    </>
  );
}
