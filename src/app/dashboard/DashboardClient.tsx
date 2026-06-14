'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  RefreshCw,
  Search,
  Inbox,
  ShieldCheck,
  Plus,
  List,
  Images,
  Layers,
  HelpCircle,
  X,
  PartyPopper,
} from 'lucide-react';
import Image from 'next/image';
import FlawCard from '@/components/FlawCard';
import TabBar from '@/components/TabBar';
import IdMark from '@/components/IdMark';
import Toaster from '@/components/Toaster';
import StatsSummary from '@/components/dashboard/StatsSummary';
import DashboardBanners from '@/components/dashboard/DashboardBanners';
import ExportBar from '@/components/dashboard/ExportBar';
import FlawDetailModal from '@/components/FlawDetailModal';
import GlossaryModal from '@/components/GlossaryModal';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type CardVisibility,
  type FlawCategory,
  type FlawItem,
  type InspectBootstrap,
  type SessionInfo,
} from '@/lib/types';
import { DEFAULT_SETTINGS, fieldVisibleFor, type AdminSettings } from '@/lib/admin';
import type { ExportContext } from '@/lib/exporters';
import { daysAgo } from '@/lib/dates';
import {
  FLAW_CACHE_FRESH_MS,
  computeChangedIds,
  getFlawCache,
  patchFlawCache,
  setFlawCache,
} from '@/lib/flawCache';
import { bootstrapUnitKey, readBootstrap, writeBootstrap } from '@/lib/bootstrapCache';

interface ApiResponse {
  items: FlawItem[];
  total: number;
  info: SessionInfo;
}

const TABS = new Set<FlawCategory>(CATEGORY_ORDER);
const PAGE = 24;

type SortMode = 'recent' | 'oldest' | 'id';
type DateRange = 'all' | '7' | '30' | '90';

const SORT_LABEL: Record<SortMode, string> = { recent: '최근순', oldest: '오래된순', id: '번호순' };
const RANGE_LABEL: Record<DateRange, string> = { all: '전체 기간', '7': '최근 7일', '30': '최근 30일', '90': '최근 90일' };

function refDate(it: FlawItem): string | null {
  return [it.dtCplt, it.dtWrk, it.dtRcpt].filter(Boolean).sort().pop() ?? null;
}

export default function DashboardClient({ info }: { info: SessionInfo }) {
  const router = useRouter();
  const cached = getFlawCache();
  const [items, setItems] = useState<FlawItem[]>(cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActiveState] = useState<FlawCategory>((cached?.activeTab as FlawCategory) ?? 'received');
  const [query, setQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [clFilter, setClFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [multiMode, setMultiMode] = useState(false);
  const [multiSel, setMultiSel] = useState<Set<FlawCategory>>(new Set());
  const [settings, setSettings] = useState<AdminSettings>(cached?.settings ?? DEFAULT_SETTINGS);
  // 이미지형(feed)이 기본값. 사용자가 바꾸면 localStorage에 저장돼 유지된다.
  const [view, setViewState] = useState<'list' | 'feed'>('feed');
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<FlawItem | null>(null);
  const [glossary, setGlossary] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE);

  // Restore the saved view preference after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      const v = localStorage.getItem('cantavil_dash_view');
      if (v === 'feed' || v === 'list') setViewState(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setView = (v: 'list' | 'feed') => {
    setViewState(v);
    try {
      localStorage.setItem('cantavil_dash_view', v);
    } catch {
      /* ignore */
    }
  };

  // Persist the selected tab so back-navigation (e.g. from /inspect) restores it.
  const setActive = (tab: FlawCategory) => {
    setActiveState(tab);
    setMultiMode(false);
    patchFlawCache({ activeTab: tab });
    try {
      sessionStorage.setItem('cantavil_dash_tab', tab);
    } catch {
      /* ignore */
    }
  };

  // Restore tab from sessionStorage on first mount when no in-memory cache.
  useEffect(() => {
    if (cached) return;
    try {
      const saved = sessionStorage.getItem('cantavil_dash_tab');
      if (saved && TABS.has(saved as FlawCategory)) setActiveState(saved as FlawCategory);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setErr(null);
    try {
      const [flawRes, setRes] = await Promise.all([
        fetch('/api/flaws', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }).catch(() => null),
      ]);
      if (flawRes.status === 401) {
        router.replace(`/?reason=auth&d=${encodeURIComponent(info.dong)}&h=${encodeURIComponent(info.ho)}`);
        return;
      }
      if (!flawRes.ok) {
        const j = (await flawRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${flawRes.status}`);
      }
      const data = (await flawRes.json()) as ApiResponse;
      let nextSettings = settings;
      if (setRes && setRes.ok) {
        const sj = (await setRes.json()) as { settings: AdminSettings };
        nextSettings = sj.settings;
        setSettings(sj.settings);
      }
      // Session-internal change detection (for the "변경됨" pulse).
      const prev = getFlawCache()?.items ?? null;
      const changed = computeChangedIds(prev, data.items);
      if (changed.size) {
        setChangedIds(changed);
        setTimeout(() => setChangedIds(new Set()), 6000);
      }
      setItems(data.items);
      setFlawCache({
        items: data.items,
        settings: nextSettings,
        activeTab: getFlawCache()?.activeTab ?? active,
        fetchedAt: Date.now(),
      });
    } catch (e) {
      if (!opts.silent) setErr((e as Error).message);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    const c = getFlawCache();
    if (!c) {
      load();
    } else if (Date.now() - c.fetchedAt > FLAW_CACHE_FRESH_MS) {
      // Stale cache: show it instantly, refresh quietly in the background.
      load({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the inspect bootstrap cache so "새 점검 등록하기" opens straight onto
  // step 1 with no skeleton. Fire-and-forget, once, after the list settles.
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    const unit = bootstrapUnitKey(info.dong, info.ho);
    if (readBootstrap(unit)?.fresh) return; // already have fresh code lists
    const t = setTimeout(() => {
      fetch('/api/inspect/bootstrap', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) writeBootstrap(unit, data as InspectBootstrap);
        })
        .catch(() => {
          /* ignore — InspectClient will fetch on demand */
        });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibility: CardVisibility = useMemo(
    () => ({
      nmCstCpny: fieldVisibleFor(settings.visibility.nmCstCpny, info.isAdmin),
      nmWrkPrsn: fieldVisibleFor(settings.visibility.nmWrkPrsn, info.isAdmin),
      dtWrk: fieldVisibleFor(settings.visibility.dtWrk, info.isAdmin),
      nmApltPrsn: fieldVisibleFor(settings.visibility.nmApltPrsn, info.isAdmin),
    }),
    [settings, info.isAdmin],
  );

  const exportCtx: ExportContext = useMemo(
    () => ({
      displayDong: info.displayDong,
      ho: info.ho,
      nmCstm: info.nmCstm,
      nmSite: info.nmSite,
      visibility: {
        nmCstCpny: visibility.nmCstCpny,
        nmWrkPrsn: visibility.nmWrkPrsn,
        dtWrk: visibility.dtWrk,
      },
    }),
    [info, visibility],
  );

  const counts = useMemo(() => {
    const out: Record<FlawCategory, number> = { received: 0, workDone: 0, reAccepted: 0, finalDone: 0 };
    for (const i of items) out[i.category]++;
    return out;
  }, [items]);

  // Base set: a single tab, or the multi-select union (or all when none picked).
  const baseItems = useMemo(() => {
    if (multiMode) return multiSel.size ? items.filter((it) => multiSel.has(it.category)) : items;
    return items.filter((it) => it.category === active);
  }, [items, active, multiMode, multiSel]);

  const roomOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of baseItems) if (it.nmLoc) s.add(it.nmLoc);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [baseItems]);
  const clOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of baseItems) if (it.nmDfctCl) s.add(it.nmDfctCl);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [baseItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rangeDays = dateRange === 'all' ? null : Number(dateRange);
    const list = baseItems.filter((it) => {
      if (roomFilter && it.nmLoc !== roomFilter) return false;
      if (clFilter && it.nmDfctCl !== clFilter) return false;
      if (rangeDays != null) {
        const d = daysAgo(refDate(it));
        if (d == null || d > rangeDays) return false;
      }
      if (!q) return true;
      const hay = [it.dfctCnts, it.nmLoc, it.nmRgon, it.nmDfctCl, it.nmDfctCaus, it.nmWrkPrsn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    const byRef = (a: FlawItem, b: FlawItem) => (refDate(b) ?? '').localeCompare(refDate(a) ?? '');
    if (sortMode === 'recent') list.sort((a, b) => byRef(a, b) || b.noIdx - a.noIdx);
    else if (sortMode === 'oldest') list.sort((a, b) => -byRef(a, b) || a.noIdx - b.noIdx);
    else list.sort((a, b) => b.noIdx - a.noIdx);
    return list;
  }, [baseItems, query, roomFilter, clFilter, dateRange, sortMode]);

  const filtersActive = Boolean(roomFilter || clFilter || query || dateRange !== 'all');
  const clearFilters = () => {
    setRoomFilter('');
    setClFilter('');
    setQuery('');
    setDateRange('all');
  };

  // Drop a filter selection that no longer exists in the current view.
  useEffect(() => {
    if (roomFilter && !roomOptions.includes(roomFilter)) setRoomFilter('');
    if (clFilter && !clOptions.includes(clFilter)) setClFilter('');
  }, [roomOptions, clOptions, roomFilter, clFilter]);

  // Reset incremental render window when the view changes.
  useEffect(() => {
    setVisibleCount(PAGE);
  }, [active, multiMode, multiSel, query, roomFilter, clFilter, sortMode, dateRange]);

  // Append more cards as the sentinel scrolls into view (lightweight virtualization).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((n) => n + PAGE);
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const toggleMultiCat = (c: FlawCategory) => {
    setMultiSel((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

  // Dev-only debug surface for "왜 안 떠요?" diagnosis (window.__cantavil_debug).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as Record<string, unknown>).__cantavil_debug = {
      items: items.length,
      counts,
      settings,
      fetchedAt: getFlawCache()?.fetchedAt,
      lastError: err,
    };
  }, [items, counts, settings, err]);

  const shown = filtered.slice(0, visibleCount);

  return (
    <div className="relative min-h-screen">
      {/* Subtle aerial header backdrop */}
      <div className="absolute inset-x-0 top-0 h-[300px] sm:h-[360px] pointer-events-none overflow-hidden">
        <Image src="/aerial.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/85 to-ink-950" />
        <div className="absolute inset-0 grid-overlay opacity-50" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <IdMark className="h-7 w-auto shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">Cantavil</div>
              <div className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{info.nmSite}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/faq" className="btn-ghost" aria-label="입주 도우미">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">도우미</span>
            </Link>
            {info.isAdmin && (
              <Link href="/admin" className="btn-ghost border-brand-500/30 text-brand-200 hover:bg-brand-500/10">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">관리자</span>
              </Link>
            )}
            <button type="button" className="btn-ghost" onClick={() => load()} disabled={loading} aria-label="새로고침">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            <button type="button" className="btn-ghost" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-900/60 backdrop-blur p-4 sm:p-6 mb-5 sm:mb-7 glass">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-brand-400 mb-1">Resident</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {info.nmCstm}{' '}
                <span className="text-ink-400 font-normal text-base">
                  · {info.displayDong}동 {info.ho}호
                </span>
              </h1>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-ink-500">전체</div>
              <div className="text-2xl font-semibold tabular-nums">{items.length}<span className="text-ink-500 text-sm">건</span></div>
            </div>
          </div>
          <Link
            href="/inspect"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:from-brand-400 hover:to-brand-500"
          >
            <Plus className="h-4 w-4" />
            새 점검 등록하기
          </Link>
        </section>

        <DashboardBanners settings={settings} />

        {!loading && items.length > 0 && (
          <StatsSummary name={info.nmCstm} counts={counts} items={items} onJump={(c) => setActive(c)} />
        )}

        {/* Tabs / multi-select */}
        <div className="mb-3 flex items-center gap-2">
          {multiMode ? (
            <div className="flex flex-1 flex-wrap gap-1.5 rounded-xl border border-white/[0.06] bg-ink-850/50 p-2">
              {CATEGORY_ORDER.map((c) => {
                const on = multiSel.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleMultiCat(c)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] transition ${
                      on
                        ? 'bg-brand-500/20 text-brand-100 border border-brand-500/40'
                        : 'border border-white/[0.06] text-ink-300 hover:text-white'
                    }`}
                  >
                    {CATEGORY_LABEL[c]} <span className="tabular-nums text-ink-500">{counts[c]}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1">
              <TabBar counts={counts} active={active} onChange={setActive} />
            </div>
          )}
          <button
            type="button"
            onClick={() => setMultiMode((v) => !v)}
            title="여러 상태를 한 번에 보기"
            className={`btn-ghost shrink-0 ${multiMode ? 'border-brand-500/40 text-brand-200' : ''}`}
            aria-pressed={multiMode}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">다중</span>
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center mb-2.5">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-none">
            <select
              aria-label="점검실 필터"
              className="field text-sm w-full sm:w-40"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              disabled={loading || roomOptions.length === 0}
            >
              <option value="">
                {loading ? '불러오는 중…' : roomOptions.length === 0 ? '점검실 없음' : '점검실 전체'}
              </option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              aria-label="점검항목 필터"
              className="field text-sm w-full sm:w-40"
              value={clFilter}
              onChange={(e) => setClFilter(e.target.value)}
              disabled={loading || clOptions.length === 0}
            >
              <option value="">
                {loading ? '불러오는 중…' : clOptions.length === 0 ? '점검항목 없음' : '점검항목 전체'}
              </option>
              {clOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
            <input
              type="search"
              placeholder={loading ? '불러오는 중…' : '키워드로 빠르게 찾기'}
              className="field pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Secondary controls: sort, range, glossary, export, view, clear */}
        <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-5">
          <select
            aria-label="정렬"
            className="field text-sm w-auto"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            disabled={loading}
          >
            {(Object.entries(SORT_LABEL) as [SortMode, string][]).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            aria-label="기간 필터"
            className="field text-sm w-auto"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            disabled={loading}
          >
            {(Object.entries(RANGE_LABEL) as [DateRange, string][]).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={() => setGlossary(true)} className="btn-ghost" title="점검 용어 설명">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">용어</span>
          </button>
          <ExportBar items={items} ctx={exportCtx} />
          <div className="ml-auto inline-flex shrink-0 rounded-lg border border-white/[0.08] bg-ink-900/60 p-0.5" role="group" aria-label="보기 방식">
            <ViewButton active={view === 'list'} onClick={() => setView('list')} label="리스트">
              <List className="h-4 w-4" />
            </ViewButton>
            <ViewButton active={view === 'feed'} onClick={() => setView('feed')} label="썸네일">
              <Images className="h-4 w-4" />
            </ViewButton>
          </div>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="btn-ghost shrink-0 justify-center" aria-label="필터 초기화">
              <X className="h-4 w-4" />
              <span className="sm:hidden">필터 초기화</span>
            </button>
          )}
        </div>

        {filtersActive && (
          <div className="mb-3 text-[12px] text-ink-400">
            {filtered.length}건 표시
            {roomFilter && <> · 점검실 <span className="text-ink-200">{roomFilter}</span></>}
            {clFilter && <> · 점검항목 <span className="text-ink-200">{clFilter}</span></>}
            {dateRange !== 'all' && <> · {RANGE_LABEL[dateRange]}</>}
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200 mb-4">
            {err}
          </div>
        )}

        {loading ? (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <CardSkeleton index={i} />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState category={active} multiMode={multiMode} filtered={filtersActive} onClear={clearFilters} />
        ) : (
          <>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {shown.map((item) => (
                <li key={item.noIdx}>
                  <FlawCard
                    item={item}
                    displayDong={info.displayDong}
                    ho={info.ho}
                    visibility={visibility}
                    variant={view}
                    changed={changedIds.has(item.noIdx)}
                    onOpenDetail={setDetail}
                    onOpenGlossary={() => setGlossary(true)}
                  />
                </li>
              ))}
            </ul>
            {filtered.length > visibleCount && (
              <div ref={sentinelRef} className="mt-6 flex justify-center">
                <button type="button" onClick={() => setVisibleCount((n) => n + PAGE)} className="btn-ghost">
                  더 보기 ({filtered.length - visibleCount}건)
                </button>
              </div>
            )}
          </>
        )}

        <p className="mt-12 text-[11px] text-ink-500 text-center">
          새로고침을 눌러 가장 최근 점검 상태로 갱신할 수 있습니다.
        </p>
      </div>

      {detail && (
        <FlawDetailModal
          item={detail}
          ctx={exportCtx}
          showApplicant={visibility.nmApltPrsn}
          warranty={settings.warranty}
          onClose={() => setDetail(null)}
        />
      )}
      {glossary && <GlossaryModal onClose={() => setGlossary(false)} />}
      <Toaster />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} 보기`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm transition ${
        active ? 'bg-white/[0.08] text-ink-50' : 'text-ink-400 hover:text-ink-200'
      }`}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function CardSkeleton({ index }: { index: number }) {
  // Tiny stagger so each card pulses on its own phase — feels alive.
  const delay = `${(index % 3) * 0.18}s`;
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-ink-850/60 shadow-card p-4 sm:p-5"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2 mb-4" style={{ animationDelay: delay }}>
        <div className="skeleton h-5 w-14 rounded-full" style={{ animationDelay: delay }} />
        <div className="skeleton h-5 w-16 rounded-full" style={{ animationDelay: delay }} />
      </div>
      <div className="skeleton h-5 w-3/4 mb-2.5" style={{ animationDelay: delay }} />
      <div className="skeleton h-3.5 w-2/5" style={{ animationDelay: delay }} />
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="skeleton h-3 w-full" style={{ animationDelay: delay }} />
        <div className="skeleton h-3 w-5/6" style={{ animationDelay: delay }} />
        <div className="skeleton h-3 w-4/5" style={{ animationDelay: delay }} />
        <div className="skeleton h-3 w-3/4" style={{ animationDelay: delay }} />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton aspect-square w-24 sm:w-28" style={{ animationDelay: delay }} />
        <div className="skeleton aspect-square w-24 sm:w-28" style={{ animationDelay: delay }} />
      </div>
    </div>
  );
}

function EmptyState({
  category,
  multiMode,
  filtered,
  onClear,
}: {
  category: FlawCategory;
  multiMode: boolean;
  filtered: boolean;
  onClear: () => void;
}) {
  const finalDone = category === 'finalDone' && !multiMode;
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
      {finalDone ? (
        <PartyPopper className="mx-auto h-8 w-8 text-emerald-400/70 mb-3" />
      ) : (
        <Inbox className="mx-auto h-8 w-8 text-ink-500 mb-3" />
      )}
      <p className="text-sm text-ink-300">
        {filtered
          ? '조건에 맞는 점검 내역이 없습니다.'
          : multiMode
            ? '선택한 상태의 점검 내역이 없습니다.'
            : finalDone
              ? '아직 최종완료된 항목이 없습니다.'
              : `${CATEGORY_LABEL[category]} 상태의 점검 내역이 없습니다.`}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="btn-ghost mt-3 mx-auto">
          <X className="h-4 w-4" /> 필터 초기화
        </button>
      ) : (
        <p className="mt-1 text-[11px] text-ink-500">
          {multiMode ? '위에서 상태를 선택해 보세요.' : '다른 탭을 선택해 확인해 보세요.'}
        </p>
      )}
    </div>
  );
}
