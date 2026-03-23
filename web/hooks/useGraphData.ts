"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { GraphData, CustomNodeData } from "@/lib/types";

interface UseGraphDataResult {
  data: GraphData | null;
  loading: boolean;
  error: string | null;
  nodesWithDependents: Map<string, CustomNodeData>;
  reload: () => void;
}

export function useGraphData(
  dataUrl: string = "/data/graph.json",
): UseGraphDataResult {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${dataUrl}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.status}`);
        }
        const json: GraphData = await response.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [reloadTrigger, dataUrl]);

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // Add reverse dependency information to nodes
  const nodesWithDependents = useMemo(() => {
    if (!data) return new Map<string, CustomNodeData>();

    const dependentsMap = new Map<string, string[]>();

    // Initialize
    data.nodes.forEach((node) => {
      dependentsMap.set(node.id, []);
    });

    // Build reverse dependency relationships from edges
    data.edges.forEach((edge) => {
      const dependents = dependentsMap.get(edge.target);
      if (dependents) {
        dependents.push(edge.source);
      }
    });

    // Build CustomNodeData
    const result = new Map<string, CustomNodeData>();
    data.nodes.forEach((node) => {
      result.set(node.id, {
        ...node,
        dependents: dependentsMap.get(node.id) || [],
      });
    });

    return result;
  }, [data]);

  return { data, loading, error, nodesWithDependents, reload };
}
