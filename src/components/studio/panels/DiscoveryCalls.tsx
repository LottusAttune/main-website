'use client';

import { useEffect, useRef, useState } from 'react';

import { formatStudioDate, type DiscoveryCallRow } from '@/lib/pipeline';
import { DISCOVERY_CALL_TIMES } from '@/lib/site';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

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

export function DiscoveryCalls({ calls }: { calls: DiscoveryCallRow[] }) {
  const { run, error } = useStudioAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpenId]);

  if (calls.length === 0) {
    return (
      <div className={styles.empty}>
        No discovery calls booked yet. They arrive here from the Discovery
        Call page, with a confirmation email sent automatically.
      </div>
    );
  }

  const startEdit = (call: DiscoveryCallRow) => {
    setMenuOpenId(null);
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

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
        <ExportButton
          filename="lotus-discovery-calls"
          rows={calls}
          columns={COLUMNS}
        />
      </div>
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
            {calls.map((call) => {
              const cancelled = call.status === 'cancelled';
              const isEditing = editingId === call.id;
              const isMenuOpen = menuOpenId === call.id;

              return (
                <tr key={call.id}>
                  {isEditing ? (
                    <td colSpan={2}>
                      <div className={styles.editRow}>
                        <input
                          type="date"
                          className={`field ${styles.editInput}`}
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        <select
                          className={`field ${styles.editInput}`}
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
                    </td>
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
                  <td>
                    <span
                      className={`${styles.pill} ${cancelled ? styles.pillAlert : styles.pillSuccess}`}
                    >
                      {cancelled ? 'Cancelled' : 'Booked'}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          onClick={() => void saveEdit(call.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        className={styles.menuWrap}
                        ref={isMenuOpen ? menuRef : undefined}
                      >
                        <button
                          type="button"
                          className={styles.menuTrigger}
                          aria-label="Row actions"
                          aria-expanded={isMenuOpen}
                          onClick={() =>
                            setMenuOpenId(isMenuOpen ? null : call.id)
                          }
                        >
                          ⋮
                        </button>
                        {isMenuOpen ? (
                          <div className={styles.menu} role="menu">
                            <button
                              type="button"
                              className={styles.menuItem}
                              role="menuitem"
                              onClick={() => startEdit(call)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.menuItem}
                              role="menuitem"
                              onClick={() => {
                                setMenuOpenId(null);
                                void run({
                                  action: 'cancelDiscoveryCall',
                                  id: call.id,
                                  cancelled: !cancelled,
                                });
                              }}
                            >
                              {cancelled ? 'Restore' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              className={`${styles.menuItem} ${styles.menuItemAlert}`}
                              role="menuitem"
                              onClick={() => {
                                setMenuOpenId(null);
                                if (
                                  window.confirm(
                                    `Delete the discovery call with ${call.name} permanently? This cannot be undone.`
                                  )
                                ) {
                                  void run({
                                    action: 'deleteDiscoveryCall',
                                    id: call.id,
                                  });
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
