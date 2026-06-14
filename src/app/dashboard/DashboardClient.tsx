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
  MapPin,
  Hammer,
  X,
} from 'lucide-react';
import Image from 'next/image';
import FlawCard from '@/components/FlawCard';
import TabBar from '@/components/TabBar';
import IdMark from '@/components/IdMark';
import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory, type FlawItem, type InspectBootstrap, type SessionInfo } from '@/lib/types';
import { DEFAULT_SETTINGS, fieldVisibleFor, type AdminSettings } from '@/lib/admin';
import {
  FLAW_CACHE_FRESH_MS,
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

export default function DashboardClient({ info }: { info: SessionInfo }) {
  const router = useRouter();
  const cached = getFlawCache();
  const [items, setItems] = useState<FlawItem[]>(cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActiveState] = useState<FlawCategory>(
    (cached?.activeTab as FlawCategory) ?? 'received',
  );
  const [query, setQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [clFilter, setClFilter] = useState('');
  const [settings, setSettings] = useState<AdminSettings>(cached?.settings ?? DEFAULT_SETTINGS);
  // 이미지형(feed)이 기본값. 사용자가 바꾸면 localStorage에 저장돼 유지된다.
  const [view, setViewState] = useState<'list' | 'feed'>('feed');

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
        router.replace('/?reason=auth');
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

  const visibility = useMemo(
    () => ({
      nmCstCpny: fieldVisibleFor(settings.visibility.nmCstCpny, info.isAdmin),
      nmWrkPrsn: fieldVisibleFor(settings.visibility.nmWrkPrsn, info.isAdmin),
      dtWrk: fieldVisibleFor(settings.visibility.dtWrk, info.isAdmin),
    }),
    [settings, info.isAdmin],
  );

  const counts = useMemo(() => {
    const out: Record<FlawCategory, number> = { received: 0, workDone: 0, reAccepted: 0, finalDone: 0 };
    for (const i of items) out[i.category]++;
    return out;
  }, [items]);

  // Filter options derived from the active tab's items (so they stay relevant).
  const tabItems = useMemo(() => items.filter((it) => it.category === active), [items, active]);
  const roomOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of tabItems) if (it.nmLoc) s.add(it.nmLoc);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [tabItems]);
  const clOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of tabItems) if (it.nmDfctCl) s.add(it.nmDfctCl);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [tabItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tabItems.filter((it) => {
      if (roomFilter && it.nmLoc !== roomFilter) return false;
      if (clFilter && it.nmDfctCl !== clFilter) return false;
      if (!q) return true;
      const hay = [it.dfctCnts, it.nmLoc, it.nmRgon, it.nmDfctCl, it.nmDfctCaus, it.nmWrkPrsn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    // 접수 탭은 최근 등록순(서버가 증가시키는 noIdx 기준)으로 정렬.
    if (active === 'received') list.sort((a, b) => b.noIdx - a.noIdx);
    return list;
  }, [tabItems, active, query, roomFilter, clFilter]);

  const filtersActive = Boolean(roomFilter || clFilter || query);
  const clearFilters = () => {
    setRoomFilter('');
    setClFilter('');
    setQuery('');
  };

  // Drop a filter selection that no longer exists in the current tab.
  useEffect(() => {
    if (roomFilter && !roomOptions.includes(roomFilter)) setRoomFilter('');
    if (clFilter && !clOptions.includes(clFilter)) setClFilter('');
  }, [roomOptions, clOptions, roomFilter, clFilter]);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

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

        <div className="mb-3">
          <TabBar counts={counts} active={active} onChange={setActive} />
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center mb-4 sm:mb-5">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-none">
            <div className="relative">
              <select
                aria-label="점검실 필터"
                className="field appearance-none pr-9 text-sm w-full sm:w-40"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <option value="">점검실 전체</option>
                {roomOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-500" />
            </div>
            <div className="relative">
              <select
                aria-label="점검항목 필터"
                className="field appearance-none pr-9 text-sm w-full sm:w-40"
                value={clFilter}
                onChange={(e) => setClFilter(e.target.value)}
              >
                <option value="">점검항목 전체</option>
                {clOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Hammer className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-500" />
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
            <input
              type="search"
              placeholder="키워드로 빠르게 찾기"
              className="field pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="inline-flex shrink-0 rounded-lg border border-white/[0.08] bg-ink-900/60 p-0.5" role="group" aria-label="보기 방식">
            <ViewButton active={view === 'list'} onClick={() => setView('list')} label="리스트">
              <List className="h-4 w-4" />
            </ViewButton>
            <ViewButton active={view === 'feed'} onClick={() => setView('feed')} label="썸네일">
              <Images className="h-4 w-4" />
            </ViewButton>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost shrink-0 justify-center"
              aria-label="필터 초기화"
            >
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
          <EmptyState category={active} filtered={filtersActive} onClear={clearFilters} />
        ) : (
          <ul
            className={
              view === 'feed'
                ? 'grid grid-cols-1 gap-4 sm:gap-5 max-w-xl mx-auto'
                : 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5'
            }
          >
            {filtered.map((item) => (
              <li key={item.noIdx}>
                <FlawCard
                  item={item}
                  displayDong={info.displayDong}
                  ho={info.ho}
                  visibility={visibility}
                  variant={view}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-[11px] text-ink-500 text-center">
          새로고침을 눌러 가장 최근 점검 상태로 갱신할 수 있습니다.
        </p>
      </div>
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
  filtered,
  onClear,
}: {
  category: FlawCategory;
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-ink-500 mb-3" />
      <p className="text-sm text-ink-300">
        {filtered
          ? '조건에 맞는 점검 내역이 없습니다.'
          : `${CATEGORY_LABEL[category]} 상태의 점검 내역이 없습니다.`}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="btn-ghost mt-3 mx-auto">
          <X className="h-4 w-4" /> 필터 초기화
        </button>
      ) : (
        <p className="mt-1 text-[11px] text-ink-500">다른 탭을 선택해 확인해 보세요.</p>
      )}
    </div>
  );
}
