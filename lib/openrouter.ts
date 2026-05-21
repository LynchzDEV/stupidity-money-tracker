export interface ExtractionResult {
  amount?: number         // THB float
  type?: 'income' | 'expense'
  category?: string
  date?: string           // ISO date string YYYY-MM-DD
  note?: string
  merchantName?: string
  rejected?: boolean
  rejectReason?: string
  confidence: {
    amount: number
    type: number
    category: number
    date: number
  }
}

const SYSTEM_PROMPT_BASE = `You are a receipt and bank slip OCR assistant.
First, determine if the image is a financial document (receipt, invoice, bank slip, e-slip, PromptPay slip, payroll slip, or any document showing a monetary transaction).

If the image is NOT a financial document (e.g. selfie, food photo, landscape, screenshot of social media, random object), return ONLY this JSON and nothing else:
{ "rejected": true, "rejectReason": "<one short sentence why, e.g. 'This looks like a food photo, not a receipt.'>", "confidence": { "amount": 0, "type": 0, "category": 0, "date": 0 } }

If it IS a financial document, extract the data and return ONLY a JSON object. No markdown, no explanation, no prose.

JSON shape for valid documents:
{
  "amount": <number in THB, required>,
  "type": <"income" if money flows TO the account owner, "expense" if FROM — omit if unclear>,
  "category": <one of: "Food", "Transport", "Bills", "Shopping", "Transfer", "Salary", "Other">,
  "date": <ISO date string YYYY-MM-DD — always include if any date is visible on the document>,
  "note": <short description, merchant name or transfer counterpart>,
  "merchantName": <the core merchant/brand name only, normalised — e.g. "LINE MAN", "Grab Food", "7-Eleven", "KBank". Omit branch, location, order numbers. For bank transfers use the bank name. Omit if not determinable>,
  "confidence": {
    "amount": <0.0-1.0>,
    "type": <0.0-1.0>,
    "category": <0.0-1.0>,
    "date": <0.0-1.0>
  }
}

Rules:
- Handle Thai text (KBank=ธนาคารกสิกรไทย, SCB=ไทยพาณิชย์, KTB=กรุงไทย, BBL=กรุงเทพ)
- DATES: Thai receipts use Buddhist Era (BE) year — subtract 543 to get CE year (e.g. 2568 BE = 2025 CE, 2567 BE = 2024 CE). Always convert to CE before outputting YYYY-MM-DD.
- DATES: Thai short date formats: DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY, DD ม.ค. YYYY are all common.
- DATES: Month names in Thai — ม.ค.=Jan, ก.พ.=Feb, มี.ค.=Mar, เม.ย.=Apr, พ.ค.=May, มิ.ย.=Jun, ก.ค.=Jul, ส.ค.=Aug, ก.ย.=Sep, ต.ค.=Oct, พ.ย.=Nov, ธ.ค.=Dec
- DATES: If year is missing from the receipt but date is otherwise clear, use today's year as fallback.
- For bank transfer slips: sender account shown = expense; receiver account / "ได้รับเงิน" / "รับเงินสำเร็จ" / "ReceiveMoney" / "Transfer successful" to your account = income
- PromptPay QR received (QR code on slip, "รับชำระ", "ยืนยันการรับเงิน", amount received) = income, category Transfer
- Paper receipts (7-Eleven, Grab Food, restaurant, etc.) = expense
- Salary / payroll slips = income, category Salary
- If a field is not determinable, omit it (except confidence object which is always required)
- amount is ALWAYS in THB as a plain decimal number (e.g. 500.00 not "500 บาท")
`

export async function extractFromImage(
  base64Image: string,
  mode: 'receipt' | 'bank_slip' = 'receipt',
  today = new Date().toISOString().split('T')[0],
  merchantContext?: string,
): Promise<ExtractionResult> {
  let systemPrompt = SYSTEM_PROMPT_BASE + `\nToday's date (CE): ${today}\n`
  if (merchantContext) {
    systemPrompt += `\nMerchant history from this book (use to pick the most frequent category when the merchant name matches):\n${merchantContext}\n`
  }
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
        { role: 'system', content: systemPrompt },
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
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExtractionResult
}
