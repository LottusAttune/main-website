import 'server-only';

import { SITE } from '@/lib/site';

const TIME_ZONE = 'America/Toronto';

/** Converts a wall-clock local time in `timeZone` to its true UTC instant,
 *  handling DST correctly for the given date - comparing how the same
 *  instant renders in the target zone vs. UTC and correcting for the
 *  difference, rather than assuming a fixed offset. */
export function zonedTimeToUtc(localISO: string, timeZone: string): Date {
  const asUTC = new Date(`${localISO}Z`);
  const tzString = asUTC.toLocaleString('en-US', { timeZone });
  const utcString = asUTC.toLocaleString('en-US', { timeZone: 'UTC' });
  const offset = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asUTC.getTime() + offset);
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Folds a line at 75 octets per RFC 5545 - a long DESCRIPTION otherwise
 *  breaks strict calendar parsers (notably some Outlook versions). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

/**
 * Builds a "Discovery Call" .ics invite for the client's confirmation email.
 * METHOD:REQUEST + ORGANIZER/ATTENDEE (rather than plain PUBLISH) is what
 * makes Gmail and Outlook render their own built-in "Add to Calendar" card
 * directly in the email, not just a downloadable file.
 *
 * The UID is derived from the booking's reschedule token, which stays
 * stable across a reschedule - the same UID lets the client's calendar
 * update the existing entry in place instead of creating a duplicate.
 */
export function buildDiscoveryCallIcs(input: {
  rescheduleToken: string;
  clientName: string;
  clientEmail: string;
  organizerEmail: string;
  whatsappLink: string;
  callDate: string;
  callTime: string;
  meetLink: string;
}): string {
  const { startISO, endISO } = discoveryCallWindowLocal(input.callDate, input.callTime);
  const start = zonedTimeToUtc(startISO, TIME_ZONE);
  const end = zonedTimeToUtc(endISO, TIME_ZONE);
  const now = new Date();

  const summary = 'Discovery Call \u2014 Lotus Attune';
  const description = escapeIcsText(
    `Looking forward to connecting with you and exploring how Lotus Attune can support your reset.\n\nJoin via Google Meet: ${input.meetLink}\n\nAny questions before then, reach out at ${input.organizerEmail} or WhatsApp: ${input.whatsappLink}\n\nWarm regards,\nSilvana`
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lotus Attune//Discovery Call//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:discoverycall-${input.rescheduleToken}@lotusattune.com`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeIcsText(input.meetLink)}`,
    `URL:${input.meetLink}`,
    `ORGANIZER;CN=Silvana · Lotus Attune:mailto:${input.organizerEmail}`,
    `ATTENDEE;CN=${escapeIcsText(input.clientName)}:mailto:${input.clientEmail}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n');
}

/** A one-click "Add to Google Calendar" link - handy alongside the .ics
 *  attachment for anyone who'd rather not open a file. Same event details,
 *  just as a URL Google Calendar itself knows how to read. */
export function buildGoogleCalendarLink(input: {
  callDate: string;
  callTime: string;
  meetLink: string;
  organizerEmail: string;
  whatsappLink: string;
}): string {
  const { startISO, endISO } = discoveryCallWindowLocal(input.callDate, input.callTime);
  const start = zonedTimeToUtc(startISO, TIME_ZONE);
  const end = zonedTimeToUtc(endISO, TIME_ZONE);

  const details = `Looking forward to connecting with you and exploring how Lotus Attune can support your reset.\n\nJoin via Google Meet: ${input.meetLink}\n\nAny questions before then, reach out at ${input.organizerEmail} or WhatsApp: ${input.whatsappLink}\n\nWarm regards,\nSilvana`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Discovery Call — Lotus Attune',
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details,
    location: input.meetLink,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Same local-wall-clock math as `discoveryCallWindow` in lib/calendar.ts -
 *  duplicated rather than imported to keep this module free of the Google
 *  Calendar API's own env-var-gated setup, since an .ics file has nothing
 *  to do with whether that integration is configured. */
function discoveryCallWindowLocal(
  callDate: string,
  callTime: string
): { startISO: string; endISO: string } {
  const match = callTime.match(/^(\d+):(\d+)\s*(am|pm)$/i);
  if (!match) throw new Error(`Unrecognized time: ${callTime}`);
  const [, hourStr, minuteStr, ampm] = match;
  let hour = Number(hourStr) % 12;
  if (ampm.toLowerCase() === 'pm') hour += 12;
  const minute = Number(minuteStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  const endTotal = hour * 60 + minute + 60;
  const endHour = Math.floor(endTotal / 60) % 24;
  const endMinute = endTotal % 60;
  return {
    startISO: `${callDate}T${pad(hour)}:${pad(minute)}:00`,
    endISO: `${callDate}T${pad(endHour)}:${pad(endMinute)}:00`,
  };
}

// ---------------------------------------------------------------------------
// Session bookings (confirmation and reminder emails)
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  /** Local Toronto wall time, "YYYY-MM-DDTHH:MM:SS". */
  startISO: string;
  endISO: string;
  attendeeName?: string;
  attendeeEmail?: string;
};

/** The session invite, in the same REQUEST form as the discovery call so
 *  Gmail/Outlook show their own "Add to calendar" card. */
export function buildIcs(event: CalendarEvent): string {
  const start = zonedTimeToUtc(event.startISO, TIME_ZONE);
  const end = zonedTimeToUtc(event.endISO, TIME_ZONE);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lotus Attune//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `ORGANIZER;CN=Silvana · Lotus Attune:mailto:${SITE.email}`,
    ...(event.attendeeEmail
      ? [`ATTENDEE;CN=${escapeIcsText(event.attendeeName ?? event.attendeeEmail)}:mailto:${event.attendeeEmail}`]
      : []),
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const start = zonedTimeToUtc(event.startISO, TIME_ZONE);
  const end = zonedTimeToUtc(event.endISO, TIME_ZONE);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details: event.description,
    location: event.location,
    ctz: TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
