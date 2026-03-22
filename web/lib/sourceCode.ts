// ソースコード取得とシンタックスハイライトのユーティリティ

import { createHighlighter, type Highlighter } from "shiki";

// Shiki ハイライターをシングルトンで管理
let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["lean4"],
    });
  }
  return highlighterPromise;
}

/**
 * Lean 4 ソースコードからコメントと空行を除去する
 *
 * ステートマシンで文字単位に処理し、以下を正確に除去:
 * - 単一行コメント: -- から行末まで
 * - ブロックコメント: /- ... -/ （ネスト対応）
 * - 文字列リテラル内のコメント風トークンは保持
 *
 * 後処理: 空行・空白のみの行を除去
 */
export function stripLeanComments(code: string): string {
  const enum State {
    NORMAL,
    STRING,
    LINE_COMMENT,
    BLOCK_COMMENT,
  }

  let state: State = State.NORMAL;
  let blockDepth = 0;
  const out: string[] = [];
  const len = code.length;
  let i = 0;

  while (i < len) {
    const ch = code[i];
    const next = i + 1 < len ? code[i + 1] : "";

    switch (state) {
      case State.NORMAL:
        if (ch === '"') {
          state = State.STRING;
          out.push(ch);
          i++;
        } else if (ch === "-" && next === "-") {
          state = State.LINE_COMMENT;
          i += 2;
        } else if (ch === "/" && next === "-") {
          state = State.BLOCK_COMMENT;
          blockDepth = 1;
          i += 2;
        } else {
          out.push(ch);
          i++;
        }
        break;

      case State.STRING:
        if (ch === "\\") {
          out.push(ch);
          i++;
          if (i < len) {
            out.push(code[i]);
            i++;
          }
        } else if (ch === '"') {
          out.push(ch);
          state = State.NORMAL;
          i++;
        } else {
          out.push(ch);
          i++;
        }
        break;

      case State.LINE_COMMENT:
        if (ch === "\n") {
          out.push("\n");
          state = State.NORMAL;
        }
        i++;
        break;

      case State.BLOCK_COMMENT:
        if (ch === "/" && next === "-") {
          blockDepth++;
          i += 2;
        } else if (ch === "-" && next === "/") {
          blockDepth--;
          i += 2;
          if (blockDepth === 0) {
            state = State.NORMAL;
          }
        } else {
          i++;
        }
        break;
    }
  }

  // 後処理: 空行・空白のみの行を除去
  return out
    .join("")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");
}

interface FetchSourceCodeResult {
  html: string;
  rawCode: string;
  totalLines: number;
  nonCommentLines: number;
}

/**
 * Lean ソースコードを取得し、コメント除去・シンタックスハイライト付きの HTML を返す
 * @param filePath - Lean file path (e.g. "ProjectName/Subdir/File.lean")
 * @param lineStart - 開始行番号（1-indexed）
 * @param lineEnd - 終了行番号（1-indexed）
 * @param isDark - ダークモードかどうか
 */
export async function fetchSourceCode(
  filePath: string,
  lineStart: number,
  lineEnd: number,
  isDark: boolean,
): Promise<FetchSourceCodeResult> {
  // API Route から取得を試みる
  let rawCode: string;
  try {
    const params = new URLSearchParams({
      path: filePath,
      start: String(lineStart),
      end: String(lineEnd),
    });
    const response = await fetch(`/api/source?${params}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    rawCode = data.code;
  } catch {
    // フォールバック: 静的ファイルから取得
    const response = await fetch(`/lean-source/${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch source: ${response.status}`);
    }
    const fullCode = await response.text();
    const lines = fullCode.split("\n");
    rawCode = lines.slice(lineStart - 1, lineEnd).join("\n");
  }

  const totalLines = rawCode.split("\n").length;

  // コメント除去
  const strippedCode = stripLeanComments(rawCode);
  const nonCommentLines = strippedCode
    .split("\n")
    .filter((l) => l.trim() !== "").length;

  // コメント除去後のコードをハイライト
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(strippedCode, {
    lang: "lean4",
    theme: isDark ? "github-dark" : "github-light",
  });

  return { html, rawCode: strippedCode, totalLines, nonCommentLines };
}
