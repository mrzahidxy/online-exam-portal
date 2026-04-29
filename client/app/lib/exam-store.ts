"use client"

import { create } from "zustand"

export interface SubQuestion {
  sub_question_id: string
  question: string
  marks: number
  type: "short-answer" | "mcq" | "essay" | "numerical" | "graph" | "table"
  options?: Record<string, string>
}

export interface Question {
  id: string
  question_number: number
  description: string
  marks: number
  type: "short-answer" | "mcq" | "essay" | "numerical" | "graph" | "table"
  sub_questions: SubQuestion[]
}

export interface ExamPaper {
  title: string
  description: string
  duration_minutes: number
  questions: Question[]
}

export interface StudentAnswer {
  questionId: string
  subQuestionId: string
  answer: string
}

export interface GradedAnswer extends StudentAnswer {
  awardedMarks?: number
  feedback?: string
}

export interface StudentSubmission {
  id: string
  studentName: string
  schoolCode: string
  status: "submitted" | "reviewed"
  answers: GradedAnswer[]
}

export interface AccessRequest {
  id: string
  studentName: string
  schoolCode: string
  assessmentId: string
  assessmentName: string
  requestTime: string
  status: "pending" | "approved" | "rejected"
}

interface ExamStore {
  exam: ExamPaper
  answers: StudentAnswer[]
  submissions: StudentSubmission[]
  requests: AccessRequest[]
  setExam: (exam: ExamPaper) => void
  updateExam: (updates: Partial<ExamPaper>) => void
  updateQuestion: (questionId: string, updates: Partial<Question>) => void
  updateSubQuestion: (questionId: string, subQuestionId: string, updates: Partial<SubQuestion>) => void
  addQuestion: () => void
  deleteQuestion: (questionId: string) => void
  addSubQuestion: (questionId: string) => void
  deleteSubQuestion: (questionId: string, subQuestionId: string) => void
  setAnswer: (questionId: string, subQuestionId: string, answer: string) => void
  getAnswer: (questionId: string, subQuestionId: string) => string
  submitExam: (studentName: string, schoolCode: string) => string
  updateGrade: (
    submissionId: string,
    questionId: string,
    subQuestionId: string,
    updates: { awardedMarks?: number; feedback?: string },
  ) => void
  markSubmissionReviewed: (submissionId: string) => void
  submitAccessRequest: (studentName: string, schoolCode: string, assessmentId: string, assessmentName: string) => string
  approveAccessRequest: (requestId: string) => void
  rejectAccessRequest: (requestId: string) => void
  resetExam: () => void
}
export const DEFAULT_EXAM: ExamPaper = {
  title: "",
  description: "",
  duration_minutes: 60,
  questions: [
    {
      id: "1",
      question_number: 1,
      description: "",
      marks: 1,
      type: "short-answer",
      sub_questions: [
        {
          sub_question_id: "a",
          question: "",
          marks: 1,
          type: "short-answer",
          options: {},
        },
      ],
    },
  ],
}

export const useExamStore = create<ExamStore>((set, get) => ({
  exam: DEFAULT_EXAM,
  answers: [],
  submissions: [],
  requests: [],

  setExam: (exam: ExamPaper) => set({ exam }),

  updateExam: (updates: Partial<ExamPaper>) =>
    set((state) => ({
      exam: {
        ...state.exam,
        ...updates,
      },
    })),

  updateQuestion: (questionId: string, updates: Partial<Question>) =>
    set((state) => ({
      exam: {
        ...state.exam,
        questions: state.exam.questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
      },
    })),

  updateSubQuestion: (questionId: string, subQuestionId: string, updates: Partial<SubQuestion>) =>
    set((state) => ({
      exam: {
        ...state.exam,
        questions: state.exam.questions.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              sub_questions: q.sub_questions.map((sq) =>
                sq.sub_question_id === subQuestionId ? { ...sq, ...updates } : sq,
              ),
            }
          }
          return q
        }),
      },
    })),

  addQuestion: () =>
    set((state) => {
      const questionCount = state.exam.questions.length + 1
      const newQuestion: Question = {
        id: String(questionCount),
        question_number: questionCount,
        description: "",
        marks: 10,
        type: "short-answer",
        sub_questions: [
          {
            sub_question_id: "a",
            question: "",
            marks: 1,
            type: "short-answer",
            options: {},
          },
        ],
      }
      return {
        exam: {
          ...state.exam,
          questions: [...state.exam.questions, newQuestion],
        },
      }
    }),

  deleteQuestion: (questionId: string) =>
    set((state) => {
      if (state.exam.questions.length <= 1) return state
      const filtered = state.exam.questions.filter((q) => q.id !== questionId)
      return {
        exam: {
          ...state.exam,
          questions: filtered.map((q, idx) => ({
            ...q,
            question_number: idx + 1,
            id: String(idx + 1),
          })),
        },
        answers: state.answers.filter((a) => a.questionId !== questionId),
      }
    }),

  addSubQuestion: (questionId: string) =>
    set((state) => ({
      exam: {
        ...state.exam,
        questions: state.exam.questions.map((q) => {
          if (q.id === questionId) {
            const subQuestionCount = q.sub_questions.length
            const newSubQuestionId = String.fromCharCode(97 + subQuestionCount)
            return {
              ...q,
              sub_questions: [
                ...q.sub_questions,
                {
                  sub_question_id: newSubQuestionId,
                  question: "",
                  marks: 1,
                  type: "short-answer",
                  options: {},
                },
              ],
            }
          }
          return q
        }),
      },
    })),

  deleteSubQuestion: (questionId: string, subQuestionId: string) =>
    set((state) => ({
      exam: {
        ...state.exam,
        questions: state.exam.questions.map((q) => {
          if (q.id === questionId && q.sub_questions.length > 1) {
            return {
              ...q,
              sub_questions: q.sub_questions.filter((sq) => sq.sub_question_id !== subQuestionId),
            }
          }
          return q
        }),
      },
      answers: state.answers.filter((a) => !(a.questionId === questionId && a.subQuestionId === subQuestionId)),
    })),

  setAnswer: (questionId: string, subQuestionId: string, answer: string) =>
    set((state) => {
      const existing = state.answers.findIndex((a) => a.questionId === questionId && a.subQuestionId === subQuestionId)
      if (existing >= 0) {
        const updated = [...state.answers]
        updated[existing].answer = answer
        return { answers: updated }
      }
      return { answers: [...state.answers, { questionId, subQuestionId, answer }] }
    }),

  getAnswer: (questionId: string, subQuestionId: string) =>
    get().answers.find((a) => a.questionId === questionId && a.subQuestionId === subQuestionId)?.answer || "",

  submitExam: (studentName: string, schoolCode: string) => {
    const newSubmission = {
      id: `submission-${Date.now()}`,
      studentName,
      schoolCode,
      status: "submitted" as const,
      answers: get().answers.map((a) => ({ ...a })),
    }

    set((state) => ({
      submissions: [...state.submissions, newSubmission],
    }))

    return newSubmission.id
  },

  updateGrade: (submissionId: string, questionId: string, subQuestionId: string, updates) =>
    set((state) => ({
      submissions: state.submissions.map((submission) => {
        if (submission.id !== submissionId) return submission
        const answers = submission.answers.some((a) => a.questionId === questionId && a.subQuestionId === subQuestionId)
          ? submission.answers.map((a) =>
              a.questionId === questionId && a.subQuestionId === subQuestionId ? { ...a, ...updates } : a,
            )
          : [...submission.answers, { questionId, subQuestionId, answer: "", ...updates }]
        return {
          ...submission,
          status: updates.awardedMarks !== undefined || updates.feedback ? "reviewed" : submission.status,
          answers,
        }
      }),
    })),

  markSubmissionReviewed: (submissionId: string) =>
    set((state) => ({
      submissions: state.submissions.map((submission) =>
        submission.id === submissionId ? { ...submission, status: "reviewed" } : submission,
      ),
    })),

  submitAccessRequest: (studentName, schoolCode, assessmentId, assessmentName) => {
    const newRequest: AccessRequest = {
      id: `req-${Date.now()}`,
      studentName,
      schoolCode,
      assessmentId,
      assessmentName,
      requestTime: new Date().toISOString(),
      status: "pending",
    }
    set((state) => ({ requests: [...state.requests, newRequest] }))
    return newRequest.id
  },

  approveAccessRequest: (requestId: string) =>
    set((state) => ({
      requests: state.requests.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r)),
    })),

  rejectAccessRequest: (requestId: string) =>
    set((state) => ({
      requests: state.requests.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)),
    })),
  resetExam: () =>
    set(() => ({
      exam: JSON.parse(JSON.stringify(DEFAULT_EXAM)),
      answers: [],
    })),
}))
