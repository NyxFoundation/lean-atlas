import type {
  Confidence,
  DefProgress,
  EdgeKind,
  EdgeVisualKind,
  LineSizeCategory,
  ProofProgress,
  SubKind,
} from "./types";

// 確信度の設定
const CONFIDENCE_CONFIG = {
  perfect: {
    base: "#2563eb",
    bg: { light: "bg-blue-50", dark: "dark:bg-blue-900" },
    border: { light: "border-blue-500", dark: "dark:border-blue-400" },
    text: { light: "text-blue-900", dark: "dark:text-blue-100" },
    dot: "bg-blue-500",
    label: "完",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
  high: {
    base: "#06b6d4",
    bg: { light: "bg-cyan-50", dark: "dark:bg-cyan-900" },
    border: { light: "border-cyan-400", dark: "dark:border-cyan-500" },
    text: { light: "text-cyan-800", dark: "dark:text-cyan-200" },
    dot: "bg-cyan-500",
    label: "高",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
  medium: {
    base: "#10b981",
    bg: { light: "bg-emerald-50", dark: "dark:bg-emerald-900" },
    border: { light: "border-emerald-400", dark: "dark:border-emerald-600" },
    text: { light: "text-emerald-800", dark: "dark:text-emerald-200" },
    dot: "bg-green-500",
    label: "中",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
  low: {
    base: "#f59e0b",
    bg: { light: "bg-amber-50", dark: "dark:bg-amber-900" },
    border: { light: "border-amber-400", dark: "dark:border-amber-600" },
    text: { light: "text-amber-800", dark: "dark:text-amber-200" },
    dot: "bg-yellow-500",
    label: "低",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark:
      "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
} as const;

// 証明進捗度の設定
const PROOF_PROGRESS_CONFIG = {
  complete: {
    label: "完了",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark:
      "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
    indicator: "border-solid",
  },
  mostly: {
    label: "大部分",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
    indicator: "border-dashed",
  },
  partially: {
    label: "部分",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
    indicator: "border-dotted",
  },
  stub: {
    label: "未着手",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
    indicator: "border-none",
  },
} as const;

// 定義進捗度の設定
const DEF_PROGRESS_CONFIG = {
  complete: {
    label: "完了",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark:
      "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
  partially: {
    label: "部分",
    filterBg: "bg-stone-200",
    filterBorder: "border-stone-400",
    filterText: "text-stone-700",
    filterDark: "dark:bg-[rgba(100,100,180,0.12)] dark:border-[rgba(100,100,180,0.25)] dark:text-[#8888a8]",
    labelColor: "text-[var(--panel-text)]",
  },
} as const;

// none 確信度のインラインスタイル（Tailwind JIT が動的クラスを検出できない場合の対策）
export const NONE_CONFIDENCE_INLINE_STYLES = {
  light: {
    bg: "rgba(45, 140, 135, 0.85)", // vibrant teal
    border: "rgba(30, 110, 108, 0.9)", // rich teal border
    text: "#ffffff",
  },
  dark: {
    bg: "rgba(45, 140, 135, 0.85)", // teal（lightと同じ）
    border: "rgba(30, 110, 108, 0.9)",
    text: "#ffffff",
  },
} as const;


// 確信度に応じたノード背景色（デフォルト = 濃い色、人間検証対象用）
export const CONFIDENCE_NODE_COLORS: Record<
  Confidence | "none",
  { bg: string; border: string; text: string }
> = {
  perfect: {
    bg: "bg-teal-600",
    border: "border-teal-800",
    text: "text-white",
  },
  high: {
    bg: "bg-teal-600",
    border: "border-teal-800",
    text: "text-white",
  },
  medium: {
    bg: "bg-teal-600",
    border: "border-teal-800",
    text: "text-white",
  },
  low: {
    bg: "bg-teal-600",
    border: "border-teal-800",
    text: "text-white",
  },
  none: {
    bg: "bg-teal-600",
    border: "border-teal-800",
    text: "text-white",
  },
};


// 公理ノードの配色（濃い色 = 検証対象）
export const AXIOM_NODE_COLORS = {
  bg: "bg-teal-600 dark:bg-yellow-400",
  border: "border-teal-800 dark:border-yellow-200",
  text: "text-white dark:text-gray-950",
};


// sorry グロー効果
export const SORRY_GLOW =
  "ring-2 ring-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.6)]";

// Kind に応じたフィルターボタン用スタイル
export const KIND_FILTER_STYLES: {
  id: string;
  label: string;
  color: string;
}[] = [
  {
    id: "theorem",
    label: "定理",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  {
    id: "definition",
    label: "定義",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  {
    id: "axiom",
    label: "公理",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
];

// 確信度に応じたドット色
export const CONFIDENCE_DOT_COLORS: Record<Confidence, string> = {
  perfect: CONFIDENCE_CONFIG.perfect.dot,
  high: CONFIDENCE_CONFIG.high.dot,
  medium: CONFIDENCE_CONFIG.medium.dot,
  low: CONFIDENCE_CONFIG.low.dot,
};

// 確信度に応じたフィルターボタン用スタイル
export const CONFIDENCE_FILTER_STYLES: {
  id: Confidence;
  label: string;
  color: string;
}[] = (["perfect", "high", "medium", "low"] as const).map((id) => ({
  id,
  label: CONFIDENCE_CONFIG[id].label,
  color: `${CONFIDENCE_CONFIG[id].filterBg} ${CONFIDENCE_CONFIG[id].filterBorder} ${CONFIDENCE_CONFIG[id].filterText} ${CONFIDENCE_CONFIG[id].filterDark}`,
}));

// 確信度ラベル
export const CONFIDENCE_LABELS: Record<
  Confidence,
  { label: string; color: string }
> = {
  perfect: {
    label: CONFIDENCE_CONFIG.perfect.label,
    color: CONFIDENCE_CONFIG.perfect.labelColor,
  },
  high: {
    label: CONFIDENCE_CONFIG.high.label,
    color: CONFIDENCE_CONFIG.high.labelColor,
  },
  medium: {
    label: CONFIDENCE_CONFIG.medium.label,
    color: CONFIDENCE_CONFIG.medium.labelColor,
  },
  low: {
    label: CONFIDENCE_CONFIG.low.label,
    color: CONFIDENCE_CONFIG.low.labelColor,
  },
};

// 証明進捗度に応じたフィルターボタン用スタイル
export const PROOF_PROGRESS_FILTER_STYLES: {
  id: ProofProgress;
  label: string;
  color: string;
}[] = (["complete", "mostly", "partially", "stub"] as const).map((id) => ({
  id,
  label: PROOF_PROGRESS_CONFIG[id].label,
  color: `${PROOF_PROGRESS_CONFIG[id].filterBg} ${PROOF_PROGRESS_CONFIG[id].filterBorder} ${PROOF_PROGRESS_CONFIG[id].filterText} ${PROOF_PROGRESS_CONFIG[id].filterDark}`,
}));

// 証明進捗度ラベル
export const PROOF_PROGRESS_LABELS: Record<
  ProofProgress,
  { label: string; color: string; indicator: string }
> = {
  complete: {
    label: PROOF_PROGRESS_CONFIG.complete.label,
    color: PROOF_PROGRESS_CONFIG.complete.labelColor,
    indicator: PROOF_PROGRESS_CONFIG.complete.indicator,
  },
  mostly: {
    label: PROOF_PROGRESS_CONFIG.mostly.label,
    color: PROOF_PROGRESS_CONFIG.mostly.labelColor,
    indicator: PROOF_PROGRESS_CONFIG.mostly.indicator,
  },
  partially: {
    label: PROOF_PROGRESS_CONFIG.partially.label,
    color: PROOF_PROGRESS_CONFIG.partially.labelColor,
    indicator: PROOF_PROGRESS_CONFIG.partially.indicator,
  },
  stub: {
    label: PROOF_PROGRESS_CONFIG.stub.label,
    color: PROOF_PROGRESS_CONFIG.stub.labelColor,
    indicator: PROOF_PROGRESS_CONFIG.stub.indicator,
  },
};

// 定義進捗度に応じたフィルターボタン用スタイル
export const DEF_PROGRESS_FILTER_STYLES: {
  id: DefProgress;
  label: string;
  color: string;
}[] = (["complete", "partially"] as const).map((id) => ({
  id,
  label: DEF_PROGRESS_CONFIG[id].label,
  color: `${DEF_PROGRESS_CONFIG[id].filterBg} ${DEF_PROGRESS_CONFIG[id].filterBorder} ${DEF_PROGRESS_CONFIG[id].filterText} ${DEF_PROGRESS_CONFIG[id].filterDark}`,
}));

// 定義進捗度ラベル
export const DEF_PROGRESS_LABELS: Record<
  DefProgress,
  { label: string; color: string }
> = {
  complete: {
    label: DEF_PROGRESS_CONFIG.complete.label,
    color: DEF_PROGRESS_CONFIG.complete.labelColor,
  },
  partially: {
    label: DEF_PROGRESS_CONFIG.partially.label,
    color: DEF_PROGRESS_CONFIG.partially.labelColor,
  },
};

// Kind ラベル
export const KIND_LABELS: Record<string, string> = {
  theorem: "定理",
  definition: "定義",
  axiom: "公理",
};

// 詳細分類（SubKind）のフィルタースタイル
export const SUBKIND_FILTER_STYLES: Record<
  SubKind,
  {
    parentKind: "theorem" | "definition";
    label: string;
    color: string;
  }
> = {
  theorem_manual: {
    parentKind: "theorem",
    label: "手動",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  theorem_auto: {
    parentKind: "theorem",
    label: "自動",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  definition: {
    parentKind: "definition",
    label: "定義",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  inductive: {
    parentKind: "definition",
    label: "帰納型",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  structure: {
    parentKind: "definition",
    label: "構造体",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  abbrev: {
    parentKind: "definition",
    label: "略記",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
};

// SubKind のラベル
export const SUBKIND_LABELS: Record<SubKind, string> = {
  theorem_manual: "手動定義定理",
  theorem_auto: "自動生成定理",
  definition: "定義",
  inductive: "帰納型",
  structure: "構造体",
  abbrev: "略記",
};

// ミニマップ用の色
export const MINIMAP_COLORS: Record<string, string> = {
  sorry: "#3c7876",
  perfect: "#3c7876",
  high: "#3c7876",
  medium: "#3c7876",
  low: "#3c7876",
  none: "#3c7876",
  default: "#3c7876",
};

// 行数フィルターのスタイル
export const LINE_SIZE_FILTER_STYLES: {
  id: LineSizeCategory;
  color: string;
}[] = [
  {
    id: "small",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  {
    id: "medium",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  {
    id: "large",
    color:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
];

// 8種のEdgeKindを2種の視覚カテゴリに変換
export function edgeKindToVisualKind(kind: EdgeKind | string | undefined): EdgeVisualKind {
  if (!kind) return "type";
  return kind.includes("_value_") ? "value" : "type";
}

// エッジ種類のスタイル（視覚カテゴリ: 色はグレーで統一、実線/破線で区別）
export const EDGE_KIND_STYLES: Record<
  EdgeVisualKind,
  {
    label: string;
    color: { light: string; dark: string };
    strokeDasharray?: string;
    strokeWidth: number;
    filterColor: string;
  }
> = {
  type: {
    label: "型依存",
    color: { light: "#9ca3af", dark: "#9ca3af" }, // gray-400
    strokeWidth: 16,
    filterColor:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
  value: {
    label: "値依存",
    color: { light: "#9ca3af", dark: "#9ca3af" }, // gray-400
    strokeDasharray: "14,9",
    strokeWidth: 14,
    filterColor:
      "bg-[var(--filter-active-bg)] border-[var(--filter-active-border)] text-[var(--filter-active-text)]",
  },
};

// エッジ種類のラベル
export const EDGE_KIND_LABELS: Record<EdgeVisualKind, string> = {
  type: "型依存",
  value: "値依存",
};
