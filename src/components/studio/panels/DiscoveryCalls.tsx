'use client';

import type { DiscoveryCallRow } from '@/lib/pipeline';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const COLUMNS = [
  { header: 'Date', value: (c: DiscoveryCallRow) => c.callDate },
  { header: 'Time', value: (c: DiscoveryCallRow) => c.callTime },
  { header: 'Name', value: (c: DiscoveryCallRow) => c.name },
  { header: 'Email', value: (c: DiscoveryCallRow) => c.email },
  { header: 'Phone', value: (c: DiscoveryCallRow) => c.phone ?? '' },
  { header: 'Message', value: (c: DiscoveryCallRow) => c.message ?? '' },
  { header: 'Status', value: (c: DiscoveryCallRow) => c.status },
];

export function DiscoveryCalls({ calls }: { calls: DiscoveryCallRow[] }) {
  if (calls.length === 0) {
    return (
      <div className={styles.empty}>
        No discovery calls booked yet. They arrive here from the Discovery
        Call page, with a confirmation email sent automatically.
      </div>
    );
  }

  return (
    <>
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
              <th>Date &amp; time</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td>
                  {call.callDate} &middot; {call.callTime}
                </td>
                <td>{call.name}</td>
                <td>
                  <a href={`mailto:${call.email}`}>{call.email}</a>
                </td>
                <td>{call.phone ?? '—'}</td>
                <td>{call.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
