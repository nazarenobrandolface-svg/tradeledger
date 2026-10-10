/**
 * Shared helper for the Vercel serverless feed functions. Lives under
 * `api/_lib/` — files in the api directory starting with an underscore are
 * not exposed as endpoints.
 *
 * Mirrors the dev middleware in frontend/feedProxy.ts: retries with backoff
 * on 429/5xx, keeps an in-memory last-good copy, and sets CDN cache headers
 * so Vercel's edge absorbs upstream rate limits across all visitors.
 */

interface CachedEntry {
  body: Buffer;
  contentType: string;
  fetchedAt: number;
}

export interface FeedOptions {
  /** Absolute upstream URL to fetch. */
  url: string;
  /** Content type served to the client (upstream may omit the charset). */
  contentType: string;
  /** Human-readable feed name for error messages. */
  label: string;
}

const TTL_MS = 15 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Per-instance cache. Serverless instances are recycled, but this still
// absorbs bursts against a warm instance; the s-maxage header below makes
// Vercel's CDN cache cover cold ones.
const cache = new Map<string, CachedEntry>();
const inflight = new Map<string, Promise<CachedEntry>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUpstream(options: FeedOptions): Promise<CachedEntry> {
  let lastError: unknown = new Error('Upstream unreachable');
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(attempt * 500);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetch(options.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/xml, text/xml, application/rss+xml, */*'
        }
      });
      if (response.ok) {
        return {
          body: Buffer.from(await response.arrayBuffer()),
          contentType: options.contentType,
          fetchedAt: Date.now()
        };
      }
      lastError = new Error(`Upstream responded ${response.status}`);
      // 4xx other than 429 will not get better with retries.
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** Deduplicates concurrent requests so a rate-limit window is not hammered. */
function getEntry(options: FeedOptions): Promise<CachedEntry> {
  const cached = cache.get(options.url);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return Promise.resolve(cached);
  const pending = inflight.get(options.url);
  if (pending) return pending;
  const request = fetchUpstream(options)
    .then((entry) => {
      cache.set(options.url, entry);
      return entry;
    })
    .finally(() => inflight.delete(options.url));
  inflight.set(options.url, request);
  return request;
}

interface FeedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
}

async function buildResponse(options: FeedOptions): Promise<FeedResponse> {
  // Edge/CDN cache: 15 minutes shared, then revalidate in the background.
  const cdnHeaders = {
    'Content-Type': options.contentType,
    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': '*'
  };
  const cached = cache.get(options.url);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { statusCode: 200, headers: { ...cdnHeaders, 'X-Feed-Cache': 'hit' }, body: cached.body };
  }
  try {
    const entry = await getEntry(options);
    return { statusCode: 200, headers: { ...cdnHeaders, 'X-Feed-Cache': 'miss' }, body: entry.body };
  } catch (error) {
    if (cached) {
      // Rate-limited or down upstream — serve the last good copy.
      return { statusCode: 200, headers: { ...cdnHeaders, 'X-Feed-Cache': 'stale' }, body: cached.body };
    }
    throw error;
  }
}

interface ServerlessResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Buffer | string): void;
}

export async function serveFeed(
  res: ServerlessResponse,
  options: FeedOptions
): Promise<void> {
  try {
    const response = await buildResponse(options);
    res.statusCode = response.statusCode;
    for (const [name, value] of Object.entries(response.headers)) {
      res.setHeader(name, value);
    }
    res.end(response.body);
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`${options.label} feed unavailable`);
  }
}
