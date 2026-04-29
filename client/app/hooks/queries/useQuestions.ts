"use client"

import { useQuery } from "@tanstack/react-query"
import { buildPaperQueryString } from "@/lib/helpers/questions"
import type { PaperQuery, PapersMeta, PapersResult } from "@/types/questions"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const pickArrayPayload = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }
  return [] as unknown[]
}

const pickMetaPayload = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    if (isPlainObject(candidate)) {
      return candidate
    }
  }
  return undefined
}

export function useQuestions(query?: PaperQuery) {
  return useQuery<PapersResult>({
    queryKey: ["questions", query ?? null],
    queryFn: async ({ signal }) => {
      if (!API_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured.")
      }

      const queryString = buildPaperQueryString(query)
      const url = `${API_BASE_URL}/papers${queryString}`

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(errorText || `Failed to fetch papers (${response.status})`)
      }

      const raw = await response.json().catch(() => ({} as any))
      const envelope = raw?.data ?? raw
      const directChild = isPlainObject(envelope) ? envelope.data : undefined
      const nestedChild = isPlainObject(directChild) ? directChild.data : undefined

      const data = pickArrayPayload(
        envelope,
        directChild,
        nestedChild,
        isPlainObject(envelope) ? (envelope as Record<string, unknown>).items : undefined,
        isPlainObject(envelope) ? (envelope as Record<string, unknown>).results : undefined,
        isPlainObject(envelope) ? (envelope as Record<string, unknown>).records : undefined,
        isPlainObject(directChild) ? (directChild as Record<string, unknown>).items : undefined,
        isPlainObject(directChild) ? (directChild as Record<string, unknown>).results : undefined,
        isPlainObject(directChild) ? (directChild as Record<string, unknown>).records : undefined,
        isPlainObject(nestedChild) ? (nestedChild as Record<string, unknown>).items : undefined,
        isPlainObject(nestedChild) ? (nestedChild as Record<string, unknown>).results : undefined,
        isPlainObject(nestedChild) ? (nestedChild as Record<string, unknown>).records : undefined,
      )

      const metaPayload = pickMetaPayload(
        isPlainObject(envelope) ? envelope.meta : undefined,
        isPlainObject(envelope) ? (envelope as Record<string, unknown>).pagination : undefined,
        isPlainObject(directChild) ? directChild.meta : undefined,
        isPlainObject(directChild) ? (directChild as Record<string, unknown>).pagination : undefined,
        isPlainObject(raw) ? (raw as Record<string, unknown>).meta : undefined,
        isPlainObject(raw?.data) ? (raw.data as Record<string, unknown>).meta : undefined,
      )

      const fallbackLimitBase = query?.limit ?? (data.length || 10)
      const fallbackLimit = typeof fallbackLimitBase === "number" && fallbackLimitBase > 0 ? fallbackLimitBase : 10
      const limitValue = Number(metaPayload?.limit ?? fallbackLimit)
      const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : fallbackLimit

      const totalItemsValue = Number(metaPayload?.totalItems ?? metaPayload?.total ?? data.length)
      const totalItems = Number.isFinite(totalItemsValue) && totalItemsValue >= 0 ? totalItemsValue : data.length

      const pageValue = Number(metaPayload?.page ?? query?.page ?? 1)
      const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1

      const totalPagesValue = Number(metaPayload?.totalPages)
      const computedTotalPages =
        Number.isFinite(totalPagesValue) && totalPagesValue > 0
          ? totalPagesValue
          : limit > 0
            ? Math.max(1, Math.ceil(totalItems / limit))
            : 1

      const meta: PapersMeta = {
        page,
        limit,
        totalItems,
        totalPages: computedTotalPages,
      }

      return { data: data as PapersResult["data"], meta }
    },
  })
}
