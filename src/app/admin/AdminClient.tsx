'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCog,
} from 'lucide-react';
import {
  FIELD_LABEL,
  VISIBILITY_FIELDS,
  type AdminSettings,
  type Visibility,
  type VisibilityField,
} from '@/lib/admin';
import type { SessionInfo } from '@/lib/types';
import IdMark from '@/components/IdMark';

interface Props {
  info: SessionInfo;
  initialSettings: AdminSettings;
}

const VIS_OPTIONS: { value: Visibility; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '모두 공개', sub: '일반 입주자와 관리자 모두에게 표시', icon: <Eye className="h-4 w-4" /> },
  { value: 'admin', label: '관리자만', sub: '입주자에게는 숨기고 관리자만 열람', icon: <UserCog className="h-4 w-4" /> },
  { value: 'hidden', label: '완전 숨김', sub: '관리자에게도 표시하지 않음', icon: <EyeOff className="h-4 w-4" /> },
];

export default function AdminClient({ info, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings>(initialSettings);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const save = (next: AdminSettings) => {
    setSettings(next);
    startSave(async () => {
      try {
        const r = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { settings: AdminSettings };
        setSettings(j.settings);
        setSaved(new Date().toLocaleTimeString('ko-KR'));
      } catch (e) {
        alert('저장에 실패했습니다: ' + (e as Error).message);
      }
    });
  };

  const setVisibility = (field: VisibilityField, v: Visibility) => {
    save({ ...settings, visibility: { ...settings.visibility, [field]: v } });
  };

  const toggleLock = () => save({ ...settings, siteLocked: !settings.siteLocked });

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-x-0 top-0 h-[220px] pointer-events-none">
        <div className="absolute inset-0 grid-overlay opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <IdMark className="h-7 w-auto shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">Cantavil · Admin</div>
              <div className="text-sm font-semibold truncate">{info.nmCstm} · {info.displayDong}동 {info.ho}호</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Link>
            <button type="button" onClick={logout} className="btn-ghost">로그아웃</button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-900/60 backdrop-blur p-5 sm:p-6 glass mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldAlert className="h-4 w-4 text-brand-400" />
                <h2 className="text-lg font-semibold">서비스 차단</h2>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
              </div>
              <p className="text-xs text-ink-400 leading-relaxed">
                차단 시 일반 입주자는 대시보드에 접근할 수 없으며 차단 안내 화면이 표시됩니다.
                관리자(본 계정)는 차단 중에도 정상 접근이 가능합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleLock}
              disabled={saving}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold border transition ${
                settings.siteLocked
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-200 hover:bg-brand-500/25'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
              } disabled:opacity-60`}
              aria-pressed={settings.siteLocked}
            >
              {settings.siteLocked ? (
                <>
                  <Lock className="h-4 w-4" />
                  차단 중 · 해제하기
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  운영 중 · 차단하기
                </>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-ink-900/60 backdrop-blur p-5 sm:p-6 glass mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            <h2 className="text-lg font-semibold">정보 표시 정책</h2>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
          </div>
          <p className="text-xs text-ink-400 leading-relaxed mb-5">
            아래 항목들은 카드 메타데이터로 표시됩니다. 입주자에게 어디까지 노출할지 항목별로
            결정합니다. <span className="text-ink-300">관리자만</span> 으로 두면 본 계정에서만
            보이고, <span className="text-ink-300">완전 숨김</span> 은 관리자에게도 표시되지
            않습니다.
          </p>

          <ul className="space-y-3">
            {VISIBILITY_FIELDS.map((field) => (
              <li
                key={field}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="text-sm font-medium">{FIELD_LABEL[field]}</div>
                  <code className="text-[10px] text-ink-500 font-mono">{field}</code>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {VIS_OPTIONS.map((opt) => {
                    const active = settings.visibility[field] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVisibility(field, opt.value)}
                        disabled={saving}
                        className={`relative text-left rounded-lg border px-3 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                          active
                            ? 'border-brand-500/40 bg-brand-500/10 text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-ink-300 hover:bg-white/[0.04] hover:text-ink-100'
                        } disabled:opacity-60`}
                        aria-pressed={active}
                      >
                        <div className="flex items-center gap-1.5 text-[12px] font-medium">
                          <span className={active ? 'text-brand-300' : 'text-ink-500'}>
                            {opt.icon}
                          </span>
                          {opt.label}
                          {active && <Check className="ml-auto h-3.5 w-3.5 text-brand-300" />}
                        </div>
                        <div className="mt-1 text-[10px] leading-relaxed text-ink-500">
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {saved && (
          <p className="text-[11px] text-emerald-400/80 text-right">
            <Check className="inline h-3 w-3 mr-1" />
            {saved} 저장됨
          </p>
        )}
      </div>
    </div>
  );
}
