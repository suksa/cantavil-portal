// Small exponential-backoff retry helper for transient network failures.
// Intentionally retries only when the caller throws — a 4xx (validation) should
// throw `AbortRetry` so it fails fast instead of hammering the server.

export class AbortRetry extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AbortRetry';
    this.cause = cause;
  }
}

export interface RetryOptions {
  retries?: number; // total attempts = retries + 1
  baseMs?: number; // first backoff (then doubled each time)
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
  signal?: AbortSignal;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new AbortRetry('취소되었습니다.'));
      },
      { once: true },
    );
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 3000;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (err instanceof AbortRetry) throw err;
      if (attempt >= retries) throw err;
      // 3s · 6s · 12s … with ±30% jitter so retries don't sync up.
      const delay = Math.round(baseMs * 2 ** attempt * (0.85 + Math.random() * 0.3));
      opts.onRetry?.(attempt + 1, delay, err);
      await wait(delay, opts.signal);
      attempt++;
    }
  }
}

/**
 * fetch() wrapper that treats network errors and 5xx as retryable, but turns
 * 4xx into AbortRetry (fail fast). Returns the parsed JSON `body` and `res`.
 */
export async function postJsonWithRetry<T = unknown>(
  url: string,
  payload: unknown,
  opts: RetryOptions = {},
): Promise<{ res: Response; body: T }> {
  return withRetry(async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // True network failure — let withRetry try again.
      throw new Error((e as Error)?.message ?? '네트워크 오류');
    }
    const body = (await res.json().catch(() => ({}))) as T;
    if (res.status >= 400 && res.status < 500) {
      // Client error (validation / auth) — do not retry.
      throw new AbortRetry(`HTTP ${res.status}`, { res, body });
    }
    if (!res.ok) {
      // 5xx / 502 / 503 — retryable.
      throw new Error(`HTTP ${res.status}`);
    }
    return { res, body };
  }, opts);
}
