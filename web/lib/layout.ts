import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "./types";
import type { LayoutDirection } from "./settings";
import {
  calculateNodeDiameter,
  getNodeDegree,
  NODE_SIZE_CONFIG,
} from "./lineSize";

export const sinkNodeWidth = NODE_SIZE_CONFIG.sinkDiameter;
export const sinkNodeHeight = NODE_SIZE_CONFIG.sinkDiameter;

/** Maximum jitter amplitude (px). Each axis ranges within +/-JITTER_AMOUNT/2 */
const JITTER_AMOUNT = 60;

/** String to 32-bit hash (FNV-1a) */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer seed to pseudo-random number in [0, 1) */
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

    // Apply deterministic jitter to non-sink nodes
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
 * Center the main theorem's x-coordinate among its dependency nodes
 * @param nodes - laid-out node array
 * @param mainTheoremId - node ID of the main theorem
 * @param dependencyIds - dependency node IDs of the main theorem (transitive dependencies, including the main theorem itself)
 * @returns node array with the main theorem's x-coordinate adjusted
 */
export function centerMainTheoremNode(
  nodes: Node<CustomNodeData>[],
  mainTheoremId: string,
  dependencyIds: Set<string>,
): Node<CustomNodeData>[] {
  const mainTheoremNode = nodes.find((n) => n.id === mainTheoremId);
  if (!mainTheoremNode) return nodes;

  // Collect x-coordinates of dependency nodes (excluding the main theorem itself)
  const depNodes = nodes.filter(
    (n) => dependencyIds.has(n.id) && n.id !== mainTheoremId,
  );

  if (depNodes.length === 0) return nodes;

  // Calculate leftmost and rightmost x-coordinates
  const xCoords = depNodes.map((n) => n.position.x);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);

  // Calculate the center x-coordinate
  const centerX = (minX + maxX) / 2;

  // Update the main theorem's x-coordinate
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
 * Scale node coordinates to match the viewport's aspect ratio.
 * Since dagre layout produces a nearly square arrangement,
 * widescreen displays end up with whitespace after fitView.
 * This function stretches the shorter axis to make better use of the viewport.
 *
 * @param nodes - laid-out node array
 * @param viewportWidth - viewport width (px)
 * @param viewportHeight - viewport height (px)
 * @param maxScale - maximum scaling factor (default 3.0)
 * @returns scaled node array
 */
export function scaleToViewportAspectRatio(
  nodes: Node<CustomNodeData>[],
  viewportWidth: number,
  viewportHeight: number,
  maxScale: number = 3.0,
): Node<CustomNodeData>[] {
  if (nodes.length <= 1) return nodes;

  // Calculate bounding box (including node sizes)
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

  // Skip if width or height is less than or equal to the minimum node size
  if (
    graphWidth <= NODE_SIZE_CONFIG.minDiameter ||
    graphHeight <= NODE_SIZE_CONFIG.minDiameter
  )
    return nodes;

  const currentAR = graphWidth / graphHeight;
  const targetAR = viewportWidth / viewportHeight;

  let scaleX = 1.0;
  let scaleY = 1.0;

  if (currentAR < targetAR) {
    // Portrait orientation: stretch in the X direction
    scaleX = Math.min(targetAR / currentAR, maxScale);
  } else if (currentAR > targetAR) {
    // Landscape orientation: stretch in the Y direction
    scaleY = Math.min(currentAR / targetAR, maxScale);
  }

  // No scaling needed if the factor is within 1.0 +/- 0.05
  if (Math.abs(scaleX - 1.0) < 0.05 && Math.abs(scaleY - 1.0) < 0.05) {
    return nodes;
  }

  // Scale relative to the center of the bounding box
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
