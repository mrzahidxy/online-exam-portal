"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalculator } from "./CalculatorContext";
import { useRef, useEffect } from "react";

export function ExpressionDisplay() {
  const {
    expression,
    resultDisplay,
    cursorPosition,
    moveCursorLeft,
    moveCursorRight,
  } = useCalculator();
  const displayRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep cursor visible
  useEffect(() => {
    if (displayRef.current) {
      const cursorElement = displayRef.current.querySelector("[data-cursor]");
      if (cursorElement) {
        cursorElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [cursorPosition]);

  // Split expression at cursor position for display
  const beforeCursor = expression.slice(0, cursorPosition);
  const afterCursor = expression.slice(cursorPosition);

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      {/* Input row - where user types */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
        <div
          ref={displayRef}
          className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300"
        >
          <div className="min-h-7 font-mono text-base text-gray-900 whitespace-nowrap inline-flex">
            <span>{beforeCursor}</span>
            <span
              data-cursor
              className="inline-block w-0.5 h-5 bg-blue-600 animate-pulse"
            />
            <span>{afterCursor}</span>
            {!expression && <span className="text-gray-400">\u00A0</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={moveCursorLeft}
            title="Move cursor left"
            disabled={cursorPosition === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={moveCursorRight}
            title="Move cursor right"
            disabled={cursorPosition === expression.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Result row - shows calculation result */}
      <div className="px-4 py-2">
        <div className="min-h-7 font-mono text-sm text-gray-600 whitespace-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
          {resultDisplay || "\u00A0"}
        </div>
      </div>
    </div>
  );
}
