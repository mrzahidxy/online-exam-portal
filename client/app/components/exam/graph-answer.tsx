"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type GraphPoint = {
  x: number;
  y: number;
};

type GraphLine = {
  start: GraphPoint;
  end: GraphPoint;
};

export type GraphAnswerData = {
  version: 1;
  type: "graph";
  points: GraphPoint[];
  line: GraphLine | null;
};

type GraphAnswerProps = {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  className?: string;
};

const GRID_MIN = -10;
const GRID_MAX = 10;
const SVG_SIZE = 360;
const PADDING = 24;
const VIEW_SIZE = SVG_SIZE - PADDING * 2;

const DEFAULT_VALUE: GraphAnswerData = {
  version: 1,
  type: "graph",
  points: [],
  line: null,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundToHalf = (value: number) => Math.round(value * 2) / 2;

export const serializeGraphAnswer = (data: GraphAnswerData) =>
  JSON.stringify(data);

export const parseGraphAnswer = (value?: string | null): GraphAnswerData => {
  if (!value) return DEFAULT_VALUE;

  try {
    const parsed = JSON.parse(value) as Partial<GraphAnswerData>;
    if (parsed?.type !== "graph") return DEFAULT_VALUE;

    const points = Array.isArray(parsed.points)
      ? parsed.points
          .filter(
            (point): point is GraphPoint =>
              point !== null &&
              typeof point === "object" &&
              Number.isFinite((point as GraphPoint).x) &&
              Number.isFinite((point as GraphPoint).y)
          )
          .map((point) => ({
            x: clamp(roundToHalf(point.x), GRID_MIN, GRID_MAX),
            y: clamp(roundToHalf(point.y), GRID_MIN, GRID_MAX),
          }))
      : [];

    const line =
      parsed.line &&
      typeof parsed.line === "object" &&
      Number.isFinite(parsed.line.start?.x) &&
      Number.isFinite(parsed.line.start?.y) &&
      Number.isFinite(parsed.line.end?.x) &&
      Number.isFinite(parsed.line.end?.y)
        ? {
            start: {
              x: clamp(roundToHalf(parsed.line.start.x), GRID_MIN, GRID_MAX),
              y: clamp(roundToHalf(parsed.line.start.y), GRID_MIN, GRID_MAX),
            },
            end: {
              x: clamp(roundToHalf(parsed.line.end.x), GRID_MIN, GRID_MAX),
              y: clamp(roundToHalf(parsed.line.end.y), GRID_MIN, GRID_MAX),
            },
          }
        : null;

    return {
      version: 1,
      type: "graph",
      points,
      line,
    };
  } catch {
    return DEFAULT_VALUE;
  }
};

const graphToSvgPoint = (point: GraphPoint) => {
  const x = ((point.x - GRID_MIN) / (GRID_MAX - GRID_MIN)) * VIEW_SIZE + PADDING;
  const y =
    SVG_SIZE - (point.y - GRID_MIN) / (GRID_MAX - GRID_MIN) * VIEW_SIZE - PADDING;
  return { x, y };
};

const svgToGraphPoint = (x: number, y: number): GraphPoint => {
  const graphX = GRID_MIN + ((x - PADDING) / VIEW_SIZE) * (GRID_MAX - GRID_MIN);
  const graphY =
    GRID_MIN + ((SVG_SIZE - y - PADDING) / VIEW_SIZE) * (GRID_MAX - GRID_MIN);
  return {
    x: clamp(roundToHalf(graphX), GRID_MIN, GRID_MAX),
    y: clamp(roundToHalf(graphY), GRID_MIN, GRID_MAX),
  };
};

const GridLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] text-muted-foreground tabular-nums">{children}</span>
);

export function GraphAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
}: GraphAnswerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"point" | "line">("point");
  const [lineStartDraft, setLineStartDraft] = useState<GraphPoint | null>(null);

  const graph = useMemo(() => parseGraphAnswer(value), [value]);
  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    if (!graph.line) {
      setLineStartDraft(null);
    }
  }, [graph.line]);

  const emitChange = (next: GraphAnswerData) => {
    onChange?.(serializeGraphAnswer(next));
  };

  const addPoint = (point: GraphPoint) => {
    const next = {
      ...graph,
      points: [...graph.points, point],
    };
    emitChange(next);
  };

  const updateLine = (nextLine: GraphLine | null) => {
    const next = {
      ...graph,
      line: nextLine,
    };
    emitChange(next);
  };

  const handleSvgClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!canEdit) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const point = svgToGraphPoint(x, y);

    if (mode === "point") {
      addPoint(point);
      return;
    }

    if (!lineStartDraft) {
      setLineStartDraft(point);
      return;
    }

    updateLine({ start: lineStartDraft, end: point });
    setLineStartDraft(null);
  };

  const clearAll = () => {
    if (!canEdit) return;
    setLineStartDraft(null);
    emitChange(DEFAULT_VALUE);
  };

  const removeLastPoint = () => {
    if (!canEdit || graph.points.length === 0) return;
    emitChange({
      ...graph,
      points: graph.points.slice(0, -1),
    });
  };

  const axes = Array.from({ length: 21 }, (_, index) => GRID_MIN + index);
  const renderedPoints = graph.points.map((point, index) => {
    const svgPoint = graphToSvgPoint(point);
    return {
      index,
      x: point.x,
      y: point.y,
      svgX: svgPoint.x,
      svgY: svgPoint.y,
    };
  });

  const line = graph.line;
  const lineStart = line ? graphToSvgPoint(line.start) : null;
  const lineEnd = line ? graphToSvgPoint(line.end) : null;
  const draftPoint = lineStartDraft ? graphToSvgPoint(lineStartDraft) : null;

  return (
    <div className={className ?? "space-y-3"}>
      {!readonly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "point" ? "default" : "outline"}
            onClick={() => setMode("point")}
          >
            Plot Point
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "line" ? "default" : "outline"}
            onClick={() => setMode("line")}
          >
            Draw Line
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={removeLastPoint}>
            Undo Point
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearAll}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block rounded-lg border border-border bg-white shadow-sm">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className={`block h-[360px] w-[360px] ${canEdit ? "cursor-crosshair" : ""}`}
            onClick={handleSvgClick}
            role="img"
            aria-label="Graph plotting grid"
          >
            <defs>
              <pattern
                id="grid-small"
                width={VIEW_SIZE / 20}
                height={VIEW_SIZE / 20}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${VIEW_SIZE / 20} 0 L 0 0 0 ${VIEW_SIZE / 20}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
              <pattern
                id="grid-large"
                width={VIEW_SIZE / 4}
                height={VIEW_SIZE / 4}
                patternUnits="userSpaceOnUse"
              >
                <rect width={VIEW_SIZE / 4} height={VIEW_SIZE / 4} fill="url(#grid-small)" />
                <path
                  d={`M ${VIEW_SIZE / 4} 0 L 0 0 0 ${VIEW_SIZE / 4}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                />
              </pattern>
            </defs>

            <rect
              x={PADDING}
              y={PADDING}
              width={VIEW_SIZE}
              height={VIEW_SIZE}
              fill="url(#grid-large)"
            />

            {axes.map((value) => {
              const ratio = (value - GRID_MIN) / (GRID_MAX - GRID_MIN);
              const pos = PADDING + ratio * VIEW_SIZE;
              const isAxis = value === 0;
              return (
                <g key={value}>
                  <line
                    x1={pos}
                    y1={PADDING}
                    x2={pos}
                    y2={PADDING + VIEW_SIZE}
                    stroke={isAxis ? "#64748b" : "#e2e8f0"}
                    strokeWidth={isAxis ? 1.5 : 1}
                  />
                  <line
                    x1={PADDING}
                    y1={pos}
                    x2={PADDING + VIEW_SIZE}
                    y2={pos}
                    stroke={isAxis ? "#64748b" : "#e2e8f0"}
                    strokeWidth={isAxis ? 1.5 : 1}
                  />
                </g>
              );
            })}

            {lineStart && lineEnd && (
              <line
                x1={lineStart.x}
                y1={lineStart.y}
                x2={lineEnd.x}
                y2={lineEnd.y}
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}

            {renderedPoints.map((point) => (
              <g key={`${point.index}-${point.x}-${point.y}`}>
                <circle
                  cx={point.svgX}
                  cy={point.svgY}
                  r="5.5"
                  fill="#0f766e"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <text
                  x={point.svgX + 7}
                  y={point.svgY - 7}
                  fontSize="11"
                  fill="#0f172a"
                  className="select-none"
                >
                  ({point.x}, {point.y})
                </text>
              </g>
            ))}

            {!readonly && draftPoint && (
              <circle
                cx={draftPoint.x}
                cy={draftPoint.y}
                r="6"
                fill="#ef4444"
                opacity="0.9"
              />
            )}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <GridLabel>X: {GRID_MIN} to {GRID_MAX}</GridLabel>
        <GridLabel>Y: {GRID_MIN} to {GRID_MAX}</GridLabel>
        <GridLabel>Mode: {readonly ? "view only" : mode}</GridLabel>
        <GridLabel>Points: {graph.points.length}</GridLabel>
      </div>

      {graph.points.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Saved points: {graph.points.map((point) => `(${point.x}, ${point.y})`).join(", ")}
        </div>
      )}
    </div>
  );
}
