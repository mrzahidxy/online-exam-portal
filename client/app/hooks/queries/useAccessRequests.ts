"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { backendApiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { AccessRequestRecord } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export function useAccessRequests(paperId?: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['accessRequests', paperId],
    enabled: isAuthenticated, // Only run query when user is authenticated
    queryFn: async () => {
      const url = paperId
        ? `/access-requests?paperId=${paperId}`
        : '/access-requests';
      const res = await backendApiFetch<PaginatedResponse<AccessRequestRecord>>(
        url
      );
      if (!res.success) throw new Error(res.error);
      return res.data.data; // Extract the access requests array from the paginated response
    },
  });
}

export function useAccessRequestMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (payload: { paperId: string }) => {
      const res = await backendApiFetch<AccessRequestRecord>(
        '/access-requests',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AccessRequestRecord['status'];
    }) => {
      const res = await backendApiFetch<AccessRequestRecord>(
        `/access-requests/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['accessRequests'] });

      // Snapshot the previous value - we need to handle all possible query keys
      const allQueries = queryClient.getQueriesData({
        queryKey: ['accessRequests'],
      });

      // Optimistically update all access request queries
      allQueries.forEach(([queryKey, oldData]) => {
        if (Array.isArray(oldData)) {
          queryClient.setQueryData(
            queryKey,
            oldData.map((request: AccessRequestRecord) =>
              request.id === id
                ? {
                    ...request,
                    status,
                    decidedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : request
            )
          );
        }
      });

      // Return a context object with the snapshotted value
      return { allQueries };
    },
    onSuccess: (updatedRequest) => {
      // Update all access request queries with the actual server response
      const allQueries = queryClient.getQueriesData({
        queryKey: ['accessRequests'],
      });
      allQueries.forEach(([queryKey, oldData]) => {
        if (Array.isArray(oldData)) {
          queryClient.setQueryData(
            queryKey,
            oldData.map((request: AccessRequestRecord) =>
              request.id === updatedRequest.id ? updatedRequest : request
            )
          );
        }
      });

      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.allQueries) {
        context.allQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['accessRequests'] });
    },
  });

  return { create, update };
}
