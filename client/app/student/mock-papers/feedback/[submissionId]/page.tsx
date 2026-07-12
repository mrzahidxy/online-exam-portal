"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import ReviewAnswers from "@/components/review-answers";
import { StudentHeader } from "@/components/student-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockPaperService } from "@/lib/mock-paper-service";
import type { SubmissionDetail } from "@/types";

export default function MockPaperFeedbackPage() {
  const params = useParams<{ submissionId: string }>();
  const submissionId = params.submissionId;

  const feedbackQuery = useQuery({
    queryKey: ["mock-paper-feedback", submissionId],
    queryFn: () => mockPaperService.getFeedback(submissionId),
    enabled: Boolean(submissionId),
    retry: false,
  });

  const submission = feedbackQuery.data;
  const reviewSubmission = useMemo<SubmissionDetail | null>(() => {
    if (!submission?.mockPaper) return null;

    const answersBySubQuestionId = new Map(
      (submission.answers ?? []).map((answer) => [answer.subQuestionId, answer])
    );
    const gradesBySubQuestionId = new Map(
      (submission.grades ?? []).map((grade) => [grade.subQuestionId, grade])
    );

    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      createdAt: submission.submittedAt,
      updatedAt: submission.reviewedAt ?? submission.submittedAt,
      student: null,
      paper: {
        id: submission.mockPaper.id,
        title: submission.mockPaper.title,
        questions: [...(submission.mockPaper.items ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            ...item.question,
            subQuestions: item.question.subQuestions.map((subQuestion) => {
              const answer = answersBySubQuestionId.get(subQuestion.id);
              const grade = gradesBySubQuestionId.get(subQuestion.id);
              return {
                ...subQuestion,
                answer: {
                  id: answer?.id,
                  answerText: answer?.answerText ?? "",
                  comment: grade?.comment ?? null,
                  marks: {
                    assigned: grade?.assignedMarks ?? 0,
                    max: subQuestion.marks,
                    comment: grade?.comment ?? null,
                  },
                },
              };
            }),
          })),
      },
    };
  }, [submission]);

  const isAwaitingReview =
    feedbackQuery.isError &&
    feedbackQuery.error instanceof Error &&
    feedbackQuery.error.message.toLowerCase().includes("not been reviewed");

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mock Paper Feedback</h1>
            {submission?.status && <Badge variant="secondary">{submission.status}</Badge>}
          </div>
          <Button variant="outline" asChild>
            <Link href="/student/mock-papers">Back to mock papers</Link>
          </Button>
        </div>

        {feedbackQuery.isLoading && <p className="text-sm text-muted-foreground">Loading feedback...</p>}

        {isAwaitingReview && (
          <Card className="p-6 space-y-2">
            <h2 className="font-semibold text-foreground">Awaiting review</h2>
            <p className="text-sm text-muted-foreground">Your mock paper has been submitted and is waiting for review.</p>
          </Card>
        )}

        {feedbackQuery.isError && !isAwaitingReview && (
          <p className="text-sm text-destructive">Unable to load feedback.</p>
        )}

        {reviewSubmission && <ReviewAnswers submission={reviewSubmission} hideFooter />}
      </main>
    </div>
  );
}
