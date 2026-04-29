"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StudentHeader } from "@/components/student-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAssessments } from "@/hooks/queries/useAssessments";
import { useAccessRequestMutations } from "@/hooks/queries/useAccessRequests";
import { useAuthStore } from "@/lib/auth-store";

const PAGE_SIZE = 10;

export default function StudentDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useAssessments({
    page,
    limit: PAGE_SIZE,
  });
  const assessments = data?.data ?? [];
  const { create } = useAccessRequestMutations();

  // Ensure assessments is always an array
  const safeAssessments = Array.isArray(assessments) ? assessments : [];
  const meta = data?.meta ?? {
    page,
    limit: PAGE_SIZE,
    totalItems: safeAssessments.length,
    totalPages: Math.max(1, Math.ceil(safeAssessments.length / PAGE_SIZE)),
  };

  const totalPages = Math.max(1, meta.totalPages ?? 1);
  const canGoPrev = meta.page > 1;
  const canGoNext = meta.page < totalPages;

  const handlePrev = () => {
    if (canGoPrev) setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (canGoNext) setPage((prev) => prev + 1);
  };

  const startItem =
    meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endItem =
    meta.totalItems === 0
      ? 0
      : Math.min(
          meta.totalItems,
          (meta.page - 1) * meta.limit + safeAssessments.length
        );
  const { user } = useAuthStore();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const studentName = user.name;
  const schoolCode = user.schoolCode || "N/A";

  const getAssessmentState = (assessment: (typeof safeAssessments)[number]) => {
    const isExpired = new Date(assessment.endDate) < new Date();
    const hasStarted = new Date(assessment.startDate) <= new Date();

    // If student has submitted
    if (assessment.hasSubmitted) {
      return "submitted";
    }

    // If assessment is expired/closed
    if (isExpired) {
      return "expired";
    }

    // Check access request status
    if (!assessment.accessStatus) {
      return "no-request"; // Can request access
    }

    if (assessment.accessStatus === "PENDING") {
      return "pending";
    }

    if (assessment.accessStatus === "REJECTED") {
      return "rejected";
    }

    if (assessment.accessStatus === "APPROVED") {
      // Check if exam has started
      if (!hasStarted) {
        return "approved-not-started"; // Approved but not yet started
      }
      return "approved"; // Can start assessment
    }

    // If assessment hasn't started yet
    if (!hasStarted) {
      return "not-started";
    }

    return "unknown";
  };

  const handleRequest = (assessment: (typeof safeAssessments)[number]) => {
    if (assessment.accessStatus) return;
    create.mutate({
      paperId: assessment.id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader studentName={studentName} schoolCode={schoolCode} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Assessments</h1>
        </div>
        {isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            Loading assessments...
          </p>
        )}
        {isError && (
          <p className="text-sm text-destructive mb-4">
            Failed to load assessments:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeAssessments.map((assessment) => {
            const duration = assessment.durationMinutes;
            const marks = assessment._count?.questions
              ? assessment._count.questions * 10
              : 100;
            const state = getAssessmentState(assessment);

            return (
              <Card
                key={assessment.id}
                className="p-6 flex flex-col hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="w-5 h-5 text-primary mt-2" />

                  <div className="flex-1 grid gap-5">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {assessment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assessment.description || "Assessment"} • {duration}m •{" "}
                        {marks} marks
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        <span className="font-semibold text-primary">
                          Schedule:
                        </span>{" "}
                        <span className="font-medium">
                          {new Date(assessment.startDate).toLocaleString()} -{" "}
                          {new Date(assessment.endDate).toLocaleString()}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      {/* Submitted state */}
                      {state === "submitted" && (
                        <>
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Submitted
                          </span>
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/student/feedback/${assessment?.submissionId}`}
                            >
                              View Feedback
                            </Link>
                          </Button>
                        </>
                      )}

                      {/* Approved - can start */}
                      {state === "approved" && (
                        <>
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/20 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                          <Button
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/student/assessments/${assessment.id}`)
                            }
                          >
                            Start
                          </Button>
                        </>
                      )}

                      {/* Approved but not started yet */}
                      {state === "approved-not-started" && (
                        <>
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/20 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                          <Button size="sm" disabled>
                            Not Started Yet
                          </Button>
                        </>
                      )}

                      {/* Pending approval */}
                      {state === "pending" && (
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-500/20 text-yellow-700">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Approval
                        </span>
                      )}

                      {/* Rejected */}
                      {state === "rejected" && (
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/20 text-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Access Denied
                        </span>
                      )}

                      {/* Can request access */}
                      {state === "no-request" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleRequest(assessment)}
                          disabled={create.isPending}
                        >
                          Request Access
                        </Button>
                      )}

                      {/* Expired/Not started */}
                      {(state === "expired" || state === "not-started") && (
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-500/20 text-gray-700">
                          {state === "expired" ? "Expired" : "Not Started"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {safeAssessments.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {startItem}-{endItem} of {meta.totalItems} assessments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!canGoPrev || isLoading}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {meta.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
