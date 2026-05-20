'use client'
import { motion } from 'framer-motion'

interface ThinkingOverlayProps {
  previewUrl: string
}

const SHIMMER_ROWS = [
  { w: '60%', label: 'Amount' },
  { w: '40%', label: 'Date' },
  { w: '50%', label: 'Type' },
  { w: '45%', label: 'Category' },
]

export function ThinkingOverlay({ previewUrl }: ThinkingOverlayProps) {
  return (
    <motion.div
      className="absolute inset-0 bg-[var(--bg)] z-20 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt"
            className="max-h-64 rounded-xl shadow-lg object-contain"
          />
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ boxShadow: ['0 0 0 0px var(--accent-mid)', '0 0 0 6px var(--accent-soft)', '0 0 0 0px var(--accent-mid)'] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
      </div>

      <div className="bg-white rounded-t-3xl px-6 py-5 shadow-[0_-1px_0_var(--hairline)]">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            className="w-2 h-2 rounded-full bg-[var(--accent)]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-sm text-[var(--muted)]">Reading receipt…</span>
        </div>

        <div className="flex flex-col gap-3">
          {SHIMMER_ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs text-[var(--muted)] w-16">{row.label}</span>
              <div className="shimmer h-4 rounded flex-1" style={{ maxWidth: row.w }} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
