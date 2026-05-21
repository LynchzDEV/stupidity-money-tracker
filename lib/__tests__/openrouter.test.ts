import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { extractFromImage, type ExtractionResult } from '../openrouter'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'test-key'
})

describe('extractFromImage', () => {
  it('parses a fully confident extraction', async () => {
    const mockResult: ExtractionResult = {
      amount: 79.00,
      type: 'expense',
      category: 'Food',
      date: '2026-05-20',
      note: '7-Eleven Sukhumvit 31',
      merchantName: '7-Eleven',
      confidence: { amount: 0.98, type: 0.85, category: 0.90, date: 0.95 },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    })

    const result = await extractFromImage('base64data')
    expect(result.amount).toBe(79.00)
    expect(result.type).toBe('expense')
    expect(result.category).toBe('Food')
    expect(result.confidence.amount).toBe(0.98)
  })

  it('handles JSON wrapped in markdown code block', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '```json\n{"amount":500,"type":"income","category":"Transfer","date":"2026-05-20","note":"KBank","confidence":{"amount":0.99,"type":0.6,"category":0.92,"date":0.99}}\n```',
          },
        }],
      }),
    })
    const result = await extractFromImage('base64data')
    expect(result.amount).toBe(500)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(extractFromImage('base64data')).rejects.toThrow('OpenRouter error: 429')
  })

  it('injects merchant context into system prompt when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          amount: 150, type: 'expense', category: 'Food',
          date: '2026-05-21', note: 'LINE MAN',
          confidence: { amount: 0.95, type: 0.9, category: 0.92, date: 0.9 },
        }) } }],
      }),
    })

    await extractFromImage('base64data', 'receipt', '2026-05-21', 'LINE MAN: Food×15, Transport×4')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const systemContent: string = body.messages[0].content
    expect(systemContent).toContain('LINE MAN: Food×15, Transport×4')
    expect(systemContent).toContain('Merchant history from this book')
  })

  it('passes through merchantName when present in AI response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          amount: 89, type: 'expense', category: 'Food',
          date: '2026-05-21', note: 'LINE MAN Siam Paragon 3F',
          merchantName: 'LINE MAN',
          confidence: { amount: 0.95, type: 0.9, category: 0.9, date: 0.9 },
        }) } }],
      }),
    })

    const result = await extractFromImage('base64data')
    expect(result.merchantName).toBe('LINE MAN')
    expect(result.note).toBe('LINE MAN Siam Paragon 3F')
  })

  it('does not inject merchant section when context is empty string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          amount: 50, type: 'expense', category: 'Other',
          date: '2026-05-21', note: 'Unknown',
          confidence: { amount: 0.9, type: 0.8, category: 0.5, date: 0.9 },
        }) } }],
      }),
    })

    await extractFromImage('base64data', 'receipt', '2026-05-21', '')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const systemContent: string = body.messages[0].content
    expect(systemContent).not.toContain('Merchant history from this book')
  })
})
