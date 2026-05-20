'use client'
import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon } from 'lucide-react'

interface UploadZoneProps {
  onFile: (file: File) => void
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    onFile(file)
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      <button
        onClick={() => fileRef.current?.click()}
        className={`w-full max-w-xs aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--hairline)] bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <Camera size={40} className="text-[var(--accent)]" />
        <div className="text-center">
          <div className="font-medium text-[var(--ink)] text-sm">Snap a receipt</div>
          <div className="text-xs text-[var(--muted)] mt-1">
            KBank, SCB, KTB, paper receipts
          </div>
        </div>
      </button>

      <button
        className="flex items-center gap-2 text-sm text-[var(--muted)]"
        onClick={() => {
          if (fileRef.current) {
            fileRef.current.removeAttribute('capture')
            fileRef.current.click()
          }
        }}
      >
        <ImageIcon size={16} /> Choose from gallery
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
