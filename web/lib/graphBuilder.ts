import { Position, MarkerType, type Node, type Edge } from "@xyflow/react";
import type { CustomNodeData, EdgeData, EdgeVisualKind } from "@/lib/types";
import { EDGE_KIND_STYLES, edgeKindToVisualKind } from "@/lib/constants";
import { calculateNodeDiameter, getNodeDegree, NODE_SIZE_CONFIG } from "@/lib/lineSize";

interface BuildDisplayNodesOptions {
  filteredNodes: CustomNodeData[];
  nodePositions: Map<string, { x: number; y: number }>;
  layoutDirection: "TB" | "BT";
  mainTheoremSink: string | null;
  highlightedNodeIds: Set<string> | null;
  selectedNodeId: string | null;
  verificationTargetIds: Set<string> | null;
}

/**
 * React Flow 用の表示ノードを構築
 */
export function buildDisplayNodes(
  options: BuildDisplayNodesOptions,
): Node<CustomNodeData>[] {
  const {
    filteredNodes,
    nodePositions,
    layoutDirection,
    mainTheoremSink,
    highlightedNodeIds,
    selectedNodeId,
    verificationTargetIds,
  } = options;

  // レイアウト方向に基づいてハンドル位置を決定
  const targetPosition =
    layoutDirection === "BT" ? Position.Bottom : Position.Top;
  const sourcePosition =
    layoutDirection === "BT" ? Position.Top : Position.Bottom;

  return filteredNodes.map((node) => {
    const position = nodePositions.get(node.id) || { x: 0, y: 0 };
    // ハイライト状態を決定（null = ハイライトモードOFF = 全てハイライト扱い）
    const isHighlighted =
      highlightedNodeIds === null ? true : highlightedNodeIds.has(node.id);
    // 検証対象判定（null = 主定理なし = 全てデフォルト扱い）
    const isVerificationTarget =
      verificationTargetIds === null
        ? true
        : node.kind === "axiom" || verificationTargetIds.has(node.id);

    const isSink = mainTheoremSink === node.id;
    const diameter = isSink
      ? NODE_SIZE_CONFIG.sinkDiameter
      : calculateNodeDiameter(getNodeDegree(node));

    return {
      id: node.id,
      type: "custom" as const,
      position,
      targetPosition,
      sourcePosition,
      width: diameter,
      height: diameter,
      hidden: false,
      data: {
        ...node,
        isSink,
        isHighlighted,
        isSelected: selectedNodeId === node.id,
        isVerificationTarget,
      },
    };
  });
}

interface BuildDisplayEdgesOptions {
  edges: EdgeData[];
  filteredNodeIds: Set<string>;
  highlightedNodeIds: Set<string> | null;
  edgeKindFilter?: Set<EdgeVisualKind>;
  theme?: string;
}

/**
 * React Flow 用の表示エッジを構築
 */
export function buildDisplayEdges(options: BuildDisplayEdgesOptions): Edge[] {
  const { edges, filteredNodeIds, highlightedNodeIds, edgeKindFilter, theme } =
    options;

  return edges
    .filter((e) => {
      // ノードフィルター
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) {
        return false;
      }
      // エッジ種類フィルター（視覚カテゴリで判定）
      if (edgeKindFilter && edgeKindFilter.size < 2) {
        const visualKind = edgeKindToVisualKind(e.kind);
        if (!edgeKindFilter.has(visualKind)) {
          return false;
        }
      }
      return true;
    })
    .map((edge) => {
      // エッジのハイライト: 両端ともハイライトされている場合のみ不透明
      const edgeHighlighted =
        highlightedNodeIds === null
          ? true
          : highlightedNodeIds.has(edge.source) &&
            highlightedNodeIds.has(edge.target);

      // エッジ種類に応じたスタイル（視覚カテゴリで決定）
      const visualKind = edgeKindToVisualKind(edge.kind);
      const kindStyle = EDGE_KIND_STYLES[visualKind];
      const edgeColor =
        theme === "dark" ? kindStyle.color.dark : kindStyle.color.light;

      return {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: true,
        hidden: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: edgeColor,
        },
        style: {
          stroke: edgeColor,
          strokeWidth: kindStyle.strokeWidth,
          strokeDasharray: kindStyle.strokeDasharray,
          opacity: edgeHighlighted ? 1 : 0.15,
        },
      };
    });
}
