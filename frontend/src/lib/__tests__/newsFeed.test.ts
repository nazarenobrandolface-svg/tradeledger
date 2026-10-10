import { describe, expect, it } from 'vitest';
import { parseRssNews } from '../newsFeed';

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Forex News</title>
    <item>
      <title>Dollar rises after CPI beat</title>
      <link>https://example.com/articles/cpi</link>
      <pubDate>Fri, 09 Oct 2026 14:30:00 GMT</pubDate>
      <source url="https://example.com">Example Wire</source>
    </item>
    <item>
      <title>ECB holds rates steady</title>
      <link>https://example.com/articles/ecb</link>
      <pubDate>not-a-date</pubDate>
    </item>
  </channel>
</rss>`;

describe('parseRssNews', () => {
  it('parses items with title, link, source, and pubDate', () => {
    const items = parseRssNews(rss);
    expect(items).toHaveLength(2);

    const first = items[0];
    expect(first?.title).toBe('Dollar rises after CPI beat');
    expect(first?.link).toBe('https://example.com/articles/cpi');
    expect(first?.source).toBe('Example Wire');
    expect(first?.publishedAt).toBe(Date.parse('Fri, 09 Oct 2026 14:30:00 GMT'));
  });

  it('falls back to 0 for unparsable dates and index ids without links', () => {
    const items = parseRssNews(rss);
    expect(items[1]?.publishedAt).toBe(0);
    expect(items[1]?.source).toBe('');
  });

  it('returns an empty list for non-RSS input', () => {
    expect(parseRssNews('<html><body>nope</body></html>')).toHaveLength(0);
  });
});
