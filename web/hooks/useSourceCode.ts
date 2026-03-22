"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchSourceCode } from "@/lib/sourceCode";
import { useDarkMode } from "@/hooks/useDarkMode";

interface UseSourceCodeOptions {
  filePath: string;
  lineStart: number | null;
  lineEnd: number | null;
  initialNonCommentLines: number | null;
}

interface UseSourceCodeResult {
  isCodeExpanded: boolean;
  sourceCode: string | null;
  isLoading: boolean;
  error: string | null;
  nonCommentLines: number | null;
  toggleCode: () => void;
  reset: () => void;
}

/**
 * ソースコード表示状態を管理するフック
 */
export function useSourceCode(
  options: UseSourceCodeOptions,
): UseSourceCodeResult {
  const { filePath, lineStart, lineEnd, initialNonCommentLines } = options;
  const isDark = useDarkMode();

  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonCommentLines, setNonCommentLines] = useState<number | null>(
    initialNonCommentLines,
  );

  // ソースコード読み込み
  const loadSourceCode = useCallback(async () => {
    if (lineStart === null || lineEnd === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSourceCode(
        filePath,
        lineStart,
        lineEnd,
        isDark,
      );
      setSourceCode(result.html);
      setNonCommentLines(result.nonCommentLines);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ソースコードの読み込みに失敗",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filePath, lineStart, lineEnd, isDark]);

  // 実装を見る/閉じるのトグル
  const toggleCode = useCallback(() => {
    if (!isCodeExpanded) {
      setIsCodeExpanded(true);
      loadSourceCode();
    } else {
      setIsCodeExpanded(false);
    }
  }, [isCodeExpanded, loadSourceCode]);

  // ダークモード切替時にソースコードを再読み込み
  useEffect(() => {
    if (isCodeExpanded && sourceCode) {
      loadSourceCode();
    }
  }, [isDark, isCodeExpanded, loadSourceCode, sourceCode]);

  // リセット関数（ノード変更時に呼び出し）
  const reset = useCallback(() => {
    setIsCodeExpanded(false);
    setSourceCode(null);
    setError(null);
    setNonCommentLines(initialNonCommentLines);
  }, [initialNonCommentLines]);

  return {
    isCodeExpanded,
    sourceCode,
    isLoading,
    error,
    nonCommentLines,
    toggleCode,
    reset,
  };
}
