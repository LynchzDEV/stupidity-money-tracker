'use client'
import { motion } from 'framer-motion'

interface SavedToastProps {
  amount?: number
  bookName?: string
}

export function SavedToast({ amount, bookName }: SavedToastProps) {
  const formatted = amount ? `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: '#0c0d0a' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 70% at 50% 50%, #2a2823 0%, #0c0d0a 70%)' }} />
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.4)' }} />

      {/* Center checkmark */}
      <div className="absolute flex flex-col items-center gap-4 left-0 right-0" style={{ top: '42%', transform: 'translateY(-50%)' }}>
        <motion.div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center animate-pop"
          style={{ background: 'var(--accent)', boxShadow: '0 8px 32px rgba(14,92,58,.5)' }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5"/>
          </svg>
        </motion.div>
        <motion.div className="text-center text-white animate-fadeup"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {formatted && (
            <div className="font-[family-name:var(--font-mono)] text-[32px] font-semibold tracking-tight">{formatted}</div>
          )}
          {bookName && (
            <div className="text-[14px] mt-1" style={{ opacity: 0.7 }}>Saved to {bookName}</div>
          )}
        </motion.div>
      </div>

      {/* Undo bar */}
      <motion.div
        className="absolute left-4 right-4 flex items-center justify-between px-3.5 py-2.5 rounded-2xl"
        style={{
          bottom: 110,
          background: 'rgba(255,255,255,.1)',
          border: '1px solid rgba(255,255,255,.18)',
          backdropFilter: 'blur(20px)',
        }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <span className="text-[13px] text-white">Returning to camera…</span>
        <span className="text-[13px] font-semibold" style={{ color: '#9bd9b4' }}>Undo</span>
      </motion.div>

      <div className="absolute bottom-[60px] left-0 right-0 text-center text-[12px]" style={{ color: 'rgba(255,255,255,.5)' }}>
        Next receipt — just shoot
      </div>
    </motion.div>
  )
}
