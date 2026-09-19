'use client';

import { Fragment, useState } from 'react';

import type { CsvColumn } from '@/lib/csv';
import {
  balanceDue,
  documentStatusLabel,
  formatShortDate,
  formatStudioDate,
  isOverdue,
  relativeDays,
  type DocumentKind,
  type DocumentRow,
  type Integrations,
  type PaymentRow,
} from '@/lib/pipeline';
import { money } from '@/lib/site';
import { DocumentCard, DocumentStatusPill } from '../DocumentActions';
import { ExportButton } from '../ExportButton';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';
import local from './Invoices.module.css';

type Props = {
  documents: DocumentRow[];
  payments: PaymentRow[];
  integrations: Integrations;
  /** Which filter pill starts selected. */
  initialFilter?: FilterKey;
  /** Hide the money tiles (the Getting paid tab shows its own). */
  compact?: boolean;
};

export type FilterKey = 'all' | 'open' | 'overdue' | 'paid' | 'void';

const FILTERS: { key: FilterKey; label: string; test: (doc: DocumentRow) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  {
    key: 'open',
    label: 'Open',
    test: (doc) => doc.status === 'draft' || doc.status === 'sent' || doc.status === 'accepted',
  },
  { key: 'overdue', label: 'Overdue', test: (doc) => isOverdue(doc) },
  { key: 'paid', label: 'Paid', test: (doc) => doc.status === 'paid' },
  { key: 'void', label: 'Void', test: (doc) => doc.status === 'void' },
];

const EMPTY: Record<FilterKey, string> = {
  all: 'No invoices yet. Every website booking creates one; you can also write one above.',
  open: 'Nothing open right now.',
  overdue: 'Nothing overdue.',
  paid: 'No paid invoices yet.',
  void: 'Nothing has been voided.',
};

const KIND_LABEL: Record<DocumentKind, string> = {
  proposal: 'Proposal',
  invoice: 'Invoice',
  certificate: 'Certificate',
};

const PAYMENT_KIND: Record<string, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  balance: 'Balance',
  cancellation_fee: 'Cancellation fee',
  refund: 'Refund',
};

const METHOD: Record<string, string> = {
  'e-transfer': 'E-transfer',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

/** "cancellation_fee" → "Cancellation fee" when a value isn't in the table. */
function humanise(value: string, table: Record<string, string>): string {
  const known = table[value];
  if (known) return known;
  const plain = value.replace(/_/g, ' ');
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** YYYY-MM-DD in the viewer's own timezone, from an ISO timestamp. */
function localDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Still expects money or an answer - not paid, void or declined. */
function isLive(doc: DocumentRow): boolean {
  return doc.status !== 'void' && doc.status !== 'declined' && doc.status !== 'paid';
}

/**
 * Order of attention: overdue, then anything sent or accepted (soonest due
 * first), then drafts, then everything settled with the newest on top.
 */
function rank(doc: DocumentRow): number {
  if (isOverdue(doc)) return 0;
  if (doc.status === 'sent' || doc.status === 'accepted') return 1;
  if (doc.status === 'draft') return 2;
  return 3;
}

function settledAt(doc: DocumentRow): string {
  return doc.paidAt ?? doc.voidedAt ?? doc.acceptedAt ?? doc.createdAt;
}

function compareDocs(a: DocumentRow, b: DocumentRow): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra <= 1) {
    const da = a.dueOn ?? '9999-12-31';
    const db = b.dueOn ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    return a.issuedOn.localeCompare(b.issuedOn);
  }
  if (ra === 2) return b.createdAt.localeCompare(a.createdAt);
  return settledAt(b).localeCompare(settledAt(a));
}

const EXPORT_COLUMNS: CsvColumn<DocumentRow>[] = [
  { header: 'Number', value: (d) => d.number },
  { header: 'Kind', value: (d) => KIND_LABEL[d.kind] },
  { header: 'Client', value: (d) => d.clientName },
  { header: 'Email', value: (d) => d.clientEmail },
  { header: 'Issued', value: (d) => d.issuedOn },
  { header: 'Due', value: (d) => d.dueOn ?? '' },
  { header: 'Total', value: (d) => d.total },
  { header: 'Paid', value: (d) => d.paidAmount },
  { header: 'Balance', value: (d) => balanceDue(d) },
  { header: 'Status', value: (d) => documentStatusLabel(d) },
];

/** What the Balance column shows: only an invoice carries a balance. */
function balanceText(doc: DocumentRow): string {
  if (doc.kind !== 'invoice' || doc.status === 'void' || doc.status === 'declined') return '—';
  return money(balanceDue(doc));
}

/** "in 3 days" / "5 days ago" under a due date that still matters. */
function dueHint(doc: DocumentRow): string {
  if (!doc.dueOn || !isLive(doc)) return '';
  return relativeDays(doc.dueOn);
}

function paymentAmount(payment: PaymentRow): string {
  const value = money(Math.abs(payment.amount));
  return payment.kind === 'refund' ? `−${value}` : value;
}

export function Invoices({ documents, payments, integrations, initialFilter = 'all', compact = false }: Props) {
  const { run, pending, error } = useStudioAction();
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [openId, setOpenId] = useState<string | null>(null);

  const now = new Date();
  const thisMonth = localDate(now.toISOString()).slice(0, 7);
  const monthName = now.toLocaleDateString('en-CA', { month: 'long' });

  // --- Stat tiles -----------------------------------------------------------
  const invoices = documents.filter((doc) => doc.kind === 'invoice');
  const openInvoices = invoices.filter(
    (doc) => doc.status === 'sent' || doc.status === 'draft' || doc.status === 'accepted'
  );
  const outstanding = openInvoices.reduce((sum, doc) => sum + balanceDue(doc), 0);
  const overdueInvoices = invoices.filter((doc) => isOverdue(doc));
  const overdueTotal = overdueInvoices.reduce((sum, doc) => sum + balanceDue(doc), 0);
  const voidDocumentIds = new Set(invoices.filter((doc) => doc.status === 'void').map((doc) => doc.id));
  const monthPayments = payments.filter(
    (p) =>
      p.kind !== 'refund' &&
      p.kind !== 'cancellation_fee' &&
      localDate(p.createdAt).slice(0, 7) === thisMonth &&
      !(p.documentId && voidDocumentIds.has(p.documentId))
  );
  const paidThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);

  // --- The list -------------------------------------------------------------
  const sorted = [...documents].sort(compareDocs);
  const active = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const visible = sorted.filter(active.test);
  const docById = new Map(documents.map((doc) => [doc.id, doc]));

  const recent = [...payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15);

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  const missing: string[] = [];
  if (!integrations.email) {
    missing.push(
      'Email isn’t connected yet (RESEND_API_KEY) — invoices can be created and viewed, but Send will fail until it is.'
    );
  }
  if (!integrations.pdf) {
    missing.push('PDFShift isn’t connected (PDFSHIFT_API_KEY) — PDF buttons open the online copy instead.');
  }

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      {missing.length > 0 ? (
        <div className={styles.warn}>
          {missing.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}

      {compact ? null : (
      <div className={styles.statGrid}>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={styles.statValue}>{money(outstanding)}</div>
          <div className={styles.statNote}>
            {openInvoices.length === 0
              ? 'No open invoices'
              : `Across ${plural(openInvoices.length, 'open invoice')}`}
          </div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Overdue</div>
          <div
            className={styles.statValue}
            style={overdueInvoices.length > 0 ? { color: 'var(--status-alert)' } : undefined}
          >
            {money(overdueTotal)}
          </div>
          <div className={styles.statNote}>
            {overdueInvoices.length === 0
              ? 'Nothing past due'
              : `${plural(overdueInvoices.length, 'invoice')} past due`}
          </div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Paid this month</div>
          <div className={styles.statValue}>{money(paidThisMonth)}</div>
          <div className={styles.statNote}>
            {monthPayments.length === 0
              ? `Nothing received yet in ${monthName}`
              : `${plural(monthPayments.length, 'payment')} in ${monthName}`}
          </div>
        </div>
      </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <div
            className={`${styles.segmented} ${local.filters}`}
            role="group"
            aria-label="Filter invoices"
          >
            {FILTERS.map((item) => {
              const count = sorted.filter(item.test).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.segment} ${local.filterBtn} ${filter === item.key ? styles.segmentOn : ''}`}
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  {count > 0 ? ` · ${count}` : ''}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.toolbarGroup}>
          <ExportButton filename="lotus-invoices" rows={visible} columns={EXPORT_COLUMNS} />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>{EMPTY[filter]}</div>
      ) : (
        <>
          <div className={styles.desktopOnly}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Client</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Total</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((doc) => {
                    const open = openId === doc.id;
                    const hint = dueHint(doc);
                    return (
                      <Fragment key={doc.id}>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div>{doc.number}</div>
                            <div className={styles.recordSub}>{KIND_LABEL[doc.kind]}</div>
                          </td>
                          <td>
                            <div>{doc.clientName}</div>
                            <div className={styles.recordSub}>{doc.clientEmail}</div>
                          </td>
                          <td title={formatStudioDate(doc.issuedOn)} style={{ whiteSpace: 'nowrap' }}>
                            {formatShortDate(doc.issuedOn)}
                          </td>
                          <td title={doc.dueOn ? formatStudioDate(doc.dueOn) : undefined} style={{ whiteSpace: 'nowrap' }}>
                            {formatShortDate(doc.dueOn)}
                            {hint ? <div className={styles.recordSub}>{hint}</div> : null}
                          </td>
                          <td className={styles.numeric}>{money(doc.total)}</td>
                          <td className={styles.numeric}>{balanceText(doc)}</td>
                          <td>
                            <DocumentStatusPill doc={doc} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn--outline ${styles.smallBtn}`}
                              aria-expanded={open}
                              onClick={() => toggle(doc.id)}
                            >
                              {open ? 'Close' : 'Manage'}
                            </button>
                          </td>
                        </tr>
                        {open ? (
                          <tr>
                            <td colSpan={8} className={local.expandCell}>
                              <DocumentCard
                                doc={doc}
                                run={run}
                                pending={pending}
                                integrations={integrations}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileOnly}>
            <div className={styles.cardList}>
              {visible.map((doc) => {
                const open = openId === doc.id;
                const hint = dueHint(doc);
                const showBalance = doc.kind === 'invoice' && isLive(doc);
                const partPaid = showBalance && doc.paidAmount > 0;
                return (
                  <div key={doc.id} className={styles.recordCard}>
                    <div className={styles.recordHead}>
                      <div className={local.grow}>
                        <div className={styles.recordTitle}>{doc.clientName}</div>
                        <div className={styles.recordSub}>
                          {KIND_LABEL[doc.kind]} {doc.number} · issued{' '}
                          {formatShortDate(doc.issuedOn)}
                          {doc.dueOn && isLive(doc)
                            ? ` · due ${formatShortDate(doc.dueOn)}${hint ? ` (${hint})` : ''}`
                            : ''}
                          {partPaid ? ` · ${money(doc.paidAmount)} of ${money(doc.total)} paid` : ''}
                        </div>
                      </div>
                      <div className={styles.recordValue}>
                        {showBalance ? money(balanceDue(doc)) : money(doc.total)}
                      </div>
                    </div>
                    <div className={local.cardRow}>
                      <DocumentStatusPill doc={doc} />
                      <button
                        type="button"
                        className={`btn btn--outline ${styles.smallBtn} ${local.manageBtn}`}
                        aria-expanded={open}
                        onClick={() => toggle(doc.id)}
                      >
                        {open ? 'Close' : 'Manage'}
                      </button>
                    </div>
                    {open ? (
                      <div className={local.nested}>
                        <DocumentCard
                          doc={doc}
                          run={run}
                          pending={pending}
                          integrations={integrations}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {compact ? null : (<>
      <h2 className={styles.subhead}>Recent payments</h2>

      {recent.length === 0 ? (
        <div className={styles.empty}>
          No payments recorded yet. Card payments record themselves; for an e-transfer or
          cash, open an invoice above and choose Record payment.
        </div>
      ) : (
        <>
          <div className={styles.desktopOnly}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Type</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((payment) => {
                    const doc = payment.documentId ? docById.get(payment.documentId) : undefined;
                    const day = localDate(payment.createdAt);
                    return (
                      <tr key={payment.id}>
                        <td title={formatStudioDate(day)}>{formatShortDate(day)}</td>
                        <td>{doc?.clientName ?? '—'}</td>
                        <td className={styles.numeric}>{paymentAmount(payment)}</td>
                        <td>{humanise(payment.method, METHOD)}</td>
                        <td>{humanise(payment.kind, PAYMENT_KIND)}</td>
                        <td>
                          <div>{doc?.number ?? '—'}</div>
                          {payment.note ? (
                            <div className={styles.recordSub}>{payment.note}</div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileOnly}>
            <div className={styles.cardList}>
              {recent.map((payment) => {
                const doc = payment.documentId ? docById.get(payment.documentId) : undefined;
                const day = localDate(payment.createdAt);
                return (
                  <div key={payment.id} className={styles.recordCard}>
                    <div className={styles.recordHead}>
                      <div className={local.grow}>
                        <div className={styles.recordTitle}>
                          {doc?.clientName ?? humanise(payment.kind, PAYMENT_KIND)}
                        </div>
                        <div className={styles.recordSub}>
                          {formatShortDate(day)} · {humanise(payment.method, METHOD)} ·{' '}
                          {humanise(payment.kind, PAYMENT_KIND)}
                          {doc ? ` · ${doc.number}` : ''}
                          {payment.note ? ` · ${payment.note}` : ''}
                        </div>
                      </div>
                      <div className={styles.recordValue}>{paymentAmount(payment)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      </>)}
    </>
  );
}
