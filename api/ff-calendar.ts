// ESM requires the explicit .js extension on relative imports (see news-rss.ts).
import { serveFeed } from './_lib/feed.js';

/**
 * Forex Factory economic calendar (this week) for the News page. Proxied and
 * cached because the upstream rate-limits with HTTP 429. The frontend fetches
 * this via the /ff-calendar rewrite in vercel.json.
 */
export default async function handler(
  _req: unknown,
  res: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: Buffer | string): void;
  }
): Promise<void> {
  await serveFeed(res, {
    url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml',
    contentType: 'application/xml; charset=windows-1252',
    label: 'Calendar'
  });
}
