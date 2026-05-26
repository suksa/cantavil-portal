'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, RefreshCw, Search, Inbox } from 'lucide-react';
import Image from 'next/image';
import FlawCard from '@/components/FlawCard';
import TabBar from '@/components/TabBar';
import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory, type FlawItem, type SessionInfo } from '@/lib/types';

interface ApiResponse {
  items: FlawItem[];
  total: number;
  info: SessionInfo;
}

export default function DashboardClient({ info }: { info: SessionInfo }) {
  const router = useRouter();
  const [items, setItems] = useState<FlawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<FlawCategory>('received');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/flaws', { cache: 'no-store' });
      if (r.status === 401) {
        router.replace('/?reason=auth');
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ApiResponse;
      setItems(data.items);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const out: Record<FlawCategory, number> = { received: 0, workDone: 0, reAccepted: 0, finalDone: 0 };
    for (const i of items) out[i.category]++;
    return out;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (it.category !== active) return false;
      if (!q) return true;
      const hay = [it.dfctCnts, it.nmLoc, it.nmRgon, it.nmDfctCl, it.nmDfctCaus, it.nmWrkPrsn]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, active, query]);

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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-500/95 text-white font-bold tracking-tight">
              ID
            </span>
            <div className="leading-tight min-w-0">
              <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">Cantavil</div>
              <div className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{info.nmSite}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={load} disabled={loading} aria-label="새로고침">
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
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4 sm:mb-5">
          <div className="flex-1">
            <TabBar counts={counts} active={active} onChange={setActive} />
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
            <input
              type="search"
              placeholder="키워드로 빠르게 찾기"
              className="field pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {err && (
          <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-200 mb-4">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState category={active} query={query} />
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {filtered.map((item) => (
              <li key={item.noIdx}>
                <FlawCard item={item} displayDong={info.displayDong} ho={info.ho} />
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

function EmptyState({ category, query }: { category: FlawCategory; query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-ink-500 mb-3" />
      <p className="text-sm text-ink-300">
        {query
          ? `"${query}" 검색 결과가 없습니다.`
          : `${CATEGORY_LABEL[category]} 상태의 점검 내역이 없습니다.`}
      </p>
      <p className="mt-1 text-[11px] text-ink-500">
        다른 탭을 선택하거나 검색어를 비워서 전체를 확인해 보세요.
      </p>
    </div>
  );
}
