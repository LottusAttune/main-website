'use client';

import { useMemo, useState } from 'react';

import { money, TIME_SLOTS } from '@/lib/site';
import {
  balanceDue,
  documentStatusLabel,
  formatStudioDate,
  isOverdue,
  relativeDays,
  type BookingRow,
  type DocumentRow,
  type Integrations,
} from '@/lib/pipeline';
import type { BusinessSettings } from '@/lib/settings';
import { RowActionsMenu } from '../RowActionsMenu';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';
import local from './Bookings.module.css';

type Props = {
  bookings: BookingRow[];
  documents: DocumentRow[];
  integrations: Integrations;
  business: BusinessSettings;
};

type Filter = 'upcoming' | 'past' | 'cancelled' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const COLUMNS = [
  { header: 'Date', value: (b: BookingRow) => b.sessionDate ?? '' },
  { header: 'Time', value: (b: BookingRow) => b.sessionTime ?? '' },
  { header: 'Second date', value: (b: BookingRow) => b.sessionDate2 ?? '' },
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
  { header: 'Refreshments', value: (b: BookingRow) => (b.refreshments ? 'Yes' : 'No') },
  { header: 'Package of four', value: (b: BookingRow) => (b.isPackage ? 'Yes' : 'No') },
  { header: 'Corporate intro', value: (b: BookingRow) => (b.isCorporateIntro ? 'Yes' : 'No') },
  { header: 'Venue', value: (b: BookingRow) => b.venue },
  { header: 'Gratuity', value: (b: BookingRow) => b.gratuity },
  { header: 'Value', value: (b: BookingRow) => b.total },
  { header: 'Status', value: (b: BookingRow) => b.status },
  { header: 'Card on file', value: (b: BookingRow) => (b.cardOnFile ? 'Yes' : 'No') },
  { header: 'Confirmation sent', value: (b: BookingRow) => b.confirmationSentAt ?? '' },
  { header: 'Reminder sent', value: (b: BookingRow) => b.reminderSentAt ?? '' },
  { header: 'Balance charged', value: (b: BookingRow) => b.balanceChargedAt ?? '' },
];

/* ---------- small date helpers (local time, ISO YYYY-MM-DD) ---------- */

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** "12 – 2 pm" → 12, "6 – 8 pm" → 18, "8 – 10 am" → 8. Noon if unknown. */
function startHour(time: string | null): number {
  if (!time) return 12;
  const match = /^\s*(\d{1,2})/.exec(time);
  const hour = match ? Number(match[1]) : 12;
  const pm = /pm\s*$/i.test(time);
  const am = /am\s*$/i.test(time);
  if (pm && hour < 12) return hour + 12;
  if (am && hour === 12) return 0;
  return hour;
}

function hoursUntil(booking: BookingRow, now: Date): number | null {
  if (!booking.sessionDate) return null;
  const start = new Date(`${booking.sessionDate}T00:00:00`);
  start.setHours(startHour(booking.sessionTime));
  return (start.getTime() - now.getTime()) / 3_600_000;
}

type Bucket = Exclude<Filter, 'all'>;

function bucketOf(b: BookingRow, today: string): Bucket {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.sessionDate && b.sessionDate < today) return 'past';
  return 'upcoming';
}

const BUCKET_RANK: Record<Bucket, number> = { upcoming: 0, past: 1, cancelled: 2 };

/** Upcoming soonest first, then past most-recent first, cancelled last. */
function sortBookings(bookings: BookingRow[], today: string): BookingRow[] {
  const key = (b: BookingRow) => `${b.sessionDate ?? '9999-99-99'} ${b.sessionTime ?? ''}`;
  return [...bookings].sort((a, b) => {
    const ba = bucketOf(a, today);
    const bb = bucketOf(b, today);
    if (ba !== bb) return BUCKET_RANK[ba] - BUCKET_RANK[bb];
    return ba === 'upcoming'
      ? key(a).localeCompare(key(b))
      : key(b).localeCompare(key(a));
  });
}

/* ---------- labels ---------- */

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

function formatLabel(b: BookingRow): string {
  const parts = [
    b.participants === 1 ? 'One-on-one' : `${b.participants} participants`,
  ];
  if (b.teamAddon) parts.push('Team-building');
  if (b.refreshments) parts.push('Refreshments');
  if (b.isPackage) parts.push('Package of four');
  if (b.isCorporateIntro) parts.push('Corporate intro');
  return parts.join(' · ');
}

function flagsFor(b: BookingRow): string[] {
  const flags: string[] = [];
  if (b.confirmationSentAt) flags.push('Confirmation sent');
  if (b.reminderSentAt) flags.push('Reminder sent');
  if (b.cardOnFile) flags.push('Card on file');
  if (b.balanceChargedAt) flags.push('Balance charged');
  if (b.balanceRequestedAt) flags.push('Balance requested');
  return flags;
}

function invoicePill(invoice: DocumentRow): string {
  if (invoice.status === 'paid') return styles.pillSuccess;
  if (isOverdue(invoice)) return styles.pillAlert;
  if (invoice.status === 'sent') return styles.pillPending;
  return styles.pillNeutral;
}

function PaymentCell({ invoice }: { invoice: DocumentRow | undefined }) {
  if (!invoice) return <span className={styles.priceNote}>No invoice</span>;
  const due = balanceDue(invoice);
  return (
    <div className={local.payment}>
      <span className={`${styles.pill} ${invoicePill(invoice)}`}>
        {documentStatusLabel(invoice)}
      </span>
      {due > 0 ? (
        <span className={styles.priceNote}>balance {money(due)}</span>
      ) : null}
    </div>
  );
}

type Action = {
  label: string;
  onClick: () => void;
  alert?: boolean;
};

export function Bookings({ bookings, documents, integrations, business }: Props) {
  const { run, pending, error } = useStudioAction();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDate2, setEditDate2] = useState('');
  const [editTime2, setEditTime2] = useState('');

  const now = new Date();
  const today = toIso(now);
  const reminderHorizon = addDays(today, 7);

  /** Latest live invoice per booking. */
  const invoiceFor = useMemo(() => {
    const map = new Map<string, DocumentRow>();
    for (const doc of documents) {
      if (doc.kind !== 'invoice' || doc.status === 'void' || !doc.bookingId) continue;
      const prev = map.get(doc.bookingId);
      if (!prev || doc.createdAt > prev.createdAt) map.set(doc.bookingId, doc);
    }
    return map;
  }, [documents]);

  const sorted = useMemo(() => sortBookings(bookings, today), [bookings, today]);

  const visible =
    filter === 'all' ? sorted : sorted.filter((b) => bucketOf(b, today) === filter);

  if (bookings.length === 0) {
    return (
      <div className={styles.empty}>
        No confirmed bookings yet. Move a lead to “Booked” and it appears here.
      </div>
    );
  }

  /* ---------- editing ---------- */

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

  const renderEditor = (hasSecondSession: boolean, compact: boolean) => {
    const fieldClass = compact ? `field ${local.editField}` : `field ${styles.editInput}`;
    return (
      <>
        <div className={styles.editRow}>
          <input
            type="date"
            aria-label="Session date"
            className={fieldClass}
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <select
            aria-label="Session time"
            className={fieldClass}
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
              aria-label="Second session date"
              className={fieldClass}
              value={editDate2}
              onChange={(e) => setEditDate2(e.target.value)}
            />
            <select
              aria-label="Second session time"
              className={fieldClass}
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
      </>
    );
  };

  /* ---------- actions ---------- */

  const cancelBooking = (booking: BookingRow) => {
    const hours = hoursUntil(booking, now);
    const late = hours !== null && hours <= business.cancellationHours;
    let chargeFee = false;
    if (late && booking.cardOnFile) {
      chargeFee = window.confirm(
        `Cancel and charge the ${money(business.cancellationFee)} late-cancellation fee to the card on file?`
      );
    }
    void run({ action: 'cancelBooking', id: booking.id, cancelled: true, chargeFee });
  };

  /** The buttons shown for a booking, and the housekeeping items behind ⋮. */
  const actionsFor = (booking: BookingRow, invoice: DocumentRow | undefined) => {
    const booked = booking.status === 'booked';
    const cancelled = booking.status === 'cancelled';
    const upcoming = Boolean(booking.sessionDate && booking.sessionDate >= today);
    const due = invoice ? balanceDue(invoice) : 0;

    const primary: Action[] = [];

    if (booked) {
      primary.push({
        label: booking.confirmationSentAt ? 'Resend confirmation' : 'Send confirmation',
        onClick: () => void run({ action: 'sendConfirmation', bookingId: booking.id }),
      });
    }
    if (
      booked &&
      booking.sessionDate &&
      booking.sessionDate >= today &&
      booking.sessionDate <= reminderHorizon
    ) {
      primary.push({
        label: booking.reminderSentAt ? 'Resend reminder' : 'Send reminder',
        onClick: () => void run({ action: 'sendReminder', bookingId: booking.id }),
      });
    }
    if (booking.cardOnFile && invoice && due > 0 && !booking.balanceChargedAt) {
      primary.push({
        label: 'Charge balance',
        onClick: () => {
          if (window.confirm(`Charge the ${money(due)} balance to the card on file?`)) {
            void run({ action: 'chargeBalance', bookingId: booking.id });
          }
        },
      });
    }
    if (!booking.cardOnFile && invoice && invoice.paidAmount > 0 && due > 0) {
      primary.push({
        label: booking.balanceRequestedAt ? 'Request balance again' : 'Request balance',
        onClick: () => void run({ action: 'sendBalanceRequest', bookingId: booking.id }),
      });
    }
    if (cancelled && booking.cardOnFile && !booking.cancellationFeeChargedAt) {
      primary.push({
        label: `Charge ${money(business.cancellationFee)} fee`,
        onClick: () => {
          if (
            window.confirm(
              `Charge the ${money(business.cancellationFee)} cancellation fee to the card on file?`
            )
          ) {
            void run({ action: 'chargeCancellationFee', bookingId: booking.id });
          }
        },
      });
    }
    if (booked && booking.sessionDate && !upcoming) {
      primary.push({
        label: 'Mark complete',
        onClick: () => void run({ action: 'moveLead', id: booking.id, status: 'complete' }),
      });
    }

    const secondary: Action[] = [
      { label: 'Edit', onClick: () => startEdit(booking) },
      cancelled
        ? {
            label: 'Restore',
            onClick: () =>
              void run({ action: 'cancelBooking', id: booking.id, cancelled: false }),
          }
        : { label: 'Cancel', onClick: () => cancelBooking(booking) },
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
    ];

    return { primary, secondary };
  };

  const actionButton = (action: Action) => (
    <button
      key={action.label}
      type="button"
      className={`btn btn--outline ${styles.smallBtn} ${local.tap} ${action.alert ? local.alertBtn : ''}`}
      disabled={pending}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );

  const invoiceLink = (invoice: DocumentRow | undefined) =>
    invoice ? (
      <a
        key="invoice"
        href={`/d/${invoice.token}`}
        target="_blank"
        rel="noreferrer"
        className={`btn btn--outline ${styles.smallBtn} ${local.tap}`}
      >
        Open invoice
      </a>
    ) : null;

  const editButtons = (id: string) => (
    <>
      <button
        type="button"
        className={`btn btn--outline ${styles.smallBtn} ${local.tap}`}
        disabled={pending}
        onClick={() => void saveEdit(id)}
      >
        Save
      </button>
      <button
        type="button"
        className={`btn btn--outline ${styles.smallBtn} ${local.tap}`}
        disabled={pending}
        onClick={() => setEditingId(null)}
      >
        Cancel
      </button>
    </>
  );

  const emptyLabel =
    filter === 'all' ? 'No bookings.' : `No ${filter} bookings.`;

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}
      {!integrations.email ? (
        <div className={styles.warn}>
          Email isn&apos;t connected yet (RESEND_API_KEY) — confirmations and
          reminders will fail until it is.
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.segmented} role="group" aria-label="Filter bookings">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.segment} ${local.tap} ${filter === f.key ? styles.segmentOn : ''}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ExportButton filename="lotus-bookings" rows={visible} columns={COLUMNS} />
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>{emptyLabel}</div>
      ) : null}

      {/* ---------- Desktop table ---------- */}
      {visible.length > 0 ? (
        <div className={styles.desktopOnly}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Format</th>
                  <th>Venue</th>
                  <th>Value</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => {
                  const isEditing = editingId === booking.id;
                  const invoice = invoiceFor.get(booking.id);
                  const { primary, secondary } = actionsFor(booking, invoice);
                  const flags = flagsFor(booking);

                  return (
                    <tr key={booking.id}>
                      {isEditing ? (
                        <td colSpan={2}>
                          {renderEditor(Boolean(booking.sessionDate2), false)}
                        </td>
                      ) : (
                        <>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div>{formatStudioDate(booking.sessionDate)}</div>
                            {booking.sessionDate2 &&
                            booking.sessionDate2 !== booking.sessionDate ? (
                              <div className={styles.priceNote}>
                                + {formatStudioDate(booking.sessionDate2)}
                              </div>
                            ) : null}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div>{booking.sessionTime ?? '—'}</div>
                            {booking.sessionTime2 ? (
                              <div className={styles.priceNote}>
                                + {booking.sessionTime2}
                              </div>
                            ) : null}
                          </td>
                        </>
                      )}
                      <td>
                        <div>{booking.name}</div>
                        {booking.company ? (
                          <div className={styles.priceNote}>{booking.company}</div>
                        ) : null}
                      </td>
                      <td>{formatLabel(booking)}</td>
                      <td>{booking.venue}</td>
                      <td className={styles.numeric}>
                        {money(booking.total)}
                        {booking.gratuity > 0 ? (
                          <div className={styles.priceNote}>
                            incl. {money(booking.gratuity)} gratuity
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <PaymentCell invoice={invoice} />
                      </td>
                      <td>
                        <span className={`${styles.pill} ${statusPill(booking.status)}`}>
                          {statusLabel(booking.status)}
                        </span>
                        {flags.length > 0 ? (
                          <div className={`${styles.priceNote} ${local.flags}`}>
                            {flags.join(' · ')}
                          </div>
                        ) : null}
                      </td>
                      <td className={local.actionsCell}>
                        {isEditing ? (
                          <div className={styles.rowActions}>{editButtons(booking.id)}</div>
                        ) : (
                          <div className={styles.rowActions}>
                            {primary.map(actionButton)}
                            {invoiceLink(invoice)}
                            <RowActionsMenu items={secondary} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ---------- Phone / tablet cards ---------- */}
      {visible.length > 0 ? (
        <div className={styles.mobileOnly}>
          <div className={styles.cardList}>
            {visible.map((booking) => {
              const isEditing = editingId === booking.id;
              const invoice = invoiceFor.get(booking.id);
              const { primary, secondary } = actionsFor(booking, invoice);
              const flags = flagsFor(booking);
              const when = booking.sessionDate ? relativeDays(booking.sessionDate, now) : '';

              return (
                <div key={booking.id} className={styles.recordCard}>
                  <div className={styles.recordHead}>
                    <div>
                      <div className={styles.recordTitle}>{booking.name}</div>
                      <div className={styles.recordSub}>
                        {formatStudioDate(booking.sessionDate)}
                        {booking.sessionTime ? ` · ${booking.sessionTime}` : ''}
                        {when && booking.status !== 'cancelled' ? ` (${when})` : ''}
                      </div>
                      {booking.sessionDate2 || booking.sessionTime2 ? (
                        <div className={styles.recordSub}>
                          + {formatStudioDate(booking.sessionDate2 ?? booking.sessionDate)}
                          {booking.sessionTime2 ? ` · ${booking.sessionTime2}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.recordValue}>{money(booking.total)}</div>
                  </div>

                  <div className={styles.kv}>
                    {booking.company ? (
                      <>
                        <div className={styles.kvLabel}>Company</div>
                        <div className={styles.kvValue}>{booking.company}</div>
                      </>
                    ) : null}
                    <div className={styles.kvLabel}>Contact</div>
                    <div className={styles.kvValue}>
                      <a href={`mailto:${booking.email}`}>{booking.email}</a>
                      {booking.phone ? (
                        <div>
                          <a href={`tel:${booking.phone}`}>{booking.phone}</a>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.kvLabel}>Format</div>
                    <div className={styles.kvValue}>{formatLabel(booking)}</div>
                    <div className={styles.kvLabel}>Venue</div>
                    <div className={styles.kvValue}>{booking.venue}</div>
                    {booking.gratuity > 0 ? (
                      <>
                        <div className={styles.kvLabel}>Gratuity</div>
                        <div className={styles.kvValue}>
                          {money(booking.gratuity)} (included in the value)
                        </div>
                      </>
                    ) : null}
                    <div className={styles.kvLabel}>Status</div>
                    <div className={styles.kvValue}>
                      <span className={`${styles.pill} ${statusPill(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                    </div>
                    <div className={styles.kvLabel}>Payment</div>
                    <div className={styles.kvValue}>
                      <PaymentCell invoice={invoice} />
                    </div>
                  </div>

                  {flags.length > 0 ? (
                    <div className={`${styles.priceNote} ${local.flags}`}>
                      {flags.join(' · ')}
                    </div>
                  ) : null}

                  {isEditing ? (
                    <div className={local.editStack}>
                      {renderEditor(Boolean(booking.sessionDate2), true)}
                    </div>
                  ) : null}

                  <div className={styles.recordActions}>
                    {isEditing ? (
                      editButtons(booking.id)
                    ) : (
                      <>
                        {primary.map(actionButton)}
                        {invoiceLink(invoice)}
                        {secondary.map(actionButton)}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
