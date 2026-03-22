/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Deps - DOT/Graphviz format generation
-/

import Lean
import LeanAtlas.Deps.Core

namespace LeanAtlas.Deps.Dot

open Lean
open LeanAtlas.Deps.Core

/-- Node style (shape and color based on constant kind)
    theorem = box, definition = ellipse -/
def nodeStyle (kind : String) : String × String :=
  match kind with
  | "theorem" => ("box", "#e6f3ff")
  | "definition" => ("ellipse", "#e6ffe6")
  | "constructor" => ("oval", "#f0f0f0")
  | "recursor" => ("oval", "#f5f5f5")
  | "axiom" => ("octagon", "#ffe6e6")
  | _ => ("ellipse", "#ffffff")

/-- Escape a name for DOT format -/
def escapeName (n : Name) : String :=
  n.toString.replace "." "_"

/-- Short display name (last component only) -/
def shortName (n : Name) : String :=
  match n with
  | .str _ s => s
  | .num _ n => toString n
  | .anonymous => "anon"

/-- Convert graph to DOT format -/
def toDot (env : Environment) (graph : NameMap (Array Name))
    (rootName : Name) (title : String) : String := Id.run do
  let mut lines : Array String := #[]
  lines := lines.push s!"digraph \"{title}\" \{"
  lines := lines.push "  rankdir=TB;"
  lines := lines.push "  node [fontname=\"Helvetica\", fontsize=10, style=filled];"
  lines := lines.push ""

  for (n, _) in graph do
    let kind := classifyConstant env n
    let (shape, fillcolor) := nodeStyle kind
    let escaped := escapeName n
    let label := shortName n
    let penwidth := if n == rootName then "3" else "1"
    lines := lines.push s!"  \"{escaped}\" [label=\"{label}\", shape={shape}, fillcolor=\"{fillcolor}\", penwidth={penwidth}];"

  lines := lines.push ""

  for (n, deps) in graph do
    let nEscaped := escapeName n
    for dep in deps do
      let depEscaped := escapeName dep
      lines := lines.push s!"  \"{depEscaped}\" -> \"{nEscaped}\";"

  lines := lines.push "}"
  return "\n".intercalate lines.toList

/-- Convert full graph to DOT format (no root node highlighting) -/
def toFullDot (env : Environment) (graph : NameMap (Array Name)) (title : String) : String := Id.run do
  let mut lines : Array String := #[]
  lines := lines.push s!"digraph \"{title}\" \{"
  lines := lines.push "  rankdir=TB;"
  lines := lines.push "  node [fontname=\"Helvetica\", fontsize=10, style=filled];"
  lines := lines.push ""

  for (n, _) in graph do
    let kind := classifyConstant env n
    let (shape, fillcolor) := nodeStyle kind
    let escaped := escapeName n
    let label := shortName n
    lines := lines.push s!"  \"{escaped}\" [label=\"{label}\", shape={shape}, fillcolor=\"{fillcolor}\"];"

  lines := lines.push ""

  for (n, deps) in graph do
    let nEscaped := escapeName n
    for dep in deps do
      let depEscaped := escapeName dep
      lines := lines.push s!"  \"{depEscaped}\" -> \"{nEscaped}\";"

  lines := lines.push "}"
  return "\n".intercalate lines.toList

end LeanAtlas.Deps.Dot
