/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Compass - Lean Compass reduction rate analysis
-/

import Lean
import LeanAtlas.GraphData.Core
import LeanAtlas.Config.Load
import LeanAtlas.Config.Discovery

open Lean System
open LeanAtlas.Config
open LeanAtlas.GraphData.Core

namespace LeanAtlas.Compass

/-- Check if an edge should be traversed by Compass (exclude theorem_value_* edges) -/
def isCompassEdge (e : EdgeData) : Bool :=
  e.kind != .theoremValueToDefinition && e.kind != .theoremValueToTheorem

/-- Build adjacency list from edges, applying a filter -/
def buildAdjacency (edges : Array EdgeData) (filter : EdgeData → Bool) : NameMap (Array Name) := Id.run do
  let mut adj : NameMap (Array Name) := {}
  for e in edges do
    if filter e then
      let targets := adj.find? e.source |>.getD #[]
      adj := adj.insert e.source (targets.push e.target)
  return adj

/-- Compute reachable nodes from a start node via DFS -/
def reachableNodes (startNode : Name) (adj : NameMap (Array Name)) : NameSet := Id.run do
  let mut visited : NameSet := {}
  let mut stack : Array Name := #[startNode]
  while h : stack.size > 0 do
    let current := stack[stack.size - 1]
    stack := stack.pop
    if visited.contains current then
      continue
    visited := visited.insert current
    let targets := adj.find? current |>.getD #[]
    for t in targets do
      if !visited.contains t then
        stack := stack.push t
  return visited

/-- Result for a single mainTheorem -/
structure CompassResult where
  name : Name
  fullCount : Nat
  compassCount : Nat
  reductionRate : Float

/-- Format a Float as a percentage string with one decimal place -/
private def formatPercent (f : Float) : String :=
  let scaled := (f * 10).round
  let intPart := scaled / 10
  let fracPart := (scaled - intPart * 10).toUInt32.toNat
  s!"{intPart.toUInt32.toNat}.{fracPart}"

/-- Main entry point for compass subcommand -/
unsafe def main (args : List String) : IO UInt32 := do
  -- Extract --config from arguments
  let (configPath, _remainingArgs) := Load.extractConfigPath args

  -- Load config (with fallback to lakefile inference)
  let config ← try
    Load.loadConfig configPath
  catch e =>
    IO.eprintln s!"Error loading config: {e}"
    return (1 : UInt32)

  IO.println "Loading environment..."
  Discovery.ensureBuilt config.name
  Lean.initSearchPath (← Lean.findSysroot)
  Lean.enableInitializersExecution
  let modules ← Discovery.discoverModules config.projectNamespace

  let scope := config.toScope

  try
    let env ← Lean.importModules modules {} (trustLevel := 1024) (loadExts := true)

    IO.println s!"Environment loaded. Building graph data..."

    let timestamp := "0"
    let graphData := LeanAtlas.GraphData.Core.buildGraphData scope env config.name timestamp

    let totalNodes := graphData.statistics.totalNodes
    let totalEdges := graphData.statistics.totalEdges

    IO.println ""
    IO.println "Lean Compass — Reduction Rate Analysis"
    IO.println s!"  Total: {totalNodes} nodes, {totalEdges} edges"
    IO.println ""

    -- Build two adjacency lists: full and compass-filtered
    let fullAdj := buildAdjacency graphData.edges (fun _ => true)
    let compassAdj := buildAdjacency graphData.edges isCompassEdge

    -- Find mainTheorem nodes
    let mainTheorems := graphData.nodes.filter (·.progressMeta.isMainTheorem)

    if mainTheorems.isEmpty then
      IO.println "  No mainTheorem nodes found."
      IO.println "  Set `main_theorem = true` in lean-atlas.toml metadata to use Compass analysis."
      return (0 : UInt32)

    -- Compute results for each mainTheorem
    let mut results : Array CompassResult := #[]
    for mt in mainTheorems do
      let fullReachable := reachableNodes mt.id fullAdj
      let compassReachable := reachableNodes mt.id compassAdj
      let fullCount := fullReachable.toList.length
      let compassCount := compassReachable.toList.length
      let reductionRate := if fullCount > 0 then
        (Float.ofNat (fullCount - compassCount)) / (Float.ofNat fullCount) * 100.0
      else
        0.0
      results := results.push {
        name := mt.id
        fullCount := fullCount
        compassCount := compassCount
        reductionRate := reductionRate
      }

    -- Print results
    for r in results do
      IO.println s!"  {r.name}"
      IO.println s!"    Full: {r.fullCount} nodes → Compass: {r.compassCount} nodes ({formatPercent r.reductionRate}% reduction)"

    -- Average reduction rate
    if results.size > 0 then
      let totalRate := results.foldl (fun acc r => acc + r.reductionRate) 0.0
      let avgRate := totalRate / Float.ofNat results.size
      IO.println ""
      IO.println s!"  Average reduction rate: {formatPercent avgRate}%"

    return (0 : UInt32)
  catch e =>
    IO.eprintln s!"Error: {e}"
    IO.eprintln s!"Try running: lake build {config.name}"
    return (1 : UInt32)

end LeanAtlas.Compass
