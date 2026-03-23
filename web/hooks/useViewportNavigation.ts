"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

interface UseViewportNavigationResult {
  /**
   * Half-focus on a node position (move to the midpoint between the current viewport center and the node position).
   * @param nodeX X coordinate of the node center (in world coordinates)
   * @param nodeY Y coordinate of the node center (in world coordinates)
   */
  halfFocusOnNode: (nodeX: number, nodeY: number) => void;
}

/**
 * Hook that provides viewport navigation functionality
 */
export function useViewportNavigation(): UseViewportNavigationResult {
  const { setCenter, getZoom, getViewport } = useReactFlow();

  const halfFocusOnNode = useCallback(
    (nodeX: number, nodeY: number) => {
      const viewport = getViewport();
      const zoom = getZoom();

      // Convert viewport center to world coordinates
      const viewportCenterX =
        -viewport.x / zoom + window.innerWidth / (2 * zoom);
      const viewportCenterY =
        -viewport.y / zoom + window.innerHeight / (2 * zoom);

      // Midpoint
      const midX = (nodeX + viewportCenterX) / 2;
      const midY = (nodeY + viewportCenterY) / 2;

      setCenter(midX, midY, { zoom, duration: 300 });
    },
    [setCenter, getZoom, getViewport],
  );

  return {
    halfFocusOnNode,
  };
}
