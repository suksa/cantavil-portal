'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { LoginSchema, normalizePhone, type LoginInput } from '@/lib/schema';
import type { DongOption } from '@/lib/types';

interface BootResponse {
  cdSite: string;
  nmSite: string;
  dongList: DongOption[];
}

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [boot, setBoot] = useState<BootResponse | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);
  const [hoList, setHoList] = useState<string[]>([]);
  const [hoLoading, setHoLoading] = useState(false);

  const [values, setValues] = useState<{ dong: string; ho: string; nmCstm: string; noMphn: string }>({
    dong: '',
    ho: '',
    nmCstm: '',
    noMphn: '',
  });
  const [fieldErr, setFieldErr] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(
    params.get('reason') === 'auth' ? '세션이 만료되었습니다. 다시 로그인해 주세요.' : null,
  );

  // Initial boot — fetch dong list
  useEffect(() => {
    let alive = true;
    fetch('/api/boot')
      .then(async (r) => {
        if (!r.ok) throw new Error(`boot ${r.status}`);
        return (await r.json()) as BootResponse;
      })
      .then((data) => {
        if (alive) setBoot(data);
      })
      .catch((e) => alive && setBootErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  // Fetch ho list when dong changes
  useEffect(() => {
    if (!values.dong) {
      setHoList([]);
      return;
    }
    let alive = true;
    setHoLoading(true);
    setHoList([]);
    fetch(`/api/ho?dong=${encodeURIComponent(values.dong)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`ho ${r.status}`);
        return (await r.json()) as { hoList: string[] };
      })
      .then((data) => {
        if (alive) setHoList(data.hoList);
      })
      .catch(() => alive && setHoList([]))
      .finally(() => alive && setHoLoading(false));
    return () => {
      alive = false;
    };
  }, [values.dong]);

  const dongLabel = useMemo(() => {
    const found = boot?.dongList.find((d) => d.dong === values.dong);
    return found?.nmDong ?? '';
  }, [boot, values.dong]);

  const onPhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 7) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    setValues((v) => ({ ...v, noMphn: formatted }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErr({});
    setServerErr(null);

    const parsed = LoginSchema.safeParse({
      dong: values.dong,
      ho: values.ho,
      nmCstm: values.nmCstm.trim(),
      noMphn: normalizePhone(values.noMphn),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErr({
        dong: flat.dong?.[0],
        ho: flat.ho?.[0],
        nmCstm: flat.nmCstm?.[0],
        noMphn: flat.noMphn?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
        info?: { isAdmin?: boolean };
      };
      if (!r.ok) {
        if (data.fieldErrors) {
          setFieldErr(data.fieldErrors);
        }
        setServerErr(data.error ?? '로그인에 실패했습니다.');
        return;
      }
      router.replace(data.info?.isAdmin ? '/admin' : '/dashboard');
      router.refresh();
    } catch {
      setServerErr('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <label className="label">단지</label>
        <input
          className="field cursor-not-allowed text-ink-200"
          value={boot?.nmSite ?? '신검단중앙역 칸타빌 더 스위트'}
          readOnly
          disabled
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-dong">동</label>
          <select
            id="f-dong"
            className={`field ${fieldErr.dong ? 'field-error' : ''}`}
            value={values.dong}
            onChange={(e) => setValues((v) => ({ ...v, dong: e.target.value, ho: '' }))}
            disabled={!boot}
          >
            <option value="">{boot ? '동 선택' : '불러오는 중…'}</option>
            {boot?.dongList.map((d) => (
              <option key={d.dong} value={d.dong}>{d.nmDong}동</option>
            ))}
          </select>
          {fieldErr.dong && <p className="mt-1.5 text-[11px] text-brand-300">{fieldErr.dong}</p>}
        </div>
        <div>
          <label className="label" htmlFor="f-ho">호</label>
          <select
            id="f-ho"
            className={`field ${fieldErr.ho ? 'field-error' : ''}`}
            value={values.ho}
            onChange={(e) => setValues((v) => ({ ...v, ho: e.target.value }))}
            disabled={!values.dong || hoLoading}
          >
            <option value="">
              {!values.dong ? '동 먼저 선택' : hoLoading ? '불러오는 중…' : '호 선택'}
            </option>
            {hoList.map((h) => (
              <option key={h} value={h}>{h}호</option>
            ))}
          </select>
          {fieldErr.ho && <p className="mt-1.5 text-[11px] text-brand-300">{fieldErr.ho}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="f-name">이름</label>
        <input
          id="f-name"
          className={`field ${fieldErr.nmCstm ? 'field-error' : ''}`}
          placeholder="홍길동"
          autoComplete="name"
          value={values.nmCstm}
          onChange={(e) => setValues((v) => ({ ...v, nmCstm: e.target.value }))}
        />
        {fieldErr.nmCstm && <p className="mt-1.5 text-[11px] text-brand-300">{fieldErr.nmCstm}</p>}
      </div>

      <div>
        <label className="label" htmlFor="f-phone">전화번호</label>
        <input
          id="f-phone"
          type="tel"
          inputMode="numeric"
          className={`field ${fieldErr.noMphn ? 'field-error' : ''}`}
          placeholder="010-0000-0000"
          autoComplete="tel"
          value={values.noMphn}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
        {fieldErr.noMphn && <p className="mt-1.5 text-[11px] text-brand-300">{fieldErr.noMphn}</p>}
      </div>

      {(serverErr || bootErr) && (
        <div className="flex items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/[0.08] px-3 py-2.5 text-xs text-brand-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{serverErr ?? bootErr}</span>
        </div>
      )}

      <button type="submit" className="btn-primary mt-2" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            로그인 중…
          </>
        ) : (
          <>
            로그인
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-[11px] leading-relaxed text-ink-400">
        칸타빌 더 스위트 입주자 본인 확인 후 점검 내역을 조회합니다. 입력하신 정보는 본인 확인에만
        사용되며 별도로 저장되지 않습니다.
        {dongLabel && (
          <span className="mt-1 block text-ink-500">선택됨: {dongLabel}동 {values.ho || '—'}</span>
        )}
      </p>
    </form>
  );
}
