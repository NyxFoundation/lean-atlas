import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "./types";
import type { LayoutDirection } from "./settings";
import { calculateNodeDiameter, getNodeDegree, NODE_SIZE_CONFIG } from "./lineSize";

export const sinkNodeWidth = NODE_SIZE_CONFIG.sinkDiameter;
export const sinkNodeHeight = NODE_SIZE_CONFIG.sinkDiameter;

/** ジッターの最大振幅（px）。各軸で ±JITTER_AMOUNT/2 の範囲 */
const JITTER_AMOUNT = 60;

/** 文字列 → 32bit ハッシュ (FNV-1a) */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 整数シード → [0, 1) の擬似乱数 */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}

export function getLayoutedElements(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
  sinkNodeId?: string,
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    edgesep: 30,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    const isSink = node.id === sinkNodeId;
    const d = isSink
      ? NODE_SIZE_CONFIG.sinkDiameter
      : calculateNodeDiameter(getNodeDegree(node.data));
    dagreGraph.setNode(node.id, { width: d, height: d });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isSink = node.id === sinkNodeId;
    const d = isSink
      ? NODE_SIZE_CONFIG.sinkDiameter
      : calculateNodeDiameter(getNodeDegree(node.data));
    // TB: target=top, source=bottom
    // BT: target=bottom, source=top
    const targetPosition = direction === "BT" ? "bottom" : "top";
    const sourcePosition = direction === "BT" ? "top" : "bottom";

    // sink ノード以外に決定論的ジッターを適用
    let jitterX = 0;
    let jitterY = 0;
    if (!isSink) {
      const h = hashString(node.id);
      jitterX = (seededRandom(h) - 0.5) * JITTER_AMOUNT;
      jitterY = (seededRandom(h ^ 0x9e3779b9) - 0.5) * JITTER_AMOUNT;
    }

    return {
      ...node,
      targetPosition,
      sourcePosition,
      width: d,
      height: d,
      position: {
        x: nodeWithPosition.x - d / 2 + jitterX,
        y: nodeWithPosition.y - d / 2 + jitterY,
      },
    } as Node<CustomNodeData>;
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * 主要定理のx座標を依存先ノード群の中央に配置
 * @param nodes - レイアウト済みノード配列
 * @param mainTheoremId - 主要定理のノードID
 * @param dependencyIds - 主要定理の依存先ノードID（推移的依存、主要定理自身を含む）
 * @returns 主要定理のx座標が調整されたノード配列
 */
export function centerMainTheoremNode(
  nodes: Node<CustomNodeData>[],
  mainTheoremId: string,
  dependencyIds: Set<string>,
): Node<CustomNodeData>[] {
  const mainTheoremNode = nodes.find((n) => n.id === mainTheoremId);
  if (!mainTheoremNode) return nodes;

  // 依存先ノード（主要定理自身を除く）のx座標を収集
  const depNodes = nodes.filter(
    (n) => dependencyIds.has(n.id) && n.id !== mainTheoremId,
  );

  if (depNodes.length === 0) return nodes;

  // 左端と右端のx座標を計算
  const xCoords = depNodes.map((n) => n.position.x);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);

  // 中央のx座標を計算
  const centerX = (minX + maxX) / 2;

  // 主要定理のx座標を更新
  return nodes.map((node) => {
    if (node.id === mainTheoremId) {
      return {
        ...node,
        position: { ...node.position, x: centerX },
      };
    }
    return node;
  });
}

/**
 * ノード座標をビューポートのアスペクト比に合わせてスケーリング
 * dagre レイアウトは正方形に近い配置を生成するため、
 * ワイドスクリーンでは fitView 後にホワイトスペースが生じる。
 * この関数は短い軸を伸張してビューポートを有効活用する。
 *
 * @param nodes - レイアウト済みノード配列
 * @param viewportWidth - ビューポートの幅（px）
 * @param viewportHeight - ビューポートの高さ（px）
 * @param maxScale - 最大スケーリング係数（デフォルト 3.0）
 * @returns スケーリングされたノード配列
 */
export function scaleToViewportAspectRatio(
  nodes: Node<CustomNodeData>[],
  viewportWidth: number,
  viewportHeight: number,
  maxScale: number = 3.0,
): Node<CustomNodeData>[] {
  if (nodes.length <= 1) return nodes;

  // バウンディングボックスを算出（ノードサイズを含む）
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const d = node.data.isSink
      ? NODE_SIZE_CONFIG.sinkDiameter
      : calculateNodeDiameter(getNodeDegree(node.data));
    const left = node.position.x;
    const right = node.position.x + d;
    const top = node.position.y;
    const bottom = node.position.y + d;
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  }

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  // 幅または高さが最小ノード以下ならスキップ
  if (graphWidth <= NODE_SIZE_CONFIG.minDiameter || graphHeight <= NODE_SIZE_CONFIG.minDiameter) return nodes;

  const currentAR = graphWidth / graphHeight;
  const targetAR = viewportWidth / viewportHeight;

  let scaleX = 1.0;
  let scaleY = 1.0;

  if (currentAR < targetAR) {
    // 縦長 → X方向を伸張
    scaleX = Math.min(targetAR / currentAR, maxScale);
  } else if (currentAR > targetAR) {
    // 横長 → Y方向を伸張
    scaleY = Math.min(currentAR / targetAR, maxScale);
  }

  // スケーリング係数が 1.0 ± 0.05 以内なら不要
  if (Math.abs(scaleX - 1.0) < 0.05 && Math.abs(scaleY - 1.0) < 0.05) {
    return nodes;
  }

  // バウンディングボックスの中心を基準にスケーリング
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return nodes.map((node) => ({
    ...node,
    position: {
      x: centerX + (node.position.x - centerX) * scaleX,
      y: centerY + (node.position.y - centerY) * scaleY,
    },
  }));
}
