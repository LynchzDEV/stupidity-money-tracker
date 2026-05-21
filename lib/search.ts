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
  const q = query.trim()
  if (!q) return false
  if (/^฿?\d+(\.\d+)?$/.test(q)) return false
  return NL_PATTERN.test(q)
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
  const rawType = sp.get('aiType')
  const rawMin = sp.get('aiMin')
  const rawMax = sp.get('aiMax')
  return {
    amountMin: rawMin ? (isNaN(Number(rawMin)) ? undefined : Number(rawMin)) : undefined,
    amountMax: rawMax ? (isNaN(Number(rawMax)) ? undefined : Number(rawMax)) : undefined,
    category: sp.get('aiCat') ?? undefined,
    type: (rawType === 'income' || rawType === 'expense') ? rawType : undefined,
    keyword: sp.get('aiKey') ?? undefined,
    dateFrom: sp.get('aiFrom') ?? undefined,
    dateTo: sp.get('aiTo') ?? undefined,
  }
}
