'use client';

import { useState } from 'react';

import {
  balanceDue,
  formatShortDate,
  isOverdue,
  type DocumentLine,
  type DocumentRow,
  type Integrations,
  type PaymentLinkRow,
  type PaymentRow,
} from '@/lib/pipeline';
import { money } from '@/lib/site';
import { useStudioAction } from '../useStudioAction';
import { Invoices } from './Invoices';
import styles from '../studio.module.css';

type Tab = 'proposals' | 'invoices' | 'receipts' | 'links';

type Props = {
  documents: DocumentRow[];
  payments: PaymentRow[];
  paymentLinks: PaymentLinkRow[];
  integrations: Integrations;
};

const PAYMENT_KIND: Record<string, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  balance: 'Balance',
  cancellation_fee: 'Cancellation fee',
  refund: 'Refund',
};

function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn--outline ${styles.smallBtn}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        });
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

/**
 * Write a proposal or invoice for anyone - no website booking needed.
 * Lines are free text + amount so a café conversation can become paperwork
 * in a minute; the studio numbers it and mints the client's link.
 */
function Composer({
  kind,
  runJson,
  pending,
  emailReady,
}: {
  kind: 'proposal' | 'invoice';
  runJson: (p: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  pending: boolean;
  emailReady: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DocumentLine[]>([{ label: '', amount: 0 }]);
  const [sendNow, setSendNow] = useState(true);
  const [created, setCreated] = useState<{ number: string; url: string } | null>(null);

  const total = lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const label = kind === 'proposal' ? 'proposal' : 'invoice';

  const submit = async () => {
    const cleaned = lines
      .map((l) => ({ label: l.label.trim(), amount: Math.round(Number(l.amount) || 0) }))
      .filter((l) => l.label);
    if (!name.trim() || !email.trim() || cleaned.length === 0) return;
    const result = await runJson({
      action: 'createStandaloneDocument',
      kind,
      clientName: name.trim(),
      clientEmail: email.trim(),
      clientCompany: company.trim() || null,
      lines: cleaned,
      notes: notes.trim() || null,
      send: sendNow && emailReady,
    });
    if (result && typeof result.number === 'string' && typeof result.url === 'string') {
      setCreated({ number: result.number, url: `${window.location.origin}${result.url}` });
      setName('');
      setEmail('');
      setCompany('');
      setNotes('');
      setLines([{ label: '', amount: 0 }]);
    }
  };

  return (
    <div className={styles.docCard} style={{ marginBottom: 18 }}>
      <div className={styles.docHead}>
        <span className={styles.docNumber}>New {label}</span>
        <button type="button" className={`btn btn--outline ${styles.smallBtn}`} onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : `Write ${kind === 'invoice' ? 'an' : 'a'} ${label}`}
        </button>
      </div>
      {created ? (
        <div className={styles.okNote} style={{ marginTop: 12 }}>
          <strong>{created.number}</strong> created{sendNow && emailReady ? ' and sent' : ''}. Client link:{' '}
          <a href={created.url} target="_blank" rel="noreferrer">{created.url}</a>
          <div style={{ marginTop: 8 }}>
            <CopyButton text={created.url} />
          </div>
        </div>
      ) : null}
      {open ? (
        <div className={styles.inlineForm} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
            <input className="field" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Client name" />
            <input className="field" type="email" placeholder="Client email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Client email" />
            <input className="field" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
          </div>
          <div className={styles.subhead}><span>Lines</span></div>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="field"
                placeholder="What it's for, e.g. Private session · Oct 3"
                value={line.label}
                onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                aria-label={`Line ${i + 1} description`}
                style={{ flex: '1 1 200px', minWidth: 0 }}
              />
              <input
                className="field"
                type="number"
                inputMode="numeric"
                placeholder="$"
                value={line.amount || ''}
                onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, amount: Number(e.target.value) } : l)))}
                aria-label={`Line ${i + 1} amount`}
                style={{ width: 110 }}
              />
              <button
                type="button"
                className={styles.linkBtn}
                disabled={lines.length === 1}
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                aria-label="Remove line"
              >
                Remove
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className={styles.linkBtn} onClick={() => setLines((ls) => [...ls, { label: '', amount: 0 }])}>
              + Add a line
            </button>
            <span className={styles.recordValue}>{money(total)}</span>
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Notes to the client (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Notes"
            style={{ minHeight: 64 }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
            <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} disabled={!emailReady} />
            Email it to the client now{emailReady ? '' : ' (email not connected yet)'}
          </label>
          <p className={styles.priceNote}>
            Tax is added at the rate in Settings. {kind === 'proposal' ? 'When they accept and sign, the invoice is created and sent automatically.' : 'Card payment links are added automatically once Stripe is connected.'}
          </p>
          <div>
            <button
              type="button"
              className={`btn btn--dark ${styles.smallBtn}`}
              disabled={pending || !name.trim() || !email.trim() || !lines.some((l) => l.label.trim())}
              onClick={() => void submit()}
            >
              {pending ? 'Working…' : `Create ${label}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentLinks({
  links,
  integrations,
  runJson,
  run,
  pending,
}: {
  links: PaymentLinkRow[];
  integrations: Integrations;
  runJson: (p: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  run: (p: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [addFee, setAddFee] = useState(true);
  const [created, setCreated] = useState<string | null>(null);

  const create = async () => {
    const result = await runJson({
      action: 'createPaymentLink',
      description: description.trim(),
      amount: Number(amount),
      clientName: clientName.trim() || null,
      clientEmail: clientEmail.trim() || null,
      addCardFee: addFee,
    });
    if (result && typeof result.url === 'string') {
      setCreated(result.url);
      setDescription('');
      setAmount('');
      setClientName('');
      setClientEmail('');
    }
  };

  return (
    <>
      <div className={`${styles.integration} ${integrations.stripe ? '' : styles.integrationOff}`} style={{ marginBottom: 14 }}>
        <span className={styles.integrationDot} />
        Stripe {integrations.stripe ? 'connected' : 'not connected — add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel (see Settings)'}
      </div>

      <div className={styles.docCard} style={{ marginBottom: 18 }}>
        <div className={styles.docNumber}>New payment link</div>
        <p className={styles.priceNote} style={{ margin: '4px 0 10px' }}>
          A Stripe checkout page for any amount - a deposit agreed by phone, a workshop, a custom package. Share the link by text, email or WhatsApp; when it&rsquo;s paid, it shows up under Receipts.
        </p>
        {created ? (
          <div className={styles.okNote}>
            Link ready: <a href={created} target="_blank" rel="noreferrer">{created}</a>
            <div style={{ marginTop: 8 }}><CopyButton text={created} /></div>
          </div>
        ) : null}
        <div className={styles.inlineForm} style={{ marginTop: 0 }}>
          <input className="field" placeholder="What it's for" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" style={{ flex: 2, minWidth: 180 }} />
          <input className="field" type="number" inputMode="numeric" placeholder="Amount $" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" style={{ width: 120 }} />
          <input className="field" placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} aria-label="Client name" style={{ flex: 1, minWidth: 150 }} />
          <input className="field" type="email" placeholder="Client email (optional)" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} aria-label="Client email" style={{ flex: 1, minWidth: 170 }} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={addFee} onChange={(e) => setAddFee(e.target.checked)} /> Add card fee
          </label>
          <button
            type="button"
            className={`btn btn--dark ${styles.smallBtn}`}
            disabled={pending || !integrations.stripe || !description.trim() || !(Number(amount) > 0)}
            onClick={() => void create()}
          >
            Create link
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className={styles.empty}>No payment links yet.</div>
      ) : (
        <div className={styles.cardList}>
          {links.map((link) => (
            <div key={link.id} className={styles.recordCard}>
              <div className={styles.recordHead}>
                <div>
                  <div className={styles.recordTitle}>{link.description}</div>
                  <div className={styles.recordSub}>
                    {link.clientName ?? 'Anyone'}{link.clientEmail ? ` · ${link.clientEmail}` : ''} · created {formatShortDate(link.createdAt.slice(0, 10))}
                  </div>
                </div>
                <div className={styles.recordValue}>{money(link.amount)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`${styles.pill} ${link.paidAt ? styles.pillSuccess : link.isActive ? styles.pillPending : styles.pillNeutral}`}>
                  {link.paidAt ? `Paid${link.paidCount > 1 ? ` ×${link.paidCount}` : ''}` : link.isActive ? 'Open' : 'Closed'}
                </span>
                <span className={styles.recordSub} style={{ overflowWrap: 'anywhere' }}>{link.url}</span>
              </div>
              <div className={styles.recordActions}>
                <CopyButton text={link.url} />
                <a className={`btn btn--outline ${styles.smallBtn}`} href={link.url} target="_blank" rel="noreferrer">Open</a>
                {link.isActive ? (
                  <button type="button" className={styles.linkBtn} disabled={pending} onClick={() => void run({ action: 'deactivatePaymentLink', id: link.id })}>
                    Close link
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Receipts({
  payments,
  documents,
  run,
  pending,
}: {
  payments: PaymentRow[];
  documents: DocumentRow[];
  run: (p: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
}) {
  if (payments.length === 0) {
    return <div className={styles.empty}>No payments yet. Card payments record themselves; record an e-transfer from the invoice.</div>;
  }
  return (
    <div className={styles.cardList}>
      {payments.map((p) => {
        const doc = p.documentId ? documents.find((d) => d.id === p.documentId) : undefined;
        return (
          <div key={p.id} className={styles.recordCard}>
            <div className={styles.recordHead}>
              <div>
                <div className={styles.recordTitle}>{doc?.clientName ?? p.note ?? 'Payment'}</div>
                <div className={styles.recordSub}>
                  {formatShortDate(p.createdAt.slice(0, 10))} · {p.method} · {PAYMENT_KIND[p.kind] ?? p.kind}
                  {doc ? ` · ${doc.number}` : ''}{p.note && doc ? ` · ${p.note}` : ''}
                </div>
              </div>
              <div className={styles.recordValue}>{p.kind === 'refund' ? '−' : ''}{money(Math.abs(p.amount))}</div>
            </div>
            {doc ? (
              <div className={styles.recordActions}>
                <button type="button" className={`btn btn--outline ${styles.smallBtn}`} disabled={pending} onClick={() => void run({ action: 'resendReceipt', paymentId: p.id })}>
                  Resend receipt
                </button>
                <a className={`btn btn--outline ${styles.smallBtn}`} href={`/d/${doc.token}`} target="_blank" rel="noreferrer">Invoice</a>
                {balanceDue(doc) > 0 ? <span className={styles.priceNote}>{money(balanceDue(doc))} still due</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function GettingPaid({ documents, payments, paymentLinks, integrations }: Props) {
  const { run, runJson, pending, error } = useStudioAction();
  const [tab, setTab] = useState<Tab>('invoices');

  const invoices = documents.filter((d) => d.kind === 'invoice' && d.status !== 'void');
  const outstanding = invoices.filter((d) => d.status !== 'paid').reduce((t, d) => t + balanceDue(d), 0);
  const overdue = invoices.filter((d) => isOverdue(d)).reduce((t, d) => t + balanceDue(d), 0);
  const awaiting = documents.filter((d) => d.kind === 'proposal' && d.status === 'sent').length;
  const month = new Date().toISOString().slice(0, 7);
  const received = payments
    .filter((p) => p.createdAt.startsWith(month) && p.kind !== 'refund' && p.kind !== 'cancellation_fee')
    .reduce((t, p) => t + p.amount, 0);

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'proposals', label: 'Proposals', count: awaiting },
    { key: 'invoices', label: 'Invoices', count: invoices.filter((d) => d.status !== 'paid').length },
    { key: 'receipts', label: 'Receipts', count: payments.length },
    { key: 'links', label: 'Payment links', count: paymentLinks.filter((l) => l.isActive && !l.paidAt).length },
  ];

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.statGrid}>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={styles.statValue}>{money(outstanding)}</div>
          <div className={styles.statNote}>{invoices.filter((d) => d.status !== 'paid').length} open invoices</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Overdue</div>
          <div className={styles.statValue} style={overdue > 0 ? { color: 'var(--status-alert)' } : undefined}>{money(overdue)}</div>
          <div className={styles.statNote}>{invoices.filter((d) => isOverdue(d)).length} past due</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Received this month</div>
          <div className={styles.statValue}>{money(received)}</div>
          <div className={styles.statNote}>{payments.filter((p) => p.createdAt.startsWith(month)).length} payments</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Proposals out</div>
          <div className={styles.statValue}>{awaiting}</div>
          <div className={styles.statNote}>Awaiting a signature</div>
        </div>
      </div>

      <div className={styles.segmented} style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`${styles.segment} ${tab === t.key ? styles.segmentOn : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{t.count ? ` · ${t.count}` : ''}
          </button>
        ))}
      </div>

      {tab === 'proposals' ? (
        <>
          <Composer kind="proposal" runJson={runJson} pending={pending} emailReady={integrations.email} />
          <Invoices documents={documents} payments={payments} integrations={integrations} initialFilter="proposals" compact />
        </>
      ) : null}
      {tab === 'invoices' ? (
        <>
          <Composer kind="invoice" runJson={runJson} pending={pending} emailReady={integrations.email} />
          <Invoices documents={documents} payments={payments} integrations={integrations} initialFilter="invoices" compact />
        </>
      ) : null}
      {tab === 'receipts' ? <Receipts payments={payments} documents={documents} run={run} pending={pending} /> : null}
      {tab === 'links' ? (
        <PaymentLinks links={paymentLinks} integrations={integrations} runJson={runJson} run={run} pending={pending} />
      ) : null}
    </>
  );
}
