/-
Copyright (c) 2025 LeanAtlas Project
LeanAtlas.CLI.Banner - Gradient banner display
-/

namespace LeanAtlas.CLI.Banner

/-- RGB color -/
structure RGB where
  r : UInt8
  g : UInt8
  b : UInt8

/-- Linear interpolation between two UInt8 values using integer arithmetic.
    `t` is in range [0, 256] where 256 means fully `b`. -/
private def lerpChannel (a b : UInt8) (t : Nat) : UInt8 :=
  let a' := a.toNat
  let b' := b.toNat
  let result := (a' * (256 - t) + b' * t) / 256
  UInt8.ofNat result

/-- Interpolate between two RGB colors. `t` in [0, 256]. -/
private def lerpRGB (c1 c2 : RGB) (t : Nat) : RGB :=
  { r := lerpChannel c1.r c2.r t
    g := lerpChannel c1.g c2.g t
    b := lerpChannel c1.b c2.b t }

/-- Compute gradient color for a column position.
    Three-stop gradient: blue → purple → cyan -/
private def gradientColor (col maxCol : Nat) : RGB :=
  let blue   : RGB := ⟨80, 120, 255⟩
  let purple : RGB := ⟨180, 80, 255⟩
  let cyan   : RGB := ⟨80, 220, 255⟩
  if maxCol == 0 then blue
  else
    -- Map col to [0, 512] range (two segments of 256 each)
    let pos := col * 512 / maxCol
    if pos ≤ 256 then
      lerpRGB blue purple pos
    else
      lerpRGB purple cyan (pos - 256)

/-- Wrap a single character with ANSI true-color foreground escape -/
private def colorChar (c : Char) (color : RGB) : String :=
  s!"\x1b[38;2;{color.r.toNat};{color.g.toNat};{color.b.toNat}m{c}"

/-- Render text with gradient coloring (each character gets its own color) -/
private def renderGradientText (text : String) : String := Id.run do
  let chars := text.toList
  let maxCol := if chars.length > 1 then chars.length - 1 else 1
  let mut result := ""
  let mut i := 0
  for c in chars do
    if c == ' ' then
      result := result ++ " "
    else
      result := result ++ colorChar c (gradientColor i maxCol)
    i := i + 1
  return result ++ "\x1b[0m"

/-- Print the CLI banner -/
def printBanner : IO Unit := do
  let noColor ← IO.getEnv "NO_COLOR"
  let useColor := noColor.isNone
  let line1 := "  ◇ Lean Atlas v0.1.0"
  let line2 := "    by Nyx Foundation"
  if useColor then
    IO.println (renderGradientText line1)
    IO.println s!"\x1b[2m{line2}\x1b[0m"
  else
    IO.println line1
    IO.println line2
  IO.println ""

/-- Extract --quiet / -q flag from arguments.
    Returns (isQuiet, remainingArgs) -/
def extractQuietFlag (args : List String) : Bool × List String := Id.run do
  let mut quiet := false
  let mut remaining : List String := []
  for arg in args do
    if arg == "--quiet" || arg == "-q" then
      quiet := true
    else
      remaining := remaining ++ [arg]
  return (quiet, remaining)

end LeanAtlas.CLI.Banner
