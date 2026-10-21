"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Redo2, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createDefaultImageCompositionAnswer,
  moveImageCompositionPlacementByDelta,
  normalizeImageCompositionAnswer,
  parseImageCompositionAnswer,
  resolveImageCompositionElements,
  serializeImageCompositionAnswer,
  type ImageCompositionAnswerData,
  type ResolvedImageCompositionElement,
} from "@/lib/image-composition-answer";
import type { ImageCompositionTemplate } from "@/lib/image-composition-template";

type ImageCompositionAnswerProps = {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  className?: string;
  template?: ImageCompositionTemplate | null;
};

type Interaction = {
  assetId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getNormalizedTemplate = (template?: ImageCompositionTemplate | null) =>
  template ?? null;

export function ImageCompositionAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
  template,
}: ImageCompositionAnswerProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const dragStartAnswerRef = useRef<ImageCompositionAnswerData | null>(null);
  const undoStackRef = useRef<ImageCompositionAnswerData[]>([]);
  const redoStackRef = useRef<ImageCompositionAnswerData[]>([]);
  const pendingAnswerRef = useRef<ImageCompositionAnswerData | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const templateRef = useRef<ImageCompositionTemplate | null>(
    getNormalizedTemplate(template)
  );
  const answerRef = useRef<ImageCompositionAnswerData>(
    parseImageCompositionAnswer(value, template ?? undefined)
  );
  const [answer, setAnswer] = useState<ImageCompositionAnswerData>(() =>
    parseImageCompositionAnswer(value, template ?? undefined)
  );
  const [, forceHistoryRender] = useState(0);

  const normalizedTemplate = useMemo(
    () => getNormalizedTemplate(template),
    [template]
  );

  const renderedElements = useMemo(
    () => resolveImageCompositionElements(normalizedTemplate, answer),
    [normalizedTemplate, answer]
  );

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    templateRef.current = normalizedTemplate;
    const next = parseImageCompositionAnswer(value, normalizedTemplate);
    answerRef.current = next;
    setAnswer(next);
    pendingAnswerRef.current = null;
    dragStartAnswerRef.current = null;
    interactionRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [normalizedTemplate, value]);

  useEffect(() => {
    if (value && value === lastEmittedRef.current) {
      return;
    }

    const next = parseImageCompositionAnswer(value, templateRef.current);
    answerRef.current = next;
    setAnswer(next);
    pendingAnswerRef.current = null;
    dragStartAnswerRef.current = null;
    interactionRef.current = null;
    lastEmittedRef.current = value ?? null;
  }, [value]);

  const commitChange = (next: ImageCompositionAnswerData) => {
    const normalized = normalizeImageCompositionAnswer(next, templateRef.current);
    const serialized = serializeImageCompositionAnswer(
      normalized,
      templateRef.current
    );
    lastEmittedRef.current = serialized;
    answerRef.current = normalized;
    setAnswer(normalized);
    onChange?.(serialized);
  };

  const scheduleDraftChange = (next: ImageCompositionAnswerData) => {
    const normalized = normalizeImageCompositionAnswer(next, templateRef.current);
    answerRef.current = normalized;
    pendingAnswerRef.current = normalized;

    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      if (pendingAnswerRef.current) {
        setAnswer(pendingAnswerRef.current);
      }
    });
  };

  const pushUndoSnapshot = (snapshot: ImageCompositionAnswerData) => {
    undoStackRef.current = [...undoStackRef.current, snapshot];
    redoStackRef.current = [];
    forceHistoryRender((value) => value + 1);
  };

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;

    redoStackRef.current = [...redoStackRef.current, answerRef.current];
    commitChange(previous);
    forceHistoryRender((value) => value + 1);
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;

    undoStackRef.current = [...undoStackRef.current, answerRef.current];
    commitChange(next);
    forceHistoryRender((value) => value + 1);
  };

  const clearBoard = () => {
    if (!canEdit) return;
    pushUndoSnapshot(answerRef.current);
    commitChange(createDefaultImageCompositionAnswer(templateRef.current));
  };

  const getCanvasMetrics = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    return {
      width: answer.canvas.width,
      height: answer.canvas.height,
      rect,
    };
  };

  const getPointFromClient = (clientX: number, clientY: number) => {
    const metrics = getCanvasMetrics();
    if (!metrics) return null;

    const x =
      ((clientX - metrics.rect.left) / metrics.rect.width) * metrics.width;
    const y =
      ((clientY - metrics.rect.top) / metrics.rect.height) * metrics.height;

    return {
      x: clamp(Math.round(x), 0, metrics.width),
      y: clamp(Math.round(y), 0, metrics.height),
      width: metrics.width,
      height: metrics.height,
    };
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId || !canEdit) {
        return;
      }

      const point = getPointFromClient(event.clientX, event.clientY);
      if (!point) return;

      const currentAnswer = answerRef.current;
      const nextPlacements = moveImageCompositionPlacementByDelta(
        currentAnswer.placements,
        interaction.assetId,
        {
          x: point.x - interaction.offsetX,
          y: point.y - interaction.offsetY,
        },
        currentAnswer.canvas
      );

      scheduleDraftChange({
        ...currentAnswer,
        placements: nextPlacements,
      });
    };

    const handleUp = (event: PointerEvent) => {
      if (interactionRef.current?.pointerId !== event.pointerId) return;

      if (dragStartAnswerRef.current) {
        const before = dragStartAnswerRef.current;
        const after = answerRef.current;
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          pushUndoSnapshot(before);
        }
      }

      if (pendingAnswerRef.current) {
        commitChange(pendingAnswerRef.current);
        pendingAnswerRef.current = null;
      }

      dragStartAnswerRef.current = null;
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [canEdit]);

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    element: ResolvedImageCompositionElement
  ) => {
    if (!canEdit) return;
    const point = getPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStartAnswerRef.current = answerRef.current;
    interactionRef.current = {
      assetId: element.assetId,
      pointerId: event.pointerId,
      offsetX: point.x - element.x,
      offsetY: point.y - element.y,
    };
  };

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    []
  );

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {!readonly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
            <span className="sr-only">Undo</span>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
            <span className="sr-only">Redo</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearBoard}
            title="Clear"
            aria-label="Clear"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        ref={canvasRef}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border shadow-sm",
          readonly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
        style={{
          aspectRatio: `${answer.canvas.width} / ${answer.canvas.height}`,
          backgroundColor: answer.canvas.backgroundColor,
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.16) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          touchAction: "none",
        }}
      >
        {normalizedTemplate?.backgroundImage ? (
          <img
            src={normalizedTemplate.backgroundImage.src}
            alt={normalizedTemplate.backgroundImage.name ?? "Background"}
            className={cn(
              "absolute inset-0 h-full w-full",
              normalizedTemplate.backgroundImage.fit === "contain"
                ? "object-contain"
                : "object-cover"
            )}
            draggable={false}
          />
        ) : null}

        {renderedElements.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground pointer-events-none">
            <div className="max-w-xs rounded-lg border border-dashed border-border bg-white/80 px-4 py-3 shadow-sm">
              {readonly
                ? "No image composition answer was submitted."
                : "This question has no draggable assets yet."}
            </div>
          </div>
        ) : null}

        {renderedElements.map((element) => {
          const left = `${(element.x / answer.canvas.width) * 100}%`;
          const top = `${(element.y / answer.canvas.height) * 100}%`;
          const width = `${(element.width / answer.canvas.width) * 100}%`;
          const height = `${(element.height / answer.canvas.height) * 100}%`;

          return (
            <div
              key={element.assetId}
              className={cn(
                "absolute select-none",
                readonly ? "pointer-events-none" : "pointer-events-auto"
              )}
              style={{
                left,
                top,
                width,
                height,
                zIndex: element.zIndex,
              }}
              onPointerDown={(event) => startDrag(event, element)}
            >
              <div className="relative h-full w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <img
                  src={element.src}
                  alt={element.name ?? "Asset"}
                  draggable={false}
                  className="h-full w-full select-none object-contain"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
