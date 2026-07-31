'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookChip } from '@/components/book-chip';
import { BookSheet } from '@/components/book-sheet';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { SavedToast } from '@/components/saved-toast';
import { Ripple } from '@/components/aceternity/ripple';
import { BorderBeam } from '@/components/aceternity/border-beam';
import { RecurringBanner } from '@/components/recurring-banner';
import {
  createQueue,
  markReady,
  markRejected,
  markError,
  resetToReading,
  saveCurrent,
  skipCurrent,
  cancelRemaining,
  currentItem,
  isDone,
  readyCount,
  summary,
  type QueueState,
} from '@/lib/upload-queue';
import { buildSourceMeta, hashFile, type SourceMeta, type UploadSource } from '@/lib/slip-source';

const EXTRACT_CONCURRENCY = 3;

type SlipMeta = SourceMeta & { sourceHash: string };

interface ResumeMarker {
  id: string;
  bookId: string;
  merchantName: string | null;
  amount: number;
  immichAssetId: string;
  uploadSource: string | null;
  sourceFileName: string | null;
  takenAt: string;
}

interface DuplicateInfo {
  id: string;
  merchantName: string | null;
  amount: number;
  createdAt: string;
}

async function checkDuplicates(hashes: string[]): Promise<Record<string, DuplicateInfo>> {
  try {
    const res = await fetch('/api/transactions/dedupe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hashes }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.duplicates ?? {};
  } catch {
    return {};
  }
}

function duplicateReason(dup: DuplicateInfo): string {
  const day = new Date(dup.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const who = dup.merchantName ? `${dup.merchantName}, ` : '';
  return `Already uploaded ${day} (${who}฿${(dup.amount / 100).toLocaleString()})`;
}

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
  merchantName?: string;
  rejected?: boolean;
  rejectReason?: string;
  confidence: { amount: number; type: number; category: number; date: number };
}

type Stage = 'idle' | 'thinking' | 'confirm' | 'saved' | 'error' | 'rejected';
type CameraState = 'starting' | 'active' | 'denied' | 'unavailable';

export function UploadPageClient({
  book,
  books,
  dueRecurringCount = 0,
  resumeMarker = null,
}: {
  book: Book;
  books: Book[];
  dueRecurringCount?: number;
  resumeMarker?: ResumeMarker | null;
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
  const [queue, setQueue] = useState<QueueState | null>(null);
  const queueFilesRef = useRef<Record<string, File>>({});
  const queueMetaRef = useRef<Record<string, SlipMeta>>({});
  const currentMetaRef = useRef<SlipMeta | null>(null);

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
    if (file) await handleFile(file, 'camera');
  }

  async function extractOne(file: File, mode: 'bank_slip' | 'receipt') {
    const form = new FormData();
    form.append('image', file);
    form.append('mode', mode);
    form.append('bookId', book.id);
    const res = await fetch('/api/extract', { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { assetId: (data.assetId ?? '') as string, extraction: data.extraction };
  }

  async function handleFile(file: File, source: UploadSource = 'gallery') {
    if (!file.type.startsWith('image/')) return;
    if (captureMode === 'Manual') {
      router.push(`/${book.id}/manual`);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStage('thinking');
    setErrorMsg('');

    const sourceHash = await hashFile(file);
    currentMetaRef.current = { ...buildSourceMeta(file, source), sourceHash };
    const dup = (await checkDuplicates([sourceHash]))[sourceHash];
    if (dup) {
      setErrorMsg(duplicateReason(dup));
      setStage('rejected');
      return;
    }

    const mode = captureMode === 'Bank slip' ? 'bank_slip' : 'receipt';
    try {
      const { assetId, extraction } = await extractOne(file, mode);
      setAssetId(assetId);
      if (extraction?.rejected) {
        setErrorMsg(extraction.rejectReason ?? 'This image doesn\'t look like a receipt or bank slip.');
        setStage('rejected');
        return;
      }
      setExtraction(extraction);
      setStage('confirm');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setStage('error');
    }
  }

  function extractIntoQueue(id: string, file: File, mode: 'bank_slip' | 'receipt') {
    return extractOne(file, mode)
      .then(({ assetId, extraction }) => {
        if (extraction?.rejected) {
          setQueue(q => (q ? markRejected(q, id, extraction.rejectReason ?? 'Not a receipt or bank slip.') : q));
        } else {
          setQueue(q => (q ? markReady(q, id, assetId, extraction) : q));
        }
      })
      .catch(err => {
        setQueue(q => (q ? markError(q, id, err instanceof Error ? err.message : 'Something went wrong') : q));
      });
  }

  async function runExtraction(seeds: { id: string; file: File }[], mode: 'bank_slip' | 'receipt') {
    let cursor = 0;
    const worker = async () => {
      while (cursor < seeds.length) {
        const seed = seeds[cursor++];
        await extractIntoQueue(seed.id, seed.file, mode);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(EXTRACT_CONCURRENCY, seeds.length) }, worker),
    );
  }

  async function handleFiles(files: File[]) {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    if (captureMode === 'Manual') {
      router.push(`/${book.id}/manual`);
      return;
    }
    if (imgs.length === 1) {
      await handleFile(imgs[0]);
      return;
    }

    const mode = captureMode === 'Bank slip' ? 'bank_slip' : 'receipt';
    const seeds = imgs.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    queueFilesRef.current = Object.fromEntries(seeds.map(s => [s.id, s.file]));
    setQueue(createQueue(seeds.map(({ id, previewUrl }) => ({ id, previewUrl }))));
    void dedupeAndExtract(seeds.map(({ id, file }) => ({ id, file })), mode);
  }

  async function dedupeAndExtract(seeds: { id: string; file: File }[], mode: 'bank_slip' | 'receipt') {
    const hashed = await Promise.all(
      seeds.map(async s => ({ ...s, meta: { ...buildSourceMeta(s.file, 'gallery'), sourceHash: await hashFile(s.file) } })),
    );
    hashed.forEach(s => { queueMetaRef.current[s.id] = s.meta; });

    const dups = await checkDuplicates([...new Set(hashed.map(s => s.meta.sourceHash))]);
    const seenInBatch = new Set<string>();
    const fresh: { id: string; file: File }[] = [];
    for (const s of hashed) {
      const dup = dups[s.meta.sourceHash];
      if (dup) {
        setQueue(q => (q ? markRejected(q, s.id, duplicateReason(dup)) : q));
      } else if (seenInBatch.has(s.meta.sourceHash)) {
        setQueue(q => (q ? markRejected(q, s.id, 'Same photo picked twice in this batch') : q));
      } else {
        seenInBatch.add(s.meta.sourceHash);
        fresh.push({ id: s.id, file: s.file });
      }
    }
    await runExtraction(fresh, mode);
  }

  async function handleQueueSave(confirmed: {
    amount: number;
    type: string;
    category: string;
    date: string;
    note: string;
    merchantName?: string;
  }) {
    const item = queue && currentItem(queue);
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bookId: book.id,
        immichAssetId: item?.assetId || null,
        ...(item ? queueMetaRef.current[item.id] : null),
        ...confirmed,
      }),
    });
    router.refresh();
    setQueue(q => (q ? saveCurrent(q, confirmed.amount) : q));
  }

  function handleQueueSkip() {
    setQueue(q => (q ? skipCurrent(q) : q));
  }

  function handleQueueRetry() {
    const item = queue && currentItem(queue);
    if (!item) return;
    const file = queueFilesRef.current[item.id];
    if (!file) return;
    const mode = captureMode === 'Bank slip' ? 'bank_slip' : 'receipt';
    setQueue(q => (q ? resetToReading(q, item.id) : q));
    void extractIntoQueue(item.id, file, mode);
  }

  function handleQueueCancel() {
    setQueue(q => (q ? cancelRemaining(q) : q));
  }

  useEffect(() => {
    if (!queue || !isDone(queue)) return;
    const t = setTimeout(() => {
      queueFilesRef.current = {};
      queueMetaRef.current = {};
      setQueue(null);
      setStage('idle');
    }, 2800);
    return () => clearTimeout(t);
  }, [queue]);

  async function handleSave(confirmed: {
    amount: number;
    type: string;
    category: string;
    date: string;
    note: string;
    merchantName?: string;
  }) {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bookId: book.id,
        immichAssetId: assetId || null,
        ...currentMetaRef.current,
        ...confirmed,
      }),
    });
    router.refresh();
    setStage('saved');
    setTimeout(() => {
      setStage('idle');
      setExtraction(null);
      setPreviewUrl('');
    }, 2800);
  }

  async function handleToggleDefault(bookId: string, next: boolean) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: next }),
    });
    setBookList(prev => prev.map(b => ({
      ...b,
      isDefault: next ? b.id === bookId : b.id === bookId ? false : b.isDefault,
    })));
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

      {/* Starting — Aceternity Ripple + aperture icon */}
      {cameraState === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 52%, rgba(14,92,58,.15) 0%, #0c0d0a 70%)' }}>
          <Ripple numCircles={5} baseSize={56} spread={68} color="rgba(14,92,58">
            <div style={{ animation: 'aperture-spin 6s linear infinite' }}>
              <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                {Array.from({ length: 6 }, (_, i) => {
                  const angle = (i * 60 * Math.PI) / 180
                  const cx = Math.round((32 + 10 * Math.cos(angle)) * 1e10) / 1e10
                  const cy = Math.round((32 + 10 * Math.sin(angle)) * 1e10) / 1e10
                  return (
                    <ellipse key={i} cx={cx} cy={cy} rx={11} ry={5}
                      transform={`rotate(${i * 60 + 30} ${cx} ${cy})`}
                      fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.32)" strokeWidth={0.8} />
                  )
                })}
                <circle cx="32" cy="32" r="4.5" fill="rgba(255,255,255,.55)" />
              </svg>
            </div>
          </Ripple>
          <div className="mt-10 text-[12px] font-medium tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '0.1em' }}>
            Starting camera
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'inline-block', marginLeft: 3, animation: `pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite` }}>·</span>
            ))}
          </div>
        </div>
      )}

      {/* Thinking — Aceternity BorderBeam card + scan line */}
      {stage === 'thinking' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
          style={{ background: 'rgba(0,0,0,.75)' }}>
          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden"
              style={{ maxWidth: 220, boxShadow: '0 16px 48px rgba(0,0,0,.7)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="block max-h-64 object-contain opacity-75"
                style={{ maxWidth: 220 }} />
              {/* Scan line */}
              <div className="absolute left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(100,255,180,.9) 50%, transparent)',
                  boxShadow: '0 0 10px 3px rgba(14,92,58,.7)',
                  animation: 'scan-line 1.6s linear infinite',
                }} />
              <BorderBeam colorTo="#44ff90" colorFrom="transparent" duration={2.5} size={120} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#44ff90', animation: `pulse-dot 1.1s ease-in-out ${i * 0.18}s infinite` }} />
              ))}
            </div>
            <span className="text-[12.5px] font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,.5)', letterSpacing: '0.06em' }}>
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

      {stage === 'rejected' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8"
          style={{ background: 'rgba(15,17,14,.55)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl p-6 text-center animate-pop w-full max-w-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-md)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--expense-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div className="text-[15px] font-semibold text-[var(--ink)] mb-1.5">
              Not a receipt
            </div>
            <div className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--muted)' }}>
              {errorMsg}
            </div>
            <button
              onClick={() => setStage('idle')}
              className="w-full h-11 rounded-xl text-[14px] font-semibold text-white active:scale-95 transition-transform"
              style={{ background: 'var(--accent)' }}>
              Try another image
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

      {stage === 'idle' && dueRecurringCount > 0 && (
        <div className="absolute left-0 right-0 z-10 flex justify-center px-4" style={{ top: 104 }}>
          <RecurringBanner bookId={book.id} count={dueRecurringCount} />
        </div>
      )}

      {stage === 'idle' && resumeMarker && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center px-4"
          style={{ top: dueRecurringCount > 0 ? 152 : 104 }}
        >
          <button
            onClick={() => router.push(`/${resumeMarker.bookId}/history`)}
            className="flex items-center active:opacity-70 transition-opacity"
            style={{
              gap: 8, padding: '5px 12px 5px 5px', borderRadius: 99, maxWidth: '100%',
              background: 'rgba(20,22,18,.55)',
              border: '1px solid rgba(255,255,255,.12)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/immich/${resumeMarker.immichAssetId}/thumbnail`}
              alt=""
              style={{ width: 26, height: 26, borderRadius: 99, objectFit: 'cover', flexShrink: 0 }}
            />
            <span
              className="truncate"
              style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.85)' }}
            >
              Last slip: {resumeMarker.sourceFileName ?? resumeMarker.merchantName ?? 'photo'}
              {' · '}
              {new Date(resumeMarker.takenAt).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </button>
        </div>
      )}

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
              onClick={() => {
                if (m === 'Manual') {
                  router.push(`/${book.id}/manual`)
                } else {
                  setCaptureMode(m)
                }
              }}
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
          bookId={book.id}
          onSave={handleSave}
          onDiscard={() => setStage('idle')}
        />
      )}

      {/* Saved toast */}
      {stage === 'saved' && (
        <SavedToast amount={extraction?.amount} bookName={book.name} />
      )}

      {/* Multi-receipt queue overlay */}
      {queue && (() => {
        const cur = currentItem(queue);
        const total = queue.items.length;
        const pos = Math.min(queue.currentIndex + 1, total);
        const ready = readyCount(queue);

        const StatusStrip = (
          <div className="flex items-center justify-center gap-1.5 flex-wrap px-8" style={{ maxWidth: 320 }}>
            {queue.items.map((it, i) => {
              const color =
                it.status === 'saved' ? 'var(--accent)'
                : it.status === 'ready' ? 'rgba(100,255,180,.9)'
                : it.status === 'rejected' || it.status === 'error' ? 'var(--expense)'
                : it.status === 'skipped' ? 'rgba(255,255,255,.28)'
                : 'rgba(255,255,255,.5)';
              const isCurrent = i === queue.currentIndex;
              return (
                <div key={it.id} className="rounded-full" style={{
                  width: isCurrent ? 9 : 7, height: isCurrent ? 9 : 7,
                  background: color,
                  animation: it.status === 'reading' ? 'pulse-dot 1.2s ease-in-out infinite' : undefined,
                  boxShadow: isCurrent ? `0 0 0 2px rgba(255,255,255,.25)` : undefined,
                }} />
              );
            })}
          </div>
        );

        if (isDone(queue)) {
          const sum = summary(queue);
          const total$ = sum.totalAmount
            ? `฿${sum.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '';
          const notSaved = sum.skipped + sum.failed;
          return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(120% 70% at 50% 42%, #2a2823 0%, #0c0d0a 70%)' }}>
              <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center animate-pop"
                style={{ background: 'var(--accent)', boxShadow: '0 8px 32px rgba(14,92,58,.5)' }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              </div>
              <div className="mt-6 text-center text-white">
                <div className="font-[family-name:var(--font-mono)] text-[30px] font-semibold tracking-tight">
                  {sum.saved} saved
                </div>
                {total$ && <div className="text-[15px] mt-1" style={{ opacity: 0.7 }}>{total$}</div>}
                {notSaved > 0 && (
                  <div className="text-[13px] mt-2" style={{ color: 'rgba(255,255,255,.5)' }}>
                    {sum.skipped > 0 && `${sum.skipped} skipped`}
                    {sum.skipped > 0 && sum.failed > 0 && ' · '}
                    {sum.failed > 0 && `${sum.failed} couldn’t be read`}
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (!cur) return null;

        if (cur.status === 'ready' && cur.extraction) {
          return (
            <div className="fixed inset-0 z-50">
              <ConfirmSheet
                key={cur.id}
                extraction={cur.extraction as ExtractionResult}
                previewUrl={cur.previewUrl}
                bookName={book.name}
                bookId={book.id}
                queueLabel={`${pos} of ${total}`}
                onSave={handleQueueSave}
                onDiscard={handleQueueSkip}
              />
            </div>
          );
        }

        if (cur.status === 'rejected' || cur.status === 'error') {
          const failedTitle = cur.status === 'rejected' ? 'Not a receipt' : 'Couldn’t read this one';
          return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 gap-6"
              style={{ background: 'rgba(15,17,14,.72)', backdropFilter: 'blur(8px)' }}>
              <div className="rounded-2xl p-6 text-center animate-pop w-full max-w-xs"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-md)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--expense-bg)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--muted)' }}>{pos} of {total}</div>
                <div className="text-[15px] font-semibold text-[var(--ink)] mb-1.5">{failedTitle}</div>
                <div className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--muted)' }}>{cur.errorMsg}</div>
                <div className="flex gap-2">
                  <button onClick={handleQueueRetry}
                    className="flex-1 h-11 rounded-xl text-[14px] font-semibold active:scale-95 transition-transform"
                    style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink)' }}>
                    Retry
                  </button>
                  <button onClick={handleQueueSkip}
                    className="flex-1 h-11 rounded-xl text-[14px] font-semibold text-white active:scale-95 transition-transform"
                    style={{ background: 'var(--accent)' }}>
                    {pos < total ? 'Next' : 'Finish'}
                  </button>
                </div>
              </div>
              {StatusStrip}
            </div>
          );
        }

        // reading (current not yet extracted)
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
            style={{ background: 'rgba(0,0,0,.82)' }}>
            {cur.previewUrl && (
              <div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: 220, boxShadow: '0 16px 48px rgba(0,0,0,.7)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.previewUrl} alt="" className="block max-h-64 object-contain opacity-75" style={{ maxWidth: 220 }} />
                <div className="absolute left-0 right-0 h-[2px] pointer-events-none" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(100,255,180,.9) 50%, transparent)',
                  boxShadow: '0 0 10px 3px rgba(14,92,58,.7)',
                  animation: 'scan-line 1.6s linear infinite',
                }} />
              </div>
            )}
            <div className="text-center">
              <div className="text-[13px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,.6)', letterSpacing: '0.04em' }}>
                Reading receipt {pos} of {total}
              </div>
              <div className="text-[11.5px] mt-1" style={{ color: 'rgba(255,255,255,.38)' }}>
                {ready} of {total} ready
              </div>
            </div>
            {StatusStrip}
            <button onClick={handleQueueCancel}
              className="text-[13px] font-medium active:opacity-60 transition-opacity"
              style={{ color: 'rgba(255,255,255,.5)' }}>
              Cancel remaining
            </button>
          </div>
        );
      })()}

      {/* Hidden gallery input */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) handleFiles(files);
          e.target.value = '';
        }}
      />

      {/* Book sheet */}
      <BookSheet
        open={sheetOpen}
        books={booksForSheet}
        currentBookId={book.id}
        onClose={() => setSheetOpen(false)}
        onSetDefault={handleToggleDefault}
        onNewBook={() => {
          router.push('/books');
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
