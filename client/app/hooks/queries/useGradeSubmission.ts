"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { backendApiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type GradePayload = {
  subQuestionId: string;
  assignedMarks: number;
  comment?: string;
};

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      submissionId,
      grades,
    }: {
      submissionId: string;
      grades: GradePayload[];
      paperId?: string;
    }) => {
      if (!submissionId) throw new Error("Missing submission id");
      if (!Array.isArray(grades) || grades.length === 0)
        throw new Error("No grades to submit");

      const res = await backendApiFetch(`/submissions/${submissionId}/grades`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ grades }),
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to save grades");
      }

      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["submission", variables.submissionId],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save grades",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred",
        variant: "destructive",
      });
    },
  });
}
