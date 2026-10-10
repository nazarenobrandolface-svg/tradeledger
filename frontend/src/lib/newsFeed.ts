import { fetchFeed } from './feedFetch';

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number;
}

export function parseRssNews(xmlText: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items: NewsItem[] = [];
  doc.querySelectorAll('item').forEach((node, index) => {
    const title = node.querySelector('title')?.textContent?.trim() ?? '';
    if (!title) return;
    const link = node.querySelector('link')?.textContent?.trim() ?? '';
    const source = node.querySelector('source')?.textContent?.trim() ?? '';
    const pubDate = node.querySelector('pubDate')?.textContent ?? '';
    const publishedAt = Date.parse(pubDate);
    items.push({
      id: link || String(index),
      title,
      link,
      source,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0
    });
  });
  return items;
}

export async function fetchForexNews(): Promise<NewsItem[]> {
  const response = await fetchFeed('/news-rss?q=forex+trading&hl=en-US&gl=US&ceid=US:en', 'News');
  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('News feed returned invalid data.');
  }
  return parseRssNews(xml);
}
