/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.Config - File loading, validation, and auto-inference fallback
-/

import LeanAtlas.Config.Types
import LeanAtlas.Config.Parse
import LeanAtlas.Config.Lakefile

namespace LeanAtlas.Config.Load

open LeanAtlas.Config

/-- Default config file path -/
def defaultConfigPath : String := "lean-atlas.toml"

/-- Extract --config path from CLI arguments.
    Returns (configPath, remainingArgs) -/
def extractConfigPath (args : List String) : String × List String := Id.run do
  let mut configPath := defaultConfigPath
  let mut remaining : List String := []
  let mut skipNext := false
  for i in [:args.length] do
    if skipNext then
      skipNext := false
      continue
    let arg := args[i]!
    if arg == "--config" && i + 1 < args.length then
      configPath := args[i + 1]!
      skipNext := true
    else
      remaining := remaining ++ [arg]
  return (configPath, remaining)

/-- Load and parse config with fallback to lakefile inference.
    Returns (config, sourceContent) where sourceContent is the raw content
    of the config source (lean-atlas.toml or lakefile) used for cache hashing.

    Fallback chain:
    1. If config file exists at path → parse lean-atlas.toml (backward compatible)
    2. If default path and file missing → infer from lakefile.toml / lakefile.lean
    3. Otherwise → error -/
def loadConfigWithContent (path : String) : IO (ProjectConfig × String) := do
  let configFile : System.FilePath := path
  if ← configFile.pathExists then
    let content ← IO.FS.readFile path
    match Parse.parseToml content with
    | .ok config => return (config, content)
    | .error msg => throw (IO.userError msg)
  else if path == defaultConfigPath then
    -- Default path not found: try auto-inference from lakefile
    Lakefile.inferConfig
  else
    throw (IO.userError s!"Config file not found: {path}")

/-- Load and parse lean-atlas.toml with fallback to lakefile inference -/
def loadConfig (path : String) : IO ProjectConfig := do
  let (config, _) ← loadConfigWithContent path
  return config

end LeanAtlas.Config.Load
