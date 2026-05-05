"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  CircuitComponent,
  CircuitComponentType,
  CircuitTemplate,
} from "@/lib/circuit-template";
import {
  buildTerminals,
  createCircuitComponent,
  defaultComponentPosition,
  generateCircuitComponentId,
  normalizeCircuitTemplate,
} from "@/lib/circuit-template";

type CircuitBoardDesignerProps = {
  template: CircuitTemplate | null | undefined;
  onChange: (template: CircuitTemplate) => void;
  className?: string;
};

const COMPONENT_LABELS: Record<CircuitComponentType, string> = {
  battery: "Battery",
  switch: "Switch",
  bulb: "Bulb",
};

const COMPONENT_SIZES: Record<CircuitComponentType, { width: number; height: number }> = {
  battery: { width: 120, height: 180 },
  switch: { width: 120, height: 100 },
  bulb: { width: 124, height: 124 },
};

const REQUIRED_COMPONENT_TYPES: CircuitComponentType[] = ["battery", "switch", "bulb"];

const getComponentBounds = (component: CircuitComponent) => {
  const size = COMPONENT_SIZES[component.type];
  if (component.type === "bulb") {
    return {
      x: component.x - size.width / 2,
      y: component.y - size.height / 2,
      width: size.width,
      height: size.height,
    };
  }

  return {
    x: component.x,
    y: component.y,
    width: size.width,
    height: size.height,
  };
};

const renderComponentBody = (component: CircuitComponent) => {
  if (component.type === "battery") {
    return (
      <g>
        <rect x={component.x} y={component.y} width="120" height="180" rx="16" fill="#eef2ff" stroke="#1e293b" />
        <text x={component.x + 60} y={component.y + 32} textAnchor="middle" fontSize="14" fill="#1e293b">
          Battery
        </text>
        <line x1={component.x + 42} y1={component.y + 58} x2={component.x + 78} y2={component.y + 58} stroke="#1e293b" strokeWidth="3" />
        <line x1={component.x + 50} y1={component.y + 40} x2={component.x + 50} y2={component.y + 76} stroke="#1e293b" strokeWidth="3" />
        <line x1={component.x + 78} y1={component.y + 130} x2={component.x + 42} y2={component.y + 130} stroke="#1e293b" strokeWidth="2.5" />
      </g>
    );
  }

  if (component.type === "switch") {
    return (
      <g>
        <rect x={component.x} y={component.y} width="120" height="100" rx="16" fill="#eff6ff" stroke="#1d4ed8" />
        <text x={component.x + 60} y={component.y + 32} textAnchor="middle" fontSize="14" fill="#1e3a8a">
          Switch
        </text>
        <line x1={component.x + 30} y1={component.y + 50} x2={component.x + 78} y2={component.y + 50} stroke="#1d4ed8" strokeWidth="4" />
        <line x1={component.x + 78} y1={component.y + 50} x2={component.x + 114} y2={component.y + 24} stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <circle cx={component.x} cy={component.y} r="62" fill="#fff7ed" stroke="#c2410c" strokeWidth="3" />
      <circle cx={component.x} cy={component.y} r="36" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
      <path
        d={`M ${component.x - 20} ${component.y} L ${component.x - 10} ${component.y - 12} L ${component.x} ${component.y + 12} L ${component.x + 10} ${component.y - 12} L ${component.x + 20} ${component.y}`}
        fill="none"
        stroke="#c2410c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={component.x} y={component.y + 78} textAnchor="middle" fontSize="14" fill="#9a3412">
        Bulb
      </text>
    </g>
  );
};

export function CircuitBoardDesigner({
  template,
  onChange,
  className,
}: CircuitBoardDesignerProps) {
  const normalizedTemplate = useMemo(() => normalizeCircuitTemplate(template), [template]);
  const terminals = useMemo(() => buildTerminals(normalizedTemplate), [normalizedTemplate]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const updateTemplate = (next: CircuitTemplate) => {
    onChange(next);
  };

  const getComponentCount = (type: CircuitComponentType) =>
    normalizedTemplate.components.filter((component) => component.type === type).length;

  const canRemoveComponent = (component: CircuitComponent) => {
    if (!REQUIRED_COMPONENT_TYPES.includes(component.type)) {
      return true;
    }

    return getComponentCount(component.type) > 1;
  };

  const addComponent = (type: CircuitComponentType) => {
    const typeIndex = normalizedTemplate.components.filter((component) => component.type === type).length;
    const position = defaultComponentPosition(type, typeIndex);
    const id = generateCircuitComponentId(normalizedTemplate, type);
    const next = {
      ...normalizedTemplate,
      components: [
        ...normalizedTemplate.components,
        {
          ...createCircuitComponent(type, typeIndex, position.x, position.y),
          id,
        },
      ],
    };
    updateTemplate(next);
    setSelectedComponentId(id);
  };

  const removeComponent = (componentId: string) => {
    const target = normalizedTemplate.components.find(
      (component) => component.id === componentId
    );

    if (!target || !canRemoveComponent(target)) {
      return;
    }

    const nextComponents = normalizedTemplate.components.filter(
      (component) => component.id !== componentId
    );
    updateTemplate({
      ...normalizedTemplate,
      components: nextComponents,
    });
    setSelectedComponentId((current) =>
      current === componentId ? null : current
    );
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!draggingId || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const nextLeft = event.clientX - rect.left - dragOffset.x;
      const nextTop = event.clientY - rect.top - dragOffset.y;

      updateTemplate({
        ...normalizedTemplate,
        components: normalizedTemplate.components.map((component) => {
          if (component.id !== draggingId) return component;
          const bounds = getComponentBounds(component);
          return {
            ...component,
            x:
              component.type === "bulb"
                ? Math.max(24 + bounds.width / 2, Math.round(nextLeft + bounds.width / 2))
                : Math.max(24, Math.round(nextLeft)),
            y:
              component.type === "bulb"
                ? Math.max(24 + bounds.height / 2, Math.round(nextTop + bounds.height / 2))
                : Math.max(24, Math.round(nextTop)),
          };
        }),
      });
    };

    const handleUp = () => {
      setDraggingId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragOffset.x, dragOffset.y, draggingId, normalizedTemplate]);

  useEffect(() => {
    if (
      selectedComponentId &&
      !normalizedTemplate.components.some(
        (component) => component.id === selectedComponentId
      )
    ) {
      setSelectedComponentId(null);
    }
  }, [normalizedTemplate.components, selectedComponentId]);

  return (
    <div className={className ?? "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(COMPONENT_LABELS) as CircuitComponentType[]).map((type) => (
          <Button key={type} type="button" size="sm" variant="outline" onClick={() => addComponent(type)}>
            Add {COMPONENT_LABELS[type]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => {
            if (selectedComponentId) {
              removeComponent(selectedComponentId);
            }
          }}
          disabled={!selectedComponentId}
        >
          Remove selected
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block rounded-lg border border-border bg-white shadow-sm">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${normalizedTemplate.width} ${normalizedTemplate.height}`}
            className="block h-[320px] w-full min-w-[680px]"
            role="img"
            aria-label="Circuit board designer"
          >
            <rect x="0" y="0" width={normalizedTemplate.width} height={normalizedTemplate.height} fill="#f8fafc" />
            <rect
              x="16"
              y="16"
              width={normalizedTemplate.width - 32}
              height={normalizedTemplate.height - 32}
              rx="18"
              fill="#ffffff"
              stroke="#e2e8f0"
            />

            {normalizedTemplate.components.map((component) => (
              <g key={component.id}>
                <g
                  onPointerDown={(event) => {
                    event.preventDefault();
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setSelectedComponentId(component.id);
                    setDraggingId(component.id);
                    const bounds = getComponentBounds(component);
                    setDragOffset({
                      x: event.clientX - rect.left - bounds.x,
                      y: event.clientY - rect.top - bounds.y,
                    });
                  }}
                  onClick={() => setSelectedComponentId(component.id)}
                  style={{ cursor: "grab" }}
                >
                  {renderComponentBody(component)}
                  <rect
                    x={getComponentBounds(component).x}
                    y={getComponentBounds(component).y}
                    width={COMPONENT_SIZES[component.type].width}
                    height={COMPONENT_SIZES[component.type].height}
                    rx="12"
                    fill="transparent"
                    stroke={
                      selectedComponentId === component.id || draggingId === component.id
                        ? "#2563eb"
                        : "transparent"
                    }
                    strokeDasharray="6 4"
                  />
                </g>
                <g
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeComponent(component.id);
                  }}
                  style={{ cursor: canRemoveComponent(component) ? "pointer" : "not-allowed" }}
                >
                  <circle
                    cx={getComponentBounds(component).x + COMPONENT_SIZES[component.type].width - 10}
                    cy={getComponentBounds(component).y + 10}
                    r="10"
                    fill={canRemoveComponent(component) ? "#fee2e2" : "#e2e8f0"}
                    stroke={canRemoveComponent(component) ? "#ef4444" : "#94a3b8"}
                    strokeWidth="1.5"
                  />
                  <text
                    x={getComponentBounds(component).x + COMPONENT_SIZES[component.type].width - 10}
                    y={getComponentBounds(component).y + 14}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill={canRemoveComponent(component) ? "#b91c1c" : "#64748b"}
                    pointerEvents="none"
                  >
                    ×
                  </text>
                </g>
              </g>
            ))}

            {terminals.map((terminal) => (
              <g key={terminal.id}>
                <circle
                  cx={terminal.x}
                  cy={terminal.y}
                  r="8"
                  fill="#ffffff"
                  stroke="#475569"
                  strokeWidth="2"
                />
                <text
                  x={terminal.x}
                  y={terminal.y - 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {terminal.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Drag the pieces to position them. Add buttons create new components on the board.
      </div>
    </div>
  );
}
