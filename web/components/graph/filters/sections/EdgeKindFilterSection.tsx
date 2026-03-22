"use client";

import type { EdgeVisualKind } from "@/lib/types";
import { EDGE_KIND_STYLES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/components/ThemeProvider";
import { FilterSection, INACTIVE_STYLE } from "@/components/graph/filters";
import type { EdgeKindFilterSectionProps } from "@/components/graph/filters/types";

function useEdgeColor(): string {
  const { theme } = useTheme();
  const style = EDGE_KIND_STYLES.type;
  return theme === "dark" ? style.color.dark : style.color.light;
}

/** SVG でエッジスタイルのレジェンドアイコンを描画 */
function EdgeLineIcon({
  dashed,
  color,
}: {
  dashed: boolean;
  color: string;
}) {
  return (
    <svg width="16" height="8" className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="16"
        y2="4"
        stroke={color}
        strokeWidth={dashed ? 1.5 : 2}
        strokeDasharray={dashed ? "3,2" : undefined}
      />
    </svg>
  );
}

export function EdgeKindFilterSection({
  selectedEdgeKinds,
  onToggleEdgeKind,
}: EdgeKindFilterSectionProps) {
  const { t } = useTranslation();
  const edgeColor = useEdgeColor();

  return (
    <FilterSection label={t.filters.edgeKind}>
      <div className="flex flex-wrap gap-2">
        {(["type", "value"] as EdgeVisualKind[]).map((kind) => {
          const style = EDGE_KIND_STYLES[kind];
          const isSelected = selectedEdgeKinds.has(kind);
          return (
            <button
              key={kind}
              onClick={() => onToggleEdgeKind(kind)}
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-all ${
                isSelected ? style.filterColor : INACTIVE_STYLE
              }`}
            >
              <EdgeLineIcon
                dashed={kind === "value"}
                color={isSelected ? edgeColor : "#9ca3af"}
              />
              {t.edgeKinds[kind]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-[var(--panel-text-faint)]">
        <span className="inline-flex items-center gap-1">
          <EdgeLineIcon dashed={false} color={edgeColor} />
          {t.filters.edgeLegendType}
        </span>
        <span className="mx-2">|</span>
        <span className="inline-flex items-center gap-1">
          <EdgeLineIcon dashed={true} color={edgeColor} />
          {t.filters.edgeLegendValue}
        </span>
      </div>
    </FilterSection>
  );
}
