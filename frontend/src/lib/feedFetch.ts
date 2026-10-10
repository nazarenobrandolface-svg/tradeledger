/**
 * Shared fetch for the proxied external feeds (see frontend/feedProxy.ts).
 * Adds a timeout, one retry, and human-readable error messages — the
 * upstreams rate-limit with HTTP 429, which used to surface as the bare
 * "Calendar feed failed: 429" message.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

interface FeedFetchOptions {
  attempts?: number;
  timeoutMs?: number;
}

export async function fetchFeed(
  url: string,
  label: string,
  { attempts = 2, timeoutMs = DEFAULT_TIMEOUT_MS }: FeedFetchOptions = {}
): Promise<Response> {
  let lastError: Error = new Error(`${label} feed unavailable.`);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) return response;
      lastError =
        response.status === 429
          ? new Error(`${label} feed is rate-limited (429). Give it a minute and retry.`)
          : new Error(`${label} feed failed (${response.status}).`);
      // 4xx other than 429 will not get better with a retry.
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError =
        error instanceof DOMException && error.name === 'AbortError'
          ? new Error(`${label} feed timed out.`)
          : new Error(`${label} feed unreachable. Check your connection.`);
    } finally {
      window.clearTimeout(timer);
    }
  }

  throw lastError;
}
