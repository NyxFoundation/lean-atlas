"use client";

import { useRef, useEffect } from "react";
import type {
  ThemeMode,
  LayoutDirection,
  DefaultMainTheoremMode,
} from "@/lib/settings";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { InfoTooltip } from "@/components/InfoTooltip";

interface MainTheoremInfo {
  id: string;
  shortName: string;
  paperRef: string | null;
  name: string | null;
}

interface SettingsPanelProps {
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  layoutDirection: LayoutDirection;
  onSetLayoutDirection: (direction: LayoutDirection) => void;
  defaultMainTheorem: DefaultMainTheoremMode;
  onSetDefaultMainTheorem: (mode: DefaultMainTheoremMode) => void;
  mainTheorems: MainTheoremInfo[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  workspacePath: string;
  onSetWorkspacePath: (path: string) => void;
  filePathPrefix: string;
  onSetFilePathPrefix: (prefix: string) => void;
  onReload: () => void;
}

export function SettingsPanel({
  theme,
  onSetTheme,
  layoutDirection,
  onSetLayoutDirection,
  defaultMainTheorem,
  onSetDefaultMainTheorem,
  mainTheorems,
  isOpen,
  onToggle,
  onClose,
  workspacePath,
  onSetWorkspacePath,
  filePathPrefix,
  onSetFilePathPrefix,
  onReload,
}: SettingsPanelProps) {
  const { t, language, setLanguage } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-4 z-40 flex items-center gap-2"
    >
      {/* Reload button */}
      <button
        onClick={onReload}
        className="atlas-panel p-2 hover:bg-[var(--hover-bg)] transition-colors"
        aria-label={t.settings.reloadData}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-[var(--panel-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Gear icon button */}
      <button
        onClick={onToggle}
        className="atlas-panel p-2 hover:bg-[var(--hover-bg)] transition-colors"
        aria-label={t.settings.openSettings}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-[var(--panel-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="atlas-panel absolute right-0 top-full mt-2 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto p-4 space-y-4">
          <h4 className="text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider">
            {t.settings.title}
          </h4>

          {/* Language */}
          <div>
            <label className="text-xs text-[var(--panel-text-muted)] block mb-2">
              {t.settings.language}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "ja" | "en")}
              className="atlas-input w-full px-2 py-1 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div className="pt-3 border-t border-[var(--divider)]">
            <label className="text-xs text-[var(--panel-text-muted)] block mb-2">
              {t.settings.theme}
            </label>
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === "light"}
                  onChange={() => onSetTheme("light")}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--accent)] border-[var(--input-border)] focus:ring-[var(--input-focus-ring)]"
                />
                <span className="text-sm text-[var(--panel-text)] break-words min-w-0">
                  {t.settings.themeLight}
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === "dark"}
                  onChange={() => onSetTheme("dark")}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--accent)] border-[var(--input-border)] focus:ring-[var(--input-focus-ring)]"
                />
                <span className="text-sm text-[var(--panel-text)] break-words min-w-0">
                  {t.settings.themeDark}
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === "system"}
                  onChange={() => onSetTheme("system")}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--accent)] border-[var(--input-border)] focus:ring-[var(--input-focus-ring)]"
                />
                <span className="text-sm text-[var(--panel-text)] break-words min-w-0">
                  {t.settings.themeSystem}
                </span>
              </label>
            </div>
          </div>

          {/* Layout direction */}
          <div className="pt-3 border-t border-[var(--divider)]">
            <label className="text-xs text-[var(--panel-text-muted)] flex items-center gap-1 mb-2">
              {t.settings.layoutDirection}
              <InfoTooltip text={t.settings.layoutDirectionTooltip} />
            </label>
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="layoutDirection"
                  checked={layoutDirection === "BT"}
                  onChange={() => onSetLayoutDirection("BT")}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--accent)] border-[var(--input-border)] focus:ring-[var(--input-focus-ring)]"
                />
                <span className="text-sm text-[var(--panel-text)] break-words min-w-0">
                  {t.settings.dependentsOnTop}
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="layoutDirection"
                  checked={layoutDirection === "TB"}
                  onChange={() => onSetLayoutDirection("TB")}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--accent)] border-[var(--input-border)] focus:ring-[var(--input-focus-ring)]"
                />
                <span className="text-sm text-[var(--panel-text)] break-words min-w-0">
                  {t.settings.dependenciesOnTop}
                </span>
              </label>
            </div>
          </div>

          {/* Default main theorem */}
          {mainTheorems.length > 0 && (
            <div className="pt-3 border-t border-[var(--divider)]">
              <label className="text-xs text-[var(--panel-text-muted)] flex items-center gap-1 mb-2">
                {t.settings.defaultMainTheorem}
                <InfoTooltip text={t.settings.defaultMainTheoremTooltip} />
              </label>
              <select
                value={defaultMainTheorem}
                onChange={(e) =>
                  onSetDefaultMainTheorem(
                    e.target.value as DefaultMainTheoremMode,
                  )
                }
                className="atlas-input w-full px-2 py-1 text-sm"
              >
                <option value="random">{t.settings.random}</option>
                {mainTheorems.map((mt) => (
                  <option key={mt.id} value={mt.id}>
                    {mt.paperRef || mt.name || mt.shortName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Workspace path */}
          <div className="pt-3 border-t border-[var(--divider)]">
            <label className="text-xs text-[var(--panel-text-muted)] flex items-center gap-1 mb-2">
              {t.settings.workspacePath}
              <InfoTooltip text={t.settings.workspacePathTooltip} />
            </label>
            <textarea
              value={workspacePath}
              onChange={(e) => onSetWorkspacePath(e.target.value)}
              placeholder={t.settings.workspacePathPlaceholder}
              rows={2}
              className="atlas-input w-full px-2 py-1 text-sm resize-y break-all"
            />
          </div>

          {/* File path prefix */}
          <div className="pt-3 border-t border-[var(--divider)]">
            <label className="text-xs text-[var(--panel-text-muted)] flex items-center gap-1 mb-2">
              {t.settings.filePathPrefix}
              <InfoTooltip text={t.settings.filePathPrefixTooltip} />
            </label>
            <textarea
              value={filePathPrefix}
              onChange={(e) => onSetFilePathPrefix(e.target.value)}
              placeholder={t.settings.filePathPrefixPlaceholder}
              rows={2}
              className="atlas-input w-full px-2 py-1 text-sm resize-y break-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
