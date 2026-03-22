/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - @[confidence] attribute

Declares the confidence level for a statement's correctness.
-/

import Lean.Elab.Command
import LeanAtlas.Metadata.Core

/-!
# @[confidence] attribute

Declares confidence in the correctness of a statement (definition/theorem claim).

## Usage

```lean
@[confidence high]
def layer : Nat := ...

@[confidence perfect]  -- Expert verified
theorem main_theorem : P := ...
```
-/

open Lean Elab

namespace LeanAtlas.Metadata

/-- @[confidence] entry (stored in environment) -/
structure ConfidenceEntry where
  /-- Name of the definition/theorem -/
  declName : Name
  /-- Confidence level -/
  confidence : Confidence
  deriving BEq, Hashable, Inhabited

/-- Persistent environment extension registration -/
initialize confidenceExt : SimplePersistentEnvExtension ConfidenceEntry (Std.HashSet ConfidenceEntry) ←
  registerSimplePersistentEnvExtension {
    addImportedFn := fun as => as.foldl Std.HashSet.insertMany {}
    addEntryFn := .insert
  }

/-- Helper to add an entry -/
def addConfidenceEntry {m : Type → Type} [MonadEnv m]
    (declName : Name) (confidence : Confidence) : m Unit :=
  modifyEnv (confidenceExt.addEntry · { declName, confidence })

/-- Get Confidence for a specific constant from the environment -/
def getConfidence (env : Environment) (declName : Name) : Option Confidence :=
  confidenceExt.getState env |>.toArray.find? (·.declName == declName) |>.map (·.confidence)

/-- Get all ConfidenceEntry from the environment -/
def getAllConfidenceEntries (env : Environment) : Array ConfidenceEntry :=
  confidenceExt.getState env |>.toArray

/-- Syntax category for confidence levels -/
declare_syntax_cat confidenceLevel

syntax "perfect" : confidenceLevel
syntax "high" : confidenceLevel
syntax "medium" : confidenceLevel
syntax "low" : confidenceLevel

/-- @[confidence ...] attribute syntax
    Usage: @[confidence high] -/
syntax (name := confidence_attr) "confidence" confidenceLevel : attr

/-- Attribute handler registration -/
initialize Lean.registerBuiltinAttribute {
  name := `confidence_attr
  descr := "Mark a definition/theorem with confidence level for statement correctness"
  add := fun declName stx _attrKind => do
    match stx with
    | `(attr| confidence $level) =>
      let confidence ← match level with
        | `(confidenceLevel| perfect) => pure Confidence.perfect
        | `(confidenceLevel| high) => pure Confidence.high
        | `(confidenceLevel| medium) => pure Confidence.medium
        | `(confidenceLevel| low) => pure Confidence.low
        | _ => throwUnsupportedSyntax
      addConfidenceEntry declName confidence
    | _ => throwUnsupportedSyntax
}

end LeanAtlas.Metadata
