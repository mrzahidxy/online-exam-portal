import { HttpError } from '../utils/http-error';

const SUPPORTED_CELL_TYPES = new Set([
  'text',
  'drag_item',
  'drop_zone',
  'drop_expression',
  'text_input',
  'number_input',
  'select',
  'empty',
]);

const FILLABLE_CELL_TYPES = new Set([
  'text_input',
  'number_input',
  'select',
  'drop_zone',
  'drop_expression',
]);

type FillableCell = {
  id: string;
  type: 'text_input' | 'number_input' | 'select' | 'drop_zone' | 'drop_expression';
  required: boolean;
  options?: string[];
};

type TemplateMetadata = {
  fillableCells: Map<string, FillableCell>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const fail = (message: string): never => {
  throw new HttpError(400, message);
};

const assertUniqueStringId = (
  value: unknown,
  seen: Set<string>,
  message: string
) => {
  if (typeof value !== 'string') {
    fail(message);
  }

  const id = value as string;
  if (id.trim().length === 0 || seen.has(id)) {
    fail(message);
  }

  seen.add(id);
  return id;
};

export const validateInteractiveTableTemplate = (
  template: unknown
): TemplateMetadata => {
  if (!isPlainObject(template)) {
    fail('Interactive table template is required');
  }

  const data = template as Record<string, unknown>;

  if (data.version !== 1) {
    fail('Interactive table template version must be 1');
  }

  if (!Array.isArray(data.columns) || data.columns.length === 0) {
    fail('Interactive table template columns must be a non-empty array');
  }

  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    fail('Interactive table template rows must be a non-empty array');
  }

  const columns = data.columns as unknown[];
  const rows = data.rows as unknown[];
  const columnIds = new Set<string>();
  for (const column of columns) {
    if (!isPlainObject(column)) {
      fail('Interactive table columns must be objects');
    }
    const columnData = column as Record<string, unknown>;

    assertUniqueStringId(
      columnData.id,
      columnIds,
      'Interactive table column ids must be unique strings'
    );

    if (typeof columnData.label !== 'string') {
      fail('Interactive table column labels must be strings');
    }
  }

  const rowIds = new Set<string>();
  const fillableCells = new Map<string, FillableCell>();

  for (const row of rows) {
    if (!isPlainObject(row)) {
      fail('Interactive table rows must be objects');
    }
    const rowData = row as Record<string, unknown>;

    assertUniqueStringId(
      rowData.id,
      rowIds,
      'Interactive table row ids must be unique strings'
    );

    if (!Array.isArray(rowData.cells) || rowData.cells.length !== columns.length) {
      fail('Each interactive table row must have one cell per column');
    }

    for (const cell of rowData.cells as unknown[]) {
      if (!isPlainObject(cell)) {
        fail('Interactive table cells must be objects');
      }
      const cellData = cell as Record<string, unknown>;

      if (typeof cellData.type !== 'string' || !SUPPORTED_CELL_TYPES.has(cellData.type)) {
        fail('Interactive table cell type is not supported');
      }

      const cellType = cellData.type as string;

      if (cellType === 'text' || cellType === 'drag_item') {
        if (typeof cellData.value !== 'string') {
          fail('Interactive table text cells require a string value');
        }
        continue;
      }

      if (!FILLABLE_CELL_TYPES.has(cellType)) {
        continue;
      }

      if (typeof cellData.id !== 'string' || cellData.id.trim().length === 0) {
        fail('Interactive table fillable cells require a string id');
      }

      if (
        (cellType === 'text_input' || cellType === 'number_input') &&
        ((cellData.before !== undefined && typeof cellData.before !== 'string') ||
          (cellData.after !== undefined && typeof cellData.after !== 'string'))
      ) {
        fail('Interactive table input before/after values must be strings');
      }

      const cellId = cellData.id as string;
      if (fillableCells.has(cellId)) {
        fail('Interactive table fillable cell ids must be unique');
      }

      if (cellType === 'drop_expression') {
        if (
          typeof cellData.before !== 'string' ||
          typeof cellData.after !== 'string'
        ) {
          fail('Interactive table drop_expression cells require before and after strings');
        }
      }

      if (cellType === 'select' || cellType === 'drop_zone' || cellType === 'drop_expression') {
        if (
          !Array.isArray(cellData.options) ||
          cellData.options.length === 0 ||
          (cellData.options as unknown[]).some((option) => typeof option !== 'string')
        ) {
          fail('Interactive table select/drop cells require non-empty string options');
        }
      }

      fillableCells.set(cellId, {
        id: cellId,
        type: cellType as FillableCell['type'],
        required: cellData.required === true,
        options:
          cellType === 'select' ||
          cellType === 'drop_zone' ||
          cellType === 'drop_expression'
            ? (cellData.options as string[])
            : undefined,
      });
    }
  }

  if (data.modelAnswer !== undefined) {
    if (!isPlainObject(data.modelAnswer)) {
      fail('Interactive table modelAnswer must be an object');
    }
    const modelAnswer = data.modelAnswer as Record<string, unknown>;

    for (const [key, value] of Object.entries(modelAnswer)) {
      if (!fillableCells.has(key)) {
        fail('Interactive table modelAnswer keys must match fillable cell ids');
      }
      if (typeof value !== 'string') {
        fail('Interactive table modelAnswer values must be strings');
      }
    }
  }

  return { fillableCells };
};

export const validateInteractiveTableTemplateForQuestionType = (
  questionType: string,
  template: unknown
) => {
  if (questionType === 'INTERACTIVE_TABLE') {
    validateInteractiveTableTemplate(template);
  }
};

const parseAnswerText = (answerText: string): unknown => {
  try {
    return JSON.parse(answerText);
  } catch {
    fail('Interactive table answerText must be valid JSON');
  }
};

const isEmptyValue = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim().length === 0);

const isNumericValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return Number.isFinite(Number(value));
  }

  return false;
};

export const validateInteractiveTableAnswer = (
  answerText: string,
  template: unknown
) => {
  const { fillableCells } = validateInteractiveTableTemplate(template);
  const answer = parseAnswerText(answerText);

  if (!isPlainObject(answer)) {
    fail('Interactive table answer must be an object');
  }

  const data = answer as Record<string, unknown>;

  if (data.version !== 1) {
    fail('Interactive table answer version must be 1');
  }

  if (!isPlainObject(data.values)) {
    fail('Interactive table answer values must be an object');
  }

  const values = data.values as Record<string, unknown>;
  for (const key of Object.keys(values)) {
    const cell = fillableCells.get(key);
    if (!cell) {
      fail('Interactive table answer keys must match fillable cell ids');
      continue;
    }

    const value = values[key];
    if (isEmptyValue(value)) {
      continue;
    }

    if (
      cell.type === 'select' ||
      cell.type === 'drop_zone' ||
      cell.type === 'drop_expression'
    ) {
      if (typeof value !== 'string' || !cell.options?.includes(value)) {
        fail('Interactive table select/drop value must be one of the cell options');
      }
    }

    if (cell.type === 'number_input' && !isNumericValue(value)) {
      fail('Interactive table number_input value must be numeric');
    }

    if (cell.type === 'text_input' && typeof value !== 'string') {
      fail('Interactive table text_input value must be a string');
    }
  }

  for (const cell of fillableCells.values()) {
    if (cell.required && isEmptyValue(values[cell.id])) {
      fail('Interactive table required fields cannot be empty');
    }
  }
};
