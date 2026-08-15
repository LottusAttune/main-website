'use client';

import { money } from '@/lib/site';
import type { Client } from '@/lib/pipeline';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const COLUMNS = [
  { header: 'Client', value: (c: Client) => c.name },
  { header: 'Email', value: (c: Client) => c.email },
  { header: 'Sessions', value: (c: Client) => c.sessions },
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
            <th>Sessions</th>
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
              </td>
              <td>{client.sessions}</td>
              <td className={styles.numeric}>{money(client.lifetimeValue)}</td>
              <td>{client.lastSession ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}
