/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.GraphData - CLI main module
-/

import Lean
import LeanAtlas.GraphData.Core
import LeanAtlas.GraphData.Json
import LeanAtlas.Config.Load
import LeanAtlas.Config.Discovery
import LeanAtlas.Cache

open Lean System
open LeanAtlas.Config

namespace LeanAtlas.GraphData

/-- Standard Lake build output directory for compiled .olean files -/
def defaultOleanDir : System.FilePath := ".lake/build/lib"

/-- Help message -/
def helpMessage : String := "
LeanAtlas GraphData - Dependency graph JSON export tool

Usage:
  lake exe atlas graph-data [options]

Options:
  --config FILE           Path to lean-atlas.toml (optional; auto-detected from lakefile)
  --output FILE, -o FILE  Output file path (stdout if not specified)
  --pretty                Pretty-print the JSON output
  --stats                 Output statistics only
  --no-cache              Force regeneration (skip cache check)
  --help, -h              Show this help
"

/-- Parsed command line arguments -/
structure Args where
  outputPath : Option FilePath := none
  pretty : Bool := false
  statsOnly : Bool := false
  showHelp : Bool := false
  noCache : Bool := false
  deriving Repr

/-- Parse command line arguments (--config already extracted) -/
def parseArgs (args : List String) : Args := Id.run do
  let mut result : Args := {}
  let mut i := 0
  while h : i < args.length do
    let arg := args[i]
    match arg with
    | "--help" | "-h" =>
      result := { result with showHelp := true }
    | "--pretty" =>
      result := { result with pretty := true }
    | "--stats" =>
      result := { result with statsOnly := true }
    | "--no-cache" =>
      result := { result with noCache := true }
    | "--output" | "-o" =>
      if i + 1 < args.length then
        result := { result with outputPath := some args[i + 1]! }
        i := i + 1
    | _ =>
      pure ()
    i := i + 1
  return result

/-- Get current timestamp (simple implementation) -/
def getCurrentTimestamp : IO String := do
  let now ← IO.monoNanosNow
  return s!"{now / 1000000000}"

/-- Main entry point -/
unsafe def main (args : List String) : IO UInt32 := do
  -- Extract --config from arguments
  let (configPath, remainingArgs) := Load.extractConfigPath args
  let parsedArgs := parseArgs remainingArgs

  if parsedArgs.showHelp then
    IO.println helpMessage
    return (0 : UInt32)

  -- Load config (with fallback to lakefile inference)
  let (config, configContent) ← try
    Load.loadConfigWithContent configPath
  catch e =>
    IO.eprintln s!"Error loading config: {e}"
    return (1 : UInt32)

  -- Cache check (only for file output mode)
  if !parsedArgs.noCache then
    if let some outputFilePath := parsedArgs.outputPath then
      if ← LeanAtlas.Cache.checkFreshness outputFilePath defaultOleanDir configContent then
        IO.println s!"Graph data is up to date. Skipping regeneration."
        IO.println s!"Use --no-cache to force."
        return 0

  IO.println "Loading environment..."
  Discovery.ensureBuilt config.name
  Lean.initSearchPath (← Lean.findSysroot)
  Lean.enableInitializersExecution
  let modules ← Discovery.discoverModules config.projectNamespace

  let scope := config.toScope

  try
    let env ← Lean.importModules modules {} (trustLevel := 1024) (loadExts := true)

    IO.println s!"Environment loaded. Building graph data..."

    let timestamp ← getCurrentTimestamp

    let graphData ← LeanAtlas.GraphData.Core.buildGraphDataIO scope env config.name timestamp

    IO.println s!"Graph built: {graphData.statistics.totalNodes} nodes, {graphData.statistics.totalEdges} edges"

    let output := if parsedArgs.statsOnly then
      LeanAtlas.GraphData.Json.toStatsJsonString graphData parsedArgs.pretty
    else if parsedArgs.pretty then
      LeanAtlas.GraphData.Json.toJsonStringPretty graphData
    else
      LeanAtlas.GraphData.Json.toJsonString graphData

    match parsedArgs.outputPath with
    | some path =>
      if let some parent := path.parent then
        IO.FS.createDirAll parent
      IO.FS.writeFile path output
      LeanAtlas.Cache.writeCacheManifest path configContent defaultOleanDir
      IO.println s!"Output written to: {path}"
    | none =>
      IO.println output

    return (0 : UInt32)
  catch e =>
    IO.eprintln s!"Error: {e}"
    IO.eprintln s!"Try running: lake build {config.name}"
    return (1 : UInt32)

end LeanAtlas.GraphData
