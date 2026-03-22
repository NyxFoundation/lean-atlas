/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - Core type definitions

Confidence levels and proof/definition progress types for tracking
formalization status independently.
-/

import Lean

namespace LeanAtlas.Metadata

/-- Statement confidence level

Represents confidence in the correctness of a statement (definition/theorem claim).
Independent of proof completeness or dependency confidence.

- `perfect` - Verified by human expert
- `high` - AI high confidence
- `medium` - AI nearly certain
- `low` - AI tentative
-/
inductive Confidence where
  | perfect : Confidence
  | high    : Confidence
  | medium  : Confidence
  | low     : Confidence
  deriving DecidableEq, Inhabited, BEq, Hashable, Repr

namespace Confidence

def toString : Confidence → String
  | perfect => "perfect"
  | high    => "high"
  | medium  => "medium"
  | low     => "low"

instance : ToString Confidence := ⟨toString⟩

/-- Minimum of two confidence levels (low is lowest) -/
def min (a b : Confidence) : Confidence :=
  match a, b with
  | low, _ | _, low => low
  | medium, _ | _, medium => medium
  | high, _ | _, high => high
  | perfect, perfect => perfect

/-- Comparison (low < medium < high < perfect) -/
def le (a b : Confidence) : Bool :=
  match a, b with
  | low, _ => true
  | medium, medium | medium, high | medium, perfect => true
  | high, high | high, perfect => true
  | perfect, perfect => true
  | _, _ => false

/-- Parse from string -/
def fromString? (s : String) : Option Confidence :=
  match s with
  | "perfect" => some perfect
  | "high" => some high
  | "medium" => some medium
  | "low" => some low
  | _ => none

/-- JSON string representation -/
def toJsonString : Confidence → String
  | perfect => "perfect"
  | high => "high"
  | medium => "medium"
  | low => "low"

end Confidence

/-- Proof progress level

Represents completion level of a proof (value/implementation).
Independent of statement confidence.

- `complete` - No sorry (enforced by compiler)
- `mostly` - Minor gaps only
- `partially` - Substantially complete
- `stub` - Stub only
-/
inductive ProofProgress where
  | complete  : ProofProgress
  | mostly    : ProofProgress
  | partially : ProofProgress
  | stub      : ProofProgress
  deriving DecidableEq, Inhabited, BEq, Hashable, Repr

namespace ProofProgress

def toString : ProofProgress → String
  | complete  => "complete"
  | mostly    => "mostly"
  | partially => "partially"
  | stub      => "stub"

instance : ToString ProofProgress := ⟨toString⟩

/-- Parse from string -/
def fromString? (s : String) : Option ProofProgress :=
  match s with
  | "complete" => some complete
  | "mostly" => some mostly
  | "partially" => some partially
  | "stub" => some stub
  | _ => none

/-- JSON string representation -/
def toJsonString : ProofProgress → String
  | complete  => "complete"
  | mostly    => "mostly"
  | partially => "partially"
  | stub      => "stub"

end ProofProgress

/-- Definition progress level

Represents completion level of a definition (def/structure/inductive/abbrev/instance).

- `complete` - No sorry (enforced by compiler)
- `partially` - Partially complete (contains sorry)
-/
inductive DefProgress where
  | complete  : DefProgress
  | partially : DefProgress
  deriving DecidableEq, Inhabited, BEq, Hashable, Repr

namespace DefProgress

def toString : DefProgress → String
  | complete  => "complete"
  | partially => "partially"

instance : ToString DefProgress := ⟨toString⟩

/-- Parse from string -/
def fromString? (s : String) : Option DefProgress :=
  match s with
  | "complete" => some complete
  | "partially" => some partially
  | _ => none

/-- JSON string representation -/
def toJsonString : DefProgress → String
  | complete  => "complete"
  | partially => "partially"

end DefProgress

/-- Aggregated metadata structure

Metadata collected from the four attributes for a constant.
-/
structure ConstantMeta where
  /-- Statement confidence -/
  confidence : Option Confidence := none
  /-- Proof progress -/
  proofProgress : Option ProofProgress := none
  /-- Definition progress -/
  defProgress : Option DefProgress := none
  /-- Display name -/
  name : Option String := none
  /-- Summary -/
  summary : Option String := none
  /-- Paper reference (e.g. "Definition 1") -/
  paperRef : Option String := none
  /-- Main theorem flag -/
  isMainTheorem : Bool := false
  deriving Inhabited, Repr

/-- Check if an expression directly contains sorryAx (without following const references) -/
partial def exprHasSorry (e : Lean.Expr) : Bool :=
  match e with
  | .const name _ => name == ``sorryAx
  | .app fn arg => exprHasSorry fn || exprHasSorry arg
  | .lam _ ty body _ => exprHasSorry ty || exprHasSorry body
  | .forallE _ ty body _ => exprHasSorry ty || exprHasSorry body
  | .letE _ ty val body _ => exprHasSorry ty || exprHasSorry val || exprHasSorry body
  | .mdata _ e => exprHasSorry e
  | .proj _ _ e => exprHasSorry e
  | _ => false

/-- Check if ConstantInfo contains sorry -/
def constantHasSorry (ci : Lean.ConstantInfo) : Bool :=
  match ci with
  | .defnInfo di => exprHasSorry di.value
  | .thmInfo ti => exprHasSorry ti.value
  | .opaqueInfo oi => exprHasSorry oi.value
  | _ => false

/-- Check if a constant in the environment contains sorry -/
def hasSorry (env : Lean.Environment) (declName : Lean.Name) : Bool :=
  match env.find? declName with
  | some ci => constantHasSorry ci
  | none => false

end LeanAtlas.Metadata
