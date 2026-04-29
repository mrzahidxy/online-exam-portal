"use client";

import { useQuery } from "@tanstack/react-query";
import { backendApiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import type { Assessment } from "@/types";

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

interface UseAssessmentsParams {
  page?: number;
  limit?: number;
}

export function useAssessments(params?: UseAssessmentsParams) {
  const { isAuthenticated } = useAuthStore();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery({
    queryKey: ["assessments", page, limit],
    enabled: isAuthenticated, // Only run query when user is authenticated
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        const res = await backendApiFetch<PaginatedResponse<Assessment>>(
          `/papers?${queryParams}`
        );

        if (!res.success) {
          console.error("API error:", res.error);
          throw new Error(res.error);
        }

        // Return full paginated response
        return res.data;
      } catch (error) {
        console.error("Error fetching assessments:", error);
        throw error;
      }
    },
  });
}
