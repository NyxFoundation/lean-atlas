import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { isAbsolute, relative, resolve } from "path";

// Use LEAN_PROJECT_ROOT if set, otherwise fall back to the parent directory
const PROJECT_ROOT = process.env.LEAN_PROJECT_ROOT
  ? resolve(process.env.LEAN_PROJECT_ROOT)
  : resolve(process.cwd(), "..");
// Configurable via LEAN_ATLAS_SOURCE_PREFIX env var (default: first directory in project root containing .lean files)
const SOURCE_PREFIX = process.env.LEAN_ATLAS_SOURCE_PREFIX || "";
const ALLOWED_PREFIX = SOURCE_PREFIX
  ? resolve(PROJECT_ROOT, SOURCE_PREFIX)
  : PROJECT_ROOT;

function isPathInside(root: string, targetPath: string): boolean {
  const rel = relative(root, targetPath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filePath = searchParams.get("path");
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  if (!filePath || !startStr || !endStr) {
    return NextResponse.json(
      { error: "Missing required parameters: path, start, end" },
      { status: 400 },
    );
  }

  // Only allow .lean file extension
  if (!filePath.endsWith(".lean")) {
    return NextResponse.json(
      { error: "Only .lean files are allowed" },
      { status: 400 },
    );
  }

  // Prevent path traversal attacks
  const absolutePath = resolve(PROJECT_ROOT, filePath);
  if (!isPathInside(ALLOWED_PREFIX, absolutePath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
    return NextResponse.json({ error: "Invalid line range" }, { status: 400 });
  }

  try {
    const content = await readFile(absolutePath, "utf-8");
    const lines = content.split("\n");
    const extracted = lines.slice(start - 1, end).join("\n");

    return NextResponse.json({
      code: extracted,
      totalLines: lines.length,
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
