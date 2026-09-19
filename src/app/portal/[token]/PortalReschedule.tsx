'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TIME_SLOTS, type SlotKey } from '@/lib/site';
import styles from './portal.module.css';

type Props = {
  token: string;
  minDate: string;
};

type Panel = 'closed' | 'reschedule' | 'cancel';

/**
 * Both of these are requests, not automatic changes - nothing on the
 * booking moves until Silvana confirms it herself in Studio. Kept low-key
 * by design (plain text links, not buttons) so it reads as an option that
 * exists, not one being pushed.
 */
export function PortalReschedule({ token, minDate }: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('closed');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<SlotKey>('midday');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitReschedule = async () => {
    if (!date) {
      setError('Please choose a preferred date.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', preferredDate: date, preferredSlot: slot, note: note.trim() || undefined }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? 'Something went wrong.');
        return;
      }
      setMessage('Request sent. Silvana will confirm the new date by email.');
      setPanel('closed');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const submitCancel = async () => {
    if (!window.confirm('Request to cancel your session? Silvana will follow up by email to confirm.')) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: reason.trim() || undefined }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? 'Something went wrong.');
        return;
      }
      setMessage('Cancellation requested. Silvana will follow up by email to confirm.');
      setPanel('closed');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      {panel === 'closed' ? (
        <p className={styles.note}>
          <a href="#" onClick={(e) => { e.preventDefault(); setPanel('reschedule'); setMessage(null); setError(null); }}>
            Request a different date
          </a>
          {' · '}
          <a href="#" onClick={(e) => { e.preventDefault(); setPanel('cancel'); setMessage(null); setError(null); }}>
            Request to cancel
          </a>
        </p>
      ) : null}

      {panel === 'reschedule' ? (
        <div className={styles.addon} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className={styles.addonTitle}>Request a different date</div>
          <p className={styles.addonBlurb}>
            This sends a request to Silvana - your date and invoice stay as they are until she confirms the change.
          </p>
          <label className={styles.rowLabel} style={{ display: 'block', marginBottom: 4 }}>
            Preferred date
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', font: 'inherit' }}
            />
          </label>
          <label className={styles.rowLabel} style={{ display: 'block', marginBottom: 4 }}>
            Preferred time
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as SlotKey)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', font: 'inherit' }}
            >
              {TIME_SLOTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.rowLabel} style={{ display: 'block', marginBottom: 4 }}>
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', font: 'inherit', resize: 'vertical' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn--dark" disabled={pending} onClick={() => void submitReschedule()}>
              {pending ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" className="btn btn--outline" disabled={pending} onClick={() => setPanel('closed')}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'cancel' ? (
        <div className={styles.addon} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className={styles.addonTitle}>Request to cancel</div>
          <p className={styles.addonBlurb}>
            This sends a request to Silvana - your booking stays active until she confirms the cancellation. Our
            cancellation policy above still applies.
          </p>
          <label className={styles.rowLabel} style={{ display: 'block', marginBottom: 4 }}>
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', font: 'inherit', resize: 'vertical' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn--dark" disabled={pending} onClick={() => void submitCancel()}>
              {pending ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" className="btn btn--outline" disabled={pending} onClick={() => setPanel('closed')}>
              Back
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className={styles.addonMessage} role="status">{message}</p> : null}
      {error ? <p className={styles.addonError} role="alert">{error}</p> : null}
    </div>
  );
}
