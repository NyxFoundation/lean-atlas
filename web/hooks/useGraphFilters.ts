"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { LineBoundaries } from "@/lib/lineSize";
import {
  buildAllowedByDependencyFilter,
  buildAllowedBySink,
  matchesConfidence,
  matchesDirectory,
  matchesKindAndSubKind,
  matchesLineSize,
  matchesPaperRef,
  matchesProgress,
  matchesSearchQuery,
  matchesSorry,
  shouldBypassRegularFiltersForMainTheorem,
} from "@/lib/graphFilterPredicates";

const THEOREM_SUBKINDS: SubKind[] = ["theorem_manual", "theorem_auto"];
const DEFINITION_SUBKINDS: SubKind[] = [
  "definition",
  "inductive",
  "structure",
  "abbrev",
];

function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

function toggleSetItemWithMinimumSize<T>(
  set: Set<T>,
  item: T,
  minimumSize: number,
): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    if (newSet.size > minimumSize) {
      newSet.delete(item);
    }
    return newSet;
  }

  newSet.add(item);
  return newSet;
}

function withSetItems<T>(
  set: Set<T>,
  items: readonly T[],
  add: boolean,
): Set<T> {
  const newSet = new Set(set);
  items.forEach((item) => {
    if (add) {
      newSet.add(item);
    } else {
      newSet.delete(item);
    }
  });
  return newSet;
}

function updateDependencyFilter(
  prev: FilterState,
  updater: (
    dependencyFilter: FilterState["dependencyFilter"],
  ) => FilterState["dependencyFilter"],
): FilterState {
  return {
    ...prev,
    dependencyFilter: updater(prev.dependencyFilter),
  };
}

function createDefaultFilters(): FilterState {
  return {
    kinds: new Set(["theorem", "definition", "axiom"]),
    subKinds: new Set([
      "theorem_manual",
      "theorem_auto",
      "definition",
      "inductive",
      "structure",
      "abbrev",
    ] as SubKind[]),
    confidence: new Set(["perfect", "high", "medium", "low"] as Confidence[]),
    proofProgress: new Set([
      "complete",
      "mostly",
      "partially",
      "stub",
    ] as ProofProgress[]),
    defProgress: new Set(["complete", "partially"] as DefProgress[]),
    sorryFilter: new Set(["hasSorry", "noSorry"] as SorryFilter[]),
    searchQuery: "",
    directories: new Set<string>(),
    paperRefFilter: null,
    mainTheoremSink: null,
    alwaysShowMainTheorems: true,
    lineSize: new Set(["small", "medium", "large"] as LineSizeCategory[]),
    dependencyFilter: {
      nodeIds: new Set<string>(),
      mode: "dependencies" as DependencyFilterMode,
      isActive: false,
    },
    edgeKinds: new Set(["type", "value"] as EdgeVisualKind[]),
    typeReachableOnly: false,
  };
}

interface UseGraphFiltersResult {
  filters: FilterState;
  toggleSorryFilter: (filter: SorryFilter) => void;
  setSearchQuery: (query: string) => void;
  setMainTheoremSink: (id: string | null) => void;
  setAlwaysShowMainTheorems: (value: boolean) => void;
  toggleKind: (kind: string) => void;
  toggleConfidence: (conf: Confidence) => void;
  toggleProofProgress: (pp: ProofProgress) => void;
  toggleDefProgress: (dp: DefProgress) => void;
  toggleDirectory: (dir: string) => void;
  toggleLineSize: (size: LineSizeCategory) => void;
  toggleSubKind: (subKind: SubKind) => void;
  selectAllSubKinds: (parentKind: "theorem" | "definition") => void;
  deselectAllSubKinds: (parentKind: "theorem" | "definition") => void;
  resetFilters: () => void;
  filterNodes: (
    nodes: Map<string, CustomNodeData>,
    lineBoundaries: LineBoundaries,
  ) => CustomNodeData[];
  addDependencyFilterNode: (nodeId: string) => void;
  removeDependencyFilterNode: (nodeId: string) => void;
  setDependencyFilterMode: (mode: DependencyFilterMode) => void;
  toggleDependencyFilter: (active: boolean) => void;
  clearDependencyFilter: () => void;
  toggleEdgeKind: (kind: EdgeVisualKind) => void;
  setTypeReachableOnly: (value: boolean) => void;
}

export function useGraphFilters(
  allDirectories: string[] = [],
): UseGraphFiltersResult {
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...createDefaultFilters(),
    directories: new Set(allDirectories),
  }));

  const hasInitializedDirectories = useRef(false);
  useEffect(() => {
    if (!hasInitializedDirectories.current && allDirectories.length > 0) {
      hasInitializedDirectories.current = true;
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setFilters((prev) => ({
          ...prev,
          directories: new Set(allDirectories),
        }));
      });
      return () => {
        cancelled = true;
      };
    }
  }, [allDirectories]);

  const toggleSorryFilter = useCallback((filter: SorryFilter) => {
    setFilters((prev) => ({
      ...prev,
      sorryFilter: toggleSetItemWithMinimumSize(prev.sorryFilter, filter, 1),
    }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setMainTheoremSink = useCallback((mainTheoremSink: string | null) => {
    setFilters((prev) => ({ ...prev, mainTheoremSink }));
  }, []);

  const setAlwaysShowMainTheorems = useCallback((value: boolean) => {
    setFilters((prev) => ({ ...prev, alwaysShowMainTheorems: value }));
  }, []);

  const toggleKind = useCallback((kind: string) => {
    setFilters((prev) => ({ ...prev, kinds: toggleSetItem(prev.kinds, kind) }));
  }, []);

  const toggleConfidence = useCallback((conf: Confidence) => {
    setFilters((prev) => ({
      ...prev,
      confidence: toggleSetItem(prev.confidence, conf),
    }));
  }, []);

  const toggleProofProgress = useCallback((pp: ProofProgress) => {
    setFilters((prev) => ({
      ...prev,
      proofProgress: toggleSetItem(prev.proofProgress, pp),
    }));
  }, []);

  const toggleDefProgress = useCallback((dp: DefProgress) => {
    setFilters((prev) => ({
      ...prev,
      defProgress: toggleSetItem(prev.defProgress, dp),
    }));
  }, []);

  const toggleDirectory = useCallback((dir: string) => {
    setFilters((prev) => ({
      ...prev,
      directories: toggleSetItem(prev.directories, dir),
    }));
  }, []);

  const toggleLineSize = useCallback((size: LineSizeCategory) => {
    setFilters((prev) => ({
      ...prev,
      lineSize: toggleSetItem(prev.lineSize, size),
    }));
  }, []);

  const toggleSubKind = useCallback((subKind: SubKind) => {
    setFilters((prev) => ({
      ...prev,
      subKinds: toggleSetItem(prev.subKinds, subKind),
    }));
  }, []);

  const selectAllSubKinds = useCallback(
    (parentKind: "theorem" | "definition") => {
      setFilters((prev) => ({
        ...prev,
        subKinds: withSetItems(
          prev.subKinds,
          parentKind === "theorem" ? THEOREM_SUBKINDS : DEFINITION_SUBKINDS,
          true,
        ),
      }));
    },
    [],
  );

  const deselectAllSubKinds = useCallback(
    (parentKind: "theorem" | "definition") => {
      setFilters((prev) => ({
        ...prev,
        subKinds: withSetItems(
          prev.subKinds,
          parentKind === "theorem" ? THEOREM_SUBKINDS : DEFINITION_SUBKINDS,
          false,
        ),
      }));
    },
    [],
  );

  const addDependencyFilterNode = useCallback((nodeId: string) => {
    setFilters((prev) =>
      updateDependencyFilter(prev, (dependencyFilter) => ({
        ...dependencyFilter,
        nodeIds: withSetItems(dependencyFilter.nodeIds, [nodeId], true),
      })),
    );
  }, []);

  const removeDependencyFilterNode = useCallback((nodeId: string) => {
    setFilters((prev) =>
      updateDependencyFilter(prev, (dependencyFilter) => ({
        ...dependencyFilter,
        nodeIds: withSetItems(dependencyFilter.nodeIds, [nodeId], false),
      })),
    );
  }, []);

  const setDependencyFilterMode = useCallback((mode: DependencyFilterMode) => {
    setFilters((prev) =>
      updateDependencyFilter(prev, (dependencyFilter) => ({
        ...dependencyFilter,
        mode,
      })),
    );
  }, []);

  const toggleDependencyFilter = useCallback((active: boolean) => {
    setFilters((prev) =>
      updateDependencyFilter(prev, (dependencyFilter) => ({
        ...dependencyFilter,
        isActive: active,
      })),
    );
  }, []);

  const clearDependencyFilter = useCallback(() => {
    setFilters((prev) =>
      updateDependencyFilter(prev, () => ({
        nodeIds: new Set<string>(),
        mode: "dependencies",
        isActive: false,
      })),
    );
  }, []);

  const toggleEdgeKind = useCallback((kind: EdgeVisualKind) => {
    setFilters((prev) => ({
      ...prev,
      edgeKinds: toggleSetItemWithMinimumSize(prev.edgeKinds, kind, 1),
    }));
  }, []);

  const setTypeReachableOnly = useCallback((value: boolean) => {
    setFilters((prev) => ({ ...prev, typeReachableOnly: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...createDefaultFilters(),
      directories: new Set(allDirectories),
      mainTheoremSink: prev.mainTheoremSink,
    }));
  }, [allDirectories]);

  const filterNodes = useCallback(
    (
      nodes: Map<string, CustomNodeData>,
      lineBoundaries: LineBoundaries,
    ): CustomNodeData[] => {
      const allowedBySink = buildAllowedBySink(filters.mainTheoremSink, nodes);
      const allowedByDependencyFilter = buildAllowedByDependencyFilter(
        filters.dependencyFilter,
        nodes,
      );

      return Array.from(nodes.values()).filter((node) => {
        if (allowedBySink && !allowedBySink.has(node.id)) {
          return false;
        }

        if (
          allowedByDependencyFilter &&
          !allowedByDependencyFilter.has(node.id)
        ) {
          return false;
        }

        if (shouldBypassRegularFiltersForMainTheorem(node, filters)) {
          return matchesSearchQuery(node, filters.searchQuery);
        }

        return (
          matchesKindAndSubKind(node, filters) &&
          matchesConfidence(node, filters) &&
          matchesProgress(node, filters) &&
          matchesSorry(node, filters) &&
          matchesLineSize(node, filters, lineBoundaries) &&
          matchesSearchQuery(node, filters.searchQuery) &&
          matchesDirectory(node, filters) &&
          matchesPaperRef(node, filters)
        );
      });
    },
    [filters],
  );

  return {
    filters,
    toggleSorryFilter,
    setSearchQuery,
    setMainTheoremSink,
    setAlwaysShowMainTheorems,
    toggleKind,
    toggleConfidence,
    toggleProofProgress,
    toggleDefProgress,
    toggleDirectory,
    toggleLineSize,
    toggleSubKind,
    selectAllSubKinds,
    deselectAllSubKinds,
    resetFilters,
    filterNodes,
    addDependencyFilterNode,
    removeDependencyFilterNode,
    setDependencyFilterMode,
    toggleDependencyFilter,
    clearDependencyFilter,
    toggleEdgeKind,
    setTypeReachableOnly,
  };
}
