"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { backendApiFetch } from "@/lib/api-client";
import type { Submission } from "@/types";

interface CreateSubmissionPayload {
  paperId: string;
  answers: {
    subQuestionId: string;
    answerText: string;
  }[];
}

export function useSubmissionMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (payload: CreateSubmissionPayload) => {
      try {
        const res = await backendApiFetch<Submission>("/submissions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        console.log("Submission API response:", res);
        if (!res.success) {
          throw new Error(res.error || "Submission failed");
        }
        if (!res.data) {
          throw new Error("No data returned from submission");
        }
        return res.data;
      } catch (error) {
        console.error("Submission mutation error:", error);
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["submissions"] }),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Submission> & { id: string }) => {
      const res = await backendApiFetch<Submission>(`/submissions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["submissions"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await backendApiFetch<{ id: string }>(`/submissions/${id}`, {
        method: "DELETE",
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["submissions"] }),
  });

  return { create, update, remove };
}
