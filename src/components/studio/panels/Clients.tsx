'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { money } from '@/lib/site';
import {
  ACTIVITY_LABELS,
  STAGES,
  balanceDue,
  formatShortDate,
  formatStudioDate,
  type ActivityEntry,
  type Client,
  type DiscoveryCallRow,
  type DocumentRow,
  type GiftCard,
  type Lead,
  type PaymentRow,
} from '@/lib/pipeline';
import { DocumentStatusPill } from '../DocumentActions';
import { ExportButton } from '../ExportButton';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';

type Props = {
  clients: Client[];
  leads: Lead[];
  documents: DocumentRow[];
  payments: PaymentRow[];
  giftCards: GiftCard[];
  discoveryCalls: DiscoveryCallRow[];
  activity: ActivityEntry[];
  /** Jump to the Leads tab with that booking's drawer open. */
  onOpenLead: (id: string) => void;
};

const STAGE_LABEL: Record<string, string> = {
  ...Object.fromEntries(STAGES.map((s) => [s.key, s.label])),
  cancelled: 'Cancelled',
};

const COLUMNS = [
  { header: 'Client', value: (c: Client) => c.name },
  { header: 'Email', value: (c: Client) => c.email },
  { header: 'Phone', value: (c: Client) => c.phone ?? '' },
  { header: 'Company', value: (c: Client) => c.company ?? '' },
  { header: 'Sessions', value: (c: Client) => c.sessions },
  { header: 'Requests', value: (c: Client) => c.requests },
  { header: 'Total participants', value: (c: Client) => c.totalParticipants },
  { header: 'Team-building add-on', value: (c: Client) => (c.teamAddon ? 'Yes' : 'No') },
  { header: 'Lifetime value', value: (c: Client) => c.lifetimeValue },
  { header: 'Paid', value: (c: Client) => c.paidValue },
  { header: 'Outstanding', value: (c: Client) => c.outstanding },
  { header: 'Last session', value: (c: Client) => c.lastSession ?? '' },
  { header: 'Next session', value: (c: Client) => c.nextSession ?? '' },
  { header: 'First seen', value: (c: Client) => c.firstSeen.slice(0, 10) },
  { header: 'Gift cards bought', value: (c: Client) => c.giftCardsBought },
  { header: 'Discovery calls', value: (c: Client) => c.discoveryCalls },
];

function matches(client: Client, query: string): boolean {
  if (!query) return true;
  const haystack = [client.name, client.email, client.company ?? '', client.phone ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function RepeatPill() {
  return <span className={`${styles.pill} ${styles.pillSuccess}`}>Repeat</span>;
}

function kindOf(client: Client): string {
  if (client.sessions > 0) return client.sessions > 1 ? 'Repeat client' : 'Client';
  if (client.requests > 0) return 'Enquiry';
  if (client.giftCardsBought > 0) return 'Gift buyer';
  return 'Discovery call';
}

/** Everything known about one person, with their whole history. */
function ClientCard({
  client,
  leads,
  documents,
  payments,
  giftCards,
  discoveryCalls,
  activity,
  onOpenLead,
  onClose,
}: Omit<Props, 'clients'> & { client: Client; onClose: () => void }) {
  const { run, pending, error } = useStudioAction();
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const key = client.key;
  const theirLeads = leads
    .filter((l) => l.email.trim().toLowerCase() === key)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const leadIds = new Set(theirLeads.map((l) => l.id));
  const theirGifts = giftCards.filter(
    (g) => g.buyerEmail.trim().toLowerCase() === key || g.recipientEmail?.trim().toLowerCase() === key
  );
  const giftIds = new Set(theirGifts.map((g) => g.id));
  const theirDocs = documents
    .filter((d) => d.clientEmail.trim().toLowerCase() === key || (d.bookingId && leadIds.has(d.bookingId)) || (d.giftId && giftIds.has(d.giftId)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const docIds = new Set(theirDocs.map((d) => d.id));
  const theirPayments = payments
    .filter((p) => (p.documentId && docIds.has(p.documentId)) || (p.bookingId && leadIds.has(p.bookingId)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const theirCalls = discoveryCalls
    .filter((c) => c.email.trim().toLowerCase() === key)
    .sort((a, b) => (a.callDate < b.callDate ? 1 : -1));
  const history = activity
    .filter(
      (a) =>
        a.clientEmail === key ||
        (a.bookingId && leadIds.has(a.bookingId)) ||
        (a.giftId && giftIds.has(a.giftId))
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const leadName = (id: string | null) => (id ? theirLeads.find((l) => l.id === id) : null);

  const addNote = async () => {
    if (!note.trim()) return;
    const ok = await run({ action: 'addClientNote', email: client.email, body: note.trim() });
    if (ok) setNote('');
  };

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`${client.name} client card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{client.name}</div>
            <div className={styles.modalSubtitle}>
              {kindOf(client)} · since {formatShortDate(client.firstSeen.slice(0, 10))}
            </div>
          </div>
          <button type="button" className={styles.modalClose} aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {error ? <div className={styles.notice}>{error}</div> : null}

          <div className={styles.subhead}><span>Contact</span></div>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>Email</span>
            <span className={styles.kvValue}><a href={`mailto:${client.email}`}>{client.email}</a></span>
            <span className={styles.kvLabel}>Phone</span>
            <span className={styles.kvValue}>{client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : '—'}</span>
            <span className={styles.kvLabel}>Company</span>
            <span className={styles.kvValue}>{client.company ?? '—'}</span>
            <span className={styles.kvLabel}>Card on file</span>
            <span className={styles.kvValue}>{client.cardOnFile ? 'Yes' : 'No'}</span>
            <span className={styles.kvLabel}>Terms accepted</span>
            <span className={styles.kvValue}>{client.termsAcceptedAt ? formatShortDate(client.termsAcceptedAt.slice(0, 10)) : '—'}</span>
          </div>
          <p className={styles.priceNote} style={{ marginTop: 8 }}>
            To change their details, open one of their bookings below and press Edit.
          </p>

          <div className={styles.subhead}><span>At a glance</span></div>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>Sessions</span>
            <span className={styles.kvValue}>
              {client.sessions} booked · {client.requests} {client.requests === 1 ? 'request' : 'requests'} in total
              {client.sessions > 1 ? <> {' '}<RepeatPill /></> : null}
            </span>
            <span className={styles.kvLabel}>Participants</span>
            <span className={styles.kvValue}>{client.totalParticipants} across all sessions</span>
            <span className={styles.kvLabel}>Lifetime value</span>
            <span className={`${styles.kvValue} ${styles.numeric}`}>{money(client.lifetimeValue)}</span>
            <span className={styles.kvLabel}>Paid</span>
            <span className={`${styles.kvValue} ${styles.numeric}`}>{money(client.paidValue)}</span>
            <span className={styles.kvLabel}>Outstanding</span>
            <span className={`${styles.kvValue} ${styles.numeric}`} style={client.outstanding > 0 ? { color: 'var(--status-alert)' } : undefined}>
              {money(client.outstanding)}
            </span>
            <span className={styles.kvLabel}>Next session</span>
            <span className={styles.kvValue}>{client.nextSession ? formatStudioDate(client.nextSession) : '—'}</span>
            <span className={styles.kvLabel}>Last session</span>
            <span className={styles.kvValue}>{client.lastSession ? formatStudioDate(client.lastSession) : '—'}</span>
            {client.teamAddon ? (
              <>
                <span className={styles.kvLabel}>Add-ons</span>
                <span className={styles.kvValue}>Has booked the team-building add-on</span>
              </>
            ) : null}
          </div>

          <div className={styles.subhead}><span>Bookings ({theirLeads.length})</span></div>
          {theirLeads.length === 0 ? (
            <p className={styles.priceNote}>No booking requests yet.</p>
          ) : (
            <div className={styles.cardList}>
              {theirLeads.map((lead) => {
                const invoice = theirDocs.find((d) => d.bookingId === lead.id && d.kind === 'invoice' && d.status !== 'void') ?? null;
                return (
                  <div key={lead.id} className={styles.docCard}>
                    <div className={styles.recordHead}>
                      <div>
                        <div className={styles.recordTitle}>
                          {lead.sessionDate ? formatStudioDate(lead.sessionDate) : 'No date'}
                          {lead.sessionTime ? ` · ${lead.sessionTime}` : ''}
                        </div>
                        <div className={styles.recordSub}>
                          {lead.participants === 1 ? 'Private session' : `${lead.participants} participants`} · {lead.venue}
                          {lead.teamAddon ? ' · Team-building' : ''}
                          {lead.refreshments ? ' · Refreshments' : ''}
                        </div>
                      </div>
                      <div className={styles.recordValue}>{money(lead.total)}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <span className={`${styles.pill} ${lead.status === 'cancelled' ? styles.pillAlert : lead.status === 'booked' || lead.status === 'complete' ? styles.pillSuccess : ''}`}>
                        {STAGE_LABEL[lead.status] ?? lead.status}
                      </span>
                      {invoice ? (
                        <>
                          <span className={styles.priceNote}>{invoice.number}</span>
                          <DocumentStatusPill doc={invoice} />
                          {invoice.paidAmount > 0 && balanceDue(invoice) > 0 ? (
                            <span className={styles.priceNote}>{money(invoice.paidAmount)} paid · {money(balanceDue(invoice))} due</span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      <button type="button" className={`btn btn--outline ${styles.smallBtn}`} onClick={() => onOpenLead(lead.id)}>
                        Open booking
                      </button>
                      {lead.portalUrl ? (
                        <a className={`btn btn--outline ${styles.smallBtn}`} href={lead.portalUrl} target="_blank" rel="noopener">
                          Their booking page
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.subhead}><span>Invoices &amp; payments</span></div>
          {theirDocs.length === 0 && theirPayments.length === 0 ? (
            <p className={styles.priceNote}>Nothing invoiced yet.</p>
          ) : (
            <div className={styles.kv}>
              {theirDocs.map((doc) => (
                <span key={doc.id} style={{ display: 'contents' }}>
                  <span className={styles.kvLabel}>{formatShortDate(doc.issuedOn)}</span>
                  <span className={styles.kvValue}>
                    {doc.kind === 'proposal' ? 'Proposal' : doc.kind === 'invoice' ? 'Invoice' : 'Certificate'} {doc.number} · {money(doc.total)}{' '}
                    <DocumentStatusPill doc={doc} />
                  </span>
                </span>
              ))}
              {theirPayments.map((p) => (
                <span key={p.id} style={{ display: 'contents' }}>
                  <span className={styles.kvLabel}>{formatShortDate(p.createdAt.slice(0, 10))}</span>
                  <span className={styles.kvValue}>
                    {p.kind === 'refund' ? 'Refund' : p.kind === 'cancellation_fee' ? 'Cancellation fee' : p.kind === 'deposit' ? 'Deposit' : p.kind === 'balance' ? 'Balance' : 'Payment'}{' '}
                    <span className={styles.numeric}>{money(p.amount)}</span> by {p.method}
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                </span>
              ))}
            </div>
          )}

          {theirGifts.length ? (
            <>
              <div className={styles.subhead}><span>Gift cards</span></div>
              <div className={styles.kv}>
                {theirGifts.map((g) => (
                  <span key={g.id} style={{ display: 'contents' }}>
                    <span className={styles.kvLabel}>{formatShortDate(g.createdAt.slice(0, 10))}</span>
                    <span className={styles.kvValue}>
                      {g.buyerEmail.trim().toLowerCase() === key ? `Bought for ${g.recipientName}` : `Received from ${g.buyerName ?? g.buyerEmail}`} · {money(g.total)} · {g.status}
                      {g.code ? ` · ${g.code}` : ''}
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {theirCalls.length ? (
            <>
              <div className={styles.subhead}><span>Discovery calls</span></div>
              <div className={styles.kv}>
                {theirCalls.map((c) => (
                  <span key={c.id} style={{ display: 'contents' }}>
                    <span className={styles.kvLabel}>{formatShortDate(c.callDate)}</span>
                    <span className={styles.kvValue}>
                      {c.callTime} · {c.status}
                      {c.message ? ` · ${c.message}` : ''}
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : null}

          <div className={styles.subhead}><span>Notes &amp; history</span></div>
          <textarea
            className={styles.textarea}
            placeholder="A note about this client - preferences, how you met, what to remember…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="New client note"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0 14px' }}>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={pending || !note.trim()}
              onClick={() => void addNote()}
            >
              Add note
            </button>
          </div>
          {history.length === 0 ? (
            <p className={styles.priceNote}>No history yet.</p>
          ) : (
            <div className={styles.timeline}>
              {history.map((entry) => {
                const lead = leadName(entry.bookingId);
                const where = lead?.sessionDate ? ` (${formatShortDate(lead.sessionDate)})` : '';
                return (
                  <div key={entry.id} className={styles.timelineItem}>
                    <span className={styles.timelineWhen}>{formatShortDate(entry.createdAt.slice(0, 10))}</span>
                    {entry.kind === 'note' ? (
                      <span className={`${styles.timelineBody} ${styles.timelineNote}`}>
                        {entry.body}
                        {where ? <span className={styles.priceNote}>{where}</span> : null}
                      </span>
                    ) : (
                      <span className={styles.timelineBody}>
                        <strong>{ACTIVITY_LABELS[entry.kind] ?? entry.kind.replace(/_/g, ' ')}</strong>
                        {entry.body ? ` — ${entry.body}` : ''}
                        {where}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Clients({ clients, leads, documents, payments, giftCards, discoveryCalls, activity, onOpenLead }: Props) {
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        No contacts yet. Anyone who sends a booking request, buys a gift card or books a discovery call appears here.
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const visible = clients.filter((c) => matches(c, query));
  const open = clients.find((c) => c.key === openKey) ?? null;

  const openCard = (c: Client) => setOpenKey(c.key);
  const onKey = (e: React.KeyboardEvent, c: Client) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCard(c);
    }
  };

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="search"
          className="field"
          placeholder="Search name, email, phone or company"
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
                  <th>Lifetime value</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Next</th>
                  <th>Last</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => (
                  <tr
                    key={client.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${client.name}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openCard(client)}
                    onKeyDown={(e) => onKey(e, client)}
                  >
                    <td>
                      <div>{client.name}</div>
                      <div className={styles.priceNote}>{kindOf(client)}</div>
                      {client.sessions > 1 ? (
                        <div style={{ marginTop: 6 }}>
                          <RepeatPill />
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>{client.email}</a>
                      {client.phone ? <div className={styles.priceNote}>{client.phone}</div> : null}
                    </td>
                    <td>{client.company ?? '—'}</td>
                    <td>
                      {client.sessions}
                      {client.requests > client.sessions ? <div className={styles.priceNote}>{client.requests} requests</div> : null}
                    </td>
                    <td className={styles.numeric}>{money(client.lifetimeValue)}</td>
                    <td className={styles.numeric}>{money(client.paidValue)}</td>
                    <td className={styles.numeric} style={client.outstanding > 0 ? { color: 'var(--status-alert)' } : undefined}>
                      {client.outstanding > 0 ? money(client.outstanding) : '—'}
                    </td>
                    <td>{client.nextSession ? formatStudioDate(client.nextSession) : '—'}</td>
                    <td>{client.lastSession ? formatStudioDate(client.lastSession) : '—'}</td>
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
              <div
                key={client.key}
                className={styles.recordCard}
                role="button"
                tabIndex={0}
                aria-label={`Open ${client.name}`}
                style={{ cursor: 'pointer' }}
                onClick={() => openCard(client)}
                onKeyDown={(e) => onKey(e, client)}
              >
                <div className={styles.recordHead}>
                  <div>
                    <div className={styles.recordTitle}>
                      {client.name}
                      {client.sessions > 1 ? <> {' '}<RepeatPill /></> : null}
                    </div>
                    <div className={styles.recordSub}>{client.company ?? kindOf(client)}</div>
                  </div>
                  <div className={styles.recordValue}>{money(client.lifetimeValue)}</div>
                </div>

                <div className={styles.kv}>
                  <div className={styles.kvLabel}>Contact</div>
                  <div className={styles.kvValue}>
                    <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>{client.email}</a>
                    {client.phone ? (
                      <div>
                        <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()}>{client.phone}</a>
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.kvLabel}>Sessions</div>
                  <div className={styles.kvValue}>
                    {client.sessions} booked · {client.requests} {client.requests === 1 ? 'request' : 'requests'}
                  </div>
                  <div className={styles.kvLabel}>Paid</div>
                  <div className={styles.kvValue}>
                    {money(client.paidValue)}
                    {client.outstanding > 0 ? ` · ${money(client.outstanding)} outstanding` : ''}
                  </div>
                  <div className={styles.kvLabel}>{client.nextSession ? 'Next session' : 'Last session'}</div>
                  <div className={styles.kvValue}>
                    {client.nextSession ? formatStudioDate(client.nextSession) : client.lastSession ? formatStudioDate(client.lastSession) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {open ? (
        <ClientCard
          client={open}
          leads={leads}
          documents={documents}
          payments={payments}
          giftCards={giftCards}
          discoveryCalls={discoveryCalls}
          activity={activity}
          onOpenLead={(id) => {
            setOpenKey(null);
            onOpenLead(id);
          }}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </>
  );
}
