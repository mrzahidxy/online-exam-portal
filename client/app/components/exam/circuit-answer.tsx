"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

type CircuitTerminalId =
  | "battery.positive"
  | "battery.negative"
  | "switch.left"
  | "switch.right"
  | "bulb.left"
  | "bulb.right";

type CircuitConnection = {
  from: CircuitTerminalId;
  to: CircuitTerminalId;
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
};

type TerminalMeta = {
  id: CircuitTerminalId;
  label: string;
  x: number;
  y: number;
  component: "battery" | "switch" | "bulb";
};

const SVG_WIDTH = 720;
const SVG_HEIGHT = 320;

const TERMINALS: TerminalMeta[] = [
  { id: "battery.positive", label: "+", x: 168, y: 116, component: "battery" },
  { id: "battery.negative", label: "-", x: 168, y: 204, component: "battery" },
  { id: "switch.left", label: "L", x: 282, y: 160, component: "switch" },
  { id: "switch.right", label: "R", x: 396, y: 160, component: "switch" },
  { id: "bulb.left", label: "L", x: 512, y: 160, component: "bulb" },
  { id: "bulb.right", label: "R", x: 628, y: 160, component: "bulb" },
];

const TERMINAL_LOOKUP = new Map(TERMINALS.map((terminal) => [terminal.id, terminal]));
const TERMINAL_IDS = new Set<CircuitTerminalId>(TERMINALS.map((terminal) => terminal.id));
const REQUIRED_CONNECTIONS: Array<[CircuitTerminalId, CircuitTerminalId]> = [
  ["battery.positive", "switch.left"],
  ["switch.right", "bulb.left"],
  ["bulb.right", "battery.negative"],
];

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

const isTerminalId = (value: unknown): value is CircuitTerminalId =>
  typeof value === "string" && TERMINAL_IDS.has(value as CircuitTerminalId);

const sortConnection = (connection: CircuitConnection): CircuitConnection => {
  const [from, to] = [connection.from, connection.to].sort() as [
    CircuitTerminalId,
    CircuitTerminalId
  ];

  return { from, to };
};

const connectionKey = (connection: CircuitConnection) =>
  `${connection.from}::${connection.to}`;

const sameConnection = (a: CircuitConnection, b: CircuitConnection) =>
  connectionKey(a) === connectionKey(b);

const connectionUsesTerminal = (
  connection: CircuitConnection,
  terminalId: CircuitTerminalId
) => connection.from === terminalId || connection.to === terminalId;

const normalizeConnections = (connections: unknown): CircuitConnection[] => {
  if (!Array.isArray(connections)) {
    return [];
  }

  const normalized = new Map<string, CircuitConnection>();

  for (const item of connections) {
    if (!item || typeof item !== "object") continue;

    const from = (item as { from?: unknown }).from;
    const to = (item as { to?: unknown }).to;
    if (!isTerminalId(from) || !isTerminalId(to) || from === to) continue;

    const connection = sortConnection({ from, to });
    normalized.set(connectionKey(connection), connection);
  }

  return [...normalized.values()].sort((a, b) =>
    connectionKey(a).localeCompare(connectionKey(b))
  );
};

const withDerivedState = (
  value: Omit<CircuitAnswerData, "derived"> | CircuitAnswerData
): CircuitAnswerData => {
  const normalizedConnections = normalizeConnections(value.connections);
  const presentKeys = new Set(normalizedConnections.map(connectionKey));

  const isClosedCircuit =
    Boolean(value.switchOn) &&
    REQUIRED_CONNECTIONS.every(([from, to]) =>
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

export const serializeCircuitAnswer = (data: CircuitAnswerData) =>
  JSON.stringify(withDerivedState(data));

export const parseCircuitAnswer = (value?: string | null): CircuitAnswerData => {
  if (!value) return DEFAULT_VALUE;

  try {
    const parsed = JSON.parse(value) as Partial<CircuitAnswerData> | null;
    if (parsed?.type !== "circuit") return DEFAULT_VALUE;

    return withDerivedState({
      version: 1,
      type: "circuit",
      switchOn: Boolean(parsed.switchOn),
      connections: parsed.connections ?? [],
    });
  } catch {
    return DEFAULT_VALUE;
  }
};

const terminalClassName = (
  terminalId: CircuitTerminalId,
  selectedTerminal: CircuitTerminalId | null,
  readonly: boolean
) => {
  const isSelected = selectedTerminal === terminalId;
  const terminal = TERMINAL_LOOKUP.get(terminalId);
  const isPoweredNode =
    terminal?.component === "battery" || terminal?.component === "bulb";

  return [
    "transition-colors",
    readonly ? "cursor-default" : "cursor-pointer",
    isSelected ? "fill-blue-500 stroke-blue-700" : isPoweredNode ? "fill-amber-400 stroke-slate-800" : "fill-white stroke-slate-700",
  ].join(" ");
};

const connectionStroke = (isClosedCircuit: boolean, isSelected: boolean) =>
  isSelected ? "#2563eb" : isClosedCircuit ? "#16a34a" : "#64748b";

export function CircuitAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
}: CircuitAnswerProps) {
  const [circuit, setCircuit] = useState<CircuitAnswerData>(() =>
    parseCircuitAnswer(value)
  );
  const [selectedTerminal, setSelectedTerminal] =
    useState<CircuitTerminalId | null>(null);

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    setCircuit(parseCircuitAnswer(value));
    setSelectedTerminal(null);
  }, [value]);

  const emitChange = (
    updater: (current: CircuitAnswerData) => CircuitAnswerData
  ) => {
    setCircuit((current) => {
      const next = withDerivedState(updater(current));
      onChange?.(serializeCircuitAnswer(next));
      return next;
    });
  };

  const handleTerminalClick = (terminalId: CircuitTerminalId) => {
    if (!canEdit) return;

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
    terminalId: CircuitTerminalId
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTerminalClick(terminalId);
    }
  };

  const renderedConnections = useMemo(
    () =>
      circuit.connections.map((connection) => {
        const fromMeta = TERMINAL_LOOKUP.get(connection.from);
        const toMeta = TERMINAL_LOOKUP.get(connection.to);

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
    [circuit.connections, selectedTerminal]
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
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className={`block h-[320px] w-full min-w-[680px] ${canEdit ? "cursor-pointer" : ""}`}
            role="img"
            aria-label="Circuit answer board"
          >
            <defs>
              <linearGradient id="battery-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="#f8fafc" />
            <rect
              x="16"
              y="16"
              width={SVG_WIDTH - 32}
              height={SVG_HEIGHT - 32}
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

            <g>
              <rect
                x="48"
                y="70"
                width="120"
                height="180"
                rx="16"
                fill="url(#battery-fill)"
                stroke="#0f172a"
              />
              <text x="108" y="102" textAnchor="middle" fontSize="14" fill="#0f172a">
                Battery
              </text>
              <line x1="90" y1="128" x2="126" y2="128" stroke="#0f172a" strokeWidth="3" />
              <line x1="98" y1="110" x2="98" y2="146" stroke="#0f172a" strokeWidth="3" />
              <line x1="126" y1="200" x2="90" y2="200" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="168" cy="116" r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <circle cx="168" cy="204" r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
            </g>

            <g>
              <rect
                x="252"
                y="110"
                width="120"
                height="100"
                rx="16"
                fill="#eff6ff"
                stroke="#1d4ed8"
              />
              <text x="312" y="142" textAnchor="middle" fontSize="14" fill="#1e3a8a">
                Switch
              </text>
              <line x1="282" y1="160" x2="330" y2="160" stroke="#1d4ed8" strokeWidth="4" />
              <line
                x1="330"
                y1="160"
                x2={circuit.switchOn ? 366 : 356}
                y2={circuit.switchOn ? 160 : 134}
                stroke="#1d4ed8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="282" cy="160" r="9" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
              <circle cx="396" cy="160" r="9" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
              {circuit.switchOn ? (
                <circle cx="312" cy="160" r="6" fill="#1d4ed8" />
              ) : (
                <circle cx="312" cy="160" r="5" fill="#cbd5e1" />
              )}
            </g>

            <g>
              <circle cx="576" cy="160" r="62" fill="#fff7ed" stroke="#c2410c" strokeWidth="3" />
              <circle cx="576" cy="160" r="36" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
              <path
                d="M 556 160 L 566 148 L 576 172 L 586 148 L 596 160"
                fill="none"
                stroke={circuit.derived.isClosedCircuit ? "#f59e0b" : "#c2410c"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {circuit.derived.isClosedCircuit && (
                <>
                  <line x1="576" y1="90" x2="576" y2="104" stroke="#f59e0b" strokeWidth="3" />
                  <line x1="576" y1="216" x2="576" y2="230" stroke="#f59e0b" strokeWidth="3" />
                  <line x1="506" y1="160" x2="520" y2="160" stroke="#f59e0b" strokeWidth="3" />
                  <line x1="632" y1="160" x2="646" y2="160" stroke="#f59e0b" strokeWidth="3" />
                </>
              )}
              <text x="576" y="238" textAnchor="middle" fontSize="14" fill="#9a3412">
                Bulb
              </text>
              <circle cx="512" cy="160" r="9" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
              <circle cx="628" cy="160" r="9" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
            </g>

            {TERMINALS.map((terminal) => {
              const isSelected = selectedTerminal === terminal.id;
              const activeConnection = circuit.connections.some((connection) =>
                connectionUsesTerminal(connection, terminal.id)
              );

              return (
                <g
                  key={terminal.id}
                  role="button"
                  tabIndex={canEdit ? 0 : -1}
                  aria-label={`${terminal.component} terminal ${terminal.label}`}
                  onClick={() => handleTerminalClick(terminal.id)}
                  onKeyDown={(event) => handleKeyDown(event, terminal.id)}
                  className={canEdit ? "focus:outline-none" : ""}
                >
                  <circle
                    cx={terminal.x}
                    cy={terminal.y}
                    r="10"
                    className={terminalClassName(terminal.id, selectedTerminal, readonly)}
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

      {circuit.connections.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Connections:{" "}
          {circuit.connections
            .map((connection) => `${connection.from} - ${connection.to}`)
            .join(", ")}
        </div>
      )}
    </div>
  );
}
