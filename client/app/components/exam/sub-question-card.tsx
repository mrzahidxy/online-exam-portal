"use client";

import { memo } from "react";
import he from "he";
import { RichTextEditor } from "../rich-text-editor";
import { GraphAnswerEditor } from "./graph-answer";
import { CircuitAnswerEditor } from "./circuit-answer";
import { TableAnswerEditor } from "./table-answer";
import type { CircuitTemplate } from "@/lib/circuit-template";

interface SubQuestionCardProps {
  questionPosition: number;
  label: string;
  prompt: string;
  marks: number;
  questionType?: string;
  mcqOptions?: {
    options: Array<{
      label: string;
      value: string;
    }>;
  } | null;
  circuitTemplate?: CircuitTemplate | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  subQuestionId: string;
  readonly?: boolean;
}

function HtmlContent({ html }: { html: string }) {
  const decodeHtml = (html?: string | null) => (html ? he.decode(html) : "");

  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: decodeHtml(html) }}
    />
  );
}

export const SubQuestionCard = memo(function SubQuestionCard({
  questionPosition,
  label,
  prompt,
  marks,
  questionType,
  mcqOptions,
  circuitTemplate,
  answer,
  onAnswerChange,
  subQuestionId,
  readonly = false,
}: SubQuestionCardProps) {
  const isMCQ = questionType === "MCQ" && mcqOptions;
  const isGraph = questionType === "GRAPH";
  const isTable = questionType === "TABLE";
  const isCircuit = questionType === "CIRCUIT";

  return (
    <div
      className="border border-gray-300 rounded bg-white h-full flex flex-col"
      id={`subq-${subQuestionId}`}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-300 bg-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Question {questionPosition}
          {label} ({marks} mark{marks !== 1 ? "s" : ""})
        </h3>
      </div>

      {/* Prompt */}
      <div className="px-4 py-3 border-b border-gray-300">
        <HtmlContent html={prompt} />
      </div>

      {/* Answer area */}
      <div className="px-4 py-3 flex-1">
        {readonly && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            Reading time - answers are disabled
          </div>
        )}
        {isMCQ ? (
          <div className="space-y-2">
            {mcqOptions.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 border border-gray-200 rounded ${
                  readonly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={`mcq-${subQuestionId}`}
                  value={option.value}
                  checked={answer === option.value}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                  disabled={readonly}
                />
                <span className="text-sm text-gray-900">
                  <span className="font-medium">{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        ) : isGraph ? (
          <GraphAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
          />
        ) : isCircuit ? (
          <CircuitAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
            template={circuitTemplate}
          />
        ) : isTable ? (
          <TableAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
          />
        ) : (
          <div className={readonly ? "pointer-events-none opacity-60" : ""}>
            <div className="mb-2">
              <RichTextEditor
                value={answer}
                onChange={onAnswerChange}
                placeholder="Type your answer here..."
                isStudentView={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
