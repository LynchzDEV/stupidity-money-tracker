'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookChip } from '@/components/book-chip';
import { BookSheet } from '@/components/book-sheet';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { SavedToast } from '@/components/saved-toast';

type CaptureMode = 'Receipt' | 'Bank slip' | 'Manual';

interface Book {
  id: string;
  name: string;
  emoji: string;
  isDefault: boolean;
  updatedAt: Date;
  _count?: { transactions: number };
}

interface ExtractionResult {
  amount?: number;
  type?: string;
  category?: string;
  date?: string;
  note?: string;
  confidence: { amount: number; type: number; category: number; date: number };
}

type Stage = 'idle' | 'thinking' | 'confirm' | 'saved' | 'error';
type CameraState = 'starting' | 'active' | 'denied' | 'unavailable';

export function UploadPageClient({
  book,
  books,
}: {
  book: Book;
  books: Book[];
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('starting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment',
  );
  const [stage, setStage] = useState<Stage>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [assetId, setAssetId] = useState('');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookList, setBookList] = useState(books);
  const [errorMsg, setErrorMsg] = useState('');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('Receipt');
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setFlashOn(false);
    setCameraState('starting');

    // getUserMedia requires a secure context (HTTPS or localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      // Try high-res first
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraState('denied');
        return;
      }
      // OverconstrainedError or other — retry with minimal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
      } catch (err2) {
        const e2 = err2 as Error;
        if (e2.name === 'NotAllowedError' || e2.name === 'PermissionDeniedError') {
          setCameraState('denied');
        } else {
          setCameraState('unavailable');
        }
        return;
      }
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    // Check torch support (Chrome on Android; absent on iOS/desktop)
    const track = stream.getVideoTracks()[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caps = (track as any).getCapabilities?.() as Record<string, unknown> | undefined;
    setFlashSupported(!!caps?.torch);
    setCameraState('active');
  }, []);

  async function toggleFlash() {
    if (!flashSupported || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const next = !flashOn;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setFlashOn(next);
    } catch {
      // torch not actually available on this device
      setFlashSupported(false);
    }
  }

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, startCamera]);

  function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return new Promise<File>(resolve => {
      canvas.toBlob(
        blob => {
          resolve(new File([blob!], 'capture.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    });
  }

  async function handleShutter() {
    if (stage === 'thinking') return;
    if (captureMode === 'Manual') {
      router.push(`/${book.id}/manual`);
      return;
    }
    const file = await captureFrame();
    if (file) await handleFile(file);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (captureMode === 'Manual') {
      router.push(`/${book.id}/manual`);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStage('thinking');
    setErrorMsg('');

    const form = new FormData();
    form.append('image', file);
    form.append('mode', captureMode === 'Bank slip' ? 'bank_slip' : 'receipt');
    try {
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAssetId(data.assetId ?? '');
      setExtraction(data.extraction);
      setStage('confirm');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setStage('error');
    }
  }

  async function handleSave(confirmed: {
    amount: number;
    type: string;
    category: string;
    date: string;
    note: string;
  }) {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bookId: book.id,
        immichAssetId: assetId || null,
        ...confirmed,
      }),
    });
    setStage('saved');
    setTimeout(() => {
      setStage('idle');
      setExtraction(null);
      setPreviewUrl('');
    }, 2800);
  }

  async function handleSetDefault(bookId: string) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    setBookList(prev => prev.map(b => ({ ...b, isDefault: b.id === bookId })));
  }

  const booksForSheet = bookList.map(b => ({
    ...b,
    updatedAt:
      b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
    _count: b._count ?? { transactions: 0 },
  }));

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Live camera feed */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ display: cameraState === 'active' ? 'block' : 'none' }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark gradient overlay (top + bottom) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,.5) 0%, transparent 25%, transparent 60%, rgba(0,0,0,.65) 100%)',
        }}
      />

      {/* Camera not available fallback */}
      {(cameraState === 'denied' || cameraState === 'unavailable') && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              'radial-gradient(120% 70% at 50% 50%, #2a2823 0%, #0c0d0a 70%)',
          }}
        >
          <div className="text-center px-8">
            <div className="text-white text-[15px] font-medium mb-2">
              {cameraState === 'denied'
                ? 'Camera access denied'
                : 'Camera unavailable'}
            </div>
            <div
              className="text-[13px] mb-5"
              style={{ color: 'rgba(255,255,255,.6)' }}
            >
              {cameraState === 'denied'
                ? 'Allow camera access in browser settings, or use gallery.'
                : !navigator.mediaDevices?.getUserMedia
                  ? 'Camera requires HTTPS. Open via https:// or use gallery.'
                  : 'Use gallery to pick a receipt.'}
            </div>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-white mb-3 block mx-auto"
              style={{ background: 'var(--accent)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Starting — aperture + sonar rings */}
      {cameraState === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 52%, rgba(14,92,58,.18) 0%, #0c0d0a 70%)' }}>
          {/* Sonar rings */}
          <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
            {[0, 0.55, 1.1].map((delay, i) => (
              <div key={i} className="absolute rounded-full" style={{
                inset: 0,
                border: '1.5px solid rgba(14,92,58,.55)',
                animation: `ring-out 1.8s ease-out ${delay}s infinite`,
              }} />
            ))}
            {/* Aperture — slow spin */}
            <div style={{ animation: 'aperture-spin 6s linear infinite' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                {Array.from({ length: 6 }, (_, i) => {
                  const angle = (i * 60 * Math.PI) / 180
                  const cx = 32 + 10 * Math.cos(angle)
                  const cy = 32 + 10 * Math.sin(angle)
                  return (
                    <ellipse key={i} cx={cx} cy={cy} rx={11} ry={5}
                      transform={`rotate(${i * 60 + 30} ${cx} ${cy})`}
                      fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.32)" strokeWidth={0.8} />
                  )
                })}
                <circle cx="32" cy="32" r="4.5" fill="rgba(255,255,255,.55)" />
              </svg>
            </div>
          </div>
          <div className="mt-7 text-[12.5px] font-medium tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,.38)', letterSpacing: '0.1em' }}>
            Starting camera
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'inline-block', marginLeft: 3,
                animation: `pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite`,
              }}>·</span>
            ))}
          </div>
        </div>
      )}

      {/* Thinking — preview + scan line + corner brackets */}
      {stage === 'thinking' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
          style={{ background: 'rgba(0,0,0,.72)' }}>
          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden"
              style={{ maxWidth: 220, boxShadow: '0 0 0 1px rgba(255,255,255,.15), 0 16px 40px rgba(0,0,0,.6)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="block max-h-64 object-contain opacity-80"
                style={{ maxWidth: 220 }} />
              {/* Scan line */}
              <div className="absolute left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(14,92,58,.9) 30%, rgba(100,255,180,.9) 50%, rgba(14,92,58,.9) 70%, transparent 100%)',
                  boxShadow: '0 0 8px 2px rgba(14,92,58,.6)',
                  animation: 'scan-line 1.6s linear infinite',
                }} />
              {/* Corner brackets */}
              {([[0,0],[0,1],[1,0],[1,1]] as [number,number][]).map(([v,h], k) => (
                <div key={k} style={{
                  position: 'absolute',
                  [v ? 'bottom' : 'top']: 6,
                  [h ? 'right' : 'left']: 6,
                  width: 14, height: 14,
                  borderTop: !v ? '2px solid rgba(14,255,120,.7)' : undefined,
                  borderBottom: v ? '2px solid rgba(14,255,120,.7)' : undefined,
                  borderLeft: !h ? '2px solid rgba(14,255,120,.7)' : undefined,
                  borderRight: h ? '2px solid rgba(14,255,120,.7)' : undefined,
                  borderTopLeftRadius: !v && !h ? 4 : 0,
                  borderTopRightRadius: !v && h ? 4 : 0,
                  borderBottomLeftRadius: v && !h ? 4 : 0,
                  borderBottomRightRadius: v && h ? 4 : 0,
                } as React.CSSProperties} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent)', animation: `pulse-dot 1.1s ease-in-out ${i * 0.18}s infinite` }} />
              ))}
            </div>
            <span className="text-[12.5px] font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,.55)', letterSpacing: '0.06em' }}>
              Reading {captureMode === 'Bank slip' ? 'slip' : 'receipt'}
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {stage === 'error' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8">
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div className="text-[15px] font-medium text-[var(--ink)] mb-1">
              Extraction failed
            </div>
            <div className="text-[13px] text-[var(--muted)] mb-4">
              {errorMsg}
            </div>
            <button
              onClick={() => setStage('idle')}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-white active:scale-95 transition-transform"
              style={{ background: 'var(--accent)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Top chrome */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4"
        style={{ paddingTop: 56 }}
      >
        <BookChip name={book.name} dark onClick={() => setSheetOpen(true)} />
        <button
          onClick={toggleFlash}
          disabled={!flashSupported}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 transition-all disabled:opacity-30"
          style={{
            background: flashOn ? 'rgba(255,220,50,.85)' : 'rgba(20,22,18,.55)',
            border: `1px solid ${flashOn ? 'rgba(255,220,50,.6)' : 'rgba(255,255,255,.12)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={flashOn ? '#1a1200' : '#fff'}
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
          </svg>
        </button>
      </div>

      {/* Viewfinder corners + auto-detect badge (idle, camera active, not manual) */}
      {stage === 'idle' && cameraState === 'active' && captureMode !== 'Manual' && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{ inset: '110px 28px 220px' }}
        >
          {(
            [
              [0, 0],
              [0, 1],
              [1, 0],
              [1, 1],
            ] as [number, number][]
          ).map(([v, h], k) => (
            <div
              key={k}
              style={
                {
                  position: 'absolute',
                  [v ? 'bottom' : 'top']: -1,
                  [h ? 'right' : 'left']: -1,
                  width: 22,
                  height: 22,
                  borderTop: !v ? '2px solid rgba(255,255,255,.9)' : undefined,
                  borderBottom: v
                    ? '2px solid rgba(255,255,255,.9)'
                    : undefined,
                  borderLeft: !h ? '2px solid rgba(255,255,255,.9)' : undefined,
                  borderRight: h ? '2px solid rgba(255,255,255,.9)' : undefined,
                  borderTopLeftRadius: !v && !h ? 8 : 0,
                  borderTopRightRadius: !v && h ? 8 : 0,
                  borderBottomLeftRadius: v && !h ? 8 : 0,
                  borderBottomRightRadius: v && h ? 8 : 0,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Mode pill — above nav */}
      {stage !== 'confirm' && <div
        className="absolute left-0 right-0 z-10 flex justify-center"
        style={{ bottom: 156 }}
      >
        <div
          style={{
            display: 'flex', gap: 4, padding: 3, borderRadius: 99,
            background: 'rgba(20,22,18,.55)',
            border: '1px solid rgba(255,255,255,.12)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {(['Receipt', 'Bank slip', 'Manual'] as CaptureMode[]).map(m => (
            <button
              key={m}
              onClick={() => setCaptureMode(m)}
              className="active:opacity-80 transition-opacity"
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                background: captureMode === m ? '#fff' : 'transparent',
                color: captureMode === m ? 'var(--ink)' : 'rgba(255,255,255,.78)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>}

      {/* Bottom nav: Stats | Shutter | History */}
      {stage !== 'confirm' && <div
        className="absolute left-0 right-0 z-30 flex items-center justify-center"
        style={{ bottom: 50, gap: 36 }}
      >
        {/* Stats */}
        <button
          onClick={() => router.push(`/${book.id}/dashboard`)}
          className="flex flex-col items-center active:opacity-70 transition-opacity"
          style={{ color: 'rgba(255,255,255,.85)', minWidth: 64, gap: 3 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
          </svg>
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>Stats</span>
        </button>

        {/* Shutter */}
        <button
          onClick={handleShutter}
          disabled={stage === 'thinking' || (captureMode !== 'Manual' && cameraState !== 'active')}
          className="flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
          style={{
            width: 78, height: 78, borderRadius: 99,
            border: '4px solid rgba(255,255,255,.85)',
            padding: 4,
            boxShadow: stage === 'thinking'
              ? '0 0 0 6px rgba(14,92,58,.4)'
              : '0 8px 24px rgba(0,0,0,.4)',
            animation: stage === 'thinking' ? 'glow-shutter 1.4s ease-in-out infinite' : undefined,
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{
              background: stage === 'thinking' ? 'var(--accent)' : captureMode === 'Manual' ? 'var(--accent)' : '#fff',
            }}
          >
            {stage === 'thinking' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
              </svg>
            )}
            {stage !== 'thinking' && captureMode === 'Manual' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/>
              </svg>
            )}
          </div>
        </button>

        {/* History */}
        <button
          onClick={() => router.push(`/${book.id}/history`)}
          className="flex flex-col items-center active:opacity-70 transition-opacity"
          style={{ color: 'rgba(255,255,255,.85)', minWidth: 64, gap: 3 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>History</span>
        </button>
      </div>}

      {/* Gallery — corner left */}
      {stage !== 'confirm' && <button
        onClick={() => galleryRef.current?.click()}
        className="absolute z-40 flex items-center justify-center active:opacity-70 transition-opacity"
        style={{
          bottom: 64, left: 18, width: 38, height: 38, borderRadius: 11,
          background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <circle cx="9" cy="10" r="1.5"/>
          <path d="M21 16l-5-5-9 9"/>
        </svg>
      </button>}

      {/* Flip — corner right */}
      {stage !== 'confirm' && <button
        onClick={flipCamera}
        className="absolute z-40 flex items-center justify-center active:opacity-70 transition-opacity"
        style={{
          bottom: 64, right: 18, width: 38, height: 38, borderRadius: 11,
          background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h11l-2-2M20 17H9l2 2"/>
          <path d="M4 7v3M20 17v-3"/>
        </svg>
      </button>}

      {/* Confirm sheet */}
      {stage === 'confirm' && extraction && (
        <ConfirmSheet
          extraction={extraction}
          previewUrl={previewUrl}
          bookName={book.name}
          onSave={handleSave}
          onDiscard={() => setStage('idle')}
        />
      )}

      {/* Saved toast */}
      {stage === 'saved' && (
        <SavedToast amount={extraction?.amount} bookName={book.name} />
      )}

      {/* Hidden gallery input */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {/* Book sheet */}
      <BookSheet
        open={sheetOpen}
        books={booksForSheet}
        currentBookId={book.id}
        onClose={() => setSheetOpen(false)}
        onSetDefault={handleSetDefault}
        onNewBook={() => {
          router.push('/books');
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
