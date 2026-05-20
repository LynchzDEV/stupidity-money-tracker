'use client'
import React from 'react'
import { cn } from '@/lib/utils'

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="beam1" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#beam1)" />
        {[...Array(3)].map((_, i) => (
          <line
            key={i}
            x1={`${20 + i * 30}%`}
            y1="0%"
            x2={`${10 + i * 35}%`}
            y2="100%"
            stroke="var(--accent-mid)"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
        ))}
      </svg>
    </div>
  )
}
