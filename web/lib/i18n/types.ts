export type Language = "ja" | "en";

export interface TranslationDict {
  // GraphFilters
  filters: {
    reset: string;
    nodesShowing: string; // "Showing {count} nodes"
    alwaysShowMainTheorems: string;
    humanReviewOnly: string;
    humanReviewTooltip: string;
    kind: string;
    theoremDetail: string;
    definitionDetail: string;
    selectAll: string;
    deselectAll: string;
    confidence: string;
    proofProgress: string;
    defProgress: string;
    sorryStatus: string;
    hasSorry: string;
    noSorry: string;
    lineCount: string;
    edgeKind: string;
    edgeLegendType: string;
    edgeLegendValue: string;
    advancedFilters: string;
    search: string;
    searchPlaceholder: string;
    directory: string;
    dependencyFilter: string;
    filterActive: string;
    dependencies: string;
    dependents: string;
    searchNodes: string;
    selected: string; // "Selected ({count})"
    clear: string;
    relayout: string;
  };
  // NodeDetail
  nodeDetail: {
    basicInfo: string;
    fullName: string;
    kind: string;
    file: string;
    lineCount: string; // "Line count"
    lines: string; // "lines"
    sorry: string;
    sorryYes: string;
    sorryNo: string;
    review: string;
    reviewTarget: string;
    reviewNonTarget: string;
    outOfScope: string;
    depNodes: string; // "Dependencies ({count})"
    depNodesAll: string; // "All {count}"
    dependentNodes: string; // "Dependents ({count})"
    noMatchingNodes: string;
    viewImpl: string;
    closeImpl: string;
    loading: string;
    metadata: string;
    japaneseName: string;
    summary: string;
    confidenceLabel: string;
    proofProgressLabel: string;
    defProgressLabel: string;
    paperRef: string;
    dependentAxioms: string;
    noAxiomInfo: string;
    noAxioms: string;
    additionalAxioms: string;
    approveConfidence: string;
    approveConfirmMessage: string;
    approveConfirm: string;
    approveCancel: string;
    approving: string;
    approveErrorGeneric: string;
  };
  // StatisticsPanel
  stats: {
    nodes: string;
    theorems: string;
    definitions: string;
    axioms: string;
    highOrAbove: string;
    perfect: string;
    proofComplete: string;
  };
  // SettingsPanel
  settings: {
    title: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    layoutDirection: string;
    layoutDirectionTooltip: string;
    dependentsOnTop: string;
    dependenciesOnTop: string;
    defaultMainTheorem: string;
    defaultMainTheoremTooltip: string;
    random: string;
    workspacePath: string;
    workspacePathTooltip: string;
    workspacePathPlaceholder: string;
    filePathPrefix: string;
    filePathPrefixTooltip: string;
    filePathPrefixPlaceholder: string;
    language: string;
    reloadData: string;
    openSettings: string;
  };
  // GraphCanvas
  canvas: {
    loadingGraph: string;
    error: string;
    errorMessage: string; // placeholder for dynamic error
    runCommand: string;
  };
  // CustomNode badges
  node: {
    thm: string;
    def: string;
    ax: string;
    sink: string;
    main: string;
  };
  // Kind labels
  kinds: {
    theorem: string;
    definition: string;
    axiom: string;
  };
  // Confidence labels
  confidenceLevels: {
    perfect: string;
    high: string;
    medium: string;
    low: string;
  };
  // Proof progress labels
  proofProgressLevels: {
    complete: string;
    mostly: string;
    partially: string;
    stub: string;
  };
  // Def progress labels
  defProgressLevels: {
    complete: string;
    partially: string;
  };
  // Edge kind labels
  edgeKinds: {
    type: string;
    value: string;
  };
  // SubKind labels
  subKinds: {
    theorem_manual: string;
    theorem_auto: string;
    definition: string;
    inductive: string;
    structure: string;
    abbrev: string;
  };
  // Line size labels (template: "{label} ({range})")
  lineSizes: {
    small: string;
    medium: string;
    large: string;
  };
}
