"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CircuitTemplate } from "@/lib/circuit-template";
import {
  buildTerminals,
  getRequiredConnections,
  normalizeCircuitTemplate,
} from "@/lib/circuit-template";

type CircuitConnection = {
  from: string;
  to: string;
};

export type CircuitAnswerData = {
  version: 1;
  type: "circuit";
  switchOn: boolean;
  connections: CircuitConnection[];
  derived: {
    isClosedCircuit: boolean;
    litBulbs: number;
  };
};

type CircuitAnswerProps = {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  className?: string;
  template?: CircuitTemplate | null;
};

const DEFAULT_VALUE: CircuitAnswerData = {
  version: 1,
  type: "circuit",
  switchOn: false,
  connections: [],
  derived: {
    isClosedCircuit: false,
    litBulbs: 0,
  },
};

const connectionKey = (connection: CircuitConnection) =>
  `${connection.from}::${connection.to}`;

const sortConnection = (connection: CircuitConnection): CircuitConnection => {
  const [from, to] = [connection.from, connection.to].sort();
  return { from, to };
};

const sameConnection = (a: CircuitConnection, b: CircuitConnection) =>
  connectionKey(a) === connectionKey(b);

const connectionUsesTerminal = (
  connection: CircuitConnection,
  terminalId: string
) => connection.from === terminalId || connection.to === terminalId;

const normalizeConnections = (connections: unknown): CircuitConnection[] => {
  if (!Array.isArray(connections)) return [];

  const normalized = new Map<string, CircuitConnection>();
  for (const item of connections) {
    if (!item || typeof item !== "object") continue;
    const from = (item as { from?: unknown }).from;
    const to = (item as { to?: unknown }).to;
    if (typeof from !== "string" || typeof to !== "string" || from === to) {
      continue;
    }
    const connection = sortConnection({ from, to });
    normalized.set(connectionKey(connection), connection);
  }

  return [...normalized.values()].sort((a, b) =>
    connectionKey(a).localeCompare(connectionKey(b))
  );
};

const withDerivedState = (
  value: Omit<CircuitAnswerData, "derived"> | CircuitAnswerData,
  template: CircuitTemplate
): CircuitAnswerData => {
  const normalizedConnections = normalizeConnections(value.connections);
  const requiredConnections = getRequiredConnections(template);
  const presentKeys = new Set(normalizedConnections.map(connectionKey));

  const isClosedCircuit =
    Boolean(value.switchOn) &&
    requiredConnections.every(([from, to]) =>
      presentKeys.has(connectionKey(sortConnection({ from, to })))
    );

  return {
    version: 1,
    type: "circuit",
    switchOn: Boolean(value.switchOn),
    connections: normalizedConnections,
    derived: {
      isClosedCircuit,
      litBulbs: isClosedCircuit ? 1 : 0,
    },
  };
};

export const serializeCircuitAnswer = (
  data: CircuitAnswerData,
  template?: CircuitTemplate | null
) => JSON.stringify(withDerivedState(data, normalizeCircuitTemplate(template)));

export const parseCircuitAnswer = (
  value?: string | null,
  template?: CircuitTemplate | null
): CircuitAnswerData => {
  if (!value) return DEFAULT_VALUE;

  try {
    const parsed = JSON.parse(value) as Partial<CircuitAnswerData> | null;
    if (parsed?.type !== "circuit") return DEFAULT_VALUE;

    return withDerivedState(
      {
        version: 1,
        type: "circuit",
        switchOn: Boolean(parsed.switchOn),
        connections: parsed.connections ?? [],
      },
      normalizeCircuitTemplate(template)
    );
  } catch {
    return DEFAULT_VALUE;
  }
};

const terminalClassName = (
  selectedTerminal: string | null,
  terminalId: string,
  readonly: boolean
) => {
  const isSelected = selectedTerminal === terminalId;
  return [
    "transition-colors",
    readonly ? "cursor-default" : "cursor-pointer",
    isSelected ? "fill-blue-500 stroke-blue-700" : "fill-white stroke-slate-700",
  ].join(" ");
};

const connectionStroke = (isClosedCircuit: boolean, isSelected: boolean) =>
  isSelected ? "#2563eb" : isClosedCircuit ? "#16a34a" : "#64748b";

function renderComponent(
  type: "battery" | "switch" | "bulb",
  x: number,
  y: number,
  isClosedCircuit: boolean
) {
  if (type === "battery") {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width="120"
          height="180"
          rx="16"
          fill="url(#battery-fill)"
          stroke="#0f172a"
        />
        <text x={x + 60} y={y + 32} textAnchor="middle" fontSize="14" fill="#0f172a">
          Battery
        </text>
        <line x1={x + 42} y1={y + 58} x2={x + 78} y2={y + 58} stroke="#0f172a" strokeWidth="3" />
        <line x1={x + 50} y1={y + 40} x2={x + 50} y2={y + 76} stroke="#0f172a" strokeWidth="3" />
        <line x1={x + 78} y1={y + 130} x2={x + 42} y2={y + 130} stroke="#0f172a" strokeWidth="2.5" />
      </g>
    );
  }

  if (type === "switch") {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width="120"
          height="100"
          rx="16"
          fill="#eff6ff"
          stroke="#1d4ed8"
        />
        <text x={x + 60} y={y + 32} textAnchor="middle" fontSize="14" fill="#1e3a8a">
          Switch
        </text>
        <line x1={x + 30} y1={y + 50} x2={x + 78} y2={y + 50} stroke="#1d4ed8" strokeWidth="4" />
        <line
          x1={x + 78}
          y1={y + 50}
          x2={x + 114}
          y2={isClosedCircuit ? y + 50 : y + 24}
          stroke="#1d4ed8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={x + 60} cy={y + 50} r="5" fill={isClosedCircuit ? "#1d4ed8" : "#cbd5e1"} />
      </g>
    );
  }

  return (
    <g>
      <circle cx={x} cy={y} r="62" fill="#fff7ed" stroke="#c2410c" strokeWidth="3" />
      <circle cx={x} cy={y} r="36" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
      <path
        d={`M ${x - 20} ${y} L ${x - 10} ${y - 12} L ${x} ${y + 12} L ${x + 10} ${
          y - 12
        } L ${x + 20} ${y}`}
        fill="none"
        stroke={isClosedCircuit ? "#f59e0b" : "#c2410c"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={x} y={y + 78} textAnchor="middle" fontSize="14" fill="#9a3412">
        Bulb
      </text>
    </g>
  );
}

export function CircuitAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
  template,
}: CircuitAnswerProps) {
  const normalizedTemplate = useMemo(() => normalizeCircuitTemplate(template), [template]);
  const terminals = useMemo(() => buildTerminals(normalizedTemplate), [normalizedTemplate]);
  const terminalIds = useMemo(() => new Set(terminals.map((terminal) => terminal.id)), [terminals]);
  const terminalLookup = useMemo(
    () => new Map(terminals.map((terminal) => [terminal.id, terminal])),
    [terminals]
  );

  const [circuit, setCircuit] = useState<CircuitAnswerData>(() =>
    parseCircuitAnswer(value, normalizedTemplate)
  );
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    setCircuit(parseCircuitAnswer(value, normalizedTemplate));
    setSelectedTerminal(null);
  }, [value, normalizedTemplate]);

  const emitChange = (
    updater: (current: CircuitAnswerData) => CircuitAnswerData
  ) => {
    setCircuit((current) => {
      const next = withDerivedState(updater(current), normalizedTemplate);
      onChange?.(serializeCircuitAnswer(next, normalizedTemplate));
      return next;
    });
  };

  const handleTerminalClick = (terminalId: string) => {
    if (!canEdit || !terminalIds.has(terminalId)) return;

    if (!selectedTerminal) {
      setSelectedTerminal(terminalId);
      return;
    }

    if (selectedTerminal === terminalId) {
      setSelectedTerminal(null);
      return;
    }

    const nextPair = sortConnection({
      from: selectedTerminal,
      to: terminalId,
    });
    const existingPair = circuit.connections.find((connection) =>
      sameConnection(connection, nextPair)
    );

    emitChange((current) => {
      const nextConnections = current.connections.filter(
        (connection) =>
          !connectionUsesTerminal(connection, selectedTerminal) &&
          !connectionUsesTerminal(connection, terminalId)
      );

      if (!existingPair) {
        nextConnections.push(nextPair);
      }

      return {
        ...current,
        connections: nextConnections,
      };
    });

    setSelectedTerminal(null);
  };

  const toggleSwitch = () => {
    if (!canEdit) return;
    emitChange((current) => ({
      ...current,
      switchOn: !current.switchOn,
    }));
  };

  const clearAll = () => {
    if (!canEdit) return;
    setSelectedTerminal(null);
    emitChange((current) => ({
      ...current,
      switchOn: false,
      connections: [],
    }));
  };

  const handleKeyDown = (
    event: KeyboardEvent<SVGElement>,
    terminalId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTerminalClick(terminalId);
    }
  };

  const renderedConnections = useMemo(
    () =>
      circuit.connections.map((connection) => {
        const fromMeta = terminalLookup.get(connection.from);
        const toMeta = terminalLookup.get(connection.to);
        if (!fromMeta || !toMeta) {
          return null;
        }

        const isSelected =
          selectedTerminal === connection.from ||
          selectedTerminal === connection.to;

        return {
          key: connectionKey(connection),
          fromMeta,
          toMeta,
          isSelected,
        };
      }),
    [circuit.connections, selectedTerminal, terminalLookup]
  );

  return (
    <div className={className ?? "space-y-3"}>
      {!readonly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={toggleSwitch}>
            Switch: {circuit.switchOn ? "ON" : "OFF"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearAll}>
            Clear Circuit
          </Button>
          <span className="text-xs text-muted-foreground">
            Click two terminals to connect or disconnect them.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block rounded-lg border border-border bg-white shadow-sm">
          <svg
            viewBox={`0 0 ${normalizedTemplate.width} ${normalizedTemplate.height}`}
            className={`block h-[320px] w-full min-w-[680px] ${
              canEdit ? "cursor-pointer" : ""
            }`}
            role="img"
            aria-label="Circuit answer board"
          >
            <defs>
              <linearGradient id="battery-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
            </defs>
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

            {renderedConnections.map((connection) => {
              if (!connection) return null;
              return (
                <line
                  key={connection.key}
                  x1={connection.fromMeta.x}
                  y1={connection.fromMeta.y}
                  x2={connection.toMeta.x}
                  y2={connection.toMeta.y}
                  stroke={connectionStroke(
                    circuit.derived.isClosedCircuit,
                    connection.isSelected
                  )}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            })}

            {normalizedTemplate.components.map((component) =>
              renderComponent(
                component.type,
                component.x,
                component.y,
                circuit.derived.isClosedCircuit
              )
            )}

            {terminals.map((terminal) => {
              const isSelected = selectedTerminal === terminal.id;
              const activeConnection = circuit.connections.some((connection) =>
                connectionUsesTerminal(connection, terminal.id)
              );

              return (
                <g
                  key={terminal.id}
                  role="button"
                  tabIndex={canEdit ? 0 : -1}
                  aria-label={`${terminal.componentType} terminal ${terminal.label}`}
                  onClick={() => handleTerminalClick(terminal.id)}
                  onKeyDown={(event) => handleKeyDown(event, terminal.id)}
                  className={canEdit ? "focus:outline-none" : ""}
                >
                  <circle
                    cx={terminal.x}
                    cy={terminal.y}
                    r="10"
                    className={terminalClassName(selectedTerminal, terminal.id, readonly)}
                    strokeWidth={isSelected || activeConnection ? 3 : 2}
                  />
                  <text
                    x={terminal.x}
                    y={terminal.y - 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    className="select-none"
                  >
                    {terminal.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>Switch: {circuit.switchOn ? "ON" : "OFF"}</div>
        <div>Closed circuit: {circuit.derived.isClosedCircuit ? "Yes" : "No"}</div>
        <div>Lit bulbs: {circuit.derived.litBulbs}</div>
      </div>
    </div>
  );
}
