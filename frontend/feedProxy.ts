import type { ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';

/**
 * Dev/preview middleware that proxies the two external feeds (Forex Factory
 * economic calendar and Google News RSS) through the Vite server.
 *
 * The upstreams rate-limit aggressively (Forex Factory returns HTTP 429),
 * so every response is cached in-memory for TTL_MS. When the upstream is
 * rate-limited or down, the last good copy is served instead of failing.
 */

interface CacheEntry {
  body: Buffer;
  contentType: string;
  fetchedAt: number;
}

interface FeedRoute {
  url: string;
  contentType: string;
}

const TTL_MS = 15 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function resolveFeed(requestUrl: string): FeedRoute | null {
  const path = requestUrl.split('?')[0] ?? '';
  if (path.startsWith('/ff-calendar/')) {
    // Always the weekly file — the path after the prefix is kept only so the
    // browser URL stays readable.
    return {
      url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml',
      contentType: 'application/xml; charset=windows-1252'
    };
  }
  if (path === '/news-rss' || path.startsWith('/news-rss?')) {
    const query = requestUrl.slice(requestUrl.indexOf('/news-rss') + '/news-rss'.length);
    return {
      url: `https://news.google.com/rss/search${query}`,
      contentType: 'application/rss+xml; charset=utf-8'
    };
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function feedProxyPlugin(): Plugin {
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<CacheEntry>>();

  async function fetchUpstream(route: FeedRoute): Promise<CacheEntry> {
    let lastError: unknown = new Error('Upstream unreachable');
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) await sleep(attempt * 750);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      try {
        const response = await fetch(route.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/xml, text/xml, application/rss+xml, */*'
          }
        });
        if (response.ok) {
          return {
            body: Buffer.from(await response.arrayBuffer()),
            // Serve a known content type rather than the upstream's — Forex
            // Factory's `text/xml` header omits the charset even though the
            // document is windows-1252, which garbles non-ASCII titles.
            contentType: route.contentType,
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
  function getEntry(route: FeedRoute): Promise<CacheEntry> {
    const cached = cache.get(route.url);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return Promise.resolve(cached);
    const pending = inflight.get(route.url);
    if (pending) return pending;
    const request = fetchUpstream(route)
      .then((entry) => {
        cache.set(route.url, entry);
        return entry;
      })
      .finally(() => inflight.delete(route.url));
    inflight.set(route.url, request);
    return request;
  }

  function send(res: ServerResponse, entry: CacheEntry, kind: 'hit' | 'miss' | 'stale') {
    res.statusCode = 200;
    res.setHeader('Content-Type', entry.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Feed-Cache', kind);
    res.end(entry.body);
  }

  async function serve(route: FeedRoute, res: ServerResponse) {
    const cached = cache.get(route.url);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
      send(res, cached, 'hit');
      return;
    }
    try {
      send(res, await getEntry(route), 'miss');
    } catch (error) {
      if (!cached) throw error;
      // Rate-limited or down upstream — serve the last good copy.
      send(res, cached, 'stale');
    }
  }

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const route = resolveFeed(req.url ?? '');
    if (!route) {
      next();
      return;
    }
    serve(route, res).catch(() => {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Feed unavailable');
    });
  };

  return {
    name: 'tradeledger-feed-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}
