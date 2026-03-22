/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Metadata - Integrated data extraction API

API to retrieve aggregated metadata from the four attributes.
-/

import LeanAtlas.Metadata.Core
import LeanAtlas.Metadata.Attribute.Confidence
import LeanAtlas.Metadata.Attribute.ProofProgress
import LeanAtlas.Metadata.Attribute.DefProgress
import LeanAtlas.Metadata.Attribute.Meta

namespace LeanAtlas.Metadata

open Lean

/-- Get aggregated metadata for a specific constant from the environment -/
def getConstantMeta (env : Environment) (declName : Name) : ConstantMeta :=
  let confidence := getConfidence env declName
  let proofProgress := getProofProgress env declName
  let defProgress := getDefProgress env declName
  let metaEntry := getMetaEntry env declName
  {
    confidence := confidence
    proofProgress := proofProgress
    defProgress := defProgress
    name := metaEntry.bind (·.name)
    summary := metaEntry.bind (·.summary)
    paperRef := metaEntry.bind (·.paperRef)
    isMainTheorem := metaEntry.map (·.isMainTheorem) |>.getD false
  }

/-- Check if a constant has any metadata -/
def hasMetadata (env : Environment) (declName : Name) : Bool :=
  let m := getConstantMeta env declName
  m.confidence.isSome || m.proofProgress.isSome ||
  m.defProgress.isSome ||
  m.name.isSome || m.summary.isSome ||
  m.paperRef.isSome || m.isMainTheorem

end LeanAtlas.Metadata
