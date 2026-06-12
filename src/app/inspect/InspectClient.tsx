'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Mic,
  Sparkles,
  Square,
  CircleCheck,
} from 'lucide-react';
import IdMark from '@/components/IdMark';
import PhotoCapture from '@/components/PhotoCapture';
import { clearFlawCache } from '@/lib/flawCache';
import type {
  AiVerifyResult,
  CodeOption,
  InspectBootstrap,
  SessionInfo,
} from '@/lib/types';

type LevelKey = 'room' | 'part' | 'detail' | 'work' | 'type';

interface Selection {
  room: CodeOption | null;
  part: CodeOption | null;
  detail: CodeOption | null;
  work: CodeOption | null;
  type: CodeOption | null;
}

const EMPTY: Selection = { room: null, part: null, detail: null, work: null, type: null };

const LEVEL_LABEL: Record<LevelKey, string> = {
  room: '점검 실',
  part: '점검 부위',
  detail: '세부공종',
  work: '공종',
  type: '점검 유형',
};

export default function InspectClient({ info }: { info: SessionInfo }) {
  const router = useRouter();
  const [boot, setBoot] = useState<InspectBootstrap | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection>(EMPTY);
  const [content, setContent] = useState('');
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [editor1Open, setEditor1Open] = useState(false);
  const [editor2Open, setEditor2Open] = useState(false);
  const editorOpen = editor1Open || editor2Open;
  const [prefillingPhotos, setPrefillingPhotos] = useState(false);
  const [recommend, setRecommend] = useState<{
    result: AiVerifyResult;
    userLabel: string;
    aiLabel: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/inspect/bootstrap', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace('/?reason=auth');
          return null;
        }
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return (await r.json()) as InspectBootstrap;
      })
      .then((data) => {
        if (alive && data) setBoot(data);
      })
      .catch((e) => alive && setLoadErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [router]);

  // Cascading option lists.
  const parts = useMemo(
    () => (boot && sel.room ? boot.parts.filter((p) => p.parent === sel.room!.name) : []),
    [boot, sel.room],
  );
  const details = useMemo(
    () => (boot && sel.part ? boot.details.filter((d) => d.parent === sel.part!.name) : []),
    [boot, sel.part],
  );
  const works = useMemo(
    () => (boot && sel.detail ? boot.works.filter((w) => w.parent === sel.detail!.name) : []),
    [boot, sel.detail],
  );
  const types = useMemo(
    () => (boot && sel.work ? boot.types.filter((t) => t.parent === sel.work!.name) : []),
    [boot, sel.work],
  );

  const pick = (level: LevelKey, opt: CodeOption) => {
    setErr(null);
    setSel((s) => {
      if (level === 'room') return { ...EMPTY, room: opt };
      if (level === 'part') return { ...s, part: opt, detail: null, work: null, type: null };
      if (level === 'detail') return { ...s, detail: opt, work: null, type: null };
      if (level === 'work') return { ...s, work: opt, type: null };
      return { ...s, type: opt };
    });
  };

  // When a level has exactly one option, select it automatically.
  useEffect(() => {
    if (!boot) return;
    if (sel.room && !sel.part && parts.length === 1) pick('part', parts[0]);
    else if (sel.part && !sel.detail && details.length === 1) pick('detail', details[0]);
    else if (sel.detail && !sel.work && works.length === 1) pick('work', works[0]);
    else if (sel.work && !sel.type && types.length === 1) pick('type', types[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot, sel, parts, details, works, types]);

  // Prefill from a "재등록" click stored in sessionStorage (once boot is ready).
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!boot || prefilledRef.current) return;
    prefilledRef.current = true;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem('cantavil_inspect_prefill');
      if (raw) sessionStorage.removeItem('cantavil_inspect_prefill');
    } catch {
      return;
    }
    if (!raw) return;
    let p: {
      nmLoc?: string;
      nmRgon?: string;
      nmDfctCaus?: string;
      nmDfctCl?: string;
      nmDfctType?: string;
      dfctCnts?: string;
      images?: string[];
    };
    try {
      p = JSON.parse(raw);
    } catch {
      return;
    }
    const room = boot.rooms.find((o) => o.name === p.nmLoc) ?? null;
    let part = room
      ? boot.parts.find((o) => o.parent === room.name && o.name === p.nmRgon) ?? null
      : null;
    let detail = part
      ? boot.details.find((o) => o.parent === part!.name && o.name === p.nmDfctCaus) ?? null
      : null;
    // If 부위 was missing/mismatched, derive it from the 세부공종.
    if (room && !detail && p.nmDfctCaus) {
      const cand = boot.details.find(
        (o) =>
          o.name === p.nmDfctCaus &&
          boot.parts.some((pp) => pp.parent === room.name && pp.name === o.parent),
      );
      if (cand) {
        detail = cand;
        part = boot.parts.find((pp) => pp.parent === room.name && pp.name === cand.parent) ?? part;
      }
    }
    const work = detail
      ? boot.works.find((o) => o.parent === detail!.name && o.name === p.nmDfctCl) ?? null
      : null;
    const type = work
      ? boot.types.find((o) => o.parent === work!.name && o.name === p.nmDfctType) ?? null
      : null;
    setSel({ room, part, detail, work, type });
    if (p.dfctCnts) setContent(String(p.dfctCnts));

    // Pull the original photos through our proxy → base64, so they prefill too.
    const urls = Array.isArray(p.images) ? p.images.filter(Boolean).slice(0, 2) : [];
    if (urls.length) {
      setPrefillingPhotos(true);
      Promise.all(
        urls.map((u) =>
          fetch('/api/inspect/fetch-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: u }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { dataUrl?: string } | null) => j?.dataUrl ?? null)
            .catch(() => null),
        ),
      )
        .then(([a, b]) => {
          if (a) setPhoto1(a);
          if (b) setPhoto2(b);
        })
        .finally(() => setPrefillingPhotos(false));
    }
  }, [boot]);

  const allSelected = sel.room && sel.part && sel.detail && sel.work && sel.type;
  const ready = Boolean(allSelected && content.trim().length >= 2 && photo1 && photo2);

  const findByName = (list: CodeOption[], name: string | null) =>
    name ? list.find((o) => o.name === name) ?? null : null;

  // Apply AI-suggested names back onto the cascade (best effort).
  const applyAiCodes = (r: AiVerifyResult): Selection => {
    if (!boot) return sel;
    const room = findByName(boot.rooms, r.nmLoc) ?? sel.room;
    const part =
      (room && r.nmRgon
        ? boot.parts.find((p) => p.parent === room.name && p.name === r.nmRgon)
        : null) ??
      findByName(boot.parts, r.nmRgon) ??
      sel.part;
    const detail = findByName(boot.details, r.nmDfctCaus) ?? sel.detail;
    const work = findByName(boot.works, r.nmDfctCl) ?? sel.work;
    const type = findByName(boot.types, r.nmDfctType) ?? sel.type;
    return { room, part, detail, work, type };
  };

  async function runSubmit(finalSel: Selection, resultOfLlm: string | null) {
    if (!boot) return;
    setSubmitting(true);
    setErr(null);
    try {
      const nmCstCpny =
        (finalSel.work && boot.contractorByWork[finalSel.work.name]) || null;
      const r = await fetch('/api/inspect/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cdLoc: finalSel.room!.code,
          cdRgon: finalSel.part!.code,
          cdDfctCaus: finalSel.detail!.code,
          cdDfctCl: finalSel.work!.code,
          cdDfctType: finalSel.type!.code,
          nmLoc: finalSel.room!.name,
          nmRgon: finalSel.part!.name,
          nmDfctCaus: finalSel.detail!.name,
          nmDfctCl: finalSel.work!.name,
          nmDfctType: finalSel.type!.name,
          dfctCnts: content.trim(),
          image1: photo1,
          image2: photo2,
          resultOfLlm,
          nmCstCpny,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.status === 401) {
        router.replace('/?reason=auth');
        return;
      }
      if (!r.ok) throw new Error(j.error ?? '등록에 실패했습니다.');
      clearFlawCache(); // a new item was added — force the dashboard to refetch
      // The new item lands in 접수 — make the list open on that tab.
      try {
        sessionStorage.setItem('cantavil_dash_tab', 'received');
      } catch {
        /* ignore */
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    if (!boot || !ready) {
      setErr('모든 항목을 선택하고 사진 2장을 등록해 주세요.');
      return;
    }
    // AI verification step (only when the site enables it).
    if (boot.voiceEnabled) {
      setAiBusy(true);
      try {
        const r = await fetch('/api/inspect/ai-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nmLoc: sel.room!.name,
            nmRgon: sel.part!.name,
            nmDfctCaus: sel.detail!.name,
            nmDfctCl: sel.work!.name,
            nmDfctType: sel.type!.name,
            sttText: content.trim(),
          }),
        });
        if (r.ok) {
          const result = (await r.json()) as AiVerifyResult;
          const userCaus = sel.detail!.name;
          const userCl = sel.work!.name;
          const isSame = result.nmDfctCaus === userCaus && result.nmDfctCl === userCl;
          const aiSuggests =
            !!result.nmDfctCaus &&
            !!result.nmDfctCl &&
            (result.typeUnique || result.locRgonUnique || result.dfctCausUnique);
          if (!isSame && aiSuggests) {
            // Show the recommendation modal (mirrors the original confirm dialog).
            const userLabel = [sel.room!.name, userCaus].filter(Boolean).join(',');
            const aiLabel = [result.nmLoc ?? sel.room!.name, result.nmDfctCaus]
              .filter(Boolean)
              .join(',');
            setAiBusy(false);
            setRecommend({ result, userLabel, aiLabel });
            return;
          }
          // Matches (or nothing useful) → proceed straight to save.
          await runSubmit(sel, isSame ? 'S' : 'F');
          return;
        }
      } catch {
        // fall through to plain save
      } finally {
        setAiBusy(false);
      }
    }
    await runSubmit(sel, null);
  }

  if (done) {
    return <SuccessView displayDong={info.displayDong} ho={info.ho} onAgain={() => resetAll()} />;
  }

  function resetAll() {
    setSel(EMPTY);
    setContent('');
    setPhoto1(null);
    setPhoto2(null);
    setErr(null);
    setDone(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="relative min-h-screen pb-40 sm:pb-36">
      <div className="absolute inset-x-0 top-0 h-[180px] grid-overlay opacity-30 pointer-events-none" />
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IdMark className="h-7 w-auto shrink-0" />
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-300">Cantavil</div>
              <div className="text-sm font-semibold">
                {info.displayDong}동 {info.ho}호 · 점검 등록
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">목록</span>
          </Link>
        </header>

        {loadErr && (
          <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
            {loadErr}
          </div>
        )}

        {!boot && !loadErr && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl skeleton" />
            ))}
          </div>
        )}

        {boot && (
          <div className="space-y-5">
            <StepCard step={1} title="어디서 발견하셨나요?" hint="실과 부위를 선택해 주세요.">
              <ChipGroup
                label={LEVEL_LABEL.room}
                options={boot.rooms}
                selected={sel.room}
                onPick={(o) => pick('room', o)}
              />
              {sel.room && (
                <ChipGroup
                  label={LEVEL_LABEL.part}
                  options={parts}
                  selected={sel.part}
                  onPick={(o) => pick('part', o)}
                />
              )}
            </StepCard>

            {sel.part && (
              <StepCard step={2} title="어떤 종류의 하자인가요?" hint="공종을 차례로 선택해 주세요.">
                <ChipGroup
                  label={LEVEL_LABEL.detail}
                  options={details}
                  selected={sel.detail}
                  onPick={(o) => pick('detail', o)}
                />
                {sel.detail && (
                  <ChipGroup
                    label={LEVEL_LABEL.work}
                    options={works}
                    selected={sel.work}
                    onPick={(o) => pick('work', o)}
                  />
                )}
                {sel.work && (
                  <ChipGroup
                    label={LEVEL_LABEL.type}
                    options={types}
                    selected={sel.type}
                    onPick={(o) => pick('type', o)}
                  />
                )}
              </StepCard>
            )}

            {sel.type && (
              <StepCard step={3} title="자세히 알려주세요" hint="위치와 하자 내용을 두 글자 이상 적어주세요.">
                <ContentField
                  value={content}
                  onChange={setContent}
                  voiceEnabled={boot.voiceEnabled}
                />
              </StepCard>
            )}

            {sel.type && (
              <StepCard step={4} title="사진을 등록해 주세요" hint="전체와 근접 사진을 각각 촬영하고 하자 위치를 표시하세요.">
                <div className="space-y-3">
                  {prefillingPhotos && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-ink-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      기존 사진을 불러오는 중…
                    </div>
                  )}
                  <PhotoCapture
                    label="전체 촬영"
                    hint="하자가 있는 공간 전체가 보이게"
                    value={photo1}
                    onChange={setPhoto1}
                    onEditorOpenChange={setEditor1Open}
                  />
                  <PhotoCapture
                    label="근접 촬영"
                    hint="하자 부위를 가까이서"
                    value={photo2}
                    onChange={setPhoto2}
                    onEditorOpenChange={setEditor2Open}
                  />
                </div>
              </StepCard>
            )}

            {err && (
              <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
                {err}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky save bar — hidden while a full-screen photo marker editor is open */}
      {boot && !editorOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.08] bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
            <ProgressDots sel={sel} content={content} photo1={photo1} photo2={photo2} />
            <button
              type="button"
              onClick={onSave}
              disabled={!ready || submitting || aiBusy}
              className="btn-primary flex-1"
            >
              {aiBusy ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" /> AI가 확인 중…
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 등록 중…
                </>
              ) : (
                <>
                  등록하기 <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {recommend && (
        <RecommendModal
          userLabel={recommend.userLabel}
          aiLabel={recommend.aiLabel}
          onAccept={async () => {
            const next = applyAiCodes(recommend.result);
            setSel(next);
            const r = recommend;
            setRecommend(null);
            await runSubmit(next, 'C');
          }}
          onKeep={async () => {
            setRecommend(null);
            await runSubmit(sel, 'N');
          }}
          onCancel={() => setRecommend(null)}
        />
      )}
    </div>
  );
}

function StepCard({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-4 sm:p-5 glass">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[12px] font-semibold text-brand-300">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          <p className="text-[12px] text-ink-400">{hint}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: CodeOption[];
  selected: CodeOption | null;
  onPick: (o: CodeOption) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {label}
        </span>
        {selected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
      </div>
      {options.length === 0 ? (
        <p className="text-[12px] text-ink-500">선택 가능한 항목이 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected?.code === o.code;
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => onPick(o)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? 'border-brand-500/50 bg-brand-500/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'border-white/[0.08] bg-white/[0.02] text-ink-200 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentField({
  value,
  onChange,
  voiceEnabled,
}: {
  value: string;
  onChange: (v: string) => void;
  voiceEnabled: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return;
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('file', blob, 'voice.webm');
          const r = await fetch('/api/inspect/transcribe', { method: 'POST', body: form });
          if (r.ok) {
            const j = (await r.json()) as { text?: string };
            if (j.text) onChange(value ? `${value} ${j.text}` : j.text);
          }
        } catch {
          // ignore
        } finally {
          setTranscribing(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      // auto-stop after 15s as a safety net
      setTimeout(() => recRef.current?.state === 'recording' && stop(), 15000);
    } catch {
      // mic unavailable
    }
  };

  return (
    <div>
      <div className="relative">
        <textarea
          className="field min-h-[96px] resize-y pr-12"
          placeholder="예) 거실 바닥 강마루 모서리가 들떠 있고 걸을 때 소리가 납니다"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={500}
        />
        {voiceEnabled && (
          <button
            type="button"
            onClick={recording ? stop : start}
            disabled={transcribing}
            aria-label={recording ? '녹음 중지' : '음성 입력'}
            className={`absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
              recording
                ? 'border-brand-500/50 bg-brand-500/20 text-brand-200 animate-pulse'
                : 'border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/[0.07]'
            }`}
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : recording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
        <span>{voiceEnabled ? '마이크로 말하면 자동으로 입력돼요.' : ''}</span>
        <span className="tabular-nums">{value.trim().length}자</span>
      </div>
    </div>
  );
}

function ProgressDots({
  sel,
  content,
  photo1,
  photo2,
}: {
  sel: Selection;
  content: string;
  photo1: string | null;
  photo2: string | null;
}) {
  const done = [
    Boolean(sel.room && sel.part),
    Boolean(sel.detail && sel.work && sel.type),
    content.trim().length >= 2,
    Boolean(photo1 && photo2),
  ];
  return (
    <div className="hidden sm:flex items-center gap-1.5" aria-hidden>
      {done.map((d, i) => (
        <span
          key={i}
          className={`h-1.5 w-6 rounded-full ${d ? 'bg-brand-500' : 'bg-white/15'}`}
        />
      ))}
    </div>
  );
}

function RecommendModal({
  userLabel,
  aiLabel,
  onAccept,
  onKeep,
  onCancel,
}: {
  userLabel: string;
  aiLabel: string;
  onAccept: () => void;
  onKeep: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-ink-900 p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-400" />
          <h3 className="text-base font-semibold">AI 분석 결과</h3>
        </div>
        <p className="text-sm leading-relaxed text-ink-200">
          하자 내용을 AI가 분석한 결과,
          <br />
          <span className="font-medium text-ink-100">({userLabel})</span> 를{' '}
          <span className="font-medium text-brand-300">({aiLabel})</span> 로 변경하는 것을
          추천합니다.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onAccept} className="btn-primary">
            추천대로 수정 후 저장
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="rounded-lg border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-ink-100 hover:bg-white/[0.07]"
          >
            수정 없이 그대로 저장
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-[12px] text-ink-400 hover:text-ink-200"
          >
            취소하고 다시 검토
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  displayDong,
  ho,
  onAgain,
}: {
  displayDong: string;
  ho: string;
  onAgain: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CircleCheck className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold">점검이 등록되었습니다</h1>
        <p className="mt-2 text-sm text-ink-400">
          {displayDong}동 {ho}호 점검 내역에 추가되었습니다. 목록에서 처리 상태를 확인할 수 있어요.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <button type="button" onClick={onAgain} className="btn-primary">
            한 건 더 등록하기
          </button>
          <Link href="/dashboard" className="btn-ghost justify-center">
            점검 목록 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
