import { backendApiFetch } from "@/lib/api-client";
import type { PaperQuestionPayload } from "@/lib/paper-service";

export interface QuestionCategory {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: { items?: number };
  items?: QuestionCategoryItem[];
}

export interface CategoryQuestion {
  id: string;
  contentHtml?: string | null;
  marks?: number | null;
  position?: number | null;
  paper?: { id: string; title: string; status?: string };
  subQuestions?: Array<{
    id?: string;
    label?: string;
    question?: string;
    marks?: number;
    position?: number;
    questionType?: "DESCRIPTIVE" | "MCQ" | "GRAPH" | "TABLE";
    mcqOptions?: { options: Array<{ label: string; value: string }> };
  }>;
}

export interface QuestionCategoryItem {
  id: string;
  questionId: string;
  position: number;
  question: CategoryQuestion;
}

export interface SourceQuestion extends CategoryQuestion {}

export type CategoryPayload = { title: string; description?: string | null; isActive?: boolean };
export type CreateCategoryQuestionPayload = PaperQuestionPayload & { paperId?: string | null };

const unwrap = <T>(res: { success: boolean; data?: T; error?: string }, fallback: string) => {
  if (!res.success || res.data === undefined) throw new Error(res.error || fallback);
  return res.data;
};

export async function fetchQuestionCategories() {
  return unwrap(await backendApiFetch<QuestionCategory[]>("/question-categories"), "Unable to load categories");
}

export async function createQuestionCategory(payload: CategoryPayload) {
  return unwrap(await backendApiFetch<QuestionCategory>("/question-categories", { method: "POST", body: JSON.stringify(payload) }), "Unable to create category");
}

export async function fetchQuestionCategory(categoryId: string) {
  return unwrap(await backendApiFetch<QuestionCategory>(`/question-categories/${categoryId}`), "Unable to load category");
}

export async function updateQuestionCategory(categoryId: string, payload: Partial<CategoryPayload>) {
  return unwrap(await backendApiFetch<QuestionCategory>(`/question-categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(payload) }), "Unable to update category");
}

export async function deleteQuestionCategory(categoryId: string) {
  return unwrap(await backendApiFetch<{ id: string }>(`/question-categories/${categoryId}`, { method: "DELETE" }), "Unable to delete category");
}

export async function fetchSourceQuestions(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return unwrap(await backendApiFetch<SourceQuestion[]>(`/question-categories/source-questions${query}`), "Unable to load source questions");
}

export async function addExistingQuestionToCategory(categoryId: string, questionId: string, position: number) {
  return unwrap(
    await backendApiFetch<QuestionCategoryItem>(`/question-categories/${categoryId}/questions/existing`, {
      method: "POST",
      body: JSON.stringify({ questionId, position }),
    }),
    "Unable to add question",
  );
}

export async function createQuestionInCategory(categoryId: string, payload: CreateCategoryQuestionPayload) {
  return unwrap(
    await backendApiFetch<CategoryQuestion>(`/question-categories/${categoryId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Unable to create question",
  );
}

export async function removeQuestionFromCategory(categoryId: string, questionId: string) {
  return unwrap(
    await backendApiFetch<{ categoryId: string; questionId: string }>(`/question-categories/${categoryId}/questions/${questionId}`, { method: "DELETE" }),
    "Unable to remove question",
  );
}
