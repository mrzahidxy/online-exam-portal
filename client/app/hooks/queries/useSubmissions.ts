"use client"

import { useQuery } from "@tanstack/react-query"
import { backendApiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Submission } from '@/types';

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export function useSubmissions(paperId?: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['submissions', paperId],
    enabled: isAuthenticated,
    queryFn: async () => {
      const path = paperId ? `/submissions?paperId=${paperId}` : '/submissions';
      const res = await backendApiFetch<PaginatedResponse<Submission>>(path);

      if (!res.success) {
        throw new Error(res.error || "Failed to load submissions");
      }

      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;

      return [];
    },
  });
}
