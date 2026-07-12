"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockPaperService } from "@/lib/mock-paper-service";

type StatusFilter = "ALL" | "SUBMITTED" | "REVIEWED";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString();
};

export default function AdminMockPapersPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const submissionsQuery = useQuery({
    queryKey: ["mock-submissions", status],
    queryFn: () =>
      mockPaperService.listSubmissions({
        limit: 50,
        status: status === "ALL" ? undefined : status,
      }),
  });

  const submissions = submissionsQuery.data?.data ?? [];

  return (
    <div className="min-h-screen bg-muted/40">
      <AdminHeader title="Mock Papers" />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Mock submissions</h1>
            <p className="text-sm text-muted-foreground">Review and grade submitted mock papers.</p>
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="SUBMITTED">Pending review</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {submissionsQuery.isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading mock submissions...</Card>}
        {submissionsQuery.isError && <Card className="p-6 text-sm text-destructive">Unable to load mock submissions.</Card>}
        {!submissionsQuery.isLoading && !submissionsQuery.isError && submissions.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">No mock submissions found.</Card>
        )}

        {submissions.length > 0 && (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left">
                  <th className="p-3">Student</th>
                  <th className="p-3">Mock paper</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{submission.student?.name ?? "Unknown student"}</div>
                      <div className="text-xs text-muted-foreground">{submission.student?.email ?? "-"}</div>
                    </td>
                    <td className="p-3">{submission.mockPaper?.title ?? "Mock paper"}</td>
                    <td className="p-3">
                      <Badge variant="outline">{submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}</Badge>
                    </td>
                    <td className="p-3">{formatDate(submission.submittedAt)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/mock-papers/${submission.id}`}>
                          {submission.status === "REVIEWED" ? "View" : "Review"}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}
