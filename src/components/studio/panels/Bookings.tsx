'use client';

import { useState } from 'react';

import { money, TIME_SLOTS } from '@/lib/site';
import { formatStudioDate, type BookingRow } from '@/lib/pipeline';
import { RowActionsMenu } from '../RowActionsMenu';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const COLUMNS = [
  { header: 'Date', value: (b: BookingRow) => b.sessionDate ?? '' },
  { header: 'Time', value: (b: BookingRow) => b.sessionTime ?? '' },
  { header: 'Second time', value: (b: BookingRow) => b.sessionTime2 ?? '' },
  { header: 'Client', value: (b: BookingRow) => b.name },
  { header: 'Email', value: (b: BookingRow) => b.email },
  { header: 'Phone', value: (b: BookingRow) => b.phone ?? '' },
  { header: 'Company', value: (b: BookingRow) => b.company ?? '' },
  { header: 'Type', value: (b: BookingRow) => b.type },
  { header: 'Participants', value: (b: BookingRow) => b.participants },
  {
    header: 'Team-building add-on',
    value: (b: BookingRow) => (b.teamAddon ? 'Yes' : 'No'),
  },
  { header: 'Venue', value: (b: BookingRow) => b.venue },
  { header: 'Value', value: (b: BookingRow) => b.total },
  { header: 'Status', value: (b: BookingRow) => b.status },
];

function statusPill(status: string): string {
  if (status === 'complete') return styles.pillSuccess;
  if (status === 'booked') return styles.pillPending;
  if (status === 'cancelled') return styles.pillAlert;
  return styles.pillNeutral;
}

function statusLabel(status: string): string {
  if (status === 'complete') return 'Complete';
  if (status === 'cancelled') return 'Cancelled';
  return 'Booked';
}

export function Bookings({ bookings }: { bookings: BookingRow[] }) {
  const { run, error } = useStudioAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDate2, setEditDate2] = useState('');
  const [editTime2, setEditTime2] = useState('');

  if (bookings.length === 0) {
    return (
      <div className={styles.empty}>
        No confirmed bookings yet. Move a lead to “Booked” and it appears here.
      </div>
    );
  }

  const startEdit = (booking: BookingRow) => {
    setEditingId(booking.id);
    setEditDate(booking.sessionDate ?? '');
    setEditTime(booking.sessionTime ?? '');
    setEditDate2(booking.sessionDate2 ?? '');
    setEditTime2(booking.sessionTime2 ?? '');
  };

  const saveEdit = async (id: string) => {
    const ok = await run({
      action: 'editBooking',
      id,
      sessionDate: editDate,
      sessionTime: editTime,
      sessionDate2: editDate2 || null,
      sessionTime2: editTime2 || null,
    });
    if (ok) setEditingId(null);
  };

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
        <ExportButton filename="lotus-bookings" rows={bookings} columns={COLUMNS} />
      </div>
      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Client</th>
            <th>Company</th>
            <th>Format</th>
            <th>Add-on</th>
            <th>Venue</th>
            <th>Value</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const cancelled = booking.status === 'cancelled';
            const isEditing = editingId === booking.id;
            const hasSecondSession = Boolean(booking.sessionDate2);

            return (
              <tr key={booking.id}>
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
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot.key} value={slot.label}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {hasSecondSession ? (
                      <div className={styles.editRow} style={{ marginTop: 8 }}>
                        <input
                          type="date"
                          className={`field ${styles.editInput}`}
                          value={editDate2}
                          onChange={(e) => setEditDate2(e.target.value)}
                        />
                        <select
                          className={`field ${styles.editInput}`}
                          value={editTime2}
                          onChange={(e) => setEditTime2(e.target.value)}
                        >
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot.key} value={slot.label}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </td>
                ) : (
                  <>
                    <td>{formatStudioDate(booking.sessionDate)}</td>
                    <td>
                      <div>{booking.sessionTime ?? '—'}</div>
                      {booking.sessionTime2 ? (
                        <div className={styles.priceNote}>
                          + {booking.sessionTime2}
                        </div>
                      ) : null}
                    </td>
                  </>
                )}
                <td>{booking.name}</td>
                <td>{booking.company ?? '—'}</td>
                <td>
                  {booking.type} ·{' '}
                  {booking.participants === 1
                    ? 'One-on-one'
                    : `${booking.participants} participants`}
                </td>
                <td>
                  {booking.teamAddon ? (
                    <span className={`${styles.pill} ${styles.pillSuccess}`}>
                      Team-building
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{booking.venue}</td>
                <td className={styles.numeric}>{money(booking.total)}</td>
                <td>
                  <span className={`${styles.pill} ${statusPill(booking.status)}`}>
                    {statusLabel(booking.status)}
                  </span>
                </td>
                <td>
                  {isEditing ? (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`btn btn--outline ${styles.smallBtn}`}
                        onClick={() => void saveEdit(booking.id)}
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
                    <RowActionsMenu
                      items={[
                        { label: 'Edit', onClick: () => startEdit(booking) },
                        {
                          label: cancelled ? 'Restore' : 'Cancel',
                          onClick: () =>
                            void run({
                              action: 'cancelBooking',
                              id: booking.id,
                              cancelled: !cancelled,
                            }),
                        },
                        {
                          label: 'Delete',
                          alert: true,
                          onClick: () => {
                            if (
                              window.confirm(
                                `Delete the booking for ${booking.name} permanently? This cannot be undone.`
                              )
                            ) {
                              void run({ action: 'deleteBooking', id: booking.id });
                            }
                          },
                        },
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
    </>
  );
}
