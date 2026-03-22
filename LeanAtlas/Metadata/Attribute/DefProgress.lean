/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - @[def_progress] attribute

Declares definition progress level.
`complete` level will produce a compile error if the definition contains sorry.
-/

import Lean.Elab.Command
import LeanAtlas.Metadata.Core
import LeanAtlas.Metadata.Attribute.ProofProgress

/-!
# @[def_progress] attribute

Declares the completion level of a definition (def/structure/inductive/abbrev/instance).

## Usage

```lean
@[def_progress partially]
def myDef : Nat := sorry  -- OK: partially allows sorry

@[def_progress complete]
def myDef2 : Nat := 42    -- OK: no sorry

@[def_progress complete]
def broken : Nat := sorry  -- Compile error!
```

## Constraints

- A constant marked `complete` that contains sorry will produce an error
-/

open Lean Elab

namespace LeanAtlas.Metadata

/-- @[def_progress] entry (stored in environment) -/
structure DefProgressEntry where
  /-- Name of the definition -/
  declName : Name
  /-- Progress level -/
  defProgress : DefProgress
  deriving BEq, Hashable, Inhabited

/-- Persistent environment extension registration -/
initialize defProgressExt : SimplePersistentEnvExtension DefProgressEntry (Std.HashSet DefProgressEntry) ←
  registerSimplePersistentEnvExtension {
    addImportedFn := fun as => as.foldl Std.HashSet.insertMany {}
    addEntryFn := .insert
  }

/-- Helper to add an entry -/
def addDefProgressEntry {m : Type → Type} [MonadEnv m]
    (declName : Name) (defProgress : DefProgress) : m Unit :=
  modifyEnv (defProgressExt.addEntry · { declName, defProgress })

/-- Get DefProgress for a specific constant from the environment -/
def getDefProgress (env : Environment) (declName : Name) : Option DefProgress :=
  defProgressExt.getState env |>.toArray.find? (·.declName == declName) |>.map (·.defProgress)

/-- Get all DefProgressEntry from the environment -/
def getAllDefProgressEntries (env : Environment) : Array DefProgressEntry :=
  defProgressExt.getState env |>.toArray

/-- Syntax category for def progress levels -/
declare_syntax_cat defProgressLevel

syntax "complete" : defProgressLevel
syntax "partially" : defProgressLevel

/-- @[def_progress ...] attribute syntax
    Usage: @[def_progress complete] -/
syntax (name := def_progress_attr) "def_progress" defProgressLevel : attr

/-- Attribute handler registration -/
initialize Lean.registerBuiltinAttribute {
  name := `def_progress_attr
  descr := "Mark a definition with definition progress level"
  add := fun declName stx _attrKind => do
    match stx with
    | `(attr| def_progress $level) =>
      let defProgress ← match level with
        | `(defProgressLevel| complete) => pure DefProgress.complete
        | `(defProgressLevel| partially) => pure DefProgress.partially
        | _ => throwUnsupportedSyntax

      -- For complete, run sorry check
      if defProgress == DefProgress.complete then
        let env ← getEnv
        match env.find? declName with
        | some ci =>
          if constantHasSorry ci then
            throwError "@[def_progress complete] cannot be used with definitions containing sorry. \
                       Use 'partially' instead."
        | none => pure ()

      addDefProgressEntry declName defProgress
    | _ => throwUnsupportedSyntax
}

end LeanAtlas.Metadata
