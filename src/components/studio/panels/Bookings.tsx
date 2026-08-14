'use client';

import { money } from '@/lib/site';
import type { BookingRow } from '@/lib/pipeline';
import styles from '../studio.module.css';

function statusPill(status: string): string {
  if (status === 'complete') return styles.pillSuccess;
  if (status === 'booked') return styles.pillPending;
  return styles.pillNeutral;
}

export function Bookings({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return (
      <div className={styles.empty}>
        No confirmed bookings yet. Move a lead to “Booked” and it appears here.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date &amp; time</th>
            <th>Client</th>
            <th>Format</th>
            <th>Venue</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>
                {booking.sessionDate ?? '—'}
                {booking.sessionTime ? ` · ${booking.sessionTime}` : ''}
              </td>
              <td>{booking.name}</td>
              <td>
                {booking.type} ·{' '}
                {booking.participants === 1
                  ? 'One-on-one'
                  : `${booking.participants} participants`}
              </td>
              <td>{booking.venue}</td>
              <td className={styles.numeric}>{money(booking.total)}</td>
              <td>
                <span className={`${styles.pill} ${statusPill(booking.status)}`}>
                  {booking.status === 'complete' ? 'Complete' : 'Booked'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
