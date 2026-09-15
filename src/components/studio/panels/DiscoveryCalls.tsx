'use client';

import { useMemo, useState } from 'react';

import { formatStudioDate, relativeDays, type DiscoveryCallRow } from '@/lib/pipeline';
import { DISCOVERY_CALL_TIMES } from '@/lib/site';
import { RowActionsMenu } from '../RowActionsMenu';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

type Filter = 'upcoming' | 'past' | 'cancelled' | 'all';
type Bucket = Exclude<Filter, 'all'>;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const COLUMNS = [
  { header: 'Date', value: (c: DiscoveryCallRow) => c.callDate },
  { header: 'Time', value: (c: DiscoveryCallRow) => c.callTime },
  { header: 'Name', value: (c: DiscoveryCallRow) => c.name },
  { header: 'Email', value: (c: DiscoveryCallRow) => c.email },
  { header: 'Phone', value: (c: DiscoveryCallRow) => c.phone ?? '' },
  { header: 'Company', value: (c: DiscoveryCallRow) => c.company ?? '' },
  { header: 'Message', value: (c: DiscoveryCallRow) => c.message ?? '' },
  { header: 'Status', value: (c: DiscoveryCallRow) => c.status },
];

/* The shared .smallBtn / .segment sit at 36-38px; phones want a 40px thumb. */
const TAP = { minHeight: 40 } as const;

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "9:00 am" → 9, "1:00 pm" → 13 - to sort a day's calls in clock order. */
function clockKey(time: string): string {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?/.exec(time);
  let hour = match ? Number(match[1]) : 12;
  const minute = match?.[2] ?? '00';
  if (/pm\s*$/i.test(time) && hour < 12) hour += 12;
  if (/am\s*$/i.test(time) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function bucketOf(call: DiscoveryCallRow, today: string): Bucket {
  if (call.status === 'cancelled') return 'cancelled';
  if (call.callDate < today) return 'past';
  return 'upcoming';
}

const BUCKET_RANK: Record<Bucket, number> = { upcoming: 0, past: 1, cancelled: 2 };

/** Upcoming soonest first, then past most-recent first, cancelled last. */
function sortCalls(calls: DiscoveryCallRow[], today: string): DiscoveryCallRow[] {
  const key = (c: DiscoveryCallRow) => `${c.callDate} ${clockKey(c.callTime)}`;
  return [...calls].sort((a, b) => {
    const ba = bucketOf(a, today);
    const bb = bucketOf(b, today);
    if (ba !== bb) return BUCKET_RANK[ba] - BUCKET_RANK[bb];
    return ba === 'upcoming'
      ? key(a).localeCompare(key(b))
      : key(b).localeCompare(key(a));
  });
}

export function DiscoveryCalls({ calls }: { calls: DiscoveryCallRow[] }) {
  const { run, pending, error } = useStudioAction();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const now = new Date();
  const today = toIso(now);
  const sorted = useMemo(() => sortCalls(calls, today), [calls, today]);
  const visible =
    filter === 'all' ? sorted : sorted.filter((c) => bucketOf(c, today) === filter);

  if (calls.length === 0) {
    return (
      <div className={styles.empty}>
        No discovery calls booked yet. They arrive here from the Discovery
        Call page, with a confirmation email sent automatically.
      </div>
    );
  }

  const startEdit = (call: DiscoveryCallRow) => {
    setEditingId(call.id);
    setEditDate(call.callDate);
    setEditTime(call.callTime);
  };

  const saveEdit = async (id: string) => {
    const ok = await run({
      action: 'editDiscoveryCall',
      id,
      callDate: editDate,
      callTime: editTime,
    });
    if (ok) setEditingId(null);
  };

  const cancelCall = (call: DiscoveryCallRow, cancelled: boolean) =>
    void run({ action: 'cancelDiscoveryCall', id: call.id, cancelled });

  const deleteCall = (call: DiscoveryCallRow) => {
    if (
      window.confirm(
        `Delete the discovery call with ${call.name} permanently? This cannot be undone.`
      )
    ) {
      void run({ action: 'deleteDiscoveryCall', id: call.id });
    }
  };

  const renderEditor = (compact: boolean) => {
    const fieldClass = `field ${styles.editInput}`;
    const fieldStyle = compact
      ? { flex: '1 1 140px', minWidth: 0, minHeight: 44, fontSize: 16 }
      : undefined;
    return (
      <div className={styles.editRow}>
        <input
          type="date"
          aria-label="Call date"
          className={fieldClass}
          style={fieldStyle}
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
        />
        <select
          aria-label="Call time"
          className={fieldClass}
          style={fieldStyle}
          value={editTime}
          onChange={(e) => setEditTime(e.target.value)}
        >
          {DISCOVERY_CALL_TIMES.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const editButtons = (id: string) => (
    <>
      <button
        type="button"
        className={`btn btn--outline ${styles.smallBtn}`}
        style={TAP}
        disabled={pending}
        onClick={() => void saveEdit(id)}
      >
        Save
      </button>
      <button
        type="button"
        className={`btn btn--outline ${styles.smallBtn}`}
        style={TAP}
        disabled={pending}
        onClick={() => setEditingId(null)}
      >
        Cancel
      </button>
    </>
  );

  const statusPill = (cancelled: boolean) => (
    <span className={`${styles.pill} ${cancelled ? styles.pillAlert : styles.pillSuccess}`}>
      {cancelled ? 'Cancelled' : 'Booked'}
    </span>
  );

  const emptyLabel =
    filter === 'all' ? 'No discovery calls.' : `No ${filter} discovery calls.`;

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.toolbar}>
        <div className={styles.segmented} role="group" aria-label="Filter discovery calls">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.segment} ${filter === f.key ? styles.segmentOn : ''}`}
              style={TAP}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ExportButton filename="lotus-discovery-calls" rows={visible} columns={COLUMNS} />
      </div>

      {visible.length === 0 ? <div className={styles.empty}>{emptyLabel}</div> : null}

      {/* ---------- Desktop table ---------- */}
      {visible.length > 0 ? (
        <div className={styles.desktopOnly}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((call) => {
                  const cancelled = call.status === 'cancelled';
                  const isEditing = editingId === call.id;

                  return (
                    <tr key={call.id}>
                      {isEditing ? (
                        <td colSpan={2}>{renderEditor(false)}</td>
                      ) : (
                        <>
                          <td>{formatStudioDate(call.callDate)}</td>
                          <td>{call.callTime}</td>
                        </>
                      )}
                      <td>{call.name}</td>
                      <td>
                        <a href={`mailto:${call.email}`}>{call.email}</a>
                      </td>
                      <td>{call.phone ?? '—'}</td>
                      <td>{call.company ?? '—'}</td>
                      <td>{call.message ?? '—'}</td>
                      <td>{statusPill(cancelled)}</td>
                      <td>
                        {isEditing ? (
                          <div className={styles.rowActions}>{editButtons(call.id)}</div>
                        ) : (
                          <RowActionsMenu
                            items={[
                              { label: 'Edit', onClick: () => startEdit(call) },
                              {
                                label: cancelled ? 'Restore' : 'Cancel',
                                onClick: () => cancelCall(call, !cancelled),
                              },
                              { label: 'Delete', alert: true, onClick: () => deleteCall(call) },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------- Phone / tablet cards ---------- */}
      {visible.length > 0 ? (
        <div className={styles.mobileOnly}>
          <div className={styles.cardList}>
            {visible.map((call) => {
              const cancelled = call.status === 'cancelled';
              const isEditing = editingId === call.id;
              const when = cancelled ? '' : relativeDays(call.callDate, now);

              return (
                <div key={call.id} className={styles.recordCard}>
                  <div className={styles.recordHead}>
                    <div>
                      <div className={styles.recordTitle}>{call.name}</div>
                      <div className={styles.recordSub}>
                        {formatStudioDate(call.callDate)} · {call.callTime}
                        {when ? ` (${when})` : ''}
                      </div>
                    </div>
                    {statusPill(cancelled)}
                  </div>

                  <div className={styles.kv}>
                    <div className={styles.kvLabel}>Contact</div>
                    <div className={styles.kvValue}>
                      <a href={`mailto:${call.email}`}>{call.email}</a>
                      {call.phone ? (
                        <div>
                          <a href={`tel:${call.phone}`}>{call.phone}</a>
                        </div>
                      ) : null}
                    </div>
                    {call.company ? (
                      <>
                        <div className={styles.kvLabel}>Company</div>
                        <div className={styles.kvValue}>{call.company}</div>
                      </>
                    ) : null}
                    <div className={styles.kvLabel}>Message</div>
                    <div className={styles.kvValue}>{call.message ?? '—'}</div>
                  </div>

                  {isEditing ? (
                    <div style={{ marginTop: 12 }}>{renderEditor(true)}</div>
                  ) : null}

                  <div className={styles.recordActions}>
                    {isEditing ? (
                      editButtons(call.id)
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          style={TAP}
                          disabled={pending}
                          onClick={() => startEdit(call)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          style={TAP}
                          disabled={pending}
                          onClick={() => cancelCall(call, !cancelled)}
                        >
                          {cancelled ? 'Restore' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          style={{ ...TAP, color: 'var(--status-alert)' }}
                          disabled={pending}
                          onClick={() => deleteCall(call)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
