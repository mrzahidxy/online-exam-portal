"use client";

import he from "he";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
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

type BuilderCellType = InteractiveTableCellType | "standard_form";

type StandardFormParts = {
  coefficient: string;
  base: string;
  power: string;
};

const CELL_TYPES: Array<{ value: BuilderCellType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "drag_item", label: "Draggable" },
  { value: "drop_zone", label: "Drop blank" },
  { value: "text_input", label: "Input blank" },
  { value: "standard_form", label: "Standard form" },
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

const parseStandardFormValue = (value: string): StandardFormParts => {
  try {
    const parsed = JSON.parse(value) as Partial<StandardFormParts>;
    if (parsed && typeof parsed === "object") {
      return {
        coefficient: String(parsed.coefficient ?? ""),
        base: String(parsed.base ?? ""),
        power: String(parsed.power ?? ""),
      };
    }
  } catch {
    // Keep older plain-text answers editable.
  }

  const match = value.trim().match(/^(.+?)\s*x\s*(.+?)(?:\^(.+))?$/i);
  return {
    coefficient: match?.[1]?.trim() ?? "",
    base: match?.[2]?.trim() ?? "",
    power: match?.[3]?.trim() ?? "",
  };
};

const serializeStandardFormValue = ({
  coefficient,
  base,
  power,
}: StandardFormParts) => {
  if (!coefficient && !base && !power) return "";
  return JSON.stringify({ coefficient, base, power });
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
  type: BuilderCellType,
  id: string
): InteractiveTableCell => {
  if (type === "standard_form") {
    return {
      type: "text_input",
      id,
      format: "standard_form",
      before: "",
      placeholder: "",
      required: false,
    };
  }

  if (type === "text" || type === "drag_item") {
    return { type, value: "" };
  }
  if (type === "text_input" || type === "number_input") {
    return { type, id, before: "", placeholder: "", required: false };
  }
  if (type === "drop_zone") {
    return {
      type,
      id,
      before: "",
      after: "",
      options: ["Option 1"],
      placeholder: "Drop here",
      required: false,
    };
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
      <Label className="text-xs font-semibold text-slate-700">Cells</Label>
      <div className="mt-2 grid grid-cols-2 gap-1.5 xl:grid-cols-1">
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

function EditableCellPreview({ cell }: { cell: InteractiveTableCell }) {
  if (cell.type === "empty") {
    return <div className="min-h-12" />;
  }

  if (cell.type === "text") {
    return (
      <div className="min-h-12 whitespace-pre-wrap px-2.5 py-2 text-sm text-slate-900">
        {decodeHtml(cell.value)}
      </div>
    );
  }

  if (cell.type === "drag_item") {
    return (
      <div className="flex min-h-12 items-center justify-center px-2.5 py-2">
        <span className="inline-flex min-w-10 items-center justify-center rounded border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold text-slate-900 shadow-sm">
          {decodeHtml(cell.value) || "-"}
        </span>
      </div>
    );
  }

  if (cell.type === "drop_zone") {
    const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
    return (
      <div
        className={cn(
          "min-h-12 bg-pink-50 p-1.5",
          hasInlineText && "flex items-center justify-center gap-2 bg-white text-lg text-slate-900"
        )}
      >
        {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
        <span className="inline-flex min-h-9 min-w-16 items-center justify-center rounded-sm border border-pink-300 bg-pink-100 px-3 py-1 text-sm text-pink-700" />
        {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
      </div>
    );
  }

  if (cell.type === "text_input" || cell.type === "number_input") {
    if (cell.format === "standard_form") {
      const blankClass =
        "inline-flex h-8 rounded-sm border border-pink-300 bg-pink-100";
      return (
        <div className="flex min-h-12 items-center justify-center gap-1 px-2.5 py-2 text-lg text-slate-900">
          <span className={cn(blankClass, "w-14")} />
          <span>x</span>
          <span className={cn(blankClass, "w-14")} />
          <span className={cn(blankClass, "-mt-5 h-7 w-9")} />
        </div>
      );
    }

    return (
      <div className="flex min-h-12 items-center justify-center gap-2 px-2.5 py-2 text-lg text-slate-900">
        {cell.before ? (
          <span className="text-sm font-medium text-slate-700">
            {decodeHtml(cell.before)}
          </span>
        ) : null}
        <span className="inline-flex h-9 min-w-24 rounded-sm border border-pink-300 bg-pink-100" />
      </div>
    );
  }

  return <div className="min-h-12" />;
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
  onDropCellType: (type: BuilderCellType) => void;
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
        ) as BuilderCellType;
        if (!CELL_TYPES.some((item) => item.value === type)) return;
        event.preventDefault();
        onDropCellType(type);
      }}
      className={cn(
        "min-h-14 w-full text-left text-xs transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected && "bg-blue-50 ring-2 ring-blue-500"
      )}
    >
      <EditableCellPreview cell={cell} />
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
  onDropCellType: (cell: SelectedCell, type: BuilderCellType) => void;
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

function StandardFormModelAnswerEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = parseStandardFormValue(value);
  const updatePart = (key: keyof StandardFormParts, nextValue: string) => {
    onChange(serializeStandardFormValue({ ...parts, [key]: nextValue }));
  };
  const inputClass =
    "h-8 rounded-sm border-pink-300 bg-pink-50 px-2 text-center text-xs";

  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Expected Answer</Label>
      <div className="flex items-center gap-1">
        <Input
          value={parts.coefficient}
          onChange={(event) => updatePart("coefficient", event.target.value)}
          className={cn(inputClass, "w-16")}
          aria-label="Expected coefficient"
        />
        <span className="text-sm text-slate-700">x</span>
        <Input
          value={parts.base}
          onChange={(event) => updatePart("base", event.target.value)}
          className={cn(inputClass, "w-16")}
          aria-label="Expected base"
        />
        <Input
          value={parts.power}
          onChange={(event) => updatePart("power", event.target.value)}
          className={cn(inputClass, "-mt-4 h-7 w-12")}
          aria-label="Expected power"
        />
      </div>
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
    (cell.type === "text_input" || cell.type === "number_input") &&
    cell.format === "standard_form"
  ) {
    return <StandardFormModelAnswerEditor value={value} onChange={onChange} />;
  }

  if (
    cell.type === "drop_zone" ||
    cell.type === "drop_expression"
  ) {
    const optionValues = cell.options;
    return (
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Expected Answer</Label>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 text-xs"
          list={optionValues.length > 0 ? `${cell.id}-options` : undefined}
        />
        {optionValues.length > 0 ? (
          <datalist id={`${cell.id}-options`}>
            {optionValues.map((option) => (
              <option key={option} value={option}>
                {decodeHtml(option)}
              </option>
            ))}
          </datalist>
        ) : null}
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
  onCellChange,
  onModelAnswerChange,
}: {
  selectedLabel?: string;
  cell?: InteractiveTableCell;
  modelAnswer: string;
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
            <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={cell.format === "standard_form"}
                onChange={(event) =>
                  onCellChange({
                    ...cell,
                    format: event.target.checked ? "standard_form" : undefined,
                    before: event.target.checked ? "" : cell.before,
                    placeholder: event.target.checked ? "" : cell.placeholder,
                  })
                }
              />
              Standard form boxes
            </label>
          )}
          {(cell.type === "text_input" ||
            cell.type === "number_input" ||
            cell.type === "drop_zone") && (
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
          {cell.type === "drop_zone" && (
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
          )}
          {(cell.type === "text_input" ||
            cell.type === "number_input" ||
            cell.type === "drop_zone") && (
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

  const dropCellType = (targetCell: SelectedCell, type: BuilderCellType) => {
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

        <div className="space-y-3">
          <CellTypePalette />
          <CellSettingsPanel
            selectedLabel={selectedLabel}
            cell={selectedCellValue}
            modelAnswer={
              selectedCellValue && isInteractiveTableFillableCell(selectedCellValue)
                ? normalizedTemplate.modelAnswer[selectedCellValue.id] ?? ""
                : ""
            }
            onCellChange={updateSelectedCell}
            onModelAnswerChange={updateModelAnswer}
          />
        </div>
      </div>
    </div>
  );
}
