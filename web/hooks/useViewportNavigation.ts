"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

interface UseViewportNavigationResult {
  /**
   * ノード位置を半分フォーカス（現在のビューポート中心とノード位置の中間点に移動）
   * @param nodeX ノード中心のX座標（ワールド座標系）
   * @param nodeY ノード中心のY座標（ワールド座標系）
   */
  halfFocusOnNode: (nodeX: number, nodeY: number) => void;
}

/**
 * ビューポートナビゲーションを提供するフック
 */
export function useViewportNavigation(): UseViewportNavigationResult {
  const { setCenter, getZoom, getViewport } = useReactFlow();

  const halfFocusOnNode = useCallback(
    (nodeX: number, nodeY: number) => {
      const viewport = getViewport();
      const zoom = getZoom();

      // ビューポート中央をワールド座標に変換
      const viewportCenterX =
        -viewport.x / zoom + window.innerWidth / (2 * zoom);
      const viewportCenterY =
        -viewport.y / zoom + window.innerHeight / (2 * zoom);

      // 中間点
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
