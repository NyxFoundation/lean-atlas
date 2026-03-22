import {
  getTransitiveDependencies,
  getTransitiveDependents,
} from "@/lib/dependencies";
import {
  getLineSizeCategory,
  getNodeLineCount,
  type LineBoundaries,
} from "@/lib/lineSize";
import type { CustomNodeData, FilterState, SubKind } from "@/lib/types";

export function buildAllowedBySink(
  mainTheoremSink: FilterState["mainTheoremSink"],
  nodes: Map<string, CustomNodeData>,
): Set<string> | null {
  if (!mainTheoremSink) return null;
  return getTransitiveDependencies(mainTheoremSink, nodes);
}

export function buildAllowedByDependencyFilter(
  dependencyFilter: FilterState["dependencyFilter"],
  nodes: Map<string, CustomNodeData>,
): Set<string> | null {
  if (!dependencyFilter.isActive || dependencyFilter.nodeIds.size === 0) {
    return null;
  }

  const allowedNodes = new Set<string>();
  for (const nodeId of dependencyFilter.nodeIds) {
    if (dependencyFilter.mode === "dependencies") {
      const dependencies = getTransitiveDependencies(nodeId, nodes);
      dependencies.forEach((id) => allowedNodes.add(id));
    } else {
      const dependents = getTransitiveDependents(nodeId, nodes);
      dependents.forEach((id) => allowedNodes.add(id));
    }
    allowedNodes.add(nodeId);
  }

  return allowedNodes;
}

export function shouldBypassRegularFiltersForMainTheorem(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  return filters.alwaysShowMainTheorems && node.meta.isMainTheorem;
}

export function matchesSearchQuery(
  node: CustomNodeData,
  searchQuery: FilterState["searchQuery"],
): boolean {
  if (!searchQuery) return true;

  const query = searchQuery.toLowerCase();
  const matchesName = node.meta.name
    ? node.meta.name.toLowerCase().includes(query)
    : false;
  const matchesSummary = node.meta.summary
    ? node.meta.summary.toLowerCase().includes(query)
    : false;

  return (
    node.id.toLowerCase().includes(query) ||
    node.shortName.toLowerCase().includes(query) ||
    matchesName ||
    matchesSummary
  );
}

export function matchesKindAndSubKind(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  if (!filters.kinds.has(node.kind)) {
    return false;
  }

  if (
    (node.kind === "theorem" || node.kind === "definition") &&
    filters.subKinds.size < 6 &&
    node.subKind
  ) {
    return filters.subKinds.has(node.subKind as SubKind);
  }

  return true;
}

export function matchesConfidence(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  if (!node.meta.confidence) {
    return true;
  }

  return filters.confidence.has(node.meta.confidence);
}

export function matchesProgress(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  if (filters.proofProgress.size < 4) {
    if (
      node.meta.proofProgress &&
      !filters.proofProgress.has(node.meta.proofProgress)
    ) {
      return false;
    }
  }

  if (filters.defProgress.size < 2) {
    if (
      node.meta.defProgress &&
      !filters.defProgress.has(node.meta.defProgress)
    ) {
      return false;
    }
  }

  return true;
}

export function matchesSorry(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  return (
    (node.hasSorry && filters.sorryFilter.has("hasSorry")) ||
    (!node.hasSorry && filters.sorryFilter.has("noSorry"))
  );
}

export function matchesLineSize(
  node: CustomNodeData,
  filters: FilterState,
  lineBoundaries: LineBoundaries,
): boolean {
  if (filters.lineSize.size >= 3) {
    return true;
  }

  const lineCount = getNodeLineCount(node);
  if (lineCount === null) {
    return true;
  }

  const lineSizeCategory = getLineSizeCategory(lineCount, lineBoundaries);
  return filters.lineSize.has(lineSizeCategory);
}

export function matchesDirectory(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  if (filters.directories.size === 0) {
    return true;
  }

  const nodeDirectory = node.filePath.split("/").slice(0, -1).join("/");
  return filters.directories.has(nodeDirectory);
}

export function matchesPaperRef(
  node: CustomNodeData,
  filters: FilterState,
): boolean {
  if (!filters.paperRefFilter) {
    return true;
  }

  return node.meta.paperRef === filters.paperRefFilter;
}
