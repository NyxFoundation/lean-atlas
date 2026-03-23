// Utilities for fetching source code and syntax highlighting

import { createHighlighter, type Highlighter } from "shiki";

// Manage the Shiki highlighter as a singleton
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
 * Strip comments and blank lines from Lean 4 source code
 *
 * Processes character by character using a state machine, accurately removing:
 * - Line comments: from -- to end of line
 * - Block comments: /- ... -/ (supports nesting)
 * - Comment-like tokens inside string literals are preserved
 *
 * Post-processing: removes blank lines and whitespace-only lines
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

  // Post-processing: remove blank lines and whitespace-only lines
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
 * Fetch Lean source code and return HTML with comments stripped and syntax highlighted
 * @param filePath - Lean file path (e.g. "ProjectName/Subdir/File.lean")
 * @param lineStart - start line number (1-indexed)
 * @param lineEnd - end line number (1-indexed)
 * @param isDark - whether dark mode is active
 */
export async function fetchSourceCode(
  filePath: string,
  lineStart: number,
  lineEnd: number,
  isDark: boolean,
): Promise<FetchSourceCodeResult> {
  // Try fetching from the API route
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
    // Fallback: fetch from static file
    const response = await fetch(`/lean-source/${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch source: ${response.status}`);
    }
    const fullCode = await response.text();
    const lines = fullCode.split("\n");
    rawCode = lines.slice(lineStart - 1, lineEnd).join("\n");
  }

  const totalLines = rawCode.split("\n").length;

  // Strip comments
  const strippedCode = stripLeanComments(rawCode);
  const nonCommentLines = strippedCode
    .split("\n")
    .filter((l) => l.trim() !== "").length;

  // Highlight the code after stripping comments
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(strippedCode, {
    lang: "lean4",
    theme: isDark ? "github-dark" : "github-light",
  });

  return { html, rawCode: strippedCode, totalLines, nonCommentLines };
}
