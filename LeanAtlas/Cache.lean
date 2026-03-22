/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Cache - Cache freshness check for graph-data output
-/

import Lean

namespace LeanAtlas.Cache

open Lean System

def toolVersion : String := "0.1.0"

/-- Path to the cache manifest file for a given output file -/
def cacheManifestPath (outputPath : FilePath) : FilePath :=
  ⟨outputPath.toString ++ ".cache"⟩

/-- Recursively collect all .olean files under a directory -/
partial def collectOleanFiles (dir : FilePath) : IO (Array FilePath) := do
  let mut result : Array FilePath := #[]
  if !(← dir.pathExists) then
    return result
  let entries ← dir.readDir
  for entry in entries do
    if (← entry.path.isDir) then
      let sub ← collectOleanFiles entry.path
      result := result ++ sub
    else if entry.path.extension == some "olean" then
      result := result.push entry.path
  return result

/-- Get the maximum modification time (sec, nsec) among .olean files.
    Returns none if no .olean files exist. -/
def getMaxOleanMtime (oleanDir : FilePath) : IO (Option (Int × UInt32)) := do
  let files ← collectOleanFiles oleanDir
  if files.isEmpty then
    return none
  let mut maxSec : Int := 0
  let mut maxNsec : UInt32 := 0
  for f in files do
    let fileMeta ← f.metadata
    let mtime := fileMeta.modified
    if mtime.sec > maxSec || (mtime.sec == maxSec && mtime.nsec > maxNsec) then
      maxSec := mtime.sec
      maxNsec := mtime.nsec
  return some (maxSec, maxNsec)

/-- Cache manifest structure -/
structure CacheManifest where
  version : String
  configHash : UInt64
  maxMtimeSec : Int
  maxMtimeNsec : UInt32
  deriving Repr

/-- Serialize manifest to JSON string -/
def CacheManifest.toJsonString (m : CacheManifest) : String :=
  s!"\{\"version\":\"{m.version}\",\"configHash\":{m.configHash},\"maxMtimeSec\":{m.maxMtimeSec},\"maxMtimeNsec\":{m.maxMtimeNsec}}"

/-- Parse manifest from JSON string (simple parser) -/
def parseCacheManifest (content : String) : Option CacheManifest := do
  let json ← Lean.Json.parse content |>.toOption
  let version ← json.getObjValAs? String "version" |>.toOption
  let configHash ← json.getObjValAs? Nat "configHash" |>.toOption
  let maxMtimeSec ← json.getObjValAs? Int "maxMtimeSec" |>.toOption
  let maxMtimeNsec ← json.getObjValAs? Nat "maxMtimeNsec" |>.toOption
  return {
    version
    configHash := configHash.toUInt64
    maxMtimeSec
    maxMtimeNsec := maxMtimeNsec.toUInt32
  }

/-- Check if the cached output is still fresh.
    Returns true if the cache is valid and regeneration can be skipped.
    Uses early exit: returns false as soon as any olean file is newer than recorded. -/
def checkFreshness (outputPath : FilePath) (oleanDir : FilePath)
                   (configContent : String) : IO Bool := do
  -- Both output and manifest must exist
  if !(← outputPath.pathExists) then
    return false
  let manifestPath := cacheManifestPath outputPath
  if !(← manifestPath.pathExists) then
    return false
  -- Parse manifest
  let manifestContent ← IO.FS.readFile manifestPath
  let some manifest := parseCacheManifest manifestContent
    | return false
  -- Check tool version
  if manifest.version != toolVersion then
    return false
  -- Check config hash
  let currentHash := hash configContent
  if manifest.configHash != currentHash then
    return false
  -- Check olean mtime with early exit
  let files ← collectOleanFiles oleanDir
  for f in files do
    let fileMeta ← f.metadata
    let mtime := fileMeta.modified
    if mtime.sec > manifest.maxMtimeSec ||
       (mtime.sec == manifest.maxMtimeSec && mtime.nsec > manifest.maxMtimeNsec) then
      return false
  return true

/-- Write cache manifest after successful generation -/
def writeCacheManifest (outputPath : FilePath) (configContent : String)
                       (oleanDir : FilePath) : IO Unit := do
  let configHash := hash configContent
  let mtime ← getMaxOleanMtime oleanDir
  let (mtimeSec, mtimeNsec) := mtime.getD (0, 0)
  let manifest : CacheManifest := {
    version := toolVersion
    configHash
    maxMtimeSec := mtimeSec
    maxMtimeNsec := mtimeNsec
  }
  IO.FS.writeFile (cacheManifestPath outputPath) manifest.toJsonString

end LeanAtlas.Cache
