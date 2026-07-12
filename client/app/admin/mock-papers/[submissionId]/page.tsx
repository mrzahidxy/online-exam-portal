"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AdminHeader } from "@/components/admin-header";
import ReviewAnswers from "@/components/review-answers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mockPaperService, type GradeMockSubmissionPayload } from "@/lib/mock-paper-service";
import type { SubmissionDetail } from "@/types";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString();
};

export default function AdminMockSubmissionPage() {
  const params = useParams<{ submissionId: string }>();
  const submissionId = params.submissionId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const submissionQuery = useQuery({
    queryKey: ["mock-submission", submissionId],
    queryFn: () => mockPaperService.getSubmissionById(submissionId),
    enabled: Boolean(submissionId),
  });

  const gradeMutation = useMutation({
    mutationFn: (payload: GradeMockSubmissionPayload) => mockPaperService.gradeSubmission(submissionId, payload),
    onSuccess: async () => {
      toast({ title: "Mock submission reviewed", description: "Feedback has been saved.", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mock-submission", submissionId] }),
        queryClient.invalidateQueries({ queryKey: ["mock-submissions"] }),
      ]);
      router.push("/admin/mock-papers");
    },
    onError: (error) => {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Unable to save feedback",
        variant: "destructive",
      });
    },
  });

  const submission = submissionQuery.data;
  const reviewSubmission = useMemo<SubmissionDetail | null>(() => {
    if (!submission?.mockPaper) return null;

    const answersBySubQuestionId = new Map((submission.answers ?? []).map((answer) => [answer.subQuestionId, answer]));
    const gradesBySubQuestionId = new Map((submission.grades ?? []).map((grade) => [grade.subQuestionId, grade]));

    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      createdAt: submission.submittedAt,
      updatedAt: submission.reviewedAt ?? submission.submittedAt,
      student: submission.student ?? null,
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

  const handleSubmit = () => {
    if (!reviewSubmission || gradeMutation.isPending) return;

    const existingMarks = new Map<string, number>();
    reviewSubmission.paper?.questions?.forEach((question) => {
      question.subQuestions?.forEach((subQuestion) => {
        if (typeof subQuestion.answer?.marks?.assigned === "number") {
          existingMarks.set(subQuestion.id, subQuestion.answer.marks.assigned);
        }
      });
    });

    const payloadMap = new Map<string, { subQuestionId: string; assignedMarks: number; comment?: string }>();
    Object.entries(grades).forEach(([subQuestionId, assignedMarks]) => {
      payloadMap.set(subQuestionId, { subQuestionId, assignedMarks });
    });
    Object.entries(comments).forEach(([subQuestionId, comment]) => {
      payloadMap.set(subQuestionId, {
        subQuestionId,
        assignedMarks: payloadMap.get(subQuestionId)?.assignedMarks ?? existingMarks.get(subQuestionId) ?? 0,
        comment: comment.trim() || undefined,
      });
    });

    const payload = Array.from(payloadMap.values());
    if (payload.length === 0) {
      toast({
        title: "No feedback to submit",
        description: "Enter marks or comments before submitting.",
        variant: "destructive",
      });
      return;
    }
    gradeMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Mock Paper Review" />
      <main className="max-w-6xl mx-auto px-3 py-5 space-y-4">
        <Card className="p-3 shadow-none border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Button variant="outline" size="sm" className="gap-1 h-8 px-2 shadow-none" asChild>
                <Link href="/admin/mock-papers">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  {submission?.mockPaper?.title ?? "Mock paper"}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{submission?.student?.name ?? "Unknown student"}</span>
                  <span>Submitted {formatDate(submission?.submittedAt)}</span>
                </div>
              </div>
            </div>
            {submission?.status && <Badge variant="outline">{submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}</Badge>}
          </div>
        </Card>

        {submissionQuery.isLoading && <Card className="p-3 text-sm text-muted-foreground">Loading mock submission...</Card>}
        {submissionQuery.isError && <Card className="p-3 text-sm text-destructive">Unable to load mock submission.</Card>}

        {reviewSubmission && (
          <>
            <ReviewAnswers
              submission={reviewSubmission}
              gradeValues={grades}
              commentValues={comments}
              onGradeChange={(subQuestionId, value) => setGrades((current) => ({ ...current, [subQuestionId]: value }))}
              onCommentChange={(subQuestionId, value) => setComments((current) => ({ ...current, [subQuestionId]: value }))}
              isSaving={gradeMutation.isPending}
              hideFooter
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={gradeMutation.isPending} size="sm">
                {gradeMutation.isPending ? "Saving..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
