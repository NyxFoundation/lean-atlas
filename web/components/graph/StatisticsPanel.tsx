"use client";

import { useState } from "react";
import { Panel } from "@xyflow/react";
import type { NodeStats } from "@/lib/statistics";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface MainTheorem {
  id: string;
  shortName: string;
  paperRef?: string | null;
  name?: string | null;
}

interface StatisticsPanelProps {
  mainTheorems: MainTheorem[];
  mainTheoremSink: string | null;
  onMainTheoremChange: (id: string) => void;
  stats: NodeStats;
}

export function StatisticsPanel({
  mainTheorems,
  mainTheoremSink,
  onMainTheoremChange,
  stats,
}: StatisticsPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Percentage calculations
  const highOrAbovePercent =
    stats.nodes > 0
      ? (
          ((stats.confidencePerfect + stats.confidenceHigh) / stats.nodes) *
          100
        ).toFixed(1)
      : "0.0";
  const perfectPercent =
    stats.nodes > 0
      ? ((stats.confidencePerfect / stats.nodes) * 100).toFixed(1)
      : "0.0";
  const completedPercent =
    stats.nodes > 0
      ? (((stats.nodes - stats.sorries) / stats.nodes) * 100).toFixed(1)
      : "0.0";

  return (
    <Panel
      position="top-center"
      className="atlas-panel transition-all duration-200 overflow-hidden"
    >
      {/* Row 1: Main statistics bar (clickable) */}
      <div
        className="flex items-center gap-4 text-sm px-4 py-2 cursor-pointer select-none hover:bg-orange-50/40 dark:hover:bg-purple-900/20"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Main theorem selector */}
        {mainTheorems.length > 0 && (
          <>
            <select
              value={mainTheoremSink || mainTheorems[0]?.id || ""}
              onChange={(e) => onMainTheoremChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 text-sm rounded border border-orange-300 dark:border-purple-600 bg-[var(--panel-bg-solid)] text-[var(--panel-text)] focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-purple-500"
            >
              {mainTheorems.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {mt.paperRef || mt.name || mt.shortName}
                </option>
              ))}
            </select>
            <span className="text-[var(--divider)]">|</span>
          </>
        )}
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.nodes}
          </span>{" "}
          {t.stats.nodes}
        </span>
        <span className="text-[var(--divider)]">|</span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.theorems}
          </span>{" "}
          {t.stats.theorems}
        </span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.definitions}
          </span>{" "}
          {t.stats.definitions}
        </span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.axioms}
          </span>{" "}
          {t.stats.axioms}
        </span>
        <span className="text-[var(--divider)]">|</span>
        {/* Confidence levels */}
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.confidencePerfect}
          </span>{" "}
          {t.confidenceLevels.perfect}
        </span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.confidenceHigh}
          </span>{" "}
          {t.confidenceLevels.high}
        </span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.confidenceMedium}
          </span>{" "}
          {t.confidenceLevels.medium}
        </span>
        <span className="text-[var(--panel-text-muted)]">
          <span className="font-medium text-[var(--panel-text)]">
            {stats.confidenceLow}
          </span>{" "}
          {t.confidenceLevels.low}
        </span>
        {/* Expand indicator */}
        <span className="text-[var(--panel-text-muted)] text-xs ml-auto">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Row 2: Percentage information (visible when expanded) */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-6 text-sm px-4 py-2 border-t border-orange-200/50 dark:border-purple-800/30 bg-orange-50/30 dark:bg-purple-900/15">
          <span className="text-[var(--panel-text-muted)]">
            {t.stats.highOrAbove}{" "}
            <span className="font-medium text-[var(--panel-text)]">
              {highOrAbovePercent}%
            </span>
          </span>
          <span className="text-[var(--panel-text-muted)]">
            {t.stats.perfect}{" "}
            <span className="font-medium text-[var(--panel-text)]">
              {perfectPercent}%
            </span>
          </span>
          <span className="text-[var(--panel-text-muted)]">
            {t.stats.proofComplete}{" "}
            <span className="font-medium text-[var(--panel-text)]">
              {completedPercent}%
            </span>
          </span>
        </div>
      </div>
    </Panel>
  );
}
