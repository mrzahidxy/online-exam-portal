import { backendApiFetch } from "@/lib/api-client";
import type { Question } from "@/types";

export interface QuestionCategory {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  _count?: { items: number };
}

export interface MockPaperSubmissionSummary {
  id: string;
  status: "SUBMITTED" | "REVIEWED";
  submittedAt?: string;
  reviewedAt?: string | null;
}

export interface MockPaper {
  id: string;
  title: string;
  status: "GENERATED" | "ATTEMPTED" | "ARCHIVED";
  createdAt: string;
  updatedAt?: string;
  _count?: { items: number; submissions: number };
  submissions?: MockPaperSubmissionSummary[];
  items?: Array<{
    id: string;
    position: number;
    question: Question;
  }>;
}

export interface MockSubmission {
  id: string;
  mockPaperId: string;
  studentId: string;
  status: "SUBMITTED" | "REVIEWED";
  submittedAt: string;
  reviewedAt?: string | null;
  student?: {
    id: string;
    name: string;
    email: string;
    schoolCode?: string | null;
  } | null;
  answers?: Array<{
    id: string;
    subQuestionId: string;
    answerText: string;
  }>;
  grades?: Array<{
    id: string;
    subQuestionId: string;
    assignedMarks: number;
    comment?: string | null;
  }>;
  mockPaper?: MockPaper;
}

export interface MockSubmissionListItem {
  id: string;
  mockPaperId: string;
  studentId: string;
  status: "SUBMITTED" | "REVIEWED";
  submittedAt: string;
  reviewedAt?: string | null;
  student?: {
    id: string;
    name: string;
    email: string;
    schoolCode?: string | null;
  };
  mockPaper?: {
    id: string;
    title: string;
    status: "GENERATED" | "ATTEMPTED" | "ARCHIVED";
  };
}

export interface PaginatedMockSubmissions {
  data: MockSubmissionListItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export type GradeMockSubmissionPayload = Array<{
  subQuestionId: string;
  assignedMarks: number;
  comment?: string;
}>;

const unwrap = async <T>(promise: Promise<{ success: true; data: T } | { success: false; error: string }>) => {
  const res = await promise;
  if (!res.success) throw new Error(res.error || "Request failed");
  return res.data;
};

export const mockPaperService = {
  listActiveCategories: () => unwrap(backendApiFetch<QuestionCategory[]>("/question-categories/active")),
  generate: (categoryIds: string[]) =>
    unwrap(
      backendApiFetch<MockPaper>("/mock-papers", {
        method: "POST",
        body: JSON.stringify({ categoryIds }),
      })
    ),
  listOwn: () => unwrap(backendApiFetch<MockPaper[]>("/mock-papers")),
  getById: (mockPaperId: string) => unwrap(backendApiFetch<MockPaper>(`/mock-papers/${mockPaperId}`)),
  archive: (mockPaperId: string) =>
    unwrap(backendApiFetch<MockPaper>(`/mock-papers/${mockPaperId}/archive`, { method: "POST" })),
  submit: (mockPaperId: string, answers: Array<{ subQuestionId: string; answerText: string }>) =>
    unwrap(
      backendApiFetch<MockSubmission>(`/mock-papers/${mockPaperId}/submissions`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      })
    ),
  getFeedback: (submissionId: string) =>
    unwrap(backendApiFetch<MockSubmission>(`/mock-papers/submissions/${submissionId}/feedback`)),
  listSubmissions: (query?: { page?: number; limit?: number; status?: "SUBMITTED" | "REVIEWED" }) => {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.limit) params.set("limit", String(query.limit));
    if (query?.status) params.set("status", query.status);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return unwrap(backendApiFetch<PaginatedMockSubmissions>(`/mock-papers/submissions${suffix}`));
  },
  getSubmissionById: (submissionId: string) =>
    unwrap(backendApiFetch<MockSubmission>(`/mock-papers/submissions/${submissionId}`)),
  gradeSubmission: (submissionId: string, grades: GradeMockSubmissionPayload) =>
    unwrap(
      backendApiFetch<MockSubmissionListItem>(`/mock-papers/submissions/${submissionId}/grades`, {
        method: "POST",
        body: JSON.stringify({ grades }),
      })
    ),
};
