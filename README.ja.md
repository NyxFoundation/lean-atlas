# Lean Atlas

**スケーラブルな人間-AI協調形式化のための統合証明環境**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Lean 4](https://img.shields.io/badge/Lean_4-v4.28.0-blue?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgMjJoMjBMMTIgMnoiLz48L3N2Zz4=)](https://lean-lang.org/)

[論文](https://arxiv.org/abs/2604.16347) | [デモ](https://lean-atlas.nyx.foundation/demo) | [English](README.md)

[Banri Yanahama](https://x.com/banr1_), [Akiyoshi Sannai](https://mlphys.scphys.kyoto-u.ac.jp/organization/member10/)

<p align="center">
  <img src="assets/teaser.png" alt="Lean Atlas Web Viewer" width="720">
  <br>
  <em>Brownian Motion プロジェクトの <code>IsBrownian_brownian</code> のレビューコーンを可視化。オレンジのノード（14個）が Lean Compass により自動抽出された意味検証対象（227ノードから93.8%削減）。</em>
</p>

## 概要

AI による自動形式化（autoformalization）は急速に進歩していますが、型チェッカーが保証するのは証明の論理的正しさのみであり、命題が意図した数学的内容を正しく表現しているかは検証しません。このギャップにより、型チェッカーを通過するが元の数学の意味を捉えていない **semantic hallucination（意味的幻覚）** が発生します。

**Lean Atlas** は Lean 4 プロジェクトの依存関係グラフをインタラクティブな Web ビューアとして可視化するツールです。各辺を **type dependency（型依存：命題/定義レベル）** と **value dependency（値依存：証明レベル）** に分類します。中核アルゴリズム **Lean Compass** は、指定した定理集合に対して証明レベルの依存を自動的に枝刈りし、その定理の意味的正しさに影響しうるノードだけを抽出します。プロジェクト構造に応じて 27〜99% のノード削減を達成します。

## 主な機能

- **インタラクティブな依存関係グラフ可視化** — 12以上の独立フィルタ軸、階層レイアウト、ソースコード参照を備えた Web ビューア
- **8種類の辺分類** — ソース種別（定理/定義）× 依存サイト（型/値）× ターゲット種別（定理/定義）の3軸で各辺を分類
- **Lean Compass** — 目標定理集合に対し、証明レベルの依存を枝刈りして意味的正しさに影響するノードを自動抽出
- **メタデータシステム** — Lean 4 カスタム属性で confidence（信頼度）、proof progress（証明進捗）、definition progress（定義進捗）を付与
- **ゼロコンフィグ対応** — `lean-atlas.toml` がなくても `lakefile.toml` / `lakefile.lean` からプロジェクト名と名前空間を自動検出
- **レビューワークフロー** — Web ビューアから直接 confidence を更新し、チーム全体の意味検証進捗を追跡

## アーキテクチャ

<p align="center">
  <img src="assets/architecture.png" alt="アーキテクチャ" width="720">
</p>

```
Lean 4 バックエンド (lake exe atlas graph-data)
    → JSON (web/public/data/graph.json)
        → Next.js フロントエンド (React Flow + Dagre)
```

Lean バックエンドが環境内の全定数を走査し、依存関係を分類して JSON として出力。Web フロントエンドがインタラクティブなフィルタ可能なグラフとして描画します。

## はじめに

### 前提条件

- [Lean 4](https://lean-lang.org/lean4/doc/setup.html)（v4.17.0 以上）
- [Node.js](https://nodejs.org/)（v18 以上）と [pnpm](https://pnpm.io/)

### インストール

`lakefile.toml` に lean-atlas を Lake dependency として追加します：

```toml
[[require]]
name = "lean-atlas"
scope = "NyxFoundation"
git = "https://github.com/NyxFoundation/lean-atlas"
rev = "main"
```

依存関係を取得します：

```bash
lake update lean-atlas
```

### メイン定理のマーク

Lean Atlas を実行する前に、レビュー対象の定理に `mainTheorem` フラグを付与してください。Lean Compass はこれらを起点としてレビューコーンを計算します。

```lean
import LeanAtlas

@[formalMeta "主要結果" "本プロジェクトの主定理" "定理 1.1" mainTheorem]
theorem my_main_theorem : ... := by ...
```

**メイン定理の選び方：**

- 形式化プロジェクトの最終的な成果（例：論文で述べられている定理）
- 意味的正しさを検証したい定理

`mainTheorem` が1つも存在しない場合、Lean Compass の解析はスキップされます。

### クイックスタート

プロジェクトのルートディレクトリで：

```bash
lake exe atlas
```

以下が自動的に実行されます：

1. 依存関係グラフを JSON として生成
2. Web 依存関係をインストール（必要に応じて）
3. `http://localhost:5326` でインタラクティブビューアを起動

ビューアを起動せずにグラフデータだけをエクスポートする場合：

```bash
lake exe atlas graph-data --output graph.json --pretty
```

## 設定

### lean-atlas.toml（オプション）

Lean の標準的な規約に従ったプロジェクトであれば、Lean Atlas は lakefile からプロジェクト名と名前空間を自動検出します。カスタム設定が必要な場合は、プロジェクトルートに `lean-atlas.toml` を作成してください：

```toml
[project]
name = "MyProject"
namespace = "MyProject"

[atlas]
root = ".lake/packages/lean-atlas"  # オプション; 自動検出されます
```

### メタデータ属性

Lean コードにメタデータを付与することで、より豊かな可視化が可能になります：

```lean
import LeanAtlas

-- 意味的正しさの信頼度
@[confidence perfect]  -- 人間の専門家が検証済み
theorem main_theorem : P := by ...

@[confidence high]     -- 高い信頼度
def key_definition : T := ...

-- 証明の進捗
@[proofProgress complete]   -- sorry なし
@[proofProgress mostly]     -- 小さなギャップのみ
@[proofProgress partially]  -- 大部分が完成
@[proofProgress stub]       -- スタブのみ

-- 定義の進捗
@[defProgress complete]
@[defProgress partially]

-- 詳細メタデータ（名前、要約、論文参照、メイン定理フラグ）
@[formalMeta "素数定理" "解析的手法によるPNT" "定理 1.1" mainTheorem]
@[confidence perfect]
theorem pnt : ... := by ...
```

## CLI リファレンス

```
lake exe atlas serve [OPTIONS]
    --port PORT          Web ビューアのポート（デフォルト: 5326）
    --no-generate        グラフデータ生成をスキップ
    --atlas-root PATH    lean-atlas のルートディレクトリ
    --config FILE        設定ファイル（デフォルト: lean-atlas.toml）

lake exe atlas graph-data [OPTIONS]
    --output PATH        出力ファイルパス（デフォルト: stdout）
    --pretty             JSON を整形出力
    --config FILE        設定ファイル（デフォルト: lean-atlas.toml）

lake exe atlas deps [OPTIONS]
    --config FILE        設定ファイル（デフォルト: lean-atlas.toml）
```

## Lean Compass

Lean Compass はレビューコーン計算の起点として、`mainTheorem` フラグ（`@[formalMeta ... mainTheorem]`）が付与された定理を少なくとも1つ必要とします。設定方法は[メイン定理のマーク](#メイン定理のマーク)を参照してください。

Lean Compass は重要な非対称性を利用します：**定理の証明**からの値依存は型チェッカーにより正しさが保証されるため枝刈りできますが、**定義の実装**からの値依存は型シグネチャを超える計算的内容を含む可能性があるため保持する必要があります。

<p align="center">
  <img src="assets/compass-comparison.png" alt="Lean Compass 比較" width="720">
  <br>
  <em>Lean Compass 適用前後の <code>IsBrownian_brownian</code>: 227ノード → 14ノード（93.8%削減）。</em>
</p>

### 評価結果

構造特性の異なる6つの Lean 4 プロジェクトで評価：

| プロジェクト           | 種別               | 平均削減率 |
| ---------------------- | ------------------ | ---------: |
| PrimeNumberTheoremAnd  | 証明中心           |      99.5% |
| Carleson               | 証明中心           |      96.2% |
| Brownian Motion        | 証明中心           |      94.4% |
| PhysLib                | 混合（物理学）     |      69.0% |
| FLT（6マイルストーン） | 混合               |      59.8% |
| XMSS Encoding Scheme   | 定義中心（暗号学） |      27.3% |

削減率の最良予測子はプロジェクトのラベルやサイズではなく、レビューコーン内の**定理/定義比率**です。証明中心のコーンでは 90% 以上の削減を達成し、定義中心のコーンでは定義が命題の意味に直接寄与するためより多くのノードが保持されます。

## 引用

研究で Lean Atlas を使用された場合は、以下の形で引用をお願いします：

```bibtex
@article{yanahama2026leanatlas,
  title={Lean Atlas: An Integrated Proof Environment for Scalable Human-AI Collaborative Formalization},
  author={Yanahama, Banri and Sannai, Akiyoshi},
  year={2026}
}
```

## コントリビュート

本プロジェクトは研究プロトタイプとして開発・保守しており、現時点では外部からのコントリビューションは積極的には受け付けていません。バグ報告やフィードバックは [Issues](https://github.com/NyxFoundation/lean-atlas/issues) にてお寄せください。

## ライセンス

[MIT](LICENSE)
