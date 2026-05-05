import type { CircuitTemplate } from "@/lib/circuit-template";

export type Role = "admin" | "student";

export type QuestionType = "mcq" | "short-answer" | "essay" | "numerical" | "table";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Question {
  id: string;
  contentHtml: string;
  marks: number;
  position: number;
  subQuestions: SubQuestion[];
}

export interface SubQuestion {
  id: string;
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: "DESCRIPTIVE" | "MCQ" | "GRAPH" | "TABLE" | "CIRCUIT";
  mcqOptions?: {
    options: Array<{
      label: string;
      value: string;
    }>;
  } | null;
  circuitTemplate?: CircuitTemplate | null;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  durationMinutes: number;
  startDate: string;
  endDate: string;
  earlySubmissionRestrictionMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  questions?: Question[];
  _count?: {
    questions: number;
    submissions: number;
  };
  accessStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  hasSubmitted?: boolean;
  submissionId?: string | null;
}

export interface SubmissionAnswer {
  id: string;
  submissionId: string;
  subQuestionId: string;
  answerText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  studentId: string;
  paperId: string;
  status: "SUBMITTED" | "REVIEWED";
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  paper: {
    id: string;
    title: string;
  };
  answers: SubmissionAnswer[];
  grades?: Grade[];
}

export interface Grade {
  id: string;
  submissionId: string;
  subQuestionId: string;
  assignedMarks: number;
  comment?: string | null;
  gradedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDetailAnswerMarks {
  assigned?: number | null;
  max?: number | null;
  comment?: string | null;
}

export interface SubmissionDetailAnswer {
  id?: string;
  answerText?: string | null;
  comment?: string | null;
  marks?: SubmissionDetailAnswerMarks | null;
}

export interface SubmissionDetailSubQuestion {
  id: string;
  label?: string | null;
  question?: string | null;
  marks?: number | null;
  position?: number | null;
  questionType?: "DESCRIPTIVE" | "MCQ" | "GRAPH" | "TABLE" | "CIRCUIT";
  mcqOptions?: {
    options: Array<{
      label: string;
      value: string;
    }>;
  } | null;
  circuitTemplate?: CircuitTemplate | null;
  answer?: SubmissionDetailAnswer | null;
}

export interface SubmissionDetailQuestion {
  id: string;
  contentHtml?: string | null;
  marks?: number | null;
  position?: number | null;
  subQuestions?: SubmissionDetailSubQuestion[] | null;
}

export interface SubmissionDetailPaper {
  id: string;
  title?: string | null;
  description?: string | null;
  questions?: SubmissionDetailQuestion[] | null;
}

export interface SubmissionDetailStudent {
  id: string;
  name: string;
  email: string;
  schoolCode?: string | null;
}

export interface SubmissionDetail {
  id: string;
  status?: "SUBMITTED" | "REVIEWED";
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  student?: SubmissionDetailStudent | null;
  paper?: SubmissionDetailPaper | null;
}

export interface AccessRequestRecord {
  id: string;
  studentId: string;
  paperId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedById?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  paper: {
    id: string;
    title: string;
  };
  decidedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface FeedbackRecord {
  id: string;
  submissionId: string;
  comments: string;
  grade: number;
  createdAt: string;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
