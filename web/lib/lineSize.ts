import type { NodeData, CustomNodeData, LineSizeCategory } from "./types";

export const NODE_SIZE_CONFIG = {
  defaultDiameter: 120, // when degree is 0
  minDiameter: 50,
  maxDiameter: 1200,
  maxDegree: 50, // clamped above this value
  sinkDiameter: 1500,
} as const;

/** Get the degree of a node (number of incoming edges + number of outgoing edges) */
export function getNodeDegree(node: CustomNodeData): number {
  return node.dependencies.length + node.dependents.length;
}

/** Calculate circular node diameter (px) from degree (pow(0.3) scaling) */
export function calculateNodeDiameter(degree: number): number {
  if (degree <= 0) return NODE_SIZE_CONFIG.defaultDiameter;
  const { minDiameter, maxDiameter, maxDegree } = NODE_SIZE_CONFIG;
  const clamped = Math.min(degree, maxDegree);
  const t = (Math.pow(clamped, 0.3) - 1) / (Math.pow(maxDegree, 0.3) - 1);
  return Math.round(minDiameter + (maxDiameter - minDiameter) * t);
}

export interface NodeTextSizes {
  nameTextSize: string;
  subTextSize: string;
  badgeTextSize: string;
  badgeGap: string;
}

/** Return text size classes based on diameter */
export function getNodeTextSizes(
  diameter: number,
  isSink: boolean,
): NodeTextSizes {
  if (isSink) {
    return {
      nameTextSize: "text-[128px]",
      subTextSize: "text-7xl",
      badgeTextSize: "text-5xl px-9 py-4",
      badgeGap: "gap-10 mt-10",
    };
  }
  const nameTextSize =
    diameter > 1000
      ? "text-9xl"
      : diameter > 800
        ? "text-8xl"
        : diameter > 600
          ? "text-7xl"
          : diameter > 400
            ? "text-6xl"
            : diameter > 250
              ? "text-5xl"
              : diameter > 150
                ? "text-3xl"
                : diameter > 100
                  ? "text-xl"
                  : "text-lg";
  const subTextSize =
    diameter > 1000
      ? "text-6xl"
      : diameter > 800
        ? "text-5xl"
        : diameter > 600
          ? "text-4xl"
          : diameter > 400
            ? "text-3xl"
            : diameter > 250
              ? "text-xl"
              : diameter > 150
                ? "text-lg"
                : "text-base";
  const badgeTextSize =
    diameter > 1000
      ? "text-4xl px-8 py-3"
      : diameter > 800
        ? "text-3xl px-7 py-2.5"
        : diameter > 600
          ? "text-2xl px-6 py-2"
          : diameter > 400
            ? "text-xl px-5 py-1.5"
            : diameter > 250
              ? "text-lg px-4 py-1"
              : "text-sm px-2 py-0.5";
  const badgeGap =
    diameter > 800
      ? "gap-7 mt-7"
      : diameter > 500
        ? "gap-4 mt-4"
        : diameter > 300
          ? "gap-3 mt-3"
          : "gap-1.5 mt-1.5";
  return { nameTextSize, subTextSize, badgeTextSize, badgeGap };
}

export interface LineBoundaries {
  smallMax: number; // at or below this is "small"
  mediumMax: number; // at or below this is "medium", above is "large"
}

/** Get the line count of a node (prefer non-comment line count, fall back to physical line count) */
export function getNodeLineCount(node: NodeData): number | null {
  // Use non-comment line count if available
  if (node.nonCommentLines !== null && node.nonCommentLines !== undefined) {
    return node.nonCommentLines;
  }
  // Fallback: physical line count
  if (node.lineStart !== null && node.lineEnd !== null) {
    return node.lineEnd - node.lineStart + 1;
  }
  return null;
}

/** Calculate boundaries based on terciles */
export function calculateLineBoundaries(nodes: NodeData[]): LineBoundaries {
  const lineCounts = nodes
    .map((n) => getNodeLineCount(n))
    .filter((count): count is number => count !== null)
    .sort((a, b) => a - b);

  if (lineCounts.length === 0) {
    return { smallMax: 5, mediumMax: 15 }; // fallback
  }

  const tercile1 = Math.floor(lineCounts.length / 3);
  const tercile2 = Math.floor((2 * lineCounts.length) / 3);

  return {
    smallMax: lineCounts[tercile1] || 5,
    mediumMax: lineCounts[tercile2] || 15,
  };
}

export function getLineSizeCategory(
  lineCount: number,
  boundaries: LineBoundaries,
): LineSizeCategory {
  if (lineCount <= boundaries.smallMax) return "small";
  if (lineCount <= boundaries.mediumMax) return "medium";
  return "large";
}

export function getLineSizeLabel(
  category: LineSizeCategory,
  boundaries: LineBoundaries,
  sizeLabel?: string,
): string {
  const label = sizeLabel ?? { small: "S", medium: "M", large: "L" }[category];
  switch (category) {
    case "small":
      return `${label} (1-${boundaries.smallMax})`;
    case "medium":
      return `${label} (${boundaries.smallMax + 1}-${boundaries.mediumMax})`;
    case "large":
      return `${label} (${boundaries.mediumMax + 1}+)`;
  }
}

/** Calculate the count for each category from filtered nodes */
export function calculateLineSizeCounts(
  nodes: NodeData[],
  boundaries: LineBoundaries,
): { small: number; medium: number; large: number } {
  const counts = { small: 0, medium: 0, large: 0 };

  for (const node of nodes) {
    const lineCount = getNodeLineCount(node);
    if (lineCount !== null) {
      const category = getLineSizeCategory(lineCount, boundaries);
      counts[category]++;
    }
  }

  return counts;
}
