/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Config - Type definitions for project configuration
-/

import Lean

namespace LeanAtlas.Config

open Lean

/-- Project configuration loaded from lean-atlas.toml -/
structure ProjectConfig where
  /-- Project display name -/
  name : String
  /-- Lean namespace (used for filtering) -/
  projectNamespace : Name
  /-- Path to lean-atlas root directory (from `[atlas] root`) -/
  atlasRoot : Option String := none
  deriving Inhabited

/-- Project scope for filtering constants -/
structure ProjectScope where
  /-- Lean namespace prefix -/
  projectNamespace : Name

/-- Create a ProjectScope from a ProjectConfig -/
def ProjectConfig.toScope (config : ProjectConfig) : ProjectScope :=
  { projectNamespace := config.projectNamespace }

/-- Get the module name for a given constant -/
def getModuleFor? (env : Environment) (n : Name) : Option Name :=
  match env.getModuleIdxFor? n with
  | some idx => env.header.moduleNames[idx.toNat]!
  | none =>
    if env.constants.map₂.contains n then
      env.header.mainModule
    else
      none

/-- Check if a constant belongs to the project scope -/
def ProjectScope.isProjectConstant (scope : ProjectScope) (env : Environment) (n : Name) : Bool :=
  match getModuleFor? env n with
  | some modName => scope.projectNamespace.isPrefixOf modName
  | none => env.constants.map₂.contains n

/-- Convert a dot-separated string to a Lean Name -/
def stringToName (s : String) : Name :=
  s.splitOn "." |>.foldl (fun acc part => acc ++ .mkSimple part) .anonymous

end LeanAtlas.Config
