"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Plus } from "lucide-react";

type TableCell = string;

type TableAnswerData = {
  version: 1;
  type: "table";
  rows: TableCell[][];
};

type TableAnswerProps = {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  className?: string;
};

const DEFAULT_ROWS = 1;
const DEFAULT_COLS = 1;
const MAX_TABLE_SIZE = 6;
const CELL_WIDTH = 84;
const CELL_HEIGHT = 36;

const DEFAULT_VALUE: TableAnswerData = {
  version: 1,
  type: "table",
  rows: Array.from({ length: DEFAULT_ROWS }, () =>
    Array.from({ length: DEFAULT_COLS }, () => "")
  ),
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeRows = (rows: unknown): TableCell[][] => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return DEFAULT_VALUE.rows;
  }

  const normalized = rows
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []))
    .filter((row) => row.length > 0);

  if (normalized.length === 0) {
    return DEFAULT_VALUE.rows;
  }

  const maxCols = Math.max(...normalized.map((row) => row.length), DEFAULT_COLS);
  return normalized.map((row) => [
    ...row,
    ...Array.from({ length: maxCols - row.length }, () => ""),
  ]);
};

const resizeTableRows = (
  rows: TableCell[][],
  nextRowCount: number,
  nextColCount: number
) => {
  const rowCount = Math.max(nextRowCount, 1);
  const colCount = Math.max(nextColCount, 1);

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const sourceRow = rows[rowIndex] ?? [];
    const nextRow = sourceRow.slice(0, colCount);
    return [
      ...nextRow,
      ...Array.from({ length: colCount - nextRow.length }, () => ""),
    ];
  });
};

export const serializeTableAnswer = (data: TableAnswerData) =>
  JSON.stringify(data);

export const parseTableAnswer = (value?: string | null): TableAnswerData => {
  if (!value) return DEFAULT_VALUE;

  try {
    const parsed = JSON.parse(value) as Partial<TableAnswerData>;
    if (parsed?.type !== "table") return DEFAULT_VALUE;

    return {
      version: 1,
      type: "table",
      rows: normalizeRows(parsed.rows),
    };
  } catch {
    return DEFAULT_VALUE;
  }
};

export function TableAnswerEditor({
  value,
  onChange,
  readonly = false,
  className,
}: TableAnswerProps) {
  const [table, setTable] = useState<TableAnswerData>(() => parseTableAnswer(value));
  const [draftSize, setDraftSize] = useState({
    rows: table.rows.length,
    cols: table.rows[0]?.length ?? DEFAULT_COLS,
  });
  const [isResizing, setIsResizing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const draftSizeRef = useRef(draftSize);

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    const nextTable = parseTableAnswer(value);
    const nextSize = {
      rows: nextTable.rows.length,
      cols: nextTable.rows[0]?.length ?? DEFAULT_COLS,
    };

    setTable(nextTable);
    setDraftSize(nextSize);
    draftSizeRef.current = nextSize;
  }, [value]);

  useEffect(() => {
    draftSizeRef.current = draftSize;
  }, [draftSize]);

  const commitSize = useCallback(
    (nextRows: number, nextCols: number) => {
      const clampedRows = clamp(nextRows, 1, MAX_TABLE_SIZE);
      const clampedCols = clamp(nextCols, 1, MAX_TABLE_SIZE);

      setTable((currentTable) => {
        const nextTable = {
          ...currentTable,
          rows: resizeTableRows(currentTable.rows, clampedRows, clampedCols),
        };
        onChange?.(serializeTableAnswer(nextTable));
        return nextTable;
      });

      setDraftSize({ rows: clampedRows, cols: clampedCols });
      draftSizeRef.current = { rows: clampedRows, cols: clampedCols };
    },
    [onChange]
  );

  useEffect(() => {
    if (!isResizing || readonly) return;

    let didCommit = false;

    const updateDraftFromPoint = (clientX: number, clientY: number) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextCols = clamp(
        Math.ceil((clientX - rect.left) / CELL_WIDTH),
        1,
        MAX_TABLE_SIZE
      );
      const nextRows = clamp(
        Math.ceil((clientY - rect.top) / CELL_HEIGHT),
        1,
        MAX_TABLE_SIZE
      );

      const nextSize = { rows: nextRows, cols: nextCols };
      setDraftSize(nextSize);
      draftSizeRef.current = nextSize;
    };

    const finishResize = () => {
      if (didCommit) return;
      didCommit = true;

      const nextSize = draftSizeRef.current;
      commitSize(nextSize.rows, nextSize.cols);
      setIsResizing(false);
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      updateDraftFromPoint(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };
  }, [isResizing, readonly, commitSize]);

  const updateCell = (rowIndex: number, colIndex: number, cellValue: string) => {
    const nextRows = table.rows.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? cellValue : cell))
        : row
    );

    const nextTable = { ...table, rows: nextRows };
    setTable(nextTable);
    onChange?.(serializeTableAnswer(nextTable));
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!canEdit) return;

    event.preventDefault();
    const nextSize = {
      rows: table.rows.length,
      cols: table.rows[0]?.length ?? DEFAULT_COLS,
    };
    setDraftSize(nextSize);
    draftSizeRef.current = nextSize;
    setIsResizing(true);
  };

  const handleManualRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    commitSize(Number(event.target.value || 1), draftSize.cols);
    setIsResizing(false);
  };

  const handleManualColsChange = (event: ChangeEvent<HTMLInputElement>) => {
    commitSize(draftSize.rows, Number(event.target.value || 1));
    setIsResizing(false);
  };

  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.length ?? 0;
  const activeRows = isResizing ? draftSize.rows : rowCount;
  const activeCols = isResizing ? draftSize.cols : colCount;
  const renderedRows = useMemo(
    () => resizeTableRows(table.rows, activeRows, activeCols),
    [table.rows, activeRows, activeCols]
  );

  return (
    <div className={className ?? "space-y-2"}>
      {canEdit && (
        <div className="rounded-md border border-border bg-muted/20 p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-foreground">Size table</p>
              <p className="text-[11px] text-muted-foreground">
                Drag + or type rows and cols.
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {activeRows} x {activeCols}
            </div>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <span className="min-w-12 text-[11px] font-medium text-foreground">
                Rows
              </span>
              <input
                type="number"
                min={1}
                max={MAX_TABLE_SIZE}
                step={1}
                value={activeRows}
                onChange={handleManualRowsChange}
                className="h-8 w-full rounded-md border border-border bg-white px-2 text-[11px] outline-none"
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="min-w-12 text-[11px] font-medium text-foreground">
                Columns
              </span>
              <input
                type="number"
                min={1}
                max={MAX_TABLE_SIZE}
                step={1}
                value={activeCols}
                onChange={handleManualColsChange}
                className="h-8 w-full rounded-md border border-border bg-white px-2 text-[11px] outline-none"
              />
            </label>
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="relative overflow-x-auto rounded-md border border-border bg-white shadow-sm"
      >
        <table className="w-full border-collapse table-fixed">
          <tbody>
            {renderedRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className="border border-border p-0 align-top"
                    style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                  >
                    {canEdit ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateCell(rowIndex, colIndex, event.target.value)
                        }
                        className="h-9 w-full bg-transparent px-2.5 text-xs outline-none"
                        placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
                      />
                    ) : (
                      <div className="flex h-9 items-center px-2.5 text-xs text-foreground">
                        {cell || <span className="text-muted-foreground">-</span>}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {canEdit && (
          <button
            type="button"
            onPointerDown={startResize}
            className="absolute -right-1.5 -bottom-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-md transition hover:bg-muted active:scale-95 cursor-grab touch-none"
            aria-label="Drag to size the table"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>Rows: {rowCount}</span>
        <span>Columns: {colCount}</span>
        <span>Mode: {readonly ? "view only" : "spreadsheet table"}</span>
      </div>
    </div>
  );
}
