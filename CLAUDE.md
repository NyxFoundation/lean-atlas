# CLAUDE.md

## Project Overview

lean-atlas は Lean 4 形式化プロジェクトの依存関係グラフとメタデータを可視化するツールチェーン。Lean 4 バックエンドが定理・定義の依存関係を解析し JSON を出力、Next.js フロントエンドがインタラクティブなグラフとして描画する。

## Development Commands

### Lean backend

```bash
lake build                    # Lean プロジェクトのビルド
lake exe atlas serve          # グラフデータ生成 + Web ビューア起動 (デフォルト)
lake exe atlas deps           # 依存関係グラフを DOT 形式で出力
lake exe atlas graph-data     # JSON グラフデータのエクスポート
```

### Frontend (web/)

```bash
cd web && pnpm install        # 依存関係のインストール
cd web && pnpm run dev        # 開発サーバー起動
cd web && pnpm run build      # プロダクションビルド
cd web && pnpm run lint       # ESLint 実行
cd web && pnpm run build:full # ソースコピー + ビルド
```

### Root

```bash
pnpm run format               # Prettier でフォーマット
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
├── Metadata/           # メタデータシステム
│   ├── Core.lean       # 型定義 (Confidence, ProofProgress, DefProgress, ConstantMeta)
│   ├── Attribute/      # 各属性の永続化 (persistent environment extension)
│   │   ├── Confidence.lean
│   │   ├── ProofProgress.lean
│   │   ├── DefProgress.lean
│   │   └── Meta.lean
│   ├── Extensions.lean # メタデータ集約 API (getConstantMeta, hasMetadata, hasSorry)
│   └── Linter.lean     # メタデータ関連 linter
├── Config/             # TOML 設定ファイルの読み込み (lean-atlas.toml)
│   ├── Types.lean
│   ├── Parse.lean
│   └── Load.lean
├── Deps/               # 依存関係解析
│   ├── Core.lean       # 直接/推移的依存関係の計算、type/value の区別
│   ├── Dot.lean        # DOT 形式出力
│   └── Main.lean
├── GraphData/          # JSON エクスポート
│   ├── Core.lean
│   ├── Json.lean
│   └── Main.lean
└── CLI/                # CLI エントリーポイント
    ├── Main.lean       # サブコマンドルーティング (serve/deps/graph-data)
    └── Serve.lean      # Web サーバー起動
```

### Frontend Structure (web/)

- **React Flow + Dagre** によるインタラクティブグラフ可視化
- **Composable filtering**: `useGraphFilters` hook で 12+ のフィルタ次元を独立に合成
- **Hooks ベース**: `useGraphData`, `useLayoutManager`, `useNodeHighlight` 等の独立 hook
- **i18n**: 日英対応 (`lib/i18n/`)
- **npm パッケージ**: `src/AtlasViewer.tsx` を外部向け API としてエクスポート

## Key Design Patterns

### Metadata: 3 Independent Axes

- **Confidence**: `perfect` / `high` / `medium` / `low` — 命題の信頼度
- **ProofProgress**: `complete` / `mostly` / `partially` / `stub` — 証明の完成度
- **DefProgress**: `complete` / `partially` — 定義の完成度

これらは独立に管理される。例: confidence=high だが proof=stub (信頼できる命題だがまだ証明未完了) という状態が有効。

### Dependency Analysis: type vs value

- **typeOnly**: 型（命題の statement）にのみ使用される依存
- **valueOnly**: 値（proof / implementation）にのみ使用される依存

### Persistent Environment Extension

各メタデータ属性は Lean の persistent environment extension として保存される。`Metadata/Extensions.lean` が集約 API を提供。

### Auto-generated Name Filtering

Lean コンパイラが生成する内部名 (`_private`, `match_` 等) を検出・フィルタリングし、ユーザー定義の定数のみを表示対象にする。

### Frontend Composable Filtering

`useGraphFilters` hook が全フィルタ状態を管理し、各フィルタは独立にトグル可能。AND 合成で組み合わせて適用される。`alwaysShowMainTheorems` フラグでメイン定理はフィルタをバイパスできる。

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
