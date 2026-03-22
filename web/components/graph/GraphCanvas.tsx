"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useNodeHighlight } from "@/hooks/useNodeHighlight";
import { useViewportNavigation } from "@/hooks/useViewportNavigation";
import { useRelayout } from "@/hooks/useRelayout";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  Background,
  Controls,
  // MiniMap,
  useNodesState,
  useEdgesState,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CustomNode } from "./CustomNode";
import { NodeDetail } from "./NodeDetail";
import { GraphFilters } from "./GraphFilters";
import { StatisticsPanel } from "./StatisticsPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useGraphData } from "@/hooks/useGraphData";
import { useGraphFilters } from "@/hooks/useGraphFilters";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/components/ThemeProvider";
import { extractDirectories } from "@/lib/filters";
import { buildDisplayNodes, buildDisplayEdges } from "@/lib/graphBuilder";
import type { CustomNodeData } from "@/lib/types";
import { getReachableByEdgeFilter, getTransitiveDependencies } from "@/lib/dependencies";
import { calculateLineBoundaries } from "@/lib/lineSize";
import { calculateNodeStats, calculateFilterCounts } from "@/lib/statistics";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useReviewAction } from "@/hooks/useReviewAction";

const nodeTypes = {
  custom: CustomNode,
};

function GraphCanvasInner() {
  const { t } = useTranslation();
  const { data, loading, error, nodesWithDependents, reload } = useGraphData();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [selectedNode, setSelectedNode] = useState<CustomNodeData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterMinimized, setIsFilterMinimized] = useState(false);
  const requestedFitViewIdRef = useRef(0);
  const completedFitViewIdRef = useRef(0);
  const [queuedFitViewId, setQueuedFitViewId] = useState(0);
  const {
    settings,
    setLayoutDirection,
    setDefaultMainTheorem,
    setWorkspacePath,
    setFilePathPrefix,
  } = useSettings();
  const hasInitializedMainTheorem = useRef(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const requestFitView = useCallback(() => {
    requestedFitViewIdRef.current += 1;
  }, []);

  // 検証承認
  const {
    approveConfidence,
    isSubmitting: isApproving,
    error: approveError,
  } = useReviewAction();

  const handleApproveConfidence = useCallback(
    async (nodeId: string, filePath: string, lineStart: number) => {
      const success = await approveConfidence({ nodeId, filePath, lineStart });
      if (success) {
        // 楽観的に selectedNode を更新
        setSelectedNode((prev) => {
          if (!prev || prev.id !== nodeId) return prev;
          return {
            ...prev,
            meta: { ...prev.meta, confidence: "perfect" },
          };
        });
        reload();
      }
      return success;
    },
    [approveConfidence, reload],
  );

  // ハイライト管理
  const { highlightedNodeIds, computeHighlight, clearHighlight } =
    useNodeHighlight();

  // ビューポートナビゲーション
  const { halfFocusOnNode } = useViewportNavigation();

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsFilterMinimized((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ディレクトリリストを計算
  const directories = useMemo(() => {
    if (!data) return [];
    return extractDirectories(data.nodes.map((n) => n.filePath));
  }, [data]);

  const {
    filters,
    toggleKind,
    toggleConfidence,
    toggleDirectory,
    toggleSorryFilter,
    toggleLineSize,
    toggleSubKind,
    selectAllSubKinds,
    deselectAllSubKinds,
    setSearchQuery,
    setMainTheoremSink,
    setAlwaysShowMainTheorems,
    resetFilters,
    filterNodes,
    addDependencyFilterNode,
    removeDependencyFilterNode,
    setDependencyFilterMode,
    toggleDependencyFilter,
    clearDependencyFilter,
    toggleEdgeKind,
    toggleDefProgress,
    toggleProofProgress,
    setTypeReachableOnly,
  } = useGraphFilters(directories);

  // 行数フィルターの境界を計算
  const lineBoundaries = useMemo(() => {
    return calculateLineBoundaries(Array.from(nodesWithDependents.values()));
  }, [nodesWithDependents]);

  // 主要定理リストを計算（ソート済み）
  const mainTheorems = useMemo(() => {
    return Array.from(nodesWithDependents.values())
      .filter((n) => n.meta.isMainTheorem)
      .map((n) => ({
        id: n.id,
        shortName: n.shortName,
        paperRef: n.meta.paperRef,
        name: n.meta.name,
      }))
      .sort((a, b) => {
        const refA = a.paperRef || "";
        const refB = b.paperRef || "";
        const isTheoremA = refA.startsWith("Theorem");
        const isTheoremB = refB.startsWith("Theorem");
        if (isTheoremA && !isTheoremB) return -1;
        if (!isTheoremA && isTheoremB) return 1;
        const numA = parseInt(refA.match(/\d+/)?.[0] || "0");
        const numB = parseInt(refB.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });
  }, [nodesWithDependents]);

  // 初回マウント時に設定に基づいて初期選択
  useEffect(() => {
    if (mainTheorems.length > 0 && !hasInitializedMainTheorem.current) {
      hasInitializedMainTheorem.current = true;
      if (settings.defaultMainTheorem === "random") {
        const randomIndex = Math.floor(Math.random() * mainTheorems.length);
        setMainTheoremSink(mainTheorems[randomIndex].id);
      } else {
        const exists = mainTheorems.find(
          (t) => t.id === settings.defaultMainTheorem,
        );
        if (exists) {
          setMainTheoremSink(settings.defaultMainTheorem);
        } else {
          const randomIndex = Math.floor(Math.random() * mainTheorems.length);
          setMainTheoremSink(mainTheorems[randomIndex].id);
        }
      }
    }
  }, [mainTheorems, settings.defaultMainTheorem, setMainTheoremSink]);

  // 人間検証対象ノードID（常に計算 — 色分けに使用）
  const verificationTargetIds = useMemo(() => {
    if (!data) return null;

    let mainTheoremIds: string[];

    if (filters.mainTheoremSink) {
      // Sink 連動: sink の全依存グラフ内の mainTheorem を発見
      const sinkDeps = getTransitiveDependencies(
        filters.mainTheoremSink,
        nodesWithDependents,
      );
      mainTheoremIds = Array.from(nodesWithDependents.values())
        .filter((n) => n.meta.isMainTheorem && sinkDeps.has(n.id))
        .map((n) => n.id);
    } else {
      // Sink 未選択: 全 mainTheorem（現行動作）
      mainTheoremIds = Array.from(nodesWithDependents.values())
        .filter((n) => n.meta.isMainTheorem)
        .map((n) => n.id);
    }

    if (mainTheoremIds.length === 0) return null;

    return getReachableByEdgeFilter(mainTheoremIds, data.edges, (edge) => {
      return edge.kind !== "theorem_value_to_definition"
          && edge.kind !== "theorem_value_to_theorem";
    });
  }, [data, nodesWithDependents, filters.mainTheoremSink]);

  // フィルター用（チェックが入っている場合のみ非対象を非表示にする）
  const typeReachableNodeIds = filters.typeReachableOnly
    ? verificationTargetIds
    : null;

  // フィルター適用後のノード
  const filteredNodes = useMemo(() => {
    let nodes = filterNodes(nodesWithDependents, lineBoundaries);
    if (typeReachableNodeIds) {
      nodes = nodes.filter(
        (n) => n.kind === "axiom" || typeReachableNodeIds.has(n.id),
      );
    }
    return nodes;
  }, [filterNodes, nodesWithDependents, lineBoundaries, typeReachableNodeIds]);

  // フィルター済みノードIDセット
  const filteredNodeIds = useMemo(() => {
    return new Set(filteredNodes.map((n) => n.id));
  }, [filteredNodes]);

  // レイアウト管理フック
  const { nodePositions, updatePositions } = useLayoutManager({
    data,
    nodesWithDependents,
    mainTheoremSink: filters.mainTheoremSink,
    layoutDirection: settings.layoutDirection,
    requestFitView,
  });

  // フィルター適用（座標は維持、hidden で切り替え）
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!data) return { displayNodes: [], displayEdges: [] };

    const displayNodes = buildDisplayNodes({
      filteredNodes,
      nodePositions,
      layoutDirection: settings.layoutDirection,
      mainTheoremSink: filters.mainTheoremSink,
      highlightedNodeIds,
      selectedNodeId: selectedNode?.id ?? null,
      verificationTargetIds,
    });

    const displayEdges = buildDisplayEdges({
      edges: data.edges,
      filteredNodeIds,
      highlightedNodeIds,
      edgeKindFilter: filters.edgeKinds,
      theme: resolvedTheme,
    });

    return { displayNodes, displayEdges };
  }, [
    filteredNodes,
    nodePositions,
    filters.mainTheoremSink,
    filters.edgeKinds,
    data,
    filteredNodeIds,
    settings.layoutDirection,
    highlightedNodeIds,
    selectedNode,
    resolvedTheme,
    verificationTargetIds,
  ]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(displayNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(displayEdges);

  // 再レイアウト処理
  const { handleRelayout } = useRelayout({
    filteredNodes,
    filteredNodeIds,
    edges: data?.edges ?? [],
    mainTheoremSink: filters.mainTheoremSink,
    nodesWithDependents,
    layoutDirection: settings.layoutDirection,
    nodePositions,
    updatePositions,
    clearHighlight,
    requestFitView,
  });

  // ドラッグ完了時に座標を nodePositions に保存
  const handleNodesChange = useCallback(
    (changes: NodeChange<(typeof displayNodes)[number]>[]) => {
      onNodesChangeBase(changes);

      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position != null
        ) {
          const newPositions = new Map(nodePositions);
          newPositions.set(change.id, change.position);
          updatePositions(newPositions);
        }
      }
    },
    [onNodesChangeBase, nodePositions, updatePositions],
  );

  // displayNodes/displayEdges が変わったら更新
  useEffect(() => {
    setNodes(displayNodes);
    setEdges(displayEdges);

    const requestedFitViewId = requestedFitViewIdRef.current;
    if (requestedFitViewId !== queuedFitViewId) {
      setQueuedFitViewId(requestedFitViewId);
    }
  }, [displayNodes, displayEdges, queuedFitViewId, setNodes, setEdges]);

  useEffect(() => {
    if (
      queuedFitViewId === 0 ||
      queuedFitViewId === completedFitViewIdRef.current ||
      !nodesInitialized ||
      nodes.length === 0
    ) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      completedFitViewIdRef.current = queuedFitViewId;
      void fitView({ padding: 0.1, duration: 200, maxZoom: 1 });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [queuedFitViewId, nodes, nodesInitialized, fitView]);

  // パンクリックハンドラ
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsSettingsOpen(false);
    clearHighlight();
  }, [clearHighlight]);

  // ノードクリックハンドラ
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const nodeData = nodesWithDependents.get(node.id);
      setSelectedNode(nodeData || null);
      setIsSettingsOpen(false);

      if (nodeData) {
        computeHighlight(node.id, nodesWithDependents, filteredNodeIds);
      }

      if (node.position) {
        const nodeX = node.position.x + 100;
        const nodeY = node.position.y + 30;
        halfFocusOnNode(nodeX, nodeY);
      }
    },
    [nodesWithDependents, computeHighlight, filteredNodeIds, halfFocusOnNode],
  );

  // 詳細パネルからノードクリック
  const handleNodeClickFromDetail = useCallback(
    (nodeId: string) => {
      const nodeData = nodesWithDependents.get(nodeId);
      if (nodeData) {
        setSelectedNode(nodeData);
        computeHighlight(nodeId, nodesWithDependents, filteredNodeIds);

        const node = nodes.find((n) => n.id === nodeId);
        if (node?.position) {
          const nodeX = node.position.x + 100;
          const nodeY = node.position.y + 30;
          halfFocusOnNode(nodeX, nodeY);
        }
      }
    },
    [
      nodesWithDependents,
      nodes,
      computeHighlight,
      filteredNodeIds,
      halfFocusOnNode,
    ],
  );

  // 統計情報
  const statistics = useMemo(
    () => ({
      total: nodesWithDependents.size,
      filtered: filteredNodes.length,
    }),
    [nodesWithDependents, filteredNodes],
  );

  const filterCounts = useMemo(
    () => calculateFilterCounts(filteredNodes, lineBoundaries),
    [filteredNodes, lineBoundaries],
  );

  const displayStatistics = useMemo(
    () => ({
      total: calculateNodeStats(Array.from(nodesWithDependents.values())),
      filtered: calculateNodeStats(filteredNodes),
    }),
    [nodesWithDependents, filteredNodes],
  );

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[var(--panel-text-muted)]">
            {t.canvas.loadingGraph}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-[var(--panel-text)] mb-2">
            {t.canvas.error}
          </h2>
          <p className="text-[var(--panel-text-muted)] mb-4">{error}</p>
          <p className="text-sm text-[var(--panel-text-muted)]">
            <code className="bg-[var(--input-bg)] px-2 py-1 rounded">
              lake exe atlas graph-data --output
              path/to/web/public/data/graph.json
            </code>{" "}
            {t.canvas.runCommand}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          maxZoom: 1,
        }}
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "default",
        }}
      >
        <Background color={resolvedTheme === "dark" ? "#1a1a2e" : "#e8dcc8"} gap={16} />
        <Controls />
        {/* <MiniMap
          nodeColor={getMinimapNodeColor}
          maskColor={resolvedTheme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.1)"}
          className="!bg-white dark:!bg-gray-800 !border-slate-300 dark:!border-gray-700"
        /> */}

        <StatisticsPanel
          mainTheorems={mainTheorems}
          mainTheoremSink={filters.mainTheoremSink}
          onMainTheoremChange={setMainTheoremSink}
          stats={displayStatistics.filtered}
        />
      </ReactFlow>

      {/* 左側パネルコンテナ */}
      <div className="absolute left-4 top-4 z-50 flex flex-col gap-4">
        <GraphFilters
          filters={filters}
          directories={directories}
          isMinimized={isFilterMinimized}
          onToggleMinimized={() => setIsFilterMinimized((prev) => !prev)}
          onToggleKind={toggleKind}
          onToggleConfidence={toggleConfidence}
          onToggleDirectory={toggleDirectory}
          onToggleSorryFilter={toggleSorryFilter}
          onToggleLineSize={toggleLineSize}
          onToggleSubKind={toggleSubKind}
          onSelectAllSubKinds={selectAllSubKinds}
          onDeselectAllSubKinds={deselectAllSubKinds}
          onSetSearchQuery={setSearchQuery}
          onSetAlwaysShowMainTheorems={setAlwaysShowMainTheorems}
          onReset={resetFilters}
          onRelayout={handleRelayout}
          statistics={statistics}
          filterCounts={filterCounts}
          lineBoundaries={lineBoundaries}
          nodesMap={nodesWithDependents}
          onAddDependencyFilterNode={addDependencyFilterNode}
          onRemoveDependencyFilterNode={removeDependencyFilterNode}
          onSetDependencyFilterMode={setDependencyFilterMode}
          onToggleDependencyFilter={toggleDependencyFilter}
          onClearDependencyFilter={clearDependencyFilter}
          onToggleEdgeKind={toggleEdgeKind}
          onToggleProofProgress={toggleProofProgress}
          onToggleDefProgress={toggleDefProgress}
          onSetTypeReachableOnly={setTypeReachableOnly}
        />
      </div>

      <NodeDetail
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onNodeClick={handleNodeClickFromDetail}
        filteredNodeIds={filteredNodeIds}
        nodesMap={nodesWithDependents}
        workspacePath={settings.workspacePath}
        filePathPrefix={settings.filePathPrefix}
        isHumanReviewTarget={
          selectedNode
            ? typeReachableNodeIds === null
              ? true
              : selectedNode.kind === "axiom" ||
                typeReachableNodeIds.has(selectedNode.id)
            : undefined
        }
        onApproveConfidence={handleApproveConfidence}
        isApproving={isApproving}
        approveError={approveError}
      />

      <SettingsPanel
        theme={theme}
        onSetTheme={setTheme}
        layoutDirection={settings.layoutDirection}
        onSetLayoutDirection={setLayoutDirection}
        defaultMainTheorem={settings.defaultMainTheorem}
        onSetDefaultMainTheorem={setDefaultMainTheorem}
        mainTheorems={mainTheorems}
        isOpen={isSettingsOpen}
        onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        onClose={() => setIsSettingsOpen(false)}
        workspacePath={settings.workspacePath}
        onSetWorkspacePath={setWorkspacePath}
        filePathPrefix={settings.filePathPrefix}
        onSetFilePathPrefix={setFilePathPrefix}
        onReload={reload}
      />
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
