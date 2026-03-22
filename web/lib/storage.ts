import type { Settings, ThemeMode } from "./settings";
import { defaultSettings } from "./settings";

const STORAGE_KEY = "graph-viewer-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        layoutDirection:
          parsed.layoutDirection || defaultSettings.layoutDirection,
        theme: parsed.theme || defaultSettings.theme,
        defaultMainTheorem:
          parsed.defaultMainTheorem ?? defaultSettings.defaultMainTheorem,
        workspacePath: parsed.workspacePath ?? defaultSettings.workspacePath,
        filePathPrefix: parsed.filePathPrefix ?? defaultSettings.filePathPrefix,
      };
    }
  } catch {
    // ignore parse errors
  }
  return defaultSettings;
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.theme || "system";
    }
  } catch {
    // ignore
  }
  return "system";
}

export function saveTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    current.theme = theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}
