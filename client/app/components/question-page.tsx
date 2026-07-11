"use client"

import he from 'he';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () =>
    import('@/components/rich-text-editor').then((mod) => ({
      default: mod.RichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-slate-300 rounded bg-white h-[300px] flex items-center justify-center text-slate-500">
        Loading editor...
      </div>
    ),
  }
);
import { useToast } from '@/hooks/use-toast';
import {
  addQuestionsToPaper,
  fetchPaper,
  updatePaperQuestions,
  type PaperQuestionPayload,
  type PaperResponse,
} from '@/lib/paper-service';

interface QuestionBuilderPageProps {
  paperId?: string;
}

type McqOption = {
  label: string;
  value: string;
};

type SubQuestion = {
  sub_question_id: string;
  question: string;
  marks: number;
  type: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE';
  options: McqOption[];
};

type Question = {
  id: string;
  question_number: number;
  description: string;
  marks: number;
  type: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE';
  sub_questions: SubQuestion[];
};

type ExamPaper = {
  title: string;
  description: string;
  duration_minutes: number;
  questions: Question[];
};

const DEFAULT_EXAM: ExamPaper = {
  title: '',
  description: '',
  duration_minutes: 60,
  questions: [
    {
      id: '1',
      question_number: 1,
      description: '',
      marks: 1,
      type: 'DESCRIPTIVE',
      sub_questions: [
        {
          sub_question_id: 'a',
          question: '',
          marks: 1,
          type: 'DESCRIPTIVE',
          options: [],
        },
      ],
    },
  ],
};

const createBlankExam = (): ExamPaper => ({
  ...DEFAULT_EXAM,
  questions: DEFAULT_EXAM.questions.map((q) => ({
    ...q,
    sub_questions: q.sub_questions.map((sq) => ({
      ...sq,
      options: [...(sq.options || [])],
    })),
  })),
});

const decodeHtml = (html?: string | null) => (html ? he.decode(html) : '');

const mapPaperResponseToExam = (paper: PaperResponse): ExamPaper => {
  const sortedQuestions = [...(paper.questions ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  const questions =
    sortedQuestions.map((question, index) => {
      const position = question.position ?? index + 1;
      const sortedSubQuestions = [...(question.subQuestions ?? [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );
      const subQuestions =
        sortedSubQuestions.length > 0
          ? sortedSubQuestions.map((subQuestion, subIdx) => {
              // Parse mcqOptions from JSON
              let mcqOptions: McqOption[] = [];
              if (
                subQuestion.mcqOptions &&
                typeof subQuestion.mcqOptions === 'object'
              ) {
                const opts = subQuestion.mcqOptions as any;
                if (Array.isArray(opts.options)) {
                  mcqOptions = opts.options.map((opt: any) => ({
                    label: opt.label || '',
                    value: opt.value || '',
                  }));
                }
              }

              return {
                sub_question_id:
                  subQuestion.label ?? String.fromCharCode(97 + subIdx),
                question: decodeHtml(
                  subQuestion.question ?? subQuestion.contentHtml ?? ''
                ),
                marks: subQuestion.marks ?? 0,
                type: (subQuestion.questionType ?? 'DESCRIPTIVE') as
                  | 'DESCRIPTIVE'
                  | 'MCQ'
                  | 'GRAPH'
                  | 'TABLE',
                options: mcqOptions,
              };
            })
          : [
              {
                sub_question_id: 'a',
                question: '',
                marks: 1,
                type: 'DESCRIPTIVE' as const,
                options: [],
              },
            ];

      return {
        id: String(position),
        question_number: position,
        description: decodeHtml(question.contentHtml ?? ''),
        marks: question.marks ?? 0,
        type: 'DESCRIPTIVE' as const,
        sub_questions: subQuestions,
      };
    }) ?? [];

  if (questions.length === 0) {
    const blankExam = createBlankExam();
    return {
      ...blankExam,
      title: paper.title ?? blankExam.title,
      description: paper.description ?? blankExam.description,
      duration_minutes: paper.durationMinutes ?? blankExam.duration_minutes,
    };
  }

  return {
    title: paper.title ?? '',
    description: paper.description ?? '',
    duration_minutes: paper.durationMinutes ?? 60,
    questions,
  };
};

export default function QuestionBuilderPage({
  paperId,
}: QuestionBuilderPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [exam, setExam] = useState<ExamPaper>(createBlankExam());

  const [mounted, setMounted] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState(
    exam.questions[0]?.id ?? '1'
  );
  const [currentSubQuestionId, setCurrentSubQuestionId] = useState(
    exam.questions[0]?.sub_questions[0]?.sub_question_id ?? 'a'
  );
  const [status, setStatus] = useState<'idle' | 'draft-saved' | 'submitted'>(
    'idle'
  );
  const [paperIdValue, setPaperIdValue] = useState(paperId ?? '');
  const [paperMeta, setPaperMeta] = useState<PaperResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingQuestions, setIsUpdatingQuestions] = useState(false);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  const updateQuestion = (questionId: string, updates: Partial<Question>) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    }));

  const updateSubQuestion = (
    questionId: string,
    subQuestionId: string,
    updates: Partial<SubQuestion>
  ) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            sub_questions: q.sub_questions.map((sq) =>
              sq.sub_question_id === subQuestionId ? { ...sq, ...updates } : sq
            ),
          };
        }
        return q;
      }),
    }));

  const addQuestion = () =>
    setExam((prev) => {
      const count = prev.questions.length + 1;
      const newQuestion: Question = {
        id: String(count),
        question_number: count,
        description: '',
        marks: 1,
        type: 'DESCRIPTIVE',
        sub_questions: [
          {
            sub_question_id: 'a',
            question: '',
            marks: 1,
            type: 'DESCRIPTIVE',
            options: [],
          },
        ],
      };
      return {
        ...prev,
        questions: [...prev.questions, newQuestion],
      };
    });

  const deleteQuestion = (questionId: string) =>
    setExam((prev) => {
      if (prev.questions.length <= 1) return prev;
      const filtered = prev.questions.filter((q) => q.id !== questionId);
      return {
        ...prev,
        questions: filtered.map((q, idx) => ({
          ...q,
          question_number: idx + 1,
          id: String(idx + 1),
        })),
      };
    });

  const addSubQuestion = (questionId: string) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          const subCount = q.sub_questions.length;
          const newSubId = String.fromCharCode(97 + subCount);
          return {
            ...q,
            sub_questions: [
              ...q.sub_questions,
              {
                sub_question_id: newSubId,
                question: '',
                marks: 1,
                type: 'DESCRIPTIVE',
                options: [],
              },
            ],
          };
        }
        return q;
      }),
    }));

  const addMcqOption = (questionId: string, subQuestionId: string) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            sub_questions: q.sub_questions.map((sq) =>
              sq.sub_question_id === subQuestionId
                ? {
                    ...sq,
                    options: [...sq.options, { label: '', value: '' }],
                  }
                : sq
            ),
          };
        }
        return q;
      }),
    }));

  const removeMcqOption = (
    questionId: string,
    subQuestionId: string,
    optionIndex: number
  ) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            sub_questions: q.sub_questions.map((sq) =>
              sq.sub_question_id === subQuestionId
                ? {
                    ...sq,
                    options: sq.options.filter((_, idx) => idx !== optionIndex),
                  }
                : sq
            ),
          };
        }
        return q;
      }),
    }));

  const updateMcqOption = (
    questionId: string,
    subQuestionId: string,
    optionIndex: number,
    field: 'label' | 'value',
    value: string
  ) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            sub_questions: q.sub_questions.map((sq) =>
              sq.sub_question_id === subQuestionId
                ? {
                    ...sq,
                    options: sq.options.map((opt, idx) =>
                      idx === optionIndex ? { ...opt, [field]: value } : opt
                    ),
                  }
                : sq
            ),
          };
        }
        return q;
      }),
    }));

  const deleteSubQuestion = (questionId: string, subQuestionId: string) =>
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id === questionId && q.sub_questions.length > 1) {
          return {
            ...q,
            sub_questions: q.sub_questions.filter(
              (sq) => sq.sub_question_id !== subQuestionId
            ),
          };
        }
        return q;
      }),
    }));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!paperId) return;

    setPaperIdValue(paperId);

    const loadPaper = async () => {
      setIsLoadingPaper(true);
      try {
        const { payload: paper, message } = await fetchPaper(paperId);
        if (message) {
          toast({
            title: 'Paper loaded',
            description: message,
          });
        }
        const mappedExam = mapPaperResponseToExam(paper);
        setExam(mappedExam);
        setCurrentQuestionId(mappedExam.questions[0]?.id ?? '1');
        setCurrentSubQuestionId(
          mappedExam.questions[0]?.sub_questions[0]?.sub_question_id ?? 'a'
        );
        setPaperMeta(paper);
      } catch (error: any) {
        const description =
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load paper details.';
        toast({
          title: 'Failed to load paper',
          description,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPaper(false);
      }
    };

    loadPaper();
  }, [paperId, toast]);

  useEffect(() => {
    const nextQuestion =
      exam.questions.find((q) => q.id === currentQuestionId) ??
      exam.questions[0];
    if (!nextQuestion) return;

    if (nextQuestion.id !== currentQuestionId) {
      setCurrentQuestionId(nextQuestion.id);
      setCurrentSubQuestionId(
        nextQuestion.sub_questions[0]?.sub_question_id ?? 'a'
      );
      return;
    }

    const nextSubQuestion =
      nextQuestion.sub_questions.find(
        (sq) => sq.sub_question_id === currentSubQuestionId
      ) ?? nextQuestion.sub_questions[0];

    if (
      nextSubQuestion?.sub_question_id &&
      nextSubQuestion.sub_question_id !== currentSubQuestionId
    ) {
      setCurrentSubQuestionId(nextSubQuestion.sub_question_id);
    }
  }, [exam, currentQuestionId, currentSubQuestionId]);

  const currentQuestion = exam.questions.find(
    (q) => q.id === currentQuestionId
  );
  const currentSubQuestion = currentQuestion?.sub_questions.find(
    (sq) => sq.sub_question_id === currentSubQuestionId
  );
  const hasExistingQuestions = (paperMeta?.questions?.length ?? 0) > 0;

  const questionPayload = useMemo<PaperQuestionPayload[]>(
    () =>
      exam.questions.map((question) => ({
        contentHtml: question.description || '',
        marks: question.marks,
        position: question.question_number,
        ...(question.sub_questions.length
          ? {
              subQuestions: question.sub_questions.map(
                (subQuestion, index) => ({
                  label: subQuestion.sub_question_id,
                  question: subQuestion.question,
                  marks: subQuestion.marks,
                  position: index + 1,
                  questionType: subQuestion.type,
                  ...(subQuestion.type === 'MCQ' &&
                  subQuestion.options.length > 0
                    ? {
                        mcqOptions: {
                          options: subQuestion.options,
                        },
                      }
                    : {}),
                })
              ),
            }
          : {}),
      })),
    [exam]
  );

  const handleAddQuestionClick = () => {
    const newQuestionId = String(exam.questions.length + 1);
    addQuestion();
    setCurrentQuestionId(newQuestionId);
    setCurrentSubQuestionId('a');
  };

  const handleAddSubQuestionClick = (question: Question) => {
    const newSubId = String.fromCharCode(97 + question.sub_questions.length);
    addSubQuestion(question.id);
    setCurrentSubQuestionId(newSubId);
  };

  const handleDeleteSubQuestionClick = (
    questionId: string,
    subQuestionId: string,
    question: Question
  ) => {
    deleteSubQuestion(questionId, subQuestionId);
    if (currentSubQuestionId === subQuestionId) {
      const remaining = question.sub_questions.filter(
        (sq) => sq.sub_question_id !== subQuestionId
      );
      const fallback =
        remaining[0]?.sub_question_id ??
        question.sub_questions[0]?.sub_question_id ??
        'a';
      setCurrentSubQuestionId(fallback);
    }
  };

  const handleSaveDraft = () => {
    setStatus('draft-saved');
    console.log('Saving draft exam paper', exam);
  };

  const handleSubmitPaper = async () => {
    if (!paperIdValue) {
      toast({
        title: 'Paper ID required',
        description:
          'Paste the paper ID from step 1 before submitting questions.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { message, payload } = await addQuestionsToPaper(
        paperIdValue,
        questionPayload
      );
      if (payload) {
        const mapped = mapPaperResponseToExam(payload);
        setExam(mapped);
        setPaperMeta(payload);
        setCurrentQuestionId(mapped.questions[0]?.id ?? '1');
        setCurrentSubQuestionId(
          mapped.questions[0]?.sub_questions[0]?.sub_question_id ?? 'a'
        );
      }
      setStatus('submitted');
      toast({
        title: 'Questions added',
        description: message || 'Paper questions pushed successfully.',
      });
      router.push('/admin/questions');
    } catch (error: any) {
      const description =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to submit questions.';
      toast({
        title: 'Submission failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuestions = async () => {
    if (!paperIdValue) {
      toast({
        title: 'Paper ID required',
        description: 'Paper ID missing for question update.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingQuestions(true);
    try {
      const { message, payload } = await updatePaperQuestions(
        paperIdValue,
        questionPayload
      );
      if (payload) {
        const mapped = mapPaperResponseToExam(payload);
        setExam(mapped);
        setPaperMeta(payload);
        setCurrentQuestionId(mapped.questions[0]?.id ?? '1');
        setCurrentSubQuestionId(
          mapped.questions[0]?.sub_questions[0]?.sub_question_id ?? 'a'
        );
      }
      toast({
        title: 'Questions updated',
        description: message || 'Paper questions replaced successfully.',
      });
      setStatus('submitted');
      router.push('/admin/questions');
    } catch (error: any) {
      const description =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update paper.';
      toast({
        title: 'Update failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingQuestions(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-md">
        {/* Top row - Navigation and Title */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/questions">
                <Button variant="outline" size="sm">
                  Go Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500">Question Builder</p>
                  <h1 className="text-lg font-semibold text-slate-900">
                    {paperMeta?.title ||
                      (paperIdValue
                        ? `Paper ${paperIdValue}`
                        : 'Paper Questions')}
                  </h1>
                </div>
                {isLoadingPaper && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {paperIdValue && !hasExistingQuestions && (
                <Button
                  size="sm"
                  onClick={handleSubmitPaper}
                  disabled={
                    isSubmitting ||
                    !paperIdValue ||
                    isLoadingPaper ||
                    isUpdatingQuestions
                  }
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Questions
                </Button>
              )}
              {paperIdValue && hasExistingQuestions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateQuestions}
                  disabled={
                    isUpdatingQuestions || isSubmitting || isLoadingPaper
                  }
                >
                  {isUpdatingQuestions && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Paper
                </Button>
              )}
              {!paperIdValue && (
                <Button
                  size="sm"
                  onClick={handleSubmitPaper}
                  disabled={
                    isSubmitting ||
                    !paperIdValue ||
                    isLoadingPaper ||
                    isUpdatingQuestions
                  }
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Submit Paper
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row - Paper details and Paper ID input */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {paperMeta && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {paperMeta.status || '—'}
                  </span>
                  {paperMeta.durationMinutes !== undefined && (
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {paperMeta.durationMinutes} min
                    </span>
                  )}
                  {paperMeta.startDate && (
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Starts{' '}
                      {new Date(paperMeta.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {paperMeta.endDate && (
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Ends {new Date(paperMeta.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {status !== 'idle' && (
                <span className="text-xs text-slate-500">
                  {status === 'draft-saved'
                    ? 'Draft saved locally'
                    : 'Questions submitted to API'}
                </span>
              )}
            </div>

            {!paperIdValue && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="paper-id"
                  className="text-xs text-slate-600 whitespace-nowrap"
                >
                  Paper ID:
                </Label>
                <Input
                  id="paper-id"
                  placeholder="Paste from Step 1"
                  value={paperIdValue}
                  onChange={(e) => setPaperIdValue(e.target.value)}
                  className="w-48 h-8 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="pt-32 flex-1 flex overflow-hidden">
        {/* Left Sidebar - Questions Navigator */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Questions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {exam.questions.length} question
              {exam.questions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {exam.questions.map((question) => (
                <div
                  key={question.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center group">
                    <button
                      onClick={() => {
                        setCurrentQuestionId(question.id);
                        setCurrentSubQuestionId(
                          question.sub_questions[0]?.sub_question_id ?? 'a'
                        );
                      }}
                      className={`flex-1 text-left p-3 rounded-l-lg text-sm font-medium transition-colors min-w-0 flex items-center gap-2 ${
                        currentQuestionId === question.id
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {currentQuestionId === question.id ? (
                        <ChevronDown className="w-4 h-4 shrink-0 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold">
                          Question {question.question_number}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {question.sub_questions.length} sub-question
                          {question.sub_questions.length !== 1
                            ? 's'
                            : ''} • {question.marks} mark
                          {question.marks !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                    {exam.questions.length > 1 && (
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-r-lg transition-all shrink-0"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {currentQuestionId === question.id && (
                    <div className="border-t border-slate-200 bg-slate-50 p-2">
                      <div className="space-y-1">
                        {question.sub_questions.map((sq) => (
                          <button
                            key={sq.sub_question_id}
                            onClick={() =>
                              setCurrentSubQuestionId(sq.sub_question_id)
                            }
                            className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                              currentSubQuestionId === sq.sub_question_id
                                ? 'bg-blue-100 text-blue-800 font-medium border border-blue-300 shadow-sm'
                                : 'text-slate-600 hover:bg-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                Sub-question ({sq.sub_question_id})
                              </span>
                              <span className="text-slate-500 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                                {sq.marks} (m)
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200">
            <Button
              onClick={handleAddQuestionClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm h-10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden mt-2">
          {currentQuestion && currentSubQuestion && (
            <>
              {/* Editor Panel */}
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">
                      Question {currentQuestion.question_number} - Description
                      (Context/Passage)
                    </Label>
                    <RichTextEditor
                      value={currentQuestion.description}
                      onChange={(html) =>
                        updateQuestion(currentQuestion.id, {
                          description: html,
                        })
                      }
                      placeholder="Add question context, passage, or shared description..."
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-slate-700">
                      Total Marks
                    </Label>
                    <Input
                      type="number"
                      value={
                        Number.isFinite(currentQuestion.marks)
                          ? currentQuestion.marks
                          : ''
                      }
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isNaN(next)) {
                          updateQuestion(currentQuestion.id, { marks: 0 });
                          return;
                        }
                        updateQuestion(currentQuestion.id, { marks: next });
                      }}
                      min="0"
                      className="mt-1 text-sm max-w-xs focus:shadow-none! focus:ring-1! focus:ring-blue-500! focus:border-blue-500! focus:outline-none! border-slate-300"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Sub-Question ({currentSubQuestion.sub_question_id})
                      </h3>
                      {currentQuestion.sub_questions.length > 1 && (
                        <Button
                          onClick={() =>
                            handleDeleteSubQuestionClick(
                              currentQuestion.id,
                              currentSubQuestion.sub_question_id,
                              currentQuestion
                            )
                          }
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-slate-700">
                            Marks
                          </Label>
                          <Input
                            type="number"
                            value={
                              Number.isFinite(currentSubQuestion.marks)
                                ? currentSubQuestion.marks
                                : ''
                            }
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (Number.isNaN(next)) {
                                updateSubQuestion(
                                  currentQuestion.id,
                                  currentSubQuestion.sub_question_id,
                                  { marks: 0 }
                                );
                                return;
                              }
                              updateSubQuestion(
                                currentQuestion.id,
                                currentSubQuestion.sub_question_id,
                                { marks: next }
                              );
                            }}
                            min="0"
                            className="mt-1 text-sm focus:ring-2! focus:ring-blue-500! focus:border-blue-500! focus:outline-none! border-slate-300"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-semibold text-slate-700">
                            Question Type
                          </Label>
                          <Select
                            value={currentSubQuestion.type}
                            onValueChange={(value: 'DESCRIPTIVE' | 'MCQ' | 'GRAPH' | 'TABLE') => {
                              updateSubQuestion(
                                currentQuestion.id,
                                currentSubQuestion.sub_question_id,
                                { type: value }
                              );
                              // Add default options when switching to MCQ
                              if (
                                value === 'MCQ' &&
                                currentSubQuestion.options.length === 0
                              ) {
                                updateSubQuestion(
                                  currentQuestion.id,
                                  currentSubQuestion.sub_question_id,
                                  {
                                    options: [
                                      { label: 'Option A', value: '1' },
                                      { label: 'Option B', value: '2' },
                                    ],
                                  }
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1 text-sm w-full border-2 border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DESCRIPTIVE">
                                Descriptive
                              </SelectItem>
                              <SelectItem value="MCQ">
                                Multiple Choice (MCQ)
                              </SelectItem>

                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-slate-700">
                          Question Text
                        </Label>
                        <RichTextEditor
                          value={currentSubQuestion.question}
                          onChange={(html) =>
                            updateSubQuestion(
                              currentQuestion.id,
                              currentSubQuestion.sub_question_id,
                              { question: html }
                            )
                          }
                          placeholder={`Enter sub-question ${currentSubQuestion.sub_question_id}...`}
                        />
                      </div>

                      {/* MCQ Options */}
                      {currentSubQuestion.type === 'MCQ' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">
                              MCQ Options
                            </Label>
                            <Button
                              onClick={() =>
                                addMcqOption(
                                  currentQuestion.id,
                                  currentSubQuestion.sub_question_id
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Option
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {currentSubQuestion.options.map((option, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                              >
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs text-slate-600">
                                      Option Label
                                    </Label>
                                    <Input
                                      value={option.label}
                                      onChange={(e) =>
                                        updateMcqOption(
                                          currentQuestion.id,
                                          currentSubQuestion.sub_question_id,
                                          index,
                                          'label',
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g., Option A"
                                      className="mt-1 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">
                                      Option Value
                                    </Label>
                                    <Input
                                      value={option.value}
                                      onChange={(e) =>
                                        updateMcqOption(
                                          currentQuestion.id,
                                          currentSubQuestion.sub_question_id,
                                          index,
                                          'value',
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g., 1"
                                      className="mt-1 text-sm"
                                    />
                                  </div>
                                </div>
                                {currentSubQuestion.options.length > 1 && (
                                  <Button
                                    onClick={() =>
                                      removeMcqOption(
                                        currentQuestion.id,
                                        currentSubQuestion.sub_question_id,
                                        index
                                      )
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50 shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}

                            {currentSubQuestion.options.length === 0 && (
                              <div className="text-center py-4 text-slate-500 text-sm">
                                No options added yet. Click "Add Option" to
                                start.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() =>
                            handleAddSubQuestionClick(currentQuestion)
                          }
                          variant="outline"
                          size="lg"
                          className="text-sm w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Sub-Question
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 overflow-y-auto">
                <div className="space-y-4 max-w-2xl">
                  <div className="pb-3 border-b-2 border-blue-600">
                    <h2 className="text-xl font-bold text-slate-900">
                      {exam.title}
                    </h2>
                  </div>

                  {/* Question Description */}
                  {currentQuestion.description && (
                    <div
                      className="preview-content p-3 bg-slate-50 rounded border border-slate-300 text-sm text-slate-700 prose prose-sm max-w-none prose-ol:list-decimal prose-ul:list-disc prose-li:ml-4"
                      dangerouslySetInnerHTML={{
                        __html: currentQuestion.description,
                      }}
                    />
                  )}

                  {/* Sub-Question */}
                  <div className="p-4 bg-slate-50 rounded border border-slate-300">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-bold text-lg text-slate-900">
                        ({currentSubQuestion.sub_question_id})
                      </span>
                      <span className="text-sm text-slate-600">
                        {currentSubQuestion.marks} mark
                        {currentSubQuestion.marks !== 1 ? 's' : ''}
                      </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {currentSubQuestion.type === 'MCQ'
                          ? 'MCQ'
                          : currentSubQuestion.type === 'GRAPH'
                            ? 'Graph'
                            : currentSubQuestion.type === 'TABLE'
                              ? 'Table'
                            : 'Descriptive'}
                      </span>
                    </div>
                    <div
                      className="preview-content text-slate-800 prose prose-sm max-w-none prose-ol:list-decimal prose-ul:list-disc prose-li:ml-4 mb-3"
                      dangerouslySetInnerHTML={{
                        __html: currentSubQuestion.question,
                      }}
                    />

                    {/* MCQ Options Preview */}
                    {currentSubQuestion.type === 'MCQ' &&
                      currentSubQuestion.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {currentSubQuestion.options.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200"
                            >
                              <div className="w-4 h-4 border-2 border-slate-400 rounded-full"></div>
                              <span className="text-sm text-slate-700">
                                <strong>{option.label}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
