import { describe, expect, it } from 'vitest';
import { parseFfCalendar } from '../ffCalendar';

const sample = `<?xml version="1.0" encoding="windows-1252"?>
<weeklyevents>
  <event>
    <title><![CDATA[Nonfarm Payrolls]]></title>
    <country>USD</country>
    <date><![CDATA[10-09-2026]]></date>
    <time><![CDATA[12:30pm]]></time>
    <impact><![CDATA[High]]></impact>
    <forecast><![CDATA[50K]]></forecast>
    <previous><![CDATA[42K]]></previous>
    <url><![CDATA[https://www.forexfactory.com/calendar/1-nfp]]></url>
  </event>
  <event>
    <title>Bank Holiday</title>
    <country>AUD</country>
    <date>10-12-2026</date>
    <time>8:00pm</time>
    <impact>Holiday</impact>
    <forecast />
    <previous />
  </event>
</weeklyevents>`;

describe('parseFfCalendar', () => {
  it('parses CDATA and plain events with UTC timestamps', () => {
    const events = parseFfCalendar(sample);
    expect(events).toHaveLength(2);

    const nfp = events[0];
    expect(nfp?.title).toBe('Nonfarm Payrolls');
    expect(nfp?.currency).toBe('USD');
    expect(nfp?.impact).toBe('High');
    expect(nfp?.forecast).toBe('50K');
    expect(nfp?.previous).toBe('42K');
    expect(nfp?.timestamp).toBe(Date.UTC(2026, 9, 9, 12, 30));
    expect(nfp?.url).toBe('https://www.forexfactory.com/calendar/1-nfp');
  });

  it('handles 12-hour times, empty tags, and Holiday impact', () => {
    const holiday = parseFfCalendar(sample)[1];
    expect(holiday?.title).toBe('Bank Holiday');
    expect(holiday?.impact).toBe('Holiday');
    expect(holiday?.forecast).toBe('');
    expect(holiday?.timestamp).toBe(Date.UTC(2026, 9, 12, 20));
  });

  it('treats midnight am/pm correctly', () => {
    const xml =
      '<weeklyevents><event><title>Test</title><country>USD</country>' +
      '<date>10-13-2026</date><time>12:00am</time><impact>Low</impact></event></weeklyevents>';
    expect(parseFfCalendar(xml)[0]?.timestamp).toBe(Date.UTC(2026, 9, 13, 0));
  });

  it('skips events without a parseable timestamp', () => {
    const xml =
      '<weeklyevents><event><title>Broken</title><country>USD</country>' +
      '<date></date><time></time></event></weeklyevents>';
    expect(parseFfCalendar(xml)).toHaveLength(0);
  });
});
