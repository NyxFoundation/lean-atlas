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
 * ノードのハイライト状態を管理するフック
 * 選択ノード + 直接依存 + 直接被依存をハイライト
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

      // フィルター済みノード内の直接依存・被依存のみ
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
