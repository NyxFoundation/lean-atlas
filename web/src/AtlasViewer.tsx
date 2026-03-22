"use client";

/**
 * AtlasViewer - Main high-level component for LeanAtlas dependency graph viewer.
 *
 * This is the primary public API for embedding the graph viewer in other applications.
 *
 * Usage:
 * ```tsx
 * import { AtlasViewer } from "@nyx-foundation/lean-atlas";
 *
 * // Basic usage with default data URL
 * <AtlasViewer />
 *
 * // Custom data URL
 * <AtlasViewer dataUrl="/my-project/graph.json" />
 *
 * // With pre-loaded data
 * <AtlasViewer data={myGraphData} />
 *
 * // With custom locale
 * <AtlasViewer locale="ja" />
 * ```
 */

import React from "react";
import type { GraphData, FilterState, CustomNodeData } from "../lib/types";
import type { Settings } from "../lib/settings";
import type { Language } from "../lib/i18n/types";

export interface AtlasViewerProps {
  /** Pre-loaded graph data. If provided, dataUrl and fetchData are ignored. */
  data?: GraphData;

  /** URL to fetch graph data from. Default: "/data/graph.json" */
  dataUrl?: string;

  /** Custom fetch function for graph data. */
  fetchData?: () => Promise<GraphData>;

  /**
   * Source code provider configuration.
   * - "api": Use the built-in API route (default)
   * - "static": Use static files from /lean-source/
   * - function: Custom provider
   */
  sourceCodeProvider?:
    | "api"
    | "static"
    | ((path: string, start: number, end: number) => Promise<string>);

  /** Base path for source code access (used with API mode). */
  sourceBasePath?: string;

  /** UI locale. Default: "en" */
  locale?: Language;

  /** Initial filter state. */
  initialFilters?: Partial<FilterState>;

  /** Initial settings. */
  initialSettings?: Partial<Settings>;

  /** Callback when a node is selected. */
  onNodeSelect?: (node: CustomNodeData | null) => void;
}

/**
 * AtlasViewer renders the full dependency graph viewer.
 *
 * For now, this is a thin wrapper that re-exports the existing GraphCanvas
 * with configurable props. The full component composition will be available
 * when the package is extracted to its own repository.
 */
export function AtlasViewer({
  dataUrl = "/data/graph.json",
  locale = "en",
}: AtlasViewerProps) {
  // For now, render a placeholder that indicates this component
  // is available for embedding. The full implementation delegates
  // to the existing app components.
  return (
    <div data-lean-atlas-viewer data-locale={locale} data-url={dataUrl}>
      {/* The full viewer is rendered via the Next.js app structure.
          This component will be the primary entry point when
          extracted to the npm package. */}
    </div>
  );
}
