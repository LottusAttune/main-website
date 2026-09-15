'use client';

import { useState } from 'react';

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
  { header: 'Paid', value: (c: Client) => c.paidValue },
  { header: 'Last session', value: (c: Client) => c.lastSession ?? '' },
];

function matches(client: Client, query: string): boolean {
  if (!query) return true;
  const haystack = [client.name, client.email, client.company ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function RepeatPill() {
  return <span className={`${styles.pill} ${styles.pillSuccess}`}>Repeat</span>;
}

export function Clients({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('');

  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        No clients yet. Anyone whose booking reaches “Booked” appears here.
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const visible = clients.filter((c) => matches(c, query));

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="search"
          className="field"
          placeholder="Search name, email or company"
          aria-label="Search clients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        <ExportButton filename="lotus-clients" rows={visible} columns={COLUMNS} />
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>No clients match “{search.trim()}”.</div>
      ) : null}

      {/* ---------- Desktop table ---------- */}
      {visible.length > 0 ? (
        <div className={styles.desktopOnly}>
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
                  <th>Paid</th>
                  <th>Last session</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => (
                  <tr key={client.email}>
                    <td>
                      <div>{client.name}</div>
                      {client.sessions > 1 ? (
                        <div style={{ marginTop: 6 }}>
                          <RepeatPill />
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <a href={`mailto:${client.email}`}>{client.email}</a>
                      {client.phone ? (
                        <div className={styles.priceNote}>{client.phone}</div>
                      ) : null}
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
                    <td className={styles.numeric}>{money(client.paidValue)}</td>
                    <td>{formatStudioDate(client.lastSession)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------- Phone / tablet cards ---------- */}
      {visible.length > 0 ? (
        <div className={styles.mobileOnly}>
          <div className={styles.cardList}>
            {visible.map((client) => (
              <div key={client.email} className={styles.recordCard}>
                <div className={styles.recordHead}>
                  <div>
                    <div className={styles.recordTitle}>
                      {client.name}
                      {client.sessions > 1 ? (
                        <>
                          {' '}
                          <RepeatPill />
                        </>
                      ) : null}
                    </div>
                    {client.company ? (
                      <div className={styles.recordSub}>{client.company}</div>
                    ) : null}
                  </div>
                  <div className={styles.recordValue}>{money(client.lifetimeValue)}</div>
                </div>

                <div className={styles.kv}>
                  <div className={styles.kvLabel}>Contact</div>
                  <div className={styles.kvValue}>
                    <a href={`mailto:${client.email}`}>{client.email}</a>
                    {client.phone ? (
                      <div>
                        <a href={`tel:${client.phone}`}>{client.phone}</a>
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.kvLabel}>Sessions</div>
                  <div className={styles.kvValue}>
                    {client.sessions} · {client.totalParticipants} participants in total
                  </div>
                  <div className={styles.kvLabel}>Add-on</div>
                  <div className={styles.kvValue}>
                    {client.teamAddon ? (
                      <span className={`${styles.pill} ${styles.pillSuccess}`}>
                        Team-building
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className={styles.kvLabel}>Lifetime value</div>
                  <div className={styles.kvValue}>{money(client.lifetimeValue)}</div>
                  <div className={styles.kvLabel}>Paid</div>
                  <div className={styles.kvValue}>{money(client.paidValue)}</div>
                  <div className={styles.kvLabel}>Last session</div>
                  <div className={styles.kvValue}>{formatStudioDate(client.lastSession)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
