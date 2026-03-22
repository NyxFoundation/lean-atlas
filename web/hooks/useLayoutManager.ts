"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  getLayoutedElements,
  centerMainTheoremNode,
  scaleToViewportAspectRatio,
} from "@/lib/layout";
import { getTransitiveDependencies } from "@/lib/dependencies";
import type { CustomNodeData, GraphData } from "@/lib/types";
import type { LayoutDirection } from "@/lib/settings";
import { calculateNodeDiameter, getNodeDegree, NODE_SIZE_CONFIG } from "@/lib/lineSize";

interface UseLayoutManagerProps {
  data: GraphData | null;
  nodesWithDependents: Map<string, CustomNodeData>;
  mainTheoremSink: string | null;
  layoutDirection: LayoutDirection;
  requestFitView: () => void;
}

interface UseLayoutManagerResult {
  nodePositions: Map<string, { x: number; y: number }>;
  updatePositions: (
    newPositions: Map<string, { x: number; y: number }>,
  ) => void;
}

export function useLayoutManager({
  data,
  nodesWithDependents,
  mainTheoremSink,
  layoutDirection,
  requestFitView,
}: UseLayoutManagerProps): UseLayoutManagerResult {
  // ノードの座標をマップで保持（id -> position）
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // 前回の主定理とレイアウト方向を追跡して変更を検出
  const prevMainTheoremRef = useRef<string | null>(null);
  const prevLayoutDirectionRef = useRef<LayoutDirection>(layoutDirection);

  // 主定理変更時またはレイアウト方向変更時に依存グラフでレイアウト再計算
  useEffect(() => {
    if (!data || !mainTheoremSink) return;
    let rafId: number | null = null;

    // 主定理もレイアウト方向も変わっていない場合はスキップ
    const mainTheoremChanged = prevMainTheoremRef.current !== mainTheoremSink;
    const layoutDirectionChanged =
      prevLayoutDirectionRef.current !== layoutDirection;
    if (!mainTheoremChanged && !layoutDirectionChanged) return;

    prevMainTheoremRef.current = mainTheoremSink;
    prevLayoutDirectionRef.current = layoutDirection;

    // sink の依存ノードのみでレイアウト計算
    const sinkDeps = getTransitiveDependencies(
      mainTheoremSink,
      nodesWithDependents,
    );
    const sinkNodes = Array.from(nodesWithDependents.values()).filter((n) =>
      sinkDeps.has(n.id),
    );

    // レイアウト計算
    const rfNodes: Node<CustomNodeData>[] = sinkNodes.map((node) => {
      const isSink = node.id === mainTheoremSink;
      const diameter = isSink
        ? NODE_SIZE_CONFIG.sinkDiameter
        : calculateNodeDiameter(getNodeDegree(node));
      return {
        id: node.id,
        type: "custom",
        position: { x: 0, y: 0 },
        width: diameter,
        height: diameter,
        data: node,
      };
    });

    const rfEdges: Edge[] = data.edges
      .filter((e) => sinkDeps.has(e.source) && sinkDeps.has(e.target))
      .map((edge) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: false,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      }));

    const layouted = getLayoutedElements(
      rfNodes,
      rfEdges,
      layoutDirection,
      mainTheoremSink,
    );

    // 主要定理を依存先ノード群の中央に配置
    const centeredNodes = centerMainTheoremNode(
      layouted.nodes,
      mainTheoremSink,
      sinkDeps,
    );

    // ビューポートアスペクト比に合わせてスケーリング
    const reactFlowEl = document.querySelector(".react-flow");
    const viewportWidth = reactFlowEl?.clientWidth ?? window.innerWidth;
    const viewportHeight = reactFlowEl?.clientHeight ?? window.innerHeight;
    const scaledNodes = scaleToViewportAspectRatio(
      centeredNodes,
      viewportWidth,
      viewportHeight,
    );

    // 座標を保存
    const newPositions = new Map<string, { x: number; y: number }>();
    scaledNodes.forEach((n) => newPositions.set(n.id, n.position));
    rafId = window.requestAnimationFrame(() => {
      setNodePositions(newPositions);
      requestFitView();
    });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    mainTheoremSink,
    data,
    nodesWithDependents,
    layoutDirection,
    requestFitView,
  ]);

  // 外部から座標を更新するための関数
  const updatePositions = useCallback(
    (newPositions: Map<string, { x: number; y: number }>) => {
      setNodePositions(newPositions);
    },
    [],
  );

  return {
    nodePositions,
    updatePositions,
  };
}
