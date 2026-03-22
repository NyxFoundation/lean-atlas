import type { CustomNodeData } from "./types";
import { calculateLineSizeCounts, type LineBoundaries } from "./lineSize";

export interface NodeStats {
  nodes: number;
  theorems: number;
  definitions: number;
  axioms: number;
  sorries: number;
  confidencePerfect: number;
  confidenceHigh: number;
  confidenceMedium: number;
  confidenceLow: number;
}

export interface FilterCounts {
  kinds: {
    theorem: number;
    definition: number;
    axiom: number;
  };
  subKinds: {
    theorem_manual: number;
    theorem_auto: number;
    definition: number;
    inductive: number;
    structure: number;
    abbrev: number;
  };
  confidence: {
    perfect: number;
    high: number;
    medium: number;
    low: number;
  };
  sorry: {
    hasSorry: number;
    noSorry: number;
  };
  lineSize: {
    small: number;
    medium: number;
    large: number;
  };
}

/**
 * ノード配列から統計情報を計算（シングルパス）
 */
export function calculateNodeStats(nodes: CustomNodeData[]): NodeStats {
  let theorems = 0;
  let definitions = 0;
  let axioms = 0;
  let sorries = 0;
  let confidencePerfect = 0;
  let confidenceHigh = 0;
  let confidenceMedium = 0;
  let confidenceLow = 0;

  for (const n of nodes) {
    if (n.kind === "theorem") theorems++;
    else if (n.kind === "definition") definitions++;
    else if (n.kind === "axiom") axioms++;
    if (n.hasSorry) sorries++;
    switch (n.meta.confidence) {
      case "perfect":
        confidencePerfect++;
        break;
      case "high":
        confidenceHigh++;
        break;
      case "medium":
        confidenceMedium++;
        break;
      case "low":
        confidenceLow++;
        break;
    }
  }

  return {
    nodes: nodes.length,
    theorems,
    definitions,
    axioms,
    sorries,
    confidencePerfect,
    confidenceHigh,
    confidenceMedium,
    confidenceLow,
  };
}

/**
 * フィルターボタン用のカウントを計算（シングルパス + lineSize）
 */
export function calculateFilterCounts(
  nodes: CustomNodeData[],
  boundaries: LineBoundaries,
): FilterCounts {
  const kinds = { theorem: 0, definition: 0, axiom: 0 };
  const subKinds = {
    theorem_manual: 0,
    theorem_auto: 0,
    definition: 0,
    inductive: 0,
    structure: 0,
    abbrev: 0,
  };
  const confidence = { perfect: 0, high: 0, medium: 0, low: 0 };
  const sorry = { hasSorry: 0, noSorry: 0 };

  for (const n of nodes) {
    // kinds
    if (n.kind === "theorem") kinds.theorem++;
    else if (n.kind === "definition") kinds.definition++;
    else if (n.kind === "axiom") kinds.axiom++;

    // subKinds
    switch (n.subKind) {
      case "theorem_manual":
        subKinds.theorem_manual++;
        break;
      case "theorem_auto":
        subKinds.theorem_auto++;
        break;
      case "definition":
        subKinds.definition++;
        break;
      case "inductive":
        subKinds.inductive++;
        break;
      case "structure":
        subKinds.structure++;
        break;
      case "abbrev":
        subKinds.abbrev++;
        break;
    }

    // confidence
    switch (n.meta.confidence) {
      case "perfect":
        confidence.perfect++;
        break;
      case "high":
        confidence.high++;
        break;
      case "medium":
        confidence.medium++;
        break;
      case "low":
        confidence.low++;
        break;
    }

    // sorry
    if (n.hasSorry) sorry.hasSorry++;
    else sorry.noSorry++;
  }

  return {
    kinds,
    subKinds,
    confidence,
    sorry,
    lineSize: calculateLineSizeCounts(nodes, boundaries),
  };
}
