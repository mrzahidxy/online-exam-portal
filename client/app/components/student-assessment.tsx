"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { KeyRound, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useSubmissionMutations } from "@/hooks/mutations/useSubmissionMutations";
import { usePaper } from "@/hooks/queries/usePaper";
import { useAuthStore } from "@/lib/auth-store";
import { backendApiFetch } from "@/lib/api-client";
import { getInteractiveTableAnswerHasValue } from "@/lib/interactive-table";
import { TopAppBar } from "./exam/top-app-bar";
import { QuestionCard } from "./exam/question-card";
import { RightNavigator } from "./exam/right-navigator";
import { CalculatorPopup } from "./calculator/CalculatorPopup";

type StudentAssessmentProps = {
  assessmentId: string;
};

type SecurityViolationType =
  | "COPY_SHORTCUT"
  | "PASTE_SHORTCUT"
  | "CUT_SHORTCUT"
  | "ALT_TAB"
  | "WINDOW_SWITCH"
  | "FULLSCREEN_EXIT"
  | "DEVTOOLS"
  | "KEYBOARD_SHORTCUT";

const SECURITY_VIOLATION_LABELS: Record<SecurityViolationType, string> = {
  COPY_SHORTCUT: "Copy shortcut detected",
  PASTE_SHORTCUT: "Paste shortcut detected",
  CUT_SHORTCUT: "Cut shortcut detected",
  ALT_TAB: "Alt+Tab detected",
  WINDOW_SWITCH: "Window switch detected",
  FULLSCREEN_EXIT: "Fullscreen exit detected",
  DEVTOOLS: "Developer tools detected",
  KEYBOARD_SHORTCUT: "Blocked keyboard shortcut detected",
};

const POST_UNLOCK_GRACE_MS = 2500;
const PENALTY_COOLDOWN_MS = 3000;
const PROGRESSIVE_PENALTY_STEP_MINUTES = 10;
const DEFAULT_INITIAL_TIME_REMAINING_SECONDS = 120;
const configuredInitialTimeRemaining =
  process.env.NEXT_PUBLIC_EXAM_INITIAL_BUFFER_SECONDS;
const parsedInitialTimeRemaining =
  configuredInitialTimeRemaining === undefined ||
  configuredInitialTimeRemaining.trim() === ""
    ? DEFAULT_INITIAL_TIME_REMAINING_SECONDS
    : Number(configuredInitialTimeRemaining);
const INITIAL_TIME_REMAINING_SECONDS = Number.isFinite(
  parsedInitialTimeRemaining
)
  ? parsedInitialTimeRemaining
  : DEFAULT_INITIAL_TIME_REMAINING_SECONDS;

// Helper to strip HTML tags for answer validation
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

function getSecurityViolationMessage(
  violationType: SecurityViolationType,
  details?: string
) {
  if (!details) {
    return SECURITY_VIOLATION_LABELS[violationType];
  }

  return `${SECURITY_VIOLATION_LABELS[violationType]}: ${details}`;
}

function shouldRespectPostUnlockGrace(violationType: SecurityViolationType) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "DEVTOOLS"
  );
}

function shouldApplyProgressivePenalty(violationType: SecurityViolationType) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "ALT_TAB"
  );
}

function shouldIgnoreDuringUnlockTransition(
  violationType: SecurityViolationType
) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "DEVTOOLS"
  );
}

function getProgressivePenaltySeconds(violationCount: number) {
  return violationCount * PROGRESSIVE_PENALTY_STEP_MINUTES * 60;
}

export default function StudentAssessment({
  assessmentId,
}: StudentAssessmentProps) {
  // All hooks must be called at the top level before any conditional returns
  const { data: paper, isLoading, isError, error } = usePaper(assessmentId);
  const { user } = useAuthStore();

  // Normalized state: answers keyed by subQuestionId (stable UUID)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(
    INITIAL_TIME_REMAINING_SECONDS
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [isInBufferPeriod, setIsInBufferPeriod] = useState(true);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [lockReason, setLockReason] = useState<SecurityViolationType | null>(
    null
  );
  const [adminUnlockCode, setAdminUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Track elapsed time for early submission check
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const { create } = useSubmissionMutations();
  const lastUnlockAtRef = useRef<number>(0);
  const isUnlockTransitionRef = useRef(false);
  const isExamLockedRef = useRef(false);
  const lastPenaltyAtRef = useRef<number>(0);
  const progressivePenaltyCountRef = useRef(0);

  const lockExam = useCallback(
    (violationType: SecurityViolationType, details?: string) => {
      // TEMP: Admin lock system is disabled. Re-enable by restoring the block below.
      void violationType;
      void details;
      return;

      /*
      if (submitted || isExamLockedRef.current) {
        return;
      }

      if (
        isUnlockTransitionRef.current &&
        shouldIgnoreDuringUnlockTransition(violationType)
      ) {
        return;
      }

      if (
        shouldRespectPostUnlockGrace(violationType) &&
        Date.now() - lastUnlockAtRef.current < POST_UNLOCK_GRACE_MS
      ) {
        return;
      }

      if (shouldApplyProgressivePenalty(violationType)) {
        const now = Date.now();

        if (now - lastPenaltyAtRef.current >= PENALTY_COOLDOWN_MS) {
          lastPenaltyAtRef.current = now;
          progressivePenaltyCountRef.current += 1;
          const penaltySeconds = getProgressivePenaltySeconds(
            progressivePenaltyCountRef.current
          );

          setTimeRemaining((prev) => Math.max(0, prev - penaltySeconds));
        }
      }

      isExamLockedRef.current = true;
      setLockReason(violationType);
      setUnlockError(null);
      setIsExamLocked(true);
      */
    },
    []
  );

  const enterFullscreen = useCallback(async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  const handleUnlockWithAdminCode = useCallback(async () => {
    if (!adminUnlockCode.trim()) {
      setUnlockError("Enter the admin unlock code.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);
    isUnlockTransitionRef.current = true;

    try {
      const result = await backendApiFetch<{ unlocked: boolean }>(
        "/security/exam-unlock",
        {
          method: "POST",
          body: JSON.stringify({
            paperId: assessmentId,
            code: adminUnlockCode,
          }),
        }
      );

      if (!result.success) {
        setUnlockError(result.error || "Invalid admin unlock code.");
        return;
      }

      lastUnlockAtRef.current = Date.now();
      isExamLockedRef.current = false;
      setIsExamLocked(false);
      setLockReason(null);
      setAdminUnlockCode("");

      try {
        await enterFullscreen();
      } catch (err) {
        console.error("Error re-entering fullscreen after unlock:", err);
      } finally {
        window.setTimeout(() => {
          isUnlockTransitionRef.current = false;
        }, 500);
      }
    } finally {
      setIsUnlocking(false);
      if (isUnlockTransitionRef.current) {
        window.setTimeout(() => {
          isUnlockTransitionRef.current = false;
        }, 500);
      }
    }
  }, [adminUnlockCode, assessmentId, enterFullscreen]);

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
    if (submitted || !hasStartedExam) return;

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
  }, [submitted, hasStartedExam, isInBufferPeriod, paper]);

  // Security: Detect and block copy/paste shortcuts
  useEffect(() => {
    const preventCopyPaste = (e: ClipboardEvent) => {
      if (!hasStartedExam || submitted) {
        return;
      }

      const type =
        e.type === "copy"
          ? "COPY_SHORTCUT"
          : e.type === "paste"
          ? "PASTE_SHORTCUT"
          : "CUT_SHORTCUT";

      e.preventDefault();
      lockExam(type, "Clipboard action blocked");
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
  }, [hasStartedExam, submitted, lockExam]);

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

  // Security: Detect blocked keyboard shortcuts and focus loss
  useEffect(() => {
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!hasStartedExam || submitted) {
        return;
      }

      const key = e.key.toLowerCase();

      // Disable F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "F12");
        return false;
      }

      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+I");
        return false;
      }

      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+J");
        return false;
      }

      // Disable Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+C");
        return false;
      }

      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "Ctrl+U");
        return false;
      }

      // Disable copy, paste, cut, and tab switching shortcuts
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(key)) {
        e.preventDefault();
        lockExam(
          key === "c"
            ? "COPY_SHORTCUT"
            : key === "v"
            ? "PASTE_SHORTCUT"
            : "CUT_SHORTCUT",
          `${e.ctrlKey ? "Ctrl" : "Cmd"}+${key.toUpperCase()}`
        );
        return false;
      }

      if ((e.altKey && key === "tab") || (e.metaKey && key === "tab")) {
        e.preventDefault();
        lockExam("ALT_TAB", `${e.altKey ? "Alt" : "Cmd"}+Tab`);
        return false;
      }

      if (e.altKey && key === "f4") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "Alt+F4");
        return false;
      }

      if (e.metaKey) {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", `Meta+${e.key}`);
        return false;
      }
    };

    document.addEventListener("keydown", preventKeyboardShortcuts);

    return () => {
      document.removeEventListener("keydown", preventKeyboardShortcuts);
    };
  }, [hasStartedExam, submitted, lockExam]);

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
        lockExam("DEVTOOLS", "DevTools dimension threshold exceeded");
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Check immediately
    detectDevTools();

    const interval = setInterval(detectDevTools, 500);

    return () => clearInterval(interval);
  }, [lockExam]);

  // Security: Monitor fullscreen and lock exam if exited
  useEffect(() => {
    if (!hasStartedExam) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStartedExam && !submitted) {
        lockExam("FULLSCREEN_EXIT", "Fullscreen mode exited");
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
  }, [hasStartedExam, submitted, lockExam]);

  // Security: Detect focus loss and window switching
  useEffect(() => {
    if (!hasStartedExam) return;

    const handleBlur = () => {
      if (!submitted) {
        lockExam("WINDOW_SWITCH", "Window lost focus");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !submitted) {
        lockExam("WINDOW_SWITCH", "Tab or window hidden");
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasStartedExam, submitted, lockExam]);

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

  const subQuestionById = useMemo(() => {
    const items = new Map<string, any>();
    paper?.questions?.forEach((question) => {
      question.subQuestions.forEach((subQuestion) => {
        items.set(subQuestion.id, subQuestion);
      });
    });
    return items;
  }, [paper]);

  const isAnswerFilled = useCallback(
    (subQuestionId: string, answer: string) => {
      const subQuestion = subQuestionById.get(subQuestionId);
      if (subQuestion?.questionType === "INTERACTIVE_TABLE") {
        return getInteractiveTableAnswerHasValue(answer, subQuestion.template);
      }
      return stripHtml(answer).trim() !== "";
    },
    [subQuestionById]
  );

  const handleSubmit = () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    // Convert answers object to array format expected by backend
    // Filter out empty answers (strip HTML and check for content)
    const submissionAnswers = Object.entries(answers)
      .filter(([subQuestionId, answer]) => isAnswerFilled(subQuestionId, answer))
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

  // Track answered status separately to avoid recomputing navigation on every keystroke
  const [answeredStatus, setAnsweredStatus] = useState<Record<string, boolean>>(
    {}
  );

  // Update answered status only when answer transitions between empty and non-empty
  useEffect(() => {
    const newAnsweredStatus: Record<string, boolean> = {};
    let hasChanged = false;

    Object.entries(answers).forEach(([id, answer]) => {
      const isAnswered = isAnswerFilled(id, answer);
      newAnsweredStatus[id] = isAnswered;

      if (answeredStatus[id] !== isAnswered) {
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setAnsweredStatus(newAnsweredStatus);
    }
  }, [answers, isAnswerFilled]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return Object.entries(answers).filter(([subQuestionId, answer]) =>
      isAnswerFilled(subQuestionId, answer)
    ).length;
  }, [answers, isAnswerFilled]);

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
      await enterFullscreen();
      setHasStartedExam(true);
    } catch (err) {
      console.error("Error entering fullscreen:", err);
      // Still allow starting exam even if fullscreen fails
      setHasStartedExam(true);
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Lock className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold text-red-600">
                  Exam Interface Locked
                </h2>
                <p className="text-gray-700">
                  {lockReason
                    ? getSecurityViolationMessage(lockReason)
                    : "The exam interface has been locked to maintain exam integrity."}
                </p>
                <p className="text-sm text-gray-600">
                  Ask an admin for the unlock code, enter it below, then return
                  to fullscreen to continue.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Admin unlock code
                  </label>
                  <Input
                    value={adminUnlockCode}
                    onChange={(e) => setAdminUnlockCode(e.target.value)}
                    placeholder="Enter admin code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={isUnlocking}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleUnlockWithAdminCode();
                      }
                    }}
                  />
                </div>
                {unlockError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {unlockError}
                  </div>
                ) : null}
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleUnlockWithAdminCode}
                  disabled={isUnlocking}
                >
                  <KeyRound className="h-4 w-4" />
                  {isUnlocking ? "Verifying code..." : "Unlock Exam"}
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500">
                Security incidents are logged for review.
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
