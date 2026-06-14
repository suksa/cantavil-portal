// Minimal, dependency-free ephemeral toast bus for one-shot UX feedback
// (copy-succeeded, export-started, weak-wifi warning, etc.). NOT a notification
// system — nothing is persisted; messages vanish after a few seconds.

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export interface ToastDetail {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
}

const EVENT = 'cantavil:toast';
let seq = 0;

export function showToast(message: string, kind: ToastKind = 'info', duration = 2600): void {
  if (typeof window === 'undefined') return;
  const detail: ToastDetail = { id: ++seq, message, kind, duration };
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail }));
}

export function onToast(cb: (t: ToastDetail) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ToastDetail>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
