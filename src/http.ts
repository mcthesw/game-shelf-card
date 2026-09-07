export type Fetch = typeof globalThis.fetch;
export type Sleep = (milliseconds: number) => Promise<void>;
const sleep: Sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export class HttpError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

// Errors deliberately omit request URLs, response bodies, and nested exceptions:
// Steam API keys are query parameters and must never reach logs.
export async function requestBytes(
  url: URL, label: string, fetcher: Fetch = globalThis.fetch,
  wait: Sleep = sleep, maxBytes = 5 * 1024 * 1024,
): Promise<{ bytes: Buffer; contentType: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(15_000), redirect: 'error',
        headers: { 'User-Agent': 'steam-stats-card/0.1' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await wait(Math.min(5000, Math.max(500 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : 0)));
          continue;
        }
        throw new HttpError(`${label}: HTTP ${response.status}.`, response.status);
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        await response.body?.cancel();
        throw new HttpError(`${label}: response is too large.`);
      }
      if (!response.body) throw new HttpError(`${label}: empty response.`);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes) {
          await reader.cancel();
          throw new HttpError(`${label}: response is too large.`);
        }
        chunks.push(value);
      }
      return { bytes: Buffer.concat(chunks), contentType: response.headers.get('content-type') ?? '' };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (attempt === 2) throw new HttpError(`${label}: network request failed or timed out.`);
      await wait(500 * 2 ** attempt);
    }
  }
  throw new HttpError(`${label}: request failed.`);
}

export async function requestJson(url: URL, label: string, fetcher?: Fetch): Promise<unknown> {
  const { bytes } = await requestBytes(url, label, fetcher);
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new HttpError(`${label}: invalid JSON response.`); }
}

export async function mapConcurrent<T, R>(values: T[], concurrency: number, job: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await job(values[index]!);
    }
  }));
  return results;
}
