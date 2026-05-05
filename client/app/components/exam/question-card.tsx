"use client";

import { memo } from "react";
import he from "he";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubQuestionCard } from "./sub-question-card";
import type { Question, SubQuestion } from "@/types";

interface QuestionCardProps {
  question: Question;
  answers: Record<string, string>;
  onAnswerChange: (subQuestionId: string, value: string) => void;
  onClose?: () => void;
  readonly?: boolean;
}

const HtmlContent = memo(function HtmlContent({
  html,
}: {
  html?: string | null | undefined;
}) {
  const decodeHtml = (html?: string | null) => (html ? he.decode(html) : "");

  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: decodeHtml(html) }}
    />
  );
});

// Separate memoized component for question header and stimulus (never changes)
const QuestionHeader = memo(function QuestionHeader({
  position,
  totalMarks,
  hasStimulus,
  contentHtml,
  onClose,
}: {
  position: number;
  totalMarks: number;
  hasStimulus: boolean;
  contentHtml: string | null | undefined;
  onClose?: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3 bg-linear-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">
          Question {position} ({totalMarks} marks)
        </h2>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Stimulus/Passage */}
      {hasStimulus && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <HtmlContent html={contentHtml} />
        </div>
      )}
    </div>
  );
});

export const QuestionCard = memo(function QuestionCard({
  question,
  answers,
  onAnswerChange,
  onClose,
  readonly = false,
}: QuestionCardProps) {
  const totalMarks = question.marks;
  const hasStimulus = !!(
    question.contentHtml && question.contentHtml.trim().length > 0
  );

  return (
    <div className="space-y-4">
      {/* Question Header with stimulus */}
      <QuestionHeader
        position={question.position}
        totalMarks={totalMarks}
        hasStimulus={hasStimulus}
        contentHtml={question.contentHtml}
        onClose={onClose}
      />

      {/* Sub-questions */}
      <div className="space-y-3">
        {question.subQuestions
          .sort((a, b) => a.position - b.position)
          .map((subQuestion: SubQuestion) => (
            <SubQuestionCard
              key={subQuestion.id}
              questionPosition={question.position}
              label={subQuestion.label}
              prompt={subQuestion.question}
              marks={subQuestion.marks}
              questionType={(subQuestion as any).questionType}
              mcqOptions={(subQuestion as any).mcqOptions}
              circuitTemplate={(subQuestion as any).circuitTemplate}
              imageCompositionTemplate={(subQuestion as any).imageCompositionTemplate}
              answer={answers[subQuestion.id] || ""}
              onAnswerChange={(value) => onAnswerChange(subQuestion.id, value)}
              subQuestionId={subQuestion.id}
              readonly={readonly}
            />
          ))}
      </div>
    </div>
  );
});
