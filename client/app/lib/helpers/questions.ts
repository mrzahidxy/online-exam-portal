import type { PaperQuery } from "@/types/questions"

export const buildPaperQueryString = (query?: PaperQuery) => {
  if (!query) return ""
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    const normalized = typeof value === "string" ? value.trim() : String(value)
    if (!normalized) return
    params.set(key, normalized)
  })

  const search = params.toString()
  return search ? `?${search}` : ""
}

export const formatStatusLabel = (value?: string) => {
  if (!value) return "Unknown"
  return value
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

export const getStatusTone = (value?: string) => {
  const normalized = value?.toLowerCase()
  if (normalized === "published" || normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (normalized === "draft") return "border-slate-200 bg-slate-50 text-slate-600"
  if (normalized === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}
