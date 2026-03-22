/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Config.Lakefile - Auto-inference of project config from lakefile.toml / lakefile.lean
-/

import Lean
import LeanAtlas.Config.Types

namespace LeanAtlas.Config.Lakefile

open LeanAtlas.Config
open System

/-- Information extracted from a lakefile -/
structure LakefileInfo where
  packageName : String
  leanLibs : Array String
  defaultTargets : Array String
  deriving Repr

/-- Strip surrounding quotes from a TOML value -/
private def stripQuotes (s : String) : String :=
  let s := s.trimAscii.toString
  if s.length >= 2 && s.front == '\"' && s.back == '\"' then
    ((s.drop 1).dropEnd 1).toString
  else
    s

/-- Strip Lean guillemets: «Foo» → Foo -/
private def stripGuillemets (s : String) : String :=
  let s := s.trimAscii.toString
  if s.startsWith "«" && s.endsWith "»" then
    ((s.drop 1).dropEnd 1).toString
  else
    s

/-- Extract the first whitespace-delimited word -/
private def firstWord (s : String) : String :=
  match s.splitOn " " with
  | first :: _ => first
  | [] => s

/-- Parse a TOML inline string array like ["Lib1", "Lib2"] -/
private def parseStringArray (s : String) : Array String := Id.run do
  let s := s.trimAscii.toString
  if !s.startsWith "[" || !s.endsWith "]" then
    return #[]
  let inner := ((s.drop 1).dropEnd 1).toString
  if inner.trimAscii.toString |>.isEmpty then
    return #[]
  let parts := inner.splitOn ","
  let mut result : Array String := #[]
  for part in parts do
    let stripped := stripQuotes part
    if !stripped.isEmpty then
      result := result.push stripped
  return result

/-- Sections tracked during lakefile.toml parsing -/
private inductive Section where
  | topLevel
  | leanLib
  | other
  deriving BEq

/-- Parse lakefile.toml to extract lean_lib names and metadata -/
def parseLakefileToml (content : String) : Except String LakefileInfo := do
  let lines := content.splitOn "\n"
  let mut packageName := ""
  let mut leanLibs : Array String := #[]
  let mut defaultTargets : Array String := #[]
  let mut curSection := Section.topLevel
  let mut curLibName := ""

  for line in lines do
    let trimmed := line.trimAscii.toString
    if trimmed.isEmpty || trimmed.startsWith "#" then
      continue

    -- Array-of-tables: [[lean_lib]]
    if trimmed == "[[lean_lib]]" then
      if curSection == .leanLib && !curLibName.isEmpty then
        leanLibs := leanLibs.push curLibName
      curSection := .leanLib
      curLibName := ""
      continue
    -- Other array-of-tables or regular sections
    if trimmed.startsWith "[[" || trimmed.startsWith "[" then
      if curSection == .leanLib && !curLibName.isEmpty then
        leanLibs := leanLibs.push curLibName
      curSection := if trimmed.startsWith "[[" then .other else .other
      curLibName := ""
      continue

    -- Parse key = value
    let parts := trimmed.splitOn "="
    if parts.length < 2 then continue
    let key := parts.head!.trimAscii.toString
    let value := ("=".intercalate parts.tail!).trimAscii.toString

    match curSection with
    | .topLevel =>
      if key == "name" then
        packageName := stripQuotes value
      else if key == "defaultTargets" then
        defaultTargets := parseStringArray value
    | .leanLib =>
      if key == "name" then
        curLibName := stripQuotes value
    | .other => continue

  -- Save last lib if still in a lean_lib section
  if curSection == .leanLib && !curLibName.isEmpty then
    leanLibs := leanLibs.push curLibName

  if packageName.isEmpty then
    .error "lakefile.toml: top-level 'name' field not found"
  else
    .ok { packageName, leanLibs, defaultTargets }

/-- Parse lakefile.lean to extract lean_lib names (line-scanning heuristic) -/
def parseLakefileLean (content : String) : Except String LakefileInfo := do
  let lines := content.splitOn "\n"
  let mut packageName := ""
  let mut leanLibs : Array String := #[]
  let mut defaultTargets : Array String := #[]
  let mut nextIsDefault := false

  for line in lines do
    let trimmed := line.trimAscii.toString

    -- Skip empty lines and comments (preserve nextIsDefault across these)
    if trimmed.isEmpty || trimmed.startsWith "--" then
      continue

    -- Detect @[default_target] attribute
    if trimmed.startsWith "@[default_target]" then
      let rest := (trimmed.drop "@[default_target]".length).trimAscii.toString
      if rest.startsWith "lean_lib" then
        let nameRaw := (rest.drop "lean_lib".length).trimAscii.toString
        let name := stripGuillemets (firstWord nameRaw)
        if !name.isEmpty then
          leanLibs := leanLibs.push name
          defaultTargets := defaultTargets.push name
      else
        nextIsDefault := true
      continue

    -- Detect package declaration
    if trimmed.startsWith "package" && (trimmed.length == "package".length ||
        (trimmed.drop "package".length).toString.front == ' ') then
      let rest := (trimmed.drop "package".length).trimAscii.toString
      if !rest.isEmpty then
        packageName := stripGuillemets (firstWord rest)
      continue

    -- Detect lean_lib declaration
    if trimmed.startsWith "lean_lib" && (trimmed.length == "lean_lib".length ||
        (trimmed.drop "lean_lib".length).toString.front == ' ') then
      let rest := (trimmed.drop "lean_lib".length).trimAscii.toString
      if !rest.isEmpty then
        let name := stripGuillemets (firstWord rest)
        if !name.isEmpty then
          leanLibs := leanLibs.push name
          if nextIsDefault then
            defaultTargets := defaultTargets.push name
      nextIsDefault := false
      continue

    -- Reset default flag for non-attribute, non-comment lines
    if !trimmed.startsWith "@[" then
      nextIsDefault := false

  if packageName.isEmpty then
    .error "lakefile.lean: 'package' declaration not found"
  else
    .ok { packageName, leanLibs, defaultTargets }

/-- Check if a library name looks like a test/scratch library -/
private def isTestLike (name : String) : Bool :=
  name == "Test" || name == "Tests" || name == "Scratch" ||
  name.endsWith "Test" || name.endsWith "Tests" ||
  name.startsWith "Test" || name.startsWith "Scratch"

/-- Select the primary lean_lib from candidates.
    1. Single lib → use it
    2. Matches defaultTargets → use it
    3. Exclude test-like names → use remaining
    4. Filesystem check (Lib.lean or Lib/ exists) → use remaining
    5. Fallback → first lib -/
def selectPrimaryLib (info : LakefileInfo) : IO String := do
  if info.leanLibs.isEmpty then
    throw (IO.userError <|
      "No lean_lib found in lakefile. Please create a lean-atlas.toml with:\n" ++
      "  [project]\n" ++
      "  name = \"YourLibName\"\n" ++
      "  namespace = \"YourLibName\"")
  if info.leanLibs.size == 1 then
    return info.leanLibs[0]!
  -- Multiple libs: disambiguate
  let defaults := info.leanLibs.filter (info.defaultTargets.contains ·)
  if defaults.size == 1 then
    return defaults[0]!
  let nonTest := info.leanLibs.filter (!isTestLike ·)
  if nonTest.size == 1 then
    return nonTest[0]!
  -- Filesystem check
  let mut withFs : Array String := #[]
  for lib in info.leanLibs do
    let leanFile : FilePath := s!"{lib}.lean"
    let leanDir : FilePath := lib
    if (← leanFile.pathExists) || (← leanDir.pathExists) then
      withFs := withFs.push lib
  if withFs.size == 1 then
    return withFs[0]!
  -- Fallback: first lib
  return info.leanLibs[0]!

/-- Infer ProjectConfig from lakefile.toml or lakefile.lean.
    Returns (config, sourceContent) where sourceContent is the raw lakefile content
    used for cache hashing. -/
def inferConfig : IO (ProjectConfig × String) := do
  let tomlPath : FilePath := "lakefile.toml"
  let leanPath : FilePath := "lakefile.lean"

  let (info, sourceContent, sourceFile) ←
    if ← tomlPath.pathExists then
      let content ← IO.FS.readFile tomlPath
      match parseLakefileToml content with
      | .ok info => pure (info, content, "lakefile.toml")
      | .error msg => throw (IO.userError s!"Failed to parse lakefile.toml: {msg}")
    else if ← leanPath.pathExists then
      let content ← IO.FS.readFile leanPath
      match parseLakefileLean content with
      | .ok info => pure (info, content, "lakefile.lean")
      | .error msg => throw (IO.userError s!"Failed to parse lakefile.lean: {msg}")
    else
      throw (IO.userError <|
        "No configuration found.\n" ++
        "Expected one of:\n" ++
        "  - lean-atlas.toml (project config)\n" ++
        "  - lakefile.toml   (auto-detect)\n" ++
        "  - lakefile.lean   (auto-detect)")

  let libName ← selectPrimaryLib info
  IO.eprintln s!"info: lean-atlas.toml not found. Auto-detected from {sourceFile}: target=\"{libName}\", namespace=\"{libName}\""

  let config : ProjectConfig := {
    name := libName
    projectNamespace := stringToName libName
    atlasRoot := none
  }
  return (config, sourceContent)

end LeanAtlas.Config.Lakefile
