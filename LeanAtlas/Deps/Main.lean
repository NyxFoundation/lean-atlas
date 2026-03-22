/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Deps - CLI entry point for dependency graph tool
-/

import Lean
import LeanAtlas.Deps.Core
import LeanAtlas.Deps.Dot
import LeanAtlas.Config.Load
import LeanAtlas.Config.Discovery

open Lean
open LeanAtlas.Deps.Core
open LeanAtlas.Deps.Dot
open LeanAtlas.Config

namespace LeanAtlas.Deps

/-- Print usage information -/
def printUsage : IO Unit := do
  IO.println "Usage: lake exe atlas deps [constant_name] [output_file.dot] [options]"
  IO.println ""
  IO.println "Analyzes dependency graph for definitions and theorems."
  IO.println ""
  IO.println "Arguments:"
  IO.println "  (none)            Generate full dependency graph of the project"
  IO.println "  constant_name     Analyze dependencies for a specific constant"
  IO.println "  output_file       Optional: Output file path (default: deps_graph.dot)"
  IO.println ""
  IO.println "Options:"
  IO.println "  --config <path>   Path to lean-atlas.toml (optional; auto-detected from lakefile)"
  IO.println "  --module <name>   Module to load (overrides auto-discovery)"
  IO.println "  --sources         List source vertices (out-degree 0, basic definitions)"
  IO.println "  --sinks           List sink vertices (in-degree 0, top-level theorems)"
  IO.println "  --endpoints       List both source and sink vertices"
  IO.println ""
  IO.println "Examples:"
  IO.println "  lake exe atlas deps                                # Full project graph"
  IO.println "  lake exe atlas deps --sources                      # List basic definitions"
  IO.println "  lake exe atlas deps --sinks                        # List top-level theorems"
  IO.println "  lake exe atlas deps Hypercube.layer_incomparable"
  IO.println "  lake exe atlas deps Hypercube.layer deps.dot"
  IO.println ""
  IO.println "To generate PNG (requires graphviz):"
  IO.println "  dot -Tpng deps_graph.dot -o deps.png"

/-- Parse arguments (excluding --config which is extracted earlier) -/
def parseArgs (args : List String) : Option (String × String × Option Name) := do
  if args.isEmpty then none
  let constNameStr := args.head!
  let rest := args.tail!
  let mut outputFile := "deps_graph.dot"
  let mut moduleName : Option Name := none
  let mut i := 0
  while h : i < rest.length do
    let arg := rest[i]
    if arg == "--module" && i + 1 < rest.length then
      moduleName := some (stringToName rest[i + 1]!)
      i := i + 2
    else if !arg.startsWith "--" then
      outputFile := arg
      i := i + 1
    else
      i := i + 1
  return (constNameStr, outputFile, moduleName)

/-- Endpoint display mode -/
inductive EndpointMode where
  | sources
  | sinks
  | both
  deriving Repr, DecidableEq

/-- Show endpoints (source/sink vertices) -/
unsafe def showEndpoints (config : ProjectConfig) (mode : EndpointMode) : IO UInt32 := do
  IO.println s!"Loading {config.name}..."

  Discovery.ensureBuilt config.name
  Lean.initSearchPath (← Lean.findSysroot)
  let modules ← Discovery.discoverModules config.projectNamespace
  Lean.enableInitializersExecution

  let scope := config.toScope

  try
    Lean.withImportModules modules {} (trustLevel := 1024) fun env => do
      let graph := getFullDependencyGraph scope env

      if mode == .sources || mode == .both then
        let sources := getSourceVertices graph
        IO.println ""
        IO.println s!"=== Source Vertices (out-degree 0): {sources.size} ==="
        IO.println "These are basic definitions that don't depend on other project definitions."
        IO.println ""
        for s in sources do
          let kind := classifyConstant env s
          IO.println s!"  {s} ({kind})"

      if mode == .sinks || mode == .both then
        let sinks := getSinkVertices graph
        IO.println ""
        IO.println s!"=== Sink Vertices (in-degree 0): {sinks.size} ==="
        IO.println "These are top-level theorems/definitions that nothing else depends on."
        IO.println ""
        for s in sinks do
          let kind := classifyConstant env s
          IO.println s!"  {s} ({kind})"

      return (0 : UInt32)

  catch e =>
    IO.eprintln s!"Error: {e}"
    IO.eprintln s!"Try running: lake build {config.name}"
    return (1 : UInt32)

/-- Generate full dependency graph -/
unsafe def generateFullGraph (config : ProjectConfig) (outputFile : String) : IO UInt32 := do
  IO.println s!"Generating full dependency graph for {config.name}..."

  Discovery.ensureBuilt config.name
  Lean.initSearchPath (← Lean.findSysroot)
  let modules ← Discovery.discoverModules config.projectNamespace
  Lean.enableInitializersExecution

  let scope := config.toScope

  try
    let result ← Lean.withImportModules modules {} (trustLevel := 1024) fun env => do
      let graph := getFullDependencyGraph scope env
      let nodeCount := graph.size
      let edgeCount := graph.foldl (fun acc _ deps => acc + deps.size) 0

      IO.println s!"Found {nodeCount} definitions/theorems and {edgeCount} dependencies"

      let title := s!"Full Dependency Graph - {config.name}"
      let dotContent := toFullDot env graph title
      return some dotContent

    match result with
    | none => return (1 : UInt32)
    | some dotContent =>
      IO.FS.writeFile outputFile dotContent
      IO.println s!"Output written to: {outputFile}"
      return (0 : UInt32)

  catch e =>
    IO.eprintln s!"Error: {e}"
    IO.eprintln s!"Try running: lake build {config.name}"
    return (1 : UInt32)

unsafe def main (args : List String) : IO UInt32 := do
  -- Extract --config from arguments
  let (configPath, remainingArgs) := Load.extractConfigPath args

  -- Help flag
  if remainingArgs.head? == some "--help" || remainingArgs.head? == some "-h" then
    printUsage
    return (0 : UInt32)

  -- Load config (with fallback to lakefile inference)
  let config ← try
    Load.loadConfig configPath
  catch e =>
    IO.eprintln s!"Error loading config: {e}"
    return (1 : UInt32)

  -- Endpoint display flags
  if remainingArgs.head? == some "--sources" then
    return ← showEndpoints config .sources
  if remainingArgs.head? == some "--sinks" then
    return ← showEndpoints config .sinks
  if remainingArgs.head? == some "--endpoints" then
    return ← showEndpoints config .both

  -- No arguments: generate full graph
  if remainingArgs.isEmpty then
    return ← generateFullGraph config "deps_graph.dot"

  let some (constNameStr, outputFile, moduleOverride) := parseArgs remainingArgs | do
    printUsage
    return (1 : UInt32)

  let constName := stringToName constNameStr

  Discovery.ensureBuilt config.name
  Lean.initSearchPath (← Lean.findSysroot)
  Lean.enableInitializersExecution

  -- Use module override if provided, otherwise auto-discover
  let modules ← match moduleOverride with
    | some modName => pure #[{module := modName : Import}]
    | none => Discovery.discoverModules config.projectNamespace

  let scope := config.toScope

  IO.println s!"Analyzing dependencies for: {constName}"
  IO.println s!"Loading {config.name}..."

  try
    let result ← Lean.withImportModules modules {} (trustLevel := 1024) fun env => do
      let candidates := findConstantsBySuffix scope env constName
      match candidates with
      | #[] =>
        IO.eprintln s!"Error: No constant matching '{constName}' found."
        IO.eprintln "Make sure the constant name is correct and the project is built."
        return none
      | #[matched] =>
        if matched != constName then
          IO.println s!"Resolved to: {matched}"
        let actualConstName := matched

        let some ci := env.find? actualConstName | return none

        let kind := classifyConstant env actualConstName
        match ci with
        | .thmInfo _ | .defnInfo _ | .inductInfo _ =>
          IO.println s!"Type: {kind}"
        | _ =>
          IO.eprintln s!"Error: '{actualConstName}' is a {kind}, not a definition or theorem."
          return none

        let graph := getTransitiveDepsFiltered scope env actualConstName
        let nodeCount := graph.size
        let edgeCount := graph.foldl (fun acc _ deps => acc + deps.size) 0

        IO.println s!"Found {nodeCount} definitions/theorems and {edgeCount} dependencies"

        let title := s!"Dependencies of {actualConstName}"
        let dotContent := toDot env graph actualConstName title

        return some dotContent
      | matchList =>
        IO.eprintln s!"Error: Multiple constants match '{constName}':"
        for m in matchList do
          IO.eprintln s!"  - {m}"
        IO.eprintln "Please specify a more complete name."
        return none

    match result with
    | none => return (1 : UInt32)
    | some dotContent =>
      IO.FS.writeFile outputFile dotContent
      IO.println s!"Output written to: {outputFile}"
      return (0 : UInt32)

  catch e =>
    IO.eprintln s!"Error: {e}"
    IO.eprintln ""
    IO.eprintln "If you see 'object file ... does not exist', try running:"
    IO.eprintln s!"  lake build {config.name}"
    return (1 : UInt32)

end LeanAtlas.Deps
