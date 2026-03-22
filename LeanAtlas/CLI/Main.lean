/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.CLI - Unified CLI entry point (`lake exe atlas`)
-/

import LeanAtlas.Config.Load
import LeanAtlas.CLI.Banner
import LeanAtlas.CLI.Serve

-- These are imported as separate executables but share the same config system
import LeanAtlas.Deps.Main
import LeanAtlas.GraphData.Main
import LeanAtlas.Compass.Main

open LeanAtlas.Config
open LeanAtlas.CLI.Banner

/-- Top-level help message -/
private def helpMessage : String := "
LeanAtlas - Lean project visualization toolkit

Usage:
  lake exe atlas [command] [options]

Commands:
  serve              Generate graph data and start web viewer (default)
  deps [args...]     Dependency graph DOT output
  graph-data [args...] JSON graph data export
  compass [args...]  Lean Compass reduction rate analysis

Global Options:
  --config FILE      Path to lean-atlas.toml (optional; auto-detected from lakefile)
  --quiet, -q        Suppress banner output
  --help, -h         Show this help

Serve Options:
  --port PORT        Web viewer port (default: 5326)
  --no-generate      Skip graph.json generation
  --atlas-root PATH  Path to lean-atlas root directory
  --no-cache         Force graph-data regeneration (skip cache check)

Graph-Data Options:
  --output FILE, -o FILE  Output file path
  --pretty                Pretty-print the JSON output
  --stats                 Output statistics only
  --no-cache              Force regeneration (skip cache check)

Examples:
  lake exe atlas                                    # Generate + start web viewer
  lake exe atlas serve --port 3001                  # Custom port
  lake exe atlas serve --no-generate                # Skip generation
  lake exe atlas deps Hypercube.layer deps.dot      # Dependency DOT
  lake exe atlas graph-data --output graph.json --pretty  # JSON export
"

/-- Main entry point -/
unsafe def main (args : List String) : IO UInt32 := do
  -- Extract --config from arguments first
  let (configPath, remainingArgs) := Load.extractConfigPath args
  -- Extract --quiet flag
  let (quiet, remainingArgs) := extractQuietFlag remainingArgs

  -- Print banner unless suppressed
  if !quiet then
    printBanner

  -- Check for top-level --help
  match remainingArgs.head? with
  | some "--help" | some "-h" =>
    IO.println helpMessage
    return (0 : UInt32)
  | _ => pure ()

  -- Determine subcommand
  let (subcommand, subArgs) := match remainingArgs with
    | [] => ("serve", [])
    | cmd :: rest =>
      if cmd.startsWith "--" then
        -- Flags without subcommand → default to serve
        ("serve", remainingArgs)
      else
        (cmd, rest)

  match subcommand with
  | "serve" =>
    -- Load config for serve
    let config ← try
      Load.loadConfig configPath
    catch e =>
      IO.eprintln s!"Error loading config: {e}"
      return (1 : UInt32)
    LeanAtlas.CLI.Serve.serveMain subArgs configPath config
  | "deps" =>
    -- Delegate to deps main (re-add --config so it can extract it)
    let fullArgs := if configPath != Load.defaultConfigPath then
      ["--config", configPath] ++ subArgs
    else
      subArgs
    LeanAtlas.Deps.main fullArgs
  | "graph-data" =>
    -- Delegate to graph-data main (re-add --config so it can extract it)
    let fullArgs := if configPath != Load.defaultConfigPath then
      ["--config", configPath] ++ subArgs
    else
      subArgs
    LeanAtlas.GraphData.main fullArgs
  | "compass" =>
    -- Delegate to compass main (re-add --config so it can extract it)
    let fullArgs := if configPath != Load.defaultConfigPath then
      ["--config", configPath] ++ subArgs
    else
      subArgs
    LeanAtlas.Compass.main fullArgs
  | cmd =>
    IO.eprintln s!"Unknown command: {cmd}"
    IO.eprintln "Run 'lake exe atlas --help' for usage information."
    return (1 : UInt32)
