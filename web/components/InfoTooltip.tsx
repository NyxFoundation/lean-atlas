"use client";

import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 4, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  }, []);

  return (
    <span
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help text-[var(--panel-text-faint)]">
        &#9432;
      </span>
      {show &&
        createPortal(
          <span
            className="fixed -translate-x-1/2 -translate-y-full w-max max-w-48 px-2 py-1 text-xs text-white bg-stone-800 dark:bg-[rgba(30,30,55,0.9)] dark:backdrop-blur-sm rounded shadow-lg pointer-events-none whitespace-pre-line"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
