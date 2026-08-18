import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isDatabaseConfigured, sql } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Receives client review notes.
 *
 * This is the only public write endpoint that is not a booking, so it is gated
 * by a shared token carried in the review link. Without REVIEW_TOKEN set, the
 * endpoint refuses everything — it fails closed rather than becoming an open
 * write to the database.
 */
const noteSchema = z.object({
  localId: z.string().max(64),
  path: z.string().max(200),
  selector: z.string().max(500),
  context: z.string().max(300).optional().default(''),
  section: z.string().max(160).optional().default(''),
  xPercent: z.coerce.number().min(-50).max(150),
  yPercent: z.coerce.number().min(-50).max(150),
  viewportW: z.coerce.number().int().min(0).max(10000).optional(),
  note: z.string().trim().min(1).max(2000),
  createdAt: z.string().max(40).optional(),
});

const payloadSchema = z.object({
  token: z.string().max(200),
  // Generous but bounded, so one request cannot dump unlimited rows.
  notes: z.array(noteSchema).min(1).max(50),
  author: z.string().trim().max(120).optional(),
});

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const expected = process.env.REVIEW_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'Review mode is not enabled on this deployment.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid feedback.' }, { status: 400 });
  }

  if (!safeEqual(parsed.data.token, expected)) {
    return NextResponse.json({ error: 'This review link is not valid.' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'Feedback cannot be saved yet because the database is not connected.',
      },
      { status: 503 }
    );
  }

  try {
    for (const note of parsed.data.notes) {
      // Upsert on local_id: re-sending a note edits it rather than duplicating
      // it, which also makes a retried request safe.
      await sql`
        INSERT INTO feedback_notes
          (local_id, path, selector, context, section, x_percent, y_percent, viewport_w, note, author)
        VALUES (
          ${note.localId}, ${note.path}, ${note.selector}, ${note.context ?? ''}, ${note.section ?? ''},
          ${note.xPercent}, ${note.yPercent}, ${note.viewportW ?? null},
          ${note.note}, ${parsed.data.author ?? 'Client'}
        )
        ON CONFLICT (local_id) DO UPDATE SET
          note     = EXCLUDED.note,
          selector = EXCLUDED.selector,
          context  = EXCLUDED.context,
          section  = EXCLUDED.section
      `;
    }
    return NextResponse.json({ saved: parsed.data.notes.length }, { status: 201 });
  } catch (error) {
    console.error('[feedback] insert failed:', error);
    return NextResponse.json({ error: 'We could not save your notes.' }, { status: 500 });
  }
}

const deleteSchema = z.object({
  token: z.string().max(200),
  localId: z.string().max(64),
});

/**
 * Removes a note the client deleted.
 *
 * Deleting only in her browser was the wrong behaviour: she would remove a
 * note, and it would still be sitting in the studio waiting to be actioned.
 */
export async function DELETE(request: Request) {
  const expected = process.env.REVIEW_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'Review mode is not enabled.' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!safeEqual(parsed.data.token, expected)) {
    return NextResponse.json({ error: 'This review link is not valid.' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not connected.' }, { status: 503 });
  }

  try {
    await sql`DELETE FROM feedback_notes WHERE local_id = ${parsed.data.localId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback] delete failed:', error);
    return NextResponse.json({ error: 'Could not remove the note.' }, { status: 500 });
  }
}
