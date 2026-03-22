/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Config.Discovery - Auto-discover modules from namespace
-/

import Lean
import LeanAtlas.Config.Types

namespace LeanAtlas.Config.Discovery

open Lean System
open LeanAtlas.Config (stringToName)

/-- Convert a Lean Name to a filesystem path string (e.g., `Foo.Bar` → "Foo/Bar") -/
private def nameToPathStr (n : Name) : String :=
  "/".intercalate (n.components.map Name.toString)

/-- Convert a file path to a module Name (e.g., "Foo/Bar/Baz.lean" → `Foo.Bar.Baz`) -/
private def filePathToModuleName (path : FilePath) : Name :=
  let s := path.toString
  -- Remove leading "./" if present
  let s := if s.startsWith "./" then s.drop 2 else s
  -- Remove ".lean" extension
  let s := if s.endsWith ".lean" then s.dropEnd 5 else s
  stringToName (s.replace "/" ".")

/-- Recursively collect all .lean files under a directory -/
partial def collectLeanFiles (dir : FilePath) : IO (Array FilePath) := do
  let mut result : Array FilePath := #[]
  if !(← dir.pathExists) then
    return result
  let entries ← dir.readDir
  for entry in entries do
    if (← entry.path.isDir) then
      let sub ← collectLeanFiles entry.path
      result := result ++ sub
    else if entry.path.extension == some "lean" then
      result := result.push entry.path
  return result

/-- Check whether a module has a compiled `.olean` in the current search path. -/
private def hasOLean (mod : Name) : IO Bool := do
  let sp ← Lean.searchPathRef.get
  return (← sp.findWithExt "olean" mod).isSome

/-- Use the root module when it exists.
    This matches Lake's public entrypoint semantics and avoids importing
    implementation-only leaf files such as `Unused/*`.
    The .olean check is omitted here because `ensureBuilt` will build the
    project before environment loading. -/
private def discoverRootModule? (ns : Name) (rootFile : FilePath) : IO (Option (Array Import)) := do
  if !(← rootFile.pathExists) then
    return none
  return some #[{ module := ns : Import }]

/-- Discover modules by scanning for .lean files matching the namespace.
    Looks for:
    - `./Namespace.lean` (root module)
    - `./Namespace/**/*.lean` (all submodules)

    If the root module exists, prefer importing only that module.
    Otherwise, fall back to submodules that have compiled `.olean` artifacts. -/
def discoverModules (ns : Name) : IO (Array Import) := do
  let pathStr := nameToPathStr ns
  let rootFile : FilePath := ⟨pathStr ++ ".lean"⟩
  let subDir : FilePath := ⟨pathStr⟩
  if let some rootModules ← discoverRootModule? ns rootFile then
    return rootModules

  if !(← subDir.pathExists) then
    throw <| IO.userError
      s!"No importable modules found for namespace '{ns}'. Neither '{rootFile}' nor submodules under '{subDir}' are available."

  let files ← collectLeanFiles subDir
  let modules := files.map filePathToModuleName |>.qsort (Name.lt · ·)

  let mut importable : Array Name := #[]
  for mod in modules do
    if ← hasOLean mod then
      importable := importable.push mod

  -- If no .olean files found, fall back to all discovered modules.
  -- `ensureBuilt` should have built them; if not, `importModules` will
  -- produce a clear error.
  if importable.isEmpty then
    return modules.map (fun mod => { module := mod : Import })

  return importable.map (fun mod => { module := mod : Import })

/-- Run `lake build <projectName>` to ensure the project is compiled before
    loading the environment.  Stdout/stderr are inherited so the user sees
    build progress. -/
def ensureBuilt (projectName : String) : IO Unit := do
  let proc ← IO.Process.spawn {
    cmd := "lake"
    args := #["build", projectName]
    cwd := ← IO.currentDir
    stdin := .piped
    stdout := .inherit
    stderr := .inherit
  }
  let exitCode ← proc.wait
  if exitCode != 0 then
    throw <| IO.userError s!"Failed to build '{projectName}'."

end LeanAtlas.Config.Discovery
