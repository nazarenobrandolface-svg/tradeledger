export type FfImpact = 'High' | 'Medium' | 'Low' | 'Holiday';

export interface FfEvent {
  id: string;
  title: string;
  currency: string;
  impact: FfImpact;
  forecast: string;
  previous: string;
  url: string;
  timestamp: number;
}

const IMPACTS: FfImpact[] = ['High', 'Medium', 'Low', 'Holiday'];

function normalizeImpact(value: string): FfImpact {
  return IMPACTS.find((impact) => impact.toLowerCase() === value.toLowerCase()) ?? 'Low';
}

function parseUtcStamp(date: string, time: string): number {
  const [month, day, year] = date.split('-').map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(time.trim().toLowerCase());
  if (!month || !day || !year || !match) return Number.NaN;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function parseFfCalendar(xmlText: string): FfEvent[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const events: FfEvent[] = [];
  doc.querySelectorAll('event').forEach((node, index) => {
    const text = (tag: string) => node.querySelector(tag)?.textContent?.trim() ?? '';
    const date = text('date');
    const time = text('time');
    const timestamp = parseUtcStamp(date, time);
    if (!Number.isFinite(timestamp)) return;
    events.push({
      id: `${date}|${time}|${index}`,
      title: text('title'),
      currency: text('country'),
      impact: normalizeImpact(text('impact')),
      forecast: text('forecast'),
      previous: text('previous'),
      url: text('url'),
      timestamp
    });
  });
  return events;
}

export async function fetchFfCalendar(): Promise<FfEvent[]> {
  const response = await fetch('/ff-calendar/ff_calendar_thisweek.xml');
  if (!response.ok) throw new Error(`Calendar feed failed: ${response.status}`);
  return parseFfCalendar(await response.text());
}
