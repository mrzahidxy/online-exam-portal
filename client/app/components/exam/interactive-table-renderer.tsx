"use client";

import he from "he";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEmptyInteractiveTableAnswer,
  isInteractiveTableFillableCell,
  normalizeInteractiveTableTemplate,
  parseInteractiveTableAnswer,
  serializeInteractiveTableAnswer,
  type InteractiveTableAnswer,
  type InteractiveTableCell,
  type InteractiveTableTemplate,
} from "@/lib/interactive-table";
import { cn } from "@/lib/utils";

export type InteractiveTableRendererMode = "student" | "review" | "preview";

type InteractiveTableRendererProps = {
  template?: InteractiveTableTemplate | null;
  value?: string | null;
  onChange?: (value: string) => void;
  mode: InteractiveTableRendererMode;
  readonly?: boolean;
  className?: string;
};

type InteractiveTableCellRendererProps = {
  cell: InteractiveTableCell;
  value: string;
  mode: InteractiveTableRendererMode;
  readonly: boolean;
  onValueChange: (value: string) => void;
};

const MISSING_LABEL = "No answer";
const decodeHtml = (value?: string | null) => (value ? he.decode(value) : "");
const isCompactBlankCell = (cell: InteractiveTableCell) =>
  isInteractiveTableFillableCell(cell) &&
  (cell.type === "text_input" || cell.type === "number_input") &&
  cell.format !== "standard_form" &&
  !cell.before?.trim() &&
  !cell.after?.trim();

const parseStandardFormValue = (value: string) => {
  try {
    const parsed = JSON.parse(value) as Partial<{
      coefficient: unknown;
      base: unknown;
      power: unknown;
      exponent: unknown;
    }>;

    if (parsed && typeof parsed === "object") {
      return {
        coefficient: String(parsed.coefficient ?? ""),
        base: String(parsed.base ?? ""),
        power: String(parsed.power ?? parsed.exponent ?? ""),
      };
    }
  } catch {
    // Older answers used a display string; keep reading them.
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
}: {
  coefficient: string;
  base: string;
  power: string;
}) => {
  if (!coefficient && !base && !power) return "";
  return JSON.stringify({ coefficient, base, power });
};

function StandardFormInput({
  value,
  readonly,
  preview = false,
  onValueChange,
}: {
  value: string;
  readonly: boolean;
  preview?: boolean;
  onValueChange: (value: string) => void;
}) {
  const parts = parseStandardFormValue(value);
  const updatePart = (
    key: "coefficient" | "base" | "power",
    nextValue: string
  ) => {
    onValueChange(serializeStandardFormValue({ ...parts, [key]: nextValue }));
  };

  const inputClass =
    "h-8 rounded-sm border border-pink-300 bg-pink-100 px-2 text-center text-base shadow-none focus-visible:ring-1";

  if (preview) {
    return (
      <div className="flex min-h-14 items-center justify-center gap-1 px-3 py-2">
        <span className={cn(inputClass, "inline-flex w-14 items-center justify-center")} />
        <span className="text-xl text-foreground">x</span>
        <span className={cn(inputClass, "inline-flex w-14 items-center justify-center")} />
        <span className={cn(inputClass, "-mt-5 inline-flex h-7 w-9 items-center justify-center text-sm")} />
      </div>
    );
  }

  if (readonly) {
    return (
      <div className="flex min-h-14 items-center justify-center gap-1 px-3 py-2 text-lg text-foreground">
        <span>{parts.coefficient || MISSING_LABEL}</span>
        <span>x</span>
        <span>{parts.base}</span>
        {parts.power ? <sup className="text-sm">{parts.power}</sup> : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-14 items-center justify-center gap-1 px-3 py-2">
      <Input
        type="text"
        inputMode="decimal"
        value={parts.coefficient}
        onChange={(event) => updatePart("coefficient", event.target.value)}
        aria-label="Coefficient"
        className={cn(inputClass, "w-14")}
      />
      <span className="text-xl text-foreground">x</span>
      <Input
        type="text"
        inputMode="decimal"
        value={parts.base}
        onChange={(event) => updatePart("base", event.target.value)}
        aria-label="Base"
        className={cn(inputClass, "w-14")}
      />
      <Input
        type="text"
        inputMode="numeric"
        value={parts.power}
        onChange={(event) => updatePart("power", event.target.value)}
        aria-label="Power"
        className={cn(inputClass, "-mt-5 h-7 w-9 text-sm")}
      />
    </div>
  );
}

const getAnswerValue = (
  answer: InteractiveTableAnswer,
  cell: InteractiveTableCell
) => (isInteractiveTableFillableCell(cell) ? answer.values[cell.id] ?? "" : "");

export function InteractiveTableCellRenderer({
  cell,
  value,
  mode,
  readonly,
  onValueChange,
}: InteractiveTableCellRendererProps) {
  const isReview = mode === "review";
  const isPreview = mode === "preview";

  if (cell.type === "empty") {
    return <div className="min-h-9" aria-label="Blank cell" />;
  }

  if (cell.type === "text") {
    return (
      <div className="min-h-14 whitespace-pre-wrap px-3 py-3 text-base text-foreground">
        {decodeHtml(cell.value)}
      </div>
    );
  }

  if (cell.type === "drag_item") {
    return (
      <div className="min-h-9 px-2.5 py-2">
        <span
          draggable={!readonly && cell.value.trim().length > 0}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", cell.value);
            event.dataTransfer.effectAllowed = "copy";
          }}
          className={cn(
            "inline-flex min-w-10 items-center justify-center rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm",
            !readonly && "cursor-grab active:cursor-grabbing"
          )}
        >
          {decodeHtml(cell.value) || "-"}
        </span>
      </div>
    );
  }

  if (!isInteractiveTableFillableCell(cell)) {
    return null;
  }

  if (isPreview) {
    if (cell.type === "select") {
      return (
        <div className="flex min-h-12 items-center px-2.5 py-2">
          <div className="w-full rounded-sm border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
            {decodeHtml(cell.placeholder) || "Select"}
          </div>
        </div>
      );
    }

    if (cell.type === "drop_zone") {
      const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
      return (
        <div
          className={cn(
            "min-h-10 bg-pink-50 p-1.5",
            hasInlineText && "flex items-center justify-center gap-2 bg-white text-lg text-foreground"
          )}
        >
          {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
          <div className="flex min-h-8 min-w-14 items-center justify-center rounded-sm border border-dashed border-pink-300 bg-pink-100 px-2.5 py-1.5 text-sm text-pink-700">
            {decodeHtml(cell.placeholder) || "Drop here"}
          </div>
          {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
        </div>
      );
    }

    if (cell.type === "drop_expression") {
      return (
        <div className="flex min-h-12 flex-wrap items-center justify-center gap-2 px-2.5 py-2 text-lg text-foreground">
          {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
          <span className="inline-flex min-h-9 min-w-14 items-center justify-center rounded-sm border border-dashed border-pink-300 bg-pink-100 px-3 py-1 text-base text-pink-700">
            {decodeHtml(cell.placeholder) || ""}
          </span>
          {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
        </div>
      );
    }

    const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
    if (cell.format === "standard_form") {
      return (
        <StandardFormInput
          value=""
          readonly
          preview
          onValueChange={() => undefined}
        />
      );
    }
    return (
      <div
        className={cn(
          "flex min-h-14 items-center gap-2 px-3 py-2 text-lg text-foreground",
          hasInlineText ? "justify-center" : "bg-pink-100"
        )}
      >
        {cell.before?.trim() ? (
          <span className="text-base text-foreground">{decodeHtml(cell.before)}</span>
        ) : null}
        {hasInlineText ? (
          <div className="h-9 min-w-24 rounded-sm border border-pink-300 bg-pink-100" />
        ) : null}
        {cell.after?.trim() ? (
          <span className="text-base text-foreground">{decodeHtml(cell.after)}</span>
        ) : null}
      </div>
    );
  }

  if (isReview) {
    if (cell.type === "select") {
      return (
        <div className="flex min-h-12 items-center px-2.5 py-2">
          <div
            className={cn(
              "w-full rounded-sm border px-2 py-1.5 text-sm",
              value.trim()
                ? "border-border bg-white text-foreground"
                : "border-dashed border-amber-300 bg-amber-50 text-amber-700"
            )}
          >
            {value.trim() || MISSING_LABEL}
          </div>
        </div>
      );
    }

    if (cell.type === "drop_zone") {
      const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
      return (
        <div
          className={cn(
            "min-h-10 bg-pink-50 p-1.5",
            hasInlineText && "flex items-center justify-center gap-2 bg-white text-lg text-foreground"
          )}
        >
          {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
          <div
            className={cn(
              "flex min-h-8 min-w-14 items-center justify-center rounded-sm border px-2.5 py-1.5 text-sm",
              value.trim()
                ? "border-pink-300 bg-white text-foreground"
                : "border-dashed border-amber-300 bg-amber-50 text-amber-700"
            )}
          >
            {value.trim() || MISSING_LABEL}
          </div>
          {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
        </div>
      );
    }

    if (cell.type === "drop_expression") {
      return (
        <div className="flex min-h-12 flex-wrap items-center justify-center gap-2 px-2.5 py-2 text-lg text-foreground">
          {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
          <span
            className={cn(
              "inline-flex min-h-9 min-w-14 items-center justify-center rounded-sm border px-3 py-1 text-base",
              value.trim()
                ? "border-pink-300 bg-white text-foreground"
                : "border-dashed border-amber-300 bg-amber-50 text-amber-700"
            )}
          >
            {value.trim() || MISSING_LABEL}
          </span>
          {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
        </div>
      );
    }

    if (cell.type === "text_input" || cell.type === "number_input") {
      const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
      if (cell.format === "standard_form") {
        return (
          <StandardFormInput
            value={value}
            readonly
            onValueChange={() => undefined}
          />
        );
      }
      return (
        <div
          className={cn(
            "flex min-h-14 items-center gap-2 px-3 py-2 text-lg text-foreground",
            hasInlineText ? "justify-center" : "bg-pink-100"
          )}
        >
          {cell.before?.trim() ? (
            <span className="text-base text-foreground">{decodeHtml(cell.before)}</span>
          ) : null}
          <span
            className={cn(
              "inline-flex min-h-9 items-center justify-center rounded-sm border px-3 py-1 text-base",
              hasInlineText ? "min-w-24" : "min-w-full border-pink-300 bg-pink-100",
              value.trim()
                ? "border-pink-300 bg-white text-foreground"
                : "border-dashed border-amber-300 bg-amber-50 text-amber-700"
            )}
          >
            {value.trim() || MISSING_LABEL}
          </span>
          {cell.after?.trim() ? (
            <span className="text-base text-foreground">{decodeHtml(cell.after)}</span>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "min-h-9 rounded-sm px-2.5 py-2 text-sm",
          value.trim()
            ? "bg-white text-foreground"
            : "border border-dashed border-amber-300 bg-amber-50 text-amber-700"
        )}
      >
        {value.trim() || MISSING_LABEL}
      </div>
    );
  }

  if (readonly) {
    if (cell.format === "standard_form") {
      return (
        <StandardFormInput
          value={value}
          readonly
          onValueChange={() => undefined}
        />
      );
    }

    return (
      <div
        className={cn(
          "min-h-9 rounded-sm px-2.5 py-2 text-sm",
          value.trim()
            ? "bg-white text-foreground"
            : "border border-dashed border-amber-300 bg-amber-50 text-amber-700"
        )}
      >
        {value.trim() || MISSING_LABEL}
      </div>
    );
  }

  if (cell.type === "select") {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 w-full rounded-none border-0 bg-white px-2 text-sm shadow-none focus:ring-0">
          <SelectValue placeholder={decodeHtml(cell.placeholder) || "Select"} />
        </SelectTrigger>
        <SelectContent>
          {cell.options.map((option) => (
            <SelectItem key={option} value={option}>
              {decodeHtml(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (cell.type === "drop_zone") {
    const hasInlineText = Boolean(cell.before?.trim() || cell.after?.trim());
    return (
      <div
        onDragOver={(event) => {
          if (readonly) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (readonly) return;
          event.preventDefault();
          const droppedValue = event.dataTransfer.getData("text/plain");
          if (cell.options.includes(droppedValue)) {
            onValueChange(droppedValue);
          }
        }}
        className={cn(
          "min-h-10 p-1.5",
          !readonly && "bg-pink-50",
          hasInlineText && "flex items-center justify-center gap-2 bg-white text-lg text-foreground"
        )}
      >
        {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
        <div
          className={cn(
            "flex min-h-8 min-w-14 items-center justify-center rounded-sm border px-2.5 py-1.5 text-sm",
            value.trim()
              ? "border-pink-300 bg-white text-foreground"
              : readonly
                ? "border-dashed border-amber-300 bg-amber-50 text-amber-700"
                : "border-dashed border-pink-300 bg-pink-100 text-pink-700"
          )}
        >
          {value.trim() || (readonly ? MISSING_LABEL : decodeHtml(cell.placeholder) || "Drop here")}
        </div>
        {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
      </div>
    );
  }

  if (cell.type === "drop_expression") {
    return (
      <div
        onDragOver={(event) => {
          if (readonly) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (readonly) return;
          event.preventDefault();
          const droppedValue = event.dataTransfer.getData("text/plain");
          if (cell.options.includes(droppedValue)) {
            onValueChange(droppedValue);
          }
        }}
        className="flex min-h-12 flex-wrap items-center justify-center gap-2 px-2.5 py-2 text-lg text-foreground"
        >
        {cell.before ? <span>{decodeHtml(cell.before)}</span> : null}
        <span
          className={cn(
            "inline-flex min-h-9 min-w-14 items-center justify-center rounded-sm border px-3 py-1 text-base",
            value.trim()
              ? "border-pink-300 bg-pink-100 text-foreground"
              : readonly
                ? "border-dashed border-amber-300 bg-amber-50 text-amber-700"
                : "border-dashed border-pink-300 bg-pink-100 text-pink-700"
          )}
        >
          {value.trim() || (readonly ? MISSING_LABEL : decodeHtml(cell.placeholder) || "")}
        </span>
        {cell.after ? <span>{decodeHtml(cell.after)}</span> : null}
      </div>
    );
  }

  const isInvalidNumber =
    cell.type === "number_input" &&
    value.trim().length > 0 &&
    Number.isNaN(Number(value));

  if (cell.format === "standard_form") {
    return (
      <StandardFormInput
        value={value}
        readonly={readonly}
        onValueChange={onValueChange}
      />
    );
  }

  if (cell.before) {
    const leadingLabel = cell.before?.trim() || "Answer";
    return (
      <div className="flex min-h-12 flex-wrap items-center justify-center gap-2 px-2.5 py-2 text-lg text-foreground">
        <span className="text-sm font-medium text-slate-600">{leadingLabel}</span>
        <Input
          type="text"
          inputMode={cell.type === "number_input" ? "decimal" : undefined}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onValueChange(event.target.value)
          }
          placeholder={decodeHtml(cell.placeholder)}
          aria-invalid={isInvalidNumber}
          className={cn(
            "h-9 w-24 rounded-sm border border-pink-300 bg-pink-100 px-2 text-center text-base shadow-none focus-visible:ring-1",
            isInvalidNumber && "border-red-400 bg-red-50"
          )}
        />
        {isInvalidNumber ? (
          <div className="basis-full text-center text-[11px] text-red-600">
            Enter a number.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-14 items-center justify-center bg-pink-100 px-3 py-2">
      <Input
        type={cell.type === "number_input" ? "text" : "text"}
        inputMode={cell.type === "number_input" ? "decimal" : undefined}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value)
        }
        placeholder={decodeHtml(cell.placeholder)}
        aria-invalid={isInvalidNumber}
        className={cn(
          "h-9 w-full rounded-none border-0 bg-transparent px-2 text-center text-base shadow-none focus-visible:ring-1",
          isInvalidNumber && "border border-red-400 bg-red-50"
        )}
      />
      {isInvalidNumber ? (
        <div className="basis-full text-center text-[11px] text-red-600">
          Enter a number.
        </div>
      ) : null}
    </div>
  );
}

export function InteractiveTableRenderer({
  template,
  value,
  onChange,
  mode,
  readonly = false,
  className,
}: InteractiveTableRendererProps) {
  const normalizedTemplate = useMemo(
    () => normalizeInteractiveTableTemplate(template),
    [template]
  );
  const [draftAnswer, setDraftAnswer] = useState<InteractiveTableAnswer>(() =>
    value
      ? parseInteractiveTableAnswer(value, normalizedTemplate)
      : createEmptyInteractiveTableAnswer(normalizedTemplate)
  );

  useEffect(() => {
    setDraftAnswer(
      value
        ? parseInteractiveTableAnswer(value, normalizedTemplate)
        : createEmptyInteractiveTableAnswer(normalizedTemplate)
    );
  }, [value, normalizedTemplate]);

  const canEdit = mode !== "review" && !readonly;

  const updateValue = (cell: InteractiveTableCell, nextValue: string) => {
    if (!isInteractiveTableFillableCell(cell) || !canEdit) return;

    const nextAnswer: InteractiveTableAnswer = {
      version: 1,
      values: {
        ...draftAnswer.values,
        [cell.id]: nextValue,
      },
    };

    setDraftAnswer(nextAnswer);
    onChange?.(serializeInteractiveTableAnswer(nextAnswer));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[520px] border-collapse table-fixed">
          <thead>
            <tr className="bg-white">
              {normalizedTemplate.columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="border-2 border-neutral-700 px-4 py-3 text-center text-lg font-bold text-foreground"
                >
                  {decodeHtml(column.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalizedTemplate.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={`${row.id}-${cellIndex}`}
                    className={cn(
                      "border-2 border-neutral-700 bg-white p-0 align-middle",
                      isCompactBlankCell(cell) && "bg-pink-100"
                    )}
                  >
                    <InteractiveTableCellRenderer
                      cell={cell}
                      value={getAnswerValue(draftAnswer, cell)}
                      mode={mode}
                      readonly={!canEdit}
                      onValueChange={(nextValue) => updateValue(cell, nextValue)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InteractiveTableStudentAnswer(
  props: Omit<InteractiveTableRendererProps, "mode">
) {
  return <InteractiveTableRenderer {...props} mode="student" />;
}

export function InteractiveTableReview(
  props: Omit<InteractiveTableRendererProps, "mode" | "readonly">
) {
  return <InteractiveTableRenderer {...props} mode="review" />;
}

export function InteractiveTablePreview(
  props: Omit<InteractiveTableRendererProps, "mode">
) {
  return <InteractiveTableRenderer {...props} mode="preview" />;
}
