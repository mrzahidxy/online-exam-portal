"use client"

import { use } from "react"
import Link from "next/link"
import he from "he"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSubmissionDetail } from "@/hooks/queries/useSubmissionDetail"
import { GraphAnswerEditor } from "@/components/exam/graph-answer"
import { DrawingAnswerEditor } from "@/components/exam/drawing-answer"
import { ImageCompositionAnswerEditor } from "@/components/exam/image-composition-answer"
import { TableAnswerEditor } from "@/components/exam/table-answer"
import { InteractiveTableReview } from "@/components/exam/interactive-table-renderer"

export default function StudentFeedbackPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = use(params)
  const {
    data: submissionDetail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useSubmissionDetail(submissionId)
  const title = submissionDetail?.paper?.title ?? "Feedback"
  const decodeHtml = (value?: string | null) => (value ? he.decode(value) : "")
  const sortByPosition = <T extends { position?: number | null }>(items?: T[] | null) =>
    items?.length ? [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) : []

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Feedback for</p>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student/assessments">Back to dashboard</Link>
          </Button>
        </div>

        {!submissionId ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No submission selected. Open feedback from your assessments list.
          </Card>
        ) : isLoadingDetail ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading feedback...</Card>
        ) : isDetailError ? (
          <Card className="p-6 text-sm text-destructive">Failed to load feedback.</Card>
        ) : submissionDetail ? (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your marks</h2>
              <p className="text-sm text-muted-foreground">
                Review your scores for each question below.
              </p>
            </div>
            <div className="space-y-3">
              {sortByPosition(submissionDetail.paper?.questions).map((question, questionIndex) => (
                <Card key={question.id} className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Question {question.position ?? questionIndex + 1} ({question.marks ?? 0} marks)
                  </h3>
                  {question.contentHtml && (
                    <div
                      className="text-[13px] text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(question.contentHtml) }}
                    />
                  )}
                  <div className="space-y-2">
                    {sortByPosition(question.subQuestions).map((subQuestion) => {
                      const assigned = subQuestion.answer?.marks?.assigned ?? 0
                      const maxScore = subQuestion.marks ?? subQuestion.answer?.marks?.max ?? 0
                      const comment =
                        subQuestion.answer?.comment ?? subQuestion.answer?.marks?.comment ?? ""
                      const isGraph = subQuestion.questionType === "GRAPH"
                      const isDrawing = subQuestion.questionType === "DRAWING"
                      const isImageComposition = subQuestion.questionType === "IMAGE_COMPOSITION"
                      const isInteractiveTable = subQuestion.questionType === "INTERACTIVE_TABLE"
                      const isTable = subQuestion.questionType === "TABLE"
                      return (
                        <div
                          key={`${question.id}-${subQuestion.id}`}
                          className="border border-border rounded p-2.5 space-y-2"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {subQuestion.label ?? subQuestion.id}. ({maxScore} marks)
                          </p>
                          {subQuestion.question && (
                            <div
                              className="text-[13px] text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: decodeHtml(subQuestion.question) }}
                            />
                          )}
                          <div className="text-[11px] text-muted-foreground">
                            Score: {assigned}/{maxScore}
                          </div>
                          <div className="text-sm bg-muted/40 rounded p-2 min-h-10 text-foreground leading-snug">
                            {isGraph ? (
                              <div className="not-prose">
                                <GraphAnswerEditor
                                  value={subQuestion.answer?.answerText ?? ""}
                                  readonly
                                />
                              </div>
                            ) : isDrawing ? (
                              <div className="not-prose">
                                <DrawingAnswerEditor
                                  value={subQuestion.answer?.answerText ?? ""}
                                  readonly
                                />
                              </div>
                            ) : isImageComposition ? (
                              <div className="not-prose">
                                <ImageCompositionAnswerEditor
                                  value={subQuestion.answer?.answerText ?? ""}
                                  readonly
                                  template={subQuestion.imageCompositionTemplate ?? undefined}
                                />
                              </div>
                            ) : isInteractiveTable ? (
                              <div className="not-prose">
                                <InteractiveTableReview
                                  value={subQuestion.answer?.answerText ?? ""}
                                  template={subQuestion.template ?? undefined}
                                />
                              </div>
                            ) : isTable ? (
                              <div className="not-prose">
                                <TableAnswerEditor
                                  value={subQuestion.answer?.answerText ?? ""}
                                  readonly
                                />
                              </div>
                            ) : (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html:
                                    decodeHtml(subQuestion.answer?.answerText ?? "") ||
                                    "No answer submitted.",
                                }}
                              />
                            )}
                          </div>
                          {comment ? (
                            <div className="text-xs text-muted-foreground">
                              Comment: <span className="text-foreground">{comment}</span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-sm text-muted-foreground">No feedback available yet.</Card>
        )}
      </div>
    </div>
  )
}
