'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Posts a mutation to /api/studio and refreshes the server data.
 *
 * Errors surface to the caller rather than being swallowed — a change that did
 * not save must never look like one that did.
 */
export function useStudioAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  /** Like `run`, but hands back the response body (an id, a number, a link). */
  const runJson = useCallback(
    async (payload: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      setPending(true);
      setError('');
      try {
        const response = await fetch('/api/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!response.ok) {
          throw new Error((body?.error as string | undefined) ?? 'That change did not save.');
        }
        router.refresh();
        return body ?? {};
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        return null;
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  const run = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => (await runJson(payload)) !== null,
    [runJson]
  );

  return { run, runJson, pending, error };
}
