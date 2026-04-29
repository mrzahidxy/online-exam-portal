"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "./status-icon";
import { useState, memo } from "react";

interface SubQuestionNavItem {
  id: string;
  label: string;
  answered: boolean;
}

interface QuestionNavGroup {
  id: string;
  position: number;
  marks: number;
  subQuestions: SubQuestionNavItem[];
}

interface RightNavigatorProps {
  questions: QuestionNavGroup[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
  onSelectSubQuestion: (subQuestionId: string) => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const RightNavigator = memo(function RightNavigator({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onSelectSubQuestion,
  onPrevQuestion,
  onNextQuestion,
  canGoPrev,
  canGoNext,
}: RightNavigatorProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(questions.map((q) => q.id))
  );

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <div className="w-48 border-l border-gray-200 bg-gray-50 flex flex-col">
      {/* Prev button */}
      <div className="p-3 border-b border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onPrevQuestion}
          disabled={!canGoPrev}
        >
          ← Previous Q
        </Button>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {questions.map((question) => {
          const isExpanded = expandedQuestions.has(question.id);
          const isSelected = selectedQuestionId === question.id;
          const answeredCount = question.subQuestions.filter(
            (sq) => sq.answered
          ).length;
          const totalCount = question.subQuestions.length;
          const percentage =
            totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

          return (
            <div key={question.id} className="border-b border-gray-200">
              {/* Question header */}
              <button
                onClick={() => {
                  onSelectQuestion(question.id);
                  if (!isExpanded) {
                    toggleQuestion(question.id);
                  }
                }}
                className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors ${
                  isSelected ? "bg-blue-100" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon percentage={percentage} />
                  <span className="text-sm font-semibold text-gray-900">
                    {question.position} ({question.marks})
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleQuestion(question.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </button>

              {/* Subquestions */}
              {isExpanded && (
                <div className="bg-white">
                  {question.subQuestions.map((subQ) => (
                    <button
                      key={subQ.id}
                      onClick={() => onSelectSubQuestion(subQ.id)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xs text-gray-700">
                        Question {question.position}
                        {subQ.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onNextQuestion}
          disabled={!canGoNext}
        >
          Next Q →
        </Button>
      </div>
    </div>
  );
});
