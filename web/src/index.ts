/**
 * @nyx-foundation/lean-atlas
 *
 * Interactive dependency graph viewer for Lean 4 formalization projects.
 *
 * Public API exports for npm package consumers.
 */

// Main component
export { AtlasViewer } from "./AtlasViewer";
export type { AtlasViewerProps } from "./AtlasViewer";

// Types
export type {
  GraphData,
  GraphMetadata,
  GraphStatistics,
  NodeData,
  NodeMeta,
  EdgeData,
  EdgeKind,
  EdgeVisualKind,
  CustomNodeData,
  FilterState,
  Confidence,
  ProofProgress,
  DefProgress,
  SubKind,
  DependencyFilter,
  DependencyFilterMode,
} from "../lib/types";

// Settings
export type { Settings, LayoutDirection, ThemeMode } from "../lib/settings";

// i18n
export type { Language, TranslationDict } from "../lib/i18n/types";
