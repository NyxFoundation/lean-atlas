import type {
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

export interface FilterCounts {
  kinds: { theorem: number; definition: number; axiom: number };
  subKinds: {
    theorem_manual: number;
    theorem_auto: number;
    definition: number;
    inductive: number;
    structure: number;
    abbrev: number;
  };
  confidence: {
    perfect: number;
    high: number;
    medium: number;
    low: number;
  };
  sorry: { hasSorry: number; noSorry: number };
  lineSize: { small: number; medium: number; large: number };
}

export interface FilterOption {
  id: string;
  label: string;
  color: string;
  count?: number;
}

export interface DependencySearchSuggestion {
  id: string;
  shortName: string;
  name: string | null;
}

export interface DependencyFilterProps {
  filters: FilterState;
  nodesMap: Map<string, CustomNodeData>;
  dependencySearchQuery: string;
  dependencySearchSuggestions: DependencySearchSuggestion[];
  onDependencySearchQueryChange: (query: string) => void;
  onAddDependencyFilterNode: (nodeId: string) => void;
  onRemoveDependencyFilterNode: (nodeId: string) => void;
  onSetDependencyFilterMode: (mode: DependencyFilterMode) => void;
  onToggleDependencyFilter: (active: boolean) => void;
  onClearDependencyFilter: () => void;
}

export interface KindFilterSectionProps {
  filters: FilterState;
  kindOptions: FilterOption[];
  filterCounts: FilterCounts;
  onToggleKind: (kind: string) => void;
  onToggleSubKind: (subKind: SubKind) => void;
  onSelectAllSubKinds: (parentKind: "theorem" | "definition") => void;
  onDeselectAllSubKinds: (parentKind: "theorem" | "definition") => void;
}

export interface ProgressFilterSectionProps {
  filters: FilterState;
  onToggleProofProgress: (pp: ProofProgress) => void;
  onToggleDefProgress: (dp: DefProgress) => void;
}

export interface SorryFilterSectionProps {
  selectedSorryFilter: Set<SorryFilter>;
  counts: FilterCounts["sorry"];
  onToggleSorryFilter: (filter: SorryFilter) => void;
}

export interface EdgeKindFilterSectionProps {
  selectedEdgeKinds: Set<EdgeVisualKind>;
  onToggleEdgeKind: (kind: EdgeVisualKind) => void;
}

export interface AdvancedFilterPanelProps extends DependencyFilterProps {
  filters: FilterState;
  directories: string[];
  showAdvancedSearch: boolean;
  onToggleAdvancedSearch: () => void;
  onSetSearchQuery: (query: string) => void;
  onToggleDirectory: (dir: string) => void;
  onSetAlwaysShowMainTheorems: (value: boolean) => void;
}

export interface LineSizeFilterProps {
  selectedLineSizes: Set<LineSizeCategory>;
  lineSizeOptions: FilterOption[];
  onToggleLineSize: (size: LineSizeCategory) => void;
}
