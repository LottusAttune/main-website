'use client';

import { money } from '@/lib/site';
import { formatStudioDate, type Client } from '@/lib/pipeline';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const COLUMNS = [
  { header: 'Client', value: (c: Client) => c.name },
  { header: 'Email', value: (c: Client) => c.email },
  { header: 'Phone', value: (c: Client) => c.phone ?? '' },
  { header: 'Company', value: (c: Client) => c.company ?? '' },
  { header: 'Sessions', value: (c: Client) => c.sessions },
  { header: 'Total participants', value: (c: Client) => c.totalParticipants },
  {
    header: 'Team-building add-on',
    value: (c: Client) => (c.teamAddon ? 'Yes' : 'No'),
  },
  { header: 'Lifetime value', value: (c: Client) => c.lifetimeValue },
  { header: 'Last session', value: (c: Client) => c.lastSession ?? '' },
];

export function Clients({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        No clients yet. Anyone whose booking reaches “Booked” appears here.
      </div>
    );
  }

  return (
    <>
      <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
        <ExportButton filename="lotus-clients" rows={clients} columns={COLUMNS} />
      </div>
      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Client</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Sessions</th>
            <th>Total participants</th>
            <th>Add-on</th>
            <th>Lifetime value</th>
            <th>Last session</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.email}>
              <td>{client.name}</td>
              <td>
                <a href={`mailto:${client.email}`}>{client.email}</a>
                {client.phone ? <div className={styles.priceNote}>{client.phone}</div> : null}
              </td>
              <td>{client.company ?? '—'}</td>
              <td>{client.sessions}</td>
              <td>{client.totalParticipants}</td>
              <td>
                {client.teamAddon ? (
                  <span className={`${styles.pill} ${styles.pillSuccess}`}>
                    Team-building
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className={styles.numeric}>{money(client.lifetimeValue)}</td>
              <td>{formatStudioDate(client.lastSession)}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}
