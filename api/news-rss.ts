import { serveFeed } from './_lib/feed';

/**
 * Google News RSS (forex headlines) for the News page. Proxied and cached
 * server-side. The frontend fetches this via the /news-rss rewrite in
 * vercel.json, forwarding its query string.
 */
export default async function handler(
  req: { url?: string },
  res: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: Buffer | string): void;
  }
): Promise<void> {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const query = requestUrl.search;
  await serveFeed(res, {
    url: `https://news.google.com/rss/search${query}`,
    contentType: 'application/rss+xml; charset=utf-8',
    label: 'News'
  });
}
