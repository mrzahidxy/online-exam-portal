"use client";

import he from "he";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createDefaultInteractiveTableTemplate,
  isInteractiveTableFillableCell,
  normalizeInteractiveTableTemplate,
  validateInteractiveTableTemplate,
  type InteractiveTableCell,
  type InteractiveTableCellType,
  type InteractiveTableTemplate,
} from "@/lib/interactive-table";
import { cn } from "@/lib/utils";

type InteractiveTableBuilderProps = {
  template?: InteractiveTableTemplate | null;
  onChange: (template: InteractiveTableTemplate) => void;
};

type SelectedCell = {
  rowId: string;
  columnIndex: number;
};

const CELL_TYPES: Array<{ value: InteractiveTableCellType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "drag_item", label: "Draggable" },
  { value: "drop_zone", label: "Drop zone" },
  { value: "drop_expression", label: "Expression drop" },
  { value: "text_input", label: "Text input" },
  { value: "number_input", label: "Number input" },
  { value: "empty", label: "Empty" },
];

const emptyCell = (): InteractiveTableCell => ({ type: "empty" });
const decodeHtml = (value?: string | null) => (value ? he.decode(value) : "");

const makeSafeId = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized || fallback;
};

const makeUniqueId = (base: string, existing: Set<string>) => {
  let candidate = makeSafeId(base, "item");
  let counter = 1;
  while (existing.has(candidate)) {
    candidate = `${makeSafeId(base, "item")}_${counter}`;
    counter += 1;
  }
  return candidate;
};

const getFillableIds = (template: InteractiveTableTemplate) =>
  template.rows
    .flatMap((row) => row.cells)
    .filter(isInteractiveTableFillableCell)
    .map((cell) => cell.id);

const getDragItemValues = (template: InteractiveTableTemplate) =>
  template.rows
    .flatMap((row) => row.cells)
    .filter((cell): cell is Extract<InteractiveTableCell, { type: "drag_item" }> => cell.type === "drag_item")
    .map((cell) => cell.value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

const syncDropZoneOptions = (
  template: InteractiveTableTemplate
): InteractiveTableTemplate => {
  const dragItems = getDragItemValues(template);
  if (dragItems.length === 0) return template;

  return {
    ...template,
    rows: template.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cell.type === "drop_zone" || cell.type === "drop_expression"
          ? { ...cell, options: dragItems }
          : cell
      ),
    })),
  };
};

const reconcileModelAnswer = (
  template: InteractiveTableTemplate
): InteractiveTableTemplate => {
  const syncedTemplate = syncDropZoneOptions(template);
  const fillableIds = getFillableIds(syncedTemplate);
  const modelAnswer = Object.fromEntries(
    fillableIds.map((id) => [id, syncedTemplate.modelAnswer?.[id] ?? ""])
  );
  return { ...syncedTemplate, modelAnswer };
};

const createCellForType = (
  type: InteractiveTableCellType,
  id: string
): InteractiveTableCell => {
  if (type === "text" || type === "drag_item") {
    return { type, value: "" };
  }
  if (type === "text_input" || type === "number_input") {
    return { type, id, before: "", placeholder: "", required: false };
  }
  if (type === "select") {
    return { type, id, options: ["Option 1"], placeholder: "", required: false };
  }
  if (type === "drop_zone") {
    return { type, id, options: ["Option 1"], placeholder: "Drop here", required: false };
  }
  if (type === "drop_expression") {
    return {
      type,
      id,
      before: "",
      after: "",
      options: ["Option 1"],
      placeholder: "",
      required: false,
    };
  }
  return { type: "empty" };
};

const getCellSummary = (cell: InteractiveTableCell) => {
  if (cell.type === "empty") return "Blank";
  if (cell.type === "text" || cell.type === "drag_item") {
    return decodeHtml(cell.value) || cell.type;
  }
  if (isInteractiveTableFillableCell(cell)) {
    return `${cell.type}: ${cell.id}`;
  }
  return cell.type;
};

export function TableSizeControls({
  onAddColumn,
  onAddRow,
}: {
  onAddColumn: () => void;
  onAddRow: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onAddColumn}>
        <Plus className="h-3.5 w-3.5" />
        Add Column
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
        <Plus className="h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  );
}

export function CellTypePalette() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <Label className="text-xs font-semibold text-slate-700">Cell types</Label>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-2">
        {CELL_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-cell-type", type.value);
              event.dataTransfer.effectAllowed = "copy";
            }}
            className="cursor-grab rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing"
            title={`Drag ${type.label} onto a cell`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EditableTableCell({
  cell,
  selected,
  onClick,
  onDropCellType,
}: {
  cell: InteractiveTableCell;
  selected: boolean;
  onClick: () => void;
  onDropCellType: (type: InteractiveTableCellType) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-cell-type")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        const type = event.dataTransfer.getData(
          "application/x-cell-type"
        ) as InteractiveTableCellType;
        if (!CELL_TYPES.some((item) => item.value === type)) return;
        event.preventDefault();
        onDropCellType(type);
      }}
      className={cn(
        "min-h-14 w-full p-2 text-left text-xs transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected && "bg-blue-50 ring-2 ring-blue-500"
      )}
    >
      <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
        {cell.type.replace("_", " ")}
      </span>
      <span className="mt-1.5 block truncate text-slate-500">
        {getCellSummary(cell)}
      </span>
    </button>
  );
}

export function EditableTableCanvas({
  template,
  selectedCell,
  onSelectCell,
  onRemoveRow,
  onColumnLabelChange,
  onRemoveColumn,
  onDropCellType,
}: {
  template: InteractiveTableTemplate;
  selectedCell: SelectedCell | null;
  onSelectCell: (cell: SelectedCell) => void;
  onRemoveRow: (rowId: string) => void;
  onColumnLabelChange: (columnIndex: number, label: string) => void;
  onRemoveColumn: (columnIndex: number) => void;
  onDropCellType: (cell: SelectedCell, type: InteractiveTableCellType) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[520px] border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-100">
            {template.columns.map((column, columnIndex) => (
              <th
                key={column.id}
                className="border border-slate-200 p-1.5 text-left text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={decodeHtml(column.label)}
                    onChange={(event) =>
                      onColumnLabelChange(columnIndex, event.target.value)
                    }
                    className="h-7 border-slate-200 bg-white px-2 text-xs font-semibold"
                    aria-label={`Column ${columnIndex + 1} label`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveColumn(columnIndex)}
                    disabled={template.columns.length <= 1}
                    className="h-7 w-7 text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${column.label || "column"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </th>
            ))}
            <th className="w-11 border border-slate-200 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {template.rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, columnIndex) => (
                <td key={`${row.id}-${columnIndex}`} className="border border-slate-200 p-0 align-top">
                  <EditableTableCell
                    cell={cell}
                    selected={
                      selectedCell?.rowId === row.id &&
                      selectedCell.columnIndex === columnIndex
                    }
                    onClick={() => onSelectCell({ rowId: row.id, columnIndex })}
                    onDropCellType={(type) =>
                      onDropCellType({ rowId: row.id, columnIndex }, type)
                    }
                  />
                </td>
              ))}
              <td className="border border-slate-200 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemoveRow(row.id)}
                  disabled={template.rows.length <= 1}
                  className="text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${row.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModelAnswerEditor({
  cell,
  value,
  onChange,
}: {
  cell: InteractiveTableCell;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!isInteractiveTableFillableCell(cell)) return null;

  if (
    cell.type === "select" ||
    cell.type === "drop_zone" ||
    cell.type === "drop_expression"
  ) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Expected Answer</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Select expected answer" />
          </SelectTrigger>
          <SelectContent>
            {cell.options.map((option) => (
              <SelectItem key={option} value={option}>
                {decodeHtml(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Expected Answer</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 text-xs"
        inputMode={cell.type === "number_input" ? "decimal" : undefined}
      />
    </div>
  );
}

export function CellSettingsPanel({
  selectedLabel,
  cell,
  modelAnswer,
  onTypeChange,
  onCellChange,
  onModelAnswerChange,
}: {
  selectedLabel?: string;
  cell?: InteractiveTableCell;
  modelAnswer: string;
  onTypeChange: (type: InteractiveTableCellType) => void;
  onCellChange: (cell: InteractiveTableCell) => void;
  onModelAnswerChange: (value: string) => void;
}) {
  if (!cell) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-500">
        Select a cell to configure it.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div>
        <p className="text-xs font-semibold text-slate-700">
          {selectedLabel ?? "Selected cell"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Choose the cell type, then fill only the fields that apply.
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Cell Type</Label>
        <Select
          value={cell.type}
          onValueChange={(value: InteractiveTableCellType) => onTypeChange(value)}
        >
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CELL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(cell.type === "text" ||
        cell.type === "drag_item") && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">
            {cell.type === "drag_item"
                ? "Draggable Value"
                : "Text"}
          </Label>
          <Textarea
            value={decodeHtml(cell.value)}
            onChange={(event) => onCellChange({ ...cell, value: event.target.value })}
            className="min-h-20 text-xs"
          />
        </div>
      )}

      {isInteractiveTableFillableCell(cell) && (
        <>
          {(cell.type === "text_input" || cell.type === "number_input") && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Before Text</Label>
              <Input
                value={cell.before ?? ""}
                onChange={(event) =>
                  onCellChange({ ...cell, before: event.target.value })
                }
                className="h-8 text-xs"
                placeholder="e.g., D"
              />
            </div>
          )}
          {(cell.type === "text_input" || cell.type === "number_input") && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Hint Text</Label>
              <Input
                value={cell.placeholder ?? ""}
                onChange={(event) =>
                  onCellChange({ ...cell, placeholder: event.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          )}
          {cell.type === "drop_expression" && (
            <div className="space-y-1">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Before Text</Label>
                <Input
                  value={cell.before ?? ""}
                  onChange={(event) =>
                    onCellChange({ ...cell, before: event.target.value })
                  }
                  className="h-8 text-xs"
                  placeholder="e.g., D"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">After Text</Label>
                <Input
                  value={cell.after ?? ""}
                  onChange={(event) =>
                    onCellChange({ ...cell, after: event.target.value })
                  }
                  className="h-8 text-xs"
                  placeholder="e.g., 5"
                />
              </div>
              <div className="rounded border border-pink-200 bg-pink-50 p-2 text-[11px] text-pink-800">
                <p className="font-semibold">Accepted drops</p>
                <p className="mt-1">
                  {cell.options.length > 0
                    ? cell.options.join(", ")
                    : "Add draggable cells first."}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Answer Key</Label>
            <Input
              value={cell.id}
              onChange={(event) => onCellChange({ ...cell, id: event.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(cell.required)}
              onChange={(event) =>
                onCellChange({ ...cell, required: event.target.checked })
              }
            />
            Required
          </label>
        </>
      )}

      {cell.type === "select" && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Dropdown Options</Label>
          <Textarea
            value={cell.options.join("\n")}
            onChange={(event) =>
              onCellChange({
                ...cell,
                options: event.target.value
                  .split(/\r?\n/)
                  .map((option) => option.trim())
                  .filter(Boolean),
              })
            }
            className="min-h-24 text-xs"
            placeholder="One option per line"
          />
        </div>
      )}

      {cell.type === "drop_zone" && (
        <div className="rounded border border-pink-200 bg-pink-50 p-2 text-[11px] text-pink-800">
          <p className="font-semibold">Accepted drops</p>
          <p className="mt-1">
            {cell.options.length > 0 ? cell.options.join(", ") : "Add draggable cells first."}
          </p>
        </div>
      )}
      <ModelAnswerEditor
        cell={cell}
        value={modelAnswer}
        onChange={onModelAnswerChange}
      />
    </div>
  );
}

export function InteractiveTableBuilder({
  template,
  onChange,
}: InteractiveTableBuilderProps) {
  const normalizedTemplate = useMemo(
    () => normalizeInteractiveTableTemplate(template),
    [template]
  );
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>({
    rowId: normalizedTemplate.rows[0]?.id ?? "row_1",
    columnIndex: 0,
  });
  const validation = validateInteractiveTableTemplate(normalizedTemplate);

  const selectedRow = normalizedTemplate.rows.find(
    (row) => row.id === selectedCell?.rowId
  );
  const selectedCellValue =
    selectedRow && selectedCell
      ? selectedRow.cells[selectedCell.columnIndex]
      : undefined;
  const selectedColumn =
    selectedCell !== null ? normalizedTemplate.columns[selectedCell.columnIndex] : null;
  const selectedLabel =
    selectedRow && selectedColumn
      ? `${selectedRow.id} / ${selectedColumn.label || selectedColumn.id}`
      : undefined;

  const emit = (nextTemplate: InteractiveTableTemplate) => {
    onChange(reconcileModelAnswer(normalizeInteractiveTableTemplate(nextTemplate)));
  };

  const updateColumnLabel = (columnIndex: number, label: string) => {
    emit({
      ...normalizedTemplate,
      columns: normalizedTemplate.columns.map((column, index) =>
        index === columnIndex ? { ...column, label } : column
      ),
    });
  };

  const addColumn = () => {
    const nextIndex = normalizedTemplate.columns.length + 1;
    const existing = new Set(normalizedTemplate.columns.map((column) => column.id));
    const columnId = makeUniqueId(`column_${nextIndex}`, existing);
    emit({
      ...normalizedTemplate,
      columns: [
        ...normalizedTemplate.columns,
        { id: columnId, label: `Column ${nextIndex}` },
      ],
      rows: normalizedTemplate.rows.map((row) => ({
        ...row,
        cells: [...row.cells, emptyCell()],
      })),
    });
    setSelectedCell({
      rowId: normalizedTemplate.rows[0]?.id ?? "row_1",
      columnIndex: normalizedTemplate.columns.length,
    });
  };

  const removeColumn = (columnIndex: number) => {
    if (normalizedTemplate.columns.length <= 1) return;

    emit({
      ...normalizedTemplate,
      columns: normalizedTemplate.columns.filter((_, index) => index !== columnIndex),
      rows: normalizedTemplate.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== columnIndex),
      })),
    });
    if (selectedCell?.columnIndex === columnIndex) {
      setSelectedCell({
        rowId: normalizedTemplate.rows[0]?.id ?? "row_1",
        columnIndex: Math.max(0, columnIndex - 1),
      });
    }
  };

  const addRow = () => {
    const nextIndex = normalizedTemplate.rows.length + 1;
    const existing = new Set(normalizedTemplate.rows.map((row) => row.id));
    const rowId = makeUniqueId(`row_${nextIndex}`, existing);
    emit({
      ...normalizedTemplate,
      rows: [
        ...normalizedTemplate.rows,
        {
          id: rowId,
          cells: normalizedTemplate.columns.map(emptyCell),
        },
      ],
    });
    setSelectedCell({ rowId, columnIndex: 0 });
  };

  const removeRow = (rowId: string) => {
    if (normalizedTemplate.rows.length <= 1) return;
    emit({
      ...normalizedTemplate,
      rows: normalizedTemplate.rows.filter((row) => row.id !== rowId),
    });
    if (selectedCell?.rowId === rowId) {
      const fallback = normalizedTemplate.rows.find((row) => row.id !== rowId);
      setSelectedCell(
        fallback ? { rowId: fallback.id, columnIndex: selectedCell.columnIndex } : null
      );
    }
  };

  const updateCellAt = (
    targetCell: SelectedCell,
    nextCell: InteractiveTableCell
  ) => {
    let cell = nextCell;
    const targetRow = normalizedTemplate.rows.find(
      (row) => row.id === targetCell.rowId
    );
    const previousCell = targetRow?.cells[targetCell.columnIndex];

    if (isInteractiveTableFillableCell(nextCell)) {
      const existing = new Set(
        getFillableIds(normalizedTemplate).filter(
          (id) => !previousCell || !isInteractiveTableFillableCell(previousCell) || id !== previousCell.id
        )
      );
      cell = {
        ...nextCell,
        id: makeUniqueId(nextCell.id, existing),
      } as InteractiveTableCell;
    }

    const nextTemplate = {
      ...normalizedTemplate,
      rows: normalizedTemplate.rows.map((row) =>
        row.id === targetCell.rowId
          ? {
              ...row,
              cells: row.cells.map((item, index) =>
                index === targetCell.columnIndex ? cell : item
              ),
            }
          : row
      ),
    };

    let modelAnswer = { ...nextTemplate.modelAnswer };
    if (
      previousCell &&
      isInteractiveTableFillableCell(previousCell) &&
      isInteractiveTableFillableCell(cell) &&
      previousCell.id !== cell.id
    ) {
      modelAnswer[cell.id] = modelAnswer[previousCell.id] ?? "";
      delete modelAnswer[previousCell.id];
    }

    emit({ ...nextTemplate, modelAnswer });
  };

  const updateSelectedCell = (nextCell: InteractiveTableCell) => {
    if (!selectedCell) return;
    updateCellAt(selectedCell, nextCell);
  };

  const updateSelectedCellType = (type: InteractiveTableCellType) => {
    if (!selectedCell) return;

    const fillableIds = new Set(getFillableIds(normalizedTemplate));
    const generatedId = makeUniqueId(
      `${type}_${selectedCell.rowId}_${selectedCell.columnIndex + 1}`,
      fillableIds
    );
    updateSelectedCell(createCellForType(type, generatedId));
  };

  const dropCellType = (targetCell: SelectedCell, type: InteractiveTableCellType) => {
    const fillableIds = new Set(getFillableIds(normalizedTemplate));
    const generatedId = makeUniqueId(
      `${type}_${targetCell.rowId}_${targetCell.columnIndex + 1}`,
      fillableIds
    );
    setSelectedCell(targetCell);
    updateCellAt(targetCell, createCellForType(type, generatedId));
  };

  const updateModelAnswer = (value: string) => {
    if (!selectedCellValue || !isInteractiveTableFillableCell(selectedCellValue)) {
      return;
    }
    emit({
      ...normalizedTemplate,
      modelAnswer: {
        ...normalizedTemplate.modelAnswer,
        [selectedCellValue.id]: value,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold text-slate-700">
            Interactive Table Builder
          </Label>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span>{normalizedTemplate.columns.length} columns</span>
            <span>{normalizedTemplate.rows.length} rows</span>
            <span>{getFillableIds(normalizedTemplate).length} answer cells</span>
          </div>
        </div>
        <TableSizeControls onAddColumn={addColumn} onAddRow={addRow} />
      </div>

      {validation.errors.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Fix before saving:</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <EditableTableCanvas
          template={normalizedTemplate}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
          onRemoveRow={removeRow}
          onColumnLabelChange={updateColumnLabel}
          onRemoveColumn={removeColumn}
          onDropCellType={dropCellType}
        />

        <CellSettingsPanel
          selectedLabel={selectedLabel}
          cell={selectedCellValue}
          modelAnswer={
            selectedCellValue && isInteractiveTableFillableCell(selectedCellValue)
              ? normalizedTemplate.modelAnswer[selectedCellValue.id] ?? ""
              : ""
          }
          onTypeChange={updateSelectedCellType}
          onCellChange={updateSelectedCell}
          onModelAnswerChange={updateModelAnswer}
        />
      </div>
    </div>
  );
}
