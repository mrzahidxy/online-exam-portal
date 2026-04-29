"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, UserRound } from "lucide-react";
import AccessRequests from "@/components/access-requests";
import { useSubmissions } from "@/hooks/queries/useSubmissions";

export default function AdminQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [activeTab, setActiveTab] = useState<"requests" | "grading">(
    "requests"
  );
  const { id } = use(params);
  const {
    data: submissions = [],
    isLoading: isLoadingSubmissions,
    isError: isSubmissionsError,
    error: submissionsError,
  } = useSubmissions(id);

  const paperTitle = submissions[0]?.paper?.title ?? "Question Paper";
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return value;
    return parsed.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Question Paper" />

      <main className="max-w-6xl mx-auto px-3 py-5 space-y-4">
        <Card className="p-3 shadow-none border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Link href="/admin/questions">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 px-2 shadow-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  {paperTitle}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{submissions.length} submissions</span>
                  <span
                    className="h-1 w-1 rounded-full bg-muted-foreground/60"
                    aria-hidden
                  />
                  <span>
                    {activeTab === "grading"
                      ? "Grade submissions"
                      : "Access requests"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
              {[
                { id: "requests", label: "Access Requests" },
                { id: "grading", label: "Grade Submissions" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-3 text-xs ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id as "requests" | "grading")}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {activeTab === "requests" && <AccessRequests paperId={id} />}

        {activeTab === "grading" && (
          <Card className="shadow-none border-border gap-0 p-0">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Student Submissions ({submissions.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a student to grade their answers
              </p>
            </div>
            <div className="space-y-2 p-3">
              {isLoadingSubmissions && (
                <Card className="p-2.5 text-xs text-muted-foreground shadow-none border-border">
                  Loading submissions...
                </Card>
              )}
              {isSubmissionsError && (
                <Card className="p-2.5 text-xs text-destructive shadow-none border-border">
                  Failed to load submissions:{" "}
                  {submissionsError instanceof Error
                    ? submissionsError.message
                    : "Unknown error"}
                </Card>
              )}
              {!isLoadingSubmissions &&
                !isSubmissionsError &&
                submissions.length === 0 && (
                  <Card className="p-2.5 text-xs text-muted-foreground shadow-none border-border">
                    No submissions yet.
                  </Card>
                )}
              {!isSubmissionsError &&
                submissions.map((submission) => {
                  const statusLabel =
                    submission.status === "REVIEWED"
                      ? "Graded"
                      : "Pending review";
                  const statusTone =
                    submission.status === "REVIEWED"
                      ? "bg-success/15 text-success"
                      : "bg-yellow-500/15 text-yellow-700";
                  const submittedAt = formatDate(
                    submission.submittedAt ?? submission.createdAt
                  );

                  return (
                    <Link
                      key={submission.id}
                      href={`/admin/questions/${id}/submissions/${submission.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-xs shadow-none transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {submission.student?.name ?? "Unknown Student"}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${statusTone}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            School: {submission.student?.schoolCode ?? "—"}
                          </span>
                          <span
                            className="h-1 w-1 rounded-full bg-muted-foreground/60"
                            aria-hidden
                          />
                          <span>Submitted: {submittedAt}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
