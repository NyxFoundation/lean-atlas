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
import {
  calculateNodeDiameter,
  getNodeDegree,
  NODE_SIZE_CONFIG,
} from "@/lib/lineSize";

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
  // Store node positions in a map (id -> position)
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Track previous main theorem and layout direction to detect changes
  const prevMainTheoremRef = useRef<string | null>(null);
  const prevLayoutDirectionRef = useRef<LayoutDirection>(layoutDirection);

  // Recalculate layout for the dependency graph when main theorem or layout direction changes
  useEffect(() => {
    if (!data || !mainTheoremSink) return;
    let rafId: number | null = null;

    // Skip if neither the main theorem nor the layout direction has changed
    const mainTheoremChanged = prevMainTheoremRef.current !== mainTheoremSink;
    const layoutDirectionChanged =
      prevLayoutDirectionRef.current !== layoutDirection;
    if (!mainTheoremChanged && !layoutDirectionChanged) return;

    prevMainTheoremRef.current = mainTheoremSink;
    prevLayoutDirectionRef.current = layoutDirection;

    // Compute layout using only the sink's dependency nodes
    const sinkDeps = getTransitiveDependencies(
      mainTheoremSink,
      nodesWithDependents,
    );
    const sinkNodes = Array.from(nodesWithDependents.values()).filter((n) =>
      sinkDeps.has(n.id),
    );

    // Compute layout
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

    // Center the main theorem node among its dependency nodes
    const centeredNodes = centerMainTheoremNode(
      layouted.nodes,
      mainTheoremSink,
      sinkDeps,
    );

    // Scale to match the viewport aspect ratio
    const reactFlowEl = document.querySelector(".react-flow");
    const viewportWidth = reactFlowEl?.clientWidth ?? window.innerWidth;
    const viewportHeight = reactFlowEl?.clientHeight ?? window.innerHeight;
    const scaledNodes = scaleToViewportAspectRatio(
      centeredNodes,
      viewportWidth,
      viewportHeight,
    );

    // Save positions
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

  // Function to update positions from external callers
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
