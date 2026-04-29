"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReviewAnswers from "@/components/review-answers";
import { useSubmissionDetail } from "@/hooks/queries/useSubmissionDetail";
import { useGradeSubmission } from "@/hooks/queries/useGradeSubmission";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const gradeSubmission = useGradeSubmission();
  const {
    data: submission,
    isLoading,
    isError,
  } = useSubmissionDetail(submissionId);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const paperTitle = submission?.paper?.title ?? "Question Paper";
  const statusLabel =
    submission?.status === "REVIEWED" ? "Reviewed" : "Pending review";
  const statusTone =
    submission?.status === "REVIEWED"
      ? "bg-success/15 text-success"
      : "bg-yellow-500/15 text-yellow-700";
  const submittedAt = submission?.submittedAt ?? submission?.createdAt ?? null;
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return value;
    return parsed.toLocaleDateString();
  };

  const handleSubmitGrades = async () => {
    if (!submission || gradeSubmission.isPending) return;
    const gradeEntries = Object.entries(grades);
    const commentEntries = Object.entries(comments);
    if (gradeEntries.length === 0 && commentEntries.length === 0) {
      toast({
        title: "No feedback to submit",
        description: "Please enter marks or comments before submitting.",
        variant: "destructive",
      });
      return;
    }
    const existingMarks = new Map<string, number>();
    submission.paper?.questions?.forEach((question) => {
      question.subQuestions?.forEach((subQuestion) => {
        const assigned = subQuestion.answer?.marks?.assigned;
        if (typeof assigned === "number") {
          existingMarks.set(subQuestion.id, assigned);
        }
      });
    });

    const payloadMap = new Map<
      string,
      { subQuestionId: string; assignedMarks: number; comment?: string }
    >();

    gradeEntries.forEach(([subQuestionId, value]) => {
      if (!subQuestionId) return;
      payloadMap.set(subQuestionId, {
        subQuestionId,
        assignedMarks: value,
      });
    });

    commentEntries.forEach(([subQuestionId, value]) => {
      if (!subQuestionId) return;
      const trimmed = value.trim();
      const existing = payloadMap.get(subQuestionId);
      const assignedMarks =
        existing?.assignedMarks ??
        existingMarks.get(subQuestionId) ??
        0;
      payloadMap.set(subQuestionId, {
        subQuestionId,
        assignedMarks,
        comment: trimmed,
      });
    });

    const payload = Array.from(payloadMap.values());

    if (payload.length === 0) {
      toast({
        title: "No valid feedback",
        description: "Could not find valid sub-question IDs to submit.",
        variant: "destructive",
      });
      return;
    }

    try {
      await gradeSubmission.mutateAsync({
        submissionId,
        grades: payload,
        paperId: id,
      });
      toast({
        title: "Grades saved",
        description: "Submission has been marked as reviewed.",
        variant: "success",
      });
      router.push(`/admin/questions/${id}`);
    } catch (error) {
      // Error handling is done in the mutation's onError via toast
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Question Paper" />

      <main className="max-w-6xl mx-auto px-3 py-5 space-y-4">
        <Card className="p-3 shadow-none border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Link href={`/admin/questions/${id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 px-2 shadow-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to submissions
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  {paperTitle}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{submission?.student?.name ?? "Unknown Student"}</span>
                  <span
                    className="h-1 w-1 rounded-full bg-muted-foreground/60"
                    aria-hidden
                  />
                  <span>
                    {submission?.student?.schoolCode ?? "Unknown Student"}
                  </span>
                  <span
                    className="h-1 w-1 rounded-full bg-muted-foreground/60"
                    aria-hidden
                  />
                  <span>Submitted {formatDate(submittedAt)}</span>
                </div>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ${statusTone}`}
            >
              {statusLabel}
            </span>
          </div>
        </Card>

        {isLoading && (
          <Card className="p-2.5 text-xs text-muted-foreground shadow-none border-border">
            Loading submission details...
          </Card>
        )}
        {isError && (
          <Card className="p-2.5 text-xs text-destructive shadow-none border-border">
            Failed to load submission details.
          </Card>
        )}

        {submission ? (
          <>
            <ReviewAnswers
              submission={submission}
              gradeValues={grades}
              commentValues={comments}
              onGradeChange={(subQuestionId, value) => {
                setGrades((prev) => ({
                  ...prev,
                  [subQuestionId]: value,
                }));
              }}
              onCommentChange={(subQuestionId, value) => {
                setComments((prev) => ({
                  ...prev,
                  [subQuestionId]: value,
                }));
              }}
              isSaving={gradeSubmission.isPending}
              hideFooter
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitGrades}
                disabled={gradeSubmission.isPending}
                size="sm"
                className="h-9 px-3 shadow-none"
              >
                {gradeSubmission.isPending ? "Saving..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        ) : (
          !isLoading && (
            <Card className="p-2.5 text-xs text-muted-foreground shadow-none border-border">
              Submission not found.
            </Card>
          )
        )}
      </main>
    </div>
  );
}
