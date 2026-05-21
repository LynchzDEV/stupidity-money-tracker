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

  const { query } = await req.json() as { query: string }
  if (!query?.trim()) return NextResponse.json({})

  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = SYSTEM_PROMPT.replace('{TODAY}', today)

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

  if (!res.ok) return NextResponse.json({}, { status: 200 })

  const data = await res.json()
  const content: string = data.choices[0].message.content
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  try {
    const filters = JSON.parse(cleaned) as AiSearchFilters
    return NextResponse.json(filters)
  } catch {
    return NextResponse.json({})
  }
}
