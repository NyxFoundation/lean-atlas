/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.CLI.Serve - Web viewer launcher
-/

import LeanAtlas.Config.Types
import LeanAtlas.Config.Load

open LeanAtlas.Config

namespace LeanAtlas.CLI.Serve

/-- Parsed serve arguments -/
structure ServeArgs where
  port : Nat := 5326
  noGenerate : Bool := false
  atlasRoot : Option String := none
  /-- Extra arguments to pass to graph-data generation -/
  graphDataArgs : List String := []
  deriving Repr

/-- Parse serve subcommand arguments (--config already extracted) -/
def parseServeArgs (args : List String) : ServeArgs := Id.run do
  let mut result : ServeArgs := {}
  let mut i := 0
  while h : i < args.length do
    let arg := args[i]
    match arg with
    | "--port" =>
      if i + 1 < args.length then
        match args[i + 1]!.toNat? with
        | some n => result := { result with port := n }
        | none => pure ()
        i := i + 1
    | "--no-generate" =>
      result := { result with noGenerate := true }
    | "--atlas-root" =>
      if i + 1 < args.length then
        result := { result with atlasRoot := some args[i + 1]! }
        i := i + 1
    | _ =>
      result := { result with graphDataArgs := result.graphDataArgs ++ [arg] }
    i := i + 1
  return result

/-- Check if a path exists -/
def pathExists (path : String) : IO Bool :=
  (System.FilePath.mk path).pathExists

/-- Resolve lean-atlas root directory.
    Priority: 1) --atlas-root flag, 2) config atlasRoot,
              3) .lake/packages/lean-atlas (lake require dependency),
              4) ../lean-atlas (local sibling directory).
    Throws an actionable error if none of the paths contain a `web/` directory. -/
def resolveAtlasRoot (serveArgs : ServeArgs) (config : ProjectConfig) : IO String := do
  -- 1. Explicit --atlas-root flag
  if let some root := serveArgs.atlasRoot then
    return root
  -- 2. Config file setting
  if let some root := config.atlasRoot then
    return root
  -- 3. Auto-discover from Lake packages (git dependency)
  let lakePackagePath := ".lake/packages/lean-atlas"
  if ← pathExists s!"{lakePackagePath}/web" then
    return lakePackagePath
  -- 4. Local sibling directory (development)
  let siblingPath := "../lean-atlas"
  if ← pathExists s!"{siblingPath}/web" then
    return siblingPath
  -- 5. Not found — actionable error
  throw <| IO.userError <|
    "Could not find lean-atlas web viewer.\n" ++
    "Searched:\n" ++
    "  - .lake/packages/lean-atlas/web  (lake require dependency)\n" ++
    "  - ../lean-atlas/web              (local sibling directory)\n\n" ++
    "If lean-atlas is a Lake dependency, try:\n" ++
    "  lake update lean-atlas\n\n" ++
    "Or specify the path manually:\n" ++
    "  lake exe atlas serve --atlas-root /path/to/lean-atlas"

/-- Main serve entry point -/
unsafe def serveMain (args : List String) (configPath : String) (config : ProjectConfig) : IO UInt32 := do
  let serveArgs := parseServeArgs args
  let atlasRoot ← resolveAtlasRoot serveArgs config
  let webDir := s!"{atlasRoot}/web"

  -- Validate atlas root
  if !(← pathExists webDir) then
    IO.eprintln s!"Error: Web viewer directory not found: {webDir}"
    IO.eprintln "Searched locations:"
    IO.eprintln "  - .lake/packages/lean-atlas/web  (git dependency)"
    IO.eprintln "  - ../lean-atlas/web              (local sibling)"
    IO.eprintln ""
    IO.eprintln "Use --atlas-root <path> to specify the lean-atlas root directory,"
    IO.eprintln "or set [atlas] root = \"...\" in lean-atlas.toml."
    return 1

  -- Step 1: Generate graph.json (unless --no-generate)
  if !serveArgs.noGenerate then
    IO.println "Generating graph data..."
    let outputPath := s!"{webDir}/public/data/graph.json"

    -- Ensure output directory exists
    let outputDir := s!"{webDir}/public/data"
    if !(← pathExists outputDir) then
      IO.FS.createDirAll outputDir

    -- Call graph-data main with --output and --pretty
    let graphArgs := ["--output", outputPath, "--pretty"] ++ serveArgs.graphDataArgs
    let graphBaseArgs := if configPath != Load.defaultConfigPath then
      #["exe", "atlas", "--quiet", "graph-data", "--config", configPath]
    else
      #["exe", "atlas", "--quiet", "graph-data"]
    -- We need to import and call the graph-data main directly,
    -- but since both mains load the environment, we use IO.Process.spawn instead
    -- to avoid double-loading. This also lets us pass --config properly.
    let cwd ← IO.currentDir
    let proc ← IO.Process.spawn {
      cmd := "lake"
      args := graphBaseArgs ++ graphArgs.toArray
      cwd := cwd
      stdin := .piped
      stdout := .inherit
      stderr := .inherit
    }
    let exitCode ← proc.wait
    if exitCode != 0 then
      IO.eprintln "Error: Failed to generate graph data."
      return 1
    IO.println "Graph data generated successfully."

  -- Step 2: Check for node_modules, install if needed
  let nodeModulesDir := s!"{webDir}/node_modules"
  if !(← pathExists nodeModulesDir) then
    IO.println "Installing web dependencies (pnpm install)..."
    let proc ← IO.Process.spawn {
      cmd := "pnpm"
      args := #["install"]
      cwd := webDir
      stdin := .piped
      stdout := .inherit
      stderr := .inherit
    }
    let exitCode ← proc.wait
    if exitCode != 0 then
      IO.eprintln "Error: pnpm install failed."
      return 1

  -- Step 3: Start dev server
  let cwd ← IO.currentDir
  IO.println s!"Starting web viewer on http://localhost:{serveArgs.port} ..."
  let proc ← IO.Process.spawn {
    cmd := "env"
    args := #[s!"LEAN_PROJECT_ROOT={cwd}", "pnpm", "dev", "--port", s!"{serveArgs.port}"]
    cwd := webDir
    stdin := .piped
    stdout := .inherit
    stderr := .inherit
  }
  let exitCode ← proc.wait
  return exitCode

end LeanAtlas.CLI.Serve
