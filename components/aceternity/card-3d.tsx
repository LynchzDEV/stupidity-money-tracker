'use client'
import React, { createContext, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MouseEnterContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>]>(
  [false, () => {}]
)

export function CardContainer({ children, className, containerClassName }: {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMouseEntered, setIsMouseEntered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) / 25
    const y = (e.clientY - top - height / 2) / 25
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  }

  const handleMouseEnter = () => {
    setIsMouseEntered(true)
    containerRef.current && (containerRef.current.style.transition = 'none')
  }

  const handleMouseLeave = () => {
    setIsMouseEntered(false)
    if (containerRef.current) {
      containerRef.current.style.transition = 'all 0.5s ease'
      containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)'
    }
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn('flex items-center justify-center', containerClassName)}
        style={{ perspective: '1000px' }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn('relative flex items-center justify-center transition-all duration-200 ease-linear', className)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('[transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]', className)}>
      {children}
    </div>
  )
}

export function CardItem({ children, className, translateZ = 0, as: Tag = 'div', ...rest }: {
  children: React.ReactNode
  className?: string
  translateZ?: number
  as?: React.ElementType
  [key: string]: unknown
}) {
  const [isMouseEntered] = useContext(MouseEnterContext)
  return (
    <Tag
      className={cn('transition duration-200 ease-linear', className)}
      style={{ transform: isMouseEntered ? `translateZ(${translateZ}px)` : 'translateZ(0px)' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
