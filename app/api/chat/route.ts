import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

interface Extraction {
  amount?: number
  type?: string
  category?: string
  date?: string
  note?: string
  confidence: { amount: number; type: number; category: number; date: number }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { extraction, history, userMessage } = await req.json() as {
    extraction: Extraction
    history: ChatMessage[]
    userMessage: string
  }

  const systemPrompt = `You are an expense tracking assistant helping the user correct transaction data extracted from a receipt or bank slip.

Current transaction data:
${JSON.stringify({ amount: extraction.amount, type: extraction.type, category: extraction.category, date: extraction.date, note: extraction.note }, null, 2)}

Categories available: Food, Transport, Bills, Shopping, Transfer, Salary, Other
Types: "income" (money received) or "expense" (money spent)

Based on the user's message, decide what fields to update. Respond with JSON only — no markdown, no prose:
{
  "message": "<friendly 1-sentence confirmation of what changed, or clarification if unclear>",
  "updates": {
    "amount": <THB number — only if changing>,
    "type": <"income" or "expense" — only if changing>,
    "category": <category string — only if changing>,
    "date": <"YYYY-MM-DD" — only if changing>,
    "note": <string — only if changing>
  }
}

If nothing needs changing, return "updates": {}. Keep message short and natural.`

  const messages = [
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: `AI error ${res.status}` }, { status: 500 })

  const data = await res.json()
  const content: string = data.choices[0].message.content
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ message: 'Sorry, I had trouble understanding that.', updates: {} })
  }
}
