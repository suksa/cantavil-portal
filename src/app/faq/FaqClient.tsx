'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Phone, Send, RotateCcw, AlertTriangle } from 'lucide-react';
import IdMark from '@/components/IdMark';
import {
  CONTACTS,
  DISCLAIMER,
  FAQ_CATEGORIES,
  type FaqCategoryId,
  faqByCategory,
  faqById,
  matchFaq,
} from '@/lib/faq';

// ── 메시지/액션 모델 ─────────────────────────────────────────────────────
type Action =
  | { t: 'cat'; cat: FaqCategoryId }
  | { t: 'faq'; id: string }
  | { t: 'contacts' }
  | { t: 'home' };

interface Chip {
  label: string;
  action: Action;
}

interface Msg {
  id: number;
  role: 'bot' | 'user';
  /** 매칭으로 답할 때, 어떤 질문으로 이해했는지 보여주는 머리말 (선택) */
  title?: string;
  text?: string;
  chips?: Chip[];
  /** true 면 주요 연락처 카드를 렌더링 */
  contacts?: boolean;
}

const GREETING =
  '안녕하세요! 칸타빌 더 스위트 입주 도우미예요. 🏠\n' +
  '입주민 단톡방에서 자주 나온 질문을 모아뒀어요. 아래에서 분야를 골라보거나, 맨 아래 입력창에 직접 물어보세요.';

const EXAMPLES = ['바스에어', '줄눈', '잔금', '신고필증', '사다리차', '하자'];

function menuChips(): Chip[] {
  return [
    ...FAQ_CATEGORIES.map((c) => ({
      label: `${c.emoji} ${c.label}`,
      action: { t: 'cat', cat: c.id } as Action,
    })),
    { label: '📞 주요 연락처', action: { t: 'contacts' } },
  ];
}

export default function FaqClient() {
  const [messages, setMessages] = useState<Msg[]>(() => [
    { id: 0, role: 'bot', text: GREETING, chips: menuChips() },
  ]);
  const [input, setInput] = useState('');
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const uid = () => idRef.current++;

  // 새 메시지가 추가되면 맨 아래로 스크롤.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const addUser = (text: string) =>
    setMessages((m) => [...m, { id: uid(), role: 'user', text }]);
  const addBot = (msg: Omit<Msg, 'id' | 'role'>) =>
    setMessages((m) => [...m, { id: uid(), role: 'bot', ...msg }]);

  function act(a: Action) {
    if (a.t === 'cat') {
      const c = FAQ_CATEGORIES.find((x) => x.id === a.cat);
      if (!c) return;
      const qs = faqByCategory(a.cat);
      addUser(`${c.emoji} ${c.label}`);
      addBot({
        text: `'${c.label}' 관련해서 이런 질문들이 자주 나왔어요. 궁금한 걸 눌러보세요.`,
        chips: [
          ...qs.map((e) => ({ label: e.q, action: { t: 'faq', id: e.id } as Action })),
          { label: '⬅️ 처음으로', action: { t: 'home' } },
        ],
      });
    } else if (a.t === 'faq') {
      const e = faqById(a.id);
      if (!e) return;
      addUser(e.q);
      const related = faqByCategory(e.cat).filter((x) => x.id !== e.id).slice(0, 3);
      addBot({
        text: e.a,
        chips: [
          ...related.map((r) => ({ label: r.q, action: { t: 'faq', id: r.id } as Action })),
          { label: '📞 주요 연락처', action: { t: 'contacts' } },
          { label: '⬅️ 처음으로', action: { t: 'home' } },
        ],
      });
    } else if (a.t === 'contacts') {
      addUser('📞 주요 연락처');
      addBot({
        text: '단톡방에서 공유된 주요 연락처예요. 번호를 누르면 바로 전화할 수 있어요.',
        contacts: true,
        chips: [{ label: '⬅️ 처음으로', action: { t: 'home' } }],
      });
    } else {
      addBot({
        text: '무엇이 궁금하세요? 아래에서 분야를 골라보거나 직접 입력해보세요.',
        chips: menuChips(),
      });
    }
  }

  function submit(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setInput('');
    addUser(text);

    const matches = matchFaq(text, 3);
    if (matches.length === 0) {
      addBot({
        text:
          '음, 딱 맞는 답을 못 찾았어요. 😅\n다른 단어로 다시 물어보거나, 아래에서 분야를 골라보세요. ' +
          `(예: ${EXAMPLES.join(', ')})`,
        chips: menuChips(),
      });
      return;
    }

    const top = matches[0].entry;
    const others = matches.slice(1).map((m) => m.entry);
    const related = faqByCategory(top.cat)
      .filter((x) => x.id !== top.id && !others.some((o) => o.id === x.id))
      .slice(0, 2);

    addBot({
      title: top.q,
      text: top.a,
      chips: [
        ...others.map((o) => ({ label: `🔎 ${o.q}`, action: { t: 'faq', id: o.id } as Action })),
        ...related.map((r) => ({ label: r.q, action: { t: 'faq', id: r.id } as Action })),
        { label: '📞 주요 연락처', action: { t: 'contacts' } },
        { label: '⬅️ 처음으로', action: { t: 'home' } },
      ],
    });
  }

  return (
    <div className="relative flex h-[100dvh] flex-col">
      <div className="absolute inset-0 grid-overlay opacity-40 pointer-events-none" />

      {/* 헤더 */}
      <header className="relative z-10 flex items-center gap-3 border-b border-white/[0.07] bg-ink-950/80 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-ink-200 transition hover:bg-white/[0.07]"
          aria-label="포털 홈으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600 shadow-glow">
            <Bot className="h-5 w-5 text-white" strokeWidth={2} />
          </span>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-ink-50">입주 도우미</div>
            <div className="text-[11px] text-ink-400">칸타빌 더 스위트 · 단톡방 FAQ</div>
          </div>
        </div>
        <IdMark className="ml-auto h-6 w-auto opacity-70" />
      </header>

      {/* 안내문 (항상 보이는 고정 배너) — 입주민 대화 기반이라 부정확할 수 있음 */}
      <div className="relative z-10 flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p className="text-[11px] leading-snug text-amber-100/90">{DISCLAIMER}</p>
      </div>

      {/* 대화 영역 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} onChip={act} />
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* 입력창 */}
      <div className="relative z-10 border-t border-white/[0.07] bg-ink-950/80 px-3 py-3 backdrop-blur sm:px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <button
            type="button"
            onClick={() => act({ t: 'home' })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-ink-300 transition hover:bg-white/[0.07]"
            aria-label="전체 메뉴"
            title="전체 메뉴"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="궁금한 점을 입력해보세요 (예: 바스에어 가격)"
            className="field h-11 flex-1"
            enterKeyHint="send"
            aria-label="질문 입력"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-glow transition hover:from-brand-400 hover:to-brand-500 disabled:opacity-40 disabled:shadow-none"
            aria-label="보내기"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 메시지 한 줄 ─────────────────────────────────────────────────────────
function MessageRow({ msg, onChip }: { msg: Msg; onChip: (a: Action) => void }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-tr-sm border border-brand-500/30 bg-brand-600/20 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-50">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600">
        <Bot className="h-4 w-4 text-white" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        {(msg.title || msg.text) && (
          <div className="max-w-full rounded-2xl rounded-tl-sm border border-white/[0.07] bg-ink-850/80 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-100 shadow-card">
            {msg.title && (
              <div className="mb-1.5 border-b border-white/[0.06] pb-1.5 text-[12px] text-ink-400">
                이 질문으로 이해했어요 ·{' '}
                <span className="font-medium text-brand-200">{msg.title}</span>
              </div>
            )}
            {msg.text && (
              <div className="whitespace-pre-line break-words">
                <RichText text={msg.text} />
              </div>
            )}
          </div>
        )}

        {msg.contacts && <ContactsCard />}

        {msg.chips && msg.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.chips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChip(c.action)}
                className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-left text-[13px] leading-snug text-ink-100 transition hover:border-brand-400/50 hover:bg-brand-500/20"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactsCard() {
  return (
    <div className="max-w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/[0.07] bg-ink-850/80 shadow-card">
      <ul className="divide-y divide-white/[0.05]">
        {CONTACTS.map((c) => (
          <li key={c.tel} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ink-100">{c.label}</div>
              {c.note && <div className="truncate text-[11px] text-ink-500">{c.note}</div>}
            </div>
            <a
              href={`tel:${c.tel.replace(/-/g, '')}`}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 text-[12px] font-medium tabular-nums text-brand-200 transition hover:bg-brand-500/20"
            >
              <Phone className="h-3.5 w-3.5" />
              {c.tel}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 전화번호·URL 을 눌러서 쓸 수 있는 링크로 바꿔 렌더링. (그 외엔 평문)
const LINK_RE = /(https?:\/\/[^\s)]+|1\d{3}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})/g;

function RichText({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-200 underline underline-offset-2 hover:text-brand-100"
            >
              {part}
            </a>
          );
        }
        if (/^(1\d{3}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})$/.test(part)) {
          return (
            <a
              key={i}
              href={`tel:${part.replace(/-/g, '')}`}
              className="text-brand-200 underline underline-offset-2 hover:text-brand-100"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
