"use client";

import { useState, useCallback } from "react";
import type { CustomNodeData } from "@/lib/types";

interface UseNodeHighlightResult {
  highlightedNodeIds: Set<string> | null;
  computeHighlight: (
    nodeId: string,
    nodesWithDependents: Map<string, CustomNodeData>,
    filteredNodeIds: Set<string>,
  ) => void;
  clearHighlight: () => void;
}

/**
 * Hook that manages node highlight state.
 * Highlights the selected node + its direct dependencies + direct dependents.
 */
export function useNodeHighlight(): UseNodeHighlightResult {
  const [highlightedNodeIds, setHighlightedNodeIds] =
    useState<Set<string> | null>(null);

  const computeHighlight = useCallback(
    (
      nodeId: string,
      nodesWithDependents: Map<string, CustomNodeData>,
      filteredNodeIds: Set<string>,
    ) => {
      const nodeData = nodesWithDependents.get(nodeId);
      if (!nodeData) return;

      const highlighted = new Set<string>();
      highlighted.add(nodeId);

      // Only include direct dependencies and dependents within the filtered nodes
      nodeData.dependencies.forEach((dep) => {
        if (filteredNodeIds.has(dep)) highlighted.add(dep);
      });
      nodeData.dependents.forEach((dep) => {
        if (filteredNodeIds.has(dep)) highlighted.add(dep);
      });

      setHighlightedNodeIds(highlighted);
    },
    [],
  );

  const clearHighlight = useCallback(() => {
    setHighlightedNodeIds(null);
  }, []);

  return {
    highlightedNodeIds,
    computeHighlight,
    clearHighlight,
  };
}
