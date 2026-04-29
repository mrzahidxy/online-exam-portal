"use client";

import { useQuery } from "@tanstack/react-query";
import { backendApiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import type { SubmissionDetail } from "@/types";

export function useSubmissionDetail(submissionId?: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["submission", submissionId],
    enabled: isAuthenticated && !!submissionId,
    queryFn: async () => {
      if (!submissionId) return null;

      const res = await backendApiFetch<SubmissionDetail>(
        `/submissions/${submissionId}`,
        {
          headers: {
            accept: "*/*",
          },
        }
      );

      if (!res.success) {
        throw new Error(res.error || "Failed to fetch submission");
      }

      return res.data;
    },
  });
}
