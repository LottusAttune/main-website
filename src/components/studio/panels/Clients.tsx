'use client';

import { money } from '@/lib/site';
import type { Client } from '@/lib/pipeline';
import styles from '../studio.module.css';

export function Clients({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        No clients yet. Anyone whose booking reaches “Booked” appears here.
      </div>
    );
  }

  return (
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
  );
}
