import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { AiSearchFilters } from '@/lib/search'

const SYSTEM_PROMPT = `You parse a Thai/English natural language finance search query into structured filters.
Categories available: Food, Transport, Shopping, Bills, Salary, Transfer, Other.
Return ONLY a JSON object. No explanation. No markdown.
JSON shape (all fields optional):
{
  "amountMin": <THB number>,
  "amountMax": <THB number>,
  "category": <category string>,
  "type": <"income" | "expense">,
  "keyword": <short text to match in note/merchant>,
  "dateFrom": <YYYY-MM-DD>,
  "dateTo": <YYYY-MM-DD>
}
Today: {TODAY}`

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({})
  }
  const query = typeof (raw as { query?: unknown })?.query === 'string'
    ? ((raw as { query: string }).query).trim()
    : ''
  if (!query || query.length > 500) return NextResponse.json({})

  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = SYSTEM_PROMPT.replace('{TODAY}', today)

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[ai-search] OPENROUTER_API_KEY not set')
    return NextResponse.json({})
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
    }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    console.error('[ai-search] OpenRouter error', res.status)
    return NextResponse.json({})
  }

  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''
  if (!content) return NextResponse.json({})
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    const filters: AiSearchFilters = {}
    if (typeof parsed.amountMin === 'number') filters.amountMin = parsed.amountMin
    if (typeof parsed.amountMax === 'number') filters.amountMax = parsed.amountMax
    if (['Food','Transport','Shopping','Bills','Salary','Transfer','Other'].includes(parsed.category)) filters.category = parsed.category
    if (parsed.type === 'income' || parsed.type === 'expense') filters.type = parsed.type
    if (typeof parsed.keyword === 'string' && parsed.keyword) filters.keyword = parsed.keyword
    if (typeof parsed.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateFrom)) filters.dateFrom = parsed.dateFrom
    if (typeof parsed.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateTo)) filters.dateTo = parsed.dateTo
    return NextResponse.json(filters)
  } catch {
    return NextResponse.json({})
  }
}
