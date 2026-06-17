export type InteractiveTableCellType =
  | "text"
  | "drag_item"
  | "drop_zone"
  | "drop_expression"
  | "text_input"
  | "number_input"
  | "select"
  | "empty";

export type InteractiveTableColumn = {
  id: string;
  label: string;
};

export type InteractiveTableTextCell = {
  type: "text";
  value: string;
};

export type InteractiveTableDragItemCell = {
  type: "drag_item";
  value: string;
};

export type InteractiveTableEmptyCell = {
  type: "empty";
};

export type InteractiveTableInputCell = {
  type: "text_input" | "number_input";
  id: string;
  before?: string;
  after?: string;
  format?: "standard_form";
  placeholder?: string;
  required?: boolean;
};

export type InteractiveTableSelectCell = {
  type: "select";
  id: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
};

export type InteractiveTableDropZoneCell = {
  type: "drop_zone";
  id: string;
  before?: string;
  after?: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
};

export type InteractiveTableDropExpressionCell = {
  type: "drop_expression";
  id: string;
  before: string;
  after: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
};

export type InteractiveTableCell =
  | InteractiveTableTextCell
  | InteractiveTableDragItemCell
  | InteractiveTableEmptyCell
  | InteractiveTableInputCell
  | InteractiveTableSelectCell
  | InteractiveTableDropZoneCell
  | InteractiveTableDropExpressionCell;

export type InteractiveTableRow = {
  id: string;
  cells: InteractiveTableCell[];
};

export type InteractiveTableTemplate = {
  version: 1;
  columns: InteractiveTableColumn[];
  rows: InteractiveTableRow[];
  modelAnswer: Record<string, string>;
};

export type InteractiveTableAnswer = {
  version: 1;
  values: Record<string, string>;
};

export type InteractiveTableTemplateValidation = {
  valid: boolean;
  errors: string[];
};

const DEFAULT_TEMPLATE: InteractiveTableTemplate = {
  version: 1,
  columns: [{ id: "statement", label: "Statement" }],
  rows: [
    {
      id: "row_1",
      cells: [{ type: "text", value: "" }],
    },
  ],
  modelAnswer: {},
};

const cloneCell = (cell: InteractiveTableCell): InteractiveTableCell => {
  if (
    cell.type === "select" ||
    cell.type === "drop_zone" ||
    cell.type === "drop_expression"
  ) {
    return { ...cell, options: [...cell.options] };
  }
  return { ...cell };
};

export const createDefaultInteractiveTableTemplate =
  (): InteractiveTableTemplate => ({
    version: 1,
    columns: DEFAULT_TEMPLATE.columns.map((column) => ({ ...column })),
    rows: DEFAULT_TEMPLATE.rows.map((row) => ({
      ...row,
      cells: row.cells.map(cloneCell),
    })),
    modelAnswer: { ...DEFAULT_TEMPLATE.modelAnswer },
  });

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const safeId = (value: unknown, fallback: string) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || fallback;
};

const normalizeCell = (
  value: unknown,
  fallbackId: string
): InteractiveTableCell => {
  if (!value || typeof value !== "object") {
    return { type: "empty" };
  }

  const cell = value as Record<string, unknown>;
  const type = cell.type;

  if (type === "text" || type === "math_text" || type === "drag_item") {
    return {
      type: type === "math_text" ? "text" : type,
      value: String(cell.value ?? ""),
    };
  }

  if (type === "text_input" || type === "number_input") {
    return {
      type,
      id: safeId(cell.id, fallbackId),
      before: String(cell.before ?? ""),
      after: String(cell.after ?? ""),
      format: cell.format === "standard_form" ? "standard_form" : undefined,
      placeholder: String(cell.placeholder ?? ""),
      required: Boolean(cell.required),
    };
  }

  if (type === "select" || type === "drop_zone") {
    const options = Array.isArray(cell.options)
      ? cell.options.map((option) => String(option ?? "").trim()).filter(Boolean)
      : [];

    return {
      type,
      id: safeId(cell.id, fallbackId),
      ...(type === "drop_zone"
        ? {
            before: String(cell.before ?? ""),
            after: String(cell.after ?? ""),
          }
        : {}),
      options,
      placeholder: String(cell.placeholder ?? ""),
      required: Boolean(cell.required),
    };
  }

  if (type === "drop_expression") {
    const options = Array.isArray(cell.options)
      ? cell.options.map((option) => String(option ?? "").trim()).filter(Boolean)
      : [];

    return {
      type: "drop_expression",
      id: safeId(cell.id, fallbackId),
      before: String(cell.before ?? ""),
      after: String(cell.after ?? ""),
      options,
      placeholder: String(cell.placeholder ?? ""),
      required: Boolean(cell.required),
    };
  }

  return { type: "empty" };
};

export const isInteractiveTableFillableCell = (
  cell: InteractiveTableCell
): cell is
  | InteractiveTableInputCell
  | InteractiveTableSelectCell
  | InteractiveTableDropZoneCell
  | InteractiveTableDropExpressionCell =>
  cell.type === "text_input" ||
  cell.type === "number_input" ||
  cell.type === "select" ||
  cell.type === "drop_zone" ||
  cell.type === "drop_expression";

export const getInteractiveTableFillableCellIds = (
  template: InteractiveTableTemplate
) =>
  template.rows
    .flatMap((row) => row.cells)
    .filter(isInteractiveTableFillableCell)
    .map((cell) => cell.id);

export const normalizeInteractiveTableTemplate = (
  value?: unknown
): InteractiveTableTemplate => {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== "object") {
    return createDefaultInteractiveTableTemplate();
  }

  const template = parsed as Record<string, unknown>;
  const rawColumns = Array.isArray(template.columns) ? template.columns : [];
  const columns = rawColumns
    .map((column, index) => {
      const item = column as Record<string, unknown>;
      return {
        id: safeId(item.id, `column_${index + 1}`),
        label: String(item.label ?? `Column ${index + 1}`),
      };
    })
    .filter((column) => column.id);

  const normalizedColumns =
    columns.length > 0
      ? columns
      : createDefaultInteractiveTableTemplate().columns;

  const rawRows = Array.isArray(template.rows) ? template.rows : [];
  const rows = rawRows
    .map((row, rowIndex) => {
      const item = row as Record<string, unknown>;
      const rawCells = Array.isArray(item.cells) ? item.cells : [];
      return {
        id: safeId(item.id, `row_${rowIndex + 1}`),
        cells: Array.from({ length: normalizedColumns.length }, (_, cellIndex) =>
          normalizeCell(rawCells[cellIndex], `cell_${rowIndex + 1}_${cellIndex + 1}`)
        ),
      };
    })
    .filter((row) => row.id);

  const normalizedRows =
    rows.length > 0 ? rows : createDefaultInteractiveTableTemplate().rows;

  const fillableIds = new Set(
    normalizedRows
      .flatMap((row) => row.cells)
      .filter(isInteractiveTableFillableCell)
      .map((cell) => cell.id)
  );

  const sourceModelAnswer =
    template.modelAnswer && typeof template.modelAnswer === "object"
      ? (template.modelAnswer as Record<string, unknown>)
      : {};
  const modelAnswer = Object.fromEntries(
    Object.entries(sourceModelAnswer)
      .filter(([key]) => fillableIds.has(key))
      .map(([key, modelValue]) => [key, String(modelValue ?? "")])
  );

  return {
    version: 1,
    columns: normalizedColumns,
    rows: normalizedRows.map((row) => ({
      ...row,
      cells: Array.from({ length: normalizedColumns.length }, (_, index) =>
        row.cells[index] ? cloneCell(row.cells[index]) : { type: "empty" }
      ),
    })),
    modelAnswer,
  };
};

export const createEmptyInteractiveTableAnswer = (
  template?: InteractiveTableTemplate
): InteractiveTableAnswer => {
  const values = Object.fromEntries(
    template ? getInteractiveTableFillableCellIds(template).map((id) => [id, ""]) : []
  );
  return { version: 1, values };
};

export const normalizeInteractiveTableAnswer = (
  value?: unknown,
  template?: InteractiveTableTemplate
): InteractiveTableAnswer => {
  const parsed = parseMaybeJson(value);
  const source =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : undefined;
  const rawValues =
    source?.values && typeof source.values === "object"
      ? (source.values as Record<string, unknown>)
      : {};
  const allowedIds = template
    ? new Set(getInteractiveTableFillableCellIds(template))
    : null;

  const values = Object.fromEntries(
    Object.entries(rawValues)
      .filter(([key]) => !allowedIds || allowedIds.has(key))
      .map(([key, answerValue]) => [key, String(answerValue ?? "")])
  );

  return { version: 1, values };
};

export const parseInteractiveTableAnswer = (
  value?: string | null,
  template?: InteractiveTableTemplate
) => normalizeInteractiveTableAnswer(value, template);

export const serializeInteractiveTableAnswer = (
  answer: InteractiveTableAnswer
) =>
  JSON.stringify({
    version: 1,
    values: answer.values,
  });

export const getInteractiveTableAnswerHasValue = (
  value?: string | null,
  template?: InteractiveTableTemplate
) => {
  const answer = parseInteractiveTableAnswer(value, template);
  return Object.values(answer.values).some((item) => item.trim().length > 0);
};

export const validateInteractiveTableTemplate = (
  value: InteractiveTableTemplate
): InteractiveTableTemplateValidation => {
  const template = normalizeInteractiveTableTemplate(value);
  const errors: string[] = [];

  if (template.columns.length === 0) {
    errors.push("At least one column is required.");
  }
  if (template.rows.length === 0) {
    errors.push("At least one row is required.");
  }

  template.rows.forEach((row, rowIndex) => {
    if (row.cells.length !== template.columns.length) {
      errors.push(`Row ${rowIndex + 1} must have one cell per column.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
