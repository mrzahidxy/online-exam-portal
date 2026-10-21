"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Plus, ShieldAlert } from "lucide-react"
import { useQuestions } from "@/hooks/queries/useQuestions"
import { formatStatusLabel, getStatusTone } from "@/lib/helpers/questions"
import type { PaperRecord } from "@/types/questions"

const PAGE_SIZE = 10

export default function AdminPapersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useQuestions({ page, limit: PAGE_SIZE })
  const papers = (data?.data ?? []) as PaperRecord[]
  const meta = data?.meta ?? {
    page,
    limit: PAGE_SIZE,
    totalItems: papers.length,
    totalPages: Math.max(1, Math.ceil(papers.length / PAGE_SIZE)),
  }

  const totalPages = Math.max(1, meta.totalPages ?? 1)
  const canGoPrev = meta.page > 1
  const canGoNext = meta.page < totalPages

  const handlePrev = () => {
    if (canGoPrev) setPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    if (canGoNext) setPage((prev) => prev + 1)
  }

  const startItem = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const endItem =
    meta.totalItems === 0 ? 0 : Math.min(meta.totalItems, (meta.page - 1) * meta.limit + papers.length)

  return (
    <div className="min-h-screen bg-muted/40">
      <AdminHeader title="Question Papers" />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">All Papers</h1>
            <p className="text-sm text-muted-foreground">Create, view, and manage assessments</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/security">
              <Button variant="outline" size="sm" className="gap-2 px-4 shadow-sm">
                <ShieldAlert className="w-3 h-3" />
                Security
              </Button>
            </Link>
            <Link href="/admin/questions/create-paper">
              <Button size="sm" className="gap-2 px-4 shadow-sm">
                <Plus className="w-3 h-3" />
                Create
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground mb-4">Loading questions...</p>}
        {isError && (
          <p className="text-sm text-destructive mb-4">
            Failed to load questions: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}
        {!isLoading && !isError && papers.length === 0 && (
          <Card className="p-8 text-sm text-muted-foreground border border-border/60 shadow-sm">
            No papers match the current filters.
          </Card>
        )}

        {papers.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {papers.map((paper) => {
                const statusLabel = formatStatusLabel(paper.status)
                const description = paper.description ?? "General"
                const questionCount = paper._count?.questions ?? "—"

                return (
                  <Card
                    key={paper.id}
                    className="p-5 flex items-center justify-between gap-5 border border-border/60 bg-background shadow-sm hover:shadow-md hover:border-primary/30 transition rounded-2xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-foreground truncate max-w-md">
                          {paper.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {description} • {questionCount} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusTone(
                          paper.status
                        )}`}
                      >
                        {statusLabel}
                      </span>
                      <Link href={`/admin/questions/edit-paper/${paper.id}`}>
                        <Button size="sm" className="px-4 hover:shadow-sm" title="Edit paper details">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/admin/questions/${paper.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-4 hover:shadow-sm"
                          title="View paper"
                        >
                          View
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {startItem}-{endItem} of {meta.totalItems} exams
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={!canGoPrev || isLoading}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {meta.page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={!canGoNext || isLoading}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
