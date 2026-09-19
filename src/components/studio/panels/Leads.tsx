'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { money } from '@/lib/site';
import type { BusinessSettings } from '@/lib/settings';
import {
  ACTIVITY_LABELS,
  balanceDue,
  formatShortDate,
  formatStudioDate,
  relativeDays,
  STAGES,
  type ActivityEntry,
  type DocumentRow,
  type Integrations,
  type Lead,
  type StageKey,
} from '@/lib/pipeline';
import { DocumentCard, DocumentStatusPill } from '../DocumentActions';
import { useStudioAction } from '../useStudioAction';
import { Bookings } from './Bookings';
import styles from '../studio.module.css';

type Props = {
  leads: Lead[];
  documents: DocumentRow[];
  activity: ActivityEntry[];
  integrations: Integrations;
  business: BusinessSettings;
  /** Open this lead's drawer on arrival (from a client card). */
  openId?: string | null;
  onOpened?: () => void;
};

function latest(docs: DocumentRow[], bookingId: string, kind: 'proposal' | 'invoice') {
  return docs.find((d) => d.bookingId === bookingId && d.kind === kind && d.status !== 'void') ?? null;
}

function formatLabel(lead: Lead): string {
  if (lead.participants === 1) return lead.isPackage ? 'Private · package of four' : 'Private session';
  const parts = [`${lead.participants} participants`];
  if (lead.isCorporateIntro) parts.push('corporate intro');
  if (lead.teamAddon) parts.push('team-building');
  return parts.join(' · ');
}

function friendlyStatus(status: Lead['status']): string {
  if (status === 'booked') return 'Booked';
  if (status === 'complete') return 'Complete';
  if (status === 'cancelled') return 'Cancelled';
  return 'Awaiting payment';
}

export function Leads({ leads, documents, activity, integrations, business, openId, onOpened }: Props) {
  const { run, pending, error } = useStudioAction();
  const [openLeadId, setOpenLeadId] = useState<string | null>(openId ?? null);

  useEffect(() => {
    if (openId) {
      setOpenLeadId(openId);
      onOpened?.();
    }
  }, [openId, onOpened]);

  const move = (id: string, status: StageKey) => {
    void run({ action: 'moveLead', id, status });
  };

  const openLead = leads.find((lead) => lead.id === openLeadId) ?? null;

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <Bookings
        bookings={leads}
        documents={documents}
        integrations={integrations}
        business={business}
        onOpenDetails={setOpenLeadId}
      />

      {openLead ? (
        <LeadDrawer
          lead={openLead}
          proposal={latest(documents, openLead.id, 'proposal')}
          invoice={latest(documents, openLead.id, 'invoice')}
          activity={activity.filter(
            (a) => a.bookingId === openLead.id && a.kind !== 'stage' && a.kind !== 'terms_accepted'
          )}
          integrations={integrations}
          business={business}
          run={run}
          pending={pending}
          onMove={move}
          onClose={() => setOpenLeadId(null)}
        />
      ) : null}
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{children}</span>
    </>
  );
}


function LeadDrawer({
  lead,
  proposal,
  invoice,
  activity,
  integrations,
  business,
  run,
  pending,
  onMove,
  onClose,
}: {
  lead: Lead;
  proposal: DocumentRow | null;
  invoice: DocumentRow | null;
  activity: ActivityEntry[];
  integrations: Integrations;
  business: BusinessSettings;
  run: (payload: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
  onMove: (id: string, status: StageKey) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email);
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [company, setCompany] = useState(lead.company ?? '');
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const stageIndex = STAGES.findIndex((s) => s.key === lead.status);
  const inPipeline = stageIndex >= 0;
  const isBooked = lead.status === 'booked' || lead.status === 'complete';

  const saveContact = async () => {
    const ok = await run({
      action: 'editLead',
      id: lead.id,
      name,
      email,
      phone: phone || null,
      company: company || null,
    });
    if (ok) setEditing(false);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const ok = await run({ action: 'addNote', bookingId: lead.id, body: note.trim() });
    if (ok) setNote('');
  };

  const nextStep = (() => {
    if (lead.status === 'cancelled') return 'This booking was cancelled.';
    if (invoice?.status === 'paid') return 'Paid in full. Send the confirmation if it has not gone out, then mark complete after the session.';
    if (invoice && invoice.paidAmount > 0) {
      const balance = money(balanceDue(invoice));
      if (lead.cardOnFile) return `Deposit received. The balance of ${balance} is charged to the card on file ${business.balanceDaysBefore} days before the session.`;
      if (lead.balanceRequestedAt) return `Deposit received. The balance of ${balance} was requested by email ${formatShortDate(lead.balanceRequestedAt.slice(0, 10))}. Record the e-transfer when it arrives.`;
      return `Deposit received. The balance of ${balance} is requested by email ${business.balanceDaysBefore} days before the session.`;
    }
    if (invoice && invoice.status === 'sent') return `Invoice sent${invoice.sentAt ? ` ${relativeDays(invoice.sentAt)}` : ''}${invoice.viewedAt ? ' and viewed' : ''}. The ${business.depositPercent}% deposit confirms the date: card deposits record themselves, record an e-transfer below.`;
    if (invoice) return 'Invoice is drafted. Check the lines below and send it.';
    if (proposal?.status === 'accepted') return 'Proposal accepted. Create and send the invoice.';
    if (proposal?.status === 'sent') return `Proposal sent ${proposal.sentAt ? relativeDays(proposal.sentAt) : ''}${proposal.viewedAt ? ' and viewed' : ''}. Waiting on the client.`;
    return 'No invoice yet. Create and send the invoice; the deposit confirms the date.';
  })();

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`${lead.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>{lead.name}</div>
            <div className={styles.modalSubtitle}>
              {friendlyStatus(lead.status)} · {money(lead.total)}
            </div>
          </div>
          <button type="button" className={styles.modalClose} aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.okNote} style={{ marginTop: 14 }}>
            <strong>Next step:</strong> {nextStep}
          </div>

          <div className={styles.subhead}>
            <span>Contact</span>
            <button type="button" className={styles.linkBtn} onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <div className={styles.inlineForm} style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 0 }}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" placeholder="Name" />
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" placeholder="Email" />
              <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" placeholder="Phone" />
              <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" placeholder="Company" />
              <button type="button" className={`btn btn--dark ${styles.smallBtn}`} disabled={pending} onClick={() => void saveContact()}>
                Save contact
              </button>
            </div>
          ) : (
            <div className={styles.kv}>
              <DetailRow label="Email"><a href={`mailto:${lead.email}`}>{lead.email}</a></DetailRow>
              {lead.phone ? <DetailRow label="Phone"><a href={`tel:${lead.phone}`}>{lead.phone}</a></DetailRow> : null}
              {lead.company ? <DetailRow label="Company">{lead.company}</DetailRow> : null}
              <DetailRow label="Received">{formatStudioDate(lead.createdAt.slice(0, 10))}</DetailRow>
            </div>
          )}

          {lead.message ? (
            <>
              <div className={styles.subhead}><span>Their message</span></div>
              <div className={styles.timelineNote}>{lead.message}</div>
            </>
          ) : null}

          <div className={styles.subhead}><span>Session</span></div>
          <div className={styles.kv}>
            <DetailRow label="Format">{formatLabel(lead)}</DetailRow>
            <DetailRow label="Date">{formatStudioDate(lead.sessionDate)}</DetailRow>
            <DetailRow label="Time">{lead.sessionTime ?? '—'}</DetailRow>
            {lead.sessionDate2 ? (
              <DetailRow label="Second session">
                {lead.sessionDate2 === lead.sessionDate
                  ? lead.sessionTime2
                  : `${formatStudioDate(lead.sessionDate2)} · ${lead.sessionTime2}`}
              </DetailRow>
            ) : null}
            <DetailRow label="Venue">{lead.venue}</DetailRow>
            {lead.discountCode ? <DetailRow label="Discount">{lead.discountCode}</DetailRow> : null}
            {lead.gratuity > 0 ? <DetailRow label="Gratuity">{money(lead.gratuity)}</DetailRow> : null}
            <DetailRow label="Quoted">
              <span className={styles.numeric}>{money(lead.total)}</span>
            </DetailRow>
            {lead.portalUrl ? (
              <DetailRow label="Client page">
                <a href={lead.portalUrl} target="_blank" rel="noopener" className={styles.linkBtn}>
                  Open their booking page
                </a>
              </DetailRow>
            ) : null}
          </div>

          <div className={styles.subhead}><span>Paperwork</span></div>
          {proposal ? (
            <DocumentCard doc={proposal} run={run} pending={pending} integrations={integrations} />
          ) : (
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={pending || lead.status === 'cancelled'}
              onClick={() => void run({ action: 'createDocument', bookingId: lead.id, kind: 'proposal' })}
              style={{ marginBottom: 10 }}
            >
              Create proposal
            </button>
          )}
          {invoice ? (
            <DocumentCard doc={invoice} run={run} pending={pending} integrations={integrations} />
          ) : (
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={pending || lead.status === 'cancelled'}
              onClick={() => void run({ action: 'createDocument', bookingId: lead.id, kind: 'invoice' })}
            >
              Create invoice
            </button>
          )}
          {invoice && !integrations.stripe ? (
            <p className={styles.priceNote} style={{ marginTop: 6 }}>
              Card payments appear on the invoice once Stripe is connected (Settings).
            </p>
          ) : null}

          {isBooked ? (
            <>
              <div className={styles.subhead}><span>Client emails</span></div>
              <div className={styles.docActions}>
                <button
                  type="button"
                  className={`btn btn--outline ${styles.smallBtn}`}
                  disabled={pending}
                  onClick={() => void run({ action: 'sendConfirmation', bookingId: lead.id })}
                >
                  {lead.confirmationSentAt ? 'Resend confirmation' : 'Send confirmation'}
                </button>
                <button
                  type="button"
                  className={`btn btn--outline ${styles.smallBtn}`}
                  disabled={pending}
                  onClick={() => void run({ action: 'sendReminder', bookingId: lead.id })}
                >
                  {lead.reminderSentAt ? 'Resend reminder' : 'Send reminder'}
                </button>
                {lead.cardOnFile && invoice && balanceDue(invoice) > 0 && !lead.balanceChargedAt ? (
                  <button
                    type="button"
                    className={`btn btn--outline ${styles.smallBtn}`}
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Charge the ${money(balanceDue(invoice))} balance (plus card fee) to the card on file now?`)) {
                        void run({ action: 'chargeBalance', bookingId: lead.id });
                      }
                    }}
                  >
                    Charge balance now
                  </button>
                ) : null}
                {!lead.cardOnFile && invoice && invoice.paidAmount > 0 && balanceDue(invoice) > 0 ? (
                  <button
                    type="button"
                    className={`btn btn--outline ${styles.smallBtn}`}
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Email the client asking them to pay the ${money(balanceDue(invoice))} balance now?`
                        )
                      ) {
                        void run({ action: 'sendBalanceRequest', bookingId: lead.id });
                      }
                    }}
                  >
                    {lead.balanceRequestedAt ? 'Request balance again' : 'Request balance'}
                  </button>
                ) : null}
              </div>
              <p className={styles.priceNote} style={{ marginTop: 8 }}>
                {lead.confirmationSentAt ? `Confirmation sent ${formatShortDate(lead.confirmationSentAt.slice(0, 10))}. ` : 'Confirmation goes out automatically when a payment lands. '}
                {lead.reminderSentAt ? `Reminder sent ${formatShortDate(lead.reminderSentAt.slice(0, 10))}.` : `Reminder goes out ${business.reminderDaysBefore} days before the session.`}
                {lead.cardOnFile ? ' Card on file.' : ''}
                {lead.balanceRequestedAt ? ` Balance requested ${formatShortDate(lead.balanceRequestedAt.slice(0, 10))}.` : ''}
                {lead.termsAcceptedAt ? ` Terms accepted ${formatShortDate(lead.termsAcceptedAt.slice(0, 10))}.` : ''}
              </p>
            </>
          ) : null}

          <div className={styles.subhead}><span>Notes &amp; history</span></div>
          <textarea
            className={styles.textarea}
            placeholder="Add a note - what you discussed, what they asked for…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="New note"
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
          {activity.length === 0 ? (
            <p className={styles.priceNote}>No history yet.</p>
          ) : (
            <div className={styles.timeline}>
              {activity.map((entry) => (
                <div key={entry.id} className={styles.timelineItem}>
                  <span className={styles.timelineWhen}>{formatShortDate(entry.createdAt.slice(0, 10))}</span>
                  {entry.kind === 'note' ? (
                    <span className={`${styles.timelineBody} ${styles.timelineNote}`}>{entry.body}</span>
                  ) : (
                    <span className={styles.timelineBody}>
                      <strong>{ACTIVITY_LABELS[entry.kind] ?? entry.kind.replace(/_/g, ' ')}</strong>
                      {entry.body && entry.kind !== 'stage' ? ` — ${entry.body}` : entry.kind === 'stage' ? ` — ${entry.body}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {inPipeline ? (
          <div className={styles.modalFoot}>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={stageIndex === 0 || pending}
              onClick={() => onMove(lead.id, STAGES[stageIndex - 1].key)}
            >
              ‹ Back a stage
            </button>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={stageIndex === STAGES.length - 1 || pending}
              onClick={() => onMove(lead.id, STAGES[stageIndex + 1].key)}
            >
              Forward a stage ›
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export { DocumentStatusPill };
