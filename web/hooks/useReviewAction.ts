"use client";

import { useState, useCallback } from "react";

interface ApproveParams {
  nodeId: string;
  filePath: string;
  lineStart: number;
}

interface UseReviewActionResult {
  approveConfidence: (params: ApproveParams) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useReviewAction(): UseReviewActionResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const approveConfidence = useCallback(
    async ({ nodeId, filePath, lineStart }: ApproveParams) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve_confidence",
            nodeId,
            filePath,
            lineStart,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Unknown error");
          return false;
        }

        return true;
      } catch {
        setError("Network error");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { approveConfidence, isSubmitting, error, clearError };
}
