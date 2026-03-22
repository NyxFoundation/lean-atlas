/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - Attribute check linters

Custom linters that warn when @[confidence], @[proof_progress], or @[def_progress]
attributes are missing from user-defined definitions/theorems.

Uses `set_option leanAtlas.projectNamespace "MyProject"` to scope to a project.
Falls back to the main module's namespace prefix if not set.

Individual linters can be disabled with:
  `set_option linter.confidenceCheck false`
  `set_option linter.proofProgressCheck false`
  `set_option linter.defProgressCheck false`
-/

import Lean
import Lean.DeclarationRange
import LeanAtlas.Metadata.Attribute.Confidence
import LeanAtlas.Metadata.Attribute.ProofProgress
import LeanAtlas.Metadata.Attribute.DefProgress
import LeanAtlas.Config.Types

namespace LeanAtlas.Metadata.Linter

open Lean Elab Command Linter

/-- Project namespace option for LeanAtlas linters.
    Set via `set_option leanAtlas.projectNamespace "MyProject"` -/
register_option leanAtlas.projectNamespace : String := {
  defValue := ""
  descr := "project namespace for LeanAtlas linters (e.g. 'MyProject')"
}

/-- Enable/disable confidence check linter -/
register_option linter.confidenceCheck : Bool := {
  defValue := true
  descr := "enable the confidence attribute check linter"
}

/-- Get the module name for a declaration -/
private def getModuleFor? (env : Environment) (declName : Name) : Option Name :=
  match env.getModuleIdxFor? declName with
  | some idx => env.header.moduleNames[idx.toNat]!
  | none =>
    if env.constants.map₂.contains declName then
      env.header.mainModule
    else
      none

/-- Check if a constant belongs to the project.
    Uses leanAtlas.projectNamespace if set, otherwise falls back to
    the main module's top-level namespace prefix. -/
private def isProjectConstant (env : Environment) (opts : Options) (n : Name) : Bool :=
  let nsStr := leanAtlas.projectNamespace.get opts
  let projectNs :=
    if nsStr.isEmpty then
      -- Fallback: use the first component of the main module name
      match env.header.mainModule with
      | .str .anonymous s => .mkSimple s
      | .str parent _ => match parent.components.head? with
        | some first => first
        | none => env.header.mainModule
      | other => other
    else
      LeanAtlas.Config.stringToName nsStr
  match getModuleFor? env n with
  | some modName => projectNs.isPrefixOf modName
  | none => false

/-- Check if a name is a structure field -/
private def isStructureField (env : Environment) (n : Name) : Bool :=
  isStructure env n.getPrefix

/-- Check if a constant is a definition or theorem -/
private def isDefinitionOrTheorem (env : Environment) (n : Name) : Bool :=
  match env.find? n with
  | some (.thmInfo _) => true
  | some (.defnInfo _) => true
  | some (.axiomInfo _) => true
  | some (.inductInfo _) => true
  | _ => false

/-- Check if a constant is a theorem -/
private def isTheorem (env : Environment) (n : Name) : Bool :=
  match env.find? n with
  | some (.thmInfo _) => true
  | _ => false

/-- Check if a constant is a definition (not theorem/axiom) -/
private def isDefinition (env : Environment) (n : Name) : Bool :=
  match env.find? n with
  | some (.defnInfo _) => true
  | some (.inductInfo _) => true
  | _ => false

/-- Get declaration names from a syntax position.
    Equivalent logic to Mathlib.Linter.getNamesFrom. -/
private def getNamesFrom {m : Type → Type} [Monad m] [MonadEnv m] [MonadFileMap m]
    (pos : String.Pos.Raw) : m (Array Syntax) := do
  let drs := declRangeExt.toPersistentEnvExtension.getState (asyncMode := .local) (← getEnv)
  let fm ← getFileMap
  let mut nms := #[]
  for (nm, rgs) in drs do
    if pos ≤ fm.ofPosition rgs.range.pos then
      let ofPos1 := fm.ofPosition rgs.selectionRange.pos
      let ofPos2 := fm.ofPosition rgs.selectionRange.endPos
      nms := nms.push (mkIdentFrom (.ofRange ⟨ofPos1, ofPos2⟩) nm)
  return nms

/-- @[confidence] attribute check linter -/
def confidenceCheckLinter : Linter where
  run := withSetOptionIn fun stx => do
    unless getLinterValue linter.confidenceCheck (← getLinterOptions) do return
    if (← get).messages.hasErrors then return
    unless stx.getKind == ``Lean.Parser.Command.declaration do return
    let env ← getEnv
    let opts ← getOptions
    for id in (← getNamesFrom (stx.getPos?.getD default)) do
      let declName := id.getId
      if declName.isInternal then continue
      if isStructureField env declName then continue
      unless isProjectConstant env opts declName do continue
      unless isDefinitionOrTheorem env declName do continue
      if (LeanAtlas.Metadata.getConfidence env declName).isSome then continue
      logLint linter.confidenceCheck id
        m!"missing @[confidence] attribute. \
          Add @[confidence low], @[confidence medium], @[confidence high], \
          or @[confidence perfect] to this declaration."

initialize addLinter confidenceCheckLinter

/-- Enable/disable proof_progress check linter -/
register_option linter.proofProgressCheck : Bool := {
  defValue := true
  descr := "enable the proof_progress attribute check linter for theorems"
}

/-- @[proof_progress] attribute check linter for theorems -/
def proofProgressCheckLinter : Linter where
  run := withSetOptionIn fun stx => do
    unless getLinterValue linter.proofProgressCheck (← getLinterOptions) do return
    if (← get).messages.hasErrors then return
    unless stx.getKind == ``Lean.Parser.Command.declaration do return
    let env ← getEnv
    let opts ← getOptions
    for id in (← getNamesFrom (stx.getPos?.getD default)) do
      let declName := id.getId
      if declName.isInternal then continue
      if isStructureField env declName then continue
      unless isProjectConstant env opts declName do continue
      unless isTheorem env declName do continue
      if (LeanAtlas.Metadata.getProofProgress env declName).isSome then continue
      logLint linter.proofProgressCheck id
        m!"missing @[proof_progress] attribute on theorem. \
          Add @[proof_progress complete], @[proof_progress mostly], \
          @[proof_progress partially], or @[proof_progress stub]."

initialize addLinter proofProgressCheckLinter

/-- Enable/disable def_progress check linter -/
register_option linter.defProgressCheck : Bool := {
  defValue := true
  descr := "enable the def_progress attribute check linter for definitions"
}

/-- @[def_progress] attribute check linter for definitions -/
def defProgressCheckLinter : Linter where
  run := withSetOptionIn fun stx => do
    unless getLinterValue linter.defProgressCheck (← getLinterOptions) do return
    if (← get).messages.hasErrors then return
    unless stx.getKind == ``Lean.Parser.Command.declaration do return
    let env ← getEnv
    let opts ← getOptions
    for id in (← getNamesFrom (stx.getPos?.getD default)) do
      let declName := id.getId
      if declName.isInternal then continue
      if isStructureField env declName then continue
      unless isProjectConstant env opts declName do continue
      unless isDefinition env declName do continue
      if (LeanAtlas.Metadata.getDefProgress env declName).isSome then continue
      logLint linter.defProgressCheck id
        m!"missing @[def_progress] attribute on definition. \
          Add @[def_progress complete] or @[def_progress partially]."

initialize addLinter defProgressCheckLinter

end LeanAtlas.Metadata.Linter
