'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  Lock,
  Megaphone,
  Power,
  PowerOff,
  Save,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserCog,
} from 'lucide-react';
import {
  FIELD_LABEL,
  VISIBILITY_FIELDS,
  type AdminSettings,
  type AuditEntry,
  type NoticeLevel,
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

const PRESETS: { key: string; label: string; sub: string; value: Visibility }[] = [
  { key: 'all', label: '전체 공개', sub: '시공사·작업자·작업일을 모두에게', value: 'all' },
  { key: 'admin', label: '최소 공개', sub: '관리자만 열람(기본값)', value: 'admin' },
  { key: 'hidden', label: '전체 비공개', sub: '관리자에게도 숨김', value: 'hidden' },
];

const NOTICE_LEVELS: { value: NoticeLevel; label: string }[] = [
  { value: 'info', label: '안내' },
  { value: 'warn', label: '주의' },
  { value: 'urgent', label: '긴급' },
];

export default function AdminClient({ info, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings>(initialSettings);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  // Local drafts for text/date fields (saved explicitly, not on every keystroke).
  const [notice, setNoticeDraft] = useState(initialSettings.notice);
  const [schedule, setScheduleDraft] = useState(initialSettings.schedule);
  const [warranty, setWarrantyDraft] = useState(initialSettings.warranty);
  const [adminUnit, setAdminUnitDraft] = useState(initialSettings.adminUnit);

  const [preview, setPreview] = useState<null | 'locked' | 'closed'>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const save = (next: AdminSettings) => {
    setSettings(next);
    startSave(async () => {
      try {
        const r = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        const j = (await r.json()) as { settings: AdminSettings };
        setSettings(j.settings);
        setNoticeDraft(j.settings.notice);
        setScheduleDraft(j.settings.schedule);
        setWarrantyDraft(j.settings.warranty);
        setAdminUnitDraft(j.settings.adminUnit);
        setSaved(new Date().toLocaleTimeString('ko-KR'));
      } catch (e) {
        alert('저장에 실패했습니다: ' + (e as Error).message);
      }
    });
  };

  const setVisibility = (field: VisibilityField, v: Visibility) => {
    save({ ...settings, visibility: { ...settings.visibility, [field]: v } });
  };
  const applyPreset = (v: Visibility) => {
    const visibility = { ...settings.visibility };
    (VISIBILITY_FIELDS as readonly VisibilityField[]).forEach((f) => {
      visibility[f] = v;
    });
    save({ ...settings, visibility });
  };

  const toggleLock = () => save({ ...settings, siteLocked: !settings.siteLocked });
  const toggleClosed = () => save({ ...settings, serviceClosed: !settings.serviceClosed });
  const toggleAdminBypass = () =>
    save({ ...settings, adminBypassClosed: !settings.adminBypassClosed });

  const saveAdminUnit = () => {
    if (adminUnit.dong || adminUnit.ho) {
      if (!/^\d{2,8}$/.test(adminUnit.dong) || !/^\d{3,5}$/.test(adminUnit.ho)) {
        alert('동은 숫자 2~8자리, 호는 숫자 3~5자리로 입력해 주세요.');
        return;
      }
      if (
        !confirm(
          `추가 관리자 호실을 ${adminUnit.dong}동 ${adminUnit.ho}호로 설정합니다.\n해당 입주자는 다음 로그인부터 관리자 권한을 갖습니다. 계속할까요?`,
        )
      )
        return;
    }
    save({ ...settings, adminUnit });
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const r = await fetch('/api/admin/audit', { cache: 'no-store' });
      const j = (await r.json()) as { log?: AuditEntry[] };
      setAudit(j.log ?? []);
    } catch {
      setAudit([]);
    } finally {
      setAuditLoading(false);
    }
  };

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
            {saving && <Loader2 className="h-4 w-4 animate-spin text-ink-400" />}
            <Link href="/dashboard" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Link>
            <button type="button" onClick={logout} className="btn-ghost">로그아웃</button>
          </div>
        </header>

        {/* 공지 배너 */}
        <Section icon={<Megaphone className="h-4 w-4 text-brand-400" />} title="전체 공지 배너" saving={saving}
          desc="켜면 모든 입주자의 대시보드 상단에 공지가 표시됩니다.">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm text-ink-200">공지 표시</span>
            <Toggle on={settings.notice.enabled} onClick={() => save({ ...settings, notice: { ...notice, enabled: !settings.notice.enabled } })} onLabel="표시 중" offLabel="숨김" />
          </div>
          <textarea
            className="field min-h-[72px] resize-y"
            placeholder="예) 6/20(금) 9시~12시 단체 보수 작업이 예정되어 있습니다."
            value={notice.message}
            maxLength={300}
            onChange={(e) => setNoticeDraft({ ...notice, message: e.target.value })}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
              {NOTICE_LEVELS.map((l) => (
                <button key={l.value} type="button"
                  onClick={() => setNoticeDraft({ ...notice, level: l.value })}
                  className={`rounded-md px-3 py-1.5 text-[12px] transition ${notice.level === l.value ? 'bg-brand-500/20 text-brand-200' : 'text-ink-400 hover:text-ink-200'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary ml-auto" disabled={saving}
              onClick={() => save({ ...settings, notice: { ...notice, enabled: settings.notice.enabled } })}>
              <Save className="h-4 w-4" /> 공지 저장
            </button>
          </div>
        </Section>

        {/* 입주/마감 일정 */}
        <Section icon={<CalendarClock className="h-4 w-4 text-brand-400" />} title="입주 · 접수 마감 일정" saving={saving}
          desc="설정하면 로그인·대시보드 상단에 남은 일수(D-day)가 안내됩니다.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField label="입주(이사) 시작일" value={schedule.moveInDate} onChange={(v) => setScheduleDraft({ ...schedule, moveInDate: v })} />
            <DateField label="하자 접수 마감일" value={schedule.submitDeadline} onChange={(v) => setScheduleDraft({ ...schedule, submitDeadline: v })} />
          </div>
          <button type="button" className="btn-primary mt-3" disabled={saving} onClick={() => save({ ...settings, schedule })}>
            <Save className="h-4 w-4" /> 일정 저장
          </button>
        </Section>

        {/* 보증기간 */}
        <Section icon={<ShieldCheck className="h-4 w-4 text-brand-400" />} title="하자보수 보증기간" saving={saving}
          desc="보증 시작일과 기간(개월)을 입력하면 각 하자 카드에 만료까지 남은 일수가 표시됩니다.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField label="보증 시작일(보통 입주일)" value={warranty.startDate} onChange={(v) => setWarrantyDraft({ ...warranty, startDate: v })} />
            <div>
              <label className="label">보증기간(개월)</label>
              <input type="number" min={0} max={120} className="field" value={warranty.months || ''}
                placeholder="예) 24"
                onChange={(e) => setWarrantyDraft({ ...warranty, months: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <button type="button" className="btn-primary mt-3" disabled={saving} onClick={() => save({ ...settings, warranty })}>
            <Save className="h-4 w-4" /> 보증기간 저장
          </button>
        </Section>

        {/* 서비스 차단 */}
        <Section icon={<ShieldAlert className="h-4 w-4 text-brand-400" />} title="서비스 차단" saving={saving}
          desc="차단 시 일반 입주자는 대시보드에 접근할 수 없으며 차단 안내 화면이 표시됩니다. 관리자(본 계정)는 차단 중에도 정상 접근이 가능합니다.">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPreview('locked')} className="btn-ghost">
              <Eye className="h-4 w-4" /> 차단 화면 미리보기
            </button>
            <button
              type="button"
              onClick={toggleLock}
              disabled={saving}
              className={`ml-auto inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold border transition ${
                settings.siteLocked
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-200 hover:bg-brand-500/25'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
              } disabled:opacity-60`}
              aria-pressed={settings.siteLocked}
            >
              {settings.siteLocked ? <><Lock className="h-4 w-4" /> 차단 중 · 해제하기</> : <><Unlock className="h-4 w-4" /> 운영 중 · 차단하기</>}
            </button>
          </div>
        </Section>

        {/* 서비스 종료 */}
        <Section icon={<PowerOff className="h-4 w-4 text-brand-400" />} title="서비스 종료 페이지" saving={saving}
          desc="켜면 모든 사용자가 종료 안내(/closed) 페이지로 이동되고 API는 410을 반환합니다. 관리자 페이지와 로그인은 종료 중에도 동작합니다.">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPreview('closed')} className="btn-ghost">
              <Eye className="h-4 w-4" /> 종료 화면 미리보기
            </button>
            <button
              type="button"
              onClick={toggleClosed}
              disabled={saving}
              className={`ml-auto inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold border transition ${
                settings.serviceClosed
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-200 hover:bg-brand-500/25'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
              } disabled:opacity-60`}
              aria-pressed={settings.serviceClosed}
            >
              {settings.serviceClosed ? <><PowerOff className="h-4 w-4" /> 종료 중 · 해제</> : <><Power className="h-4 w-4" /> 운영 중 · 종료하기</>}
            </button>
          </div>
          <div className={`mt-4 pt-4 border-t border-white/[0.06] transition ${settings.serviceClosed ? '' : 'opacity-60'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-ink-300" />
                <span className="text-sm font-medium">종료 중 관리자 정상 접근</span>
              </div>
              <button type="button" onClick={toggleAdminBypass} disabled={saving}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border transition ${
                  settings.adminBypassClosed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/[0.04] border-white/10 text-ink-300'
                } disabled:opacity-60`}
                aria-pressed={settings.adminBypassClosed}>
                {settings.adminBypassClosed ? '관리자 우회 켜짐' : '관리자 우회 꺼짐'}
              </button>
            </div>
          </div>
        </Section>

        {/* 정보 표시 정책 + 일괄 프리셋 */}
        <Section icon={<ShieldCheck className="h-4 w-4 text-brand-400" />} title="정보 표시 정책" saving={saving}
          desc="카드 메타데이터를 입주자에게 어디까지 노출할지 항목별로 정합니다. 아래 프리셋으로 한 번에 바꿀 수도 있습니다.">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" disabled={saving} onClick={() => applyPreset(p.value)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.05] disabled:opacity-60">
                <div className="text-[12px] font-medium text-ink-100">{p.label}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">{p.sub}</div>
              </button>
            ))}
          </div>
          <ul className="space-y-3">
            {VISIBILITY_FIELDS.map((field) => (
              <li key={field} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="text-sm font-medium">{FIELD_LABEL[field]}</div>
                  <code className="text-[10px] text-ink-500 font-mono">{field}</code>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {VIS_OPTIONS.map((opt) => {
                    const active = settings.visibility[field] === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setVisibility(field, opt.value)} disabled={saving}
                        className={`relative text-left rounded-lg border px-3 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                          active ? 'border-brand-500/40 bg-brand-500/10 text-white' : 'border-white/[0.06] bg-white/[0.02] text-ink-300 hover:bg-white/[0.04] hover:text-ink-100'
                        } disabled:opacity-60`} aria-pressed={active}>
                        <div className="flex items-center gap-1.5 text-[12px] font-medium">
                          <span className={active ? 'text-brand-300' : 'text-ink-500'}>{opt.icon}</span>
                          {opt.label}
                          {active && <Check className="ml-auto h-3.5 w-3.5 text-brand-300" />}
                        </div>
                        <div className="mt-1 text-[10px] leading-relaxed text-ink-500">{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* 추가 관리자 호실 */}
        <Section icon={<KeyRound className="h-4 w-4 text-brand-400" />} title="추가 관리자 호실" saving={saving}
          desc="기본 관리자 외에 관리 권한을 부여할 호실을 지정합니다. 기본 관리자(env/기본값)는 항상 유지되어 권한을 회수당하지 않습니다. 비워두면 추가 관리자 없음.">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">동</label>
              <input className="field" inputMode="numeric" placeholder="예) 101" value={adminUnit.dong}
                onChange={(e) => setAdminUnitDraft({ ...adminUnit, dong: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <label className="label">호</label>
              <input className="field" inputMode="numeric" placeholder="예) 1203" value={adminUnit.ho}
                onChange={(e) => setAdminUnitDraft({ ...adminUnit, ho: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {(adminUnit.dong || adminUnit.ho) && (
              <button type="button" className="btn-ghost" disabled={saving}
                onClick={() => { setAdminUnitDraft({ dong: '', ho: '' }); save({ ...settings, adminUnit: { dong: '', ho: '' } }); }}>
                해제
              </button>
            )}
            <button type="button" className="btn-primary ml-auto" disabled={saving} onClick={saveAdminUnit}>
              <Save className="h-4 w-4" /> 적용
            </button>
          </div>
        </Section>

        {/* 감사 로그 */}
        <Section icon={<History className="h-4 w-4 text-brand-400" />} title="설정 변경 기록" saving={false}
          desc="관리자 설정이 언제·누구에 의해·어떻게 바뀌었는지 최근 100건을 보관합니다.">
          {audit === null ? (
            <button type="button" className="btn-ghost" onClick={loadAudit} disabled={auditLoading}>
              {auditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />} 기록 불러오기
            </button>
          ) : audit.length === 0 ? (
            <p className="text-[12px] text-ink-500">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {audit.map((e, i) => (
                <li key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px]">
                  <div className="flex items-center justify-between text-ink-400">
                    <span className="font-mono">{e.actor}</span>
                    <span className="tabular-nums">{new Date(e.at).toLocaleString('ko-KR')}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-ink-200">
                    {e.changes.map((c, j) => (
                      <li key={j}>
                        <span className="text-ink-400">{c.field}:</span> {c.from} → <span className="text-brand-200">{c.to}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {saved && (
          <p className="text-[11px] text-emerald-400/80 text-right">
            <Check className="inline h-3 w-3 mr-1" />
            {saved} 저장됨
          </p>
        )}
      </div>

      {preview && <PreviewModal kind={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Section({ icon, title, desc, saving, children }: {
  icon: React.ReactNode; title: string; desc: string; saving: boolean; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-900/60 backdrop-blur p-5 sm:p-6 glass mb-6">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
      </div>
      <p className="text-xs text-ink-400 leading-relaxed mb-4">{desc}</p>
      {children}
    </section>
  );
}

function Toggle({ on, onClick, onLabel, offLabel }: { on: boolean; onClick: () => void; onLabel: string; offLabel: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border transition ${
        on ? 'bg-brand-500/15 border-brand-500/40 text-brand-200' : 'bg-white/[0.04] border-white/10 text-ink-300'
      }`}>
      {on ? onLabel : offLabel}
    </button>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="date" className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PreviewModal({ kind, onClose }: { kind: 'locked' | 'closed'; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          {kind === 'locked' ? <Lock className="h-5 w-5 text-brand-400" /> : <PowerOff className="h-5 w-5 text-brand-400" />}
        </div>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-1">미리보기 · 입주자 화면</p>
        <h3 className="text-lg font-semibold">
          {kind === 'locked' ? '접속이 일시 차단되었습니다' : '점검 포털 운영을 종료했습니다'}
        </h3>
        <p className="mt-2 text-sm text-ink-400 leading-relaxed">
          {kind === 'locked'
            ? '관리자가 점검 포털을 일시적으로 차단했습니다. 차단이 해제되면 다시 접속할 수 있습니다.'
            : '점검 내역 조회는 더 이상 제공되지 않습니다.'}
        </p>
        <button type="button" onClick={onClose} className="btn-ghost mt-6 mx-auto">닫기</button>
      </div>
    </div>
  );
}
