"use client"

import { useQuery } from "@tanstack/react-query"
import { backendApiFetch } from "@/lib/api-client"
import { useAuthStore } from "@/lib/auth-store"
import type { Assessment } from "@/types"

export function usePaper(paperId: string) {
  const { isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: ['paper', paperId],
    enabled: isAuthenticated && !!paperId,
    queryFn: async () => {
      try {
        const res = await backendApiFetch<Assessment>(`/papers/${paperId}`)
        
        if (!res.success) {
          console.error('Paper API error:', res.error)
          throw new Error(res.error)
        }
        
        return res.data
      } catch (error) {
        console.error('Error fetching paper:', error)
        throw error
      }
    },
  })
}