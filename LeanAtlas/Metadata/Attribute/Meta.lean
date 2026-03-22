/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - @[formalMeta] attribute

Declares metadata (display name, summary, paper reference, main theorem flag).
-/

import Lean.Elab.Command
import LeanAtlas.Metadata.Core

/-!
# @[formalMeta] attribute

Declares metadata for a definition/theorem.

## Usage

```lean
-- All parameters
@[formalMeta "Main Theorem" "Core proof" "Theorem 1" mainTheorem]
theorem main_theorem : ... := ...

-- Name and summary only
@[formalMeta "Layer function" "Computes vertex layer"]
def layer : ... := ...

-- Name, summary, paper reference
@[formalMeta "Layer" "Vertex layer" "Definition 3"]
def layer2 : ... := ...

-- With main theorem flag
@[formalMeta "Lemma" "Key lemma" mainTheorem]
theorem key_lemma : ... := ...
```
-/

open Lean Elab

namespace LeanAtlas.Metadata

/-- @[formalMeta] entry (stored in environment) -/
structure MetaEntry where
  /-- Name of the definition/theorem -/
  declName : Name
  /-- Display name -/
  name : Option String := none
  /-- Summary -/
  summary : Option String := none
  /-- Paper reference -/
  paperRef : Option String := none
  /-- Main theorem flag -/
  isMainTheorem : Bool := false
  deriving BEq, Hashable, Inhabited

/-- Persistent environment extension registration -/
initialize metaExt : SimplePersistentEnvExtension MetaEntry (Std.HashSet MetaEntry) ←
  registerSimplePersistentEnvExtension {
    addImportedFn := fun as => as.foldl Std.HashSet.insertMany {}
    addEntryFn := .insert
  }

/-- Helper to add an entry -/
def addMetaEntry {m : Type → Type} [MonadEnv m]
    (declName : Name) (metaName summary paperRef : Option String) (isMainTheorem : Bool) : m Unit :=
  modifyEnv (metaExt.addEntry · { declName, name := metaName, summary, paperRef, isMainTheorem })

/-- Get MetaEntry for a specific constant from the environment -/
def getMetaEntry (env : Environment) (declName : Name) : Option MetaEntry :=
  metaExt.getState env |>.toArray.find? (·.declName == declName)

/-- Get all MetaEntry from the environment -/
def getAllMetaEntries (env : Environment) : Array MetaEntry :=
  metaExt.getState env |>.toArray

/-- @[formalMeta ...] attribute syntax
    Usage:
    - @[formalMeta "name" "summary"]
    - @[formalMeta "name" "summary" "paperRef"]
    - @[formalMeta "name" "summary" mainTheorem]
    - @[formalMeta "name" "summary" "paperRef" mainTheorem]
-/
syntax (name := formal_meta_attr)
  "formalMeta" str str (str)? ("mainTheorem")? : attr

/-- Attribute handler registration -/
initialize Lean.registerBuiltinAttribute {
  name := `formal_meta_attr
  descr := "Mark a definition/theorem with metadata (name, summary, paper reference, main theorem flag)"
  add := fun declName stx _attrKind => do
    match stx with
    | `(attr| formalMeta $nameStr $summaryStr $[$refStr]? $[mainTheorem%$mainTk]?) =>
      let metaName := some nameStr.getString
      let summary := some summaryStr.getString
      let paperRef := refStr.map (·.getString)
      let isMainTheorem := mainTk.isSome
      addMetaEntry declName metaName summary paperRef isMainTheorem
    | _ => throwUnsupportedSyntax
}

end LeanAtlas.Metadata
