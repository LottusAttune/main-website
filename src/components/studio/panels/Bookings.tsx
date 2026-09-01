'use client';

import { money } from '@/lib/site';
import { formatStudioDate, type BookingRow } from '@/lib/pipeline';
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
    <>
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
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{formatStudioDate(booking.sessionDate)}</td>
              <td>
                <div>{booking.sessionTime ?? '—'}</div>
                {booking.sessionTime2 ? (
                  <div className={styles.priceNote}>
                    + {booking.sessionTime2}
                  </div>
                ) : null}
              </td>
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
                  {booking.status === 'complete' ? 'Complete' : 'Booked'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}
