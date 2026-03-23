import type { CustomNodeData, EdgeData } from "./types";

/**
 * Perform DFS traversal on a node map and return reachable node IDs
 */
function traverseGraph(
  nodeId: string,
  nodesMap: Map<string, CustomNodeData>,
  getNeighbors: (node: CustomNodeData) => string[],
  scope?: Set<string>,
): Set<string> {
  const visited = new Set<string>();
  const stack = [nodeId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    // If a scope is specified, skip nodes outside the scope
    if (scope && !scope.has(current)) continue;
    visited.add(current);

    const node = nodesMap.get(current);
    if (node) {
      for (const dep of getNeighbors(node)) {
        if (!visited.has(dep)) {
          stack.push(dep);
        }
      }
    }
  }

  return visited;
}

/**
 * Get all transitive dependencies (upstream) of the specified node via DFS
 * @returns Set containing the sink and all its dependencies
 */
export function getTransitiveDependencies(
  nodeId: string,
  nodesMap: Map<string, CustomNodeData>,
  scope?: Set<string>,
): Set<string> {
  return traverseGraph(nodeId, nodesMap, (n) => n.dependencies, scope);
}

/**
 * Get all transitive dependents (downstream) of the specified node via DFS
 * @returns Set of all dependent nodes, excluding the node itself
 */
export function getTransitiveDependents(
  nodeId: string,
  nodesMap: Map<string, CustomNodeData>,
  scope?: Set<string>,
): Set<string> {
  const visited = traverseGraph(nodeId, nodesMap, (n) => n.dependents, scope);
  visited.delete(nodeId); // exclude self
  return visited;
}

/**
 * Get reachable nodes with edge filtering via DFS
 * @param startNodeIds - starting node IDs for traversal
 * @param edges - all edge data
 * @param shouldTraverse - predicate function for whether to follow an edge
 * @returns Set of all reachable node IDs (including starting nodes themselves)
 */
export function getReachableByEdgeFilter(
  startNodeIds: string[],
  edges: EdgeData[],
  shouldTraverse: (edge: EdgeData) => boolean,
): Set<string> {
  // Build adjacency list using only edges that satisfy shouldTraverse
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!shouldTraverse(edge)) continue;
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // DFS
  const visited = new Set<string>();
  const stack = [...startNodeIds];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }
  return visited;
}
