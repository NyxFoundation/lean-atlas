/**
 * Extract a list of directories from file paths
 */
export function extractDirectories(filePaths: string[]): string[] {
  const dirs = new Set<string>();
  filePaths.forEach((path) => {
    const parts = path.split("/");
    if (parts.length > 1) {
      // e.g. ProjectName/Subdir/File.lean -> ProjectName/Subdir
      dirs.add(parts.slice(0, -1).join("/"));
    }
  });
  return Array.from(dirs).sort();
}
