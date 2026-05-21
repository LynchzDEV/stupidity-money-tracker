'use client'
import { cn } from '@/lib/utils'

interface RippleProps {
  className?: string
  numCircles?: number
  baseSize?: number
  spread?: number
  color?: string
  children?: React.ReactNode
}

export function Ripple({
  className,
  numCircles = 5,
  baseSize = 60,
  spread = 72,
  color = 'rgba(14,92,58',
  children,
}: RippleProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {Array.from({ length: numCircles }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full border-[1.5px]"
          style={{
            width:  baseSize + i * spread,
            height: baseSize + i * spread,
            borderColor: `${color},${Math.max(0.04, 0.45 - i * 0.08)})`,
            animation: `ripple 2.2s cubic-bezier(0,0,0.2,1) ${i * 0.35}s infinite`,
          }}
        />
      ))}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
