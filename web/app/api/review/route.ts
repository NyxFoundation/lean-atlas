import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { isAbsolute, relative, resolve } from "path";

const PROJECT_ROOT = process.env.LEAN_PROJECT_ROOT
  ? resolve(process.env.LEAN_PROJECT_ROOT)
  : resolve(process.cwd(), "..");
const SOURCE_PREFIX = process.env.LEAN_ATLAS_SOURCE_PREFIX || "";
const ALLOWED_PREFIX = SOURCE_PREFIX
  ? resolve(PROJECT_ROOT, SOURCE_PREFIX)
  : PROJECT_ROOT;

function isPathInside(root: string, targetPath: string): boolean {
  const rel = relative(root, targetPath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

type ErrorCode =
  | "VALIDATION_ERROR"
  | "FILE_NOT_FOUND"
  | "PATTERN_NOT_FOUND"
  | "WRITE_ERROR";

function errorResponse(message: string, code: ErrorCode, status: number) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", "VALIDATION_ERROR", 400);
  }

  const { action, nodeId, filePath, lineStart } = body as {
    action?: string;
    nodeId?: string;
    filePath?: string;
    lineStart?: number;
  };

  // Validate action
  if (action !== "approve_confidence") {
    return errorResponse(`Unknown action: ${action}`, "VALIDATION_ERROR", 400);
  }

  // Validate required fields
  if (!nodeId || !filePath || lineStart == null) {
    return errorResponse(
      "Missing required fields: nodeId, filePath, lineStart",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Validate filePath ends with .lean
  if (!filePath.endsWith(".lean")) {
    return errorResponse(
      "Only .lean files are allowed",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Validate lineStart is positive integer
  if (!Number.isInteger(lineStart) || lineStart < 1) {
    return errorResponse(
      "lineStart must be a positive integer",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Path resolution + traversal prevention
  const absolutePath = resolve(PROJECT_ROOT, filePath);
  if (!isPathInside(ALLOWED_PREFIX, absolutePath)) {
    return errorResponse("Path not allowed", "VALIDATION_ERROR", 403);
  }

  // Read Lean source file
  let content: string;
  try {
    content = await readFile(absolutePath, "utf-8");
  } catch {
    return errorResponse(`File not found: ${filePath}`, "FILE_NOT_FOUND", 404);
  }

  // Search for `confidence high` pattern near lineStart
  // lineStart points to the doc comment start; the @[confidence ...] attribute
  // may be below it (between doc comment and declaration), so search both directions.
  const lines = content.split("\n");
  if (lineStart > lines.length) {
    return errorResponse(
      `lineStart is out of range: ${lineStart} > ${lines.length}`,
      "VALIDATION_ERROR",
      400,
    );
  }
  const searchUp = Math.max(0, lineStart - 1 - 15); // 15 lines above (0-indexed)
  const searchDown = Math.min(lines.length - 1, lineStart - 1 + 15); // 15 lines below

  let found = false;
  // Search downward first (attribute is typically between doc comment and def)
  for (let i = lineStart - 1; i <= searchDown; i++) {
    if (/confidence\s+high/.test(lines[i])) {
      lines[i] = lines[i].replace(/confidence\s+high/, "confidence perfect");
      found = true;
      break;
    }
  }
  // Fallback: search upward
  if (!found) {
    for (let i = lineStart - 2; i >= searchUp; i--) {
      if (/confidence\s+high/.test(lines[i])) {
        lines[i] = lines[i].replace(/confidence\s+high/, "confidence perfect");
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return errorResponse(
      `Pattern "confidence high" not found near line ${lineStart}`,
      "PATTERN_NOT_FOUND",
      400,
    );
  }

  // Write back to Lean file
  try {
    await writeFile(absolutePath, lines.join("\n"), "utf-8");
  } catch {
    return errorResponse(
      "Failed to write Lean source file",
      "WRITE_ERROR",
      500,
    );
  }

  // Update graph.json
  try {
    const graphPath = resolve(process.cwd(), "public/data/graph.json");
    const graphContent = await readFile(graphPath, "utf-8");
    const graphData = JSON.parse(graphContent);

    const node = graphData.nodes?.find((n: { id: string }) => n.id === nodeId);
    if (node?.meta) {
      node.meta.confidence = "perfect";
    }

    await writeFile(graphPath, JSON.stringify(graphData, null, 2), "utf-8");
  } catch {
    // graph.json update failure is non-fatal; Lean file is already updated
  }

  return NextResponse.json({
    success: true,
    nodeId,
    updatedConfidence: "perfect",
  });
}
