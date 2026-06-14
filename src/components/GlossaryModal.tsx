'use client';

import Modal from './Modal';
import { STATUS_GLOSSARY, TERM_GLOSSARY } from '@/lib/glossary';

export default function GlossaryModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="점검 용어 안내" onClose={onClose}>
      <div className="px-4 py-4 space-y-5">
        <div>
          <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-300">처리 상태</h4>
          <ul className="space-y-2">
            {STATUS_GLOSSARY.map((e) => (
              <li key={e.term} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="text-sm font-medium text-ink-100">{e.term}</div>
                <div className="text-[12px] leading-relaxed text-ink-400">{e.desc}</div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-brand-300">분류 용어</h4>
          <ul className="space-y-2">
            {TERM_GLOSSARY.map((e) => (
              <li key={e.term} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="text-sm font-medium text-ink-100">{e.term}</div>
                <div className="text-[12px] leading-relaxed text-ink-400">{e.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
