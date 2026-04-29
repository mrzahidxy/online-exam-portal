"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

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

const DEFAULT_VALUE: TableAnswerData = {
  version: 1,
  type: "table",
  rows: Array.from({ length: DEFAULT_ROWS }, () =>
    Array.from({ length: DEFAULT_COLS }, () => "")
  ),
};

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

const createEmptyRow = (columns: number) =>
  Array.from({ length: Math.max(columns, 1) }, () => "");

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

  const canEdit = !readonly && typeof onChange === "function";

  useEffect(() => {
    setTable(parseTableAnswer(value));
  }, [value]);

  const emitChange = (next: TableAnswerData) => {
    setTable(next);
    onChange?.(serializeTableAnswer(next));
  };

  const updateCell = (rowIndex: number, colIndex: number, cellValue: string) => {
    const nextRows = table.rows.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? cellValue : cell))
        : row
    );
    const nextTable = { ...table, rows: nextRows };
    const isBottomRight =
      rowIndex === table.rows.length - 1 &&
      colIndex === (table.rows[rowIndex]?.length ?? 1) - 1;

    if (isBottomRight && cellValue.trim().length > 0) {
      nextTable.rows = [
        ...nextTable.rows,
        createEmptyRow(nextTable.rows[0]?.length ?? DEFAULT_COLS),
      ].map((row) => [...row, ""]);
    }

    emitChange(nextTable);
  };

  const addRow = () => {
    emitChange({
      ...table,
      rows: [...table.rows, Array.from({ length: table.rows[0]?.length ?? DEFAULT_COLS }, () => "")],
    });
  };

  const removeRow = () => {
    if (table.rows.length <= 1) return;
    emitChange({ ...table, rows: table.rows.slice(0, -1) });
  };

  const addColumn = () => {
    emitChange({
      ...table,
      rows: table.rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = () => {
    const colCount = table.rows[0]?.length ?? 0;
    if (colCount <= 1) return;
    emitChange({
      ...table,
      rows: table.rows.map((row) => row.slice(0, -1)),
    });
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (!canEdit) return;

    if ((event.key === "Tab" || event.key === "Enter") && rowIndex === table.rows.length - 1 && colIndex === (table.rows[rowIndex]?.length ?? 1) - 1) {
      event.preventDefault();
      addRow();
      addColumn();
    }
  };

  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.length ?? 0;

  return (
    <div className={className ?? "space-y-3"}>
      {!readonly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            Add Row
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={removeRow}>
            Remove Row
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addColumn}>
            Add Column
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={removeColumn}>
            Remove Column
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full border-collapse">
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className="border border-border p-0">
                    {canEdit ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateCell(rowIndex, colIndex, event.target.value)
                        }
                        onKeyDown={(event) => handleKeyDown(event, rowIndex, colIndex)}
                        className="w-full min-w-24 bg-transparent px-3 py-2 text-sm outline-none"
                        placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
                      />
                    ) : (
                      <div className="min-h-11 min-w-24 px-3 py-2 text-sm text-foreground">
                        {cell || <span className="text-muted-foreground">—</span>}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Rows: {rowCount}</span>
        <span>Columns: {colCount}</span>
        <span>Mode: {readonly ? "view only" : "spreadsheet table"}</span>
      </div>
    </div>
  );
}
