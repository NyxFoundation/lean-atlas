// 設定用の型定義

export type LayoutDirection = "TB" | "BT"; // 依存先が上 / 依存元が上
export type ThemeMode = "light" | "dark" | "system";
// "random": ランダムな主要定理, 文字列: 特定の定理ID
export type DefaultMainTheoremMode = "random" | string;

export interface Settings {
  layoutDirection: LayoutDirection;
  theme: ThemeMode;
  defaultMainTheorem: DefaultMainTheoremMode;
  workspacePath: string;
  filePathPrefix: string;
}

export const defaultSettings: Settings = {
  layoutDirection: "BT",
  theme: "system",
  defaultMainTheorem: "random",
  workspacePath: "",
  filePathPrefix: "",
};
