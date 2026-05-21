export interface AiSearchFilters {
  amountMin?: number   // THB float (from AI)
  amountMax?: number   // THB float (from AI)
  category?: string
  type?: 'income' | 'expense'
  keyword?: string
  dateFrom?: string    // YYYY-MM-DD
  dateTo?: string      // YYYY-MM-DD
}

// Satang-level filters stored in URL params
export interface AiSearchParams {
  amountMin?: number   // satang
  amountMax?: number   // satang
  category?: string
  type?: 'income' | 'expense'
  keyword?: string
  dateFrom?: string
  dateTo?: string
}

const NL_PATTERN = /(\d+\s*[-–]\s*\d+|around|about|between|near|more than|less than|under|over|last\s+\w+|this\s+(week|month)|yesterday)/i

export function isNaturalLanguage(query: string): boolean {
  if (!query.trim()) return false
  if (/^฿?\d+(\.\d+)?$/.test(query.trim())) return false
  const words = query.trim().split(/\s+/)
  if (words.length < 3 && !NL_PATTERN.test(query)) return false
  return NL_PATTERN.test(query)
}

export function filtersToParams(filters: AiSearchFilters): URLSearchParams {
  const p = new URLSearchParams()
  p.set('aiMode', '1')
  if (filters.amountMin != null) p.set('aiMin', String(Math.round(filters.amountMin * 100)))
  if (filters.amountMax != null) p.set('aiMax', String(Math.round(filters.amountMax * 100)))
  if (filters.category) p.set('aiCat', filters.category)
  if (filters.type) p.set('aiType', filters.type)
  if (filters.keyword) p.set('aiKey', filters.keyword)
  if (filters.dateFrom) p.set('aiFrom', filters.dateFrom)
  if (filters.dateTo) p.set('aiTo', filters.dateTo)
  return p
}

export function paramsToFilters(sp: URLSearchParams): AiSearchParams | null {
  if (!sp.get('aiMode')) return null
  return {
    amountMin: sp.get('aiMin') ? Number(sp.get('aiMin')) : undefined,
    amountMax: sp.get('aiMax') ? Number(sp.get('aiMax')) : undefined,
    category: sp.get('aiCat') ?? undefined,
    type: (sp.get('aiType') as 'income' | 'expense') ?? undefined,
    keyword: sp.get('aiKey') ?? undefined,
    dateFrom: sp.get('aiFrom') ?? undefined,
    dateTo: sp.get('aiTo') ?? undefined,
  }
}
