"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Circle,
  Eraser,
  Minus,
  PencilLine,
  Redo2,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createDefaultDrawingAnswer,
  createDrawingElementId,
  normalizeDrawingAnswer,
  normalizeDrawingTool,
  removeDrawingElementAtPoint,
  serializeDrawingAnswer,
  toCircle,
  toRect,
  toSvgPath,
  type DrawingAnswerData,
  type DrawingElement,
  type DrawingPoint,
  type DrawingTool,
} from "@/lib/drawing-answer";

type DrawingAnswerProps = {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  className?: string;
};

type DrawingDraft =
  | {
    kind: "freehand";
    points: DrawingPoint[];
  }
  | {
    kind: "line" | "rectangle" | "circle" | "arrow";
    from: DrawingPoint;
    to: DrawingPoint;
  };

const TOOL_OPTIONS: Array<{
  value: DrawingTool;
  label: string;
  icon: ReactNode;
}> = [
    {
      value: "freehand",
      label: "Freehand",
      icon: <PencilLine className="h-4 w-4" />,
    },
    { value: "line", label: "Line", icon: <Minus className="h-4 w-4" /> },
    {
      value: "rectangle",
      label: "Rectangle",
      icon: <Square className="h-4 w-4" />,
    },
    { value: "circle", label: "Circle", icon: <Circle className="h-4 w-4" /> },
    { value: "arrow", label: "Arrow", icon: <ArrowRight className="h-4 w-4" /> },
    { value: "eraser", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
  ];

const MIN_WIDTH = 1;
const MAX_WIDTH = 18;
const DEFAULT_STROKE_WIDTH = 3;
const DEFAULT_COLOR = "#2563eb";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createPoint = (x: number, y: number): DrawingPoint => ({ x, y });

const asNumber = (value: number) => Math.round(value);

const normalizePoint = (
  point: DrawingPoint,
  canvas: DrawingAnswerData["canvas"],
) => ({
  x: clamp(asNumber(point.x), 0, canvas.width),
  y: clamp(asNumber(point.y), 0, canvas.height),
});

const getCanvasPoint = (
  event: ReactPointerEvent<SVGSVGElement>,
  svg: SVGSVGElement,
  canvas: DrawingAnswerData["canvas"],
) => {
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return normalizePoint(createPoint(x, y), canvas);
};

const isShapeTool = (
  kind: DrawingTool,
): kind is "line" | "rectangle" | "circle" | "arrow" =>
  kind === "line" ||
  kind === "rectangle" ||
  kind === "circle" ||
  kind === "arrow";

const buildArrowHead = (
  from: DrawingPoint,
  to: DrawingPoint,
  strokeWidth: number,
) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(10, strokeWidth * 3);
  const wing = Math.PI / 7;

  const left = {
    x: to.x - size * Math.cos(angle - wing),
    y: to.y - size * Math.sin(angle - wing),
  };
  const right = {
    x: to.x - size * Math.cos(angle + wing),
    y: to.y - size * Math.sin(angle + wing),
  };

  return `${to.x},${to.y} ${left.x},${left.y} ${right.x},${right.y}`;
};

const renderElement = (element: DrawingElement) => {
  if (element.kind === "freehand") {
    return (
      <path
        d={toSvgPath(element.points)}
        fill="none"
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (element.kind === "line") {
    return (
      <line
        x1={element.from.x}
        y1={element.from.y}
        x2={element.to.x}
        y2={element.to.y}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  if (element.kind === "rectangle") {
    const rect = toRect(element.from, element.to);
    return (
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="none"
        stroke={element.color}
        strokeWidth={element.strokeWidth}
      />
    );
  }

  if (element.kind === "circle") {
    const circle = toCircle(element.from, element.to);
    return (
      <ellipse
        cx={circle.cx}
        cy={circle.cy}
        rx={circle.rx}
        ry={circle.ry}
        fill="none"
        stroke={element.color}
        strokeWidth={element.strokeWidth}
      />
    );
  }

  return (
    <g>
      <line
        x1={element.from.x}
        y1={element.from.y}
        x2={element.to.x}
        y2={element.to.y}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
      />
      <polygon
        points={buildArrowHead(element.from, element.to, element.strokeWidth)}
        fill={element.color}
      />
    </g>
  );
};

const renderDraft = (
  draft: DrawingDraft,
  color: string,
  strokeWidth: number,
) => {
  if (draft.kind === "freehand") {
    return (
      <path
        d={toSvgPath(draft.points)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 4"
        opacity="0.75"
      />
    );
  }

  if (draft.kind === "line") {
    return (
      <line
        x1={draft.from.x}
        y1={draft.from.y}
        x2={draft.to.x}
        y2={draft.to.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="6 4"
        opacity="0.75"
      />
    );
  }

  if (draft.kind === "rectangle") {
    const rect = toRect(draft.from, draft.to);
    return (
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        opacity="0.75"
      />
    );
  }

  if (draft.kind === "circle") {
    const circle = toCircle(draft.from, draft.to);
    return (
      <ellipse
        cx={circle.cx}
        cy={circle.cy}
        rx={circle.rx}
        ry={circle.ry}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        opacity="0.75"
      />
    );
  }

  return (
    <g opacity="0.75">
      <line
        x1={draft.from.x}
        y1={draft.from.y}
        x2={draft.to.x}
        y2={draft.to.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="6 4"
      />
      <polygon
        points={buildArrowHead(draft.from, draft.to, strokeWidth)}
        fill={color}
      />
    </g>
  );
};

export function DrawingAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
}: DrawingAnswerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const [drawing, setDrawing] = useState<DrawingAnswerData>(() => {
    if (!value) {
      return createDefaultDrawingAnswer();
    }

    try {
      return normalizeDrawingAnswer(JSON.parse(value));
    } catch {
      return createDefaultDrawingAnswer();
    }
  });
  const [tool, setTool] = useState<DrawingTool>("freehand");
  const [strokeColor, setStrokeColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [draft, setDraft] = useState<DrawingDraft | null>(null);
  const [past, setPast] = useState<DrawingElement[][]>([]);
  const [future, setFuture] = useState<DrawingElement[][]>([]);

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    if (value && value === lastEmittedRef.current) {
      return;
    }

    if (!value) {
      setDrawing(createDefaultDrawingAnswer());
      setDraft(null);
      setPast([]);
      setFuture([]);
      lastEmittedRef.current = null;
      return;
    }

    try {
      setDrawing(normalizeDrawingAnswer(JSON.parse(value)));
      setDraft(null);
      setPast([]);
      setFuture([]);
      lastEmittedRef.current = value;
    } catch {
      setDrawing(createDefaultDrawingAnswer());
      setDraft(null);
      setPast([]);
      setFuture([]);
      lastEmittedRef.current = null;
    }
  }, [value]);

  const emitChange = (next: DrawingAnswerData) => {
    const serialized = serializeDrawingAnswer(next);
    lastEmittedRef.current = serialized;
    onChange?.(serialized);
  };

  const commitElements = (nextElements: DrawingElement[]) => {
    const next = {
      ...drawing,
      elements: nextElements,
    };
    setPast((current) => [...current, drawing.elements].slice(-50));
    setFuture([]);
    setDrawing(next);
    emitChange(next);
  };

  const addFreehandPoint = (point: DrawingPoint) => {
    setDraft((current) => {
      if (!current || current.kind !== "freehand") return current;
      return {
        ...current,
        points: [...current.points, point],
      };
    });
  };

  const finishDraft = () => {
    if (!draft) return;

    if (draft.kind === "freehand") {
      if (draft.points.length < 2) {
        setDraft(null);
        return;
      }

      commitElements([
        ...drawing.elements,
        {
          id: createDrawingElementId("freehand"),
          kind: "freehand",
          color: strokeColor,
          strokeWidth,
          points: draft.points,
        },
      ]);
      setDraft(null);
      return;
    }

    commitElements([
      ...drawing.elements,
      {
        id: createDrawingElementId(draft.kind),
        kind: draft.kind,
        color: strokeColor,
        strokeWidth,
        from: draft.from,
        to: draft.to,
      },
    ]);
    setDraft(null);
  };

  const undo = () => {
    if (!canEdit || past.length === 0) return;
    const previous = past[past.length - 1];
    const currentElements = drawing.elements;
    const nextPast = past.slice(0, -1);
    setPast(nextPast);
    setFuture((current) => [currentElements, ...current].slice(0, 50));
    const next = { ...drawing, elements: previous };
    setDrawing(next);
    emitChange(next);
  };

  const redo = () => {
    if (!canEdit || future.length === 0) return;
    const [nextElements, ...rest] = future;
    setFuture(rest);
    setPast((current) => [...current, drawing.elements].slice(-50));
    const next = { ...drawing, elements: nextElements };
    setDrawing(next);
    emitChange(next);
  };

  const clearCanvas = () => {
    if (!canEdit) return;
    setDraft(null);
    commitElements([]);
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!canEdit || !svgRef.current) return;

    const currentTool = normalizeDrawingTool(tool);
    const point = getCanvasPoint(event, svgRef.current, drawing.canvas);
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (currentTool === "eraser") {
      const result = removeDrawingElementAtPoint(drawing.elements, point);
      if (result.removed) {
        commitElements(result.elements);
      }
      return;
    }

    if (currentTool === "freehand") {
      setDraft({ kind: "freehand", points: [point] });
      return;
    }

    if (isShapeTool(currentTool)) {
      setDraft({ kind: currentTool, from: point, to: point });
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!canEdit || !svgRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    if (!draft) return;

    const point = getCanvasPoint(event, svgRef.current, drawing.canvas);

    if (draft.kind === "freehand") {
      addFreehandPoint(point);
      return;
    }

    setDraft((current) => (current ? { ...current, to: point } : current));
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!canEdit) return;
    if (activePointerIdRef.current !== event.pointerId) return;

    activePointerIdRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures when the pointer capture has already been lost.
    }

    finishDraft();
  };

  const handlePointerCancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!canEdit) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    activePointerIdRef.current = null;
    setDraft(null);
  };

  const elementCount = drawing.elements.length;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const canvas = drawing.canvas;

  const renderedElements = useMemo(
    () => drawing.elements.map((element) => ({ element })),
    [drawing.elements],
  );

  return (
    <div className={className ?? "space-y-2"}>
      {!readonly && (
        <div className="w-full space-y-2 rounded-md border border-border bg-slate-50 p-2">
          <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-md border border-border bg-white p-1">
            {TOOL_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={tool === option.value ? "default" : "outline"}
                className="h-7 w-7 shrink-0 p-0"
                onClick={() => setTool(option.value)}
                title={option.label}
                aria-label={option.label}
              >
                {option.icon}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 shrink-0 p-0"
              onClick={undo}
              disabled={!canUndo}
              title="Undo"
              aria-label="Undo"
            >
              <Undo2 className="h-3 w-3 shrink-0" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 shrink-0 p-0"
              onClick={redo}
              disabled={!canRedo}
              title="Redo"
              aria-label="Redo"
            >
              <Redo2 className="h-3 w-3 shrink-0" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 shrink-0 p-0 text-red-600 hover:text-red-700"
              onClick={clearCanvas}
              title="Clear canvas"
              aria-label="Clear canvas"
            >
              <Trash2 className="h-3 w-3 shrink-0" />
            </Button>
            <div className="flex h-7 shrink-0 items-center gap-1 rounded border border-border bg-slate-50 px-1.5">
              <input
                type="color"
                value={strokeColor}
                onChange={(event) => setStrokeColor(event.target.value)}
                className="h-4 w-7 cursor-pointer rounded border border-border bg-white p-0"
                aria-label="Color picker"
                title="Color picker"
              />
            </div>
            <div className="flex h-7 shrink-0 items-center gap-1 rounded border border-border bg-slate-50 px-1.5">
              <input
                type="range"
                min={MIN_WIDTH}
                max={MAX_WIDTH}
                value={strokeWidth}
                onChange={(event) => setStrokeWidth(Number(event.target.value))}
                className="w-20"
                aria-label="Stroke width"
                title="Stroke width"
              />
              <span className="min-w-7 text-[10px] tabular-nums text-foreground">
                {strokeWidth}px
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-tight text-muted-foreground">
            Freehand, lines, rectangles, circles, and arrows are stored as JSON.
            Use eraser to remove the last hit element.
          </p>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border border-border bg-white shadow-sm">
        <div className="min-w-[720px]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvas.width} ${canvas.height}`}
            className={`block h-[360px] w-full ${canEdit ? "cursor-crosshair touch-none" : ""}`}
            role="img"
            aria-label="Drawing answer canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <defs>
              <pattern
                id="drawing-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect
              x="0"
              y="0"
              width={canvas.width}
              height={canvas.height}
              fill="#f8fafc"
            />
            <rect
              x="0"
              y="0"
              width={canvas.width}
              height={canvas.height}
              fill="url(#drawing-grid)"
            />

            {renderedElements.map(({ element }) => (
              <g key={element.id}>{renderElement(element)}</g>
            ))}

            {draft && renderDraft(draft, strokeColor, strokeWidth)}

            <rect
              x="0"
              y="0"
              width={canvas.width}
              height={canvas.height}
              fill="transparent"
              stroke="#e2e8f0"
            />
          </svg>
        </div>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>Elements: {elementCount}</div>
        <div>
          Canvas: {canvas.width} x {canvas.height}
        </div>
        <div>Mode: {readonly ? "view only" : tool}</div>
      </div>
    </div>
  );
}
