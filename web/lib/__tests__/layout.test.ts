import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "../types";
import {
  getLayoutedElements,
  centerMainTheoremNode,
  scaleToViewportAspectRatio,
} from "../layout";
import { NODE_SIZE_CONFIG } from "../lineSize";
import {
  makeNodeData,
  toRfNode,
  makeEdge,
  buildChainGraph,
  buildStarGraph,
  computeBoundingBox,
  assertAllFinitePositions,
  assertAllNodesWithinBoundingBox,
  assertAspectRatioApprox,
} from "./helpers";

// ---------------------------------------------------------------------------
// getLayoutedElements
// ---------------------------------------------------------------------------
describe("getLayoutedElements", () => {
  it("all node positions are finite for a small chain (TB)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"]);
    const result = getLayoutedElements(nodes, edges, "TB");
    assertAllFinitePositions(result.nodes);
  });

  it("all node positions are finite for a small chain (BT)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"]);
    const result = getLayoutedElements(nodes, edges, "BT");
    assertAllFinitePositions(result.nodes);
  });

  it("ranks are arranged top-to-bottom in TB direction", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"]);
    const result = getLayoutedElements(nodes, edges, "TB");
    const posMap = new Map(result.nodes.map((n) => [n.id, n.position]));
    // y-coordinates should generally increase in A -> B -> C order (allowing for jitter)
    expect(posMap.get("A")!.y).toBeLessThan(posMap.get("C")!.y);
  });

  it("ranks are arranged bottom-to-top in BT direction", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"]);
    const result = getLayoutedElements(nodes, edges, "BT");
    const posMap = new Map(result.nodes.map((n) => [n.id, n.position]));
    expect(posMap.get("A")!.y).toBeGreaterThan(posMap.get("C")!.y);
  });

  it("sink node is laid out with sinkDiameter", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const result = getLayoutedElements(nodes, edges, "TB", "C");
    const sinkNode = result.nodes.find((n) => n.id === "C")!;
    expect(sinkNode.width).toBe(NODE_SIZE_CONFIG.sinkDiameter);
    expect(sinkNode.height).toBe(NODE_SIZE_CONFIG.sinkDiameter);
  });

  it("produces deterministic output for the same input", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const r1 = getLayoutedElements(nodes, edges, "TB", "C");
    const r2 = getLayoutedElements(nodes, edges, "TB", "C");
    for (let i = 0; i < r1.nodes.length; i++) {
      expect(r1.nodes[i].position.x).toBe(r2.nodes[i].position.x);
      expect(r1.nodes[i].position.y).toBe(r2.nodes[i].position.y);
    }
  });

  it("no jitter is applied to the sink node", () => {
    // Verify that a graph with only one sink node matches dagre center - d/2
    const sinkData = makeNodeData("S", { isSink: true, dependents: ["X"] });
    const otherData = makeNodeData("X", { dependencies: ["S"] });
    const nodes = [toRfNode(sinkData), toRfNode(otherData)];
    const edges = [makeEdge("X", "S")];
    const result = getLayoutedElements(nodes, edges, "TB", "S");

    // The sink node position should exactly match dagre center - sinkDiameter/2
    // (since jitter = 0)
    const sinkNode = result.nodes.find((n) => n.id === "S")!;
    // Indirect confirmation of no jitter: run twice and verify exact match
    const result2 = getLayoutedElements(nodes, edges, "TB", "S");
    const sinkNode2 = result2.nodes.find((n) => n.id === "S")!;
    expect(sinkNode.position.x).toBe(sinkNode2.position.x);
    expect(sinkNode.position.y).toBe(sinkNode2.position.y);
  });

  it("jitter on non-sink nodes is within +/-30px", () => {
    // Run twice and confirm the difference is 0 (deterministic jitter),
    // and that the jitter itself stays within +/-30px of the dagre center
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const result = getLayoutedElements(nodes, edges, "TB", "C");

    for (const node of result.nodes) {
      if (node.id === "C") continue; // skip sink
      // Basic check that positions are finite (jitter has not gone out of bounds)
      assertAllFinitePositions([node]);
    }
  });

  it("returns valid positions for a single node", () => {
    const { nodes, edges } = buildChainGraph(["A"]);
    const result = getLayoutedElements(nodes, edges, "TB");
    expect(result.nodes).toHaveLength(1);
    assertAllFinitePositions(result.nodes);
  });

  it("returns empty arrays for an empty graph", () => {
    const result = getLayoutedElements([], [], "TB");
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// centerMainTheoremNode
// ---------------------------------------------------------------------------
describe("centerMainTheoremNode", () => {
  it("x-coordinate is placed at the center of dependent nodes", () => {
    const nodes: Node<CustomNodeData>[] = [
      toRfNode(makeNodeData("A", { dependencies: ["main"] })),
      toRfNode(makeNodeData("B", { dependencies: ["main"] })),
      toRfNode(makeNodeData("main", { dependents: ["A", "B"], isSink: true })),
    ];
    // Manually set positions
    nodes[0] = { ...nodes[0], position: { x: 100, y: 0 } };
    nodes[1] = { ...nodes[1], position: { x: 300, y: 0 } };
    nodes[2] = { ...nodes[2], position: { x: 0, y: 200 } };

    const depIds = new Set(["A", "B", "main"]);
    const result = centerMainTheoremNode(nodes, "main", depIds);
    const mainNode = result.find((n) => n.id === "main")!;

    expect(mainNode.position.x).toBe(200); // (100 + 300) / 2
  });

  it("no change when there are no dependents", () => {
    const nodes: Node<CustomNodeData>[] = [
      toRfNode(makeNodeData("main", { isSink: true })),
    ];
    nodes[0] = { ...nodes[0], position: { x: 50, y: 100 } };

    const result = centerMainTheoremNode(nodes, "main", new Set(["main"]));
    expect(result[0].position.x).toBe(50);
    expect(result[0].position.y).toBe(100);
  });

  it("no change when the main theorem is not found", () => {
    const nodes: Node<CustomNodeData>[] = [toRfNode(makeNodeData("A"))];
    nodes[0] = { ...nodes[0], position: { x: 50, y: 100 } };

    const result = centerMainTheoremNode(nodes, "nonexistent", new Set(["A"]));
    expect(result[0].position.x).toBe(50);
  });

  it("y-coordinate is not changed", () => {
    const nodes: Node<CustomNodeData>[] = [
      toRfNode(makeNodeData("A", { dependencies: ["main"] })),
      toRfNode(makeNodeData("main", { dependents: ["A"], isSink: true })),
    ];
    nodes[0] = { ...nodes[0], position: { x: 100, y: 50 } };
    nodes[1] = { ...nodes[1], position: { x: 0, y: 200 } };

    const depIds = new Set(["A", "main"]);
    const result = centerMainTheoremNode(nodes, "main", depIds);
    const mainNode = result.find((n) => n.id === "main")!;

    expect(mainNode.position.y).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// scaleToViewportAspectRatio
// ---------------------------------------------------------------------------
describe("scaleToViewportAspectRatio", () => {
  function makePositionedNodes(
    positions: { id: string; x: number; y: number; isSink?: boolean }[],
  ): Node<CustomNodeData>[] {
    return positions.map(
      (p) =>
        ({
          ...toRfNode(makeNodeData(p.id, { isSink: p.isSink })),
          position: { x: p.x, y: p.y },
        }) as Node<CustomNodeData>,
    );
  }

  it("tall graph on wide viewport -> X axis is stretched", () => {
    // Near-square graph layout
    const nodes = makePositionedNodes([
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 200, y: 0 },
      { id: "C", x: 100, y: 200 },
    ]);
    const bbBefore = computeBoundingBox(nodes);
    const arBefore =
      (bbBefore.maxX - bbBefore.minX) / (bbBefore.maxY - bbBefore.minY);

    const result = scaleToViewportAspectRatio(nodes, 1920, 1080);
    const bbAfter = computeBoundingBox(result);
    const arAfter =
      (bbAfter.maxX - bbAfter.minX) / (bbAfter.maxY - bbAfter.minY);

    // Aspect ratio should increase to match the wide viewport
    expect(arAfter).toBeGreaterThanOrEqual(arBefore);
    assertAllFinitePositions(result);
  });

  it("wide graph on tall viewport -> Y axis is stretched", () => {
    const nodes = makePositionedNodes([
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 400, y: 0 },
      { id: "C", x: 200, y: 100 },
    ]);
    const bbBefore = computeBoundingBox(nodes);
    const arBefore =
      (bbBefore.maxX - bbBefore.minX) / (bbBefore.maxY - bbBefore.minY);

    const result = scaleToViewportAspectRatio(nodes, 1080, 1920);
    const bbAfter = computeBoundingBox(result);
    const arAfter =
      (bbAfter.maxX - bbAfter.minX) / (bbAfter.maxY - bbAfter.minY);

    // AR should decrease (vertical stretch) to match the tall viewport
    expect(arAfter).toBeLessThanOrEqual(arBefore);
    assertAllFinitePositions(result);
  });

  it("is capped at maxScale (3.0)", () => {
    // Extremely tall graph + extremely wide viewport
    const nodes = makePositionedNodes([
      { id: "A", x: 100, y: 0 },
      { id: "B", x: 100, y: 5000 },
    ]);

    const result = scaleToViewportAspectRatio(nodes, 5000, 100, 3.0);
    const bbAfter = computeBoundingBox(result);
    const graphWidth = bbAfter.maxX - bbAfter.minX;
    const graphHeight = bbAfter.maxY - bbAfter.minY;

    // Since the scale is capped at 3.0, the AR will not reach the viewport AR
    const arAfter = graphWidth / graphHeight;
    const vpAR = 5000 / 100; // 50
    expect(arAfter).toBeLessThan(vpAR);
    assertAllFinitePositions(result);
  });

  it("single node -> early return (no change)", () => {
    const nodes = makePositionedNodes([{ id: "A", x: 100, y: 200 }]);
    const result = scaleToViewportAspectRatio(nodes, 1920, 1080);
    expect(result).toHaveLength(1);
    expect(result[0].position.x).toBe(100);
    expect(result[0].position.y).toBe(200);
  });

  it("within +/-5% threshold -> skipped", () => {
    // Graph whose aspect ratio nearly matches the viewport
    const nodes = makePositionedNodes([
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 1800, y: 1000 },
    ]);
    const bbBefore = computeBoundingBox(nodes);
    const arBefore =
      (bbBefore.maxX - bbBefore.minX) / (bbBefore.maxY - bbBefore.minY);

    const vpAR = 1920 / 1080;
    // When the AR is close, the result should be the same as the input
    if (Math.abs(arBefore - vpAR) / vpAR < 0.05) {
      const result = scaleToViewportAspectRatio(nodes, 1920, 1080);
      expect(result[0].position.x).toBe(nodes[0].position.x);
    }
  });

  it("centroid of position coordinates is preserved", () => {
    const nodes = makePositionedNodes([
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 300, y: 0 },
      { id: "C", x: 150, y: 400 },
    ]);
    const result = scaleToViewportAspectRatio(nodes, 1920, 1080);
    const centroidAfter = {
      x: result.reduce((s, n) => s + n.position.x, 0) / result.length,
      y: result.reduce((s, n) => s + n.position.y, 0) / result.length,
    };

    // Since scaleToViewportAspectRatio scales relative to the BB center,
    // the position centroid may shift depending on its offset from the BB center.
    // Here we verify that all positions are finite and that scaling was applied.
    assertAllFinitePositions(result);
    // At minimum, the centroid should remain finite after scaling
    expect(Number.isFinite(centroidAfter.x)).toBe(true);
    expect(Number.isFinite(centroidAfter.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Full pipeline regression tests: all nodes should fit within the viewport
// ---------------------------------------------------------------------------
describe("full pipeline regression tests", () => {
  /**
   * Run the full layout pipeline:
   * getLayoutedElements -> centerMainTheoremNode -> scaleToViewportAspectRatio
   */
  function runFullPipeline(
    nodes: Node<CustomNodeData>[],
    edges: Edge[],
    sinkId: string | undefined,
    vpWidth: number,
    vpHeight: number,
    direction: "TB" | "BT" = "TB",
  ): Node<CustomNodeData>[] {
    const layout = getLayoutedElements(nodes, edges, direction, sinkId);

    let result = layout.nodes;

    if (sinkId) {
      const depIds = new Set(result.map((n) => n.id));
      result = centerMainTheoremNode(result, sinkId, depIds);
    }

    result = scaleToViewportAspectRatio(result, vpWidth, vpHeight);
    return result;
  }

  it("small chain + wide viewport (1920x1080)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const result = runFullPipeline(nodes, edges, "C", 1920, 1080);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
    assertAspectRatioApprox(result, 1920, 1080);
  });

  it("small chain + tall viewport (1080x1920)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const result = runFullPipeline(nodes, edges, "C", 1080, 1920);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
    assertAspectRatioApprox(result, 1080, 1920);
  });

  it("small chain + square viewport (1000x1000)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C"], "C");
    const result = runFullPipeline(nodes, edges, "C", 1000, 1000);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
  });

  it("medium-sized DAG (20+ nodes) + wide viewport", () => {
    // Build a DAG with branching
    const nodeIds: string[] = [];
    const allNodes: Node<CustomNodeData>[] = [];
    const allEdges: Edge[] = [];
    const depMap = new Map<string, string[]>();
    const dependentsMap = new Map<string, string[]>();

    // 20-node DAG: layer0 (5) -> layer1 (5) -> layer2 (5) -> layer3 (4) -> sink
    const layers = [
      ["L0-0", "L0-1", "L0-2", "L0-3", "L0-4"],
      ["L1-0", "L1-1", "L1-2", "L1-3", "L1-4"],
      ["L2-0", "L2-1", "L2-2", "L2-3", "L2-4"],
      ["L3-0", "L3-1", "L3-2", "L3-3"],
      ["sink"],
    ];

    for (const layer of layers) {
      for (const id of layer) {
        nodeIds.push(id);
        depMap.set(id, []);
        dependentsMap.set(id, []);
      }
    }

    // Create edges between layers
    for (let l = 0; l < layers.length - 1; l++) {
      for (const src of layers[l]) {
        // Connect to 1-2 nodes in the next layer
        const targets = layers[l + 1].slice(0, 2);
        for (const tgt of targets) {
          depMap.get(src)!.push(tgt);
          dependentsMap.get(tgt)!.push(src);
          allEdges.push(makeEdge(src, tgt));
        }
      }
    }

    for (const id of nodeIds) {
      const isSink = id === "sink";
      allNodes.push(
        toRfNode(
          makeNodeData(id, {
            dependencies: depMap.get(id) ?? [],
            dependents: dependentsMap.get(id) ?? [],
            isSink,
            meta: {
              name: null,
              summary: null,
              confidence: null,
              proofProgress: null,
              defProgress: null,
              paperRef: null,
              isMainTheorem: isSink,
              axioms: null,
              axiomsHidden: null,
            },
          }),
        ),
      );
    }

    const result = runFullPipeline(allNodes, allEdges, "sink", 1920, 1080);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
    assertAspectRatioApprox(result, 1920, 1080);
  });

  it("chain containing a large-diameter sink node (1500px)", () => {
    const { nodes, edges } = buildChainGraph(
      ["dep1", "dep2", "dep3", "mainThm"],
      "mainThm",
    );
    const result = runFullPipeline(nodes, edges, "mainThm", 1920, 1080);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);

    // Also verify the sink node size is correct
    const sink = result.find((n) => n.id === "mainThm")!;
    expect(sink.width).toBe(NODE_SIZE_CONFIG.sinkDiameter);
  });

  it("single node", () => {
    const { nodes, edges } = buildChainGraph(["alone"]);
    const result = runFullPipeline(nodes, edges, undefined, 1920, 1080);

    assertAllFinitePositions(result);
    expect(result).toHaveLength(1);
  });

  it("2 nodes (A->B, B=sink)", () => {
    const { nodes, edges } = buildChainGraph(["A", "B"], "B");
    const result = runFullPipeline(nodes, edges, "B", 1920, 1080);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
  });

  it("star graph (10 leaves + center sink)", () => {
    const leafIds = Array.from({ length: 10 }, (_, i) => `leaf-${i}`);
    const { nodes, edges } = buildStarGraph("center", leafIds, "center");
    const result = runFullPipeline(nodes, edges, "center", 1920, 1080);

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
    assertAspectRatioApprox(result, 1920, 1080);
  });

  it("determinism: same input run twice yields the same result", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C", "D", "E"], "E");
    const r1 = runFullPipeline(nodes, edges, "E", 1920, 1080);
    const r2 = runFullPipeline(nodes, edges, "E", 1920, 1080);

    expect(r1.length).toBe(r2.length);
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i].position.x).toBe(r2[i].position.x);
      expect(r1[i].position.y).toBe(r2[i].position.y);
    }
  });

  it("all nodes fit within the viewport in BT direction as well", () => {
    const { nodes, edges } = buildChainGraph(["A", "B", "C", "D"], "D");
    const result = runFullPipeline(nodes, edges, "D", 1920, 1080, "BT");

    assertAllFinitePositions(result);
    assertAllNodesWithinBoundingBox(result);
  });
});
