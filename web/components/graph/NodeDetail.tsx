"use client";

import { useState, useMemo, useEffect } from "react";
import type { CustomNodeData } from "@/lib/types";
import {
  CONFIDENCE_LABELS,
  PROOF_PROGRESS_LABELS,
  DEF_PROGRESS_LABELS,
} from "@/lib/constants";
import { useSourceCode } from "@/hooks/useSourceCode";
import {
  getTransitiveDependencies,
  getTransitiveDependents,
} from "@/lib/dependencies";
import { useTranslation } from "@/lib/i18n/LanguageContext";

/** 公理リスト項目: グラフ内ならクリック可能ボタン、グラフ外ならスパン */
function AxiomListItem({
  ax,
  isInGraph,
  onNodeClick,
}: {
  ax: string;
  isInGraph: boolean;
  onNodeClick: (nodeId: string) => void;
}) {
  const shortName = ax.split(".").pop() || ax;
  return (
    <li>
      {isInGraph ? (
        <button
          onClick={() => onNodeClick(ax)}
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline truncate block w-full text-left"
          title={ax}
        >
          {shortName}
        </button>
      ) : (
        <span
          className="text-sm text-[var(--panel-text)] truncate block"
          title={ax}
        >
          {shortName}
        </span>
      )}
    </li>
  );
}

/** ノードリンク項目: クリック可能なボタン */
function NodeLinkItem({
  nodeId,
  onNodeClick,
}: {
  nodeId: string;
  onNodeClick: (nodeId: string) => void;
}) {
  const shortName = nodeId.split(".").pop() || nodeId;
  return (
    <li>
      <button
        onClick={() => onNodeClick(nodeId)}
        className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline truncate block w-full text-left"
        title={nodeId}
      >
        {shortName}
      </button>
    </li>
  );
}

interface NodeDetailProps {
  node: CustomNodeData | null;
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
  filteredNodeIds: Set<string>;
  nodesMap: Map<string, CustomNodeData>;
  workspacePath: string;
  filePathPrefix: string;
  isHumanReviewTarget?: boolean;
  onApproveConfidence?: (
    nodeId: string,
    filePath: string,
    lineStart: number,
  ) => Promise<boolean>;
  isApproving?: boolean;
  approveError?: string | null;
}

export function NodeDetail({
  node,
  onClose,
  onNodeClick,
  filteredNodeIds,
  nodesMap,
  workspacePath,
  filePathPrefix,
  isHumanReviewTarget,
  onApproveConfidence,
  isApproving,
  approveError,
}: NodeDetailProps) {
  const { t } = useTranslation();
  const [isDepsExpanded, setIsDepsExpanded] = useState(true);
  const [isDependentsExpanded, setIsDependentsExpanded] = useState(true);
  const [isHiddenAxiomsExpanded, setIsHiddenAxiomsExpanded] = useState(false);
  const [confirmDialogNodeId, setConfirmDialogNodeId] = useState<string | null>(
    null,
  );

  // ソースコード表示状態
  const {
    isCodeExpanded,
    sourceCode,
    isLoading: isLoadingCode,
    error: codeError,
    nonCommentLines,
    toggleCode: handleToggleCode,
    reset: resetSourceCode,
  } = useSourceCode({
    filePath: node?.filePath ?? "",
    lineStart: node?.lineStart ?? null,
    lineEnd: node?.lineEnd ?? null,
    initialNonCommentLines: node?.nonCommentLines ?? null,
  });

  // ノードが変わったらソースコード表示をリセット
  useEffect(() => {
    resetSourceCode();
  }, [node?.id, resetSourceCode]);

  // フィルター済み依存関係
  const visibleDependencies = useMemo(() => {
    if (!node) return [];
    return node.dependencies.filter((id) => filteredNodeIds.has(id));
  }, [node, filteredNodeIds]);

  const visibleDependents = useMemo(() => {
    if (!node) return [];
    return node.dependents.filter((id) => filteredNodeIds.has(id));
  }, [node, filteredNodeIds]);

  // スコープ外の数
  const outOfScopeDependencies = node
    ? node.dependencies.length - visibleDependencies.length
    : 0;
  const outOfScopeDependents = node
    ? node.dependents.length - visibleDependents.length
    : 0;

  // スコープ内の全推移的依存関係
  const allTransitiveDeps = useMemo(() => {
    if (!node) return new Set<string>();
    const deps = getTransitiveDependencies(node.id, nodesMap, filteredNodeIds);
    deps.delete(node.id);
    return deps;
  }, [node, nodesMap, filteredNodeIds]);

  // スコープ内の全推移的被依存関係
  const allTransitiveDependents = useMemo(() => {
    if (!node) return new Set<string>();
    return getTransitiveDependents(node.id, nodesMap, filteredNodeIds);
  }, [node, nodesMap, filteredNodeIds]);

  if (!node) return null;

  const showConfirmDialog = confirmDialogNodeId === node.id;
  const hasLineInfo = node.lineStart !== null && node.lineEnd !== null;
  const axioms = node.meta.axioms ?? null;
  const hiddenAxioms = node.meta.axiomsHidden ?? null;

  return (
    <div
      className={`atlas-panel absolute right-4 top-4 max-h-[calc(100vh-8rem)] overflow-y-auto z-[60] transition-all duration-300 ease-in-out ${
        isCodeExpanded ? "w-[960px]" : "w-80"
      }`}
    >
      {/* ヘッダー */}
      <div className="atlas-panel-header sticky top-0 rounded-t-lg px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--panel-text)] truncate pr-2">
          {node.shortName}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--panel-text-faint)] hover:text-[var(--panel-text)] text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4">
        {/* 基本情報 */}
        <div>
          <h4 className="text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider mb-2">
            {t.nodeDetail.basicInfo}
          </h4>
          <dl className="space-y-1 text-sm">
            <div className="flex">
              <dt className="w-20 text-[var(--panel-text-muted)]">
                {t.nodeDetail.fullName}
              </dt>
              <dd className="flex-1 text-[var(--panel-text)] break-all font-mono text-xs">
                {node.id}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 text-[var(--panel-text-muted)]">
                {t.nodeDetail.kind}
              </dt>
              <dd className="flex-1 text-[var(--panel-text)]">
                {t.kinds[node.kind as keyof typeof t.kinds] || node.kind}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 text-[var(--panel-text-muted)]">
                {t.nodeDetail.file}
              </dt>
              <dd className="flex-1 text-[var(--panel-text)] break-all text-xs">
                {filePathPrefix
                  ? node.filePath.replace(
                      new RegExp(`^${filePathPrefix}/?`),
                      "",
                    )
                  : node.filePath}
              </dd>
            </div>
            {hasLineInfo && (
              <div className="flex">
                <dt className="w-20 text-[var(--panel-text-muted)]">
                  {t.nodeDetail.lineCount}
                </dt>
                <dd className="flex-1 text-[var(--panel-text)]">
                  {nonCommentLines !== null ? (
                    <>
                      {nonCommentLines}
                      {t.nodeDetail.lines}{" "}
                      <span className="text-[var(--panel-text-faint)] text-xs">
                        (L{node.lineStart}-{node.lineEnd})
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--panel-text-faint)]">
                      L{node.lineStart}-{node.lineEnd}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div className="flex">
              <dt className="w-20 text-[var(--panel-text-muted)]">
                {t.nodeDetail.review}
              </dt>
              <dd className="flex-1">
                {isHumanReviewTarget ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded bg-[var(--input-bg)] text-[var(--panel-text)] border border-[var(--input-border)]">
                    {t.nodeDetail.reviewTarget}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-[var(--input-bg)] text-[var(--panel-text-muted)] border border-[var(--input-border)]">
                    {t.nodeDetail.reviewNonTarget}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 text-[var(--panel-text-muted)]">
                {t.nodeDetail.sorry}
              </dt>
              <dd
                className={`flex-1 ${node.hasSorry ? "text-[var(--panel-text)] font-medium" : "text-[var(--panel-text)]"}`}
              >
                {node.hasSorry ? t.nodeDetail.sorryYes : t.nodeDetail.sorryNo}
              </dd>
            </div>
            {outOfScopeDependencies > 0 && (
              <div className="flex">
                <dt className="w-20 text-[var(--panel-text-muted)] text-xs">
                  {t.nodeDetail.outOfScope}
                </dt>
                <dd className="flex-1 text-[var(--panel-text-faint)] text-xs">
                  {t.nodeDetail.depNodes} {outOfScopeDependencies}
                </dd>
              </div>
            )}
            {outOfScopeDependents > 0 && (
              <div className="flex">
                <dt className="w-20 text-[var(--panel-text-muted)] text-xs">
                  {outOfScopeDependencies === 0 ? t.nodeDetail.outOfScope : ""}
                </dt>
                <dd className="flex-1 text-[var(--panel-text-faint)] text-xs">
                  {t.nodeDetail.dependentNodes} {outOfScopeDependents}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 実装を見るボタン */}
        {hasLineInfo && (
          <div>
            <div className="flex gap-2">
              <button
                onClick={handleToggleCode}
                disabled={isLoadingCode}
                className="flex-1 py-2 px-3 text-sm font-medium rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--panel-text)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingCode
                  ? t.nodeDetail.loading
                  : isCodeExpanded
                    ? t.nodeDetail.closeImpl
                    : t.nodeDetail.viewImpl}
              </button>
              {workspacePath && (
                <a
                  href={`vscode://file/${workspacePath}/${node.filePath}:${node.lineStart}`}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  VSCode
                </a>
              )}
            </div>

            {/* ソースコード表示エリア */}
            {isCodeExpanded && (
              <div className="mt-3">
                {codeError ? (
                  <div className="text-red-600 dark:text-red-400 text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    {codeError}
                  </div>
                ) : sourceCode ? (
                  <div
                    className="source-code-container text-sm rounded overflow-x-auto max-h-[32rem] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: sourceCode }}
                  />
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* メタデータ */}
        {(node.meta.name ||
          node.meta.confidence ||
          node.meta.proofProgress ||
          node.meta.defProgress) && (
          <div>
            <h4 className="text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider mb-2">
              {t.nodeDetail.metadata}
            </h4>
            <dl className="space-y-1 text-sm">
              {node.meta.name && (
                <div className="flex">
                  <dt className="w-20 text-[var(--panel-text-muted)]">
                    {t.nodeDetail.japaneseName}
                  </dt>
                  <dd className="flex-1 text-[var(--panel-text)]">
                    {node.meta.name}
                  </dd>
                </div>
              )}
              {node.meta.summary && (
                <div>
                  <dt className="text-[var(--panel-text-muted)] mb-1">
                    {t.nodeDetail.summary}
                  </dt>
                  <dd className="text-[var(--panel-text)] text-xs bg-[var(--input-bg)] p-2 rounded">
                    {node.meta.summary}
                  </dd>
                </div>
              )}
              {/* 確信度 */}
              {node.meta.confidence && (
                <div className="flex">
                  <dt className="w-20 text-[var(--panel-text-muted)]">
                    {t.nodeDetail.confidenceLabel}
                  </dt>
                  <dd
                    className={`flex-1 font-medium ${CONFIDENCE_LABELS[node.meta.confidence].color}`}
                  >
                    {t.confidenceLevels[node.meta.confidence]}
                  </dd>
                </div>
              )}
              {/* 検証承認ボタン */}
              {node.meta.confidence === "high" &&
                node.lineStart !== null &&
                onApproveConfidence && (
                  <div className="mt-1 mb-1">
                    {!showConfirmDialog ? (
                      <button
                        onClick={() => setConfirmDialogNodeId(node.id)}
                        disabled={isApproving}
                        className="w-full py-1.5 px-3 text-xs font-medium rounded-md border border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApproving
                          ? t.nodeDetail.approving
                          : t.nodeDetail.approveConfidence}
                      </button>
                    ) : (
                      <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                          {t.nodeDetail.approveConfirmMessage}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (node.lineStart !== null) {
                                onApproveConfidence(
                                  node.id,
                                  node.filePath,
                                  node.lineStart,
                                );
                              }
                            }}
                            disabled={isApproving}
                            className="flex-1 py-1 px-2 text-xs font-medium rounded border border-green-400 dark:border-green-600 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isApproving
                              ? t.nodeDetail.approving
                              : t.nodeDetail.approveConfirm}
                          </button>
                          <button
                            onClick={() => setConfirmDialogNodeId(null)}
                            disabled={isApproving}
                            className="flex-1 py-1 px-2 text-xs font-medium rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--panel-text)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
                          >
                            {t.nodeDetail.approveCancel}
                          </button>
                        </div>
                      </div>
                    )}
                    {approveError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {approveError}
                      </p>
                    )}
                  </div>
                )}
              {/* 証明進捗度（定理用） */}
              {node.kind === "theorem" && node.meta.proofProgress && (
                <div className="flex">
                  <dt className="w-20 text-[var(--panel-text-muted)]">
                    {t.nodeDetail.proofProgressLabel}
                  </dt>
                  <dd
                    className={`flex-1 font-medium ${PROOF_PROGRESS_LABELS[node.meta.proofProgress].color}`}
                  >
                    {t.proofProgressLevels[node.meta.proofProgress]}
                  </dd>
                </div>
              )}
              {/* 定義進捗度（定義用） */}
              {node.kind === "definition" && node.meta.defProgress && (
                <div className="flex">
                  <dt className="w-20 text-[var(--panel-text-muted)]">
                    {t.nodeDetail.defProgressLabel}
                  </dt>
                  <dd
                    className={`flex-1 font-medium ${DEF_PROGRESS_LABELS[node.meta.defProgress].color}`}
                  >
                    {t.defProgressLevels[node.meta.defProgress]}
                  </dd>
                </div>
              )}
              {node.meta.paperRef && (
                <div className="flex">
                  <dt className="w-20 text-[var(--panel-text-muted)]">
                    {t.nodeDetail.paperRef}
                  </dt>
                  <dd className="flex-1 text-[var(--panel-text)]">
                    {node.meta.paperRef}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* 依存公理（主定理のみ） */}
        {node.meta.isMainTheorem && (
          <div>
            <h4 className="text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider mb-2">
              {t.nodeDetail.dependentAxioms}
            </h4>
            {axioms === null ? (
              <p className="text-xs text-[var(--panel-text-faint)] italic">
                {t.nodeDetail.noAxiomInfo}
              </p>
            ) : (
              <>
                {axioms.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {axioms.map((ax) => (
                      <AxiomListItem
                        key={ax}
                        ax={ax}
                        isInGraph={nodesMap.has(ax)}
                        onNodeClick={onNodeClick}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--panel-text-faint)] italic">
                    {t.nodeDetail.noAxioms}
                  </p>
                )}

                {hiddenAxioms && hiddenAxioms.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() =>
                        setIsHiddenAxiomsExpanded(!isHiddenAxiomsExpanded)
                      }
                      className="flex items-center gap-1 text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider hover:text-[var(--panel-text)] w-full text-left"
                    >
                      <span
                        className={`transform transition-transform ${isHiddenAxiomsExpanded ? "rotate-90" : ""}`}
                      >
                        ▶
                      </span>
                      <span>
                        {t.nodeDetail.additionalAxioms} ({hiddenAxioms.length})
                      </span>
                    </button>
                    {isHiddenAxiomsExpanded && (
                      <ul className="space-y-1 max-h-24 overflow-y-auto mt-2">
                        {hiddenAxioms.map((ax) => (
                          <AxiomListItem
                            key={ax}
                            ax={ax}
                            isInGraph={nodesMap.has(ax)}
                            onNodeClick={onNodeClick}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 依存関係 */}
        {node.dependencies.length > 0 && (
          <div>
            <button
              onClick={() => setIsDepsExpanded(!isDepsExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider mb-2 hover:text-[var(--panel-text)] w-full text-left"
            >
              <span
                className={`transform transition-transform ${isDepsExpanded ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              <span>
                {t.nodeDetail.depNodes} ({visibleDependencies.length})
                {allTransitiveDeps.size > 0 && (
                  <span className="text-[var(--panel-text-faint)]">
                    {" "}
                    / {t.nodeDetail.depNodesAll}
                    {allTransitiveDeps.size}
                  </span>
                )}
              </span>
            </button>
            {isDepsExpanded && (
              <>
                {visibleDependencies.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {visibleDependencies.map((dep) => (
                      <NodeLinkItem
                        key={dep}
                        nodeId={dep}
                        onNodeClick={onNodeClick}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--panel-text-faint)] italic">
                    {t.nodeDetail.noMatchingNodes}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* 被依存関係 */}
        {node.dependents.length > 0 && (
          <div>
            <button
              onClick={() => setIsDependentsExpanded(!isDependentsExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--panel-text-muted)] uppercase tracking-wider mb-2 hover:text-[var(--panel-text)] w-full text-left"
            >
              <span
                className={`transform transition-transform ${isDependentsExpanded ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              <span>
                {t.nodeDetail.dependentNodes} ({visibleDependents.length})
                {allTransitiveDependents.size > 0 && (
                  <span className="text-[var(--panel-text-faint)]">
                    {" "}
                    / {t.nodeDetail.depNodesAll}
                    {allTransitiveDependents.size}
                  </span>
                )}
              </span>
            </button>
            {isDependentsExpanded && (
              <>
                {visibleDependents.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {visibleDependents.map((dep) => (
                      <NodeLinkItem
                        key={dep}
                        nodeId={dep}
                        onNodeClick={onNodeClick}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--panel-text-faint)] italic">
                    {t.nodeDetail.noMatchingNodes}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
