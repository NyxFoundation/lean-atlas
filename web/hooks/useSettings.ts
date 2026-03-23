"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Settings,
  LayoutDirection,
  ThemeMode,
  DefaultMainTheoremMode,
} from "@/lib/settings";
import { defaultSettings } from "@/lib/settings";
import { loadSettings, saveSettings } from "@/lib/storage";

interface UseSettingsResult {
  settings: Settings;
  setLayoutDirection: (direction: LayoutDirection) => void;
  setTheme: (theme: ThemeMode) => void;
  setDefaultMainTheorem: (mode: DefaultMainTheoremMode) => void;
  setWorkspacePath: (path: string) => void;
  setFilePathPrefix: (prefix: string) => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(() =>
    typeof window === "undefined" ? defaultSettings : loadSettings(),
  );
  const hasMountedRef = useRef(false);

  // Save to localStorage when settings change
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    saveSettings(settings);
  }, [settings]);

  const setLayoutDirection = useCallback((layoutDirection: LayoutDirection) => {
    setSettings((prev) => ({ ...prev, layoutDirection }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setDefaultMainTheorem = useCallback(
    (defaultMainTheorem: DefaultMainTheoremMode) => {
      setSettings((prev) => ({ ...prev, defaultMainTheorem }));
    },
    [],
  );

  const setWorkspacePath = useCallback((workspacePath: string) => {
    setSettings((prev) => ({ ...prev, workspacePath }));
  }, []);

  const setFilePathPrefix = useCallback((filePathPrefix: string) => {
    setSettings((prev) => ({ ...prev, filePathPrefix }));
  }, []);

  return {
    settings,
    setLayoutDirection,
    setTheme,
    setDefaultMainTheorem,
    setWorkspacePath,
    setFilePathPrefix,
  };
}
