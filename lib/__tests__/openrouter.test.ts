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
})
