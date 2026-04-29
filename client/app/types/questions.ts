export interface PaperQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
  startDateFrom?: string
  startDateTo?: string
}

export interface PaperRecord {
  id: string
  title: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  createdAt?: string
  updatedAt?: string
  _count?: {
    questions?: number
    submissions?: number
  }
}

export interface PapersMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface PapersResult {
  data: PaperRecord[]
  meta: PapersMeta
}
