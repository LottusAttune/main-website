'use client';

import { useState } from 'react';

import {
  balanceDue,
  documentStatusLabel,
  formatShortDate,
  isOverdue,
  type DocumentRow,
  type Integrations,
} from '@/lib/pipeline';
import { money } from '@/lib/site';
import styles from './studio.module.css';

type Run = (payload: Record<string, unknown>) => Promise<boolean>;

export function documentPillClass(doc: DocumentRow): string {
  if (doc.status === 'paid' || doc.status === 'accepted') return styles.pillSuccess;
  if (doc.status === 'void' || doc.status === 'declined' || isOverdue(doc)) return styles.pillAlert;
  if (doc.status === 'sent') return styles.pillPending;
  return styles.pillNeutral;
}

export function DocumentStatusPill({ doc }: { doc: DocumentRow }) {
  return (
    <span className={`${styles.pill} ${documentPillClass(doc)}`}>
      {documentStatusLabel(doc)}
    </span>
  );
}

/**
 * One document's summary and every action that makes sense for its state.
 * Shared by the lead drawer, the Invoices tab and Gift cards, so the same
 * buttons mean the same thing everywhere.
 */
export function DocumentCard({
  doc,
  run,
  pending,
  integrations,
  showClient,
}: {
  doc: DocumentRow;
  run: Run;
  pending: boolean;
  integrations: Integrations;
  showClient?: boolean;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(String(balanceDue(doc)));
  const [method, setMethod] = useState<'e-transfer' | 'cash' | 'card' | 'other'>('e-transfer');
  const [note, setNote] = useState('');

  const kindLabel =
    doc.kind === 'proposal' ? 'Proposal' : doc.kind === 'invoice' ? 'Invoice' : 'Certificate';
  const due = balanceDue(doc);
  const live = doc.status !== 'void' && doc.status !== 'declined';
  const sendLabel = doc.sentAt ? 'Resend' : 'Send';

  const submitPayment = async () => {
    const ok = await run({
      action: 'recordPayment',
      id: doc.id,
      amount: Number(amount) || undefined,
      method,
      note: note || null,
    });
    if (ok) {
      setPaying(false);
      setNote('');
    }
  };

  return (
    <div className={styles.docCard}>
      <div className={styles.docHead}>
        <span className={styles.docNumber}>
          {kindLabel} {doc.number}
        </span>
        <DocumentStatusPill doc={doc} />
      </div>
      <div className={styles.docMeta}>
        {showClient ? `${doc.clientName} · ` : ''}
        {money(doc.total)}
        {doc.kind === 'invoice' && doc.paidAmount > 0 && due > 0
          ? ` · ${money(doc.paidAmount)} paid, ${money(due)} due`
          : ''}
        {doc.kind === 'invoice' && doc.dueOn && doc.status !== 'paid' && doc.status !== 'void'
          ? ` · due ${formatShortDate(doc.dueOn)}`
          : ''}
        {doc.kind === 'proposal' && doc.dueOn && doc.status === 'sent'
          ? ` · valid to ${formatShortDate(doc.dueOn)}`
          : ''}
        {doc.sentAt ? ` · sent ${formatShortDate(doc.sentAt.slice(0, 10))}` : ' · not sent yet'}
        {doc.viewedAt ? ' · viewed' : ''}
        {doc.paymentPlan === 'deposit' ? ' · deposit plan' : ''}
      </div>

      <div className={styles.docActions}>
        {live ? (
          <button
            type="button"
            className={`btn btn--outline ${styles.smallBtn}`}
            disabled={pending}
            onClick={() => void run({ action: 'sendDocument', id: doc.id })}
            title={integrations.email ? undefined : 'Email is not connected yet'}
          >
            {sendLabel}
          </button>
        ) : null}
        {doc.kind === 'invoice' && live && due > 0 ? (
          <button
            type="button"
            className={`btn btn--outline ${styles.smallBtn}`}
            disabled={pending}
            onClick={() => setPaying((v) => !v)}
          >
            Record payment
          </button>
        ) : null}
        {doc.kind === 'proposal' && live && doc.status !== 'accepted' ? (
          <button
            type="button"
            className={`btn btn--outline ${styles.smallBtn}`}
            disabled={pending}
            onClick={() => void run({ action: 'markDocument', id: doc.id, status: 'accepted' })}
          >
            Mark accepted
          </button>
        ) : null}
        <a
          className={`btn btn--outline ${styles.smallBtn}`}
          href={`/d/${doc.token}`}
          target="_blank"
          rel="noreferrer"
        >
          View
        </a>
        <a
          className={`btn btn--outline ${styles.smallBtn}`}
          href={`/d/${doc.token}/pdf`}
          target="_blank"
          rel="noreferrer"
          title={integrations.pdf ? undefined : 'PDFShift is not connected - opens the online view'}
        >
          PDF
        </a>
        {live ? (
          <button
            type="button"
            className={styles.linkBtn}
            disabled={pending}
            onClick={() => {
              const message =
                doc.status === 'paid'
                  ? `Void ${doc.number}? It has been marked paid - voiding it does not remove or refund that payment, it only takes the document out of your active list. A new one can be created afterwards.`
                  : `Void ${doc.number}? A new one can be created afterwards.`;
              if (window.confirm(message)) {
                void run({ action: 'markDocument', id: doc.id, status: 'void' });
              }
            }}
          >
            Void
          </button>
        ) : null}
        {doc.status !== 'paid' ? (
          <button
            type="button"
            className={styles.linkBtn}
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Delete ${doc.number} permanently? This cannot be undone.`)) {
                void run({ action: 'deleteDocument', id: doc.id });
              }
            }}
          >
            Delete
          </button>
        ) : null}
      </div>

      {paying ? (
        <div className={styles.inlineForm}>
          <input
            className="field"
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount received"
            style={{ width: 110 }}
          />
          <select
            className="field"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            aria-label="Payment method"
          >
            <option value="e-transfer">E-transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card (manual)</option>
            <option value="other">Other</option>
          </select>
          <input
            className="field"
            type="text"
            placeholder="Reference (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Payment reference"
            style={{ flex: 1, minWidth: 140 }}
          />
          <button
            type="button"
            className={`btn btn--dark ${styles.smallBtn}`}
            disabled={pending}
            onClick={() => void submitPayment()}
          >
            Save payment
          </button>
        </div>
      ) : null}
    </div>
  );
}
