"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSubmissionMutations } from "@/hooks/mutations/useSubmissionMutations";
import { usePaper } from "@/hooks/queries/usePaper";
import { useAuthStore } from "@/lib/auth-store";
import { TopAppBar } from "./exam/top-app-bar";
import { QuestionCard } from "./exam/question-card";
import { RightNavigator } from "./exam/right-navigator";
import { CalculatorPopup } from "./calculator/CalculatorPopup";

type StudentAssessmentProps = {
  assessmentId: string;
};

// Helper to strip HTML tags for answer validation
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

export default function StudentAssessment({
  assessmentId,
}: StudentAssessmentProps) {
  // All hooks must be called at the top level before any conditional returns
  const { data: paper, isLoading, isError, error } = usePaper(assessmentId);
  const { user } = useAuthStore();

  // Normalized state: answers keyed by subQuestionId (stable UUID)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(120); // Start with 2 minutes buffer
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [examStartTime] = useState<Date>(new Date());
  const [isInBufferPeriod, setIsInBufferPeriod] = useState(true);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Track elapsed time for early submission check
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const { create } = useSubmissionMutations();

  // Calculate if early submission is allowed
  const canSubmitEarly = useMemo(() => {
    if (!paper?.earlySubmissionRestrictionMinutes) {
      return true; // No restriction, can submit anytime
    }

    const elapsedMinutes = elapsedSeconds / 60;
    return elapsedMinutes >= paper.earlySubmissionRestrictionMinutes;
  }, [paper?.earlySubmissionRestrictionMinutes, elapsedSeconds]);

  // Calculate early submission disabled message
  const earlySubmitDisabledMessage = useMemo(() => {
    if (canSubmitEarly || !paper?.earlySubmissionRestrictionMinutes) {
      return undefined;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const remainingMinutes =
      paper.earlySubmissionRestrictionMinutes - elapsedMinutes;

    if (remainingMinutes > 1) {
      return `You can submit early in ${remainingMinutes} minutes.`;
    } else if (remainingMinutes === 1) {
      return `You can submit early in 1 minute.`;
    } else {
      return `You can submit early in less than a minute.`;
    }
  }, [
    canSubmitEarly,
    paper?.earlySubmissionRestrictionMinutes,
    elapsedSeconds,
  ]);

  // Initialize selected question when paper loads
  useEffect(() => {
    if (paper) {
      if (
        !selectedQuestionId &&
        paper.questions &&
        paper.questions.length > 0
      ) {
        setSelectedQuestionId(paper.questions[0].id);
      }
    }
  }, [paper, selectedQuestionId]);

  // Unified timer countdown (buffer period then exam period)
  useEffect(() => {
    if (submitted) return;

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          if (isInBufferPeriod && paper) {
            // Buffer period just ended, start exam timer
            setIsInBufferPeriod(false);
            return paper.durationMinutes * 60;
          }
          return 0;
        }
        return prev - 1;
      });
      // Increment elapsed seconds only after buffer period (during actual exam)
      if (!isInBufferPeriod) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [submitted, isInBufferPeriod, paper]);

  // Security: Disable copy/paste
  useEffect(() => {
    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("cut", preventCopyPaste);

    return () => {
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("cut", preventCopyPaste);
    };
  }, []);

  // Security: Disable right-click
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  // Security: Disable keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, etc.)
  useEffect(() => {
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Disable F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }

      // Disable Windows/Command key
      if (e.key === "Meta" || e.metaKey) {
        e.preventDefault();
        return false;
      }

      // Disable Alt key combinations
      if (e.altKey) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl key (alone)
      if (e.ctrlKey && !e.shiftKey && !e.key.match(/^[a-z0-9]$/i)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("keydown", preventKeyboardShortcuts);

    return () => {
      document.removeEventListener("keydown", preventKeyboardShortcuts);
    };
  }, []);

  // Security: Detect DevTools (before and during exam)
  useEffect(() => {
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold =
        window.outerHeight - window.innerHeight > threshold;

      const devToolsDetected = widthThreshold || heightThreshold;

      if (devToolsDetected) {
        setIsDevToolsOpen(true);
        console.warn("DevTools detection triggered");
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Check immediately
    detectDevTools();

    const interval = setInterval(detectDevTools, 500);

    return () => clearInterval(interval);
  }, []);

  // Security: Monitor fullscreen and lock exam if exited
  useEffect(() => {
    if (!hasStartedExam) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStartedExam && !submitted) {
        // User exited fullscreen during exam, lock the exam interface
        setIsExamLocked(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Exit fullscreen when component unmounts (exam ends)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error("Error exiting fullscreen:", err);
        });
      }
    };
  }, [hasStartedExam, submitted]);

  // Security: Prevent browser back button navigation
  useEffect(() => {
    if (!hasStartedExam) return;

    // Push a dummy state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    const preventBackNavigation = (e: PopStateEvent) => {
      // Push state again to keep user on exam page
      window.history.pushState(null, "", window.location.href);

      // Optionally show a warning
      if (!submitted) {
        alert(
          "You cannot navigate back during the exam. Please complete and submit your assessment."
        );
      }
    };

    window.addEventListener("popstate", preventBackNavigation);

    return () => {
      window.removeEventListener("popstate", preventBackNavigation);
    };
  }, [hasStartedExam, submitted]);

  // Update answer by subQuestionId (stable key)
  const handleAnswerChange = useCallback(
    (subQuestionId: string, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [subQuestionId]: value,
      }));
    },
    []
  );

  const handleQuit = () => {
    // Navigate back to student dashboard without submitting
    window.location.href = "/student/assessments";
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    // Convert answers object to array format expected by backend
    // Filter out empty answers (strip HTML and check for content)
    const submissionAnswers = Object.entries(answers)
      .filter(([_, answer]) => stripHtml(answer).trim() !== "")
      .map(([subQuestionId, answerText]) => ({
        subQuestionId,
        answerText,
      }));

    create.mutate(
      {
        paperId: assessmentId,
        answers: submissionAnswers,
      },
      {
        onSuccess: (data) => {
          console.log("Submission successful:", data);
          setIsSubmitting(false);
          setSubmitted(true);
        },
        onError: (error: any) => {
          console.error("Submission error:", error);
          setIsSubmitting(false);
          const errorMessage =
            error?.message ||
            (typeof error === "string" ? error : "") ||
            "Failed to submit assessment. Please try again.";
          setSubmissionError(errorMessage);
        },
      }
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Track answered status separately to avoid recomputing navigation on every keystroke
  const [answeredStatus, setAnsweredStatus] = useState<Record<string, boolean>>(
    {}
  );

  // Update answered status only when answer transitions between empty and non-empty
  useEffect(() => {
    const newAnsweredStatus: Record<string, boolean> = {};
    let hasChanged = false;

    Object.entries(answers).forEach(([id, answer]) => {
      const isAnswered = stripHtml(answer).trim().length > 0;
      newAnsweredStatus[id] = isAnswered;

      if (answeredStatus[id] !== isAnswered) {
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setAnsweredStatus(newAnsweredStatus);
    }
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build navigation data - only recalculates when answeredStatus changes
  const navigationData = useMemo(() => {
    if (!paper?.questions) return [];

    return paper.questions.map((q) => ({
      id: q.id,
      position: q.position,
      marks: q.marks,
      subQuestions: q.subQuestions.map((sq) => ({
        id: sq.id,
        label: sq.label,
        answered: answeredStatus[sq.id] || false,
      })),
    }));
  }, [paper?.questions, answeredStatus]);

  // Count answered questions for completion display
  const totalAnswers = useMemo(() => {
    return Object.values(answers).filter(
      (answer) => stripHtml(answer).trim() !== ""
    ).length;
  }, [answers]);

  // Navigation handlers
  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    // Scroll to top of workspace
    document
      .getElementById("exam-workspace")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSubQuestion = (subQuestionId: string) => {
    // Scroll to the specific subquestion
    const element = document.getElementById(`subq-${subQuestionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrevQuestion = () => {
    if (!paper?.questions) return;
    const currentIndex = paper.questions.findIndex(
      (q) => q.id === selectedQuestionId
    );
    if (currentIndex > 0) {
      handleSelectQuestion(paper.questions[currentIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (!paper?.questions) return;
    const currentIndex = paper.questions.findIndex(
      (q) => q.id === selectedQuestionId
    );
    if (currentIndex < paper.questions.length - 1) {
      handleSelectQuestion(paper.questions[currentIndex + 1].id);
    }
  };

  const currentQuestionIndex =
    paper?.questions?.findIndex((q) => q.id === selectedQuestionId) ?? -1;
  const canGoPrev = currentQuestionIndex > 0;
  const canGoNext = currentQuestionIndex < (paper?.questions?.length ?? 0) - 1;

  const selectedQuestion = paper?.questions?.find(
    (q) => q.id === selectedQuestionId
  );

  // Handler to start exam and enter fullscreen
  const handleStartExam = async () => {
    // Check if DevTools are open before starting
    if (isDevToolsOpen) {
      alert(
        "Please close Developer Tools before starting the exam. Press F12 or close the DevTools panel to continue."
      );
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setHasStartedExam(true);
    } catch (err) {
      console.error("Error entering fullscreen:", err);
      // Still allow starting exam even if fullscreen fails
      setHasStartedExam(true);
    }
  };

  // Handler to re-enter fullscreen after lock
  const handleReEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsExamLocked(false);
      }
    } catch (err) {
      console.error("Error re-entering fullscreen:", err);
      alert("Failed to enter fullscreen. Please try again.");
    }
  };

  // Early returns after all hooks have been called
  if (!user) {
    return <div>Please log in to take the assessment.</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Loading assessment...
            </h2>
            <p className="text-base text-gray-600">
              Please wait while we prepare your exam
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !paper) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div>
          Failed to load assessment:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  // Show start screen before exam begins
  if (!hasStartedExam) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {paper.title}
              </h1>
              <p className="text-lg text-gray-600">{paper.description}</p>
            </div>

            <div className="border-t border-b py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Duration:</span>
                <span className="text-gray-900">
                  {paper.durationMinutes} minutes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">
                  Total Questions:
                </span>
                <span className="text-gray-900">{paper.questions?.length}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
                ⚠️ Important Instructions
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>The exam will open in fullscreen mode</li>
                <li>Do not exit fullscreen or switch windows</li>
                <li>Copy/paste and right-click are disabled</li>
                <li>DevTools and keyboard shortcuts are blocked</li>
                <li>Make sure you have a stable internet connection</li>
                <li className="font-semibold">
                  Close Developer Tools if open before starting
                </li>
              </ul>
            </div>

            {isDevToolsOpen && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  🚫 Developer Tools Detected
                </h3>
                <p className="text-sm text-red-800">
                  Please close Developer Tools (DevTools) before starting the
                  exam. Press F12 or close the DevTools panel to continue.
                </p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleStartExam}
              disabled={isDevToolsOpen}
            >
              {isDevToolsOpen ? "Close DevTools to Start" : "Start Exam"}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">
              Submission received
            </h2>
            <p className="text-base text-gray-600">
              {totalAnswers} answer{totalAnswers !== 1 ? "s" : ""} submitted
            </p>
            <Button
              className="w-full mt-6"
              onClick={() => {
                // Exit fullscreen before navigation
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch((err) => {
                    console.error("Error exiting fullscreen:", err);
                  });
                }
                window.location.href = "/student/assessments";
              }}
            >
              Back to dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state during submission
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Submitting your assessment...
            </h2>
            <p className="text-base text-gray-600">
              Please wait while we process your submission
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <CalculatorPopup />
      <div className="h-screen flex flex-col bg-[#43a3dd]">
        {/* Fullscreen Exit Lock Overlay */}
        {isExamLocked && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4 p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="text-6xl">🚫</div>
                <h2 className="text-2xl font-bold text-red-600">
                  Exam Interface Locked
                </h2>
                <p className="text-gray-700">
                  You exited fullscreen mode during the exam. The exam interface
                  has been locked to maintain exam integrity.
                </p>
                <p className="text-sm text-gray-600">
                  Click the button below to re-enter fullscreen and continue
                  your exam.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleReEnterFullscreen}
              >
                Re-enter Fullscreen to Continue
              </Button>
              <p className="text-xs text-center text-gray-500">
                Warning: Multiple exits from fullscreen may be flagged for
                review.
              </p>
            </Card>
          </div>
        )}

        {/* Top App Bar */}
        <TopAppBar
          title={paper.title}
          subject={paper.description}
          timeRemaining={timeRemaining}
          onQuit={handleQuit}
          onSubmit={handleSubmit}
          canSubmitEarly={canSubmitEarly}
          earlySubmitDisabledMessage={earlySubmitDisabledMessage}
          isInBufferPeriod={isInBufferPeriod}
        />

        {/* Main Content Area */}
        <div className="container mx-auto flex-1 flex pt-20 overflow-hidden">
          {/* Center Workspace */}
          <div id="exam-workspace" className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-4xl p-4 mx-auto bg-[#b8bbb4]">
              {selectedQuestion ? (
                <QuestionCard
                  question={selectedQuestion}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  readonly={isInBufferPeriod || isExamLocked}
                />
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a question from the right panel
                </div>
              )}

              {/* Error message */}
              {submissionError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-600 mt-1">{submissionError}</p>
                </div>
              )}

              {/* Submit Button at bottom */}
              <div className="mt-8 pb-8 flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  className="gap-2 px-8"
                  disabled={isSubmitting || isInBufferPeriod || !canSubmitEarly}
                  title={
                    isInBufferPeriod
                      ? "Submit will be available after reading time"
                      : !canSubmitEarly
                      ? earlySubmitDisabledMessage
                      : ""
                  }
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Submitting..." : "Submit Assessment"}
                </Button>
                {isInBufferPeriod ? (
                  <p className="text-sm text-gray-600 text-center">
                    Submit will be available after reading time
                  </p>
                ) : !canSubmitEarly && earlySubmitDisabledMessage ? (
                  <p className="text-sm text-gray-600 text-center">
                    {earlySubmitDisabledMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Navigator */}
          <RightNavigator
            questions={navigationData}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={handleSelectQuestion}
            onSelectSubQuestion={handleSelectSubQuestion}
            onPrevQuestion={handlePrevQuestion}
            onNextQuestion={handleNextQuestion}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />
        </div>
      </div>
    </>
  );
}
