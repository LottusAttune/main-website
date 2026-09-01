import 'server-only';

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

const configured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);

const TIME_ZONE = 'America/Toronto';

async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        refresh_token: REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) {
      console.error('[calendar] token refresh failed:', await response.text());
      return null;
    }
    const data = (await response.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (error) {
    console.error('[calendar] token refresh failed:', error);
    return null;
  }
}

type EventInput = {
  summary: string;
  description: string;
  location?: string;
  startISO: string;
  endISO: string;
};

/**
 * Creates an event on Silvana's own Google Calendar (the account that
 * authorized GOOGLE_CALENDAR_REFRESH_TOKEN). Best-effort: a failure is
 * logged but never thrown, since the booking itself is already saved in
 * Postgres and is the source of truth, not the calendar entry. Returns the
 * created event's id (to later update or delete it), or null on failure.
 */
export async function createCalendarEvent(
  input: EventInput
): Promise<string | null> {
  if (!configured) {
    console.error('[calendar] Google Calendar is not configured - skipping');
    return null;
  }
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.startISO, timeZone: TIME_ZONE },
          end: { dateTime: input.endISO, timeZone: TIME_ZONE },
        }),
      }
    );

    if (!response.ok) {
      console.error('[calendar] event create failed:', await response.text());
      return null;
    }
    const data = (await response.json()) as { id?: string };
    return data.id ?? null;
  } catch (error) {
    console.error('[calendar] event create failed:', error);
    return null;
  }
}

/** Moves an existing event to a new date/time - used when a discovery call
 *  is rescheduled or edited from the studio. */
export async function updateCalendarEventTime(
  eventId: string,
  startISO: string,
  endISO: string
): Promise<void> {
  if (!configured) return;
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: { dateTime: startISO, timeZone: TIME_ZONE },
          end: { dateTime: endISO, timeZone: TIME_ZONE },
        }),
      }
    );
    if (!response.ok) {
      console.error('[calendar] event update failed:', await response.text());
    }
  } catch (error) {
    console.error('[calendar] event update failed:', error);
  }
}

/** Removes an event - used when a discovery call is cancelled or deleted. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!configured) return;
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    // 410 Gone means it was already removed - not an error worth logging.
    if (!response.ok && response.status !== 410 && response.status !== 404) {
      console.error('[calendar] event delete failed:', await response.text());
    }
  } catch (error) {
    console.error('[calendar] event delete failed:', error);
  }
}

/** "9:00 am" / "5:00 pm" -> 24-hour {hour, minute}. Discovery call times. */
function parseClockTime(label: string): { hour: number; minute: number } {
  const match = label.match(/^(\d+):(\d+)\s*(am|pm)$/i);
  if (!match) throw new Error(`Unrecognized time: ${label}`);
  const [, hourStr, minuteStr, ampm] = match;
  let hour = Number(hourStr) % 12;
  if (ampm.toLowerCase() === 'pm') hour += 12;
  return { hour, minute: Number(minuteStr) };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** A discovery call's fixed 20-minute slot, as local (no-offset) datetimes
 *  paired with the `timeZone` field above. */
export function discoveryCallWindow(
  callDate: string,
  callTime: string
): { startISO: string; endISO: string } {
  const { hour, minute } = parseClockTime(callTime);
  const endTotal = hour * 60 + minute + 20;
  const endHour = Math.floor(endTotal / 60) % 24;
  const endMinute = endTotal % 60;
  return {
    startISO: `${callDate}T${pad(hour)}:${pad(minute)}:00`,
    endISO: `${callDate}T${pad(endHour)}:${pad(endMinute)}:00`,
  };
}

/** "8 – 10 am" / "12 – 2 pm" / "6 – 8 pm" -> local start/end datetimes,
 *  for a regular session slot. Both ends of the range share one am/pm. */
export function sessionSlotWindow(
  sessionDate: string,
  sessionTime: string
): { startISO: string; endISO: string } {
  const match = sessionTime.match(/^(\d+)\s*[–-]\s*(\d+)\s*(am|pm)$/i);
  if (!match) throw new Error(`Unrecognized time slot: ${sessionTime}`);
  const [, startStr, endStr, ampm] = match;
  let startHour = Number(startStr) % 12;
  let endHour = Number(endStr) % 12;
  if (ampm.toLowerCase() === 'pm') {
    startHour += 12;
    endHour += 12;
  }
  return {
    startISO: `${sessionDate}T${pad(startHour)}:00:00`,
    endISO: `${sessionDate}T${pad(endHour)}:00:00`,
  };
}
