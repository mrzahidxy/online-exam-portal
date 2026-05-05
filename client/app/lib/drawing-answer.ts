export type DrawingTool =
  | "freehand"
  | "line"
  | "rectangle"
  | "circle"
  | "arrow"
  | "eraser";

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingBaseElement = {
  id: string;
  color: string;
  strokeWidth: number;
};

export type DrawingFreehandElement = DrawingBaseElement & {
  kind: "freehand";
  points: DrawingPoint[];
};

export type DrawingShapeKind = "line" | "rectangle" | "circle" | "arrow";

export type DrawingShapeElement = DrawingBaseElement & {
  kind: DrawingShapeKind;
  from: DrawingPoint;
  to: DrawingPoint;
};

export type DrawingElement = DrawingFreehandElement | DrawingShapeElement;

export type DrawingCanvas = {
  width: number;
  height: number;
};

export type DrawingAnswerData = {
  version: 1;
  type: "drawing";
  canvas: DrawingCanvas;
  elements: DrawingElement[];
};

type DrawingAnswerLike =
  | DrawingAnswerData
  | {
      version?: 1;
      type?: string;
      canvas?: Partial<DrawingCanvas>;
      elements?: unknown;
      strokes?: unknown;
    }
  | null
  | undefined;

export const DEFAULT_DRAWING_CANVAS: DrawingCanvas = {
  width: 720,
  height: 360,
};

const DEFAULT_COLOR = "#2563eb";
const DEFAULT_STROKE_WIDTH = 3;
const MAX_STROKE_WIDTH = 24;
const MIN_STROKE_WIDTH = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampPoint = (
  point: DrawingPoint,
  canvas: DrawingCanvas = DEFAULT_DRAWING_CANVAS
): DrawingPoint => ({
  x: clamp(Math.round(point.x), 0, canvas.width),
  y: clamp(Math.round(point.y), 0, canvas.height),
});

const normalizeCanvas = (
  canvas?: Partial<DrawingCanvas> | null
): DrawingCanvas => ({
  width: Number.isFinite(canvas?.width) ? Math.max(1, Math.round(Number(canvas?.width))) : DEFAULT_DRAWING_CANVAS.width,
  height: Number.isFinite(canvas?.height) ? Math.max(1, Math.round(Number(canvas?.height))) : DEFAULT_DRAWING_CANVAS.height,
});

const normalizeStrokeWidth = (value: unknown) => {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_STROKE_WIDTH;
  return clamp(Math.round(width), MIN_STROKE_WIDTH, MAX_STROKE_WIDTH);
};

const normalizeColor = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : DEFAULT_COLOR;

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isShapeKind = (kind: unknown): kind is DrawingShapeKind =>
  kind === "line" || kind === "rectangle" || kind === "circle" || kind === "arrow";

const isPoint = (value: unknown): value is DrawingPoint =>
  !!value &&
  typeof value === "object" &&
  Number.isFinite((value as DrawingPoint).x) &&
  Number.isFinite((value as DrawingPoint).y);

export const createDefaultDrawingAnswer = (): DrawingAnswerData => ({
  version: 1,
  type: "drawing",
  canvas: { ...DEFAULT_DRAWING_CANVAS },
  elements: [],
});

const normalizePoint = (
  point: unknown,
  canvas: DrawingCanvas = DEFAULT_DRAWING_CANVAS
): DrawingPoint | null => {
  if (!isPoint(point)) {
    return null;
  }

  return clampPoint(point, canvas);
};

const normalizeFreehandElement = (
  value: Record<string, unknown>,
  canvas: DrawingCanvas
): DrawingFreehandElement | null => {
  const points = Array.isArray(value.points)
    ? value.points.map((point) => normalizePoint(point, canvas)).filter(Boolean)
    : [];

  if (points.length < 2) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId("freehand"),
    kind: "freehand",
    color: normalizeColor(value.color),
    strokeWidth: normalizeStrokeWidth(value.strokeWidth),
    points: points as DrawingPoint[],
  };
};

const normalizeShapeElement = (
  value: Record<string, unknown>,
  canvas: DrawingCanvas
): DrawingShapeElement | null => {
  if (!isShapeKind(value.kind)) {
    return null;
  }

  const from = normalizePoint(value.from, canvas);
  const to = normalizePoint(value.to, canvas);

  if (!from || !to) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(value.kind),
    kind: value.kind,
    color: normalizeColor(value.color),
    strokeWidth: normalizeStrokeWidth(value.strokeWidth),
    from,
    to,
  };
};

const normalizeElement = (
  element: unknown,
  canvas: DrawingCanvas
): DrawingElement | null => {
  if (!element || typeof element !== "object") {
    return null;
  }

  const record = element as Record<string, unknown>;
  if (record.kind === "freehand") {
    return normalizeFreehandElement(record, canvas);
  }

  return normalizeShapeElement(record, canvas);
};

export const normalizeDrawingAnswer = (
  value?: DrawingAnswerLike
): DrawingAnswerData => {
  if (!value) {
    return createDefaultDrawingAnswer();
  }

  if ((value as { type?: unknown }).type !== "drawing") {
    return createDefaultDrawingAnswer();
  }

  const canvas = normalizeCanvas(value.canvas);
  const rawElements = Array.isArray(value.elements)
    ? value.elements
    : Array.isArray(value.strokes)
      ? value.strokes
      : [];

  const elements = rawElements
    .map((element) => normalizeElement(element, canvas))
    .filter(Boolean) as DrawingElement[];

  return {
    version: 1,
    type: "drawing",
    canvas,
    elements,
  };
};

export const serializeDrawingAnswer = (data: DrawingAnswerData) =>
  JSON.stringify(normalizeDrawingAnswer(data));

export const createDrawingElementId = (tool: DrawingTool) =>
  createId(tool);

export const normalizeDrawingTool = (tool: DrawingTool | null | undefined) =>
  tool === "freehand" ||
  tool === "line" ||
  tool === "rectangle" ||
  tool === "circle" ||
  tool === "arrow" ||
  tool === "eraser"
    ? tool
    : "freehand";

export const isDrawingShapeElement = (
  element: DrawingElement
): element is DrawingShapeElement => element.kind !== "freehand";

const distance = (a: DrawingPoint, b: DrawingPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const distanceToSegment = (
  point: DrawingPoint,
  start: DrawingPoint,
  end: DrawingPoint
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return distance(point, start);
  }

  const t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clampedT = clamp(t, 0, 1);
  return distance(point, {
    x: start.x + clampedT * dx,
    y: start.y + clampedT * dy,
  });
};

const rectFromPoints = (from: DrawingPoint, to: DrawingPoint) => ({
  x: Math.min(from.x, to.x),
  y: Math.min(from.y, to.y),
  width: Math.max(1, Math.abs(to.x - from.x)),
  height: Math.max(1, Math.abs(to.y - from.y)),
});

const circleFromPoints = (from: DrawingPoint, to: DrawingPoint) => {
  const rect = rectFromPoints(from, to);
  return {
    cx: rect.x + rect.width / 2,
    cy: rect.y + rect.height / 2,
    rx: rect.width / 2,
    ry: rect.height / 2,
  };
};

export const hitTestDrawingElement = (
  element: DrawingElement,
  point: DrawingPoint
) => {
  const tolerance = Math.max(6, element.strokeWidth / 2 + 3);

  if (element.kind === "freehand") {
    return element.points.some((segmentPoint, index) => {
      const nextPoint = element.points[index + 1];
      if (!nextPoint) return false;
      return distanceToSegment(point, segmentPoint, nextPoint) <= tolerance;
    });
  }

  if (element.kind === "line" || element.kind === "arrow") {
    return distanceToSegment(point, element.from, element.to) <= tolerance;
  }

  if (element.kind === "rectangle") {
    const rect = rectFromPoints(element.from, element.to);
    return (
      point.x >= rect.x - tolerance &&
      point.x <= rect.x + rect.width + tolerance &&
      point.y >= rect.y - tolerance &&
      point.y <= rect.y + rect.height + tolerance
    );
  }

  const circle = circleFromPoints(element.from, element.to);
  if (circle.rx <= 0 || circle.ry <= 0) {
    return false;
  }

  const normalized =
    ((point.x - circle.cx) ** 2) / (circle.rx + tolerance) ** 2 +
    ((point.y - circle.cy) ** 2) / (circle.ry + tolerance) ** 2;

  return normalized <= 1;
};

export const removeDrawingElementAtPoint = (
  elements: DrawingElement[],
  point: DrawingPoint
) => {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    if (hitTestDrawingElement(elements[index], point)) {
      return {
        removed: true,
        elements: [...elements.slice(0, index), ...elements.slice(index + 1)],
      };
    }
  }

  return { removed: false, elements };
};

export const toSvgPath = (points: DrawingPoint[]) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

export const toRect = (from: DrawingPoint, to: DrawingPoint) => rectFromPoints(from, to);
export const toCircle = (from: DrawingPoint, to: DrawingPoint) => circleFromPoints(from, to);
