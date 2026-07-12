"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { CalculatorPopup } from "@/components/calculator/CalculatorPopup";
import { QuestionCard } from "@/components/exam/question-card";
import { RightNavigator } from "@/components/exam/right-navigator";
import { TopAppBar } from "@/components/exam/top-app-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { mockPaperService } from "@/lib/mock-paper-service";
import type { Question } from "@/types";

const MOCK_PAPER_DURATION_MINUTES = 120;
const READING_TIME_SECONDS = 120;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

export default function MockPaperAttemptPage() {
  const params = useParams<{ mockPaperId: string }>();
  const mockPaperId = params.mockPaperId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answeredStatus, setAnsweredStatus] = useState<Record<string, boolean>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(READING_TIME_SECONDS);
  const [isInBufferPeriod, setIsInBufferPeriod] = useState(true);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [submittedSubmissionId, setSubmittedSubmissionId] = useState<string | null>(null);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const mockPaperQuery = useQuery({
    queryKey: ["mock-paper", mockPaperId],
    queryFn: () => mockPaperService.getById(mockPaperId),
    enabled: Boolean(mockPaperId),
  });

  const questions = useMemo<Question[]>(() => {
    return [...(mockPaperQuery.data?.items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({ ...item.question, position: index + 1 }));
  }, [mockPaperQuery.data?.items]);

  const existingSubmission = mockPaperQuery.data?.submissions?.[0];
  const isAlreadySubmitted = Boolean(existingSubmission || submittedSubmissionId || mockPaperQuery.data?.status === "ATTEMPTED");

  useEffect(() => {
    if (!selectedQuestionId && questions.length > 0) setSelectedQuestionId(questions[0].id);
  }, [questions, selectedQuestionId]);

  useEffect(() => {
    if (!hasStartedExam || isAlreadySubmitted) return;
    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          if (isInBufferPeriod) {
            setIsInBufferPeriod(false);
            return MOCK_PAPER_DURATION_MINUTES * 60;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasStartedExam, isAlreadySubmitted, isInBufferPeriod]);

  useEffect(() => {
    if (!hasStartedExam) return;
    const preventClipboard = (e: ClipboardEvent) => e.preventDefault();
    const preventContext = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if (e.key === "F12" || e.metaKey || e.altKey || (e.ctrlKey && ["u", "i", "j", "c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", preventClipboard);
    document.addEventListener("paste", preventClipboard);
    document.addEventListener("cut", preventClipboard);
    document.addEventListener("contextmenu", preventContext);
    document.addEventListener("keydown", preventKeys);
    return () => {
      document.removeEventListener("copy", preventClipboard);
      document.removeEventListener("paste", preventClipboard);
      document.removeEventListener("cut", preventClipboard);
      document.removeEventListener("contextmenu", preventContext);
      document.removeEventListener("keydown", preventKeys);
    };
  }, [hasStartedExam]);

  useEffect(() => {
    if (!hasStartedExam) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isAlreadySubmitted) setIsExamLocked(true);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
    };
  }, [hasStartedExam, isAlreadySubmitted]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    Object.entries(answers).forEach(([id, answer]) => {
      next[id] = stripHtml(answer).trim().length > 0;
    });
    setAnsweredStatus(next);
  }, [answers]);

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = Object.entries(answers)
        .map(([subQuestionId, answerText]) => ({ subQuestionId, answerText: answerText.trim() }))
        .filter((answer) => stripHtml(answer.answerText).trim().length > 0);

      return mockPaperService.submit(mockPaperId, payload);
    },
    onSuccess: async (submission) => {
      setSubmittedSubmissionId(submission.id);
      toast({ title: "Mock paper submitted", description: "Your answers were submitted successfully." });
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mock-paper", mockPaperId] }),
        queryClient.invalidateQueries({ queryKey: ["mock-papers"] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to submit mock paper";
      setSubmissionError(message);
      toast({ title: "Submission failed", description: message, variant: "destructive" });
    },
  });

  const navigationData = useMemo(
    () =>
      questions.map((q) => ({
        id: q.id,
        position: q.position,
        marks: q.marks,
        subQuestions: q.subQuestions.map((sq) => ({ id: sq.id, label: sq.label, answered: answeredStatus[sq.id] || false })),
      })),
    [questions, answeredStatus]
  );

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);
  const currentQuestionIndex = questions.findIndex((q) => q.id === selectedQuestionId);
  const totalAnswers = Object.values(answers).filter((answer) => stripHtml(answer).trim() !== "").length;

  const handleAnswerChange = useCallback((subQuestionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [subQuestionId]: value }));
  }, []);

  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    document.getElementById("exam-workspace")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSubQuestion = (subQuestionId: string) => {
    document.getElementById(`subq-${subQuestionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStartExam = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch (error) {
      console.error("Error entering fullscreen:", error);
    }
    setHasStartedExam(true);
  };

  const handleQuit = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
    window.location.href = "/student/mock-papers";
  };

  const handleReEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      setIsExamLocked(false);
    } catch {
      alert("Failed to enter fullscreen. Please try again.");
    }
  };

  if (!user) return <div>Please log in to take the mock paper.</div>;

  if (mockPaperQuery.isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><Card className="p-8 text-center space-y-4"><div className="mx-auto w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /><h2 className="text-2xl font-bold text-gray-900">Loading mock paper...</h2><p className="text-base text-gray-600">Please wait while we prepare your exam</p></Card></div>;
  }

  if (mockPaperQuery.isError || !mockPaperQuery.data) {
    return <div className="min-h-screen bg-muted/30 flex items-center justify-center">Failed to load mock paper.</div>;
  }

  if (isAlreadySubmitted) {
    const submissionId = existingSubmission?.id ?? submittedSubmissionId;
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><Card className="max-w-2xl w-full p-8 text-center space-y-4"><div className="text-6xl">🎉</div><h2 className="text-2xl font-bold text-gray-900">Submission received</h2><p className="text-base text-gray-600">{totalAnswers} answer{totalAnswers !== 1 ? "s" : ""} submitted</p><div className="flex flex-col gap-3 sm:flex-row"><Button className="flex-1" asChild><Link href="/student/mock-papers">Back to mock papers</Link></Button>{submissionId && <Button className="flex-1" variant="outline" asChild><Link href={`/student/mock-papers/feedback/${submissionId}`}>View feedback</Link></Button>}</div></Card></div>;
  }

  if (!hasStartedExam) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full p-8 space-y-6">
          <div className="text-center space-y-4"><h1 className="text-3xl font-bold text-gray-900">{mockPaperQuery.data.title}</h1><p className="text-lg text-gray-600">Mock Paper</p></div>
          <div className="border-t border-b py-4 space-y-3"><div className="flex justify-between"><span className="text-gray-700 font-medium">Duration:</span><span>{MOCK_PAPER_DURATION_MINUTES} minutes</span></div><div className="flex justify-between"><span className="text-gray-700 font-medium">Total Questions:</span><span>{questions.length}</span></div></div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2"><h3 className="font-semibold text-yellow-900">⚠️ Important Instructions</h3><ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside"><li>The mock paper will open in fullscreen mode</li><li>Do not exit fullscreen or switch windows</li><li>Copy/paste and right-click are disabled</li><li>Make sure you have a stable internet connection</li></ul></div>
          <Button size="lg" className="w-full" onClick={handleStartExam}>Start Exam</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <CalculatorPopup />
      <div className="h-screen flex flex-col bg-[#43a3dd]">
        {isExamLocked && <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"><Card className="max-w-md w-full mx-4 p-8 space-y-6 text-center"><div className="text-6xl">🚫</div><h2 className="text-2xl font-bold text-red-600">Exam Interface Locked</h2><p className="text-gray-700">You exited fullscreen mode during the mock paper.</p><Button size="lg" className="w-full" onClick={handleReEnterFullscreen}>Re-enter Fullscreen to Continue</Button></Card></div>}
        <TopAppBar title={mockPaperQuery.data.title} subject="Mock Paper" timeRemaining={timeRemaining} onQuit={handleQuit} onSubmit={() => submitMutation.mutate()} canSubmitEarly={!isInBufferPeriod} earlySubmitDisabledMessage={isInBufferPeriod ? "Submit will be available after reading time" : undefined} isInBufferPeriod={isInBufferPeriod} />
        <div className="container mx-auto flex-1 flex pt-20 overflow-hidden">
          <div id="exam-workspace" className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-4xl p-4 mx-auto bg-[#b8bbb4]">
              {selectedQuestion ? <QuestionCard question={selectedQuestion} answers={answers} onAnswerChange={handleAnswerChange} readonly={isInBufferPeriod || isExamLocked || submitMutation.isPending} /> : <div className="text-center text-gray-500 py-12">Select a question from the right panel</div>}
              {submissionError && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800 font-medium">Error</p><p className="text-sm text-red-600 mt-1">{submissionError}</p></div>}
              <div className="mt-8 pb-8 flex flex-col items-center gap-2"><Button size="lg" onClick={() => submitMutation.mutate()} className="gap-2 px-8" disabled={submitMutation.isPending || isInBufferPeriod}><Send className="w-4 h-4" />{submitMutation.isPending ? "Submitting..." : "Submit Mock Paper"}</Button>{isInBufferPeriod && <p className="text-sm text-gray-600 text-center">Submit will be available after reading time</p>}</div>
            </div>
          </div>
          <RightNavigator questions={navigationData} selectedQuestionId={selectedQuestionId} onSelectQuestion={handleSelectQuestion} onSelectSubQuestion={handleSelectSubQuestion} onPrevQuestion={() => currentQuestionIndex > 0 && handleSelectQuestion(questions[currentQuestionIndex - 1].id)} onNextQuestion={() => currentQuestionIndex < questions.length - 1 && handleSelectQuestion(questions[currentQuestionIndex + 1].id)} canGoPrev={currentQuestionIndex > 0} canGoNext={currentQuestionIndex < questions.length - 1} />
        </div>
      </div>
    </>
  );
}
