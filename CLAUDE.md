# CLAUDE.md

## Project Overview

lean-atlas is a toolchain for visualizing dependency graphs and metadata of Lean 4 formalization projects. The Lean 4 backend analyzes dependencies between theorems and definitions and outputs JSON, which the Next.js frontend renders as an interactive graph.

## Development Commands

### Lean backend

```bash
lake build                    # Build the Lean project
lake exe atlas serve          # Generate graph data + launch web viewer (default)
lake exe atlas deps           # Output dependency graph in DOT format
lake exe atlas graph-data     # Export JSON graph data
```

### Frontend (web/)

```bash
cd web && pnpm install        # Install dependencies
cd web && pnpm run dev        # Start development server
cd web && pnpm run build      # Production build
cd web && pnpm run lint       # Run ESLint
cd web && pnpm run build:full # Copy sources + build
```

### Root

```bash
pnpm run format               # Format with Prettier
```

## Architecture

### Data Flow

```
Lean 4 Backend (lake exe atlas graph-data)
    → JSON (web/public/data/graph.json)
        → Next.js Frontend (React Flow + Dagre)
```

### Lean Backend Module Structure

```
LeanAtlas/
├── Metadata/           # Metadata system
│   ├── Core.lean       # Type definitions (Confidence, ProofProgress, DefProgress, ConstantMeta)
│   ├── Attribute/      # Persistence for each attribute (persistent environment extension)
│   │   ├── Confidence.lean
│   │   ├── ProofProgress.lean
│   │   ├── DefProgress.lean
│   │   └── Meta.lean
│   ├── Extensions.lean # Metadata aggregation API (getConstantMeta, hasMetadata, hasSorry)
│   └── Linter.lean     # Metadata-related linter
├── Config/             # TOML config file loading (lean-atlas.toml)
│   ├── Types.lean
│   ├── Parse.lean
│   └── Load.lean
├── Deps/               # Dependency analysis
│   ├── Core.lean       # Direct/transitive dependency computation, type/value distinction
│   ├── Dot.lean        # DOT format output
│   └── Main.lean
├── GraphData/          # JSON export
│   ├── Core.lean
│   ├── Json.lean
│   └── Main.lean
└── CLI/                # CLI entry point
    ├── Main.lean       # Subcommand routing (serve/deps/graph-data)
    └── Serve.lean      # Web server startup
```

### Frontend Structure (web/)

- **React Flow + Dagre** for interactive graph visualization
- **Composable filtering**: `useGraphFilters` hook independently composes 12+ filter dimensions
- **Hooks-based**: Independent hooks such as `useGraphData`, `useLayoutManager`, `useNodeHighlight`
- **i18n**: Japanese and English support (`lib/i18n/`)
- **npm package**: Exports `src/AtlasViewer.tsx` as the public-facing API

## Key Design Patterns

### Metadata: 3 Independent Axes

- **Confidence**: `perfect` / `high` / `medium` / `low` — confidence level of a proposition
- **ProofProgress**: `complete` / `mostly` / `partially` / `stub` — proof completion status
- **DefProgress**: `complete` / `partially` — definition completion status

These are managed independently. For example, confidence=high with proof=stub (a trustworthy proposition whose proof is not yet complete) is a valid state.

### Dependency Analysis: type vs value

- **typeOnly**: Dependencies used only in types (proposition statements)
- **valueOnly**: Dependencies used only in values (proofs / implementations)

### Persistent Environment Extension

Each metadata attribute is stored as a Lean persistent environment extension. `Metadata/Extensions.lean` provides the aggregation API.

### Auto-generated Name Filtering

Detects and filters out compiler-generated internal names (`_private`, `match_`, etc.), showing only user-defined constants.

### Frontend Composable Filtering

The `useGraphFilters` hook manages all filter state, and each filter can be toggled independently. Filters are combined using AND composition. The `alwaysShowMainTheorems` flag allows main theorems to bypass filters.

## Configuration

- **Lean toolchain**: `leanprover/lean4:v4.24.0-rc1`
- **Lean options**: `relaxedAutoImplicit = false`, `pp.unicode.fun = true`
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, TypeScript strict mode
- **Graph visualization**: `@xyflow/react` 12.10, `dagre` 0.8.5
- **Syntax highlighting**: `shiki`

## CLI Options

```
atlas serve [--port PORT] [--no-generate] [--atlas-root PATH] [--config FILE]
atlas deps [--config FILE]
atlas graph-data [--output PATH] [--pretty] [--config FILE]
```
