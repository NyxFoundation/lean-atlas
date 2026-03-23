// Type definitions for settings

export type LayoutDirection = "TB" | "BT"; // dependencies on top / dependents on top
export type ThemeMode = "light" | "dark" | "system";
// "random": random main theorem, string: specific theorem ID
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
