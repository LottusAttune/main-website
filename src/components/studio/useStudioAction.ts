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

  const run = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      setPending(true);
      setError('');
      try {
        const response = await fetch('/api/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? 'That change did not save.');
        }
        router.refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        return false;
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  return { run, pending, error };
}
