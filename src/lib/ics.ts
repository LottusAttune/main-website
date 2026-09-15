/**
 * "Add to calendar" for confirmation emails: an .ics attachment (Apple,
 * Outlook) plus a Google Calendar link, both for the session's local
 * Toronto time.
 */

const TIME_ZONE = 'America/Toronto';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "2026-09-11T14:00:00" local → "20260911T140000". */
function localStamp(iso: string): string {
  return iso.replace(/[-:]/g, '').slice(0, 15);
}

/** Local Toronto wall time → UTC "20260911T180000Z", for the Google link. */
function toUtcStamp(localIso: string): string {
  const [date, time] = localIso.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // Toronto offset for that date: find it by formatting a UTC guess.
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const local = new Date(guess.toLocaleString('en-US', { timeZone: TIME_ZONE }));
  const offsetMinutes = (guess.getTime() - local.getTime()) / 60_000;
  const utc = new Date(guess.getTime() + offsetMinutes * 60_000);
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  startISO: string;
  endISO: string;
};

export function buildIcs(event: CalendarEvent): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lotus Attune//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TIME_ZONE}:${localStamp(event.startISO)}`,
    `DTEND;TZID=${TIME_ZONE}:${localStamp(event.endISO)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toUtcStamp(event.startISO)}/${toUtcStamp(event.endISO)}`,
    details: event.description,
    location: event.location,
    ctz: TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
