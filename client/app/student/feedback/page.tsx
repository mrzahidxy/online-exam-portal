"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useExamStore } from "@/lib/exam-store";

export default function StudentFeedbackPage() {
  const { exam, submissions } = useExamStore();
  const submission = submissions
    .filter(
      (s) => s.studentName === "Student User" && s.schoolCode === "SCH-000"
    )
    .at(-1);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Feedback for</p>
            <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student/assessments">Back to dashboard</Link>
          </Button>
        </div>

        <Card className="p-12 text-center space-y-6 bg-linear-to-br from-blue-50 to-indigo-50">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Coming Soon</h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Detailed feedback and grading for your assessments will be
              available here soon.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-gray-500">
              Your instructors are working on providing comprehensive feedback
              for your submissions.
            </p>
          </div>
        </Card>

        {/* {!submission ? (
          <Card className="p-6 text-sm text-muted-foreground">No submissions yet. Complete an assessment first.</Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Overall feedback</h2>
              <p className="text-sm text-muted-foreground">
                Marks and notes for each question are listed below. If no comments appear, grading is still in progress.
              </p>
            </div>

            {exam.questions.map((question) => (
              <div key={question.id} className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Question {question.question_number}</h3>
                {question.sub_questions.map((subQuestion) => {
                  const answer = submission.answers.find(
                    (a) => a.questionId === question.id && a.subQuestionId === subQuestion.sub_question_id,
                  )
                  return (
                    <div key={subQuestion.sub_question_id} className="border border-border rounded p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        ({subQuestion.sub_question_id}) {subQuestion.marks} mark{subQuestion.marks !== 1 ? "s" : ""}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Score: {answer?.awardedMarks ?? 0}/{subQuestion.marks}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {answer?.feedback ? answer.feedback : "Feedback pending."}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </Card>
        )} */}
      </div>
    </div>
  );
}
