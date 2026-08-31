'use client';

import { money } from '@/lib/site';
import type { GiftCard } from '@/lib/pipeline';
import { useStudioAction } from '../useStudioAction';
import { ExportButton } from '../ExportButton';
import styles from '../studio.module.css';

const STATUS_PILL: Record<string, string> = {
  requested: styles.pillPending,
  active: styles.pillSuccess,
  redeemed: styles.pillNeutral,
  archived: styles.pillAlert,
};

/** Short human reference, derived from the row id so it is stable. */
function reference(id: string): string {
  return `LA-${id.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase()}`;
}

export function GiftCards({ cards }: { cards: GiftCard[] }) {
  const { run, error } = useStudioAction();

  const live = cards.filter(
    (card) => card.status === 'requested' || card.status === 'active'
  );
  const outstanding = live.reduce((total, card) => total + card.total, 0);
  const redeemed = cards
    .filter((card) => card.status === 'redeemed')
    .reduce((total, card) => total + card.total, 0);

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.statGrid}>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Active cards</div>
          <div className={styles.statValue}>{live.length}</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Outstanding value</div>
          <div className={styles.statValue}>{money(outstanding)}</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statLabel}>Redeemed to date</div>
          <div className={styles.statValue}>{money(redeemed)}</div>
        </div>
      </div>

      <div className={styles.publishRow} style={{ marginTop: 0, borderTop: 'none' }}>
        <ExportButton
          filename="lotus-gift-cards"
          rows={cards}
          columns={[
            { header: 'Code', value: (c: GiftCard) => reference(c.id) },
            { header: 'Recipient', value: (c: GiftCard) => c.recipientName },
            { header: "Recipient's email", value: (c: GiftCard) => c.recipientEmail ?? '' },
            { header: 'Purchased by', value: (c: GiftCard) => c.buyerEmail },
            { header: 'Format', value: (c: GiftCard) => c.format },
            { header: 'Value', value: (c: GiftCard) => c.total },
            { header: 'Status', value: (c: GiftCard) => c.status },
            { header: 'Issued', value: (c: GiftCard) => c.createdAt.slice(0, 10) },
          ]}
        />
      </div>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          No gift certificate requests yet. They arrive here from the Gift page.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Recipient</th>
                <th>Recipient&rsquo;s email</th>
                <th>Purchased by</th>
                <th>Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className={styles.codeName}>{reference(card.id)}</td>
                  <td>{card.recipientName}</td>
                  <td>
                    {card.recipientEmail ? (
                      <a href={`mailto:${card.recipientEmail}`}>
                        {card.recipientEmail}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <a href={`mailto:${card.buyerEmail}`}>{card.buyerEmail}</a>
                  </td>
                  <td className={styles.numeric}>{money(card.total)}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${STATUS_PILL[card.status] ?? styles.pillNeutral}`}
                    >
                      {card.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {card.status !== 'redeemed' ? (
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          onClick={() =>
                            void run({
                              action: 'setGiftStatus',
                              id: card.id,
                              status: 'redeemed',
                            })
                          }
                        >
                          Redeem
                        </button>
                      ) : null}
                      {card.status !== 'archived' ? (
                        <button
                          type="button"
                          className={`btn btn--outline ${styles.smallBtn}`}
                          onClick={() =>
                            void run({
                              action: 'setGiftStatus',
                              id: card.id,
                              status: 'archived',
                            })
                          }
                        >
                          Archive
                        </button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
