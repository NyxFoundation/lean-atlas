export type { Language, TranslationDict } from "./types";
export { ja } from "./ja";
export { en } from "./en";

import type { Language, TranslationDict } from "./types";
import { ja } from "./ja";
import { en } from "./en";

export const SUPPORTED_LANGUAGES: { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
];

export const translations: Record<Language, TranslationDict> = { ja, en };

/** Detect the browser's language setting */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}
