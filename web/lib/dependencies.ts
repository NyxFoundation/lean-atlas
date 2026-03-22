import type { CustomNodeData, EdgeData } from "./types";

/**
 * ノードマップ上でDFS走査を行い、到達可能なノードIDを返す
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
    // スコープが指定されている場合、スコープ外のノードはスキップ
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
 * 指定ノードの推移的依存関係（上流）を全て取得（DFS）
 * @returns sink とその全依存を含む Set
 */
export function getTransitiveDependencies(
  nodeId: string,
  nodesMap: Map<string, CustomNodeData>,
  scope?: Set<string>,
): Set<string> {
  return traverseGraph(nodeId, nodesMap, (n) => n.dependencies, scope);
}

/**
 * 指定ノードの推移的被依存関係（下流）を全て取得（DFS）
 * @returns 自身を除く全被依存ノードの Set
 */
export function getTransitiveDependents(
  nodeId: string,
  nodesMap: Map<string, CustomNodeData>,
  scope?: Set<string>,
): Set<string> {
  const visited = traverseGraph(nodeId, nodesMap, (n) => n.dependents, scope);
  visited.delete(nodeId); // 自身を除外
  return visited;
}

/**
 * エッジフィルター付き到達可能ノード取得（DFS）
 * @param startNodeIds - 探索開始ノードID群
 * @param edges - 全エッジデータ
 * @param shouldTraverse - エッジを辿るかどうかの述語関数
 * @returns 到達可能な全ノードIDの Set（開始ノード自身も含む）
 */
export function getReachableByEdgeFilter(
  startNodeIds: string[],
  edges: EdgeData[],
  shouldTraverse: (edge: EdgeData) => boolean,
): Set<string> {
  // shouldTraverse を満たすエッジのみで隣接リストを構築
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
