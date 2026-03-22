"use client";

import { useCallback } from "react";
import { type Node, type Edge } from "@xyflow/react";
import {
  getLayoutedElements,
  centerMainTheoremNode,
  scaleToViewportAspectRatio,
} from "@/lib/layout";
import { getTransitiveDependencies } from "@/lib/dependencies";
import type { CustomNodeData, EdgeData } from "@/lib/types";
import { calculateNodeDiameter, getNodeDegree, NODE_SIZE_CONFIG } from "@/lib/lineSize";

interface UseRelayoutOptions {
  filteredNodes: CustomNodeData[];
  filteredNodeIds: Set<string>;
  edges: EdgeData[];
  mainTheoremSink: string | null;
  nodesWithDependents: Map<string, CustomNodeData>;
  layoutDirection: "TB" | "BT";
  nodePositions: Map<string, { x: number; y: number }>;
  updatePositions: (positions: Map<string, { x: number; y: number }>) => void;
  clearHighlight: () => void;
  requestFitView: () => void;
}

interface UseRelayoutResult {
  handleRelayout: () => void;
}

/**
 * グラフ再レイアウト処理を提供するフック
 */
export function useRelayout(options: UseRelayoutOptions): UseRelayoutResult {
  const {
    filteredNodes,
    filteredNodeIds,
    edges,
    mainTheoremSink,
    nodesWithDependents,
    layoutDirection,
    nodePositions,
    updatePositions,
    clearHighlight,
    requestFitView,
  } = options;

  const handleRelayout = useCallback(() => {
    // ハイライト状態をクリア
    clearHighlight();

    const rfNodes: Node<CustomNodeData>[] = filteredNodes.map((node) => {
      const isSink = mainTheoremSink === node.id;
      const diameter = isSink
        ? NODE_SIZE_CONFIG.sinkDiameter
        : calculateNodeDiameter(getNodeDegree(node));
      return {
        id: node.id,
        type: "custom",
        position: { x: 0, y: 0 },
        width: diameter,
        height: diameter,
        hidden: false,
        data: {
          ...node,
          isSink,
          isHighlighted: true,
        },
      };
    });

    const rfEdges: Edge[] = edges
      .filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
      )
      .map((edge) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: false,
        hidden: false,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      }));

    const layouted = getLayoutedElements(
      rfNodes,
      rfEdges,
      layoutDirection,
      mainTheoremSink ?? undefined,
    );

    // 主要定理を依存先ノード群の中央に配置
    let centeredNodes = layouted.nodes;
    if (mainTheoremSink) {
      const transitiveDeps = getTransitiveDependencies(
        mainTheoremSink,
        nodesWithDependents,
      );
      centeredNodes = centerMainTheoremNode(
        layouted.nodes,
        mainTheoremSink,
        transitiveDeps,
      );
    }

    // ビューポートアスペクト比に合わせてスケーリング
    const reactFlowEl = document.querySelector(".react-flow");
    const viewportWidth = reactFlowEl?.clientWidth ?? window.innerWidth;
    const viewportHeight = reactFlowEl?.clientHeight ?? window.innerHeight;
    centeredNodes = scaleToViewportAspectRatio(
      centeredNodes,
      viewportWidth,
      viewportHeight,
    );

    // 座標を更新
    const newPositions = new Map(nodePositions);
    centeredNodes.forEach((n) => newPositions.set(n.id, n.position));
    updatePositions(newPositions);
    requestFitView();
  }, [
    filteredNodes,
    filteredNodeIds,
    edges,
    mainTheoremSink,
    nodesWithDependents,
    layoutDirection,
    nodePositions,
    updatePositions,
    clearHighlight,
    requestFitView,
  ]);

  return { handleRelayout };
}
