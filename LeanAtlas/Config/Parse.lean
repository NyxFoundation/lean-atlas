/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Config - Constrained TOML parser for lean-atlas.toml

Only supports the fixed schema:
  [project]
  name = "..."
  namespace = "..."

  [atlas]
  root = "..."  (optional)
-/

import Lean
import LeanAtlas.Config.Types

namespace LeanAtlas.Config.Parse

open Lean

/-- A parsed key-value pair from TOML -/
structure TomlKeyValue where
  key : String
  value : String
  deriving Repr

/-- Parse state -/
inductive Section where
  | none
  | project
  | atlas
  deriving Repr, BEq

/-- Strip surrounding quotes from a string -/
private def stripQuotes (s : String) : String :=
  let s := s.trimAscii.toString
  if s.length >= 2 && s.front == '\"' && s.back == '\"' then
    ((s.drop 1).dropEnd 1).toString
  else
    s

/-- Parse a single line into key = value, ignoring comments and blanks -/
private def parseKeyValue (line : String) : Option TomlKeyValue := do
  let trimmed := line.trimAscii.toString
  -- Skip empty lines and comments
  if trimmed.isEmpty || trimmed.startsWith "#" then
    none
  else
    -- Skip section headers
    if trimmed.startsWith "[" then
      none
    else
      -- Find '=' separator
      let parts := trimmed.splitOn "="
      if parts.length >= 2 then
        let key := parts.head!.trimAscii.toString
        let value := stripQuotes ("=".intercalate parts.tail!)
        some { key, value }
      else
        none

/-- Parse lean-atlas.toml content into ProjectConfig -/
def parseToml (content : String) : Except String ProjectConfig := do
  let lines := content.splitOn "\n"
  let mut curSection := Section.none
  let mut projectName := ""
  let mut projectNamespace := ""
  let mut atlasRoot : Option String := none

  for line in lines do
    let trimmed := line.trimAscii.toString
    -- Section detection
    if trimmed == "[project]" then
      curSection := .project
      continue
    if trimmed == "[atlas]" then
      curSection := .atlas
      continue
    if trimmed.startsWith "[" then
      curSection := .none
      continue

    -- Parse key-value pairs
    match parseKeyValue trimmed with
    | none => continue
    | some kv =>
      match curSection with
      | .project =>
        if kv.key == "name" then
          projectName := kv.value
        else if kv.key == "namespace" then
          projectNamespace := kv.value
      | .atlas =>
        if kv.key == "root" then
          atlasRoot := some kv.value
      | .none => continue

  -- Validation
  if projectName.isEmpty then
    .error "lean-atlas.toml: [project].name is required"
  else if projectNamespace.isEmpty then
    .error "lean-atlas.toml: [project].namespace is required"
  else
    .ok {
      name := projectName
      projectNamespace := stringToName projectNamespace
      atlasRoot := atlasRoot
    }

end LeanAtlas.Config.Parse
