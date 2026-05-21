'use client'
import { cn } from '@/lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  colorFrom?: string
  colorTo?: string
}

export function BorderBeam({
  className,
  size = 100,
  duration = 3,
  colorFrom = 'transparent',
  colorTo = '#44ff90',
}: BorderBeamProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden', className)}>
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size / 2,
          background: `radial-gradient(ellipse at center, ${colorTo} 0%, ${colorFrom} 70%)`,
          offsetPath: 'rect(0px auto auto 0px round 16px)',
          animation: `border-beam ${duration}s linear infinite`,
          opacity: 0.9,
          filter: 'blur(3px)',
        } as React.CSSProperties}
      />
    </div>
  )
}
