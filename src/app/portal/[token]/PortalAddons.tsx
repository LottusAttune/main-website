'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { money } from '@/lib/site';
import type { Upsell } from '@/lib/portal';
import styles from './portal.module.css';

type Props = {
  token: string;
  upsells: Upsell[];
  cardOnFile: boolean;
};

/** "Add to your experience": one click puts the add-on on the booking and the invoice. */
export function PortalAddons({ token, upsells, cardOnFile }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (upsell: Upsell) => {
    if (!window.confirm(`Add ${upsell.title} (${money(upsell.price)}) to your booking?`)) return;
    setPending(upsell.key);
    setError(null);
    try {
      const response = await fetch(`/api/portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addon', addon: upsell.key }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; total?: number; balance?: number } | null;
      if (!response.ok) {
        setError(body?.error ?? 'Something went wrong.');
        return;
      }
      setMessage(
        `${upsell.title} added.${typeof body?.balance === 'number' && body.balance > 0 ? ` ${money(body.balance)} is now outstanding${cardOnFile ? ' and will be charged with your balance' : ''}.` : ''}`
      );
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(null);
    }
  };

  if (upsells.length === 0 && !message) return null;

  return (
    <div className={styles.addons}>
      {upsells.map((upsell) => (
        <div key={upsell.key} className={styles.addon}>
          <div>
            <div className={styles.addonTitle}>{upsell.title}</div>
            <p className={styles.addonBlurb}>{upsell.blurb}</p>
            <div className={styles.addonPrice}>
              {money(upsell.price)} <span>{upsell.priceNote}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--outline"
            disabled={pending !== null}
            onClick={() => void add(upsell)}
          >
            {pending === upsell.key ? 'Adding…' : 'Add'}
          </button>
        </div>
      ))}
      {message ? <p className={styles.addonMessage} role="status">{message}</p> : null}
      {error ? <p className={styles.addonError} role="alert">{error}</p> : null}
    </div>
  );
}
