'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTHB, thbToSatang } from '@/lib/utils'

interface ExtractionResult {
  amount?: number
  type?: string
  category?: string
  date?: string
  note?: string
  merchantName?: string
  confidence: { amount: number; type: number; category: number; date: number }
}

interface ConfirmSheetProps {
  extraction: ExtractionResult
  previewUrl: string
  bookName: string
  bookId: string
  onSave: (data: { amount: number; type: string; category: string; date: string; note: string; merchantName?: string }) => void
  onDiscard: () => void
  queueLabel?: string
}

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

function SparkIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
    </svg>
  )
}

function DataChip({ children, kind }: { children: React.ReactNode; kind?: 'expense' | 'income' | 'neutral' }) {
  const bg = kind === 'expense' ? 'var(--expense-bg)' : kind === 'income' ? 'var(--income-bg)' : 'var(--accent-soft)'
  const ink = kind === 'expense' ? 'var(--expense)' : kind === 'income' ? 'var(--income)' : 'var(--accent-ink)'
  const br = kind === 'expense' ? '#e9d3c6' : kind === 'income' ? '#cbe6d4' : 'var(--accent-mid)'
  return (
    <span className="inline-flex items-center gap-1 rounded-[7px] text-[14px] font-medium whitespace-nowrap"
      style={{ padding: '2px 7px 3px', background: bg, border: `1px solid ${br}`, color: ink, margin: '0 1px' }}>
      {children}
    </span>
  )
}

export function ConfirmSheet({ extraction, previewUrl, bookName, bookId, onSave, onDiscard, queueLabel }: ConfirmSheetProps) {
  const [amount, setAmount] = useState(extraction.amount ?? 0)
  const [type, setType] = useState(extraction.type ?? '')
  const [category, setCategory] = useState(extraction.category ?? 'Other')
  const [date, setDate] = useState(extraction.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(extraction.note ?? '')
  const [merchantName, setMerchantName] = useState(extraction.merchantName ?? '')
  const [typeAnswered, setTypeAnswered] = useState(!!extraction.type && (extraction.confidence.type ?? 0) >= 0.7)

  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [language, setLanguage] = useState<'auto' | 'th' | 'en'>(() => {
    if (typeof window === 'undefined') return 'auto'
    return (localStorage.getItem('ai-language') as 'auto' | 'th' | 'en') ?? 'auto'
  })
  const [langPopoverOpen, setLangPopoverOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const langPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!langPopoverOpen) return
    function onOutside(e: MouseEvent | TouchEvent) {
      if (langPopoverRef.current && !langPopoverRef.current.contains(e.target as Node)) {
        setLangPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [langPopoverOpen])

  function selectLanguage(lang: 'auto' | 'th' | 'en') {
    setLanguage(lang)
    localStorage.setItem('ai-language', lang)
    setLangPopoverOpen(false)
  }

  const needsType = !typeAnswered
  const amtFormatted = formatTHB(thbToSatang(amount))
  const dateFormatted = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatHistory, thinking])

  function handleTypeAnswer(t: string) {
    setType(t)
    setTypeAnswered(true)
  }

  const currentExtraction = { amount, type, category, date, note, merchantName, confidence: extraction.confidence }

  async function sendMessage() {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    const userMsg: ChatMsg = { role: 'user', text }
    setChatHistory(prev => [...prev, userMsg])
    setThinking(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ extraction: currentExtraction, history: chatHistory, userMessage: text, language, bookId }),
      })
      const data = await res.json()
      const updates = data.updates ?? {}
      if (updates.amount != null) setAmount(updates.amount)
      if (updates.type) { setType(updates.type); setTypeAnswered(true) }
      if (updates.category) setCategory(updates.category)
      if (updates.date) setDate(updates.date)
      if (updates.note != null) setNote(updates.note)
      if (updates.merchantName != null) setMerchantName(updates.merchantName)
      setChatHistory(prev => [...prev, { role: 'ai', text: data.message ?? 'Done.' }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-30 flex flex-col"
      style={{ background: 'var(--bg)', height: '100dvh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 44px)' }}>
        <button onClick={onDiscard}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
        <div className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13.5px] font-medium"
          style={{ background: 'rgba(255,255,255,.85)', border: '1px solid var(--hairline)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          {bookName}
          {queueLabel && (
            <span className="text-[var(--muted)] font-normal">· {queueLabel}</span>
          )}
        </div>
        <div ref={langPopoverRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setLangPopoverOpen(p => !p)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60 transition-opacity"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <ellipse cx="12" cy="12" rx="4" ry="10"/>
              <path d="M2 12h20"/>
            </svg>
          </button>
          {langPopoverOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 14,
                boxShadow: '0 4px 20px rgba(0,0,0,.12)',
                overflow: 'hidden',
                zIndex: 50,
                minWidth: 110,
              }}>
              {(['auto', 'th', 'en'] as const).map((lang, i, arr) => (
                <button
                  key={lang}
                  onClick={() => selectLanguage(lang)}
                  className="flex items-center gap-2.5 w-full text-left active:opacity-60 transition-opacity"
                  style={{
                    padding: '11px 14px',
                    fontSize: 13,
                    fontWeight: language === lang ? 600 : 400,
                    color: language === lang ? 'var(--accent)' : 'var(--ink)',
                    background: language === lang ? 'var(--accent-soft)' : 'transparent',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none',
                  }}>
                  <span style={{ width: 14, color: 'var(--accent)', fontSize: 11 }}>
                    {language === lang ? '✓' : ''}
                  </span>
                  {lang === 'auto' ? 'Auto' : lang === 'th' ? 'ภาษาไทย' : 'English'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-none px-4 pb-4 pt-2"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* Receipt thumbnail */}
        {previewUrl && (
          <div className="flex justify-end mb-4">
            <div className="rounded-[18px] rounded-br-[4px] overflow-hidden p-2"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Receipt" className="rounded-xl max-h-48 object-contain" style={{ maxWidth: 200 }} />
            </div>
          </div>
        )}

        {/* AI extraction summary */}
        <div className="flex gap-2 items-start mb-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            <SparkIcon size={14} color="#fff" />
          </div>
          <motion.div
            className="rounded-[18px] rounded-bl-[4px] p-3.5 text-[15px] leading-relaxed max-w-[85%]"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', boxShadow: 'var(--shadow-sm)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}>
            <span className="text-[var(--ink)]">Got it. </span>
            <DataChip>
              <span className="font-[family-name:var(--font-mono)]">{amtFormatted}</span>
            </DataChip>{' '}
            {note && (
              <>
                <span className="text-[var(--ink)]">at </span>
                <DataChip>{note}</DataChip>
                <span className="text-[var(--ink)]">, </span>
              </>
            )}
            {typeAnswered && type && (
              <DataChip kind={type === 'income' ? 'income' : 'expense'}>{type}</DataChip>
            )}
            {typeAnswered && (
              <>
                <span className="text-[var(--ink)]">{type ? ' in ' : ' · '}</span>
                <DataChip>{category}</DataChip>
                <span className="text-[var(--ink)]">.</span>
              </>
            )}
            <div className="mt-2.5 pt-2.5 flex items-center gap-1.5 text-[12.5px] text-[var(--muted)]"
              style={{ borderTop: '1px dashed var(--hairline)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M6 4h12v17l-6-4-6 4V4Z"/>
              </svg>
              Saved to <span className="text-[var(--ink)] font-medium">{bookName}</span>
              {' · '}
              <span className="font-[family-name:var(--font-mono)]">{dateFormatted}</span>
            </div>
          </motion.div>
        </div>

        {/* Quick reply suggestions — shown when extraction is done and no chat yet */}
        {typeAnswered && chatHistory.length === 0 && (
          <motion.div className="ml-9 flex flex-wrap gap-2 mb-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {[
              !note ? '+ Add note' : null,
              'Change category',
              type !== 'income' ? 'Mark as income' : 'Mark as expense',
            ].filter(Boolean).map(t => (
              <button key={t as string}
                onClick={() => { setInput(t as string); inputRef.current?.focus() }}
                className="px-3 py-1.5 rounded-full text-[12.5px] active:opacity-70 transition-opacity"
                style={{ background: 'transparent', border: '1px solid var(--hairline)', color: 'var(--ink2)' }}>
                {t}
              </button>
            ))}
          </motion.div>
        )}

        {/* Type disambiguation */}
        <AnimatePresence>
          {needsType && (
            <>
              <motion.div className="flex gap-2 items-start mb-3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 }}>
                <div className="w-7 flex-shrink-0" />
                <div className="rounded-[18px] rounded-bl-[4px] p-3.5 text-[14.5px] leading-relaxed max-w-[85%]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', boxShadow: 'var(--shadow-sm)' }}>
                  Was this{' '}
                  <DataChip kind="income">money in</DataChip>
                  {' '}or{' '}
                  <DataChip kind="expense">money out</DataChip>?
                </div>
              </motion.div>
              <motion.div className="ml-9 flex flex-wrap gap-2 mb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.55 }}>
                {[
                  { id: 'income', label: 'Money in', kind: 'income' as const },
                  { id: 'expense', label: 'Transfer out', kind: 'expense' as const },
                  { id: 'expense', label: 'Expense', kind: 'expense' as const },
                ].map((opt, i) => (
                  <button key={i}
                    onClick={() => handleTypeAnswer(opt.id)}
                    className="px-3.5 py-2 rounded-full text-[13px] font-medium active:scale-95 transition-transform"
                    style={{
                      background: 'var(--surface)',
                      color: opt.kind === 'income' ? 'var(--income)' : 'var(--expense)',
                      border: `1px solid ${opt.kind === 'income' ? 'var(--income)' : 'var(--expense)'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat history */}
        {chatHistory.map((msg, i) => (
          <motion.div key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2 items-start'} mb-3`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent)' }}>
                <SparkIcon size={14} color="#fff" />
              </div>
            )}
            <div
              className="rounded-[18px] px-3.5 py-2.5 text-[14px] leading-snug max-w-[78%]"
              style={msg.role === 'user'
                ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: 4 }
                : { background: 'var(--surface)', border: '1px solid var(--hairline2)', color: 'var(--ink)', borderBottomLeftRadius: 4 }
              }>
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <motion.div className="flex gap-2 items-start mb-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)' }}>
              <SparkIcon size={14} color="#fff" />
            </div>
            <div className="rounded-[18px] rounded-bl-[4px] px-3.5 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--accent)', animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 pt-2"
        style={{
          background: 'var(--bg)',
          borderTop: '1px solid var(--hairline)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}>

        {/* Chat input row */}
        <div className="flex gap-2 mb-2.5">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="e.g. change to ฿200, mark as income…"
            disabled={thinking}
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 h-11 rounded-2xl px-3.5 text-[14px] outline-none disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', color: 'var(--ink)' }}
          />
        </div>

        {/* Save row — edit icon + save button (matches design) */}
        <div className="flex gap-2.5">
          <button
            onClick={() => inputRef.current?.focus()}
            className="w-14 h-[52px] rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity flex-shrink-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/>
            </svg>
          </button>
          {input.trim() ? (
            <button
              onClick={sendMessage}
              disabled={thinking}
              className="flex-1 h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
              style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              Send
            </button>
          ) : (
            <button
              disabled={!typeAnswered || !amount}
              onClick={() => onSave({ amount, type, category, date, note, merchantName: merchantName || extraction.merchantName })}
              className="flex-1 h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
              style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5"/>
              </svg>
              {typeAnswered && amount ? `Save · ${amtFormatted}` : 'Pick one to save'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
