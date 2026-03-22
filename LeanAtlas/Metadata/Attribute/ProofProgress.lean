/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - @[proof_progress] attribute

Declares proof progress level.
`complete` level will produce a compile error if the proof contains sorry.
-/

import Lean.Elab.Command
import LeanAtlas.Metadata.Core

/-!
# @[proof_progress] attribute

Declares the completion level of a proof (value/implementation).

## Usage

```lean
@[proof_progress partially]
theorem lemma : P := by sorry  -- OK: partially allows sorry

@[proof_progress complete]
theorem verified : Q := by simp -- OK: no sorry

@[proof_progress complete]
theorem broken : R := by sorry  -- Compile error!
```

## Constraints

- A constant marked `complete` that contains sorry will produce an error
-/

open Lean Elab

namespace LeanAtlas.Metadata

/-- @[proof_progress] entry (stored in environment) -/
structure ProofProgressEntry where
  /-- Name of the definition/theorem -/
  declName : Name
  /-- Progress level -/
  proofProgress : ProofProgress
  deriving BEq, Hashable, Inhabited

/-- Persistent environment extension registration -/
initialize proofProgressExt : SimplePersistentEnvExtension ProofProgressEntry (Std.HashSet ProofProgressEntry) ←
  registerSimplePersistentEnvExtension {
    addImportedFn := fun as => as.foldl Std.HashSet.insertMany {}
    addEntryFn := .insert
  }

/-- Helper to add an entry -/
def addProofProgressEntry {m : Type → Type} [MonadEnv m]
    (declName : Name) (proofProgress : ProofProgress) : m Unit :=
  modifyEnv (proofProgressExt.addEntry · { declName, proofProgress })

/-- Get ProofProgress for a specific constant from the environment -/
def getProofProgress (env : Environment) (declName : Name) : Option ProofProgress :=
  proofProgressExt.getState env |>.toArray.find? (·.declName == declName) |>.map (·.proofProgress)

/-- Get all ProofProgressEntry from the environment -/
def getAllProofProgressEntries (env : Environment) : Array ProofProgressEntry :=
  proofProgressExt.getState env |>.toArray

/-- Syntax category for proof progress levels -/
declare_syntax_cat proofProgressLevel

syntax "complete" : proofProgressLevel
syntax "mostly" : proofProgressLevel
syntax "partially" : proofProgressLevel
syntax "stub" : proofProgressLevel

/-- @[proof_progress ...] attribute syntax
    Usage: @[proof_progress partially] -/
syntax (name := proof_progress_attr) "proof_progress" proofProgressLevel : attr

/-- Attribute handler registration -/
initialize Lean.registerBuiltinAttribute {
  name := `proof_progress_attr
  descr := "Mark a definition/theorem with proof progress level"
  add := fun declName stx _attrKind => do
    match stx with
    | `(attr| proof_progress $level) =>
      let proofProgress ← match level with
        | `(proofProgressLevel| complete) => pure ProofProgress.complete
        | `(proofProgressLevel| mostly) => pure ProofProgress.mostly
        | `(proofProgressLevel| partially) => pure ProofProgress.partially
        | `(proofProgressLevel| stub) => pure ProofProgress.stub
        | _ => throwUnsupportedSyntax

      -- For complete, run sorry check
      if proofProgress == ProofProgress.complete then
        let env ← getEnv
        match env.find? declName with
        | some ci =>
          if constantHasSorry ci then
            throwError "@[proof_progress complete] cannot be used with definitions containing sorry. \
                       Use 'partially', 'mostly', or 'stub' instead."
        | none => pure ()

      addProofProgressEntry declName proofProgress
    | _ => throwUnsupportedSyntax
}

end LeanAtlas.Metadata
