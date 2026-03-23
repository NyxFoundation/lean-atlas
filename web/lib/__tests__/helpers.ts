import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "../types";
import {
  calculateNodeDiameter,
  getNodeDegree,
  NODE_SIZE_CONFIG,
} from "../lineSize";
import { expect } from "vitest";

// ---------------------------------------------------------------------------
// Mock data builders
// ---------------------------------------------------------------------------

/** Create a minimal valid CustomNodeData object */
export function makeNodeData(
  id: string,
  overrides?: Partial<CustomNodeData>,
): CustomNodeData {
  return {
    id,
    shortName: id.split(".").pop() ?? id,
    kind: "theorem",
    filePath: "Test/Module.lean",
    hasSorry: false,
    meta: {
      name: null,
      summary: null,
      confidence: null,
      proofProgress: null,
      defProgress: null,
      paperRef: null,
      isMainTheorem: false,
      axioms: null,
      axiomsHidden: null,
    },
    dependencies: [],
    dependents: [],
    lineStart: 1,
    lineEnd: 10,
    nonCommentLines: 8,
    ...overrides,
  };
}

/** Convert CustomNodeData to a React Flow Node */
export function toRfNode(
  data: CustomNodeData,
  position: { x: number; y: number } = { x: 0, y: 0 },
): Node<CustomNodeData> {
  const isSink = data.isSink ?? false;
  const d = isSink
    ? NODE_SIZE_CONFIG.sinkDiameter
    : calculateNodeDiameter(getNodeDegree(data));
  return {
    id: data.id,
    type: "custom",
    data,
    position,
    width: d,
    height: d,
  };
}

/** Create an Edge */
export function makeEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

/**
 * Build a linear chain graph (nodeIds[0] -> nodeIds[1] -> ... -> nodeIds[n-1]).
 * If sinkId is specified, the corresponding node gets isSink=true.
 */
export function buildChainGraph(
  nodeIds: string[],
  sinkId?: string,
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  // Set up dependencies: each node depends on the next one
  const depMap = new Map<string, string[]>();
  const dependentsMap = new Map<string, string[]>();

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const src = nodeIds[i];
    const tgt = nodeIds[i + 1];
    depMap.set(src, [...(depMap.get(src) ?? []), tgt]);
    dependentsMap.set(tgt, [...(dependentsMap.get(tgt) ?? []), src]);
  }

  const nodes = nodeIds.map((id) =>
    toRfNode(
      makeNodeData(id, {
        dependencies: depMap.get(id) ?? [],
        dependents: dependentsMap.get(id) ?? [],
        isSink: id === sinkId,
        meta: {
          name: null,
          summary: null,
          confidence: null,
          proofProgress: null,
          defProgress: null,
          paperRef: null,
          isMainTheorem: id === sinkId,
          axioms: null,
          axiomsHidden: null,
        },
      }),
    ),
  );

  const edges: Edge[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    edges.push(makeEdge(nodeIds[i], nodeIds[i + 1]));
  }

  return { nodes, edges };
}

/**
 * Build a star-shaped graph (each leaf -> center).
 */
export function buildStarGraph(
  centerId: string,
  leafIds: string[],
  sinkId?: string,
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const centerDeps: string[] = [];
  const centerDependents = leafIds.slice();

  const nodes: Node<CustomNodeData>[] = [];

  for (const leafId of leafIds) {
    nodes.push(
      toRfNode(
        makeNodeData(leafId, {
          dependencies: [centerId],
          dependents: [],
          isSink: leafId === sinkId,
          meta: {
            name: null,
            summary: null,
            confidence: null,
            proofProgress: null,
            defProgress: null,
            paperRef: null,
            isMainTheorem: leafId === sinkId,
            axioms: null,
            axiomsHidden: null,
          },
        }),
      ),
    );
  }

  nodes.push(
    toRfNode(
      makeNodeData(centerId, {
        dependencies: centerDeps,
        dependents: centerDependents,
        isSink: centerId === sinkId,
        meta: {
          name: null,
          summary: null,
          confidence: null,
          proofProgress: null,
          defProgress: null,
          paperRef: null,
          isMainTheorem: centerId === sinkId,
          axioms: null,
          axiomsHidden: null,
        },
      }),
    ),
  );

  const edges = leafIds.map((leafId) => makeEdge(leafId, centerId));
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Bounding box & assertions
// ---------------------------------------------------------------------------

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Compute a bounding box that accounts for node diameters */
export function computeBoundingBox(nodes: Node<CustomNodeData>[]): BoundingBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const isSink = node.data.isSink ?? false;
    const d = isSink
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

  return { minX, maxX, minY, maxY };
}

/** Assert that all node positions are finite numbers */
export function assertAllFinitePositions(nodes: Node<CustomNodeData>[]): void {
  for (const node of nodes) {
    expect(
      Number.isFinite(node.position.x),
      `Node ${node.id} has non-finite x: ${node.position.x}`,
    ).toBe(true);
    expect(
      Number.isFinite(node.position.y),
      `Node ${node.id} has non-finite y: ${node.position.y}`,
    ).toBe(true);
  }
}

/** Assert that all nodes are within the bounding box */
export function assertAllNodesWithinBoundingBox(
  nodes: Node<CustomNodeData>[],
): void {
  if (nodes.length === 0) return;

  const bb = computeBoundingBox(nodes);

  // Verify the bounding box itself is finite
  expect(Number.isFinite(bb.minX)).toBe(true);
  expect(Number.isFinite(bb.maxX)).toBe(true);
  expect(Number.isFinite(bb.minY)).toBe(true);
  expect(Number.isFinite(bb.maxY)).toBe(true);

  // Verify each node falls within the bounding box
  for (const node of nodes) {
    const isSink = node.data.isSink ?? false;
    const d = isSink
      ? NODE_SIZE_CONFIG.sinkDiameter
      : calculateNodeDiameter(getNodeDegree(node.data));

    expect(node.position.x).toBeGreaterThanOrEqual(bb.minX - 0.01);
    expect(node.position.x + d).toBeLessThanOrEqual(bb.maxX + 0.01);
    expect(node.position.y).toBeGreaterThanOrEqual(bb.minY - 0.01);
    expect(node.position.y + d).toBeLessThanOrEqual(bb.maxY + 0.01);
  }
}

/**
 * Assert that the bounding box aspect ratio approximately matches the viewport.
 * Due to the maxScale cap in scaleToViewportAspectRatio and non-scaling of node diameters,
 * an exact match is not expected, so the tolerance is set loosely.
 */
export function assertAspectRatioApprox(
  nodes: Node<CustomNodeData>[],
  vpWidth: number,
  vpHeight: number,
  tolerance: number = 0.6,
): void {
  if (nodes.length <= 1) return;

  const bb = computeBoundingBox(nodes);
  const graphWidth = bb.maxX - bb.minX;
  const graphHeight = bb.maxY - bb.minY;

  if (graphWidth <= 0 || graphHeight <= 0) return;

  const graphAR = graphWidth / graphHeight;
  const vpAR = vpWidth / vpHeight;

  // Verify the scaling direction is correct:
  // For a wide viewport the graph should spread horizontally; for a tall viewport it should spread vertically.
  // Confirm the match falls within the tolerance range.
  expect(
    Math.abs(graphAR - vpAR) / vpAR,
    `Graph AR ${graphAR.toFixed(3)} too far from viewport AR ${vpAR.toFixed(3)}`,
  ).toBeLessThan(tolerance);
}
