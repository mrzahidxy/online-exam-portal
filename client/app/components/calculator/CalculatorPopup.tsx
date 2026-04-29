"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCalculator } from "./CalculatorContext";
import { ExpressionDisplay } from "./ExpressionDisplay";
import { MainTab } from "./MainTab";
import { ABCTab } from "./ABCTab";
import { FuncTab } from "./FuncTab";

type TabType = "main" | "abc" | "func";

export function CalculatorPopup() {
  const {
    isOpen,
    closeCalculator,
    angleMode,
    toggleAngleMode,
    position,
    setPosition,
  } = useCalculator();
  const [activeTab, setActiveTab] = useState<TabType>("main");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset to main tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("main");
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header area (not from buttons)
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest("button") || e.target.closest("[data-no-drag]"))
    ) {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!popupRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Get popup dimensions
      const rect = popupRef.current.getBoundingClientRect();

      // Clamp within viewport bounds
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, setPosition]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 z-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "720px",
        maxWidth: "calc(100vw - 40px)",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header - Draggable area */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        {/* Tabs */}
        <div className="flex items-center gap-6" data-no-drag>
          <button
            className={`pb-1 text-sm font-medium transition-colors ${
              activeTab === "main"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("main")}
          >
            main
          </button>
          <button
            className={`pb-1 text-sm font-medium transition-colors ${
              activeTab === "abc"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("abc")}
          >
            abc
          </button>
          <button
            className={`pb-1 text-sm font-medium transition-colors ${
              activeTab === "func"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("func")}
          >
            func
          </button>
        </div>

        {/* DEG/RAD toggle and close button */}
        <div className="flex items-center gap-3" data-no-drag>
          <div className="flex bg-gray-200 rounded overflow-hidden">
            <button
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                angleMode === "DEG"
                  ? "bg-blue-500 text-white"
                  : "bg-transparent text-gray-700 hover:bg-gray-300"
              }`}
              onClick={toggleAngleMode}
            >
              DEG
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                angleMode === "RAD"
                  ? "bg-blue-500 text-white"
                  : "bg-transparent text-gray-700 hover:bg-gray-300"
              }`}
              onClick={toggleAngleMode}
            >
              RAD
            </button>
          </div>
          <button
            onClick={closeCalculator}
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            title="Close calculator"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expression Display */}
      <ExpressionDisplay />

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg">
        {activeTab === "main" && <MainTab />}
        {activeTab === "abc" && <ABCTab />}
        {activeTab === "func" && <FuncTab />}
      </div>
    </div>
  );
}
