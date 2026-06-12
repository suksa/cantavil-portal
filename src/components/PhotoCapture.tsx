'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Pencil, RefreshCw, Trash2, X } from 'lucide-react';

interface Props {
  label: string;
  hint: string;
  value: string | null; // composited data URL (marks baked in)
  onChange: (dataUrl: string | null) => void;
  onEditorOpenChange?: (open: boolean) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_DIM = 1920;
const MARK_COLOR = '#ff2d2d';

/** Downscale + JPEG-compress a source image element to a data URL. */
function compress(img: HTMLImageElement): string {
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function PhotoCapture({ label, hint, value, onChange, onEditorOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null); // original (no marks) being edited

  // Tell the parent when the full-screen marker editor is open so it can hide
  // its own sticky bottom bar (which otherwise shows behind the editor).
  useEffect(() => {
    onEditorOpenChange?.(editorSrc !== null);
  }, [editorSrc, onEditorOpenChange]);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const compressed = compress(img);
      URL.revokeObjectURL(url);
      setEditorSrc(compressed); // open the marker editor right away
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-ink-850/60 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-50">{label}</div>
          <div className="text-[11px] text-ink-400">{hint}</div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-ink-300 hover:bg-white/[0.06]"
          >
            <Trash2 className="h-3 w-3" /> 삭제
          </button>
        )}
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full max-h-64 object-contain bg-ink-900" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditorSrc(value)}
              className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur hover:bg-black/80"
            >
              <Pencil className="h-3 w-3" /> 마킹
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur hover:bg-black/80"
            >
              <RefreshCw className="h-3 w-3" /> 다시
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.setAttribute('capture', 'environment');
                fileRef.current.click();
              }
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] py-6 text-ink-200 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <Camera className="h-6 w-6 text-brand-400" />
            <span className="text-xs font-medium">사진 촬영</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute('capture');
                fileRef.current.click();
              }
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] py-6 text-ink-200 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <ImagePlus className="h-6 w-6 text-brand-400" />
            <span className="text-xs font-medium">갤러리에서</span>
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {editorSrc && (
        <MarkEditor
          src={editorSrc}
          onCancel={() => setEditorSrc(null)}
          onApply={(composited) => {
            onChange(composited);
            setEditorSrc(null);
          }}
        />
      )}
    </div>
  );
}

function MarkEditor({
  src,
  onApply,
  onCancel,
}: {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const drawing = useRef<{ startX: number; startY: number; cur: Rect | null }>({
    startX: 0,
    startY: 0,
    cur: null,
  });
  const [ready, setReady] = useState(false);

  // Fit the canvas to the image inside the available box.
  const fit = useCallback(async () => {
    const img = imgRef.current ?? (await loadImage(src));
    imgRef.current = img;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const maxW = wrap.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.6, 520);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    setReady(true);
  }, [src]);

  useEffect(() => {
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [fit]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = MARK_COLOR;
    ctx.lineWidth = Math.max(3, canvas.width * 0.008);
    const all = drawing.current.cur ? [...rects, drawing.current.cur] : rects;
    for (const r of all) ctx.strokeRect(r.x, r.y, r.w, r.h);
  }, [rects]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = pos(e);
    drawing.current = { startX: p.x, startY: p.y, cur: { x: p.x, y: p.y, w: 0, h: 0 } };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current.cur) return;
    e.preventDefault();
    const p = pos(e);
    const { startX, startY } = drawing.current;
    drawing.current.cur = {
      x: Math.min(startX, p.x),
      y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX),
      h: Math.abs(p.y - startY),
    };
    redraw();
  };
  const onUp = () => {
    const cur = drawing.current.cur;
    drawing.current.cur = null;
    if (cur && cur.w > 6 && cur.h > 6) setRects((rs) => [...rs, cur]);
    else redraw();
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    // Composite marks at full resolution.
    const out = document.createElement('canvas');
    out.width = img.width;
    out.height = img.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const canvas = canvasRef.current!;
    const sx = img.width / canvas.width;
    const sy = img.height / canvas.height;
    ctx.strokeStyle = MARK_COLOR;
    ctx.lineWidth = Math.max(4, img.width * 0.008);
    for (const r of rects) ctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    onApply(out.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-ink-950">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">하자 위치를 사각형으로 표시하세요</span>
        <button type="button" onClick={onCancel} aria-label="닫기" className="p-1">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div ref={wrapRef} className="flex flex-1 items-center justify-center px-3 pb-3">
        <canvas
          ref={canvasRef}
          className="touch-none rounded-lg bg-ink-900 shadow-2xl"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10"
        >
          취소
        </button>
        {rects.length > 0 && (
          <button
            type="button"
            onClick={() => setRects([])}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white hover:bg-white/10"
          >
            마킹 삭제
          </button>
        )}
        <button
          type="button"
          onClick={apply}
          className="flex-1 max-w-[200px] rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
        >
          적용
        </button>
      </div>
    </div>
  );
}
