'use client';

import { useState } from 'react';

import {
  documentStatusLabel,
  formatShortDate,
  relativeDays,
  type DocumentKind,
  type DocumentRow,
  type GiftCard,
  type Integrations,
} from '@/lib/pipeline';
import { money } from '@/lib/site';
import { DocumentCard } from '../DocumentActions';
import { ExportButton } from '../ExportButton';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';
import local from './GiftCards.module.css';

type Props = { cards: GiftCard[]; documents: DocumentRow[]; integrations: Integrations };

type Filter = 'all' | 'requested' | 'active' | 'redeemed' | 'archived';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'requested', label: 'To issue' },
  { key: 'active', label: 'Active' },
  { key: 'redeemed', label: 'Redeemed' },
  { key: 'archived', label: 'Cancelled' },
];

const STATUS: Record<string, { label: string; pill: string }> = {
  requested: { label: 'To issue', pill: styles.pillPending },
  active: { label: 'Active', pill: styles.pillSuccess },
  redeemed: { label: 'Redeemed', pill: styles.pillNeutral },
  archived: { label: 'Cancelled', pill: styles.pillAlert },
};

function statusOf(card: GiftCard): { label: string; pill: string } {
  return STATUS[card.status] ?? { label: card.status, pill: styles.pillNeutral };
}

/** "Private — package of four" / "Group — 8 participants · team-building". */
function formatLabel(card: GiftCard): string {
  let base: string;
  if (card.format === 'group') {
    const n = card.participants ?? 0;
    base = `Group — ${n} participant${n === 1 ? '' : 's'}`;
  } else {
    const sessions = card.sessions ?? 1;
    base =
      sessions === 4
        ? 'Private — package of four'
        : `Private — ${sessions} session${sessions === 1 ? '' : 's'}`;
  }
  return card.teamAddon ? `${base} · team-building` : base;
}

/** The newest non-void document of one kind for a gift, if any. */
function latestDoc(
  documents: DocumentRow[],
  giftId: string,
  kind: DocumentKind
): DocumentRow | null {
  const matches = documents
    .filter((doc) => doc.giftId === giftId && doc.kind === kind && doc.status !== 'void')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return matches[0] ?? null;
}

const OUTLINE = `btn btn--outline ${styles.smallBtn} ${local.tap}`;
const DARK = `btn btn--dark ${styles.smallBtn} ${local.tap}`;

export function GiftCards({ cards, documents, integrations }: Props) {
  const { run, pending, error } = useStudioAction();
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRecipientName, setEditRecipientName] = useState('');
  const [editRecipientEmail, setEditRecipientEmail] = useState('');
  const [editBuyerName, setEditBuyerName] = useState('');
  const [editBuyerEmail, setEditBuyerEmail] = useState('');
  const [openPaperworkId, setOpenPaperworkId] = useState<string | null>(null);

  const startEdit = (card: GiftCard) => {
    setEditingId(card.id);
    setEditRecipientName(card.recipientName);
    setEditRecipientEmail(card.recipientEmail ?? '');
    setEditBuyerName(card.buyerName ?? '');
    setEditBuyerEmail(card.buyerEmail);
  };

  const saveEdit = async (id: string) => {
    const ok = await run({
      action: 'editGift',
      id,
      recipientName: editRecipientName,
      recipientEmail: editRecipientEmail.trim() || null,
      buyerName: editBuyerName.trim() || null,
      buyerEmail: editBuyerEmail,
    });
    if (ok) setEditingId(null);
  };

  const toIssue = cards.filter((card) => card.status === 'requested');
  const outstanding = cards
    .filter((card) => card.status === 'requested' || card.status === 'active')
    .reduce((sum, card) => sum + card.total, 0);
  const redeemedCards = cards.filter((card) => card.status === 'redeemed');
  const redeemed = redeemedCards.reduce((sum, card) => sum + card.total, 0);

  const countFor = (key: Filter) =>
    key === 'all' ? cards.length : cards.filter((card) => card.status === key).length;

  const visible = filter === 'all' ? cards : cards.filter((card) => card.status === filter);

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      {!integrations.email ? (
        <div className={styles.warn}>
          Email isn&rsquo;t connected yet (RESEND_API_KEY) — Send will fail until it is.
        </div>
      ) : null}

      <div className={styles.statGrid}>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>To issue</div>
          <div className={styles.statValue}>{toIssue.length}</div>
          <div className={styles.statNote}>
            {toIssue.length === 1 ? 'Request waiting for an invoice' : 'Requests waiting for an invoice'}
          </div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Outstanding value</div>
          <div className={styles.statValue}>{money(outstanding)}</div>
          <div className={styles.statNote}>Requested and active, not yet redeemed</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Redeemed to date</div>
          <div className={styles.statValue}>{money(redeemed)}</div>
          <div className={styles.statNote}>
            {redeemedCards.length} {redeemedCards.length === 1 ? 'card' : 'cards'} redeemed
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.segmented} role="group" aria-label="Filter gift cards">
          {FILTERS.map((item) => {
            const count = countFor(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.segment} ${local.tap} ${filter === item.key ? styles.segmentOn : ''}`}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                {count > 0 ? ` · ${count}` : ''}
              </button>
            );
          })}
        </div>
        <ExportButton
          filename="lotus-gift-cards"
          rows={visible}
          columns={[
            { header: 'Code', value: (c: GiftCard) => c.code ?? '' },
            { header: 'Recipient', value: (c: GiftCard) => c.recipientName },
            { header: 'Recipient email', value: (c: GiftCard) => c.recipientEmail ?? '' },
            { header: 'Purchased by', value: (c: GiftCard) => c.buyerName ?? '' },
            { header: 'Buyer email', value: (c: GiftCard) => c.buyerEmail },
            { header: 'Format', value: (c: GiftCard) => formatLabel(c) },
            { header: 'Value', value: (c: GiftCard) => c.total },
            { header: 'Status', value: (c: GiftCard) => statusOf(c).label },
            { header: 'Requested date', value: (c: GiftCard) => c.createdAt.slice(0, 10) },
            {
              header: 'Invoice number',
              value: (c: GiftCard) => latestDoc(documents, c.id, 'invoice')?.number ?? '',
            },
            {
              header: 'Invoice status',
              value: (c: GiftCard) => {
                const invoice = latestDoc(documents, c.id, 'invoice');
                return invoice ? documentStatusLabel(invoice) : '';
              },
            },
          ]}
        />
      </div>

      <p className={`${styles.priceNote} ${local.guidance}`}>
        Flow: invoice the buyer → record the payment (card payments record themselves) → send
        the certificate → mark redeemed when they book.
      </p>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          No gift certificate requests yet. They arrive here from the Gift page.
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>No gift cards match this filter.</div>
      ) : (
        <div className={styles.cardList}>
          {visible.map((card) => {
            const status = statusOf(card);
            const invoice = latestDoc(documents, card.id, 'invoice');
            const certificate = latestDoc(documents, card.id, 'certificate');
            const invoicePaid = invoice?.status === 'paid';

            return (
              <div key={card.id} className={styles.recordCard}>
                <div className={styles.recordHead}>
                  <div>
                    <div className={styles.recordTitle}>{card.recipientName}</div>
                    {card.buyerName ? (
                      <div className={styles.recordSub}>from {card.buyerName}</div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.recordValue}>{money(card.total)}</div>
                    {invoice?.status === 'paid' ? (
                      <div className={styles.priceNote}>{documentStatusLabel(invoice)}</div>
                    ) : null}
                    {card.redeemedAmount > 0 ? (
                      <div className={styles.priceNote}>
                        {card.status === 'redeemed'
                          ? 'Fully redeemed'
                          : `${money(card.total - card.redeemedAmount)} credit left`}
                      </div>
                    ) : null}
                  </div>
                </div>

                {editingId === card.id ? (
                  <div className={styles.editStack}>
                    <div className={styles.editRow}>
                      <input
                        type="text"
                        aria-label="Recipient name"
                        placeholder="Recipient name"
                        className={styles.editInput}
                        value={editRecipientName}
                        onChange={(e) => setEditRecipientName(e.target.value)}
                      />
                      <input
                        type="email"
                        aria-label="Recipient email"
                        placeholder="Recipient email"
                        className={styles.editInput}
                        value={editRecipientEmail}
                        onChange={(e) => setEditRecipientEmail(e.target.value)}
                      />
                    </div>
                    <div className={styles.editRow} style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        aria-label="Buyer name"
                        placeholder="Buyer name"
                        className={styles.editInput}
                        value={editBuyerName}
                        onChange={(e) => setEditBuyerName(e.target.value)}
                      />
                      <input
                        type="email"
                        aria-label="Buyer email"
                        placeholder="Buyer email"
                        className={styles.editInput}
                        value={editBuyerEmail}
                        onChange={(e) => setEditBuyerEmail(e.target.value)}
                      />
                    </div>
                    <div className={styles.recordActions} style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className={DARK}
                        disabled={pending}
                        onClick={() => void saveEdit(card.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={OUTLINE}
                        disabled={pending}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                <div className={styles.kv}>
                  <span className={styles.kvLabel}>Code</span>
                  <span className={styles.kvValue}>
                    {card.code ? <span className={styles.codeName}>{card.code}</span> : '—'}
                  </span>

                  <span className={styles.kvLabel}>Format</span>
                  <span className={styles.kvValue}>{formatLabel(card)}</span>

                  <span className={styles.kvLabel}>Buyer</span>
                  <span className={styles.kvValue}>
                    <a href={`mailto:${card.buyerEmail}`}>{card.buyerEmail}</a>
                  </span>

                  <span className={styles.kvLabel}>Recipient email</span>
                  <span className={styles.kvValue}>
                    {card.recipientEmail ? (
                      <a href={`mailto:${card.recipientEmail}`}>{card.recipientEmail}</a>
                    ) : (
                      '—'
                    )}
                  </span>

                  <span className={styles.kvLabel}>Requested</span>
                  <span className={styles.kvValue}>
                    {formatShortDate(card.createdAt)}
                    {card.status === 'requested' ? ` (${relativeDays(card.createdAt)})` : ''}
                  </span>

                  <span className={styles.kvLabel}>Status</span>
                  <span className={styles.kvValue}>
                    <span className={`${styles.pill} ${status.pill}`}>{status.label}</span>
                  </span>
                </div>
                )}

                <div className={local.paperwork}>
                  <button
                    type="button"
                    className={`btn btn--outline ${styles.smallBtn}`}
                    aria-expanded={openPaperworkId === card.id}
                    onClick={() =>
                      setOpenPaperworkId((current) => (current === card.id ? null : card.id))
                    }
                  >
                    {openPaperworkId === card.id ? 'Hide paperwork' : 'Paperwork'}
                  </button>

                  {openPaperworkId === card.id ? (
                    <div className={local.paperworkBody}>
                      {invoice ? (
                        <DocumentCard
                          doc={invoice}
                          run={run}
                          pending={pending}
                          integrations={integrations}
                        />
                      ) : (
                        <div className={local.createRow}>
                          <button
                            type="button"
                            className={DARK}
                            disabled={pending}
                            onClick={() =>
                              void run({
                                action: 'createGiftDocument',
                                giftId: card.id,
                                kind: 'invoice',
                              })
                            }
                          >
                            Create invoice
                          </button>
                          <span className={styles.priceNote}>Sent to the buyer to pay.</span>
                        </div>
                      )}

                      {certificate ? (
                        <DocumentCard
                          doc={certificate}
                          run={run}
                          pending={pending}
                          integrations={integrations}
                        />
                      ) : (
                        <div className={local.createRow}>
                          <button
                            type="button"
                            className={invoice && invoicePaid ? DARK : OUTLINE}
                            disabled={pending}
                            onClick={() =>
                              void run({
                                action: 'createGiftDocument',
                                giftId: card.id,
                                kind: 'certificate',
                              })
                            }
                          >
                            Create certificate
                          </button>
                          {!invoicePaid ? (
                            <span className={styles.priceNote}>
                              Usually sent once the invoice is paid
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className={styles.recordActions}>
                  {editingId !== card.id ? (
                    <button
                      type="button"
                      className={OUTLINE}
                      disabled={pending}
                      onClick={() => startEdit(card)}
                    >
                      Edit
                    </button>
                  ) : null}
                  {card.status !== 'redeemed' ? (
                    <button
                      type="button"
                      className={OUTLINE}
                      disabled={pending}
                      onClick={() =>
                        void run({ action: 'setGiftStatus', id: card.id, status: 'redeemed' })
                      }
                    >
                      Mark redeemed
                    </button>
                  ) : null}
                  {card.status !== 'archived' ? (
                    <button
                      type="button"
                      className={OUTLINE}
                      disabled={pending}
                      onClick={() =>
                        void run({ action: 'setGiftStatus', id: card.id, status: 'archived' })
                      }
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={OUTLINE}
                      disabled={pending}
                      onClick={() =>
                        void run({ action: 'setGiftStatus', id: card.id, status: 'requested' })
                      }
                    >
                      Restore
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.linkBtn}
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete the gift request for ${card.recipientName}? This cannot be undone.`
                        )
                      ) {
                        void run({ action: 'deleteGift', id: card.id });
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
