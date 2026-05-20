export interface ExtractionResult {
  amount?: number         // THB float
  type?: 'income' | 'expense'
  category?: string
  date?: string           // ISO date string YYYY-MM-DD
  note?: string
  confidence: {
    amount: number
    type: number
    category: number
    date: number
  }
}

const SYSTEM_PROMPT = `You are a receipt and bank slip OCR assistant.
Extract transaction data from the provided image and return ONLY a JSON object.
No markdown, no explanation, no prose — only raw JSON.

JSON shape:
{
  "amount": <number in THB, required>,
  "type": <"income" if money flows TO the account owner, "expense" if FROM — omit if unclear>,
  "category": <one of: "Food", "Transport", "Bills", "Shopping", "Transfer", "Salary", "Other">,
  "date": <ISO date string YYYY-MM-DD>,
  "note": <short description, merchant name or transfer counterpart>,
  "confidence": {
    "amount": <0.0-1.0>,
    "type": <0.0-1.0>,
    "category": <0.0-1.0>,
    "date": <0.0-1.0>
  }
}

Rules:
- Handle Thai text (KBank=ธนาคารกสิกรไทย, SCB=ไทยพาณิชย์, KTB=กรุงไทย, BBL=กรุงเทพ)
- For bank transfer slips: sender account shown = expense; receiver account / "ได้รับเงิน" / "รับเงินสำเร็จ" / "ReceiveMoney" / "Transfer successful" to your account = income
- PromptPay QR received (QR code on slip, "รับชำระ", "ยืนยันการรับเงิน", amount received) = income, category Transfer
- Paper receipts (7-Eleven, Grab Food, restaurant, etc.) = expense
- Salary / payroll slips = income, category Salary
- If a field is not determinable, omit it (except confidence object which is always required)
- amount is ALWAYS in THB as a plain decimal number (e.g. 500.00 not "500 บาท")
`

export async function extractFromImage(base64Image: string, mode: 'receipt' | 'bank_slip' = 'receipt'): Promise<ExtractionResult> {
  const userText = mode === 'bank_slip'
    ? 'Extract transaction data from this bank transfer slip (KBank/SCB/KTB/BBL e-slip). Focus on amount and date; type/category may be ambiguous.'
    : 'Extract transaction data from this receipt.'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)

  const data = await res.json()
  const content: string = data.choices[0].message.content

  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExtractionResult
}
