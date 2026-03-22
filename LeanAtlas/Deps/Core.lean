/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Deps - Core dependency graph extraction logic
-/

import Lean
import LeanAtlas.Config.Types

namespace LeanAtlas.Deps.Core

open Lean
open LeanAtlas.Config

/-- Check if a constant belongs to the project (parameterized by ProjectScope) -/
def isProjectConstant (scope : ProjectScope) (env : Environment) (n : Name) : Bool :=
  scope.isProjectConstant env n

/-- Get direct dependencies (filtered to project constants only) -/
def getDirectDeps (scope : ProjectScope) (env : Environment) (n : Name) : Array Name := Id.run do
  let some ci := env.find? n | return #[]
  let usedConstants := ci.getUsedConstantsAsSet
  let mut result : Array Name := #[]
  for c in usedConstants do
    if isProjectConstant scope env c && c != n then
      result := result.push c
  return result

/-- Get transitive dependencies as a graph -/
def getTransitiveDeps (scope : ProjectScope) (env : Environment) (n : Name) : NameMap (Array Name) := Id.run do
  let mut graph : NameMap (Array Name) := {}
  let mut visited : NameSet := {}
  let mut toProcess : Array Name := #[n]
  while h : toProcess.size > 0 do
    let current := toProcess[0]
    toProcess := toProcess.eraseIdx 0
    if visited.contains current then
      continue
    visited := visited.insert current
    let deps := getDirectDeps scope env current
    graph := graph.insert current deps
    for dep in deps do
      if !visited.contains dep then
        toProcess := toProcess.push dep
  return graph

/-- Classify a constant (theorem/definition etc.)
    Inductive types are treated as definitions -/
def classifyConstant (env : Environment) (n : Name) : String :=
  match env.find? n with
  | some (.thmInfo _) => "theorem"
  | some (.defnInfo _) => "definition"
  | some (.axiomInfo _) => "axiom"
  | some (.opaqueInfo _) => "opaque"
  | some (.quotInfo _) => "quot"
  | some (.inductInfo _) => "definition"
  | some (.ctorInfo _) => "constructor"
  | some (.recInfo _) => "recursor"
  | none => "unknown"

/-- Detailed constant classification (subcategories for theorems/definitions)
    isAuto: auto-generated flag -/
def classifyConstantDetailed (env : Environment) (n : Name) (isAuto : Bool) : String :=
  match env.find? n with
  | some (.thmInfo _) =>
    if isAuto then "theorem_auto" else "theorem_manual"
  | some (.defnInfo di) =>
    if di.hints.isAbbrev then "abbrev" else "definition"
  | some (.axiomInfo _) => "axiom"
  | some (.opaqueInfo _) => "opaque"
  | some (.quotInfo _) => "quot"
  | some (.inductInfo _) =>
    if Lean.isStructure env n then "structure" else "inductive"
  | some (.ctorInfo _) => "constructor"
  | some (.recInfo _) => "recursor"
  | none => "unknown"

/-- Check if a constant is a definition or theorem -/
def isDefinitionOrTheorem (env : Environment) (n : Name) : Bool :=
  match env.find? n with
  | some (.thmInfo _) => true
  | some (.defnInfo _) => true
  | some (.axiomInfo _) => true
  | some (.inductInfo _) => true
  | _ => false

/-- Check if a string contains a substring -/
def containsSubstr (s sub : String) : Bool :=
  (s.splitOn sub).length > 1

/-- Check if a constant is user-defined (not internal helper) -/
def isUserDefinedConstant (n : Name) : Bool :=
  if n.isInternal then false
  else
    let str := n.toString
    !containsSubstr str "_match_" &&
    !containsSubstr str "_proof_" &&
    !containsSubstr str "_simp_" &&
    !containsSubstr str "_eq_" &&
    !containsSubstr str ".match_" &&
    !containsSubstr str ".proof_"

/-- Filter for relevant user-defined definitions/theorems -/
def isRelevantConstant (scope : ProjectScope) (env : Environment) (n : Name) : Bool :=
  isProjectConstant scope env n && isUserDefinedConstant n && isDefinitionOrTheorem env n

/-- Dependency kind: type dependency vs value-only dependency -/
inductive DepKind
  | typeOnly   -- Used in type (statement); may also appear in value
  | valueOnly  -- Used only in value (proof/implementation)
  deriving Repr, BEq, Inhabited

/-- Dependency with kind information -/
structure DepWithKind where
  name : Name
  kind : DepKind
  deriving Repr, Inhabited

/-- Get direct dependencies with kind information (filtered to relevant constants) -/
def getDirectDepsWithKind (scope : ProjectScope) (env : Environment) (n : Name) : Array DepWithKind := Id.run do
  let some ci := env.find? n | return #[]
  let typeConstants := ci.type.getUsedConstantsAsSet
  let valueConstants : NameSet := match ci with
    | .thmInfo ti => ti.value.getUsedConstantsAsSet
    | .defnInfo di => di.value.getUsedConstantsAsSet
    | .opaqueInfo oi => oi.value.getUsedConstantsAsSet
    | _ => {}

  let mut result : Array DepWithKind := #[]
  for c in typeConstants do
    if isRelevantConstant scope env c && c != n then
      result := result.push { name := c, kind := .typeOnly }
  for c in valueConstants do
    if isRelevantConstant scope env c && c != n && !typeConstants.contains c then
      result := result.push { name := c, kind := .valueOnly }
  return result

/-- Get direct dependencies (filtered to relevant constants) -/
def getDirectDepsFiltered (scope : ProjectScope) (env : Environment) (n : Name) : Array Name := Id.run do
  let some ci := env.find? n | return #[]
  let usedConstants := ci.getUsedConstantsAsSet
  let mut result : Array Name := #[]
  for c in usedConstants do
    if isRelevantConstant scope env c && c != n then
      result := result.push c
  return result

/-- Get transitive dependencies as a graph (filtered to relevant constants) -/
def getTransitiveDepsFiltered (scope : ProjectScope) (env : Environment) (n : Name) : NameMap (Array Name) := Id.run do
  let mut graph : NameMap (Array Name) := {}
  let mut visited : NameSet := {}
  let mut toProcess : Array Name := #[n]
  while h : toProcess.size > 0 do
    let current := toProcess[0]
    toProcess := toProcess.eraseIdx 0
    if visited.contains current then
      continue
    visited := visited.insert current
    let deps := getDirectDepsFiltered scope env current
    if isRelevantConstant scope env current || graph.isEmpty then
      graph := graph.insert current deps
    for dep in deps do
      if !visited.contains dep then
        toProcess := toProcess.push dep
  return graph

/-- Search for constants by suffix match.
    First tries exact match, then suffix matching.
    Only considers relevant project constants. -/
def findConstantsBySuffix (scope : ProjectScope) (env : Environment) (suffix : Name) : Array Name := Id.run do
  if env.find? suffix |>.isSome then
    return #[suffix]
  let mut result : Array Name := #[]
  for (name, _) in env.constants.map₁.toList do
    if isRelevantConstant scope env name && suffix.isSuffixOf name then
      result := result.push name
  return result

/-- Get all project constants (filtered to relevant constants) -/
def getAllProjectConstants (scope : ProjectScope) (env : Environment) : Array Name := Id.run do
  let mut result : Array Name := #[]
  for (name, _) in env.constants.map₁.toList do
    if isRelevantConstant scope env name then
      result := result.push name
  return result

/-- Build full dependency graph for all project constants -/
def getFullDependencyGraph (scope : ProjectScope) (env : Environment) : NameMap (Array Name) := Id.run do
  let allConstants := getAllProjectConstants scope env
  let mut graph : NameMap (Array Name) := {}
  for c in allConstants do
    let deps := getDirectDepsFiltered scope env c
    graph := graph.insert c deps
  return graph

/-- Get all nodes from a graph -/
def getAllNodes (graph : NameMap (Array Name)) : NameSet := Id.run do
  let mut nodes : NameSet := {}
  for (node, deps) in graph.toList do
    nodes := nodes.insert node
    for dep in deps do
      nodes := nodes.insert dep
  return nodes

/-- Compute in-degrees for all nodes -/
def computeInDegrees (graph : NameMap (Array Name)) : NameMap Nat := Id.run do
  let allNodes := getAllNodes graph
  let mut inDegrees : NameMap Nat := {}
  for node in allNodes.toList do
    inDegrees := inDegrees.insert node 0
  for (_, deps) in graph.toList do
    for dep in deps do
      let current := inDegrees.find? dep |>.getD 0
      inDegrees := inDegrees.insert dep (current + 1)
  return inDegrees

/-- Get source vertices (out-degree 0 = basic definitions with no project dependencies) -/
def getSourceVertices (graph : NameMap (Array Name)) : Array Name := Id.run do
  let allNodes := getAllNodes graph
  let mut sources : Array Name := #[]
  for node in allNodes.toList do
    let outDegree := (graph.find? node |>.getD #[]).size
    if outDegree == 0 then
      sources := sources.push node
  return sources.qsort (·.toString < ·.toString)

/-- Get sink vertices (in-degree 0 = top-level theorems nothing depends on) -/
def getSinkVertices (graph : NameMap (Array Name)) : Array Name := Id.run do
  let inDegrees := computeInDegrees graph
  let mut sinks : Array Name := #[]
  for (node, degree) in inDegrees.toList do
    if degree == 0 then
      sinks := sinks.push node
  return sinks.qsort (·.toString < ·.toString)

end LeanAtlas.Deps.Core
